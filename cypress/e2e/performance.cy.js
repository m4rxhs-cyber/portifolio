describe('Performance Testing', () => {
  it('runs, compares, restores and interrupts simulations on mobile', () => {
    cy.viewport(390, 844);
    cy.visit('/pt/test-lab');
    cy.get('#lab-module-select').select('performance');
    cy.get('[data-performance-workspace]').should('be.visible');
    [1920, 1440, 1280, 1024, 768, 390, 360].forEach(width => {
      cy.viewport(width, 844);
      cy.document().then(document => expect(document.documentElement.scrollWidth).to.equal(document.documentElement.clientWidth));
    });
    cy.viewport(390, 844);
    cy.get('[data-performance-workspace]').within(() => {
      cy.contains('button', 'Executar teste').click();
      cy.contains('span', 'Teste concluído', { timeout: 10000 }).should('be.visible');
      cy.contains('button', 'Exportar JSON').should('be.visible');
      cy.contains('button', 'Exportar CSV').should('be.visible');
      cy.contains('button', 'Gráficos').click();
      cy.contains('button', 'Exportar JSON').should('not.exist');
      cy.contains('button', 'Exportar CSV').should('not.exist');
      cy.get('figure svg').should('have.length', 4);
      cy.contains('button', 'Logs').click();
      cy.contains('button', 'Exportar JSON').should('not.exist');
      cy.contains('button', 'Exportar CSV').should('not.exist');
      cy.contains('td', 'Execução concluída.').scrollIntoView().should('be.visible');
      cy.contains('button', 'Script k6').click();
      cy.contains('button', 'Exportar JSON').should('not.exist');
      cy.contains('button', 'Exportar CSV').should('not.exist');
      cy.get('pre').should('contain.text', 'http_req_duration');
      cy.window().then(win => {
        cy.stub(win.navigator.clipboard, 'writeText').resolves().as('clipboard');
        cy.stub(win.HTMLAnchorElement.prototype, 'click').as('download');
        cy.spy(win.URL, 'createObjectURL').as('blob');
      });
      cy.contains('button', 'Copiar código').click();
      cy.get('@clipboard').should('have.been.calledOnce').its('firstCall.args.0').should('include', '\n  "thresholds": {');
      cy.contains('button', 'Baixar script').click();
      cy.contains('button', 'Logs').click();
      cy.get('time[title]').first().invoke('text').should('match', /^\d{2}:\d{2}:\d{2}\.\d{3}$/);
      cy.get('time[title]').first().invoke('attr', 'title').should('match', /^\d{4}-.*Z$/);
      cy.get('button[aria-label^="Filtrar por nível:"]').click();
      cy.contains('[role=option]', 'ERROR').click();
      cy.contains('Nenhum registro encontrado.').should('be.visible');
      cy.contains('button', 'Copiar logs').click();
      cy.get('@clipboard').its('secondCall.args.0').should('include', 'capacity=250/350 req/s').and('include', 'Execução concluída.');
      cy.contains('button', 'Copiado!').should('be.visible');
      cy.contains('button', 'Copiar logs').should('be.visible');
      cy.get('@clipboard').then(stub => stub.onThirdCall().rejects());
      cy.contains('button', 'Copiar logs').click();
      cy.contains('Não foi possível copiar os logs.').should('be.visible');
      cy.get('button[aria-label^="Filtrar por nível:"]').click();
      cy.contains('[role=option]', 'Todos').click();
      cy.get('#performance-execution-panel-3 [role=region]').scrollTo('bottom');
      cy.contains('th', 'Horário').should('have.css', 'position', 'sticky');
      cy.viewport(1280, 900);
      cy.contains('button', 'Exportar JSON').should('not.exist');
      cy.contains('button', 'Exportar CSV').should('not.exist');
      cy.get('#performance-execution-panel-3 [role=region]').scrollIntoView({ offset: { top: -110, left: 0 } });
      cy.contains('th', 'Evento').should('have.css', 'display', 'table-cell');
      cy.contains('th', 'Nível').should('have.css', 'white-space', 'nowrap');
      cy.viewport(1440, 900);
      cy.contains('th', 'Evento').should('have.css', 'display', 'none');
      cy.viewport(768, 900);
      cy.contains('button', 'Exportar JSON').should('not.exist');
      cy.contains('button', 'Exportar CSV').should('not.exist');
      cy.contains('th', 'Evento').should('have.css', 'display', 'none');
      cy.viewport(390, 844);
      cy.contains('th', 'Evento').should('have.css', 'display', 'none');
      cy.get('#performance-execution-panel-3 [role=region]').then(([region]) =>
        expect(region.scrollWidth).to.equal(region.clientWidth));
      cy.contains('button', 'Script k6').click();
      cy.get('button[aria-label^="Endpoint demonstrativo:"]').click();
      cy.contains('[role=option]', 'GET /api/test-lab/rest/orders').click();
      cy.get('pre').should('contain.text', '/api/test-lab/rest/orders');
      cy.get('input[type="range"]').then(([slider]) => {
        const { HTMLInputElement, Event } = slider.ownerDocument.defaultView;
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(slider, '25');
        slider.dispatchEvent(new Event('input', { bubbles: true }));
      });
      cy.contains('label', '60 s').click();
      cy.get('pre').should('contain.text', '"vus": 25').and('contain.text', '"duration": "60s"');
      cy.contains('button', 'Resultados').click();
      cy.get('#performance-execution-panel-0').should('contain.text', 'GET /api/test-lab/rest/customers');
      cy.contains('button', 'JSON').click();
      cy.contains('button', 'CSV').click();
      cy.get('@download').should('have.been.calledThrice').then(stub => {
        expect(stub.thisValues.map(anchor => anchor.download)).to.deep.equal([
          'performance-load-test.js', stub.thisValues[1].download.replace(/\.json$/, '') + '.json',
          stub.thisValues[1].download.replace(/\.json$/, '') + '.csv',
        ]);
        expect(stub.thisValues[1].download).to.match(/^performance-load-test-10vus-30s-\d{4}-\d{2}-\d{2}-\d{6}\.json$/);
      });
      cy.get('@blob').then(async spy => {
        const json = JSON.parse(await spy.getCall(1).args[0].text());
        expect(json.mode).to.equal('simulation');
        expect(json.configuration.endpoint).to.equal('/api/test-lab/rest/customers');
        expect(json.configuration.vus).to.equal(10);
        expect(json.configuration.duration).to.equal(30);
        expect(json.intervals).to.have.length(24);
        expect(await spy.getCall(2).args[0].text()).to.include('"/api/test-lab/rest/customers"');
      });

      cy.get('button[aria-label^="Tipo de teste:"]').click();
      cy.contains('[role=option]', 'Smoke Test').click();
      cy.contains('button', 'Executar teste').click();
      cy.contains('span', 'Teste concluído', { timeout: 10000 }).should('be.visible');
      cy.contains('button', 'Executar teste').click();
      cy.contains('button', 'Interromper teste').click();
      cy.contains('span', 'Teste interrompido').should('be.visible');
      cy.contains('button', 'Histórico (3)').click();
      cy.get('dialog[open] input[type=checkbox]').check();
      cy.get('dialog[open]').contains('li', 'Load Test').contains('button', 'Ver detalhes').click();
      cy.contains('button', 'Exportar JSON').click();
      cy.get('@download').then(stub => expect(stub.thisValues[3].download).to.equal(stub.thisValues[1].download));
      cy.contains('button', 'Histórico (3)').click();
      cy.get('dialog[open]').contains('li', 'Load Test').contains('button', 'Restaurar configuração').click();
      cy.get('button[aria-label^="Tipo de teste:"]').should('contain.text', 'Load Test');
      cy.contains('Execuções com configurações distintas.').should('be.visible');
      cy.contains('span', 'Teste concluído').should('exist');
      [1920, 1440, 1280, 1024, 768, 390, 360].forEach(width => {
        cy.viewport(width, 844);
        cy.document().then(document => expect(document.documentElement.scrollWidth).to.equal(document.documentElement.clientWidth));
      });
      cy.viewport(390, 844);
      cy.contains('button', 'Histórico (3)').click();
      cy.contains('button', 'Limpar histórico').click();
      cy.get('[role=alertdialog][open]').contains('button', 'Excluir').click();
      cy.get('dialog[open]').contains('Nenhuma execução registrada nesta sessão.').should('be.visible');
      cy.get('dialog[open]').contains('button', 'Fechar').click();
    });
    cy.document().then(document => expect(document.documentElement.scrollWidth).to.equal(document.documentElement.clientWidth));
    cy.get('.language').click();
    cy.get('#lab-module-select').select('performance');
    cy.contains('button', 'Logs').click();
    cy.contains('Execution logs').should('be.visible');
    cy.contains('button', 'Copy logs').should('be.disabled');
    cy.contains('button', 'Run test').click();
    cy.contains('span', 'Test completed', { timeout: 10000 }).should('be.visible');
    cy.contains('button', 'Export JSON').should('be.visible');
    cy.contains('button', 'Export CSV').should('be.visible');
    cy.contains('button', 'k6 Script').click();
    cy.contains('button', 'Export JSON').should('not.exist');
    cy.contains('button', 'Export CSV').should('not.exist');
    cy.get('button[aria-label^="Execution mode:"]').click();
    cy.contains('[role=option]', 'Real HTTP execution').click();
    cy.contains('button', 'Run test').should('be.disabled');
  });
});
