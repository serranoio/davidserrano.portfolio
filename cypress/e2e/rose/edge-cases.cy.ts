/// <reference types="cypress" />

describe('Rose Edge Cases', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.get('golden-rose', { timeout: 10000 }).should('exist');
    cy.get('golden-rose')
      .shadow()
      .find('[data-testid="loading-shimmer"]')
      .should('not.exist');
  });

  describe('Rapid Interaction (US-13)', () => {
    it('ignores clicks during bloom animation', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;

        // Start blooming
        api.clickPetal(0);

        // Try to click another petal during animation
        cy.wait(50).then(() => {
          expect(api.getState()).to.equal('blooming');
          api.clickPetal(3); // Should be ignored
        });

        // Verify we still end up on the first section
        cy.wait(1500).then(() => {
          expect(api.getState()).to.equal('open');
          expect(api.getActiveSection()).to.equal('about');
        });
      });
    });

    it('ignores clicks during close animation', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;

        // Open first
        api.clickPetal(0);
      });

      cy.wait(1500);

      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        api.closeContent();

        // Try to click during close
        cy.wait(50).then(() => {
          expect(api.getState()).to.equal('closing');
          api.clickPetal(3); // Should be ignored
        });

        cy.wait(1500).then(() => {
          expect(api.getState()).to.equal('idle');
          expect(api.getActiveSection()).to.be.null;
        });
      });
    });
  });

  describe('Window Resize (US-14)', () => {
    it('handles viewport resize gracefully', () => {
      // Start at desktop size
      cy.viewport(1920, 1080);

      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;

        // Verify canvas is working
        expect(api.getPetalCount()).to.equal(46);

        // Resize to mobile
        cy.viewport('iphone-x');

        cy.wait(100).then(() => {
          // Petals should still be there
          expect(api.getPetalCount()).to.equal(46);
        });
      });
    });

    it('handles resize during animation', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        api.clickPetal(0);
      });

      // Resize mid-animation
      cy.wait(500);
      cy.viewport('iphone-x');

      // Should complete animation without errors
      cy.wait(1500);

      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        expect(api.getState()).to.equal('open');
      });
    });
  });

  describe('Content Container Edge Cases', () => {
    it('handles very long content scrolling', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        api.clickPetal(0);
      });

      cy.wait(1500);

      // Verify scroll is possible
      cy.get('golden-rose')
        .shadow()
        .find('#content-root')
        .should('have.css', 'overflow-y', 'auto');
    });

    it('close button remains accessible when scrolled', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        api.clickPetal(0);
      });

      cy.wait(1500);

      // Close button should be absolutely positioned and always visible
      cy.get('golden-rose')
        .shadow()
        .find('[data-testid="close-button"]')
        .should('be.visible')
        .and('have.css', 'position', 'absolute');
    });
  });

  describe('State Recovery', () => {
    it('maintains state after rapid section switching', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;

        // Open, close, open different section
        api.clickPetal(0);
      });

      cy.wait(1500);

      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        api.closeContent();
      });

      cy.wait(1500);

      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        api.clickPetal(3);
      });

      cy.wait(1500);

      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        expect(api.getState()).to.equal('open');
        expect(api.getActiveSection()).to.equal('case-studies');
      });
    });

    it('petals return to correct positions after close', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        const originalPositions = api.getPetalPositions();

        api.clickPetal(0);

        cy.wait(1500).then(() => {
          api.closeContent();

          cy.wait(1500).then(() => {
            const finalPositions = api.getPetalPositions();

            // All petals should be back to original
            originalPositions.forEach(
              (pos: { x: number; z: number }, i: number) => {
                expect(finalPositions[i].x).to.be.closeTo(pos.x, 0.1);
                expect(finalPositions[i].z).to.be.closeTo(pos.z, 0.1);
              }
            );
          });
        });
      });
    });
  });
});
