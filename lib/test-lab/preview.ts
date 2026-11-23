import type { Locale } from '../content';

export const moduleIds = ['auth', 'api', 'bug', 'performance', 'manual'] as const;
export type ModuleId = typeof moduleIds[number];

export const performanceFixtures = [
  { requests: 600, errors: .003, median: 118, p95: 210, p99: 314 },
  { requests: 1200, errors: .011, median: 142, p95: 380, p99: 504 },
] as const;

export const authSnippets = [
  "cy.get('[name=email]').type('demo@example.test');\ncy.get('[name=password]').type('demo-password');\ncy.get('form').submit();\ncy.location('pathname').should('eq', '/dashboard');",
  "cy.get('[name=email]').type('locked@example.test');\ncy.get('[name=password]').type('demo-password');\ncy.get('form').submit();\ncy.get('[role=alert]').should('contain.text', 'ACCOUNT_LOCKED');",
  "cy.get('[name=email]').type('demo@example.test');\ncy.get('[name=password]').type('incorrect');\ncy.get('form').submit();\ncy.get('[role=alert]').should('contain.text', 'INVALID_CREDENTIALS');",
  "cy.get('form').submit();\ncy.get('[name=email]').should('have.attr', 'aria-invalid', 'true');\ncy.get('[role=alert]').should('be.visible');",
  "cy.get('[name=email]').type('demo@example.test');\ncy.get('[name=password]').type('demo-password');\ncy.get('form').submit();\ncy.get('[data-test=sign-out]').click();\ncy.location('pathname').should('eq', '/login');",
] as const;

export const previewCopy = {
  pt: {
    eyebrow: 'Engenharia de qualidade na prática',
    intro: 'Explore cenários de teste, simule comportamentos de aplicações e acompanhe como a qualidade de software é validada na prática.',
    features: ['Ambiente interativo', 'Cenários de demonstração', 'Automação e validação'],
    screen: ['Prévia de testes', 'Login válido', 'Validação de campos', 'Fluxo de cadastro', 'Contrato de API'],
    moduleTitle: 'Módulos do laboratório', moduleHint: 'Selecione um módulo para explorar os cenários de teste.', demo: 'Demonstração',
    modules: {
      auth: ['Autenticação', 'Cenários de login, credenciais inválidas, bloqueios, validações e sessões.'],
      api: ['API Testing', 'Validação de endpoints REST, contratos, códigos HTTP e respostas JSON.'],
      bug: ['Bug Investigation', 'Reprodução de defeitos, análise de comportamentos inesperados e documentação de falhas.'],
      performance: ['Performance', 'Métricas, tempos de resposta e resultados de testes de carga com k6.'],
      manual: ['Testes Manuais', 'Execução funcional, critérios de aceite, registro de resultados e evidências.'],
    },
    moduleSelect: 'Tipo de teste',
    scenarios: 'Cenários de teste', execution: 'Execução', run: 'Executar cenário', upcoming: 'Disponível em breve',
    result: 'Resultado da execução', noRun: 'Nenhum teste executado. Esta é uma prévia do cenário.',
    auth: ['Login com credenciais válidas', 'Login com usuário bloqueado', 'Login com credenciais inválidas', 'Validação de mensagens de erro', 'Fluxo completo de autenticação'],
    bug: {
      names: ['Total desatualizado no carrinho', 'Filtro permanece após limpar'], expected: 'Comportamento esperado', observed: 'Comportamento observado no exemplo', steps: 'Passos no cenário demonstrativo', severity: 'Severidade', priority: 'Prioridade',
      examples: [
        ['O total acompanha a quantidade do item.', 'O total continua igual após alterar a quantidade.', ['Abra um carrinho de demonstração com um item.', 'Altere a quantidade para duas unidades.', 'Compare o total mostrado com o valor esperado.'], 'Média', 'Normal'],
        ['A lista volta a mostrar todos os itens.', 'A lista permanece filtrada após limpar a seleção.', ['Selecione uma categoria de demonstração.', 'Use a ação Limpar filtros.', 'Confira os itens que aparecem na lista.'], 'Baixa', 'Normal'],
      ],
      evidence: 'Evidências', evidenceText: 'Espaço para capturas e contexto em uma fase futura.', report: 'Modelo de relatório', reportFields: 'Resumo · Ambiente · Passos · Resultado esperado · Resultado observado · Evidências',
    },
    performance: {
      names: ['Carga de referência · 10 usuários virtuais', 'Pico de tráfego · 25 usuários virtuais'],
      metrics: ['Requisições', 'Taxa de erro'], latency: 'Percentis de latência', note: 'Valores fictícios para ilustrar o painel. Nenhum teste de carga foi executado.',
    },
    manual: {
      scenario: 'Cenário de teste', caseId: 'TC-MAN-001', objective: 'Validar campos obrigatórios do formulário de cadastro.',
      preconditions: 'Pré-condições', precondition: 'Formulário de demonstração aberto e campos inicialmente vazios.',
      criteria: 'Critérios de aceite', acceptance: ['Impedir envio com campos vazios', 'Exibir mensagens de validação', 'Aceitar dados válidos'],
      steps: 'Etapas de execução', instructions: ['Inspecionar o formulário vazio.', 'Preencher nome e e-mail de exemplo.', 'Conferir o comportamento esperado em uma execução futura.'],
      environment: 'Ambiente de teste', form: 'Formulário demonstrativo', name: 'Nome', email: 'E-mail', namePlaceholder: 'Digite seu nome', emailPlaceholder: 'Digite seu e-mail', submit: 'Enviar cadastro',
      validation: 'As mensagens de validação serão exibidas aqui quando a execução estiver disponível.',
      record: 'Registro da execução', observed: 'Resultado observado', status: 'Status da validação', statuses: ['Aprovado', 'Reprovado', 'Não executado'],
      evidence: 'Observações e evidências', draft: 'Rascunho demonstrativo. Os campos não são enviados nem salvos.',
    },
  },
  en: {
    eyebrow: 'Quality engineering in practice',
    intro: 'Explore test scenarios, simulate application behavior, and see how software quality is validated in practice.',
    features: ['Interactive workspace', 'Demo scenarios', 'Automation and validation'],
    screen: ['Test preview', 'Valid login', 'Field validation', 'Sign-up flow', 'API contract'],
    moduleTitle: 'Lab modules', moduleHint: 'Select a module to explore its test scenarios.', demo: 'Demo',
    modules: {
      auth: ['Authentication', 'Login scenarios, invalid credentials, locked accounts, validation, and sessions.'],
      api: ['API Testing', 'Validate REST endpoints, contracts, HTTP status codes, and JSON responses.'],
      bug: ['Bug Investigation', 'Reproduce defects, analyze unexpected behavior, and document findings.'],
      performance: ['Performance', 'Explore metrics, response times, and k6 load test results.'],
      manual: ['Manual Testing', 'Functional testing, acceptance criteria, and recording results and evidence.'],
    },
    moduleSelect: 'Test type',
    scenarios: 'Test scenarios', execution: 'Execution', run: 'Run scenario', upcoming: 'Coming soon',
    result: 'Execution result', noRun: 'No test has run. This is a scenario preview.',
    auth: ['Login with valid credentials', 'Login with a locked account', 'Login with invalid credentials', 'Error message validation', 'Complete authentication flow'],
    bug: {
      names: ['Outdated cart total', 'Filter remains after clearing'], expected: 'Expected behavior', observed: 'Example observed behavior', steps: 'Steps in the demo scenario', severity: 'Severity', priority: 'Priority',
      examples: [
        ['The total updates with the item quantity.', 'The total stays the same after the quantity changes.', ['Open a demo cart containing one item.', 'Change the quantity to two units.', 'Compare the displayed total with the expected value.'], 'Medium', 'Normal'],
        ['The list shows all items again.', 'The list stays filtered after clearing the selection.', ['Select a demo category.', 'Use the Clear filters action.', 'Check which items appear in the list.'], 'Low', 'Normal'],
      ],
      evidence: 'Evidence', evidenceText: 'Reserved for screenshots and context in a future phase.', report: 'Defect report template', reportFields: 'Summary · Environment · Steps · Expected result · Observed result · Evidence',
    },
    performance: {
      names: ['Baseline load · 10 virtual users', 'Traffic spike · 25 virtual users'],
      metrics: ['Requests', 'Error rate'], latency: 'Latency percentiles', note: 'Sample values for illustration. No load test was run.',
    },
    manual: {
      scenario: 'Test scenario', caseId: 'TC-MAN-001', objective: 'Validate required fields in the sign-up form.',
      preconditions: 'Preconditions', precondition: 'The demo form is open and its fields are initially empty.',
      criteria: 'Acceptance criteria', acceptance: ['Prevent submission with empty fields', 'Show validation messages', 'Accept valid data'],
      steps: 'Test steps', instructions: ['Inspect the empty form.', 'Enter a sample name and email.', 'Check the expected behavior in a future run.'],
      environment: 'Test environment', form: 'Demo form', name: 'Name', email: 'Email', namePlaceholder: 'Enter your name', emailPlaceholder: 'Enter your email', submit: 'Submit registration',
      validation: 'Validation messages will appear here when execution becomes available.',
      record: 'Execution notes', observed: 'Observed result', status: 'Validation status', statuses: ['Passed', 'Failed', 'Not run'],
      evidence: 'Notes and evidence', draft: 'Demo draft. The fields are not submitted or saved.',
    },
  },
} as const satisfies Record<Locale, object>;

export type PreviewCopy = (typeof previewCopy)[Locale];
