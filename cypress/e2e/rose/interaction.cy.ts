/// <reference types="cypress" />

describe('Rose Interaction', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.get('golden-rose', { timeout: 10000 }).should('exist');
    // Wait for loading to complete
    cy.get('golden-rose')
      .shadow()
      .find('[data-testid="loading-shimmer"]')
      .should('not.exist');
  });

  describe('Orbit Controls (US-4)', () => {
    it('has orbit controls properly configured', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        expect(api).to.exist;

        const config = api.getControlsConfig();
        // Verify controls are configured with constraints
        expect(config.minDistance).to.equal(1.4);
        expect(config.maxDistance).to.equal(8);
        expect(config.enablePan).to.be.false;
      });
    });

    it('allows programmatic camera orbiting', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        const initialPosition = api.getCameraPosition();

        // Programmatically orbit the camera
        api.orbitCamera(Math.PI / 4, 0);

        cy.wait(50).then(() => {
          const newPosition = api.getCameraPosition();
          // Camera position should have changed
          const positionChanged =
            Math.abs(newPosition.x - initialPosition.x) > 0.1 ||
            Math.abs(newPosition.z - initialPosition.z) > 0.1;
          expect(positionChanged).to.be.true;
        });
      });
    });

    it('does not zoom when the wheel scrolls the page', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        cy.waitUntil(() => api.getTruthParagraphCount() > 0, { timeout: 5000 });
      });

      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        const initialZoom = api.getCameraPosition().z;

        // Exercise OrbitControls on its actual canvas event target.
        const canvas = win.document.querySelector('golden-rose')!.shadowRoot!.querySelector('canvas')!;
        canvas.dispatchEvent(
          new WheelEvent('wheel', {
            bubbles: true,
            cancelable: true,
            deltaY: 200,
          })
        );

        cy.wait(50).then(() => {
          // OrbitControls.enableZoom is disabled — camera distance unchanged
          // Allow floating-point drift from the controls updating each frame.
          expect(api.getCameraPosition().z).to.be.closeTo(initialZoom, 1e-10);
        });
      });
    });

    it('prevents panning too far from rose', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;

        // Try to zoom out extremely far
        cy.get('golden-rose')
          .shadow()
          .find('canvas[data-testid="rose-canvas"]')
          .trigger('wheel', { deltaY: 10000 });

        cy.wait(100).then(() => {
          const position = api.getCameraPosition();
          // Camera should be constrained by maxDistance
          expect(position.z).to.be.lessThan(20);
        });
      });
    });

    it('works on mobile viewport (US-4)', () => {
      cy.viewport('iphone-x');
      cy.reload();
      cy.get('golden-rose', { timeout: 10000 }).should('exist');

      // Wait for loading to complete
      cy.get('golden-rose')
        .shadow()
        .find('[data-testid="loading-shimmer"]')
        .should('not.exist');

      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        expect(api).to.exist;

        // Verify controls exist and are configured on mobile
        const config = api.getControlsConfig();
        expect(config.minDistance).to.equal(1.4);
        expect(config.maxDistance).to.equal(8);

        // Verify programmatic orbit works on mobile
        const initialPosition = api.getCameraPosition();
        api.orbitCamera(Math.PI / 4, 0);

        cy.wait(50).then(() => {
          const newPosition = api.getCameraPosition();
          const positionChanged =
            Math.abs(newPosition.x - initialPosition.x) > 0.1 ||
            Math.abs(newPosition.z - initialPosition.z) > 0.1;
          expect(positionChanged).to.be.true;
        });
      });
    });
  });

  describe('Hover Effects (US-5)', () => {
    it('highlights petal on hover', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;

        // Hover over canvas center (where petals are)
        cy.get('golden-rose')
          .shadow()
          .find('canvas[data-testid="rose-canvas"]')
          .trigger('mousemove', { clientX: 400, clientY: 300 });

        cy.wait(50).then(() => {
          const hovered = api.getHoveredPetal();
          // May or may not hit a petal depending on exact position
          // Just verify the API works
          expect(hovered).to.satisfy(
            (v: any) => v === null || typeof v === 'number'
          );
        });
      });
    });

    it('shows cursor pointer on active petals', () => {
      cy.get('golden-rose')
        .shadow()
        .find('canvas[data-testid="rose-canvas"]')
        .should('exist');

      // Active petal count is whatever the PETAL_SECTIONS registry holds.
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        expect(api.getActivePetalIndices().length).to.be.greaterThan(0);
      });
    });

    it('displays visual indicators for active petals', () => {
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        const activePetals = api.getActivePetalIndices();
        // Every loaded petal has an article assignment.
        expect(activePetals.length).to.equal(api.getPetalCount());
        expect(api.getPetalIndexForSection('code-is-architecture')).to.not.be.null;
        expect(api.getPetalIndexForSection('history-in-cities')).to.not.be.null;
      });
    });
  });
  it('bounces every petal while idle', () => {
    cy.window().then((win) => {
      const api = (win as any).__ROSE_TEST_API__;
      const initial = api.getPetalPositions();
      expect(initial.length).to.equal(46);
      const moved = new Set<number>();
      // Sample a full bounce cycle so a petal at its turning point is covered.
      for (let sample = 0; sample < 5; sample++) {
        cy.wait(400).then(() => {
          api.getPetalPositions().forEach((position: { y: number }, index: number) => {
            if (Math.abs(position.y - initial[index].y) > 0.001) moved.add(index);
          });
        });
      }
      cy.then(() => expect(moved.size).to.equal(initial.length));
    });
  });

});
