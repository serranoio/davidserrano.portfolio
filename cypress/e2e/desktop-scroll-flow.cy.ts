/// <reference types="cypress" />
import { expectProgress, nativeWheel, scrollGeometry, seek, visitHome } from '../support/scroll-flow';

describe('Continuous desktop poem scrolling', () => {
  beforeEach(() => {
    cy.viewport(1280, 800);
    visitHome();
  });

  it('crosses both poem boundaries in small wheel steps and reverses without jumping', () => {
    scrollGeometry().then(({ start, distance }) => {
      for (const boundary of [start, start + distance]) {
        seek(boundary - 40);
        nativeWheel(80);
        cy.window().its('scrollY').should('be.closeTo', boundary + 40, 2);
        nativeWheel(-80);
        cy.window().its('scrollY').should('be.closeTo', boundary - 40, 2);
        nativeWheel(20);
        cy.window().its('scrollY').should('be.closeTo', boundary - 20, 2);
      }
    });
  });

  it('retraces the poem on reversal and keeps the canvas pinned throughout reading', () => {
    scrollGeometry().then(({ start, distance }) => {
      for (const progress of [0, 0.25, 0.8, 0.45, 1, 0.6, 0]) {
        seek(start + distance * progress);
        expectProgress(progress);
        cy.get('golden-rose').shadow().find('[data-testid="rose-viewport"]').should(($viewport) => {
          expect($viewport[0].getBoundingClientRect().top).to.be.closeTo(0, 1);
        });
      }
    });
  });

  it('reverses immediately during the partial exit to writing', () => {
    scrollGeometry().then(({ start, distance }) => {
      seek(start + distance + 40);
      nativeWheel(-80);
      cy.window().its('scrollY').should('be.closeTo', start + distance - 40, 2);
      expectProgress(1 - 40 / distance);
      nativeWheel(80);
      cy.window().its('scrollY').should('be.closeTo', start + distance + 40, 2);
      expectProgress(1);
    });
  });

  it('supports large scrollbar seeks and preserves contiguous layout after resizing', () => {
    scrollGeometry().then(({ start, distance }) => {
      seek(start + distance * 0.9);
      expectProgress(0.9);
      seek(start + distance * 0.1);
      expectProgress(0.1);
    });
    cy.viewport(1024, 650);
    scrollGeometry().then(({ start, distance, height }) => {
      seek(start + distance);
      expectProgress(1);
      cy.get('writing-section').should(($writing) => {
        expect($writing[0].getBoundingClientRect().top).to.be.closeTo(height, 1);
      });
      cy.get('golden-rose').shadow().find('canvas').should(($canvas) => {
        expect($canvas[0].getBoundingClientRect().height).to.equal(height);
        expect($canvas[0].getBoundingClientRect().width).to.equal(1024);
      });
    });
  });
});
