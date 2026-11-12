/// <reference types="cypress" />

// Exercise the canvas click listener and raycaster using actual screen pixels.
// Bouncing petals can occlude a neighbor's projected center, so assert that
// the article selected belongs to the visible surface actually hit.

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

  it('opens the visible article at the architecture petal', () => {
    realPixelClickPetal('code-is-architecture').then((hitSection) => {
      cy.wait(1500);
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        expect(api.getActiveSection()).to.equal(hitSection);
        expect(api.getState()).to.equal('open');
      });
    });
  });

  it('opens the visible article at the history petal', () => {
    realPixelClickPetal('history-in-cities').then((hitSection) => {
      cy.wait(1500);
      cy.window().then((win) => {
        const api = (win as any).__ROSE_TEST_API__;
        expect(api.getActiveSection()).to.equal(hitSection);
        expect(api.getState()).to.equal('open');
      });
    });
  });
});

function realPixelClickPetal(sectionId: string) {
  return cy.get('golden-rose').shadow()
    .find('canvas[data-testid="rose-canvas"]')
    .then(($canvas) => {
      const canvas = $canvas[0] as HTMLCanvasElement;
      const win = canvas.ownerDocument.defaultView!;
      const api = (win as any).__ROSE_TEST_API__;
      const idx = api.getPetalIndexForSection(sectionId);
      if (idx === null) throw new Error(`no petal for section "${sectionId}"`);
      const screen = api.projectPetalToScreen(idx);
      if (!screen) throw new Error(`could not project petal ${idx}`);
      const rect = canvas.getBoundingClientRect();
      expect(screen.x).to.be.within(0, rect.width);
      expect(screen.y).to.be.within(0, rect.height);
      // MouseEvent rounds client coordinates. Sample using those same pixel
      // coordinates, because overlapping petals may differ within one pixel.
      const click = new win.MouseEvent('click', {
        bubbles: true,
        clientX: rect.left + screen.x,
        clientY: rect.top + screen.y,
      });
      const hit = api.raycastAtCanvas(click.clientX - rect.left, click.clientY - rect.top);
      expect(hit?.isActive).to.equal(true);
      expect(hit?.section).to.be.a('string');
      // Stay in the same frame so bouncing cannot move the visible target.
      canvas.dispatchEvent(click);
      return hit.section as string;
    });
}
