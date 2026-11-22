import type { Locale } from './content';

type CareerEntry = {
  period: string;
  kind: 'professional' | 'education';
  title: string;
  description: string;
  tags: readonly string[];
  current?: boolean;
};

type CareerCopy = {
  label: string;
  title: string;
  description: string;
  current: string;
  kinds: Record<CareerEntry['kind'], string>;
  entries: readonly CareerEntry[];
};

export const career: Record<Locale, CareerCopy> = {
  pt: {
    label: 'Carreira / Experiência',
    title: 'Trajetória profissional',
    description: 'Experiências e formação que construíram minha atuação em engenharia de qualidade de software.',
    current: 'Atual',
    kinds: { professional: 'Experiência profissional', education: 'Formação acadêmica' },
    entries: [
      {
        period: '11/2024 – Atual', kind: 'professional', current: true,
        title: 'Analista de QA · Freelancer',
        description: 'Atuação em testes funcionais, modelagem de cenários, análise de requisitos e acompanhamento de defeitos, com uso de IA como apoio ao processo de qualidade.',
        tags: ['Testes funcionais', 'Análise de requisitos', 'Gestão de defeitos'],
      },
      {
        period: '03/2022 – 10/2024', kind: 'professional',
        title: 'Software Tester (QA) · Technolog Sistemas',
        description: 'Planejamento e execução de testes Web, Mobile e APIs, frameworks de automação, performance, CI/CD e colaboração com Product Owners e desenvolvedores.',
        tags: ['Web / Mobile', 'APIs', 'Automação', 'CI/CD'],
      },
      {
        period: '02/2021 – 02/2023', kind: 'education',
        title: 'Tecnólogo · Unilavras',
        description: 'Análise e Desenvolvimento de Software. Honra ao Mérito, com segunda maior média geral da universidade (90,6).',
        tags: ['Formação acadêmica', 'Honra ao Mérito'],
      },
    ],
  },
  en: {
    label: 'Career / Experience',
    title: 'Professional journey',
    description: 'The experience and education that shaped my work in software quality engineering.',
    current: 'Current',
    kinds: { professional: 'Professional experience', education: 'Education' },
    entries: [
      {
        period: '11/2024 – Present', kind: 'professional', current: true,
        title: 'Freelance QA Analyst',
        description: 'Functional testing, test scenario design, requirements analysis, and defect tracking, with AI supporting the quality assurance process.',
        tags: ['Functional testing', 'Requirements analysis', 'Defect management'],
      },
      {
        period: '03/2022 – 10/2024', kind: 'professional',
        title: 'Software Tester (QA) · Technolog Sistemas',
        description: 'Planned and ran web, mobile, and API tests, worked with automation frameworks, performance testing, and CI/CD, and collaborated with product owners and developers.',
        tags: ['Web / Mobile', 'APIs', 'Automation', 'CI/CD'],
      },
      {
        period: '02/2021 – 02/2023', kind: 'education',
        title: 'Technology degree · Unilavras',
        description: 'Software Analysis and Development. Received an Academic Merit Award for earning the second-highest overall grade average at the university (90.6).',
        tags: ['Education', 'Academic Merit Award'],
      },
    ],
  },
};
