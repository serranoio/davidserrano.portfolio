/// <reference types="cypress" />

describe('Rose Content Container', () => {
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

  describe('Content Display (US-9)', () => {
    it('shows content container when rose is open', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        api.clickPetalBySection('code-is-architecture');
      });

      // Wait for bloom animation
      cy.wait(1500);

      // Content should be visible
      cy.get('golden-rose')
        .shadow()
        .find('#content-root')
        .should('have.class', 'visible');
    });

    it('hides content container when rose is idle', () => {
      // Initially hidden
      cy.get('golden-rose')
        .shadow()
        .find('#content-root')
        .should('not.have.class', 'visible');
    });

    it('displays section title in content', () => {
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

    it('shows close button in content container', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        api.clickPetalBySection('code-is-architecture');
      });

      cy.wait(1500);

      cy.get('golden-rose')
        .shadow()
        .find('[data-testid="close-button"]')
        .should('exist');
    });

    it('close button closes content and returns to idle', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        api.clickPetalBySection('code-is-architecture');
      });

      cy.wait(1500);

      // Click close button
      cy.get('golden-rose')
        .shadow()
        .find('[data-testid="close-button"]')
        .click();

      // Wait for close animation
      cy.wait(1500);

      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        expect(api.getState()).to.equal('idle');
      });
    });
  });

  describe('Content Styling (US-9)', () => {
    it('content container has proper styling', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        api.clickPetalBySection('code-is-architecture');
      });

      cy.wait(1500);

      cy.get('golden-rose')
        .shadow()
        .find('#content-root')
        .should('be.visible')
        .and('have.css', 'position', 'absolute');
    });

    it('content is scrollable if content exceeds container', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        api.clickPetalBySection('code-is-architecture');
      });

      cy.wait(1500);

      cy.get('golden-rose')
        .shadow()
        .find('#content-root')
        .should('have.css', 'overflow-y', 'auto');
    });
  });

  describe('Section Content (US-10)', () => {
    it('shows Code is architecture (skyscrapers) section content', () => {
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

    it('shows History in cities (legacy systems) section content', () => {
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
  });

  describe('Section Switching (US-11)', () => {
    it('can switch between sections', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;

        // Open Code is architecture (skyscrapers)
        api.clickPetalBySection('code-is-architecture');
      });

      cy.wait(1500);

      cy.get('golden-rose')
        .shadow()
        .find('#content-root')
        .should('contain.text', 'Code is architecture (skyscrapers)');

      // Close and open History in cities (legacy systems)
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        api.closeContent();
      });

      cy.wait(1500);

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
  });
});
