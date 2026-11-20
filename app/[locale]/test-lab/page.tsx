import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TestLab } from '@/components/test-lab/TestLab';
import { labels } from '@/lib/test-lab/i18n';

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== 'pt' && locale !== 'en') notFound();
  return {
    title: 'Test Lab | Engineering Dark',
    description: labels[locale].intro,
    alternates: { languages: { 'pt-BR': '/pt/test-lab', en: '/en/test-lab' } },
  };
}

export default async function TestLabPage({ params }: PageProps) {
  const { locale } = await params;
  if (locale !== 'pt' && locale !== 'en') notFound();
  return <TestLab locale={locale} />;
}
