/// <reference types="cypress" />

type RoseTestAPI = {
  getControlsConfig: () => { enabled: boolean; touchesOne: number };
  getScrollMode: () => string;
  getTruthParagraphCount: () => number;
  getTruthScrollTarget: () => number;
  getTruthMaxScrollOffset: () => number;
  getTruthActiveParagraphScreenBounds: () => { left: number; right: number; top: number; bottom: number } | null;
};

function installMobileMatchMedia(win: Window) {
  const nativeMatchMedia = win.matchMedia.bind(win);

  win.matchMedia = ((query: string) => {
    if (query === '(pointer: coarse)') {
      return {
        media: query,
        matches: true,
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

function visitMobile() {
  cy.viewport('iphone-x');
  cy.visit('/', {
    onBeforeLoad(win) {
      installMobileMatchMedia(win);
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

function scrollToSection(selector: 'welcome-section' | 'golden-rose' | 'writing-section') {
  cy.window().then((win) => {
    const section = win.document.querySelector(selector) as HTMLElement | null;
    expect(section, selector).to.exist;
    win.scrollTo(0, section!.getBoundingClientRect().top + win.scrollY);
  });
}

function expectSectionAtTop(selector: 'welcome-section' | 'golden-rose' | 'writing-section') {
  cy.get(selector).should(($section) => {
    const top = $section[0].getBoundingClientRect().top;
    expect(Math.abs(top), `${selector} top=${top}`).to.be.lessThan(45);
  });
}

function expectTruthNavVisible() {
  cy.get('golden-rose')
    .shadow()
    .find('[data-testid="truth-nav"]')
    .should('have.class', 'coarse')
    .and('have.css', 'position', 'fixed')
    .and('have.css', 'pointer-events', 'auto')
    .then(($nav) => {
      const rect = $nav[0].getBoundingClientRect();
      const view = $nav[0].ownerDocument.defaultView!;
      expect(rect.right, 'truth nav right edge').to.be.greaterThan(view.innerWidth - 60);
      expect(rect.left, 'truth nav left edge').to.be.greaterThan(view.innerWidth - 120);
      expect(rect.bottom, 'truth nav bottom is above music button').to.be.lessThan(view.innerHeight - 64);
      expect(rect.bottom, 'truth nav remains near bottom').to.be.greaterThan(view.innerHeight - 170);
    });
}

function expectActiveTruthTextVisible() {
  cy.window().then((win) => {
    roseApi().should((api) => {
      const bounds = api.getTruthActiveParagraphScreenBounds();
      expect(bounds, 'active truth paragraph bounds').to.not.equal(null);
      expect(bounds!.left, 'truth text left').to.be.greaterThan(6);
      expect(bounds!.right, 'truth text right').to.be.lessThan(win.innerWidth - 6);
      expect(bounds!.top, 'truth text top').to.be.greaterThan(6);
      expect(bounds!.bottom, 'truth text bottom').to.be.lessThan(win.innerHeight - 6);
    });
  });
}

function pointerSwipeOnCanvas() {
  cy.get('golden-rose')
    .shadow()
    .find('canvas[data-testid="rose-canvas"]')
    .trigger('pointerdown', {
      pointerId: 1,
      pointerType: 'touch',
      isPrimary: true,
      button: 0,
      buttons: 1,
      clientX: 190,
      clientY: 500,
      eventConstructor: 'PointerEvent',
      force: true,
    })
    .trigger('pointermove', {
      pointerId: 1,
      pointerType: 'touch',
      isPrimary: true,
      button: 0,
      buttons: 1,
      clientX: 260,
      clientY: 360,
      eventConstructor: 'PointerEvent',
      force: true,
    })
    .trigger('pointerup', {
      pointerId: 1,
      pointerType: 'touch',
      isPrimary: true,
      button: 0,
      buttons: 0,
      clientX: 260,
      clientY: 360,
      eventConstructor: 'PointerEvent',
      force: true,
    });
}

function clickTruthNext(times = 1) {
  for (let i = 0; i < times; i += 1) {
    cy.get('golden-rose').shadow().find('[data-testid="truth-nav-next"]').click();
  }
}

function clickTruthPrev(times = 1) {
  for (let i = 0; i < times; i += 1) {
    cy.get('golden-rose').shadow().find('[data-testid="truth-nav-prev"]').click();
  }
}

describe('Mobile rose scene controls and truth navigation', () => {
  it('keeps the truth controls fixed bottom-right across mobile sections', () => {
    visitMobile();

    scrollToSection('welcome-section');
    expectSectionAtTop('welcome-section');
    expectTruthNavVisible();

    scrollToSection('golden-rose');
    expectSectionAtTop('golden-rose');
    expectTruthNavVisible();

    scrollToSection('writing-section');
    expectSectionAtTop('writing-section');
    expectTruthNavVisible();
  });

  it('routes one-finger drag to Three.js controls and buttons to truth text / writing handoff', () => {
    visitMobile();

    scrollToSection('golden-rose');
    expectSectionAtTop('golden-rose');

    expectTruthNavVisible();
    expectActiveTruthTextVisible();

    roseApi().then((api) => {
      const cfg = api.getControlsConfig();
      expect(cfg.enabled).to.equal(true);
      expect(cfg.touchesOne).to.equal(0);
      expect(api.getScrollMode()).to.equal('free');
    });

    roseApi().then((api) => {
      const beforeText = api.getTruthScrollTarget();
      pointerSwipeOnCanvas();
      cy.wait(150).then(() => {
        const afterText = api.getTruthScrollTarget();
        expect(afterText).to.equal(beforeText);
      });
    });

    roseApi().invoke('getTruthScrollTarget').then((before) => {
      clickTruthNext();
      roseApi().invoke('getTruthScrollTarget').should('be.greaterThan', before);
    });
    expectActiveTruthTextVisible();

    roseApi().then((api) => {
      for (let i = 0; i < api.getTruthParagraphCount() - 1; i += 1) {
        clickTruthNext();
        expectActiveTruthTextVisible();
      }
      roseApi().invoke('getTruthScrollTarget').should('be.closeTo', api.getTruthMaxScrollOffset(), 0.02);
    });

    clickTruthNext();
    expectSectionAtTop('writing-section');
  });

  it('uses the previous button to reverse truth text and return to welcome', () => {
    visitMobile();

    scrollToSection('golden-rose');
    expectSectionAtTop('golden-rose');
    expectTruthNavVisible();

    roseApi().then((api) => {
      clickTruthNext(api.getTruthParagraphCount());
      roseApi().invoke('getTruthScrollTarget').should('be.closeTo', api.getTruthMaxScrollOffset(), 0.02);
    });

    roseApi().invoke('getTruthScrollTarget').then((atEnd) => {
      clickTruthPrev();
      roseApi().invoke('getTruthScrollTarget').should('be.lessThan', atEnd);
    });

    roseApi().then((api) => {
      clickTruthPrev(api.getTruthParagraphCount());
      roseApi().invoke('getTruthScrollTarget').should('be.closeTo', 0, 0.02);
    });

    clickTruthPrev();
    expectSectionAtTop('welcome-section');
  });
});
