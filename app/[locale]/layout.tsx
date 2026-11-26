import '../globals.css';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export function generateStaticParams() {
  return [{ locale: 'pt' }, { locale: 'en' }];
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: 'Neemias Sales | QA',
    description: locale === 'en'
      ? 'Neemias Sales, QA Engineer. Web, mobile and REST API testing, test automation and CI/CD.'
      : 'Neemias Sales, Analista de Qualidade de Software. Testes Web, Mobile e APIs REST, automação e CI/CD.',
    alternates: { languages: { 'pt-BR': '/pt', en: '/en' } },
  };
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== 'pt' && locale !== 'en') notFound();
  return (
    <html lang={locale === 'pt' ? 'pt-BR' : 'en'}>
      <head><meta name="darkreader-lock" /></head>
      <body>{children}</body>
    </html>
  );
}
