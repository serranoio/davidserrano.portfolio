# Rspress website

## Setup

Install the dependencies:

```bash
npm install
```

## Get started

Start the dev server:

```bash
npm run dev
```

Build the website for production:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Portfolio content

- The homepage introduction lives in `theme/components/welcome-section.ts`.
- Engineering, Writing, and About have entry pages in `docs/` and layouts in
  `theme/components/portfolio-pages.tsx`.
- Add experience, a résumé URL, and a contact URL in
  `theme/engineering-profile.ts`. Unfilled fields stay hidden. Add future
  project case studies when there is real work to feature.
- The writing collection and blog sidebar use `theme/blog-posts.ts` to read
  titles and tags from `docs/blog/`. Routes follow filenames. Rebuild (or restart
  the dev server) after changing the collection's metadata.

Run the navigation and rose scrolling checks with:

```bash
npx cypress run --spec cypress/e2e/portfolio-navigation.cy.ts,cypress/e2e/desktop-scroll-flow.cy.ts,cypress/e2e/mobile-scroll-flow.cy.ts
```
