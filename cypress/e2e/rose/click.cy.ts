/// <reference types="cypress" />

describe('Rose Click Detection', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.get('golden-rose', { timeout: 10000 }).should('exist');
    // Wait for loading to complete
    cy.get('golden-rose')
      .shadow()
      .find('[data-testid="loading-shimmer"]')
      .should('not.exist');
  });

  describe('Petal Click (US-6, US-7)', () => {
    it('clicking active petal triggers bloom state', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        expect(api.getState()).to.equal('idle');

        // Programmatically click an active petal
        api.clickPetal(0); // First active petal (About)

        cy.wait(50).then(() => {
          const state = api.getState();
          expect(['blooming', 'open']).to.include(state);
        });
      });
    });

    it('clicking active petal sets active section', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        expect(api.getActiveSection()).to.be.null;

        // Click the first active petal
        api.clickPetal(0);

        cy.wait(50).then(() => {
          expect(api.getActiveSection()).to.equal('about');
        });
      });
    });

    it('clicking second active petal sets case-studies section', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;

        // Click the second active petal (index 3)
        api.clickPetal(3);

        cy.wait(50).then(() => {
          expect(api.getActiveSection()).to.equal('case-studies');
        });
      });
    });

    it('clicking third active petal sets poetry section', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;

        // Click the third active petal (index 6)
        api.clickPetal(6);

        cy.wait(50).then(() => {
          expect(api.getActiveSection()).to.equal('poetry');
        });
      });
    });

    it('clicking non-active petal does not change state', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        expect(api.getState()).to.equal('idle');

        // Click a non-active petal (index 1)
        api.clickPetal(1);

        cy.wait(50).then(() => {
          expect(api.getState()).to.equal('idle');
          expect(api.getActiveSection()).to.be.null;
        });
      });
    });

    it('dispatches section-selected event on petal click', () => {
      cy.get('golden-rose').then(($rose) => {
        const eventPromise = new Cypress.Promise((resolve) => {
          $rose[0].addEventListener(
            'section-selected',
            (e: Event) => {
              resolve((e as CustomEvent).detail);
            },
            { once: true }
          );
        });

        cy.window().then((win) => {
          const api = (win as any).__ROSE_TEST_API__;
          api.clickPetal(0);
        });

        cy.wrap(eventPromise).should('deep.equal', { section: 'about' });
      });
    });
  });

  describe('Mobile Click (US-7)', () => {
    beforeEach(() => {
      cy.viewport('iphone-x');
      cy.reload();
      cy.get('golden-rose', { timeout: 10000 }).should('exist');
      cy.get('golden-rose')
        .shadow()
        .find('[data-testid="loading-shimmer"]')
        .should('not.exist');
    });

    it('tap on active petal triggers bloom on mobile', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        expect(api.getState()).to.equal('idle');

        api.clickPetal(0);

        cy.wait(50).then(() => {
          const state = api.getState();
          expect(['blooming', 'open']).to.include(state);
        });
      });
    });
  });
});
