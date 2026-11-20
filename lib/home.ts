import type { Locale } from './content';

export const home = {
  pt: {
    nav: ['Início', 'Sobre', 'Projetos', 'Test Lab', 'Stack', 'Linha do Tempo', 'Contato'],
    resume: 'Currículo',
    menu: 'Menu',
    title: 'Qualidade que entrega',
    emphasis: 'performance.',
    intro: 'Analista de Qualidade de Software com 4 anos de experiência em testes Web, Mobile e APIs REST, com foco em automação, confiabilidade e melhoria contínua.',
    projects: 'Ver Projetos',
    lab: 'Explorar Test Lab',
    featured: 'Projetos em destaque',
    cases: 'Estudos de caso reais e práticos.',
    all: 'Ver todos os projetos',
    metrics: ['Experiência em QA', 'Regressão, antes ~8 dias', 'Motoristas usando o app', 'Cenários automatizados', 'GitHub Actions'],
    dashboard: ['Execução de Testes (CI/CD)', 'Sucesso', 'Simulação', 'Taxa de sucesso', 'Aprovados', 'Falharam', 'Ignorados', 'Tempo de execução', 'Últimas execuções (GitHub Actions)'],
    tags: ['E2E · Web', 'API', 'Mobile · QA'],
    projectTitles: ['Cypress E2E Automation', 'Testes de API – Contratos e Regras', 'Automação Mobile'],
    projectDescriptions: ['Framework Cypress com Page Object Model e execução no GitHub Actions.', 'Validação de APIs REST, contratos, códigos HTTP e regras de negócio com Postman.', 'Automação com Cypress e Maestro para um app Android usado por mais de 1.000 motoristas.'],
    details: 'Detalhes dos projetos',
    about: 'Sobre mim',
    skip: 'Pular para o conteúdo',
    years: '4 anos',
    drivers: '1.000+',
  },
  en: {
    nav: ['Home', 'About', 'Projects', 'Test Lab', 'Stack', 'Timeline', 'Contact'],
    resume: 'Resume',
    menu: 'Menu',
    title: 'Quality that delivers',
    emphasis: 'performance.',
    intro: 'QA Engineer with 4 years of experience testing Web, Mobile and REST APIs, focusing on automation, reliability and continuous improvement.',
    projects: 'View Projects',
    lab: 'Explore Test Lab',
    featured: 'Featured projects',
    cases: 'Real-world, hands-on case studies.',
    all: 'View all projects',
    metrics: ['QA experience', 'Regression, down from ~8 days', 'Drivers using the app', 'Automated scenarios', 'GitHub Actions'],
    dashboard: ['Test Execution (CI/CD)', 'Passed', 'Simulation', 'Pass rate', 'Passed', 'Failed', 'Skipped', 'Run time', 'Recent runs (GitHub Actions)'],
    tags: ['E2E · Web', 'API', 'Mobile · QA'],
    projectTitles: ['Cypress E2E Automation', 'API Testing – Contracts and Rules', 'Mobile Automation'],
    projectDescriptions: ['Cypress framework with Page Object Model and GitHub Actions runs.', 'REST API, contract, status code and business rule validation with Postman.', 'Cypress and Maestro automation for an Android app used by more than 1,000 drivers.'],
    details: 'Project details',
    about: 'About me',
    skip: 'Skip to content',
    years: '4 years',
    drivers: '1,000+',
  },
} as const satisfies Record<Locale, object>;

export const sectionIds = ['home', 'about', 'projects', 'lab', 'stack', 'experience', 'contact'] as const;
export const github = 'https://github.com/m4rxhs-cyber';
export const linkedin = 'https://linkedin.com/in/neemias-sales';
export const resume = '/curriculo-neemias-sales.pdf';

export const featuredProjects = [
  { id: 'cypress', contentIndex: 1, technologies: ['Cypress', 'JavaScript', 'POM', 'GitHub Actions'], url: github + '/cypress-project' },
  { id: 'api', contentIndex: 2, technologies: ['Postman', 'REST', 'HTTP'] },
  { id: 'mobile', contentIndex: 0, technologies: ['Cypress', 'Maestro', 'Android'] },
] as const;
