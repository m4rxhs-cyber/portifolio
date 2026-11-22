import type { Locale } from './content';
import type { featuredProjects } from './home';

type ProjectId = (typeof featuredProjects)[number]['id'];
type CaseStudy = {
  category: string;
  summary: string;
  sections: readonly (readonly [title: string, description: string])[];
};

type ProjectDetailsCopy = {
  label: string;
  heading: string;
  emphasis: string;
  description: string;
  expand: string;
  collapse: string;
  cases: Record<ProjectId, CaseStudy>;
};

export const projectDetails = {
  pt: {
    label: 'Projetos / Estudos de caso',
    heading: 'Projetos em',
    emphasis: 'profundidade.',
    description: 'Uma visão técnica das estratégias, ferramentas e decisões utilizadas em cada projeto.',
    expand: 'Ver detalhes',
    collapse: 'Recolher',
    cases: {
      cypress: {
        category: 'Automação web',
        summary: 'Estrutura de automação E2E com Page Object Model, Custom Commands, Fixtures e execução contínua via GitHub Actions.',
        sections: [
          ['Desafio', 'Criar uma suíte de testes E2E organizada, reutilizável e adequada à execução contínua.'],
          ['Implementação', 'Separação de responsabilidades utilizando Page Object Model, comandos customizados, fixtures e configuração de pipeline CI/CD com GitHub Actions.'],
          ['Validação', 'Cobertura de fluxos funcionais e cenários positivos e negativos, com execução automatizada dos testes.'],
        ],
      },
      api: {
        category: 'Qualidade de APIs',
        summary: 'Validação de contratos, códigos de resposta, regras de negócio e integridade dos dados utilizando Postman.',
        sections: [
          ['Desafio', 'Verificar a consistência das respostas das APIs e o cumprimento das regras de negócio.'],
          ['Abordagem', 'Planejamento e execução de cenários para validação de contratos, códigos HTTP, estruturas de resposta e tratamento de erros.'],
          ['Validação', 'Verificação da integridade dos dados retornados e do comportamento das APIs em diferentes cenários.'],
        ],
      },
      mobile: {
        category: 'Qualidade mobile',
        summary: 'Estratégia de automação para aplicativo Android utilizado por mais de 1.000 motoristas em 12 empresas, com Cypress e Maestro.',
        sections: [
          ['Contexto', 'Atuação na qualidade de um aplicativo Android utilizado por motoristas em diferentes empresas.'],
          ['Abordagem', 'Planejamento e automação de cenários funcionais utilizando ferramentas de teste adequadas aos fluxos do aplicativo.'],
          ['Objetivo', 'Contribuir para a confiabilidade dos fluxos críticos e reduzir o esforço necessário para validações regressivas.'],
        ],
      },
    },
  },
  en: {
    label: 'Projects / Case studies',
    heading: 'Projects in',
    emphasis: 'depth.',
    description: 'A technical look at the strategies, tools, and decisions behind each project.',
    expand: 'View details',
    collapse: 'Collapse',
    cases: {
      cypress: {
        category: 'Web automation',
        summary: 'An E2E automation framework with Page Object Model, custom commands, fixtures, and continuous test runs through GitHub Actions.',
        sections: [
          ['Challenge', 'Build an organized, reusable E2E test suite suited to continuous execution.'],
          ['Implementation', 'Separate responsibilities using Page Object Model, custom commands, and fixtures, and configure a CI/CD pipeline with GitHub Actions.'],
          ['Validation', 'Cover functional flows and both positive and negative scenarios with automated test runs.'],
        ],
      },
      api: {
        category: 'API quality',
        summary: 'Validation of API contracts, response codes, business rules, and data integrity using Postman.',
        sections: [
          ['Challenge', 'Verify that API responses are consistent and comply with business rules.'],
          ['Approach', 'Plan and run scenarios to verify contracts, HTTP status codes, response structures, and error handling.'],
          ['Validation', 'Check the integrity of returned data and API behavior across different scenarios.'],
        ],
      },
      mobile: {
        category: 'Mobile quality',
        summary: 'An automation strategy using Cypress and Maestro for an Android app used by more than 1,000 drivers across 12 companies.',
        sections: [
          ['Context', 'Support quality for an Android app used by drivers across several companies.'],
          ['Approach', 'Plan and automate functional scenarios with test tools suited to the app’s workflows.'],
          ['Objective', 'Improve the reliability of critical workflows and reduce the effort required for regression testing.'],
        ],
      },
    },
  },
} satisfies Record<Locale, ProjectDetailsCopy>;
