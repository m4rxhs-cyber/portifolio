describe('Engineering Dark', () => {
  it('redirects to Portuguese and renders the priority sections', () => {
    cy.visit('/');
    cy.location('pathname').should('eq', '/pt');
    cy.get('html').should('have.attr', 'lang', 'pt-BR');
    cy.get('h1').should('contain.text', 'Qualidade que entrega');
    cy.get('.test-dashboard').should('contain.text', 'Simulação');
    cy.get('.metrics li').should('have.length', 5);
    cy.get('.project-card').should('have.length', 3);
    cy.get('#lab').should('not.exist');
    cy.get('.desktop-nav a').last().should('have.attr', 'href', '/pt/test-lab');
    cy.get('.hero a[href="/pt/test-lab"]').should('not.have.attr', 'target');
    cy.request('/curriculo-neemias-sales.pdf').its('headers.content-type').should('include', 'application/pdf');
  });

  it('preserves the projects section when switching language', () => {
    cy.viewport(1272, 711);
    cy.visit('/pt');
    cy.get('.hero a[href="#projects"]').click();
    cy.location('hash').should('eq', '#projects');
    cy.get('.language').click();
    cy.location('pathname').should('eq', '/en');
    cy.location('hash').should('eq', '#projects');
    cy.get('html').should('have.attr', 'lang', 'en');
    cy.get('h1').should('contain.text', 'Quality that delivers');
  });

  it('highlights Timeline and Contact when their anchors are near the end of the page', () => {
    cy.viewport(1920, 1080);
    cy.visit('/pt');

    const nav = '.desktop-nav';
    cy.get(nav + ' a[href="#experience"]').click();
    cy.get(nav + ' a[aria-current="location"]').should('have.attr', 'href', '#experience');
    cy.get(nav + ' a[href="#contact"]').click();
    cy.get(nav + ' a[aria-current="location"]').should('have.attr', 'href', '#contact');
  });

  it('opens and closes the mobile menu when navigating to Test Lab', () => {
    cy.viewport(390, 844);
    cy.visit('/pt');
    cy.get('.mobile-menu summary').click();
    cy.get('.mobile-menu nav a').last().should('have.attr', 'href', '/pt/test-lab').click();
    cy.location('pathname').should('eq', '/pt/test-lab');
    cy.get('.mobile-menu').should('not.have.attr', 'open');
    cy.get('#lab-title').should('be.visible');
    cy.document().its('documentElement').should((root) => {
      expect(root.scrollWidth).to.equal(root.clientWidth);
    });
  });
});
