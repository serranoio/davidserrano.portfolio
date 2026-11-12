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
        api.clickPetalBySection('todo-v1'); // First active petal (TO DO v1)

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
        api.clickPetalBySection('todo-v1');

        cy.wait(50).then(() => {
          expect(api.getActiveSection()).to.equal('todo-v1');
        });
      });
    });

    it('clicking second article petal sets TO DO v2 section', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;

        // Click the second placeholder article.
        api.clickPetalBySection('todo-v2');

        cy.wait(50).then(() => {
          expect(api.getActiveSection()).to.equal('todo-v2');
        });
      });
    });

    it('clicking an invalid petal does not change state', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        expect(api.getState()).to.equal('idle');

        // An index outside the loaded petals must remain harmless.
        api.clickPetal(api.getPetalCount());

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
          api.clickPetalBySection('todo-v1');
        });

        cy.wrap(eventPromise).should('deep.equal', { section: 'todo-v1' });
      });
    });
  });

  for (const [index, title] of [[0, 'TO DO v1'], [1, 'TO DO v2'], [45, 'TO DO v2']] as const) {
    it(`opens ${title} from newly active petal ${index}`, () => {
      cy.get('golden-rose').scrollIntoView();
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        api.clickPetal(index);
        expect(api.getActiveSection()).to.equal(`petal-${index}`);
      });
      cy.get('golden-rose').shadow().find('#content-root.visible')
        .should('be.visible').and('contain.text', title);
    });
  }

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

        api.clickPetalBySection('todo-v1');

        cy.wait(50).then(() => {
          const state = api.getState();
          expect(['blooming', 'open']).to.include(state);
        });
      });
    });
  });
});
