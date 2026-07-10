/// <reference types="cypress" />

// Skipped: <case-studies-section> is intentionally hidden in theme/index.tsx
// ("Hidden until real case studies exist"). Re-enable this spec by removing
// `.skip` once the section is mounted again.
describe.skip('Case Studies Section', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.get('case-studies-section', { timeout: 10000 }).should('exist');
  });

  it('renders as a sibling of the golden rose', () => {
    cy.get('golden-rose').should('exist');
    cy.get('case-studies-section').should('exist');
  });

  it('exposes a section heading', () => {
    cy.get('case-studies-section')
      .shadow()
      .find('h2')
      .should('be.visible')
      .and('not.be.empty');
  });

  it('renders multiple case study cards', () => {
    cy.get('case-studies-section')
      .shadow()
      .find('[data-testid="case-study-card"]')
      .should('have.length.greaterThan', 1);
  });

  it('each card has a title, blurb, and at least one tech-stack chip', () => {
    cy.get('case-studies-section')
      .shadow()
      .find('[data-testid="case-study-card"]')
      .each(($card) => {
        cy.wrap($card).find('h3').should('not.be.empty');
        cy.wrap($card).find('p').should('not.be.empty');
        cy.wrap($card).find('.chip').should('have.length.greaterThan', 0);
      });
  });

  it('renders on a mobile viewport', () => {
    cy.viewport(375, 667);
    cy.reload();
    cy.get('case-studies-section', { timeout: 10000 }).should('exist');
    cy.get('case-studies-section')
      .shadow()
      .find('[data-testid="case-study-card"]')
      .should('have.length.greaterThan', 0);
  });
});
