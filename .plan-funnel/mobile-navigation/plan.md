# Plan — Seamless Mobile Scroll (welcome → rose → writing)

## Problem Summary

On touch devices, the `golden-rose` section's full-viewport Three.js canvas captures single-finger swipes via OrbitControls and prevents native page scroll. A user who reaches the rose cannot scroll to the writing section beneath it. Additionally, each home section uses `100vh`, which on iOS Safari shifts when the URL bar transitions, breaking section boundaries. There is no scroll-snap and no explicit "next" affordance.

**Current status (explicit):**
- Single-finger touch through the rose canvas: **broken** (user is trapped).
- Section heights on iOS: **partially implemented** (`100vh` shifts with URL bar).
- In-page navigation / advance affordance on touch: **missing**.
- Wheel-driven snap and pinned truth-text scroll on desktop: **implemented** and must remain unchanged.

## Goal And Non-Goals

**Goal:** A touch user can swipe seamlessly between welcome → rose → writing in both directions, with a tap-pill backup on the rose section. Desktop behavior is unchanged.

**Non-Goals (explicitly deferred to follow-up funnels):**
- Rose content panel sizing on small viewports.
- Petal discoverability on touch.
- Truth-text font sizing on narrow viewports.
- In-page navigation beyond the single Continue pill.
- Rspress `_nav.json` updates.
- Anything on `/blog/*` routes.
- Replacing or reshaping the desktop wheel-pinned truth-text scroll.

## Scenario Harness Contract

**Harness:** Cypress (existing). Invoked with `bun run cy run` headless and `bun run cy open` interactive.

**Touch mode is selected by stubbing `matchMedia('(pointer: coarse)')` in `cy.visit({ onBeforeLoad })`.** Product code reads `matchMedia` directly; the harness adapts to the product contract, not the other way around. No `scenario_id`, `run_id`, or scenario-only routes. The only route exercised is `/`.

**One new spec carries the mobile contract:**
`cypress/e2e/mobile-scroll-flow.cy.ts`. It covers PRD scenarios US-1 through US-9, US-11, and US-12.

**Required spec blocks (each maps to one PRD scenario):**

| Block | PRD scenario | Assertion shape |
|---|---|---|
| "single-finger swipe in rose canvas advances scrollY, no rotation" | US-1 (partial), US-2 (partial) | After `cy.trigger('touchstart' → 'touchmove' → 'touchend')` against the rose canvas, `window.scrollY` increases by a non-trivial delta AND `__ROSE_TEST_API__.getRoseRotation()` is unchanged from pre-swipe. Verifies the trap fix in isolation, independent of snap landing. |
| "swipe from welcome to rose lands rose at top" | US-1 | After synthetic touch swipe + spin the Cypress event loop, `golden-rose` `getBoundingClientRect().top` is within ±2 px of 0. Snap-dependent: see Verification Gaps. |
| "swipe from rose to writing lands writing at top" | US-2 | After swipe, `writing-section` `top` ≈ 0; rose rotation unchanged. Snap-dependent. |
| "reverse swipe sequence" | US-3 | Reverse `scrollY` progression hits writing → rose → welcome anchor positions. Snap-dependent. |
| "continue pill scrolls to writing" | US-4 | Pill visible while rose snapped; clicking the pill's `<a href="#writing">` lands writing at top. |
| "continue pill hidden outside rose" | US-5 | Pill `display: none` (or `visibility: hidden`) on welcome and on writing. |
| "two-finger touch orbits, does not scroll" | US-6 | Two-touch sequence: `getRoseRotation()` changes; `window.scrollY` unchanged. |
| "single tap on active petal opens section" | US-7 | Use `__ROSE_TEST_API__.clickPetalBySection('about')` rather than projected coords — see Risks. `getActiveSection()` becomes `'about'`; state reaches `'open'`. |
| "tap on empty canvas falls through to scroll" | US-8 | After tap at a canvas coord that the test API confirms does not hit a petal (`raycastAtCanvas(x,y)` returns `null`), state remains `idle`; immediately-following swipe advances `scrollY`. |
| "visualViewport resize preserves section heights" | US-9 | After overriding `window.visualViewport.height` and dispatching a `resize` on it, each section's `clientHeight` equals the new value (or natural content for writing if larger). Synthetic — see Verification Gaps. |
| "MediaQueryList change re-applies touch config" | US-11 | Dispatch synthetic `change` event on the stubbed `matchMedia('(pointer: coarse)')` `MediaQueryList` → `getControlsConfig()` (extended to also report `touches.ONE`) reflects the new state. |
| "prefers-reduced-motion resolves smooth scroll to auto" | US-12 | With reduced motion stubbed, `getComputedStyle(document.documentElement).scrollBehavior === 'auto'`; snap CSS rules still applied. |

**Desktop regression guard (US-10):** existing `cypress/e2e/rose/*.cy.ts` suites — `bloom`, `click`, `content`, `edge-cases`, `interaction`, `loading`, `mdx`, `truth-statement`, `raycast-click`, and `mobile` — all run unmodified. Existing `cypress/e2e/sections/case-studies-section.cy.ts`, `cypress/e2e/music-player.cy.ts`, and `cypress/e2e/smoke.cy.ts` also run unmodified.

A slice is complete only when its mapped harness blocks pass. No slice is "done" via manual inspection alone.

## Resolved Technology Decisions

Carried verbatim from `technology-decisions.md`:

- Touch signal: `matchMedia('(pointer: coarse)')`. No UA sniff, no width breakpoint.
- Rose orbit on touch: `controls.touches.ONE = THREE.TOUCH.NONE`; `controls.touches.TWO = THREE.TOUCH.ROTATE`.
- Wheel `scrollMode` state machine on touch: short-circuited in `handleWheel`.
- Section height: `100dvh` with `@supports not (height: 100dvh) { 100vh }` fallback.
- Snap: CSS `scroll-snap-type: y mandatory` on `<html>` (coarse-pointer only) + `scroll-snap-align: start` on each section host.
- Smooth scroll: `html { scroll-behavior: smooth }` under coarse pointer, with `prefers-reduced-motion` override.
- Continue pill: plain `<a href="#writing">`. No JS click handler required.
- Pointer-type reactivity: `MediaQueryList.addEventListener('change')` inside `golden-rose`.
- iOS URL-bar reflow: `visualViewport.resize` listener drives the renderer resize.

No material technology fork remains.

## Vertical Slices

Each slice is thin, user-visible, and verified only by the named harness blocks.

### Slice 1 — Stop the rose from eating touch

**User-visible result:** A touch user on `/` can swipe past the rose without the camera rotating. Native page scroll passes through the rose canvas.

**Scope:**
- In `golden-rose.ts`: at component init, set `controls.touches.ONE` based on `matchMedia('(pointer: coarse)').matches`. Subscribe to that media-query's `change` event and re-apply.
- In `golden-rose.ts`: early-return at the top of `handleWheel` when the coarse-pointer media query matches.
- Keep `controls.touches.TWO = THREE.TOUCH.ROTATE` always.
- Existing tap-to-open petal logic stays. Existing wheel state machine stays for desktop.

**PRD scenarios covered:** US-1 (partial — the trap-fix half, but not snap landing), US-2 (partial), US-6, US-7, US-8, US-11.

**Harness blocks that must pass:** "single-finger swipe in rose canvas advances scrollY, no rotation"; "two-finger touch orbits, does not scroll"; "single tap on active petal opens section"; "tap on empty canvas falls through to scroll"; "MediaQueryList change re-applies touch config".

**Desktop guard:** all rose specs must continue to pass unmodified.

### Slice 2 — Dynamic-viewport sections + scroll snap

**User-visible result:** Each of the three home sections fills exactly one dynamic-viewport. A short touch flick lands the next section flush at the top. iOS URL-bar transitions no longer cause white gaps.

**Scope:**
- Replace `100vh` with `100dvh` (with `@supports not (height: 100dvh) { 100vh }` fallback) in `welcome-section.styles.ts`, `golden-rose.styles.ts`, `writing-section.styles.ts`, and the React home wrapper in `theme/index.tsx`.
- Add `scroll-snap-align: start` to each section's `:host` block.
- Inject a small global stylesheet from `theme/index.tsx` (or append into the home wrapper) that, scoped to `@media (pointer: coarse)`, applies `scroll-snap-type: y mandatory` and `scroll-behavior: smooth` to `<html>`, with `prefers-reduced-motion: reduce` resetting `scroll-behavior` to `auto`.
- In `golden-rose.ts`: also subscribe to `visualViewport.resize` and invoke the existing `handleResize` so the canvas tracks URL-bar transitions.

**PRD scenarios covered:** US-1, US-2, US-3, US-9, US-12.

**Harness blocks that must pass:** the four swipe-sequence blocks; the visualViewport-resize block; the reduced-motion block.

### Slice 3 — Continue pill + section IDs

**User-visible result:** Touch users see a "↓" pill at the bottom of the rose section. Tapping it scrolls smoothly to the writing section. The pill disappears on welcome and on writing.

**Scope:**
- Add `id="welcome"`, `id="rose"`, `id="writing"` to the home stack so `#writing` is a valid anchor target. IDs go on the host wrappers in `theme/index.tsx` (or as element attributes that surface through to the host).
- Add a small pill element inside the `golden-rose` shadow DOM: an `<a href="#writing">` styled as a pill, anchored bottom-center, visible only when `@media (pointer: coarse)` matches.
- Hide the pill once the rose is no longer the snapped section. Cheapest mechanism: a single `IntersectionObserver` inside `golden-rose` observes its own host element and toggles a class on the pill when the host's intersection ratio drops below ~0.5 (use `threshold: [0.5]`, `rootMargin: '0px'`). Avoids a `:has(...)` CSS-only approach for cross-browser safety.

**PRD scenarios covered:** US-4, US-5.

**Harness blocks that must pass:** "continue pill scrolls to writing"; "continue pill hidden outside rose".

### Slice 4 — Mobile-scroll Cypress spec

**User-visible result:** `bun run cy run` exercises all touch-mode flows and prevents future regression of slices 1–3.

**Scope:**
- New file `cypress/e2e/mobile-scroll-flow.cy.ts` at `cy.viewport('iphone-x')`. `cy.visit('/', { onBeforeLoad: (win) => { /* stub matchMedia */ } })` returns `matches: true` for `(pointer: coarse)` and `matches: false` for `(prefers-reduced-motion: reduce)` (a separate block flips the latter).
- All harness blocks listed above are spec blocks in this file.
- Synthesize touch swipes by chaining `cy.get(canvas).trigger('touchstart', { touches: [{ clientX, clientY }] })` → `touchmove` (with reduced clientY) → `touchend`. Wait for `scroll` events between phases.
- Synthesize two-finger gestures with `touches: [{...}, {...}]`.
- Use `__ROSE_TEST_API__.getRoseRotation()` to assert non-rotation; use `window.scrollY` and `getBoundingClientRect()` for snap assertions.
- For US-11, dispatch a synthetic `change` event on the stubbed `MediaQueryList` returned from `matchMedia('(pointer: coarse)')` and assert `getControlsConfig()` reflects the new state (will require minor extension of the test API — see Risks).

**PRD scenarios covered:** all of US-1–US-9, US-11, US-12 (US-10 covered by the unmodified rose specs).

**Harness blocks that must pass:** all of them.

## Slice Order And Dependencies

1. **Slice 1** (unblock touch input) → 2. **Slice 2** (snap + dvh) → 3. **Slice 3** (Continue pill) → 4. **Slice 4** (spec).

- Slice 1 must come first: snap rules in Slice 2 cannot be verified by hand on a touch device while the canvas still swallows swipes.
- Slice 2 depends on Slice 1: the swipe-sequence assertions need a passable canvas.
- Slice 3 depends on Slice 2: the pill targets `#writing`; the snap behaviour gives the pill its final landing UX.
- Slice 4 can begin scaffolding in parallel with Slice 1 (the file shell and `onBeforeLoad` stubs are independent), but its blocks cannot pass until 1–3 land.

## Parallelizable Work

- Slice 4's spec scaffolding (file, viewport, `matchMedia` stub helper, swipe utility) is mostly independent and can be drafted alongside Slice 1.
- Within Slice 2, the `100dvh` substitution is a mechanical search/replace across the three styles files and is independent of the snap rules — a second agent could handle it.
- The plan is still written for one primary agent to execute end-to-end in slice order. Parallelism is opportunistic, not required.

## Verification Gaps (Cypress harness honesty)

The Cypress harness is the only automated verification. It has real limits that the slice-completion criteria above silently rely on. Stated directly:

- **`cy.trigger('touchstart' | 'touchmove' | 'touchend', ...)` does not perfectly replicate iOS Safari touch dispatch.** OrbitControls attaches its touch listeners with `{ passive: false }` and calls `preventDefault()`. Cypress synthetic events fire the listener, but they do not exercise the browser's passive-listener compositor handoff. A green Cypress run means *the product code path is correct*; it does not prove *the iOS browser will honor the path identically*.
- **`window.scrollY` advances in Cypress can bypass native scroll-snap.** Headless Chrome supports `scroll-snap-type: y mandatory`, but Cypress' touch synthesis does not produce the kinetic scroll signal that drives snap. The "lands at top ±2 px" assertions are written as `getBoundingClientRect()` checks after the swipe and an event-loop tick, and rely on the synthesized scroll being large enough to cross the snap threshold. If snap behavior changes in a future Chrome, the assertion can pass without snap actually being the mechanism that landed it.
- **Synthetic `visualViewport.resize` is not a real iOS URL-bar transition.** The spec sets `visualViewport.height` and dispatches `resize`. iOS may also resize `window.innerHeight`, change layout viewport units, and emit a different event ordering. Pass = product responds to the resize event correctly; not = iOS Safari behaves correctly end-to-end.
- **`prefers-reduced-motion` stub is a `matchMedia` answer change.** It does not exercise OS-level reduced-motion processing.

**Required manual-device gate before declaring the plan delivered:**

On a real iPhone (or iOS Simulator with Safari) and one Android Chrome device, manually verify US-1, US-2, US-3, US-4, US-9 against `bun run dev` over the LAN. Record device + iOS/Android version in the PR description. A green Cypress run alone is **not** sufficient to close this plan.

## Risks And Failure Modes

- **`scroll-snap-type: mandatory` fights short reading gestures inside the rose.** Mitigation: documented fallback to `proximity` is a one-word change.
- **`MediaQueryList.addEventListener('change')` not firing in Cypress.** Mitigation: the spec calls a dispatcher directly on the stubbed `MediaQueryList` object. If the stub does not propagate the change to the product's installed listener, extend `__ROSE_TEST_API__.getControlsConfig()` to return `touches.ONE` so the assertion reads product state directly. Only if even that route fails, expose a tiny test-only hook on `__ROSE_TEST_API__` (e.g. `__forceCoarsePointer(boolean)`) — a minimal extension that does not change product contract and is not a scenario ID.
- **iOS Safari `visualViewport.resize` doubles with `window.resize`.** Mitigation: debounce or guard against re-entrancy in `handleResize`.
- **`scroll-snap` interacting badly with the existing desktop wheel-snap state machine on hybrid pointer devices** (e.g. touchscreen laptops). Mitigation: snap rules are gated on `@media (pointer: coarse)` only. On `fine` pointer, no snap rule exists; the wheel state machine continues to own snap.
- **Two-finger gesture simulation in Cypress can flake** if `touches[]` ordering is off. Mitigation: use the documented Cypress `touches` array pattern and assert via API state changes rather than DOM snapshots.
- **`@supports not (height: 100dvh)` fallback regresses to broken iOS behavior on very old Safari.** Acceptable — those users were broken before too. Document the supported floor (iOS Safari ≥ 15.4 for `dvh`).
- **Petal raycast misses on small viewports when the camera and projection math overshoot.** Out of scope for this plan (covered by deferred petal-discoverability follow-up), but if the new spec reveals it, the spec asserts via `clickPetalBySection`, not screen coordinates — same approach as existing `rose/mobile.cy.ts`. Note: US-7 spec block must use `clickPetalBySection` rather than projected coordinates to avoid this risk.

## Execution Notes

- Do not start coding until slice order is confirmed.
- Every slice's harness blocks must pass before moving to the next; do not stack work on top of a red spec.
- Do not soften wording in commit messages or follow-up artifacts. If something is broken at the end of a slice, say "broken" — not "needs more rigor".
- The desktop suites are the blast-radius canary. If any rose desktop spec turns red after a slice, stop and root-cause before continuing.
- Product code must keep reading `matchMedia` directly. Do not introduce a scenario-id-aware code path, a `__test_mode__` flag, or any harness-specific identifier into product files. The only harness-only seam permitted is the optional `__forceCoarsePointer` test API mentioned under Risks, and only if `MediaQueryList` `change` events prove unfirable in Cypress; if they fire, do not add the seam.
- **Manual-device gate is mandatory before merge.** See Verification Gaps. Cypress green is necessary but not sufficient.
- When the user moves to implementation, hand off to `initialize-work` → `build-feature` against this plan.
