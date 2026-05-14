/// <reference types="cypress" />

describe('Rose Truth Statement', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.get('golden-rose', { timeout: 10000 }).should('exist');
    cy.get('golden-rose')
      .shadow()
      .find('[data-testid="loading-shimmer"]')
      .should('not.exist');
  });

  it('renders fully opaque after load', () => {
    cy.window().then((win) => {
      const api = (win as any).__ROSE_TEST_API__;
      cy.waitUntil(() => api.getTruthTextOpacity() > 0.9, { timeout: 5000 });
    });
  });

  it('is anchored above the rose center in world space', () => {
    cy.window().then((win) => {
      const api = (win as any).__ROSE_TEST_API__;
      const pos = api.getTruthTextWorldPosition();
      // Bloom center sits near y≈1.3 after the model load + scale; the text
      // offset lifts it well above that.
      expect(pos.y).to.be.greaterThan(1.5);
    });
  });

  it('fades out while a section is open', () => {
    cy.window().then((win) => {
      const api = (win as any).__ROSE_TEST_API__;
      api.clickPetal(0);
      cy.wait(1500).then(() => {
        expect(api.getState()).to.equal('open');
        expect(api.getTruthTextOpacity()).to.be.lessThan(0.05);
      });
    });
  });

  it('returns to full opacity after closing a section', () => {
    cy.window().then((win) => {
      const api = (win as any).__ROSE_TEST_API__;
      api.clickPetal(0);
      cy.wait(1500).then(() => {
        api.closeContent();
        cy.wait(1500).then(() => {
          expect(api.getState()).to.equal('idle');
          expect(api.getTruthTextOpacity()).to.be.greaterThan(0.9);
        });
      });
    });
  });

  it('renders in the scene on a mobile viewport', () => {
    cy.viewport(375, 667);
    cy.reload();
    cy.get('golden-rose', { timeout: 10000 }).should('exist');
    cy.window().then((win) => {
      cy.waitUntil(() => {
        const api = (win as any).__ROSE_TEST_API__;
        return api && api.getTruthTextOpacity() > 0.9;
      }, { timeout: 10000 });
    });
  });
});
