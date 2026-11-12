import type { Metadata } from 'next';
import { ArrowDown, ArrowRight, Cloud, Layers3, LockKeyhole, MoveUpRight } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { SUPPORT_EMAIL } from '@/lib/business-info';
import { FemWorkspace } from '@/components/fem/FemWorkspace';
import { MeshConcept } from '@/components/fem/MeshConcept';
import styles from '@/components/fem/fem.module.css';

type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'FemAi' });
  return { title: t('metaTitle'), description: t('metaDesc') };
}
export default async function FemAiPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('FemAi');
  const mail = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(t('mailSubject'))}`;
  return <div className={styles.root}>
    <section className={styles.hero}>
      <div className={styles.container}>
        <div className={styles.heroGrid}>
          <div>
            <p className={styles.eyebrow}><span />{t('badge')}</p>
            <h1>{t('heroTitle')}<br/><span>{t('heroAccent')}</span></h1>
            <p className={styles.heroDesc}>{t('heroDesc')}</p>
            <div className={styles.actions}>
              <a href="#mesh-workspace" className={styles.primary}>{t('openWorkspace')}<ArrowDown size={16}/></a>
              <a href="#enterprise-contact" className={styles.secondary}>{t('contact')}<MoveUpRight size={15}/></a>
            </div>
            <div className={styles.formats}><span>STEP / BREP</span><ArrowRight size={14}/><span>Hex · Wedge · Tet</span><ArrowRight size={14}/><span>INP / MSH</span></div>
          </div>
          <div className={styles.concept}>
            <div className={styles.conceptTop}><span>INOVA.AI / FEM</span><span>{t('previewTag')}</span></div>
            <MeshConcept/>
            <p>{t('concept')}</p>
          </div>
        </div>
        <div className={styles.notice}><span className={styles.statusDot}/><strong>{t('noEngine')}</strong><p>{t('notice')}</p></div>
      </div>
    </section>
    <section className={`${styles.container} ${styles.flow}`}>
      <div className={styles.sectionHeading}><h2>{t('flowTitle')}</h2><p>{t('flowDesc')}</p></div>
      <ol>{[0,1,2,3].map(i=><li key={i}><span>0{i+1}</span><h3>{t(`step${i}`)}</h3><p>{t(`flow${i}`)}</p></li>)}</ol>
    </section>
    <FemWorkspace/>
    <section className={`${styles.container} ${styles.enterprise}`}>
      <div className={styles.sectionHeading}><p className={styles.eyebrow}>FOR ENGINEERING TEAMS</p><h2>{t('enterpriseTitle')}</h2><p>{t('enterpriseDesc')}</p></div>
      <div className={styles.enterpriseGrid}>{[
        {icon:Cloud,title:'cloudTitle',desc:'cloudDesc'},
        {icon:Layers3,title:'pocTitle',desc:'pocDesc'},
        {icon:LockKeyhole,title:'onpremTitle',desc:'onpremDesc'},
      ].map(({icon:Icon,title,desc},i)=><article key={title}><span className={styles.cardNumber}>0{i+1}</span><Icon size={24}/><h3>{t(title)}</h3><p>{t(desc)}</p></article>)}</div>
      <div id="enterprise-contact" className={styles.contact}><div><h2>{t('contactTitle')}</h2><p>{t('contactDesc')}</p><Link href="/privacy">{t('privacyLink')}<MoveUpRight size={12}/></Link></div><a href={mail} className={styles.primary}>{t('contact')}<ArrowRight size={16}/></a></div>
    </section>
  </div>;
}
