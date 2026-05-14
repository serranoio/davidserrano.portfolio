describe('Smoke Test', () => {
  it('homepage loads with golden rose', () => {
    cy.visit('/');
    // Query into Shadow DOM
    cy.get('golden-rose', { timeout: 10000 })
      .shadow()
      .find('canvas[data-testid="rose-canvas"]')
      .should('exist');
  });
});
