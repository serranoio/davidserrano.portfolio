/// <reference types="cypress" />
import { expectProgress, nativeTouchSwipe, roseApi, scrollGeometry, seek, visitHome } from '../support/scroll-flow';

function truthButton(direction: 'prev' | 'next') {
  return cy.get('golden-rose').shadow().find(`[data-testid="truth-nav-${direction}"]`);
}

describe('Continuous mobile poem scrolling', () => {
  beforeEach(() => cy.viewport('iphone-x'));

  it('lets vertical touch scrolling own poem progress without section snapping', () => {
    visitHome(true);
    cy.get('html').should('have.css', 'scroll-snap-type', 'none');
    cy.get('golden-rose').shadow().find('canvas').should('have.css', 'touch-action', 'pan-y pinch-zoom');
    roseApi().invoke('getControlsConfig').its('touchesOne').should('eq', null);
    scrollGeometry().then(({ start, distance }) => {
      for (const progress of [0, 0.6, 1, 0.35, 0]) {
        seek(start + distance * progress);
        expectProgress(progress);
      }
    });
  });

  it('advances and reverses with real one-finger swipes over the canvas', () => {
    visitHome(true);
    scrollGeometry().then(({ start, distance }) => {
      const middle = start + distance / 2;
      seek(middle);
      nativeTouchSwipe(1);
      cy.window().its('scrollY').should('be.greaterThan', middle + 40);
      cy.window().then((win) => {
        const afterDown = win.scrollY;
        expectProgress((afterDown - start) / distance);
        nativeTouchSwipe(-1);
        cy.window().its('scrollY').should('be.lessThan', afterDown - 40);
      });
    });
  });

  it('uses paragraph buttons on the same page timeline and scopes them to the rose', () => {
    visitHome(true);
    scrollGeometry().then(({ start, distance, height }) => {
      seek(start);
      roseApi().then((api) => {
        const step = 1 / (api.getTruthParagraphCount() - 1);
        truthButton('next').click({ scrollBehavior: false });
        expectProgress(step);
        cy.window().its('scrollY').should('be.closeTo', start + distance * step, 2);
        truthButton('prev').click({ scrollBehavior: false });
        expectProgress(0);
        cy.window().its('scrollY').should('be.closeTo', start, 2);
      });
      seek(start + distance);
      truthButton('next').click({ scrollBehavior: false });
      cy.window().its('scrollY').should('be.closeTo', start + distance + height, 2);
      truthButton('next').should(($button) => {
        expect($button[0].getBoundingClientRect().bottom).to.be.lessThan(0);
      });
      // Native reversal returns to the final paragraph, then retraces it.
      seek(start + distance - 100);
      expectProgress(1 - 100 / distance);
      seek(start);
      truthButton('prev').click({ scrollBehavior: false });
      cy.get('welcome-section').should(($hero) => {
        expect($hero[0].getBoundingClientRect().top).to.be.closeTo(0, 2);
      });
    });
  });

  it('honors reduced motion for explicit paragraph navigation', () => {
    visitHome(true, true);
    scrollGeometry().then(({ start, distance }) => {
      seek(start);
      roseApi().then((api) => {
        const step = 1 / (api.getTruthParagraphCount() - 1);
        truthButton('next').then(($button) => {
          $button[0].click();
          const win = $button[0].ownerDocument.defaultView!;
          expect(win.scrollY).to.be.closeTo(start + distance * step, 1);
        });
        expectProgress(step);
      });
    });
  });
});
