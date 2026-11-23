export const authCopy = {
  pt: {
    cypress: 'Exemplo Cypress', executor: 'Execução HTTP · TypeScript', fake: 'Credenciais fictícias e sessões isoladas do laboratório.',
    objective: 'Objetivo', expected: 'Esperado', observed: 'Observado', prerequisites: 'Pré-condição', plan: 'Etapas previstas', demoApi: 'API demonstrativa do Test Lab disponível.',
    ready: 'Pronto para executar', running: 'Executando…', passed: 'Aprovado', failed: 'Reprovado', error: 'Erro técnico', yes: 'Sim', no: 'Não', checks: 'Verificações',
    cases: [
      ['Autenticar com credenciais demonstrativas válidas.', 'Sessão criada e acesso protegido autorizado.', 'Acesso anônimo negado → login → acesso protegido → limpeza.'],
      ['Verificar a rejeição da conta demonstrativa bloqueada.', 'HTTP 403 e nenhuma sessão criada.', 'Login com conta bloqueada → verificar ausência de sessão.'],
      ['Verificar a rejeição de senha incorreta.', 'HTTP 401 e nenhuma sessão criada.', 'Login com senha incorreta → verificar ausência de sessão.'],
      ['Verificar campos obrigatórios, tipos, formato e limites.', 'HTTP 400 com código e mensagem de validação em todos os casos.', 'Enviar usuário vazio, senha vazia, ambos vazios, tipos inválidos, e-mail inválido e senha longa.'],
      ['Validar o ciclo completo da sessão.', 'Acesso autorizado antes do logout e negado depois.', 'Acesso anônimo → login → acesso protegido → logout → acesso com sessão revogada.'],
    ],
    steps: { anonymous: 'Acesso sem sessão', login: 'Login', protected: 'Recurso protegido', logout: 'Logout', revoked: 'Acesso após logout', cleanup: 'Limpeza da sessão', emptyEmail: 'Usuário vazio', emptyPassword: 'Senha vazia', emptyBoth: 'Ambos os campos vazios', wrongTypes: 'Tipos inválidos', invalidEmail: 'E-mail inválido', longPassword: 'Senha longa' },
    fields: { http: 'Status HTTP', code: 'Código da resposta', authenticated: 'Autenticado', session: 'Sessão emitida', message: 'Mensagem de validação correta' },
    errors: { network: 'A conexão com a API falhou. Tente novamente.', timeout: 'A API excedeu o tempo limite de resposta.', response: 'A API retornou uma resposta em formato inesperado.', server: 'A API retornou um erro interno.', limited: 'Limite de requisições atingido. Tente novamente em um minuto.', internal: 'O executor encontrou um erro interno.' },
  },
  en: {
    cypress: 'Cypress example', executor: 'HTTP execution · TypeScript', fake: 'Fictional credentials and isolated lab sessions.',
    objective: 'Objective', expected: 'Expected', observed: 'Observed', prerequisites: 'Prerequisite', plan: 'Planned steps', demoApi: 'Test Lab demo API available.',
    ready: 'Ready to run', running: 'Running…', passed: 'Passed', failed: 'Failed', error: 'Technical error', yes: 'Yes', no: 'No', checks: 'Checks',
    cases: [
      ['Sign in with valid demo credentials.', 'A session is issued and protected access is granted.', 'Reject anonymous access → sign in → access protected resource → clean up.'],
      ['Verify that the locked demo account is rejected.', 'HTTP 403 and no session issued.', 'Sign in with the locked account → verify that no session exists.'],
      ['Verify that an incorrect password is rejected.', 'HTTP 401 and no session issued.', 'Sign in with an incorrect password → verify that no session exists.'],
      ['Verify required fields, data types, formats, and length limits.', 'HTTP 400 with a validation code and message for every case.', 'Send empty email, empty password, both empty, invalid types, invalid email, and a long password.'],
      ['Validate the full session lifecycle.', 'Access is granted before logout and denied afterward.', 'Anonymous access → sign in → protected access → sign out → retry with the revoked session.'],
    ],
    steps: { anonymous: 'Access without a session', login: 'Sign in', protected: 'Protected resource', logout: 'Sign out', revoked: 'Access after sign-out', cleanup: 'Session cleanup', emptyEmail: 'Empty username', emptyPassword: 'Empty password', emptyBoth: 'Both fields empty', wrongTypes: 'Invalid types', invalidEmail: 'Invalid email', longPassword: 'Long password' },
    fields: { http: 'HTTP status', code: 'Response code', authenticated: 'Authenticated', session: 'Session issued', message: 'Correct validation message' },
    errors: { network: 'The API connection failed. Try again.', timeout: 'The API response timed out.', response: 'The API returned an unexpected response format.', server: 'The API returned an internal error.', limited: 'Request limit reached. Try again in one minute.', internal: 'The runner encountered an internal error.' },
  },
} as const;
