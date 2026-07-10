# Diagnosis — Mobile users can't scroll past the golden-rose section

**Triage** (the prompt "make the entire site navigable on mobile" is broad; ranked impact below):

1. **Rose canvas swallows single-finger touch → user is trapped in the rose section.** ← diagnosed below. Without this fix, no other mobile work matters because users cannot reach the sections beneath the rose at all.
2. No persistent in-page nav / section jump on mobile — out of scope, separate diagnosis.
3. Rose content panel (`#content-root`) max-height + padding cramps long sections on small viewports — out of scope, separate diagnosis.
4. Petals lack hover affordance on touch; discoverability of which petals are active is unclear — out of scope, separate diagnosis.
5. Truth-statement Troika text sizing not tuned for narrow viewports — out of scope, separate diagnosis.
6. Music-player button + rose attribution overlap on small screens (both bottom-right) — out of scope, separate diagnosis.
7. Welcome-section paint reveal driven by `getBoundingClientRect().top` may misbehave when iOS Safari's URL bar resizes the viewport — out of scope, separate diagnosis.
8. Rspress top nav has only "Blog"; no link back home from blog routes on mobile menu — out of scope, separate diagnosis.

**Problem:** On a touch device, a single-finger swipe inside the golden-rose section orbits the 3D camera instead of scrolling the page, so users cannot reach the writing section (or anything below) without leaving and re-entering the page.

**Scope of this diagnosis:**

- In: `theme/components/golden-rose.ts` (OrbitControls + canvas touch handlers + `handleWheel` scroll-hijack state machine), and the implicit contract that the home page is a vertically-scrollable stack of full-viewport sections.
- Out: every item under Triage #2–#8. Those need their own diagnoses once #1 is fixed and the rest of the page is reachable.

**Assumptions:**

- The target mobile baseline is iOS Safari and Android Chrome on phones at viewport widths ≥ 320 px. The existing Cypress mobile spec already pins iphone-x and iPad as supported viewports.
- "Navigable" means: the user can reach every home section by swiping, can open a petal section by tapping, can dismiss it, and can scroll on to the writing section and the blog.
- The 3D orbit interaction is a marquee desktop affordance, not a load-bearing mobile interaction. Tap-to-open petals is the primary mobile interaction with the rose.
- Three.js / OrbitControls behavior is unchanged from the version pinned in `bun.lock`: single-finger touch defaults to `TOUCH.ROTATE` and calls `preventDefault()` on touchstart/touchmove against the bound DOM element.
- The wheel-driven `scrollMode` state machine (`free → snapping → pinned → released-*`) was deliberately designed for trackpad/mouse-wheel input only; touch was never wired into it.

**Constraints:**

- Cannot regress the existing desktop interactions: paint-reveal headline, scroll-snap onto the rose, wheel-driven truth-text scroll, petal hover highlight, tap/click to open a section, music-player persistence across routes.
- Cannot break the existing Cypress test surface: `__ROSE_TEST_API__` shape, `getControlsConfig()` returns `{ minDistance: 1.4, maxDistance: 8, enablePan: false }`, `mobile.cy.ts` expects `clickPetalBySection('about')` to open the panel.
- Must preserve the Rspress shadow-DOM-friendly architecture (no global CSS leaking into the rose element).
- Must not introduce a separate React/Lit mobile component tree — the same component must adapt.
- Cannot rely on `pointer-events: none` on the canvas, because tap-to-open petals must still work.

**Unknowns:**

- Whether the user wants single-finger orbit preserved at all on mobile, or whether tap-only petal interaction is acceptable. *Insufficient evidence — answer should come from the grilling stage.*
- Whether iOS Safari URL-bar resize interacts with the existing `100vh` sections (likely, but unverified). *Insufficient evidence.*
- Whether the existing `mobile.cy.ts` spec ever exercised a real swipe gesture, or only direct test-API calls. (Reading the spec: it only calls `clickPetalBySection`. The actual swipe-trap bug is not covered by tests.) *Confirmed gap.*
- Exact OrbitControls version in `bun.lock` — touch defaults haven't changed in three.js >=0.130 but worth a one-line confirmation before implementation.

**Root cause:**

The `OrbitControls` instance is constructed bound to the canvas at `theme/components/golden-rose.ts:345` with default touch bindings (`controls.touches.ONE = TOUCH.ROTATE`) and the controls call `preventDefault()` on touch events. The canvas is sized to `width: 100vw; height: 100vh` (`golden-rose.styles.ts:5–17`). The page's native scroll cannot fire while a finger is moving over those 100 vh. The compensating wheel-based `scrollMode` state machine (`golden-rose.ts:388–463`) only listens to `wheel` events; touch deltas are never fed into it. So on touch devices there is no path — native or compensating — by which the user can scroll past the rose. The site silently traps them.

**Solution options** (each a different approach to the same root cause):

- **Option A — Disable single-finger orbit on touch; let native scroll take over.** Set `controls.touches.ONE = THREE.TOUCH.NONE` on touch-capable devices (or unconditionally — single-finger orbit is non-essential on mobile). Keep two-finger orbit if desired (`controls.touches.TWO = THREE.TOUCH.ROTATE`). Petals stay tap-to-open via the existing `touchstart` handler.
  - Current cost: 100% of the rose section's 100 vh × 100 vw swallows single-finger swipe. Sections below are unreachable by native gesture.
  - Proposed cost: 0% swallowed by single-finger swipe. Native page scroll passes through the canvas region.
  - Worked example: a 4-section home page (welcome / rose / writing / footer-ish) is gated behind the rose. Before: 1 of 4 sections reachable on touch (25%). After: 4 of 4 (100%). **75 pp reachability gain.**
  - Tradeoff: loses the "single-finger drag spins the rose" affordance on mobile. The rose still spins via its `idleSpin` rotation and the tap-to-bloom interaction is unaffected.

- **Option B — Build a touch-aware scroll-hijack that mirrors the wheel state machine.** Extend `handleTouchStart`/`handleTouchMove` to compute vertical touch delta, feed it into the same `scrollMode` machine, classify gesture intent (vertical scroll vs horizontal orbit) by dominant axis or finger count, and either call `window.scrollBy` (free) or `preventDefault` + drive `roseText.scrollBy` (pinned).
  - Current cost: 100% trap as above; zero touch-aware logic exists.
  - Proposed cost: 0% trap if classification works; non-zero misclassification rate (estimated 5–15 % of gestures will feel "wrong" until thresholds are tuned).
  - Worked example: same 4-section page. Before: 25% reachability. After ideal: 100% reachability + truth-text scroll-pin on mobile parity with desktop. After realistic first cut: ~85–95% reachability while users adapt to the gesture vocabulary. **60–75 pp gain.**
  - Tradeoff: significant complexity. The pinned mode requires `preventDefault` on touchmove, which on iOS Safari requires a non-passive listener attached before the gesture starts and breaks browser scroll smoothness. High risk of subtle bugs.

- **Option C — Branch the rose section into a distinct mobile layout: static rose, no OrbitControls, explicit nav controls.** Below a breakpoint (e.g. `(pointer: coarse)` or `max-width: 768px`), do not instantiate OrbitControls. Render the rose with `idleSpin` only. Replace the wheel-pinned truth-text with a "Read the statement" sheet that opens on tap. Add an explicit "↓ Continue" affordance that scrolls to the writing section.
  - Current cost: 100% trap; no mobile-specific UX exists.
  - Proposed cost: 0% trap (no canvas touch capture at all).
  - Worked example: 4 sections — before 25% reachability, after 100% + clearer mobile navigation primitives. **75 pp gain plus discoverability improvement** (Triage items 2, 3, 5 partially absorbed).
  - Tradeoff: introduces a second UX surface for the rose. Two code paths to maintain (orbit-on vs orbit-off), two scroll behaviours, two ways the truth statement appears. Larger blast radius and review surface.

**Recommendation:** Option A. Smallest blast radius, restores reachability immediately, no new state machine, and leaves the door open to layer Option C-style polish in a follow-up diagnosis once the basic trap is gone. The lost affordance (single-finger drag to spin the rose on mobile) is the cheapest thing in the budget — the rose already auto-rotates idle and the petals remain tap-interactive.

---

## Grilling outcome — narrowed scope (confirmed)

User refined the goal: **the entire scope is seamless swipe-scrolling between the three home sections (welcome → rose → writing) on touch devices.** All other queued triage items (#3–#8 above) are explicitly deferred to follow-up diagnoses. The diagnosis below stands; the resolved decision tree the funnel will carry into the PRD is:

### A. Stop the rose section from eating touch
1. Disable single-finger orbit when `matchMedia('(pointer: coarse)').matches` — `controls.touches.ONE = THREE.TOUCH.NONE`.
2. Keep two-finger orbit (`controls.touches.TWO = THREE.TOUCH.ROTATE`).
3. Short-circuit `handleWheel` on touch devices — no snap, no pin. Truth text just fades on bloom as today.
4. Keep tap-to-open petal; `preventDefault()` only when a petal is hit.

### B. Make each section a clean swipe target
1. `100vh` → `100dvh` with `@supports not (height: 100dvh) { 100vh }` fallback in `welcome-section.styles.ts`, `golden-rose.styles.ts`, `writing-section.styles.ts`, and the home wrapper in `theme/index.tsx`.
2. Apply `scroll-snap-type: y mandatory` to `<html>` only under `(pointer: coarse)`, with `scroll-snap-align: start` on each section `:host`.
3. Writing section: `min-height: 100dvh`; internal content can grow past the snap line.
4. `html { scroll-behavior: smooth }` under `(pointer: coarse)`.

### C. Safety net
1. "↓" pill at the bottom of the rose section, visible only on `(pointer: coarse)`, scrolls to `writing-section`.
2. Add `id="welcome"`, `id="rose"`, `id="writing"` on the home stack.
3. Pill hides once the rose is no longer the snapped section.

### D. Tests
1. New `cypress/e2e/mobile-scroll-flow.cy.ts` at iphone-x: simulated touch-swipe lands on welcome → rose → writing in sequence; tap the pill from rose → writing top ≈ 0.
2. `onBeforeLoad` stubs `matchMedia('(pointer: coarse)')` to return `matches: true`.

### Open question carried into the PRD
Scroll-snap on mobile: **mandatory** (chosen — matches "seamless transitions") vs. `proximity` (one-word follow-up if mandatory feels too pushy in practice).

**Explicit deferrals** (out of scope for this plan, queued for follow-up diagnoses): rose content panel sizing on small viewports, petal discoverability on touch, in-page section nav beyond the Continue pill, truth-text font sizing on narrow viewports, Rspress blog/docs nav additions, music-player + attribution overlap (already a non-issue on inspection).
