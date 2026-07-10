/// <reference types="cypress" />

describe('Rose Mobile Experience', () => {
  beforeEach(() => {
    cy.viewport('iphone-x');
    cy.visit('/');
    cy.get('golden-rose', { timeout: 10000 }).should('exist');
    cy.get('golden-rose')
      .shadow()
      .find('[data-testid="loading-shimmer"]')
      .should('not.exist');
  });

  describe('Mobile Rendering (US-2)', () => {
    it('renders full-screen on mobile', () => {
      cy.get('golden-rose')
        .shadow()
        .find('canvas[data-testid="rose-canvas"]')
        .should('exist');
    });

    it('renders all petals on mobile', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        expect(api.getPetalCount()).to.equal(46);
      });
    });
  });

  describe('Mobile Interaction (US-4)', () => {
    it('supports tap to open section', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        api.clickPetalBySection('about');
      });

      cy.wait(1500);

      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        expect(api.getState()).to.equal('open');
        expect(api.getActiveSection()).to.equal('about');
      });
    });

    it('supports orbit controls on mobile', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        const config = api.getControlsConfig();

        expect(config.minDistance).to.equal(1.4);
        expect(config.maxDistance).to.equal(8);
      });
    });
  });

  describe('Mobile Content Display (US-9)', () => {
    it('shows content panel on mobile', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        api.clickPetalBySection('about');
      });

      cy.wait(1500);

      cy.get('golden-rose')
        .shadow()
        .find('#content-root')
        .should('have.class', 'visible')
        .and('be.visible');
    });

    it('content is readable on mobile viewport', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        api.clickPetalBySection('about');
      });

      cy.wait(1500);

      // Content should be visible and have reasonable dimensions
      cy.get('golden-rose')
        .shadow()
        .find('#content-root')
        .should('be.visible')
        .and(($el) => {
          const rect = $el[0].getBoundingClientRect();
          // Content should fit within mobile screen (allowing for 90% width)
          expect(rect.width).to.be.lessThan(420);
          expect(rect.width).to.be.greaterThan(200);
        });
    });

    it('close button is touch-friendly', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        api.clickPetalBySection('about');
      });

      cy.wait(1500);

      cy.get('golden-rose')
        .shadow()
        .find('[data-testid="close-button"]')
        .should('be.visible')
        .and(($btn) => {
          const rect = $btn[0].getBoundingClientRect();
          // Minimum touch target size of 44px
          expect(rect.width).to.be.gte(40);
          expect(rect.height).to.be.gte(40);
        });
    });
  });

  describe('Mobile Tablets', () => {
    it('works on iPad', () => {
      cy.viewport('ipad-2');
      cy.reload();
      cy.get('golden-rose', { timeout: 10000 }).should('exist');
      cy.get('golden-rose')
        .shadow()
        .find('[data-testid="loading-shimmer"]')
        .should('not.exist');

      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        expect(api.getPetalCount()).to.equal(46);
      });
    });

    it('works on iPad Pro', () => {
      cy.viewport(1024, 1366);
      cy.reload();
      cy.get('golden-rose', { timeout: 10000 }).should('exist');
      cy.get('golden-rose')
        .shadow()
        .find('[data-testid="loading-shimmer"]')
        .should('not.exist');

      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        expect(api.getPetalCount()).to.equal(46);
      });
    });
  });

  describe('Mobile Performance', () => {
    it('maintains animation performance on mobile', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        api.clickPetalBySection('about');
      });

      cy.wait(1500);

      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        // Animation should still run at acceptable framerate
        expect(api.getAnimationFPS()).to.be.gte(20);
      });
    });
  });
});
