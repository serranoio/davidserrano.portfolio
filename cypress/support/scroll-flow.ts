/// <reference types="cypress" />

export interface RoseScrollAPI {
  getTruthParagraphCount: () => number;
  getTruthScrollOffset: () => number;
  getTruthMaxScrollOffset: () => number;
  getControlsConfig: () => { touchesOne: number | null };
}

export function roseApi() {
  return cy.window().its('__ROSE_TEST_API__').should('exist') as Cypress.Chainable<RoseScrollAPI>;
}

export function visitHome(coarse = false, reducedMotion = false) {
  cy.visit('/', {
    onBeforeLoad(win) {
      const nativeMatchMedia = win.matchMedia.bind(win);
      win.matchMedia = (query: string) => {
        const result = nativeMatchMedia(query);
        if (query === '(pointer: coarse)' || query === '(prefers-reduced-motion: reduce)') {
          Object.defineProperty(result, 'matches', {
            value: query === '(pointer: coarse)' ? coarse : reducedMotion,
          });
        }
        return result;
      };
    },
  });
  cy.get('golden-rose').shadow().find('[data-testid="loading-shimmer"]', { timeout: 15000 }).should('not.exist');
  roseApi().invoke('getTruthParagraphCount').should('be.greaterThan', 1);
}

export function scrollGeometry() {
  return cy.get('golden-rose').then(($rose) => {
    const rose = $rose[0];
    const viewport = rose.shadowRoot!.querySelector<HTMLElement>('[data-testid="rose-viewport"]')!;
    return {
      start: rose.getBoundingClientRect().top + rose.ownerDocument.defaultView!.scrollY,
      distance: rose.clientHeight - viewport.clientHeight,
      height: viewport.clientHeight,
    };
  });
}

export function seek(top: number) {
  cy.window().then((win) => win.scrollTo({ top, behavior: 'instant' }));
  cy.window().its('scrollY').should('be.closeTo', top, 1);
}

export function expectProgress(progress: number) {
  roseApi().should((api) => {
    expect(api.getTruthScrollOffset() / api.getTruthMaxScrollOffset()).to.be.closeTo(progress, 0.002);
  });
}

// Use trusted browser input: synthetic WheelEvents do not exercise native
// scrolling and would let a broken handoff pass. Coordinates account for the
// Cypress runner's scaled application iframe.
export function nativeWheel(deltaY: number) {
  cy.then(() => {
    const frame = window.top!.document.querySelector('iframe.aut-iframe')!;
    const rect = frame.getBoundingClientRect();
    return Cypress.automation('remote:debugger:protocol', {
      command: 'Input.dispatchMouseEvent',
      params: {
        type: 'mouseWheel',
        x: rect.left + rect.width * 0.5,
        y: rect.top + rect.height * 0.5,
        deltaX: 0,
        deltaY,
      },
    });
  });
}

export function nativeTouchSwipe(direction: 1 | -1) {
  cy.then(async () => {
    const rect = window.top!.document.querySelector('iframe.aut-iframe')!.getBoundingClientRect();
    const x = rect.left + rect.width * 0.5;
    const start = rect.top + rect.height * (direction > 0 ? 0.75 : 0.35);
    const touch = (type: string, y?: number) => Cypress.automation('remote:debugger:protocol', {
      command: 'Input.dispatchTouchEvent',
      params: { type, touchPoints: y === undefined ? [] : [{ x, y }] },
    });
    await touch('touchStart', start);
    for (let step = 1; step <= 8; step += 1) {
      await touch('touchMove', start - direction * rect.height * 0.4 * step / 8);
      await Cypress.Promise.delay(40);
    }
    // Lift after stopping so momentum cannot race the reversal assertion.
    await Cypress.Promise.delay(100);
    await touch('touchEnd');
  });
}
