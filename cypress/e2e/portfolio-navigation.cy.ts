/// <reference types="cypress" />

// These journeys should remain usable independently of the rose experience.
describe('Life portfolio navigation', () => {
  it('takes professional visitors directly to a useful engineering scaffold', () => {
    cy.viewport(1280, 800);
    cy.visit('/');
    cy.get('welcome-section').shadow().contains('a', 'Explore my engineering').click();
    cy.location('pathname').should('eq', '/engineering.html');
    cy.get('main').contains('h1', 'Software as a craft.').should('be.visible');
    cy.get('main').contains('a', 'Find me on GitHub').should('have.attr', 'href', 'https://github.com/serranoio');
    cy.get('main').should('not.contain.text', 'Project Alpha');
    cy.get('main a').each(($link) => {
      expect($link.attr('href')).not.to.equal('#');
    });
    cy.get('main').contains('a', 'Read The Ballad Of Programata').click();
    cy.location('hash').should('eq', '#rose');
    cy.get('golden-rose').should(($rose) => {
      expect(Math.abs($rose[0].getBoundingClientRect().top)).to.be.lessThan(70);
    });
  });

  it('filters the writing collection and opens an existing article', () => {
    cy.visit('/writing.html');
    cy.get('.writing-list > li').its('length').should('be.greaterThan', 10);
    cy.contains('button', /^Dance$/).click().should('have.attr', 'aria-pressed', 'true');
    cy.get('.writing-list > li').should('have.length', 2);
    cy.get('.writing-list').contains('a', 'Intro To Bachata').click();
    cy.location('pathname').should('eq', '/blog/intro-to-bachata.html');
    cy.get('.rp-nav').contains('a', /^Writing$/).click();
    cy.get('.writing-list > li').its('length').should('be.greaterThan', 10);
    cy.get('.writing-list a').each(($link) => {
      cy.request($link.attr('href')!).its('status').should('eq', 200);
    });
  });

  it('keeps destinations reachable on mobile and connects about to the original story', () => {
    cy.viewport(390, 844);
    cy.visit('/');
    cy.get('welcome-section').shadow().contains('a', 'Read my writing').should('be.visible');
    cy.get('.rp-nav').find('button[aria-label="mobile hamburger"]').filter(':visible').click();
    cy.get('a').filter(':visible').contains(/^About$/).click();
    cy.location('pathname').should('eq', '/about.html');
    cy.get('main').contains('h1', 'One life. Many ways to create.').should('be.visible');
    cy.get('main').contains('a', 'Read my story').click();
    cy.location('pathname').should('eq', '/blog/about-the-founder.html');
    cy.document().then((doc) => {
      expect(doc.documentElement.scrollWidth).to.be.at.most(390);
    });
  });
});
