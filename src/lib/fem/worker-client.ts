/**
 * FEM 워커 HTTP 클라이언트. 순수 모듈(의존성 주입) — 서버에서만 만들어 쓴다(engine-client.ts).
 *
 * 실패를 세 가지로 구분한다:
 *  - WorkerUnreachable : 통신 실패·시간 초과·5xx·형식이 깨진 응답 (메싱 결과가 아님)
 *  - WorkerRejected    : 워커가 요청을 거절(4xx, 오류 코드 포함)
 *  - (정상 응답 안의 status: 'failed') : 실제 메싱 실패 — 예외가 아니다
 */
import {
  parseFileLink, parseUploadTarget, parseWorkerJob, WorkerResponseError,
  type FileLink, type UploadTarget, type WorkerJob,
} from './worker-contract';
import type { EngineSettings } from './preflight';

export class WorkerUnreachable extends Error {
  constructor(public readonly reason: string) {
    super(`worker unreachable: ${reason}`);
    this.name = 'WorkerUnreachable';
  }
}

export class WorkerRejected extends Error {
  constructor(public readonly httpStatus: number, public readonly code: string,
              public readonly detail: Record<string, unknown> = {}) {
    super(`worker rejected the request: ${code}`);
    this.name = 'WorkerRejected';
  }
}

export type WorkerHealth = { reachable: true; lastCompletedAt: number | null; maxUploadBytes: number | null };

export type WorkerClientOptions = {
  baseUrl: string;
  apiKey: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
  identityToken?: () => Promise<string>;
};

export type WorkerClient = ReturnType<typeof createWorkerClient>;

export function createWorkerClient(opts: WorkerClientOptions) {
  const base = opts.baseUrl.replace(/\/+$/, '');
  const doFetch = opts.fetch ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 30_000;
  if (!opts.apiKey) throw new Error('worker api key is required');

  async function call(path: string, init: RequestInit & { userId?: string; timeout?: number } = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${opts.apiKey}`);
    // 사용자 식별은 항상 서버 세션에서 확인한 값만 넣는다(호출부 책임).
    if (init.userId) headers.set('X-Fem-User-Id', init.userId);
    let res: Response;
    try {
      if (opts.identityToken) headers.set('X-Serverless-Authorization', `Bearer ${await opts.identityToken()}`);
      res = await doFetch(`${base}${path}`, { ...init, headers, signal: AbortSignal.timeout(init.timeout ?? timeoutMs) });
    } catch (e) {
      throw new WorkerUnreachable(e instanceof Error ? e.name : 'network');
    }
    if (res.status >= 500) throw new WorkerUnreachable(`http ${res.status}`);
    if (res.status >= 400) {
      let code = `HTTP_${res.status}`;
      let detail: Record<string, unknown> = {};
      try {
        const body = (await res.json()) as { error?: Record<string, unknown> };
        if (body?.error && typeof body.error.code === 'string') {
          code = body.error.code;
          // 원문 메시지는 넘기지 않는다(코드와 부가 필드만)
          detail = Object.fromEntries(Object.entries(body.error).filter(([k]) => k !== 'code' && k !== 'message'));
        }
      } catch { /* 본문이 JSON이 아님 */ }
      throw new WorkerRejected(res.status, code, detail);
    }
    return res;
  }

  async function json(res: Response): Promise<unknown> {
    try {
      return await res.json();
    } catch {
      throw new WorkerUnreachable('invalid json');
    }
  }

  function guard<T>(fn: () => T): T {
    try {
      return fn();
    } catch (e) {
      if (e instanceof WorkerResponseError) throw new WorkerUnreachable(e.message);
      throw e;
    }
  }

  const job = (jobId: string) => `/v1/mesh/jobs/${guard(() => parseWorkerJobId(jobId))}`;

  return {
    /** 작업 생성(멱등). 업로드 대상은 아직 업로드 전일 때만 온다. */
    async createJob(p: { jobId: string; userId: string; settings: EngineSettings; file: { name: string; size: number } }):
      Promise<{ job: WorkerJob; upload: UploadTarget | null; duplicate: boolean }> {
      const res = await call('/v1/mesh/jobs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: p.jobId, user_id: p.userId, settings: p.settings, file: p.file }),
      });
      const body = (await json(res)) as Record<string, unknown>;
      return guard(() => ({
        job: parseWorkerJob(body, p.jobId),
        upload: body?.upload ? parseUploadTarget(body.upload) : null,
        duplicate: body?.duplicate === true,
      }));
    },

    /** 로컬 워커 전용: 웹 서버가 업로드 본문을 워커로 전달한다. */
    async uploadInput(jobId: string, userId: string, body: ReadableStream<Uint8Array> | ArrayBuffer, size: number): Promise<void> {
      await call(`${job(jobId)}/input`, {
        method: 'PUT', userId, body: body as BodyInit, timeout: 120_000,
        headers: { 'Content-Type': 'application/octet-stream', 'Content-Length': String(size) },
        // Node fetch는 스트림 본문에 duplex 지정이 필요하다
        ...({ duplex: 'half' } as object),
      });
    },

    async startJob(jobId: string, userId: string): Promise<WorkerJob> {
      const res = await call(`${job(jobId)}/start`, { method: 'POST', userId, timeout: 120_000 });
      const body = await json(res);
      return guard(() => parseWorkerJob(body, jobId));
    },

    async getJob(jobId: string, userId: string): Promise<WorkerJob> {
      const res = await call(job(jobId), { method: 'GET', userId });
      const body = await json(res);
      return guard(() => parseWorkerJob(body, jobId));
    },

    async cancelJob(jobId: string, userId: string): Promise<WorkerJob> {
      const res = await call(`${job(jobId)}/cancel`, { method: 'POST', userId });
      const body = await json(res);
      return guard(() => parseWorkerJob(body, jobId));
    },

    async artifactLink(jobId: string, userId: string, format: 'inp' | 'msh'): Promise<FileLink> {
      const body = await json(await call(`${job(jobId)}/artifacts/${format}/link`, { method: 'GET', userId }));
      return guard(() => parseFileLink(body));
    },

    async previewLink(jobId: string, userId: string): Promise<FileLink> {
      const body = await json(await call(`${job(jobId)}/preview/link`, { method: 'GET', userId }));
      return guard(() => parseFileLink(body));
    },

    /** mode: 'stream'일 때만 쓴다. 응답 본문을 그대로 돌려준다. */
    streamArtifact(jobId: string, userId: string, format: 'inp' | 'msh'): Promise<Response> {
      return call(`${job(jobId)}/artifacts/${format}`, { method: 'GET', userId, timeout: 300_000 });
    },
    streamPreview(jobId: string, userId: string): Promise<Response> {
      return call(`${job(jobId)}/preview`, { method: 'GET', userId, timeout: 300_000 });
    },

    /** 워커가 응답하는지, 그리고 실제 엔진 작업이 완료된 기록이 있는지. */
    async health(): Promise<WorkerHealth> {
      const body = (await json(await call('/v1/health', { method: 'GET', timeout: 5_000 }))) as Record<string, unknown>;
      if (!body || body.worker !== 'ok') throw new WorkerUnreachable('bad health response');
      const last = body.lastCompletedJob as { finishedAt?: unknown } | null | undefined;
      const limits = body.limits as { maxUploadBytes?: unknown } | undefined;
      return {
        reachable: true,
        lastCompletedAt: last && typeof last.finishedAt === 'number' ? last.finishedAt : null,
        maxUploadBytes: limits && typeof limits.maxUploadBytes === 'number' ? limits.maxUploadBytes : null,
      };
    },
  };
}

function parseWorkerJobId(jobId: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(jobId)) {
    throw new WorkerResponseError('job id');
  }
  return `eng_${jobId.replace(/-/g, '')}`;
}
