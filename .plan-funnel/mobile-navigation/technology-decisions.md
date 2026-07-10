# Technology Decisions

## Outcome: No material technology fork

All implementation primitives are already pinned by the existing codebase (Lit + Rspress + Three.js + Cypress) and locked by the PRD's Implementation Decisions section. There is no architectural fork that materially changes the shape of the work. This document records that conclusion explicitly per the funnel rules.

## Resolved (carried forward from PRD)

| # | Decision | Choice | Why |
|---|---|---|---|
| 1 | Touch detection mechanism | `matchMedia('(pointer: coarse)')` evaluated at component init and on `change` | Standards-correct signal; correctly distinguishes finger from mouse on tablets and convertibles. |
| 2 | Disabling single-finger rose orbit on touch | `OrbitControls.touches.ONE = THREE.TOUCH.NONE` | Native API on the existing OrbitControls instance; zero new dependencies. |
| 3 | Two-finger orbit on touch | `OrbitControls.touches.TWO = THREE.TOUCH.ROTATE` | Same API; preserves the tablet 3D affordance. |
| 4 | Section height unit | `100dvh` with `@supports not (height: 100dvh) { 100vh }` fallback | Solves iOS Safari URL-bar resize without JS. Universally supported in browsers ≥ 2022. |
| 5 | Section snapping mechanism | CSS `scroll-snap-type: y mandatory` on `<html>` (coarse-pointer only), `scroll-snap-align: start` on each section host | Zero JS, declarative, plays well with native momentum. |
| 6 | Programmatic smooth scroll | `html { scroll-behavior: smooth }` under coarse pointer, with `prefers-reduced-motion` override to `auto` | Native, free. |
| 7 | Continue pill navigation | Plain `<a href="#writing">` rather than JS click handler | Browser handles the smooth-scroll via #2 + #6; works without JS. |
| 8 | Pointer-type change reactivity | Lit-managed `MediaQueryList.addEventListener('change')` inside `golden-rose` | Stays inside the existing element lifecycle. |
| 9 | Renderer resize on iOS URL-bar transitions | Listen to `visualViewport.resize` in addition to `window.resize` | The only reliable signal on iOS Safari. |
| 10 | Test framework | Cypress (existing) — no Playwright migration | Reuse the existing test infrastructure; matches the rest of the suite. |
| 11 | Touch gesture simulation in tests | Cypress `cy.get(...).trigger('touchstart' / 'touchmove' / 'touchend', ...)` | Driver-level event injection; reliably triggers OrbitControls' real listeners. |
| 12 | Coarse-pointer signal in tests | Stub `matchMedia` in `cy.visit({ onBeforeLoad })` | Headless Chrome reports `pointer: fine` by default; this is the standard stub pattern. |

## Decisions explicitly rejected

- **User-agent sniffing.** Brittle; misses convertibles and pointer-type changes mid-session.
- **Viewport-width breakpoint as the touch signal.** Conflates "small screen" with "touch screen" — a touch laptop or a Surface would be classified incorrectly.
- **Custom touch-driven scroll-hijack state machine.** Would re-implement what the OS already does. Adds a tuning surface (gesture classification, dominant-axis heuristics) for no user-visible benefit beyond native scroll.
- **Replacing Three.js OrbitControls with a custom controller.** Out of proportion to the fix; OrbitControls' touch config is a one-property change.
- **Sticky top nav / in-page mini-nav.** Three sections does not warrant the surface. The Continue pill is the entire safety net.

## Production / harness boundary

- Production code reads `matchMedia('(pointer: coarse)')` directly. There are no scenario IDs, run IDs, or harness query params anywhere in the product contract.
- The harness (Cypress) seeds the coarse-pointer signal by stubbing `matchMedia` in `onBeforeLoad`. The product code path is identical to a real touch device.
- No scenario-only routes are introduced. The harness exercises `/` only.

## Open question carried forward

- `scroll-snap-type: y mandatory` vs. `proximity`. Mandatory is chosen. Proximity is a one-word fallback if real-device testing reveals that mandatory snap fights short reading gestures within the rose section.
