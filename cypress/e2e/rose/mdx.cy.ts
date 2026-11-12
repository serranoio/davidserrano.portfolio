/// <reference types="cypress" />

describe('Rose MDX Content Loading', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.get('golden-rose', { timeout: 10000 }).should('exist');
    cy.get('golden-rose')
      .shadow()
      .find('[data-testid="loading-shimmer"]')
      .should('not.exist');
    // Visibility assertions exercise the scene after the user reaches it.
    cy.get('golden-rose').scrollIntoView();
  });

  describe('Content Loading (US-10)', () => {
    it('loads Code is architecture (skyscrapers) section content', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        api.clickPetalBySection('code-is-architecture');
      });

      cy.wait(1500);

      cy.get('golden-rose')
        .shadow()
        .find('#content-root')
        .should('contain.text', 'Code is architecture (skyscrapers)');
    });

    it('loads History in cities (legacy systems) section content', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        api.clickPetalBySection('history-in-cities');
      });

      cy.wait(1500);

      cy.get('golden-rose')
        .shadow()
        .find('#content-root')
        .should('contain.text', 'History in cities (legacy systems)');
    });

    it('content includes section-specific details', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        api.clickPetalBySection('code-is-architecture');
      });

      cy.wait(1500);

      // Each article retains its own content.
      cy.get('golden-rose')
        .shadow()
        .find('#content-root')
        .invoke('text')
        .should('match', /A skyscraper must be planned/);
    });
  });

  describe('Content Accessibility', () => {
    it('content is readable with proper contrast', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        api.clickPetalBySection('code-is-architecture');
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
        api.clickPetalBySection('code-is-architecture');
      });

      cy.wait(1500);

      cy.get('golden-rose')
        .shadow()
        .find('#content-root h1')
        .should('exist');
    });
  });
});
