import type { Locale } from './content';

type AboutCopy = {
  label: string;
  heading: string;
  emphasis: string;
  introduction: readonly [string, string];
  education: readonly [string, string, string, string, string];
  specialties: string;
  cards: readonly { title: string; description: string }[];
};

export const aboutCopy = {
  pt: {
    label: '01 / Sobre mim',
    heading: 'Qualidade não começa nos testes.',
    emphasis: 'Começa nas decisões.',
    introduction: [
      'Sou Analista de Qualidade de Software com 4 anos de experiência em aplicações Web, Mobile e APIs REST. Atuo desde o refinamento de requisitos até a validação das entregas, com foco em estratégia de testes, automação e prevenção de riscos.',
      'Minha trajetória inclui atuação na Technolog Sistemas e projetos como QA freelancer. Busco integrar qualidade ao desenvolvimento, colaborando com Product Owners e desenvolvedores para melhorar a confiabilidade dos produtos.',
    ],
    education: [
      'Sou formado em ',
      'Análise e Desenvolvimento de Software pelo Unilavras',
      ', onde recebi ',
      'Honra ao Mérito',
      ' pelo desempenho acadêmico, alcançando a segunda maior média geral da instituição. Busco evoluir continuamente em engenharia de qualidade, automação e aplicação de inteligência artificial nos processos de teste.',
    ],
    specialties: 'Experiência e especialidades',
    cards: [
      { title: 'Estratégia de qualidade', description: 'Planejamento, análise de requisitos, critérios de aceite e execução de testes funcionais, exploratórios e regressivos.' },
      { title: 'Automação e CI/CD', description: 'Desenvolvimento de automações com Cypress, Selenium, Maestro e pipelines automatizados com GitHub Actions.' },
      { title: 'Web, Mobile e APIs', description: 'Validação de aplicações Web, Android, iOS e APIs REST, com Postman e foco em regras de negócio.' },
      { title: 'Colaboração e melhoria contínua', description: 'Refinamentos técnicos, gestão de defeitos com Jira e atuação em times ágeis, utilizando Scrum e Kanban.' },
    ],
  },
  en: {
    label: '01 / About me',
    heading: 'Quality starts before testing.',
    emphasis: 'It starts with decisions.',
    introduction: [
      'I am a software quality analyst with four years of experience in web and mobile applications and REST APIs. I work from requirements refinement through release validation, focusing on test strategy, automation, and risk prevention.',
      'My experience includes working at Technolog Sistemas and on freelance QA projects. I build quality into development by collaborating with product owners and developers to improve product reliability.',
    ],
    education: [
      'I graduated in ',
      'Software Analysis and Development from Unilavras',
      ', where I received an ',
      'Academic Merit Award',
      ' for my academic performance, earning the second-highest overall grade average at the institution. I continue to develop my skills in quality engineering, automation, and applying artificial intelligence to software testing.',
    ],
    specialties: 'Experience and specialties',
    cards: [
      { title: 'Quality strategy', description: 'Planning, requirements analysis, acceptance criteria, and functional, exploratory, and regression testing.' },
      { title: 'Automation and CI/CD', description: 'Building automated tests with Cypress, Selenium, and Maestro, and automated pipelines with GitHub Actions.' },
      { title: 'Web, mobile, and APIs', description: 'Validating web, Android, and iOS applications and REST APIs, using Postman and focusing on business rules.' },
      { title: 'Collaboration and continuous improvement', description: 'Technical refinement, defect tracking in Jira, and working in agile teams using Scrum and Kanban.' },
    ],
  },
} satisfies Record<Locale, AboutCopy>;
