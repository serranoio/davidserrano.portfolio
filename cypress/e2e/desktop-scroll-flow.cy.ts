/// <reference types="cypress" />

type RoseTestAPI = {
  getScrollMode: () => string;
  getTruthScrollTarget: () => number;
  getTruthMaxScrollOffset: () => number;
};

function installDesktopMatchMedia(win: Window) {
  const nativeMatchMedia = win.matchMedia.bind(win);

  win.matchMedia = ((query: string) => {
    if (query === '(pointer: coarse)') {
      return {
        media: query,
        matches: false,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => true,
      } as unknown as MediaQueryList;
    }

    return nativeMatchMedia(query);
  }) as typeof win.matchMedia;
}

function visitDesktop() {
  cy.viewport(1280, 800);
  cy.visit('/', {
    onBeforeLoad(win) {
      installDesktopMatchMedia(win);
    },
  });
  cy.get('golden-rose', { timeout: 10000 }).should('exist');
  cy.get('golden-rose')
    .shadow()
    .find('[data-testid="loading-shimmer"]', { timeout: 15000 })
    .should('not.exist');
}

function roseApi() {
  return cy.window().its('__ROSE_TEST_API__').should('exist') as Cypress.Chainable<RoseTestAPI>;
}

function wheel(deltaY: number) {
  cy.window().then((win) => {
    win.dispatchEvent(
      new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        deltaY,
      })
    );
  });
}

function sectionTop(selector: 'welcome-section' | 'golden-rose' | 'writing-section') {
  return cy.window().then((win) => {
    const section = win.document.querySelector(selector) as HTMLElement | null;
    expect(section, selector).to.exist;
    return section!.getBoundingClientRect().top;
  });
}

function scrollNearRoseFromAbove() {
  cy.window().then((win) => {
    const rose = win.document.querySelector('golden-rose') as HTMLElement;
    const roseTop = rose.getBoundingClientRect().top + win.scrollY;
    win.scrollTo(0, Math.max(0, roseTop - win.innerHeight * 0.45));
  });
}

function scrollNearRoseFromBelow() {
  cy.window().then((win) => {
    const rose = win.document.querySelector('golden-rose') as HTMLElement;
    const roseTop = rose.getBoundingClientRect().top + win.scrollY;
    win.scrollTo(0, roseTop + win.innerHeight * 0.45);
  });
}

function expectRoseSnapped() {
  sectionTop('golden-rose').should((top) => {
    expect(Math.abs(top)).to.be.lessThan(45);
  });
}

function enterPinnedFromAbove() {
  scrollNearRoseFromAbove();
  wheel(260);
  cy.wait(850);
  expectRoseSnapped();
  roseApi().invoke('getScrollMode').should('eq', 'pinned');
}

function enterPinnedFromBelow() {
  scrollNearRoseFromBelow();
  wheel(-260);
  cy.wait(850);
  expectRoseSnapped();
  roseApi().invoke('getScrollMode').should('eq', 'pinned');
}

function driveTruthTextToEnd() {
  for (let i = 0; i < 12; i += 1) {
    wheel(900);
  }
  roseApi().then((api) => {
    expect(api.getTruthScrollTarget()).to.be.closeTo(api.getTruthMaxScrollOffset(), 0.02);
  });
}

function driveTruthTextToStart() {
  for (let i = 0; i < 12; i += 1) {
    wheel(-900);
  }
  roseApi().invoke('getTruthScrollTarget').should('be.closeTo', 0, 0.02);
}

describe('Desktop rose scroll handoff', () => {
  it('wheels into the Three.js section, pins for inner truth-text scroll, then releases down to writing', () => {
    visitDesktop();

    enterPinnedFromAbove();

    roseApi().invoke('getTruthScrollTarget').then((before) => {
      wheel(450);
      roseApi().invoke('getTruthScrollTarget').should('be.greaterThan', before);
    });

    driveTruthTextToEnd();
    wheel(260);

    sectionTop('writing-section').should((top) => {
      expect(Math.abs(top)).to.be.lessThan(45);
    });
  });

  it('reverses from writing, pins for inner truth-text scroll, then releases up to welcome', () => {
    visitDesktop();

    cy.window().then((win) => {
      const writing = win.document.querySelector('writing-section') as HTMLElement;
      win.scrollTo(0, writing.getBoundingClientRect().top + win.scrollY);
    });
    sectionTop('writing-section').should((top) => {
      expect(Math.abs(top)).to.be.lessThan(45);
    });

    enterPinnedFromBelow();

    roseApi().then((api) => {
      expect(api.getTruthScrollTarget()).to.be.closeTo(api.getTruthMaxScrollOffset(), 0.02);
      expect(api.getScrollMode()).to.equal('pinned');
    });
    roseApi().invoke('getTruthScrollTarget').then((endTarget) => {
      wheel(-450);
      roseApi().invoke('getTruthScrollTarget').should('be.lessThan', endTarget);
    });

    driveTruthTextToStart();
    wheel(-260);

    sectionTop('welcome-section').should((top) => {
      expect(Math.abs(top)).to.be.lessThan(45);
    });
  });
});
