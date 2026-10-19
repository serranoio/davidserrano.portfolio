/// <reference types="cypress" />

describe('Music Player', () => {
  beforeEach(() => {
    // Each test starts from a clean acknowledgement state.
    cy.clearLocalStorage();
    cy.readFile('cypress/fixtures/youtube-api.js').then((body) => {
      cy.intercept('GET', 'https://www.youtube.com/iframe_api', { body, headers: { 'content-type': 'application/javascript' } }).as('youtubeAPI');
    });
  });

  it('mounts a single <music-player> on the body', () => {
    cy.visit('/');
    cy.get('body > music-player', { timeout: 10000 }).should('have.length', 1);
  });

  it('sizes the YouTube mount inside the component shadow root', () => {
    cy.visit('/');
    cy.get('music-player').shadow().find('.player-mount')
      .should('exist')
      .then(($host) => {
        const style = window.getComputedStyle($host[0]);
        expect(style.position).to.equal('fixed');
        expect(parseFloat(style.opacity)).to.equal(0);
        expect(style.pointerEvents).to.equal('none');
        expect(style.width).to.equal('200px');
        expect(style.height).to.equal('200px');
      });
  });

  it('renders the play button in the bottom-right corner', () => {
    cy.visit('/');
    cy.get('music-player')
      .shadow()
      .find('[data-testid="music-player-button"]', { timeout: 10000 })
      .should('be.visible')
      .then(($btn) => {
        const rect = $btn[0].getBoundingClientRect();
        // Button should be in the bottom-right quadrant of the viewport
        const view = $btn[0].ownerDocument.defaultView!;
        expect(rect.right).to.be.greaterThan(view.innerWidth * 0.75);
        expect(rect.bottom).to.be.greaterThan(view.innerHeight * 0.75);
        // 48px button per the design
        expect(rect.width).to.be.closeTo(48, 1);
        expect(rect.height).to.be.closeTo(48, 1);
      });
  });

  it('starts in paused state with the play aria-label', () => {
    cy.visit('/');
    cy.get('music-player')
      .shadow()
      .find('[data-testid="music-player-button"]')
      .should('have.attr', 'aria-label', 'Play background music')
      .and('have.attr', 'data-state', 'paused');
  });

  it('bounces on first visit (no acknowledgement in storage)', () => {
    cy.visit('/');
    cy.get('music-player')
      .shadow()
      .find('[data-testid="music-player-button"]')
      .should('have.class', 'bouncing');
  });

  it('does NOT bounce when already acknowledged', () => {
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('musicAcknowledged', 'true');
      },
    });
    cy.get('music-player')
      .shadow()
      .find('[data-testid="music-player-button"]')
      .should('not.have.class', 'bouncing');
  });

  it('stops bouncing and persists acknowledgement after a click', () => {
    cy.visit('/');
    cy.get('music-player')
      .shadow()
      .find('[data-testid="music-player-button"]')
      .should('have.class', 'bouncing')
      .click();

    cy.get('music-player')
      .shadow()
      .find('[data-testid="music-player-button"]')
      .should('not.have.class', 'bouncing');

    cy.window().then((win) => {
      expect(win.localStorage.getItem('musicAcknowledged')).to.equal('true');
    });
  });

  it('survives page navigation (singleton across routes)', () => {
    cy.visit('/');
    cy.get('body > music-player', { timeout: 10000 }).should('have.length', 1);

    cy.visit('/sections/about');
    cy.get('body > music-player', { timeout: 10000 }).should('have.length', 1);
  });

  it('keeps the button visible on a small mobile viewport', () => {
    cy.viewport(375, 667);
    cy.visit('/');
    cy.get('music-player')
      .shadow()
      .find('[data-testid="music-player-button"]', { timeout: 10000 })
      .should('be.visible')
      .then(($btn) => {
        const rect = $btn[0].getBoundingClientRect();
        // Still in the bottom-right
        expect(rect.right).to.be.greaterThan(375 * 0.75);
        expect(rect.bottom).to.be.greaterThan(667 * 0.75);
        // Still 48px (no shrinkage)
        expect(rect.width).to.be.closeTo(48, 1);
      });
  });

  it('keeps an early play request until the iframe is ready, then pauses on the next click', () => {
    cy.visit('/', { onBeforeLoad: (win) => { (win as any).__DELAY_YT_READY__ = true; } });
    cy.window().its('__YT_TEST__.players').should('have.length', 1);
    musicButton().click().should('have.attr', 'data-state', 'loading');
    player().then((mock) => {
      expect(mock.playCalls).to.equal(0);
      mock.ready();
    });
    musicButton().should('have.attr', 'data-state', 'playing');
    player().then((mock) => {
      expect(mock.playCalls).to.equal(1);
      expect(mock.volume).to.equal(50);
      expect(mock.muted).to.equal(false);
    });
    musicButton().click().should('have.attr', 'data-state', 'paused');
    player().its('pauseCalls').should('eq', 1);
  });

  it('cancels an early request without starting music when loading finishes', () => {
    cy.visit('/', { onBeforeLoad: (win) => { (win as any).__DELAY_YT_READY__ = true; } });
    cy.window().its('__YT_TEST__.players').should('have.length', 1);
    musicButton().click().click().should('have.attr', 'data-state', 'paused');
    player().then((mock) => mock.ready());
    player().its('playCalls').should('eq', 0);
  });

  it('explains a blocked script and retries a fresh API request', () => {
    cy.intercept('GET', 'https://www.youtube.com/iframe_api', { statusCode: 503, body: '' });
    cy.visit('/');
    musicButton().should('have.attr', 'data-state', 'error');
    cy.get('music-player').shadow().find('[role="status"]').should('not.be.visible');
    musicButton().click();
    musicButton().should('have.attr', 'data-state', 'error');
    cy.get('music-player').shadow().find('[role="status"]').should('be.visible').and('contain.text', 'YouTube may be blocked');
    cy.readFile('cypress/fixtures/youtube-api.js').then((body) => {
      cy.intercept('GET', 'https://www.youtube.com/iframe_api', { body, headers: { 'content-type': 'application/javascript' } });
    });
    musicButton().click();
    musicButton().should('have.attr', 'data-state', 'playing');
    cy.get('music-player').shadow().find('iframe').should('have.length', 1);
  });

  it('reports an API load timeout instead of waiting silently forever', () => {
    cy.intercept('GET', 'https://www.youtube.com/iframe_api', { body: '' });
    cy.clock(0, ['setTimeout', 'clearTimeout']);
    cy.visit('/');
    musicButton().click();
    cy.tick(10001);
    musicButton().should('have.attr', 'data-state', 'error');
    cy.get('music-player').shadow().find('[role="status"]').should('contain.text', 'Click to retry');
  });

  it('allows a direct retry when the browser blocks playback', () => {
    cy.visit('/');
    player().its('playVideo').should('be.a', 'function');
    cy.window().then((win) => { (win as any).__YT_TEST__.blockPlayback = true; });
    musicButton().click().should('have.attr', 'data-state', 'error');
    cy.get('music-player').shadow().find('[role="status"]').should('contain.text', 'Playback was blocked');
    cy.window().then((win) => { (win as any).__YT_TEST__.blockPlayback = false; });
    musicButton().click().should('have.attr', 'data-state', 'playing');
    player().its('playCalls').should('eq', 2);
    cy.window().its('__YT_TEST__.players').should('have.length', 1);
  });

  it('reports video errors and replaces the failed iframe on retry', () => {
    cy.visit('/');
    player().then((mock) => mock.options.events.onError({ target: mock, data: 150 }));
    musicButton().should('have.attr', 'data-state', 'error');
    player().its('destroyed').should('eq', true);
    musicButton().click().should('have.attr', 'data-state', 'playing');
    cy.window().its('__YT_TEST__.players').should('have.length', 2);
    cy.get('music-player').shadow().find('iframe').should('have.length', 1);
  });

  it('does not restart a disconnected player when a late ready event arrives', () => {
    cy.visit('/', { onBeforeLoad: (win) => { (win as any).__DELAY_YT_READY__ = true; } });
    cy.window().its('__YT_TEST__.players').should('have.length', 1);
    musicButton().click();
    cy.get('music-player').then(($element) => $element[0].remove());
    player().then((mock) => {
      mock.ready();
      expect(mock.destroyed).to.equal(true);
      expect(mock.playCalls).to.equal(0);
    });
  });

});


function musicButton() {
  return cy.get('music-player').shadow().find('[data-testid="music-player-button"]');
}

function player(): Cypress.Chainable<any> {
  return cy.window().its('__YT_TEST__.players.0').should('exist');
}
