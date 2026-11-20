import '../globals.css';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: 'Neemias Sales | Engineering Dark',
    description: locale === 'en'
      ? 'Neemias Sales, QA Engineer. Web, mobile and REST API testing, test automation and CI/CD.'
      : 'Neemias Sales, Analista de Qualidade de Software. Testes Web, Mobile e APIs REST, automação e CI/CD.',
    alternates: { languages: { 'pt-BR': '/pt', en: '/en' } },
  };
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== 'pt' && locale !== 'en') notFound();
  return <html lang={locale === 'pt' ? 'pt-BR' : 'en'}><body>{children}</body></html>;
}
