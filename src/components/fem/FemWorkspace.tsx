'use client';

import { useEffect, useRef, useState, type DragEvent } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft, ArrowRight, Box, Check, CreditCard, Download, FileBox, FileCheck2, Info, Loader2, LockKeyhole, Maximize2, Play, Rotate3D, RotateCcw, ShieldCheck, UploadCloud, X } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { DEFAULT_SETTINGS, inspectSelection, validSettings, type CadSelection, type MeshSettings, type SelectionError } from '@/lib/fem/preflight';
import styles from './fem.module.css';

type FemAccessState = {
  loaded: boolean;
  authenticated: boolean;
  subscribed: boolean;
  engineConfigured: boolean;
  quota: { used: number; limit: number; remaining: number };
};

type FemMetrics = {
  elements: number | null;
  hex: number | null;
  wedge: number | null;
  tet: number | null;
  minScaledJacobian: number | null;
  maxAspectRatio: number | null;
  invalidElements: number | null;
};

type ActiveJob = {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'canceled';
  metrics: FemMetrics | null;
  errorMessage: string | null;
};

export function FemWorkspace() {
  const t = useTranslations('FemAi');
  const input = useRef<HTMLInputElement>(null);
  const rawFile = useRef<File | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<CadSelection | null>(null);
  const [error, setError] = useState<SelectionError | null>(null);
  const [consent, setConsent] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [settings, setSettings] = useState<MeshSettings>({ ...DEFAULT_SETTINGS });
  const [access, setAccess] = useState<FemAccessState>({
    loaded: false,
    authenticated: false,
    subscribed: false,
    engineConfigured: false,
    quota: { used: 0, limit: 40, remaining: 0 },
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [job, setJob] = useState<ActiveJob | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/fem/jobs')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        setAccess({
          loaded: true,
          authenticated: Boolean(data.authenticated),
          subscribed: Boolean(data.subscribed),
          engineConfigured: Boolean(data.engineConfigured),
          quota: data.quota ?? { used: 0, limit: 40, remaining: 0 },
        });
      })
      .catch(() => {
        if (active) setAccess((prev) => ({ ...prev, loaded: true }));
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!job || (job.status !== 'queued' && job.status !== 'running')) return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/fem/jobs/${job.id}`);
        if (!res.ok) return;
        const data = await res.json();
        setJob({
          id: job.id,
          status: data.status,
          metrics: data.metrics ?? null,
          errorMessage: data.errorMessage ?? null,
        });
        if (data.status === 'completed') {
          navigate(3);
        }
      } catch {
        // 다음 폴링에서 재시도
      }
    }, 1500);
    return () => clearInterval(timer);
  }, [job]);

  const ready = Boolean(file && consent);
  const valid = validSettings(settings);
  const canRun =
    ready &&
    valid &&
    access.subscribed &&
    access.engineConfigured &&
    access.quota.remaining > 0 &&
    !submitting &&
    job?.status !== 'queued' &&
    job?.status !== 'running';

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
    select(e.dataTransfer.files);
  }

  function reset() {
    setFile(null);
    rawFile.current = null;
    setError(null);
    setConsent(false);
    setSettings({ ...DEFAULT_SETTINGS });
    setDragging(false);
    setSubmitError(null);
    setJob(null);
    if (input.current) input.current.value = '';
    navigate(0);
  }

  function field<K extends keyof MeshSettings>(key: K, value: MeshSettings[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  async function handleRunMesh() {
    if (!canRun || !rawFile.current) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const form = new FormData();
      form.append('file', rawFile.current);
      form.append('settings', JSON.stringify(settings));
      const res = await fetch('/api/fem/jobs', { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(data.error ?? 'JOB_SUBMIT_FAILED');
        return;
      }
      if (data.quota) {
        setAccess((prev) => ({ ...prev, quota: data.quota }));
      }
      setJob({
        id: data.id,
        status: data.status ?? 'queued',
        metrics: data.metrics ?? null,
        errorMessage: null,
      });
    } catch {
      setSubmitError('NETWORK_ERROR');
    } finally {
      setSubmitting(false);
    }
  }

  const metricValue = (key: string): string => {
    const m = job?.metrics;
    if (!m || job?.status !== 'completed') return '—';
    const map: Record<string, number | null> = {
      elements: m.elements,
      Hex: m.hex,
      Wedge: m.wedge,
      Tet: m.tet,
      reportJacobian: m.minScaledJacobian,
      reportAspect: m.maxAspectRatio,
      invalidElements: m.invalidElements,
    };
    const val = map[key];
    return val === null || val === undefined ? '—' : val.toLocaleString();
  };

  return (
    <section id="mesh-workspace" className={styles.workspaceSection}>
      <div className={styles.container}>
        <div className={styles.workspaceHeading}>
          <div>
            <p className={styles.eyebrow}>{t('workspaceLabel')}</p>
            <h2>{t('workspaceTitle')}</h2>
            <p>{t('workspaceDesc')}</p>
          </div>
          <span className={styles.offline}>
            <span className={styles.statusDot} />
            {access.engineConfigured ? t('engineConnected') : t('noEngine')}
          </span>
        </div>
        <div className={styles.workspace}>
          <div className={styles.workspaceBar}>
            <span>
              <Box size={17} /> FEM /{' '}
              <strong>
                {access.subscribed
                  ? t('quotaStatus', { used: access.quota.used, limit: access.quota.limit })
                  : t('previewTag')}
              </strong>
            </span>
            <button type="button" onClick={reset}>
              <RotateCcw size={14} />
              {t('reset')}
            </button>
          </div>
          <nav aria-label={t('workspaceLabel')} className={styles.steps}>
            {[0, 1, 2, 3].map((i) => (
              <button
                key={i}
                type="button"
                aria-current={step === i ? 'step' : undefined}
                onClick={() => navigate(i)}
              >
                <span>{i + 1}</span>
                {t(`step${i}`)}
              </button>
            ))}
          </nav>
          <div className={styles.workspaceBody}>
            <div className={styles.stage}>
              <h3 ref={heading} tabIndex={-1} className={styles.stageTitle}>
                {t(['uploadTitle', 'settingsTitle', 'blockedTitle', 'resultTitle'][step])}
              </h3>
              {step === 0 && (
                <>
                  <p className={styles.muted}>{t('uploadDesc')}</p>
                  <div
                    className={`${styles.dropzone} ${dragging ? styles.dragging : ''}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={drop}
                  >
                    <UploadCloud size={34} strokeWidth={1.4} />
                    <p>{t('drop')}</p>
                    <button
                      type="button"
                      onClick={() => input.current?.click()}
                      className={styles.secondary}
                    >
                      {t('browse')}
                    </button>
                    <input
                      ref={input}
                      type="file"
                      accept=".step,.stp,.brep"
                      aria-label={t('browse')}
                      className="sr-only"
                      tabIndex={-1}
                      onChange={(e) => {
                        if (e.target.files?.length) select(e.target.files);
                      }}
                    />
                    <small>
                      <LockKeyhole size={12} />
                      {t('localOnly')}
                    </small>
                  </div>
                  {error && (
                    <p role="alert" className={styles.error}>
                      {t(error)}
                    </p>
                  )}
                  {file && (
                    <div className={styles.selected} role="status">
                      <FileCheck2 size={23} />
                      <div>
                        <strong>{file.name}</strong>
                        <small>
                          {file.format} · {(file.size / 1024 / 1024).toFixed(2)} MiB · {t('fileSelected')}
                        </small>
                      </div>
                      <button
                        type="button"
                        aria-label={t('remove')}
                        onClick={() => {
                          setFile(null);
                          rawFile.current = null;
                          setError(null);
                        }}
                      >
                        <X size={18} />
                      </button>
                    </div>
                  )}
                  {file && <p className={styles.help}>{t('extensionOnly')}</p>}
                  <label className={styles.consent}>
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                    />
                    <span>{t('consent')}</span>
                  </label>
                  <p className={styles.help}>{t('localPolicy')}</p>
                  <div className={styles.stageActions}>
                    <button
                      type="button"
                      disabled={!ready}
                      className={styles.primary}
                      onClick={() => navigate(1)}
                    >
                      {t('nextSettings')}
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </>
              )}
              {step === 1 && (
                <>
                  <p className={styles.muted}>{t('settingsDesc')}</p>
                  {!ready ? (
                    <div className={styles.emptySmall}>
                      <FileBox size={30} />
                      <p>{t('needFile')}</p>
                      <button
                        type="button"
                        className={styles.secondary}
                        onClick={() => navigate(0)}
                      >
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
                            onChange={(e) => field('size', e.target.value)}
                            aria-invalid={!(Number(settings.size) > 0 && Number(settings.size) <= 100000)}
                          />
                        </label>
                        <label>
                          {t('unit')}
                          <select
                            value={settings.unit}
                            onChange={(e) => field('unit', e.target.value as MeshSettings['unit'])}
                          >
                            <option value="mm">mm</option>
                            <option value="cm">cm</option>
                            <option value="m">m</option>
                          </select>
                        </label>
                        <p className={styles.fullHelp}>{t('unitHelp')}</p>
                        <label className={styles.fullField}>
                          {t('strategy')}
                          <select
                            value={settings.strategy}
                            onChange={(e) =>
                              field('strategy', e.target.value as MeshSettings['strategy'])
                            }
                          >
                            {['hex', 'mixed', 'tet'].map((v) => (
                              <option key={v} value={v}>
                                {t(v)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <p className={styles.fullHelp}>{t('hexHelp')}</p>
                        <label className={styles.fullField}>
                          {t('order')}
                          <select
                            value={settings.order}
                            onChange={(e) => field('order', e.target.value as MeshSettings['order'])}
                          >
                            <option value="linear">{t('linear')}</option>
                            <option value="quadratic">{t('quadratic')}</option>
                          </select>
                        </label>
                        <label>
                          {t('jacobian')}
                          <input
                            id="fem-jacobian"
                            type="number"
                            min="0"
                            max="1"
                            step="any"
                            value={settings.jacobian}
                            onChange={(e) => field('jacobian', e.target.value)}
                            aria-invalid={!(Number(settings.jacobian) > 0 && Number(settings.jacobian) <= 1)}
                          />
                        </label>
                        <label>
                          {t('aspect')}
                          <input
                            id="fem-aspect"
                            type="number"
                            min="1"
                            max="1000"
                            step="any"
                            value={settings.aspect}
                            onChange={(e) => field('aspect', e.target.value)}
                            aria-invalid={!(Number(settings.aspect) >= 1 && Number(settings.aspect) <= 1000)}
                          />
                        </label>
                        <p className={styles.fullHelp}>{t('qualityHelp')}</p>
                      </div>
                      {!valid && (
                        <p role="alert" className={styles.error}>
                          {t('invalidSettings')}
                        </p>
                      )}
                      <div className={styles.stageActions}>
                        <button
                          type="button"
                          className={styles.secondary}
                          onClick={() => navigate(0)}
                        >
                          <ArrowLeft size={14} />
                          {t('back')}
                        </button>
                        <button
                          type="button"
                          disabled={!valid}
                          className={styles.primary}
                          onClick={() => navigate(2)}
                        >
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
                  {!access.subscribed ? (
                    <div className={styles.blocked}>
                      <CreditCard size={28} />
                      <span className={styles.offline}>{t('subscriptionRequiredBadge')}</span>
                      <p>{t('subscriptionRequiredDesc')}</p>
                      <Link
                        href={access.authenticated ? '/payment?plan=fem_pro' : '/auth'}
                        className={styles.primary}
                      >
                        {access.authenticated ? t('subscribeCta') : t('loginToSubscribe')}
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  ) : !access.engineConfigured ? (
                    <div className={styles.blocked}>
                      <LockKeyhole size={28} />
                      <span className={styles.offline}>{t('noEngine')}</span>
                      <p>{t('blockedDesc')}</p>
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

                  {ready && (
                    <div className={styles.review}>
                      <span title={file?.name}>{file?.name}</span>
                      <span>
                        {settings.size} {settings.unit} · {t(settings.strategy)} · {t(settings.order)}
                      </span>
                      <small>
                        {t('jacobian')}: {settings.jacobian} / {t('aspect')}: {settings.aspect}
                      </small>
                      {!valid && (
                        <p role="alert" className={styles.error}>
                          {t('invalidSettings')}
                        </p>
                      )}
                    </div>
                  )}

                  <ol className={styles.progress}>
                    {[0, 1, 2].map((i) => (
                      <li key={i}>
                        <span className={styles.progressIndex}>{i + 1}</span>
                        <span>{t(`phase${i}`)}</span>
                        <small>
                          {job?.status === 'completed'
                            ? t('doneLabel')
                            : job?.status === 'running' || job?.status === 'queued'
                              ? t('runningLabel')
                              : t('notRun')}
                        </small>
                      </li>
                    ))}
                  </ol>

                  {submitError && (
                    <p role="alert" className={styles.error}>
                      {submitError}
                    </p>
                  )}

                  <button
                    type="button"
                    disabled={!canRun}
                    onClick={handleRunMesh}
                    className={`${styles.primary} ${styles.runButton}`}
                    aria-describedby="fem-execution-status"
                  >
                    {submitting || job?.status === 'queued' || job?.status === 'running' ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : canRun ? (
                      <Play size={14} />
                    ) : (
                      <LockKeyhole size={14} />
                    )}
                    {t('run')}
                  </button>
                  <p id="fem-execution-status" className={styles.help}>
                    {access.subscribed
                      ? t('quotaStatus', { used: access.quota.used, limit: access.quota.limit })
                      : t('notice')}
                  </p>
                  <div className={styles.stageActions}>
                    <button
                      type="button"
                      className={styles.secondary}
                      onClick={() => navigate(1)}
                    >
                      <ArrowLeft size={14} />
                      {t('back')}
                    </button>
                    <button
                      type="button"
                      className={styles.secondary}
                      onClick={() => navigate(3)}
                    >
                      {t('viewResults')}
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </>
              )}
              {step === 3 && (
                <>
                  <div className={styles.viewer}>
                    <div className={styles.viewerToolbar}>
                      <span>3D {job?.status === 'completed' ? t('doneLabel') : t('awaitResult')}</span>
                      <div>
                        {[
                          { key: 'viewRotate', icon: Rotate3D },
                          { key: 'viewWire', icon: Box },
                          { key: 'viewFit', icon: Maximize2 },
                        ].map(({ key, icon: Icon }) => (
                          <button
                            key={key}
                            disabled
                            type="button"
                            aria-label={t(key)}
                            title={t(key)}
                          >
                            <Icon size={16} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className={styles.viewerEmpty}>
                      <Box size={42} strokeWidth={1} />
                      <h4>{t('noResults')}</h4>
                      <p>{t('noResultsDesc')}</p>
                    </div>
                  </div>
                  <h4 className={styles.reportTitle}>
                    {t('report')}
                    <span>{job?.status === 'completed' ? t('doneLabel') : t('awaitResult')}</span>
                  </h4>
                  <dl className={styles.metrics}>
                    {[
                      'elements',
                      'Hex',
                      'Wedge',
                      'Tet',
                      'reportJacobian',
                      'reportAspect',
                      'invalidElements',
                    ].map((key) => (
                      <div key={key}>
                        <dt>{['Hex', 'Wedge', 'Tet'].includes(key) ? key : t(key)}</dt>
                        <dd>{metricValue(key)}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className={styles.help}>{t('metricNote')}</p>
                  <div className={styles.exports}>
                    <h4>{t('exports')}</h4>
                    <p>{t('exportNote')}</p>
                    <div>
                      {(
                        [
                          { label: 'Abaqus INP', format: 'inp' },
                          { label: 'Gmsh MSH', format: 'msh' },
                        ] as const
                      ).map(({ label, format }) =>
                        job?.status === 'completed' ? (
                          <a
                            key={format}
                            href={`/api/fem/jobs/${job.id}/download?format=${format}`}
                            className={styles.secondary}
                          >
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
                    {i === 0 ? <Check size={13} /> : <Info size={13} />} {t(`policy${key}`)}
                  </h4>
                  <p>{t(`policy${key}Desc`)}</p>
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
