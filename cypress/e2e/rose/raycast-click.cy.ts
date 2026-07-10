/// <reference types="cypress" />

// Real-pixel raycasting test. Most petal tests use api.clickPetal(idx)
// which calls the click handler directly. This test projects the petal's
// world position to screen coords via the live camera matrix and dispatches
// a real click on the canvas at those coords, exercising the full
// raycaster path the user actually hits.
//
// If a registered petal is occluded by other petals, this test fails —
// because raycasting from the camera will hit the occluding petal first
// and section won't open. That's what makes it a useful smoke test for
// "are the registered petals actually visible/clickable?"

describe('Rose petal real-pixel clicks', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.get('golden-rose', { timeout: 10000 }).should('exist');
    cy.get('golden-rose')
      .shadow()
      .find('[data-testid="loading-shimmer"]')
      .should('not.exist');
    // Let rose finish onRoseLoaded so petals + camera are wired, then freeze
    // the idle auto-spin so projected coords still point at the right petal
    // by the time the click fires.
    cy.window().then((win) => {
      const api = (win as any).__ROSE_TEST_API__;
      cy.waitUntil(() => api.getPetalCount() > 0, { timeout: 5000 });
    });
    cy.window().then((win) => {
      (win as any).__ROSE_TEST_API__.setAutoRotate(false);
    });
  });

  it('opens About by clicking its petal on the canvas', () => {
    realPixelClickPetal('about').then(() => {
      cy.wait(1500);
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        expect(api.getActiveSection()).to.equal('about');
        expect(api.getState()).to.equal('open');
      });
    });
  });

  it('opens Poetry by clicking its petal on the canvas', () => {
    realPixelClickPetal('poetry').then(() => {
      cy.wait(1500);
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        expect(api.getActiveSection()).to.equal('poetry');
        expect(api.getState()).to.equal('open');
      });
    });
  });
});

function realPixelClickPetal(sectionId: string) {
  return cy.window().then((win) => {
    const api = (win as any).__ROSE_TEST_API__;
    const idx = api.getPetalIndexForSection(sectionId);
    if (idx === null) throw new Error(`no petal for section "${sectionId}"`);
    const screen = api.projectPetalToScreen(idx);
    if (!screen) throw new Error(`could not project petal ${idx}`);

    return cy
      .get('golden-rose')
      .shadow()
      .find('canvas[data-testid="rose-canvas"]')
      .then(($canvas) => {
        const canvas = $canvas[0] as HTMLCanvasElement;
        const rect = canvas.getBoundingClientRect();
        // projectPetalToScreen returns CSS pixels (renderer.getSize uses CSS,
        // not the DPR-scaled drawing-buffer size). Click expects CSS pixels
        // relative to the element. Bounds-check against the canvas CSS rect.
        expect(screen.x).to.be.within(0, rect.width);
        expect(screen.y).to.be.within(0, rect.height);
        cy.wrap(canvas).click(screen.x, screen.y);
      });
  });
}
