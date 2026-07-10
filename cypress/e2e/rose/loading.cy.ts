describe('Rose Loading', () => {
  // Slice 1: Three.js Canvas
  it('renders Three.js canvas (US-1)', () => {
    cy.visit('/');
    cy.get('golden-rose', { timeout: 10000 }).should('exist');
    cy.get('golden-rose')
      .shadow()
      .find('canvas[data-testid="rose-canvas"]')
      .should('exist');
  });

  it('canvas has WebGL context', () => {
    cy.visit('/');
    cy.get('golden-rose')
      .shadow()
      .find('canvas[data-testid="rose-canvas"]')
      .then(($canvas) => {
        const canvas = $canvas[0] as HTMLCanvasElement;
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        expect(gl).to.not.be.null;
      });
  });

  // Slice 2: Loading Shimmer (US-3)
  it('shows loading shimmer initially (US-3)', () => {
    // Slow the GLB so the shimmer is unambiguously present when we query it
    // — otherwise a cached/fast load can race the assertion.
    cy.intercept('GET', '**/models/rose_separated.glb', (req) => {
      return new Promise((resolve) => setTimeout(resolve, 1500)).then(() =>
        req.continue()
      );
    });
    cy.visit('/');
    cy.get('golden-rose')
      .shadow()
      .find('[data-testid="loading-shimmer"]')
      .should('exist');
  });

  it('hides shimmer after load', () => {
    cy.visit('/');
    cy.get('golden-rose')
      .shadow()
      .find('canvas[data-testid="rose-canvas"]', { timeout: 10000 })
      .should('exist');
    cy.get('golden-rose')
      .shadow()
      .find('[data-testid="loading-shimmer"]')
      .should('not.exist');
  });

  // Slice 3: Single Petal
  it('renders at least one petal', () => {
    cy.visit('/');
    cy.window().then((win) => {
      cy.waitUntil(() => {
        const api = (win as any).__ROSE_TEST_API__;
        return api && api.getPetalCount() >= 1;
      }, { timeout: 10000 });
    });
  });

  // Slice 4: Full Rose
  it('renders multiple petals (US-1, US-2)', () => {
    cy.visit('/');
    cy.window().then((win) => {
      cy.waitUntil(() => {
        const api = (win as any).__ROSE_TEST_API__;
        return api && api.getPetalCount() >= 8;
      }, { timeout: 10000 });
    });
  });

  it('renders on mobile viewport (US-2)', () => {
    cy.viewport(375, 667);
    cy.visit('/');
    cy.get('golden-rose')
      .shadow()
      .find('canvas[data-testid="rose-canvas"]')
      .should('exist');
  });
});
