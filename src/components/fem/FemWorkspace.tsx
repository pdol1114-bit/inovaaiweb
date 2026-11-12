'use client';

import { useRef, useState, type DragEvent } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft, ArrowRight, Box, Check, Download, FileBox, FileCheck2, Info, LockKeyhole, Maximize2, Rotate3D, RotateCcw, ShieldCheck, UploadCloud, X } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { DEFAULT_SETTINGS, inspectSelection, validSettings, type CadSelection, type MeshSettings, type SelectionError } from '@/lib/fem/preflight';
import styles from './fem.module.css';

export function FemWorkspace() {
  const t = useTranslations('FemAi');
  const input = useRef<HTMLInputElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [step,setStep] = useState(0);
  const [file,setFile] = useState<CadSelection | null>(null);
  const [error,setError] = useState<SelectionError | null>(null);
  const [consent,setConsent] = useState(false);
  const [dragging,setDragging] = useState(false);
  const [settings,setSettings] = useState<MeshSettings>({...DEFAULT_SETTINGS});
  const ready = Boolean(file && consent);
  const valid = validSettings(settings);
  function navigate(next: number) { setStep(next); requestAnimationFrame(()=>heading.current?.focus()); }
  function select(files: FileList | File[]) {
    const result = inspectSelection(Array.from(files));
    setFile(result.file ?? null); setError(result.error ?? null);
    // Retain metadata only. Never read contents, persist a File or issue a request.
    if (input.current) input.current.value = '';
  }
  function drop(e: DragEvent<HTMLDivElement>) { e.preventDefault(); setDragging(false); select(e.dataTransfer.files); }
  function reset() {
    setFile(null); setError(null); setConsent(false); setSettings({...DEFAULT_SETTINGS}); setDragging(false);
    if(input.current) input.current.value=''; navigate(0);
  }
  function field<K extends keyof MeshSettings>(key: K,value: MeshSettings[K]) { setSettings(s=>({...s,[key]:value})); }
  return <section id="mesh-workspace" className={styles.workspaceSection}>
    <div className={styles.container}>
      <div className={styles.workspaceHeading}><div><p className={styles.eyebrow}>{t('workspaceLabel')}</p><h2>{t('workspaceTitle')}</h2><p>{t('workspaceDesc')}</p></div><span className={styles.offline}><span className={styles.statusDot}/>{t('noEngine')}</span></div>
      <div className={styles.workspace}>
        <div className={styles.workspaceBar}><span><Box size={17}/> FEM / <strong>{t('previewTag')}</strong></span><button type="button" onClick={reset}><RotateCcw size={14}/>{t('reset')}</button></div>
        <nav aria-label={t('workspaceLabel')} className={styles.steps}>{[0,1,2,3].map(i=><button key={i} type="button" aria-current={step===i?'step':undefined} onClick={()=>navigate(i)}><span>{i+1}</span>{t(`step${i}`)}</button>)}</nav>
        <div className={styles.workspaceBody}>
          <div className={styles.stage}>
            <h3 ref={heading} tabIndex={-1} className={styles.stageTitle}>{t(['uploadTitle','settingsTitle','blockedTitle','resultTitle'][step])}</h3>
            {step===0 && <>
              <p className={styles.muted}>{t('uploadDesc')}</p>
              <div className={`${styles.dropzone} ${dragging?styles.dragging:''}`} onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={drop}>
                <UploadCloud size={34} strokeWidth={1.4}/><p>{t('drop')}</p><button type="button" onClick={()=>input.current?.click()} className={styles.secondary}>{t('browse')}</button>
                <input ref={input} type="file" accept=".step,.stp,.brep" aria-label={t('browse')} className="sr-only" tabIndex={-1} onChange={e=>{if(e.target.files?.length) select(e.target.files);}}/>
                <small><LockKeyhole size={12}/>{t('localOnly')}</small>
              </div>
              {error && <p role="alert" className={styles.error}>{t(error)}</p>}
              {file && <div className={styles.selected} role="status"><FileCheck2 size={23}/><div><strong>{file.name}</strong><small>{file.format} · {(file.size/1024/1024).toFixed(2)} MiB · {t('fileSelected')}</small></div><button type="button" aria-label={t('remove')} onClick={()=>{setFile(null);setError(null);}}><X size={18}/></button></div>}
              {file && <p className={styles.help}>{t('extensionOnly')}</p>}
              <label className={styles.consent}><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>{t('consent')}</span></label>
              <p className={styles.help}>{t('localPolicy')}</p>
              <div className={styles.stageActions}><button type="button" disabled={!ready} className={styles.primary} onClick={()=>navigate(1)}>{t('nextSettings')}<ArrowRight size={15}/></button></div>
            </>}
            {step===1 && <>
              <p className={styles.muted}>{t('settingsDesc')}</p>
              {!ready ? <div className={styles.emptySmall}><FileBox size={30}/><p>{t('needFile')}</p><button type="button" className={styles.secondary} onClick={()=>navigate(0)}>{t('step0')}<ArrowLeft size={14}/></button></div> : <>
                <div className={styles.fileSummary}><FileBox size={16}/><strong>{file?.name}</strong><span>{t('fileSelected')}</span></div>
                <div className={styles.fields}>
                  <label>{t('elementSize')}<input id="fem-size" type="number" min="0" max="100000" step="any" value={settings.size} onChange={e=>field('size',e.target.value)} aria-invalid={!(Number(settings.size)>0 && Number(settings.size)<=100000)}/></label>
                  <label>{t('unit')}<select value={settings.unit} onChange={e=>field('unit',e.target.value as MeshSettings['unit'])}><option value="mm">mm</option><option value="cm">cm</option><option value="m">m</option></select></label>
                  <p className={styles.fullHelp}>{t('unitHelp')}</p>
                  <label className={styles.fullField}>{t('strategy')}<select value={settings.strategy} onChange={e=>field('strategy',e.target.value as MeshSettings['strategy'])}>{['hex','mixed','tet'].map(v=><option key={v} value={v}>{t(v)}</option>)}</select></label>
                  <p className={styles.fullHelp}>{t('hexHelp')}</p>
                  <label className={styles.fullField}>{t('order')}<select value={settings.order} onChange={e=>field('order',e.target.value as MeshSettings['order'])}><option value="linear">{t('linear')}</option><option value="quadratic">{t('quadratic')}</option></select></label>
                  <label>{t('jacobian')}<input id="fem-jacobian" type="number" min="0" max="1" step="any" value={settings.jacobian} onChange={e=>field('jacobian',e.target.value)} aria-invalid={!(Number(settings.jacobian)>0 && Number(settings.jacobian)<=1)}/></label>
                  <label>{t('aspect')}<input id="fem-aspect" type="number" min="1" max="1000" step="any" value={settings.aspect} onChange={e=>field('aspect',e.target.value)} aria-invalid={!(Number(settings.aspect)>=1 && Number(settings.aspect)<=1000)}/></label>
                  <p className={styles.fullHelp}>{t('qualityHelp')}</p>
                </div>
                {!valid && <p role="alert" className={styles.error}>{t('invalidSettings')}</p>}
                <div className={styles.stageActions}><button type="button" className={styles.secondary} onClick={()=>navigate(0)}><ArrowLeft size={14}/>{t('back')}</button><button type="button" disabled={!valid} className={styles.primary} onClick={()=>navigate(2)}>{t('review')}<ArrowRight size={14}/></button></div>
              </>}
            </>}
            {step===2 && <>
              <div className={styles.blocked}><LockKeyhole size={28}/><span className={styles.offline}>{t('noEngine')}</span><p>{t('blockedDesc')}</p></div>
              {ready && <div className={styles.review}><span title={file?.name}>{file?.name}</span><span>{settings.size} {settings.unit} · {t(settings.strategy)} · {t(settings.order)}</span><small>{t('jacobian')}: {settings.jacobian} / {t('aspect')}: {settings.aspect}</small>{!valid && <p role="alert" className={styles.error}>{t('invalidSettings')}</p>}</div>}
              <ol className={styles.progress}>{[0,1,2].map(i=><li key={i}><span className={styles.progressIndex}>{i+1}</span><span>{t(`phase${i}`)}</span><small>{t('notRun')}</small></li>)}</ol>
              <button type="button" disabled className={`${styles.primary} ${styles.runButton}`} aria-describedby="fem-execution-status"><LockKeyhole size={14}/>{t('run')}</button>
              <p id="fem-execution-status" className={styles.help}>{t('notice')}</p>
              <div className={styles.stageActions}><button type="button" className={styles.secondary} onClick={()=>navigate(1)}><ArrowLeft size={14}/>{t('back')}</button><button type="button" className={styles.secondary} onClick={()=>navigate(3)}>{t('viewResults')}<ArrowRight size={14}/></button></div>
            </>}
            {step===3 && <>
              <div className={styles.viewer}>
                <div className={styles.viewerToolbar}><span>3D {t('awaitResult')}</span><div>{[{key:'viewRotate',icon:Rotate3D},{key:'viewWire',icon:Box},{key:'viewFit',icon:Maximize2}].map(({key,icon:Icon})=><button key={key} disabled type="button" aria-label={t(key)} title={t(key)}><Icon size={16}/></button>)}</div></div>
                <div className={styles.viewerEmpty}><Box size={42} strokeWidth={1}/><h4>{t('noResults')}</h4><p>{t('noResultsDesc')}</p></div>
              </div>
              <h4 className={styles.reportTitle}>{t('report')}<span>{t('awaitResult')}</span></h4>
              <dl className={styles.metrics}>{['elements','Hex','Wedge','Tet','reportJacobian','reportAspect','invalidElements'].map(key=><div key={key}><dt>{['Hex','Wedge','Tet'].includes(key)?key:t(key)}</dt><dd>—</dd></div>)}</dl>
              <p className={styles.help}>{t('metricNote')}</p>
              <div className={styles.exports}><h4>{t('exports')}</h4><p>{t('exportNote')}</p><div>{['Abaqus INP','Gmsh MSH'].map(format=><button key={format} type="button" disabled className={styles.secondary}><Download size={15}/>{format}<LockKeyhole size={12}/></button>)}</div></div>
            </>}
          </div>
          <aside className={styles.policy}>
            <ShieldCheck size={25}/><h3>{t('policyTitle')}</h3>
            {['Now','Before','Training'].map((key,i)=><div key={key}><h4>{i===0?<Check size={13}/>:<Info size={13}/>} {t(`policy${key}`)}</h4><p>{t(`policy${key}Desc`)}</p></div>)}
            <Link href="/privacy">{t('privacyLink')}<ArrowRight size={12}/></Link>
          </aside>
        </div>
      </div>
    </div>
  </section>;
}
