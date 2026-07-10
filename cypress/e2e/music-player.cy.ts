/// <reference types="cypress" />

describe('Music Player', () => {
  beforeEach(() => {
    // Each test starts from a clean acknowledgement state.
    cy.clearLocalStorage();
  });

  it('mounts a single <music-player> on the body', () => {
    cy.visit('/');
    cy.get('body > music-player', { timeout: 10000 }).should('have.length', 1);
  });

  it('places a hidden YouTube host on the body', () => {
    cy.visit('/');
    cy.get('body > [id^="yt-player-host-"]', { timeout: 10000 })
      .should('exist')
      .then(($host) => {
        const style = window.getComputedStyle($host[0]);
        expect(style.position).to.equal('fixed');
        expect(parseFloat(style.opacity)).to.equal(0);
        expect(style.pointerEvents).to.equal('none');
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
        expect(rect.right).to.be.greaterThan(window.innerWidth * 0.75);
        expect(rect.bottom).to.be.greaterThan(window.innerHeight * 0.75);
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
});
