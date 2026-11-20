describe('Test Lab', () => {
  it('validates required fields, rejects an invalid login, signs in and signs out', () => {
    cy.visit('/pt/test-lab');
    cy.contains('button', 'Entrar').click();
    cy.contains('[role="status"]', 'Preencha usuário e senha.');
    cy.get('[name="demo-user"]').type('qa-demo');
    cy.get('[name="demo-password"]').type('incorrect');
    cy.contains('button', 'Entrar').click();
    cy.contains('[role="status"]', 'Não foi possível entrar. Confira os dados e tente novamente.')
      .should('contain.text', 'Desconectado');
    cy.get('[name="demo-password"]').should('have.value', 'incorrect');
    cy.get('.lab-assertions').should('contain.text', 'Obtido false').and('contain.text', 'PASS');
    cy.get('[name="demo-user"]').clear().type('unknown');
    cy.contains('button', 'Entrar').click();
    cy.get('.lab-history').should('contain.text', 'TC-AUTH-003');
    cy.get('[name="demo-password"]').should('have.value', 'incorrect');
    cy.contains('button', 'Preencher credenciais de teste').click();
    cy.get('[name="demo-user"]').should('have.value', 'qa-demo');
    cy.get('[name="demo-password"]').should('have.value', 'Demo-QA-2026');
    cy.contains('button', 'Entrar').click();
    cy.contains('[role="status"]', 'Sessão iniciada.');
    cy.contains('button', 'Sair').click();
    cy.contains('[role="status"]', 'Sessão encerrada.');
    cy.get('[name="demo-password"]').should('have.value', 'Demo-QA-2026');
    cy.contains('button', 'Executar cenário').click();
    cy.get('.lab-status[role="status"]').should('contain.text', 'Aprovado');
  });

  it('renders an API exchange and distinguishes infrastructure errors', () => {
    cy.visit('/pt/test-lab#api');
    cy.get('.lab-scenario-trigger').click();
    cy.contains('[role="option"]', 'Criar reserva').click();
    cy.get('.lab-scenario-trigger').should('have.attr', 'aria-expanded', 'false').and('contain.text', 'Criar reserva');
    cy.intercept('POST', '/api/test-lab', (request) => {
      expect(request.body).to.deep.equal({ scenario: 'create' });
      request.reply({
        id: 'fixture', scenario: 'create', timestamp: '2026-11-19T20:00:00Z', duration: 24, status: 'PASSED',
        logs: [],
        assertions: [{ id: 'A-1', label: 'httpStatus', expected: 200, actual: 200, pass: true }],
        exchanges: [{
          method: 'POST', path: '/booking', duration: 24, status: 200, timestamp: '2026-11-19T20:00:00Z',
          requestHeaders: { Accept: 'application/json' }, responseHeaders: { 'content-type': 'application/json' },
          payload: { firstname: 'QA' }, body: { bookingid: 12 },
        }],
      });
    }).as('booker');
    cy.contains('button', 'Executar cenário').click();
    cy.wait('@booker');
    cy.get('.lab-exchange summary').should('contain.text', '200');
    cy.get('.lab-inspector').should('contain.text', 'firstname').and('contain.text', 'bookingid');
    cy.get('.lab-assertions').should('contain.text', 'PASS');
    cy.intercept('POST', '/api/test-lab', { statusCode: 429, body: { error: 'rateLimited' } });
    cy.contains('button', 'Executar novamente').click();
    cy.get('.lab-status[role="status"]').should('contain.text', 'Erro técnico');
    cy.get('.lab-error').should('contain.text', 'Limite temporário');

    cy.contains('.lab-tabs a', 'Investigação de defeitos').click();
    cy.get('.lab-status[role="status"]').should('have.text', 'Pronto');
    cy.get('.lab-exchange, .lab-history').should('not.exist');
    cy.contains('button', 'Reproduzir cenário').click();
    cy.get('.lab-report').should('contain.text', 'BUG-001');
    cy.contains('.lab-tabs a', 'Autenticação').click();
    cy.get('.lab-status[role="status"]').should('have.text', 'Pronto');
    cy.get('.lab-history').should('not.exist');
    cy.contains('.lab-tabs a', 'Testes de API').click();
    cy.get('.lab-error').should('contain.text', 'Limite temporário');
    cy.get('.lab-history').should('not.contain.text', 'BUG-001');
    cy.contains('button', 'Limpar histórico').click();
    cy.get('.lab-status[role="status"]').should('have.text', 'Pronto');
    cy.contains('.lab-tabs a', 'Investigação de defeitos').click();
    cy.get('.lab-report').should('contain.text', 'BUG-001');
  });

  it('reproduces business-rule defects and preserves the module in English', () => {
    cy.visit('/pt');
    cy.get('.hero').contains('a', 'Explorar Test Lab').click();
    cy.location('pathname').should('eq', '/pt');
    cy.location('hash').should('eq', '#lab');
    cy.contains('#lab button', 'Investigação de defeitos').click();
    cy.contains('button', 'Reproduzir cenário').click();
    cy.get('.lab-report').should('contain.text', 'BUG-001').and('contain.text', 'Defeito reproduzido');
    cy.get('.lab-assertions').should('contain.text', '90').and('contain.text', '100');
    cy.get('.lab-scenario-trigger').first().click();
    cy.contains('[role="option"]', 'BUG-002').click();
    cy.contains('button', 'Reproduzir cenário').click();
    cy.get('.lab-report').should('contain.text', 'BUG-002').and('contain.text', 'qa@');
    cy.get('.lab-scenario-trigger').first().click();
    cy.contains('[role="option"]', 'BUG-003').click();
    cy.contains('button', 'Reproduzir cenário').click();
    cy.get('.lab-report').should('contain.text', 'BUG-003');
    cy.get('.language[hreflang="en"]').click();
    cy.location('pathname').should('eq', '/en');
    cy.location('hash').should('eq', '#lab');
    cy.contains('.lab-tabs button[aria-pressed="true"]', 'Bug investigation');
  });

  it('fits a phone viewport', () => {
    cy.viewport(390, 844);
    cy.visit('/en/test-lab#api');
    cy.contains('.lab-tabs a[aria-current]', 'API testing');
    cy.document().its('documentElement').should((root) => {
      expect(root.scrollWidth).to.equal(root.clientWidth);
    });
  });
});
