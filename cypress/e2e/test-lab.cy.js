describe('Test Lab preview', () => {
  it('runs local scenarios and preserves selections across modules and modes', () => {
    cy.viewport(1280, 900);
    cy.intercept('POST', '/api/test-lab', () => { throw new Error('Preview must not execute tests'); });
    cy.visit('/pt/test-lab');
    cy.get('.desktop-nav a[aria-current="page"]').should('have.attr', 'href', '/pt/test-lab');
    cy.get('[aria-labelledby="lab-modules-title"][role="group"] button').should('have.length', 5);
    cy.contains('button', 'Login com usuário bloqueado').click();
    cy.get('#lab-workspace pre').should('contain.text', 'ACCOUNT_LOCKED');
    cy.contains('button', 'Executar cenário').should('be.enabled').click();
    cy.get('#lab-workspace [role="status"]').should('contain.text', 'Aprovado');

    cy.contains('button', 'API Testing').click();
    cy.contains('button', 'TC-API-004').click();
    cy.contains('#rest-scenarios button', 'Executar cenário').click();
    cy.get('#rest-scenarios [role="status"]').should('contain.text', 'Aprovado');
    cy.contains('button', 'Request Builder').click();
    cy.contains('button', 'Enviar requisição').click();
    cy.get('#rest-builder').should('contain.text', '1 de 1 verificações aprovadas');
    cy.contains('button', 'Cenários automatizados').click();
    cy.contains('button', 'TC-API-004').should('have.attr', 'aria-pressed', 'true');
    cy.contains('button', 'Bug Investigation').click();
    cy.contains('#lab-workspace h5', 'Test Store').should('be.visible');
    cy.contains('button', 'Performance').click();
    cy.get('[data-performance-workspace]').should('contain.text', 'Distribuição de latência');
    cy.contains('button', 'Autenticação').click();
    cy.contains('button', 'Login com usuário bloqueado').should('have.attr', 'aria-pressed', 'true');
    cy.location('pathname').should('eq', '/pt/test-lab');
  });

  it('allows a local manual draft and preserves the lab route when switching language', () => {
    cy.viewport(390, 844);
    cy.visit('/pt/test-lab');
    cy.get('#lab-module-select').should('have.value', 'auth').select('manual');
    cy.get('input[placeholder="Digite seu nome"]').type('QA Demo');
    cy.contains('#lab-workspace button:visible', 'Enviar cadastro').should('be.disabled');
    cy.contains('label', 'Não executado').find('input').should('be.checked');
    cy.get('#lab-module-select').select('performance');
    cy.get('#lab-module-select').select('manual');
    cy.get('input[placeholder="Digite seu nome"]').should('have.value', 'QA Demo');
    cy.get('.language').click();
    cy.location('pathname').should('eq', '/en/test-lab');
    cy.get('#lab-module-select').select('Manual Testing');
    cy.contains('#lab-workspace button:visible', 'Submit registration').should('be.disabled');
    cy.document().its('documentElement').should(root => {
      expect(root.scrollWidth).to.equal(root.clientWidth);
    });
  });
});
