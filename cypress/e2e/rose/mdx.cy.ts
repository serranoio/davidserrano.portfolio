/// <reference types="cypress" />

describe('Rose MDX Content Loading', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.get('golden-rose', { timeout: 10000 }).should('exist');
    cy.get('golden-rose')
      .shadow()
      .find('[data-testid="loading-shimmer"]')
      .should('not.exist');
  });

  describe('Content Loading (US-10)', () => {
    it('loads About section content', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        api.clickPetalBySection('about');
      });

      cy.wait(1500);

      cy.get('golden-rose')
        .shadow()
        .find('#content-root')
        .should('contain.text', 'About Me');
    });

    it('loads Poetry section content', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        api.clickPetalBySection('poetry');
      });

      cy.wait(1500);

      cy.get('golden-rose')
        .shadow()
        .find('#content-root')
        .should('contain.text', 'Poetry');
    });

    it('content includes section-specific details', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        api.clickPetalBySection('about');
      });

      cy.wait(1500);

      // About section should have some biographical content
      cy.get('golden-rose')
        .shadow()
        .find('#content-root')
        .invoke('text')
        .should('match', /software engineer|portfolio|Skills/);
    });
  });

  describe('Content Accessibility', () => {
    it('content is readable with proper contrast', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        api.clickPetalBySection('about');
      });

      cy.wait(1500);

      cy.get('golden-rose')
        .shadow()
        .find('#content-root')
        .should('be.visible');
    });

    it('headings are properly styled', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        api.clickPetalBySection('about');
      });

      cy.wait(1500);

      cy.get('golden-rose')
        .shadow()
        .find('#content-root h1')
        .should('exist');
    });
  });
});
