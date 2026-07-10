/// <reference types="cypress" />

describe('Rose Bloom Animation', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.get('golden-rose', { timeout: 10000 }).should('exist');
    cy.get('golden-rose')
      .shadow()
      .find('[data-testid="loading-shimmer"]')
      .should('not.exist');
  });

  describe('Bloom Sequence (US-8)', () => {
    it('transitions through blooming state', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;

        // Track state changes
        const states: string[] = [];
        const checkState = () => {
          states.push(api.getState());
        };

        checkState(); // Initial state
        api.clickPetalBySection('about');

        // Check state during animation
        cy.wait(50).then(checkState);
        cy.wait(500).then(checkState);
        cy.wait(500).then(() => {
          checkState();
          expect(states).to.include('idle');
          expect(states).to.include('blooming');
        });
      });
    });

    it('completes bloom animation and reaches open state', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        api.clickPetalBySection('about');

        // Wait for animation to complete
        cy.wait(1500).then(() => {
          expect(api.getState()).to.equal('open');
        });
      });
    });

    it('animates petals outward during bloom', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;

        // Get initial petal positions
        const initialPositions = api.getPetalPositions();

        api.clickPetalBySection('about');

        // Wait for animation
        cy.wait(1000).then(() => {
          const newPositions = api.getPetalPositions();

          // At least some petals should have moved outward
          let hasMoved = false;
          for (let i = 0; i < initialPositions.length; i++) {
            const dx = newPositions[i].x - initialPositions[i].x;
            const dz = newPositions[i].z - initialPositions[i].z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            if (distance > 0.01) {
              hasMoved = true;
              break;
            }
          }
          expect(hasMoved).to.be.true;
        });
      });
    });

    it('maintains smooth animation (60fps target)', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;

        // Check that animation loop is running
        const fps = api.getAnimationFPS();
        expect(fps).to.be.greaterThan(30); // At least 30fps
      });
    });
  });

  describe('Close Animation (US-12)', () => {
    it('transitions back to idle state on close', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;

        // Open first
        api.clickPetalBySection('about');
        cy.wait(1500).then(() => {
          expect(api.getState()).to.equal('open');

          // Now close
          api.closeContent();
          cy.wait(50).then(() => {
            const state = api.getState();
            expect(['closing', 'idle']).to.include(state);
          });
        });
      });
    });

    it('resets petals to original positions after close', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;

        // Get original positions
        const originalPositions = api.getPetalPositions();

        // Open and close
        api.clickPetalBySection('about');
        cy.wait(1500).then(() => {
          api.closeContent();
          cy.wait(1500).then(() => {
            const finalPositions = api.getPetalPositions();

            // Positions should be back to original (within tolerance)
            for (let i = 0; i < originalPositions.length; i++) {
              expect(finalPositions[i].x).to.be.closeTo(originalPositions[i].x, 0.1);
              expect(finalPositions[i].z).to.be.closeTo(originalPositions[i].z, 0.1);
            }
          });
        });
      });
    });

    it('clears active section on close', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;

        api.clickPetalBySection('about');
        cy.wait(1500).then(() => {
          expect(api.getActiveSection()).to.equal('about');

          api.closeContent();
          cy.wait(1500).then(() => {
            expect(api.getActiveSection()).to.be.null;
          });
        });
      });
    });
  });
});
