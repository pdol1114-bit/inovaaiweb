/**
 * FEM 워커(HTTP) 응답 규격과 검증. 순수 모듈 — 환경변수·Next·DB에 의존하지 않는다.
 * 규격 원문: FEM-Worker/docs/DESIGN.md. 워커 응답은 신뢰하지 않고 여기서 구조를 확인한다.
 */
export const JOB_STATUSES = ['awaiting_upload', 'queued', 'running', 'completed', 'failed', 'canceled'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];
export const TERMINAL_STATUSES: readonly JobStatus[] = ['completed', 'failed', 'canceled'];
export type EngineResult = 'success' | 'warning' | 'failed';

export type WorkerMetrics = {
  nodes: number | null;
  elements: number | null;
  hex: number | null;
  wedge: number | null;
  tet: number | null;
  minScaledJacobian: number | null;
  /** 엔진은 Aspect Ratio를 계산하지 않는다 — 항상 null. */
  maxAspectRatio: null;
  /** 요소의 최장/최단 모서리 길이비. Aspect Ratio가 아니다. */
  maxEdgeRatio: number | null;
  /** Jacobian ≤ 0 또는 수치적으로 퇴화한 요소. */
  invalidElements: number | null;
  /** 엔진 고정 품질 임계 미달 요소(경고 대상). */
  belowThresholdElements: number | null;
};

export type EngineError = { code: string; message: string; hint?: string; cause?: Record<string, unknown> } & Record<string, unknown>;
export type ArtifactInfo = { name: string; bytes: number; sha256: string };
export type PreviewInfo =
  | { available: true; bytes: number; sha256: string; simplified: boolean }
  | { available: false; reason: string; bytes?: number; maxBytes?: number };

export type WorkerJob = {
  engineJobId: string;
  status: JobStatus;
  result: EngineResult | null;
  stage: string | null;
  metrics: WorkerMetrics | null;
  warnings: string[];
  errorCode: string | null;
  errorMessage: string | null;
  errors: EngineError[];
  settingsApplied: { mode: string; targetSize: number; sizeUnit: string; elementOrder: string; notApplied: string[] };
  qualityThresholds: Record<string, number | null> | null;
  artifacts: { inp: ArtifactInfo; msh: ArtifactInfo } | null;
  preview: PreviewInfo;
  solverValidation: string | null;
  engineVersion: string | null;
  startedAt: number | null;
  finishedAt: number | null;
  expiresAt: number | null;
};

export type UploadTarget =
  | { mode: 'direct'; method: 'PUT'; url: string; headers: Record<string, string>; maxBytes: number; expiresAt: number }
  | { mode: 'worker'; method: 'PUT'; path: string; maxBytes: number; expiresAt: number };

export type FileLink =
  | { mode: 'direct'; url: string; expiresAt: number; bytes: number; sha256: string }
  | { mode: 'stream'; bytes: number; sha256: string };

export class WorkerResponseError extends Error {
  constructor(what: string) {
    super(`unexpected worker response: ${what}`);
    this.name = 'WorkerResponseError';
  }
}

const ENGINE_ID_RE = /^eng_[0-9a-f]{32}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SHA_RE = /^[0-9a-f]{64}$/;

export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v);
}

/** 워커의 작업 ID는 웹 작업 UUID에서 결정된다. 응답의 ID가 이것과 다르면 받아들이지 않는다. */
export function expectedEngineJobId(jobId: string): string {
  if (!isUuid(jobId)) throw new Error('job id must be a lowercase UUID');
  return `eng_${jobId.replace(/-/g, '')}`;
}

function obj(v: unknown, what: string): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new WorkerResponseError(what);
  return v as Record<string, unknown>;
}
function numOrNull(v: unknown, what: string): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new WorkerResponseError(what);
  return v;
}
function strOrNull(v: unknown, what: string): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== 'string') throw new WorkerResponseError(what);
  return v;
}
function artifact(v: unknown, what: string): ArtifactInfo {
  const o = obj(v, what);
  if (typeof o.name !== 'string' || typeof o.bytes !== 'number' || o.bytes < 0 ||
      typeof o.sha256 !== 'string' || !SHA_RE.test(o.sha256)) throw new WorkerResponseError(what);
  return { name: o.name, bytes: o.bytes, sha256: o.sha256 };
}

function parseMetrics(v: unknown): WorkerMetrics | null {
  if (v === null || v === undefined) return null;
  const m = obj(v, 'metrics');
  return {
    nodes: numOrNull(m.nodes, 'metrics.nodes'),
    elements: numOrNull(m.elements, 'metrics.elements'),
    hex: numOrNull(m.hex, 'metrics.hex'),
    wedge: numOrNull(m.wedge, 'metrics.wedge'),
    tet: numOrNull(m.tet, 'metrics.tet'),
    minScaledJacobian: numOrNull(m.minScaledJacobian, 'metrics.minScaledJacobian'),
    maxAspectRatio: null,
    maxEdgeRatio: numOrNull(m.maxEdgeRatio, 'metrics.maxEdgeRatio'),
    invalidElements: numOrNull(m.invalidElements, 'metrics.invalidElements'),
    belowThresholdElements: numOrNull(m.belowThresholdElements, 'metrics.belowThresholdElements'),
  };
}

function parsePreview(v: unknown): PreviewInfo {
  const p = obj(v, 'preview');
  if (p.available === true) {
    if (typeof p.bytes !== 'number' || typeof p.sha256 !== 'string') throw new WorkerResponseError('preview');
    return { available: true, bytes: p.bytes, sha256: p.sha256, simplified: p.simplified === true };
  }
  if (p.available !== false || typeof p.reason !== 'string') throw new WorkerResponseError('preview');
  return { available: false, reason: p.reason,
    bytes: typeof p.bytes === 'number' ? p.bytes : undefined,
    maxBytes: typeof p.maxBytes === 'number' ? p.maxBytes : undefined };
}

/** 워커 작업 응답 검증. `jobId`(웹 작업 UUID)에서 계산한 ID와 다르면 거절한다. */
export function parseWorkerJob(raw: unknown, jobId: string): WorkerJob {
  const j = obj(raw, 'job');
  if (typeof j.engineJobId !== 'string' || !ENGINE_ID_RE.test(j.engineJobId) ||
      j.engineJobId !== expectedEngineJobId(jobId)) throw new WorkerResponseError('engineJobId');
  if (typeof j.status !== 'string' || !(JOB_STATUSES as readonly string[]).includes(j.status)) {
    throw new WorkerResponseError('status');
  }
  const status = j.status as JobStatus;
  const result = j.result ?? null;
  if (result !== null && result !== 'success' && result !== 'warning' && result !== 'failed') {
    throw new WorkerResponseError('result');
  }
  if (status === 'completed' && result !== 'success' && result !== 'warning') throw new WorkerResponseError('result');
  const applied = obj(j.settingsApplied, 'settingsApplied');
  if (typeof applied.mode !== 'string' || typeof applied.targetSize !== 'number') {
    throw new WorkerResponseError('settingsApplied');
  }
  if (!Array.isArray(j.warnings) || !j.warnings.every((w) => typeof w === 'string')) throw new WorkerResponseError('warnings');
  if (!Array.isArray(j.errors)) throw new WorkerResponseError('errors');
  const errors = j.errors.map((e) => {
    const o = obj(e, 'errors[]');
    if (typeof o.code !== 'string' || typeof o.message !== 'string') throw new WorkerResponseError('errors[]');
    return o as EngineError;   // cause·hint 등 엔진이 준 필드를 그대로 보존한다
  });
  let artifacts: WorkerJob['artifacts'] = null;
  if (status === 'completed') {
    const a = obj(j.artifacts, 'artifacts');
    artifacts = { inp: artifact(a.inp, 'artifacts.inp'), msh: artifact(a.msh, 'artifacts.msh') };
  }
  return {
    engineJobId: j.engineJobId,
    status,
    result: result as EngineResult | null,
    stage: strOrNull(j.stage, 'stage'),
    metrics: parseMetrics(j.metrics),
    warnings: j.warnings as string[],
    errorCode: strOrNull(j.errorCode, 'errorCode'),
    errorMessage: strOrNull(j.errorMessage, 'errorMessage'),
    errors,
    settingsApplied: {
      mode: applied.mode, targetSize: applied.targetSize,
      sizeUnit: typeof applied.sizeUnit === 'string' ? applied.sizeUnit : 'mm',
      elementOrder: typeof applied.elementOrder === 'string' ? applied.elementOrder : 'linear',
      notApplied: Array.isArray(applied.notApplied) ? applied.notApplied.filter((x): x is string => typeof x === 'string') : [],
    },
    qualityThresholds: j.qualityThresholds && typeof j.qualityThresholds === 'object'
      ? (j.qualityThresholds as Record<string, number | null>) : null,
    artifacts,
    preview: parsePreview(j.preview),
    solverValidation: strOrNull(j.solverValidation, 'solverValidation'),
    engineVersion: strOrNull(j.engineVersion, 'engineVersion'),
    startedAt: numOrNull(j.startedAt, 'startedAt'),
    finishedAt: numOrNull(j.finishedAt, 'finishedAt'),
    expiresAt: numOrNull(j.expiresAt, 'expiresAt'),
  };
}

export function parseUploadTarget(raw: unknown): UploadTarget {
  const u = obj(raw, 'upload');
  if (typeof u.maxBytes !== 'number' || typeof u.expiresAt !== 'number' || u.method !== 'PUT') {
    throw new WorkerResponseError('upload');
  }
  if (u.mode === 'direct') {
    if (typeof u.url !== 'string' || !u.url.startsWith('https://')) throw new WorkerResponseError('upload.url');
    const headers = obj(u.headers ?? {}, 'upload.headers');
    if (!Object.values(headers).every((h) => typeof h === 'string')) throw new WorkerResponseError('upload.headers');
    return { mode: 'direct', method: 'PUT', url: u.url, headers: headers as Record<string, string>,
      maxBytes: u.maxBytes, expiresAt: u.expiresAt };
  }
  if (u.mode === 'worker' && typeof u.path === 'string') {
    return { mode: 'worker', method: 'PUT', path: u.path, maxBytes: u.maxBytes, expiresAt: u.expiresAt };
  }
  throw new WorkerResponseError('upload.mode');
}

export function parseFileLink(raw: unknown): FileLink {
  const l = obj(raw, 'link');
  if (typeof l.bytes !== 'number' || typeof l.sha256 !== 'string' || !SHA_RE.test(l.sha256)) {
    throw new WorkerResponseError('link');
  }
  if (l.mode === 'stream') return { mode: 'stream', bytes: l.bytes, sha256: l.sha256 };
  if (l.mode === 'direct' && typeof l.url === 'string' && l.url.startsWith('https://') && typeof l.expiresAt === 'number') {
    return { mode: 'direct', url: l.url, expiresAt: l.expiresAt, bytes: l.bytes, sha256: l.sha256 };
  }
  throw new WorkerResponseError('link.mode');
}
