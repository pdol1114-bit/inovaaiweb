/**
 * FEM 작업의 서버 측 흐름(생성 → 업로드 → 시작 → 조회 → 결과). 순수 모듈(의존성 주입):
 * 저장소(JobStore)와 워커 클라이언트를 받아 동작하므로 DB·Next 없이 시험할 수 있다.
 *
 * 월 이용량 반영 규칙(이 파일이 유일한 구현):
 *  - 작업을 만들 때 1회를 잡아 둔다(동시 요청이 한도를 넘지 못하게 저장소가 원자적으로 처리).
 *  - 엔진이 판정을 낸 작업(성공·경고·메싱 실패)과 시간 초과는 1회로 센다.
 *  - 엔진이 실행되기 전에 끝난 작업(전달 실패, 제출 거절, 업로드 미완료, 취소)과
 *    실행 환경 문제로 결과를 모르는 작업(워커 오류·실행 유실)은 세지 않는다.
 */
import type { EngineSettings } from './preflight';
import type { JobStatus, UploadTarget, WorkerJob, WorkerMetrics } from './worker-contract';
import { TERMINAL_STATUSES } from './worker-contract';
import { WorkerRejected, WorkerUnreachable, type WorkerClient } from './worker-client';

export type JobRow = {
  id: string;
  userId: string;
  status: JobStatus;
  result: string | null;
  errorCode: string | null;
  metrics: WorkerMetrics | null;
  fileName: string;
  countsTowardQuota: boolean;
};

export type JobPatch = Partial<Pick<JobRow, 'status' | 'result' | 'errorCode' | 'metrics' | 'countsTowardQuota'>>;
export type Quota = { used: number; limit: number; remaining: number };

export interface JobStore {
  /** 한도 확인과 작업 행 생성을 한 번에(원자적으로). 같은 requestKey는 기존 행을 돌려준다. */
  reserve(p: { userId: string; requestKey: string; fileName: string; fileFormat: string; fileSize: number;
               settings: EngineSettings }): Promise<
    | { kind: 'created' | 'existing'; row: JobRow; quota: Quota }
    | { kind: 'quota_exceeded'; quota: Quota }>;
  get(userId: string, id: string): Promise<JobRow | null>;
  update(userId: string, id: string, patch: JobPatch): Promise<void>;
}

export type Deps = { store: JobStore; worker: WorkerClient };

export type ServiceError = { ok: false; http: number; error: string; detail?: Record<string, unknown> };
const fail = (http: number, error: string, detail?: Record<string, unknown>): ServiceError => ({ ok: false, http, error, detail });

/** 엔진이 실제로 판정을 냈거나 시간 초과로 끝난 작업만 이용 횟수에 포함한다. */
export function countsTowardQuota(job: Pick<WorkerJob, 'status' | 'result' | 'errorCode'>): boolean {
  if (!TERMINAL_STATUSES.includes(job.status)) return true;       // 진행 중: 잡아 둔 1회 유지
  if (job.status === 'canceled') return false;
  return job.result !== null || job.errorCode === 'TIMEOUT';
}

function patchFrom(job: WorkerJob): JobPatch {
  return { status: job.status, result: job.result, errorCode: job.errorCode, metrics: job.metrics,
           countsTowardQuota: countsTowardQuota(job) };
}

export type BrowserUpload =
  | { mode: 'direct'; method: 'PUT'; url: string; headers: Record<string, string>; expiresAt: number }
  | { mode: 'proxy'; method: 'PUT'; url: string; headers: Record<string, string>; expiresAt: number };

function browserUpload(id: string, u: UploadTarget): BrowserUpload {
  if (u.mode === 'direct') return { mode: 'direct', method: 'PUT', url: u.url, headers: u.headers, expiresAt: u.expiresAt };
  // 워커 경유 업로드(로컬 워커): 브라우저는 워커에 직접 닿지 않고 이 웹 서버를 거친다.
  return { mode: 'proxy', method: 'PUT', url: `/api/fem/jobs/${id}/upload`,
           headers: { 'Content-Type': 'application/octet-stream' }, expiresAt: u.expiresAt };
}

export async function submitJob(deps: Deps, p: {
  userId: string; requestKey: string; fileName: string; fileFormat: string; fileSize: number; settings: EngineSettings;
}): Promise<{ ok: true; id: string; status: JobStatus; upload: BrowserUpload | null; quota: Quota; duplicate: boolean } | ServiceError> {
  const reserved = await deps.store.reserve(p);
  if (reserved.kind === 'quota_exceeded') return fail(429, 'QUOTA_EXCEEDED', { quota: reserved.quota });
  const { row, quota } = reserved;
  if (reserved.kind === 'existing' && row.status === 'canceled') {
    // 이미 끝난 요청 키다. 새 시도는 새 키로 해야 한다(횟수 확인을 다시 거치도록).
    return fail(409, 'REQUEST_ALREADY_CLOSED', { id: row.id });
  }
  try {
    const { job, upload } = await deps.worker.createJob({
      jobId: row.id, userId: p.userId, settings: p.settings, file: { name: p.fileName, size: p.fileSize } });
    await deps.store.update(p.userId, row.id, patchFrom(job));
    return { ok: true, id: row.id, status: job.status, upload: upload ? browserUpload(row.id, upload) : null,
             quota, duplicate: reserved.kind === 'existing' };
  } catch (e) {
    if (e instanceof WorkerRejected) {
      // 워커가 접수를 거절했다(미지원 설정·파일 등). 엔진은 실행되지 않았다 → 횟수 미반영.
      await deps.store.update(p.userId, row.id, { status: 'canceled', errorCode: e.code, countsTowardQuota: false });
      return fail(e.httpStatus === 413 ? 413 : 422, 'SUBMIT_REJECTED', { code: e.code, id: row.id });
    }
    if (e instanceof WorkerUnreachable) {
      await deps.store.update(p.userId, row.id, { status: 'canceled', errorCode: 'DELIVERY_FAILED', countsTowardQuota: false });
      return fail(502, 'DELIVERY_FAILED', { id: row.id });
    }
    throw e;
  }
}

/** 로컬 워커 전용: 브라우저가 올린 본문을 워커로 전달한다. */
export async function proxyUpload(deps: Deps, userId: string, id: string,
                                  body: ReadableStream<Uint8Array> | ArrayBuffer, size: number): Promise<{ ok: true } | ServiceError> {
  const row = await deps.store.get(userId, id);
  if (!row) return fail(404, 'NOT_FOUND');
  if (row.status !== 'awaiting_upload') return fail(409, 'NOT_AWAITING_UPLOAD');
  try {
    await deps.worker.uploadInput(id, userId, body, size);
    return { ok: true };
  } catch (e) {
    if (e instanceof WorkerRejected) return fail(e.httpStatus === 413 ? 413 : 409, 'UPLOAD_REJECTED', { code: e.code });
    if (e instanceof WorkerUnreachable) return fail(502, 'DELIVERY_FAILED');
    throw e;
  }
}

export async function startJob(deps: Deps, userId: string, id: string):
  Promise<{ ok: true; id: string; status: JobStatus } | ServiceError> {
  const row = await deps.store.get(userId, id);
  if (!row) return fail(404, 'NOT_FOUND');
  try {
    const job = await deps.worker.startJob(id, userId);
    await deps.store.update(userId, id, patchFrom(job));
    return { ok: true, id, status: job.status };
  } catch (e) {
    if (e instanceof WorkerRejected) {
      if (e.code === 'UPLOAD_MISSING') return fail(409, 'UPLOAD_MISSING');           // 다시 시도 가능
      if (e.httpStatus === 404 || e.httpStatus === 410) {
        await deps.store.update(userId, id, { status: 'canceled', errorCode: 'WORKER_JOB_MISSING', countsTowardQuota: false });
        return fail(409, 'WORKER_JOB_MISSING');
      }
      // 업로드된 파일이 검증에서 거절됐다(형식·크기 불일치). 엔진은 실행되지 않았다.
      await deps.store.update(userId, id, { status: 'failed', errorCode: e.code, countsTowardQuota: false });
      return fail(422, 'SUBMIT_REJECTED', { code: e.code, id });
    }
    if (e instanceof WorkerUnreachable) return fail(502, 'DELIVERY_FAILED');          // 행은 그대로: 재시도 가능
    throw e;
  }
}

export type JobView = {
  id: string;
  status: JobStatus;
  /** ok = 워커에서 방금 확인, unavailable = 워커 조회 실패(아래 값은 마지막으로 저장된 상태),
   *  expired = 워커에 결과가 더 이상 없음(보관 기간 만료·삭제) */
  sync: 'ok' | 'unavailable' | 'expired';
  result: string | null;
  stage: string | null;
  metrics: WorkerMetrics | null;
  warnings: string[];
  errorCode: string | null;
  errorMessage: string | null;
  errors: WorkerJob['errors'];
  settingsApplied: WorkerJob['settingsApplied'] | null;
  qualityThresholds: WorkerJob['qualityThresholds'];
  artifacts: WorkerJob['artifacts'];
  preview: WorkerJob['preview'] | null;
  solverValidation: string | null;
  expiresAt: number | null;
};

function viewFromRow(row: JobRow, sync: JobView['sync']): JobView {
  return { id: row.id, status: row.status, sync, result: row.result, stage: null, metrics: row.metrics,
           warnings: [], errorCode: row.errorCode, errorMessage: null, errors: [], settingsApplied: null,
           qualityThresholds: null, artifacts: null, preview: null, solverValidation: null, expiresAt: null };
}

export async function getJobView(deps: Deps, userId: string, id: string): Promise<{ ok: true; job: JobView } | ServiceError> {
  const row = await deps.store.get(userId, id);
  if (!row) return fail(404, 'NOT_FOUND');
  try {
    const job = await deps.worker.getJob(id, userId);
    const patch = patchFrom(job);
    if (patch.status !== row.status || patch.result !== row.result || patch.errorCode !== row.errorCode ||
        patch.countsTowardQuota !== row.countsTowardQuota || (job.metrics && !row.metrics)) {
      await deps.store.update(userId, id, patch);
    }
    return { ok: true, job: {
      id, status: job.status, sync: 'ok', result: job.result, stage: job.stage, metrics: job.metrics,
      warnings: job.warnings, errorCode: job.errorCode, errorMessage: job.errorMessage, errors: job.errors,
      settingsApplied: job.settingsApplied, qualityThresholds: job.qualityThresholds, artifacts: job.artifacts,
      preview: job.preview, solverValidation: job.solverValidation, expiresAt: job.expiresAt } };
  } catch (e) {
    if (e instanceof WorkerRejected && (e.httpStatus === 404 || e.httpStatus === 410)) {
      if (TERMINAL_STATUSES.includes(row.status)) return { ok: true, job: viewFromRow(row, 'expired') };
      // 진행 중이어야 할 작업이 워커에 없다: 결과를 알 수 없으므로 실패로 기록(횟수 미반영).
      const patch: JobPatch = { status: 'failed', errorCode: 'WORKER_JOB_MISSING', countsTowardQuota: false };
      await deps.store.update(userId, id, patch);
      return { ok: true, job: viewFromRow({ ...row, ...patch } as JobRow, 'expired') };
    }
    if (e instanceof WorkerRejected || e instanceof WorkerUnreachable) {
      return { ok: true, job: viewFromRow(row, 'unavailable') };    // 숨기지 않고 표시한다
    }
    throw e;
  }
}

export type FileDelivery =
  | { ok: true; kind: 'redirect'; url: string; sha256: string; bytes: number }
  | { ok: true; kind: 'stream'; response: Response; sha256: string; bytes: number };

async function deliver(deps: Deps, userId: string, id: string,
                       link: () => Promise<import('./worker-contract').FileLink>,
                       stream: () => Promise<Response>): Promise<FileDelivery | ServiceError> {
  const row = await deps.store.get(userId, id);
  if (!row) return fail(404, 'NOT_FOUND');
  if (row.status !== 'completed') return fail(409, 'JOB_NOT_COMPLETED');
  try {
    const l = await link();
    if (l.mode === 'direct') return { ok: true, kind: 'redirect', url: l.url, sha256: l.sha256, bytes: l.bytes };
    const response = await stream();
    const got = response.headers.get('x-content-sha256');
    if (got !== l.sha256) return fail(502, 'ARTIFACT_INTEGRITY');
    return { ok: true, kind: 'stream', response, sha256: l.sha256, bytes: l.bytes };
  } catch (e) {
    if (e instanceof WorkerRejected) {
      if (e.httpStatus === 404 || e.httpStatus === 410) return fail(410, 'RESULT_EXPIRED');
      return fail(409, e.code === 'PREVIEW_NOT_AVAILABLE' ? 'PREVIEW_NOT_AVAILABLE' : 'RESULT_NOT_AVAILABLE', e.detail);
    }
    if (e instanceof WorkerUnreachable) return fail(502, 'WORKER_UNREACHABLE');
    throw e;
  }
}

export function getArtifact(deps: Deps, userId: string, id: string, format: 'inp' | 'msh') {
  return deliver(deps, userId, id, () => deps.worker.artifactLink(id, userId, format),
                 () => deps.worker.streamArtifact(id, userId, format));
}

export function getPreview(deps: Deps, userId: string, id: string) {
  return deliver(deps, userId, id, () => deps.worker.previewLink(id, userId), () => deps.worker.streamPreview(id, userId));
}
