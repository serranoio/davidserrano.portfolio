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
        api.clickPetalBySection('code-is-architecture'); // First active petal (Code is architecture (skyscrapers))

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
        api.clickPetalBySection('code-is-architecture');

        cy.wait(50).then(() => {
          expect(api.getActiveSection()).to.equal('code-is-architecture');
        });
      });
    });

    it('clicking second article petal sets History in cities (legacy systems) section', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;

        // Click the second article.
        api.clickPetalBySection('history-in-cities');

        cy.wait(50).then(() => {
          expect(api.getActiveSection()).to.equal('history-in-cities');
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
          api.clickPetalBySection('code-is-architecture');
        });

        cy.wrap(eventPromise).should('deep.equal', { section: 'code-is-architecture' });
      });
    });
  });

  for (const [index, title] of [
    [0, 'Code is architecture (skyscrapers)'],
    [1, 'History in cities (legacy systems)'],
    [2, 'The Forest (the system)'],
    [3, 'Guitar hero (pipelines)'],
    [4, 'Like an Eagle (high low level)'],
    [5, 'Cooking a dish(MRs)'],
    [6, 'Code is dance (the process)'],
    [7, 'Forging code'],
    [45, 'Cooking a dish(MRs)'],
  ] as const) {
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

        api.clickPetalBySection('code-is-architecture');

        cy.wait(50).then(() => {
          const state = api.getState();
          expect(['blooming', 'open']).to.include(state);
        });
      });
    });
  });
});
