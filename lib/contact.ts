import type { Locale } from './content';

type ContactCopy = {
  label: string;
  title: readonly [string, string];
  description: string;
  availability: string;
  channels: string;
  descriptions: Record<'email' | 'linkedin' | 'github' | 'resume', string>;
};

export const contactCopy = {
  pt: {
    label: 'Contato / Vamos conversar',
    title: ['Vamos construir', 'software melhor'],
    description: 'Aberto a oportunidades em Quality Assurance, automação de testes e engenharia de software. Vamos conversar sobre como posso contribuir para seu próximo projeto.',
    availability: 'Aberto a conexões profissionais',
    channels: 'Canais de contato',
    descriptions: { email: 'Contato direto', linkedin: 'Conexões e oportunidades', github: 'Projetos e código', resume: 'Experiência e qualificações' },
  },
  en: {
    label: 'Contact / Let’s talk',
    title: ['Let’s build', 'better software'],
    description: 'I’m open to opportunities in quality assurance, test automation, and software engineering. Let’s talk about how I can contribute to your next project.',
    availability: 'Open to professional connections',
    channels: 'Contact channels',
    descriptions: { email: 'Direct contact', linkedin: 'Connections and opportunities', github: 'Projects and code', resume: 'Experience and qualifications' },
  },
} satisfies Record<Locale, ContactCopy>;
