import type { Locale } from './content';

type StackCategory = {
  title: string;
  description: string;
  tags: readonly string[];
};

const automation = ['Cypress', 'Selenium', 'Maestro', 'BDD / Gherkin', 'TDD', 'POM'];
const tools = ['Postman', 'JMeter', 'Jira', 'Git', 'GitHub', 'GitLab', 'GitHub Actions'];
const development = ['JavaScript', 'Python', 'SQL', '.NET', 'PHP', 'React Native', 'HTML', 'CSS'];
const databases = ['SQL Server', 'PostgreSQL', 'MySQL'];
const aiTools = ['Cursor', 'Claude', 'Codex'];
const environments = ['Scrum', 'Kanban', 'Linux', 'Windows', 'macOS'];

export const stack = {
  pt: {
    title: 'Ferramentas e competências.',
    description: 'Meu ecossistema técnico de qualidade, automação, desenvolvimento e engenharia de software.',
    categories: [
      { title: 'Automação de testes', description: 'Frameworks e práticas de automação.', tags: automation },
      { title: 'Qualidade e testes', description: 'Estratégia, validação e garantia da qualidade.', tags: ['Testes funcionais', 'Regressão', 'Exploratórios', 'Web / Mobile', 'API REST', 'Performance', 'Usabilidade', 'Segurança', 'Modelagem', 'Casos de teste'] },
      { title: 'Ferramentas e CI/CD', description: 'Execução, integração e colaboração.', tags: tools },
      { title: 'Desenvolvimento', description: 'Linguagens e tecnologias de desenvolvimento.', tags: development },
      { title: 'Bancos de dados', description: 'Modelagem, consultas e persistência de dados.', tags: databases },
      { title: 'Inteligência artificial', description: 'IA aplicada à engenharia de qualidade.', tags: [...aiTools, 'IA generativa', 'Automação assistida', 'Geração de testes', 'Refatoração de scripts', 'Análise de requisitos'] },
      { title: 'Metodologias e ambientes', description: 'Processos, gestão e ambientes de trabalho.', tags: environments },
    ],
  },
  en: {
    title: 'Tools and expertise.',
    description: 'My technical toolkit for quality assurance, automation, development, and software engineering.',
    categories: [
      { title: 'Test automation', description: 'Automation frameworks and practices.', tags: automation },
      { title: 'Quality and testing', description: 'Test strategy, validation, and quality assurance.', tags: ['Functional testing', 'Regression testing', 'Exploratory testing', 'Web / Mobile', 'REST APIs', 'Performance', 'Usability', 'Security', 'Modeling', 'Test cases'] },
      { title: 'Tools and CI/CD', description: 'Execution, integration, and collaboration.', tags: tools },
      { title: 'Development', description: 'Programming languages and development technologies.', tags: development },
      { title: 'Databases', description: 'Data modeling, queries, and persistence.', tags: databases },
      { title: 'Artificial intelligence', description: 'AI applied to quality engineering.', tags: [...aiTools, 'Generative AI', 'Assisted automation', 'Test generation', 'Script refactoring', 'Requirements analysis'] },
      { title: 'Methods and environments', description: 'Processes, management, and working environments.', tags: environments },
    ],
  },
} satisfies Record<Locale, { title: string; description: string; categories: StackCategory[] }>;
