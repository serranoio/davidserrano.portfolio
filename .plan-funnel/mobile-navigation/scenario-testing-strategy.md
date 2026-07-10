# Scenario Testing Strategy — Skipped By User

## Status: skipped

The user explicitly waived a separate scenario-harness strategy document for this funnel. Verification is handled directly by Cypress at the e2e layer, with the contracts defined in `prd.md` § Testing Decisions.

## Harness In Use

- **Cypress** (`cypress/e2e/`), invoked with `bun run cy run` (headless) or `bun run cy open` (interactive).
- New spec: `cypress/e2e/mobile-scroll-flow.cy.ts` for the seamless-scroll PRD scenarios.
- Touch-pointer mode is selected per-spec by stubbing `matchMedia('(pointer: coarse)')` in `cy.visit({ onBeforeLoad })` — the product code reads `matchMedia` directly and adapts. No scenario IDs, no run IDs, no harness-only routes. The product contract stays product-first.
- Existing rose specs (`cypress/e2e/rose/*.cy.ts`) continue to run unmodified as the desktop-regression guard.

## Mapping (PRD scenario → spec block)

- US-1, US-2, US-3 → `mobile-scroll-flow.cy.ts` "swipe sequence advances through welcome → rose → writing".
- US-4, US-5 → `mobile-scroll-flow.cy.ts` "continue pill visibility + tap target".
- US-6 → `mobile-scroll-flow.cy.ts` "two-finger gesture orbits, does not scroll".
- US-7, US-8 → `mobile-scroll-flow.cy.ts` "single-tap petal opens; empty tap falls through".
- US-9 → `mobile-scroll-flow.cy.ts` "synthetic visualViewport resize preserves section heights".
- US-10 → existing `cypress/e2e/rose/*.cy.ts` (unmodified) at default desktop viewport.
- US-11 → `mobile-scroll-flow.cy.ts` "MediaQueryList change flips controls.touches.ONE".
- US-12 → `mobile-scroll-flow.cy.ts` "prefers-reduced-motion resolves scroll-behavior to auto".

## Manual Verification

For each PRD scenario the manual flow is the same:

1. `bun run dev` and open `http://localhost:<port>/` on a real iPhone or in Chrome devtools touch emulation.
2. Swipe vertically through `welcome → rose → writing`. Each section should land flush against the viewport top.
3. Tap a petal — section panel opens. Tap empty canvas — page scrolls.
4. Tap the "↓" pill on the rose — page advances to writing.
5. Pinch with two fingers on the rose canvas — camera orbits.
6. Show/hide the iOS URL bar by scrolling — no white gap appears.
7. Toggle "reduce motion" in OS accessibility — Continue pill no longer animates the scroll.

Forbidden states during manual review: a swipe that rotates the camera but leaves `scrollY` unchanged; a section that occupies less than the visual viewport; the Continue pill visible while the writing section is the snapped section.

Artifacts to inspect: Chrome devtools "Layout" panel for `100dvh` resolution; `__ROSE_TEST_API__.getRoseRotation()` console output before/after a swipe.
