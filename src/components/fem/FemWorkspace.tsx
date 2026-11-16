'use client';

import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AlertTriangle, ArrowLeft, ArrowRight, Box, Check, CreditCard, Download, FileBox, FileCheck2, Info, Loader2, LockKeyhole, Maximize2, Palette, Play, RefreshCw, RotateCcw, ShieldCheck, UploadCloud, X } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { DEFAULT_SETTINGS, FIXED_ORDER, FIXED_UNIT, STRATEGIES, UNSUPPORTED_ORDERS, UNSUPPORTED_STRATEGIES, UNSUPPORTED_UNITS, inspectSelection, validSettings, type CadSelection, type MeshSettings, type SelectionError, type Strategy } from '@/lib/fem/preflight';
import type { JobView } from '@/lib/fem/job-service';
import { signOutFem } from '@/app/actions/fem-auth';
import { MAX_RENDER_TRIANGLES, MeshViewer, isViewerPayload, type ViewerPayload } from './MeshViewer';
import styles from './fem.module.css';

type Quota = { used: number; limit: number; remaining: number };
type EngineState = { configured: boolean; reachable: boolean | null; verified: boolean | null };

type FemAccessState = {
  loaded: boolean;
  /** 접근 정보 조회 자체가 실패했다(실행을 막는다). */
  failed: boolean;
  /** FEM 전용 로그인(별도 Supabase 프로젝트)이 이 서버에 설정돼 있는지. */
  authConfigured: boolean;
  authenticated: boolean;
  /** 로그인한 FEM 계정(본인 화면 표시용). */
  account: string | null;
  subscribed: boolean;
  entitled: boolean;
  accessMode: 'free_beta' | 'subscription';
  engine: EngineState;
  /** null = 이용량을 확인하지 못했다. 잔여 횟수를 추정하지 않는다. */
  quota: Quota | null;
  limit: number;
};

type RunPhase = 'idle' | 'creating' | 'uploading' | 'starting' | 'tracking';
type ErrorInfo = { key: string; code?: string };
type PreviewState =
  | { kind: 'none' }
  | { kind: 'loading' }
  | { kind: 'ready'; data: ViewerPayload }
  | { kind: 'omitted'; reason: 'too_large' | 'too_many_triangles' | 'not_generated' }
  | { kind: 'error' };

const POLL_FIRST_MS = 1500;
const POLL_MAX_MS = 10_000;
const POLL_MAX_FAILURES = 5;
/** 엔진 작업 제한(180초)에 대기·전송 여유를 더한 시간. 이후에는 자동 조회를 멈추고 수동 재조회만 한다. */
const POLL_GIVE_UP_MS = 10 * 60_000;
const ACTIVE = ['awaiting_upload', 'queued', 'running'];
const SUBMIT_ERRORS = ['UNAUTHORIZED', 'FEM_AUTH_NOT_CONFIGURED', 'SUBSCRIPTION_REQUIRED', 'ENGINE_NOT_CONFIGURED', 'QUOTA_EXCEEDED', 'DELIVERY_FAILED',
  'SUBMIT_REJECTED', 'UNSUPPORTED_SETTINGS', 'INVALID_FILE', 'UPLOAD_REJECTED', 'UPLOAD_MISSING', 'WORKER_JOB_MISSING',
  'REQUEST_ALREADY_CLOSED', 'INTERNAL_ERROR'];

function newRequestKey(): string {
  return crypto.randomUUID();
}

export function FemWorkspace() {
  const t = useTranslations('FemAi');
  const locale = useLocale();
  const input = useRef<HTMLInputElement>(null);
  const rawFile = useRef<File | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const requestKey = useRef<string>('');
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<CadSelection | null>(null);
  const [error, setError] = useState<SelectionError | null>(null);
  const [consent, setConsent] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [settings, setSettings] = useState<MeshSettings>({ ...DEFAULT_SETTINGS });
  const [access, setAccess] = useState<FemAccessState>({
    loaded: false, failed: false, authConfigured: false, authenticated: false, account: null, subscribed: false, entitled: false, accessMode: 'subscription',
    engine: { configured: false, reachable: null, verified: null }, quota: null, limit: 40,
  });
  const [phase, setPhase] = useState<RunPhase>('idle');
  const [submitError, setSubmitError] = useState<ErrorInfo | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<JobView | null>(null);
  /** 자동 조회가 멈춘 이유. null = 조회 중이거나 끝남. */
  const [pollStopped, setPollStopped] = useState<'failures' | 'timeout' | 'auth' | null>(null);
  const [pollNonce, setPollNonce] = useState(0);
  const [preview, setPreview] = useState<PreviewState>({ kind: 'none' });
  const [wire, setWire] = useState(true);
  const [qualityColor, setQualityColor] = useState(false);
  const [fitSignal, setFitSignal] = useState(0);

  const loadAccess = useCallback(async () => {
    try {
      const res = await fetch('/api/fem/jobs', { cache: 'no-store' });
      if (!res.ok) throw new Error('access');
      const data = await res.json();
      setAccess({
        loaded: true, failed: false,
        authConfigured: Boolean(data.authConfigured),
        authenticated: Boolean(data.authenticated),
        account: typeof data.account === 'string' ? data.account : null,
        subscribed: Boolean(data.subscribed),
        entitled: Boolean(data.entitled),
        accessMode: data.accessMode === 'free_beta' ? 'free_beta' : 'subscription',
        engine: {
          configured: Boolean(data.engine?.configured),
          reachable: typeof data.engine?.reachable === 'boolean' ? data.engine.reachable : null,
          verified: typeof data.engine?.verified === 'boolean' ? data.engine.verified : null,
        },
        quota: data.quota && typeof data.quota.remaining === 'number' ? data.quota : null,
        limit: typeof data.limit === 'number' ? data.limit : 40,
      });
    } catch {
      setAccess((prev) => ({ ...prev, loaded: true, failed: true, quota: null }));
    }
  }, []);

  useEffect(() => {
    // 화면 진입 시 1회 조회(외부 상태 동기화).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAccess();
  }, [loadAccess]);

  const live = access.engine.configured;
  const jobActive = job ? ACTIVE.includes(job.status) : false;
  const busy = phase !== 'idle' && (phase !== 'tracking' || jobActive || job === null);

  // 상태 조회: 점점 느려지는 간격, 연속 실패·장시간 경과 시 중단, 탭이 가려지면 쉬었다가 돌아오면 재개.
  useEffect(() => {
    if (phase !== 'tracking' || !jobId) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let delay = POLL_FIRST_MS;
    let failures = 0;
    const startedAt = Date.now();

    const tick = async () => {
      if (stopped) return;
      if (document.hidden) { timer = setTimeout(tick, 1000); return; }
      let ok = false;
      let terminal = false;
      try {
        const res = await fetch(`/api/fem/jobs/${jobId}`, { cache: 'no-store' });
        if (res.status === 401 || res.status === 403) {
          // 로그인 만료·구독 종료: 서버가 거절했다. 조회를 멈추고 상태를 다시 읽는다(결과는 제공되지 않는다).
          if (stopped) return;
          setPollStopped('auth');
          void loadAccess();
          return;
        }
        if (res.ok) {
          const data = (await res.json()) as JobView;
          if (stopped) return;
          setJob(data);
          ok = data.sync !== 'unavailable';      // 워커 조회 실패는 실패로 센다(이전 상태로 덮지 않는다)
          terminal = !ACTIVE.includes(data.status);
        }
      } catch { /* 아래에서 실패로 처리 */ }
      if (stopped) return;
      if (terminal) {
        setPollStopped(null);
        void loadAccess();
        return;
      }
      failures = ok ? 0 : failures + 1;
      if (failures >= POLL_MAX_FAILURES) { setPollStopped('failures'); return; }
      if (Date.now() - startedAt > POLL_GIVE_UP_MS) { setPollStopped('timeout'); return; }
      delay = Math.min(POLL_MAX_MS, Math.round(delay * 1.5));
      timer = setTimeout(tick, delay);
    };
    timer = setTimeout(tick, 0);
    return () => { stopped = true; if (timer) clearTimeout(timer); };
  }, [phase, jobId, pollNonce, loadAccess]);

  // 완료된 작업의 실제 미리보기만 가져온다.
  const jobStatus = job?.status;
  const previewAvailable = jobStatus === 'completed' && job?.sync === 'ok' && job.preview?.available === true;
  const previewReason = jobStatus === 'completed' && job?.preview && !job.preview.available ? job.preview.reason : null;
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!jobId || jobStatus !== 'completed') { setPreview({ kind: 'none' }); return; }
      if (!previewAvailable) {
        setPreview(previewReason === 'too_large' ? { kind: 'omitted', reason: 'too_large' }
          : previewReason ? { kind: 'omitted', reason: 'not_generated' } : { kind: 'none' });
        return;
      }
      setPreview({ kind: 'loading' });
      try {
        const res = await fetch(`/api/fem/jobs/${jobId}/preview`, { cache: 'no-store' });
        if (!res.ok) throw new Error('preview');
        let data: unknown = await res.json();
        if (data && typeof data === 'object' && (data as { mode?: string }).mode === 'direct') {
          const direct = await fetch((data as { url: string }).url);   // 짧게 유효한 서명 URL
          if (!direct.ok) throw new Error('preview');
          data = await direct.json();
        }
        if (cancelled) return;
        if (!isViewerPayload(data)) throw new Error('preview');
        if (data.triangles.length / 3 > MAX_RENDER_TRIANGLES) { setPreview({ kind: 'omitted', reason: 'too_many_triangles' }); return; }
        setPreview({ kind: 'ready', data });
      } catch {
        if (!cancelled) setPreview({ kind: 'error' });
      }
    })();
    return () => { cancelled = true; };
  }, [jobId, jobStatus, previewAvailable, previewReason]);

  const ready = Boolean(file && consent);
  const valid = validSettings(settings);
  const quotaOk = access.quota !== null && access.quota.remaining > 0;
  const canRun = ready && valid && !access.failed && access.entitled && live &&
    access.engine.reachable !== false && quotaOk && !busy;

  function navigate(next: number) {
    setStep(next);
    requestAnimationFrame(() => heading.current?.focus());
  }

  function select(files: FileList | File[]) {
    const arr = Array.from(files);
    const result = inspectSelection(arr);
    setFile(result.file ?? null);
    setError(result.error ?? null);
    rawFile.current = result.file && arr.length === 1 ? arr[0] : null;
    if (input.current) input.current.value = '';
  }

  function drop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    if (!busy) select(e.dataTransfer.files);
  }

  function reset() {
    setFile(null);
    rawFile.current = null;
    setError(null);
    setConsent(false);
    setSettings({ ...DEFAULT_SETTINGS });
    setDragging(false);
    setSubmitError(null);
    setPhase('idle');
    setJobId(null);
    setJob(null);
    setPollStopped(null);
    setPreview({ kind: 'none' });
    requestKey.current = '';
    if (input.current) input.current.value = '';
    navigate(0);
  }

  async function handleRunMesh() {
    const upload = rawFile.current;
    if (!canRun || !upload) return;
    setSubmitError(null);
    setJob(null);
    setJobId(null);
    setPollStopped(null);
    // 같은 시도의 재전송은 같은 키를 쓴다(서버가 작업·횟수를 다시 만들지 않는다). 끝난 시도 뒤에는 새 키.
    if (!requestKey.current) requestKey.current = newRequestKey();
    const fail = (key: string, code?: string, closeKey = true) => {
      setSubmitError({ key, code });
      setPhase('idle');
      if (closeKey) requestKey.current = '';
      void loadAccess();
    };
    const errorKey = (code: unknown) => (typeof code === 'string' && SUBMIT_ERRORS.includes(code) ? code : 'INTERNAL_ERROR');
    try {
      setPhase('creating');
      const res = await fetch('/api/fem/jobs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestKey: requestKey.current, fileName: upload.name, fileSize: upload.size,
                               settings: { size: Number(settings.size), strategy: settings.strategy } }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return fail(errorKey(data.error), data.code);
      if (data.quota) setAccess((prev) => ({ ...prev, quota: data.quota }));
      const id = data.id as string;
      setJobId(id);

      if (data.upload) {
        setPhase('uploading');
        let up: Response;
        try {
          up = await fetch(data.upload.url, { method: 'PUT', headers: data.upload.headers ?? {}, body: upload });
        } catch {
          return fail('UPLOAD_FAILED', undefined, false);     // 같은 키로 다시 시도할 수 있다
        }
        if (!up.ok) {
          const body = data.upload.mode === 'proxy' ? await up.json().catch(() => ({})) : {};
          return fail(data.upload.mode === 'proxy' ? errorKey(body.error) : 'UPLOAD_FAILED', body.code, false);
        }
      }

      setPhase('starting');
      const started = await fetch(`/api/fem/jobs/${id}/start`, { method: 'POST' });
      const body = await started.json().catch(() => ({}));
      if (!started.ok) {
        const retryable = body.error === 'DELIVERY_FAILED' || body.error === 'UPLOAD_MISSING';
        return fail(errorKey(body.error), body.code, !retryable);
      }
      requestKey.current = '';
      setPhase('tracking');
      setPollNonce((n) => n + 1);
    } catch {
      fail('NETWORK_ERROR', undefined, false);
    }
  }

  function recheck() {
    setPollStopped(null);
    setPollNonce((n) => n + 1);
  }

  const done = job?.status === 'completed';
  const fmt = (v: number | null | undefined, digits?: number): string => {
    if (v === null || v === undefined) return '—';
    return digits === undefined ? v.toLocaleString() : v.toLocaleString(undefined, { maximumFractionDigits: digits });
  };
  const m = job?.metrics ?? null;
  const metricRows: { key: string; label: string; value: string }[] = [
    { key: 'elements', label: t('elements'), value: fmt(m?.elements) },
    { key: 'nodes', label: t('nodes'), value: fmt(m?.nodes) },
    { key: 'hex', label: 'Hex', value: fmt(m?.hex) },
    { key: 'wedge', label: 'Wedge', value: fmt(m?.wedge) },
    { key: 'tet', label: 'Tet', value: fmt(m?.tet) },
    { key: 'sj', label: t('reportJacobian'), value: fmt(m?.minScaledJacobian, 4) },
    { key: 'edge', label: t('reportEdgeRatio'), value: fmt(m?.maxEdgeRatio, 3) },
    { key: 'below', label: t('belowThreshold'), value: fmt(m?.belowThresholdElements) },
    { key: 'invalid', label: t('invalidElements'), value: fmt(m?.invalidElements) },
  ];
  const th = job?.qualityThresholds ?? null;
  const engineBadge = !live ? t('noEngine')
    : access.engine.reachable === false ? t('engineUnreachable')
    : access.engine.verified ? t('engineVerified') : t('engineReachable');
  const statusLabel = (s: string | undefined) =>
    s === 'completed' ? t('doneLabel') : s === 'failed' ? t('failedLabel') : s === 'canceled' ? t('canceledLabel')
      : s === 'running' ? t('runningLabel') : s === 'queued' || s === 'awaiting_upload' ? t('queuedLabel') : t('notRun');
  const phaseLabel = phase === 'creating' ? t('phaseCreating') : phase === 'uploading' ? t('phaseUploading')
    : phase === 'starting' ? t('phaseStarting') : null;
  const firstError = job?.errors?.[0];

  return (
    <section id="mesh-workspace" className={styles.workspaceSection}>
      <div className={styles.container}>
        <div className={styles.workspaceHeading}>
          <div>
            <p className={styles.eyebrow}>{t('workspaceLabel')}</p>
            <h2>{t('workspaceTitle')}</h2>
            <p>{t(live ? 'workspaceDescLive' : 'workspaceDesc')}</p>
            {access.accessMode === 'free_beta' && <p>{t('betaNotice', { limit: access.limit })}</p>}
          </div>
          <span className={styles.offline}>
            <span className={styles.statusDot} />
            {engineBadge}
          </span>
        </div>
        <div className={styles.workspace}>
          <div className={styles.workspaceBar}>
            <span>
              <Box size={17} /> FEM /{' '}
              <strong>
                {!live ? (access.entitled && access.quota ? t('quotaStatus', { used: access.quota.used, limit: access.quota.limit }) : t('previewTag'))
                  : !access.authenticated ? t('loginRequiredBadge')
                  : !access.entitled ? t('subscriptionRequiredBadge')
                  : access.quota ? t('quotaStatus', { used: access.quota.used, limit: access.quota.limit })
                  : t('quotaUnknown')}
              </strong>
            </span>
            <button type="button" onClick={reset} disabled={busy}>
              <RotateCcw size={14} />
              {t('reset')}
            </button>
          </div>
          <nav aria-label={t('workspaceLabel')} className={styles.steps}>
            {[0, 1, 2, 3].map((i) => (
              <button key={i} type="button" aria-current={step === i ? 'step' : undefined} onClick={() => navigate(i)}>
                <span>{i + 1}</span>
                {t(`step${i}`)}
              </button>
            ))}
          </nav>
          <div className={styles.workspaceBody}>
            <div className={styles.stage}>
              <h3 ref={heading} tabIndex={-1} className={styles.stageTitle}>
                {t(['uploadTitle', 'settingsTitle', live ? 'runTitle' : 'blockedTitle', 'resultTitle'][step])}
              </h3>
              {step === 0 && (
                <>
                  <p className={styles.muted}>{t('uploadDesc')}</p>
                  <div
                    className={`${styles.dropzone} ${dragging ? styles.dragging : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={drop}
                  >
                    <UploadCloud size={34} strokeWidth={1.4} />
                    <p>{t('drop')}</p>
                    <button type="button" onClick={() => input.current?.click()} className={styles.secondary} disabled={busy}>
                      {t('browse')}
                    </button>
                    <input
                      ref={input}
                      type="file"
                      accept=".step,.stp,.brep"
                      aria-label={t('browse')}
                      className="sr-only"
                      tabIndex={-1}
                      onChange={(e) => { if (e.target.files?.length) select(e.target.files); }}
                    />
                    <small>
                      <LockKeyhole size={12} />
                      {t(live ? 'localOnlyLive' : 'localOnly')}
                    </small>
                  </div>
                  {error && <p role="alert" className={styles.error}>{t(error)}</p>}
                  {file && (
                    <div className={styles.selected} role="status">
                      <FileCheck2 size={23} />
                      <div>
                        <strong>{file.name}</strong>
                        <small>
                          {file.format} · {(file.size / 1024 / 1024).toFixed(2)} MiB · {t('fileSelected')}
                        </small>
                      </div>
                      <button type="button" aria-label={t('remove')} disabled={busy}
                        onClick={() => { setFile(null); rawFile.current = null; setError(null); }}>
                        <X size={18} />
                      </button>
                    </div>
                  )}
                  {file && <p className={styles.help}>{t('extensionOnly')}</p>}
                  <label className={styles.consent}>
                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                    <span>{t(live ? 'consentLive' : 'consent')}</span>
                  </label>
                  <p className={styles.help}>{t(live ? 'localPolicyLive' : 'localPolicy')}</p>
                  <div className={styles.stageActions}>
                    <button type="button" disabled={!ready} className={styles.primary} onClick={() => navigate(1)}>
                      {t('nextSettings')}
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </>
              )}
              {step === 1 && (
                <>
                  <p className={styles.muted}>{t(live ? 'settingsDescLive' : 'settingsDesc')}</p>
                  {!ready ? (
                    <div className={styles.emptySmall}>
                      <FileBox size={30} />
                      <p>{t('needFile')}</p>
                      <button type="button" className={styles.secondary} onClick={() => navigate(0)}>
                        {t('step0')}
                        <ArrowLeft size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className={styles.fileSummary}>
                        <FileBox size={16} />
                        <strong>{file?.name}</strong>
                        <span>{t('fileSelected')}</span>
                      </div>
                      <div className={styles.fields}>
                        <label>
                          {t('elementSize')}
                          <input
                            id="fem-size"
                            type="number"
                            min="0"
                            max="100000"
                            step="any"
                            value={settings.size}
                            disabled={busy}
                            onChange={(e) => setSettings((s) => ({ ...s, size: e.target.value }))}
                            aria-invalid={!(Number(settings.size) > 0 && Number(settings.size) <= 100000)}
                          />
                        </label>
                        <label>
                          {t('unit')}
                          <select value={FIXED_UNIT} disabled={busy} onChange={() => undefined}>
                            <option value={FIXED_UNIT}>{FIXED_UNIT}</option>
                            {UNSUPPORTED_UNITS.map((u) => (
                              <option key={u} value={u} disabled>{u} · {t('unsupportedOption')}</option>
                            ))}
                          </select>
                        </label>
                        <p className={styles.fullHelp}>{t('unitHelp')}</p>
                        <label className={styles.fullField}>
                          {t('strategy')}
                          <select
                            value={settings.strategy}
                            disabled={busy}
                            onChange={(e) => setSettings((s) => ({ ...s, strategy: e.target.value as Strategy }))}
                          >
                            {STRATEGIES.map((v) => <option key={v} value={v}>{t(v)}</option>)}
                            {UNSUPPORTED_STRATEGIES.map((v) => (
                              <option key={v} value={v} disabled>{t(v)} · {t('unsupportedOption')}</option>
                            ))}
                          </select>
                        </label>
                        <p className={styles.fullHelp}>{t(settings.strategy === 'tet' ? 'tetHelp' : 'hexHelp')}</p>
                        <label className={styles.fullField}>
                          {t('order')}
                          <select value={FIXED_ORDER} disabled={busy} onChange={() => undefined}>
                            <option value={FIXED_ORDER}>{t('linear')}</option>
                            {UNSUPPORTED_ORDERS.map((v) => (
                              <option key={v} value={v} disabled>{t(v)} · {t('unsupportedOption')}</option>
                            ))}
                          </select>
                        </label>
                        <p className={styles.fullHelp}>{t('qualityHelp')}</p>
                      </div>
                      {!valid && <p role="alert" className={styles.error}>{t('invalidSettings')}</p>}
                      <div className={styles.stageActions}>
                        <button type="button" className={styles.secondary} onClick={() => navigate(0)}>
                          <ArrowLeft size={14} />
                          {t('back')}
                        </button>
                        <button type="button" disabled={!valid} className={styles.primary} onClick={() => navigate(2)}>
                          {t('review')}
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
              {step === 2 && (
                <>
                  {access.failed ? (
                    <div className={styles.blocked}>
                      <AlertTriangle size={28} />
                      <span className={styles.offline}>{t('accessUnknown')}</span>
                      <p>{t('accessUnknownDesc')}</p>
                      <button type="button" className={styles.secondary} onClick={() => void loadAccess()}>
                        <RefreshCw size={14} />
                        {t('recheck')}
                      </button>
                    </div>
                  ) : !access.authenticated ? (
                    <div className={styles.blocked}>
                      <LockKeyhole size={28} />
                      <span className={styles.offline}>{t('loginRequiredBadge')}</span>
                      {/* FEM 전용 계정으로 로그인한다. 로그인 뒤 이 화면으로 돌아오며, 선택한 파일은 브라우저에만 있으므로 유지되지 않는다. */}
                      {access.authConfigured ? (
                        <>
                          <p>{t('loginRequiredDesc')}</p>
                          <Link href="/fem-ai/auth" className={styles.primary}>
                            {t('loginCta')}
                            <ArrowRight size={14} />
                          </Link>
                        </>
                      ) : (
                        <p>{t('authUnavailableDesc')}</p>
                      )}
                    </div>
                  ) : !access.entitled ? (
                    <div className={styles.blocked}>
                      <CreditCard size={28} />
                      <span className={styles.offline}>{t('subscriptionRequiredBadge')}</span>
                      {/* 결제 화면은 기본(Sniff) 계정에 구독을 만든다. FEM 계정용 결제 연결 전에는 링크를 두지 않는다. */}
                      <p>{t('subscriptionRequiredDesc')}</p>
                    </div>
                  ) : !live ? (
                    <div className={styles.blocked}>
                      <LockKeyhole size={28} />
                      <span className={styles.offline}>{t('noEngine')}</span>
                      <p>{t('blockedDesc')}</p>
                    </div>
                  ) : access.engine.reachable === false ? (
                    <div className={styles.blocked}>
                      <AlertTriangle size={28} />
                      <span className={styles.offline}>{t('engineUnreachable')}</span>
                      <p>{t('engineUnreachableDesc')}</p>
                      <button type="button" className={styles.secondary} onClick={() => void loadAccess()}>
                        <RefreshCw size={14} />
                        {t('recheck')}
                      </button>
                    </div>
                  ) : access.quota === null ? (
                    <div className={styles.blocked}>
                      <AlertTriangle size={28} />
                      <span className={styles.offline}>{t('quotaUnknown')}</span>
                      <p>{t('quotaUnknownDesc')}</p>
                      <button type="button" className={styles.secondary} onClick={() => void loadAccess()}>
                        <RefreshCw size={14} />
                        {t('recheck')}
                      </button>
                    </div>
                  ) : access.quota.remaining <= 0 ? (
                    <div className={styles.blocked}>
                      <LockKeyhole size={28} />
                      <span className={styles.offline}>
                        {t('quotaStatus', { used: access.quota.used, limit: access.quota.limit })}
                      </span>
                      <p>{t('quotaExceededDesc')}</p>
                    </div>
                  ) : null}

                  {/* 로그인 · 구독 · 이용량 · 엔진은 서로 다른 조건이다. 각각 따로 확인해 따로 보여 준다. */}
                  <dl className={styles.statusList}>
                    <div>
                      <dt>{t('statusLogin')}</dt>
                      <dd>
                        {access.failed || !access.loaded ? t('stateUnknown') : access.authenticated ? t('stateSignedIn') : t('stateSignedOut')}
                        {access.authenticated && access.account ? ` · ${access.account}` : ''}
                        {access.authenticated && (
                          <>
                            {' '}
                            <button type="button" className={styles.linkButton} onClick={() => void signOutFem(locale)}>
                              {t('signOut')}
                            </button>
                          </>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>{t(access.accessMode === 'free_beta' ? 'statusAccess' : 'statusSubscription')}</dt>
                      <dd>{access.failed || !access.loaded || !access.authenticated ? t('stateUnknown') : access.accessMode === 'free_beta' ? t('betaAccess') : access.subscribed ? t('stateSubscribed') : t('stateNotSubscribed')}</dd>
                    </div>
                    <div>
                      <dt>{t('statusQuota')}</dt>
                      <dd>{access.entitled && access.quota ? t('quotaStatus', { used: access.quota.used, limit: access.quota.limit }) : t('stateUnknown')}</dd>
                    </div>
                    <div>
                      <dt>{t('statusEngine')}</dt>
                      <dd>{engineBadge}</dd>
                    </div>
                  </dl>

                  {ready && (
                    <div className={styles.review}>
                      <span title={file?.name}>{file?.name}</span>
                      <span>
                        {settings.size} {FIXED_UNIT} · {t(settings.strategy)} · {t('linear')}
                      </span>
                      <small>{t('fixedThresholdNote')}</small>
                      {!valid && <p role="alert" className={styles.error}>{t('invalidSettings')}</p>}
                    </div>
                  )}

                  <ol className={styles.progress}>
                    <li>
                      <span className={styles.progressIndex}>1</span>
                      <span>{t('phase0')}</span>
                      <small>{phaseLabel ?? (jobId ? t('doneLabel') : t('notRun'))}</small>
                    </li>
                    <li>
                      <span className={styles.progressIndex}>2</span>
                      <span>{t('phase1')}</span>
                      <small>
                        {phase === 'tracking' || job ? statusLabel(job?.status ?? 'queued') : t('notRun')}
                        {job?.status === 'running' && job.stage ? ` · ${job.stage}` : ''}
                      </small>
                    </li>
                    <li>
                      <span className={styles.progressIndex}>3</span>
                      <span>{t('phase2')}</span>
                      <small>{done ? (job?.result === 'warning' ? t('warningLabel') : t('doneLabel')) : t('notRun')}</small>
                    </li>
                  </ol>
                  {live && <p className={styles.help}>{t('noProgressNote')}</p>}

                  {submitError && (
                    <p role="alert" className={styles.error}>
                      {t(`err_${submitError.key}`)}
                      {submitError.code ? ` (${submitError.code})` : ''}
                    </p>
                  )}
                  {job?.sync === 'unavailable' && <p role="alert" className={styles.error}>{t('syncUnavailable')}</p>}
                  {pollStopped && (
                    <div className={styles.blocked}>
                      <AlertTriangle size={28} />
                      <span className={styles.offline}>{t('pollStoppedBadge')}</span>
                      <p>{t(pollStopped === 'failures' ? 'pollStoppedFailures' : pollStopped === 'auth' ? 'sessionExpired' : 'pollStoppedTimeout')}</p>
                      {pollStopped === 'auth' ? (
                        <Link href="/fem-ai/auth" className={styles.secondary}>
                          {t('loginCta')}
                          <ArrowRight size={14} />
                        </Link>
                      ) : (
                        <button type="button" className={styles.secondary} onClick={recheck}>
                          <RefreshCw size={14} />
                          {t('recheck')}
                        </button>
                      )}
                    </div>
                  )}
                  {job && !jobActive && job.status !== 'completed' && (
                    <p role="alert" className={styles.error}>
                      {t(job.status === 'canceled' ? 'jobCanceled' : 'jobFailed')}
                      {job.errorCode ? ` (${job.errorCode})` : ''}
                    </p>
                  )}

                  <button
                    type="button"
                    disabled={!canRun}
                    onClick={handleRunMesh}
                    className={`${styles.primary} ${styles.runButton}`}
                    aria-describedby="fem-execution-status"
                  >
                    {busy ? <Loader2 size={14} className="animate-spin" /> : canRun ? <Play size={14} /> : <LockKeyhole size={14} />}
                    {t(live ? 'runLive' : 'run')}
                  </button>
                  <p id="fem-execution-status" className={styles.help}>
                    {live && !access.authenticated ? t('loginRequiredDesc')
                      : !access.entitled ? t(live ? 'noticeLive' : 'notice')
                      : access.quota ? `${t('quotaStatus', { used: access.quota.used, limit: access.quota.limit })} · ${t('quotaRule')}`
                      : t('quotaUnknown')}
                  </p>
                  <div className={styles.stageActions}>
                    <button type="button" className={styles.secondary} onClick={() => navigate(1)}>
                      <ArrowLeft size={14} />
                      {t('back')}
                    </button>
                    <button type="button" className={styles.secondary} onClick={() => navigate(3)}>
                      {t('viewResults')}
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </>
              )}
              {step === 3 && (
                <>
                  {job?.sync === 'unavailable' && <p role="alert" className={styles.error}>{t('syncUnavailable')}</p>}
                  {job?.sync === 'expired' && <p role="alert" className={styles.error}>{t('resultExpired')}</p>}
                  {done && job?.result === 'warning' && (
                    <div role="status" className={styles.warningBox}>
                      <strong><AlertTriangle size={15} /> {t('warningTitle')}</strong>
                      <p>{t('warningDesc')}</p>
                      <ul>{job.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
                    </div>
                  )}
                  {job?.status === 'failed' && (
                    <div role="alert" className={styles.failureBox}>
                      <strong>{t('jobFailed')}{job.errorCode ? ` · ${job.errorCode}` : ''}</strong>
                      {(firstError?.message ?? job.errorMessage) && <p>{firstError?.message ?? job.errorMessage}</p>}
                      {firstError?.hint && !(firstError.message ?? '').includes(firstError.hint) && (
                        <p><em>{t('hintLabel')}</em> {firstError.hint}</p>
                      )}
                      {firstError?.cause && (
                        <details>
                          <summary>{t('causeLabel')}</summary>
                          <dl>
                            {Object.entries(firstError.cause).map(([k, v]) => (
                              <div key={k}><dt>{k}</dt><dd>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</dd></div>
                            ))}
                          </dl>
                        </details>
                      )}
                      <p>{t('failureNoFiles')}</p>
                    </div>
                  )}
                  <div className={styles.viewer}>
                    <div className={styles.viewerToolbar}>
                      <span>3D {preview.kind === 'ready' ? t('previewReal') : statusLabel(job?.status)}</span>
                      <div>
                        <button type="button" disabled={preview.kind !== 'ready'} aria-pressed={wire}
                          aria-label={t('viewWire')} title={t('viewWire')} onClick={() => setWire((v) => !v)}>
                          <Box size={16} />
                        </button>
                        <button type="button" disabled={preview.kind !== 'ready'} aria-pressed={qualityColor}
                          aria-label={t('viewQuality')} title={t('viewQuality')} onClick={() => setQualityColor((v) => !v)}>
                          <Palette size={16} />
                        </button>
                        <button type="button" disabled={preview.kind !== 'ready'}
                          aria-label={t('viewFit')} title={t('viewFit')} onClick={() => setFitSignal((n) => n + 1)}>
                          <Maximize2 size={16} />
                        </button>
                      </div>
                    </div>
                    {preview.kind === 'ready' ? (
                      <MeshViewer data={preview.data} wire={wire} quality={qualityColor} fitSignal={fitSignal}
                        onError={() => setPreview({ kind: 'error' })} />
                    ) : (
                      <div className={styles.viewerEmpty}>
                        {preview.kind === 'loading' ? <Loader2 size={42} strokeWidth={1} className="animate-spin" /> : <Box size={42} strokeWidth={1} />}
                        <h4>
                          {preview.kind === 'loading' ? t('previewLoading')
                            : preview.kind === 'omitted' ? t('previewOmitted')
                            : preview.kind === 'error' ? t('previewError') : t('noResults')}
                        </h4>
                        <p>
                          {preview.kind === 'omitted' ? t(preview.reason === 'not_generated' ? 'previewNotGenerated' : 'previewOmittedDesc')
                            : preview.kind === 'error' ? t('previewErrorDesc')
                            : preview.kind === 'loading' ? '' : t(live ? 'noResultsDescLive' : 'noResultsDesc')}
                        </p>
                      </div>
                    )}
                  </div>
                  {preview.kind === 'ready' && <p className={styles.help}>{t('previewNote')}</p>}
                  <h4 className={styles.reportTitle}>
                    {t('report')}
                    <span>{done ? (job?.result === 'warning' ? t('warningLabel') : t('doneLabel')) : statusLabel(job?.status)}</span>
                  </h4>
                  <dl className={styles.metrics}>
                    {metricRows.map((r) => (
                      <div key={r.key}>
                        <dt>{r.label}</dt>
                        <dd>{r.value}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className={styles.help}>{t('metricNote')}</p>
                  <p className={styles.help}>
                    {th ? t('thresholdNote', {
                      hexSj: th.hex_scaled_jacobian_min ?? '—', hexSkew: th.hex_skew_max ?? '—', tetSj: th.tet_scaled_jacobian_min ?? '—',
                    }) : t('fixedThresholdNote')}
                  </p>
                  <div className={styles.exports}>
                    <h4>{t('exports')}</h4>
                    <p>{t(done ? 'exportNoteDone' : 'exportNote')}</p>
                    <div>
                      {(
                        [
                          { label: 'Abaqus INP', format: 'inp' },
                          { label: 'Gmsh MSH', format: 'msh' },
                        ] as const
                      ).map(({ label, format }) =>
                        done && job?.sync === 'ok' && job.artifacts ? (
                          <a key={format} href={`/api/fem/jobs/${jobId}/download?format=${format}`} className={styles.secondary}>
                            <Download size={15} />
                            {label}
                          </a>
                        ) : (
                          <button key={format} type="button" disabled className={styles.secondary}>
                            <Download size={15} />
                            {label}
                            <LockKeyhole size={12} />
                          </button>
                        )
                      )}
                    </div>
                    {done && job?.artifacts && (
                      <dl className={styles.hashes}>
                        {(['inp', 'msh'] as const).map((f) => (
                          <div key={f}>
                            <dt>{f.toUpperCase()} · {job.artifacts![f].bytes.toLocaleString()} B · SHA-256</dt>
                            <dd>{job.artifacts![f].sha256}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    {done && job?.expiresAt && (
                      <p>{t('expiryNote', { time: new Date(job.expiresAt * 1000).toLocaleString() })}</p>
                    )}
                    {done && <p>{t('solverNote')}</p>}
                  </div>
                </>
              )}
            </div>
            <aside className={styles.policy}>
              <ShieldCheck size={25} />
              <h3>{t('policyTitle')}</h3>
              {['Now', 'Before', 'Training'].map((key, i) => (
                <div key={key}>
                  <h4>
                    {i === 0 ? <Check size={13} /> : <Info size={13} />} {t(live ? `policy${key}Live` : `policy${key}`)}
                  </h4>
                  <p>{t(live ? `policy${key}DescLive` : `policy${key}Desc`)}</p>
                </div>
              ))}
              <Link href="/privacy">
                {t('privacyLink')}
                <ArrowRight size={12} />
              </Link>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}
