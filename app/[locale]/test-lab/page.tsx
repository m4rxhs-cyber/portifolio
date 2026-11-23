import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, CircleCheck, CodeXml, House, Layers, Terminal } from 'lucide-react';
import { Header } from '@/components/Header';
import { LabPreview } from '@/components/test-lab/LabPreview';
import styles from '@/components/test-lab/LabPreview.module.css';
import { home } from '@/lib/home';
import { previewCopy } from '@/lib/test-lab/preview';

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== 'pt' && locale !== 'en') notFound();
  return {
    title: 'Test Lab | Engineering Dark',
    description: previewCopy[locale].intro,
    alternates: { languages: { 'pt-BR': '/pt/test-lab', en: '/en/test-lab' } },
  };
}

export default async function TestLabPage({ params }: PageProps) {
  const { locale } = await params;
  if (locale !== 'pt' && locale !== 'en') notFound();
  const copy = previewCopy[locale];
  const featureIcons = [Terminal, Layers, CodeXml];

  return <>
    <a className="skip-link" href="#lab-main">{home[locale].skip}</a>
    <Header locale={locale} labPage />
    <main id="lab-main">
      <section className={styles.hero} aria-labelledby="lab-title">
        <div className={`shell ${styles.heroInner}`}>
          <nav className={styles.breadcrumb} aria-label={locale === 'pt' ? 'Localização' : 'Breadcrumb'}>
            <Link href={`/${locale}`}><House size={16} aria-hidden="true" />{home[locale].nav[0]}</Link>
            <ChevronRight size={14} aria-hidden="true" /><span aria-current="page">Test Lab</span>
          </nav>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{copy.eyebrow}</p>
            <h1 id="lab-title">Test Lab<span>.</span></h1>
            <p className={styles.intro}>{copy.intro}</p>
            <ul className={styles.features} role="list">
              {copy.features.map((feature, index) => {
                const Icon = featureIcons[index];
                return <li key={feature}><Icon size={15} aria-hidden="true" />{feature}</li>;
              })}
            </ul>
          </div>
        </div>
        <div className={styles.art} aria-hidden="true">
          <picture>
            <source media="(width < 768px)" srcSet="/software-engineering-studio-mobile.webp" />
            <Image className={styles.photo} src="/software-engineering-studio.webp" alt="" fill sizes="(min-width: 900px) 55vw, 100vw" loading="eager" />
          </picture>
          <div className={styles.screen}>
            <strong>{copy.screen[0]}</strong>
            <ul>{copy.screen.slice(1).map(line => <li key={line}><CircleCheck aria-hidden="true" />{line}</li>)}</ul>
          </div>
        </div>
      </section>
      <LabPreview locale={locale} />
    </main>
  </>;
}
