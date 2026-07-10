# PRD — Seamless Mobile Scroll Through the Three Home Sections

## Problem Statement

On a touch device, a user opening `/` cannot reliably move between the three home sections — `welcome`, `rose`, `writing`. Today:

- **Current status: broken on touch.** Inside the `golden-rose` section, the Three.js OrbitControls instance bound to the full-viewport canvas captures single-finger touch and prevents native page scroll. A swipe rotates the camera instead of advancing the page. The wheel-driven scroll-hijack state machine in `golden-rose.ts` was only ever wired to `wheel` events, so it does not compensate on touch.
- **Current status: partially implemented.** Each home section uses `100vh`, which on iOS Safari resizes when the URL bar shows/hides, causing mid-swipe layout shifts and incomplete section coverage.
- **Current status: missing.** No scroll-snap, no in-page navigation, and no explicit "next section" affordance for touch users. The user has no path — gestural or otherwise — out of the rose section.

The site is currently unusable for vertical navigation on a phone. Visitors who reach the rose are trapped there.

## Solution

Make the three home sections — welcome, rose, writing — flow under a touch user's thumb the same way a native vertical feed does:

- Touch swipes pass through the rose canvas as normal page scroll, never as 3D camera orbit.
- Each section is exactly one dynamic-viewport tall, so the URL bar's appearance does not break the layout.
- A short flick from any section snaps cleanly to the next; the user does not have to land the swipe perfectly.
- A small "↓" affordance at the bottom of the rose offers an explicit tap-to-advance backup.
- Desktop input (mouse, wheel, two-finger trackpad) is untouched. The wheel-pinned truth-text scroll, paint-reveal headline, petal hover, and snap-to-rose all remain.
- Two-finger touch still orbits the rose, preserving the 3D affordance on tablets.

## User Scenarios

### US-1 — Touch swipe from welcome to rose

A visitor on an iPhone-class viewport (`(pointer: coarse)`, viewport ≤ 600 px wide) lands on `/`. The welcome section fills exactly one dynamic-viewport. The user single-finger-swipes upward. The page scrolls; the next swipe (or the same flick, if forceful enough) lands the rose section flush against the top of the viewport. No camera rotation occurs from this swipe.

**Verifiable via:** After the swipe sequence, `welcome-section`'s `getBoundingClientRect().top` is ≤ `-window.innerHeight + tolerance`; `golden-rose`'s `getBoundingClientRect().top` is within ±2 px of 0; `__ROSE_TEST_API__.getRoseRotation()` is unchanged from its load value.

### US-2 — Touch swipe through the rose into the writing section

From the rose section snapped at top, the user swipes upward again. The page scrolls past the rose. The writing section snaps flush against the top of the viewport. No rose camera rotation occurs from this swipe.

**Verifiable via:** After the swipe, `writing-section`'s `getBoundingClientRect().top` is within ±2 px of 0; `__ROSE_TEST_API__.getRoseRotation()` is unchanged.

### US-3 — Touch swipe back upward returns through the same three states

From writing, swipe down → rose snapped. From rose, swipe down → welcome snapped. The reverse path mirrors US-1/US-2 exactly.

**Verifiable via:** Reverse `scrollY` progression hits the writing → rose → welcome anchor positions in sequence.

### US-4 — Continue pill scrolls from rose to writing

The user on a touch viewport sees a small "↓" pill at the bottom of the rose section. Tapping it scrolls smoothly to the writing section.

**Verifiable via:** The pill is present and visible while the rose is the snapped section; tapping it causes `writing-section.getBoundingClientRect().top` to settle within ±2 px of 0.

### US-5 — Continue pill hides outside the rose section

On welcome, the pill is not visible. On writing (or scrolled past the rose), the pill is not visible.

**Verifiable via:** The pill is `display: none` (or has `visibility: hidden`) when the rose is not the active snapped section.

### US-6 — Two-finger touch still orbits the rose

The user places two fingers on the rose canvas and drags. The camera orbits the rose. Native scroll does not fire.

**Verifiable via:** `__ROSE_TEST_API__.getRoseRotation()` changes after the two-finger gesture; `window.scrollY` is unchanged.

### US-7 — Single-tap on an active petal opens its section (no regression)

The user single-taps a petal that maps to an active section (`about` or `poetry`). The bloom begins, the section panel becomes visible. No native scroll is triggered by the tap.

**Verifiable via:** `__ROSE_TEST_API__.getActiveSection()` becomes non-null; `__ROSE_TEST_API__.getState()` reaches `"open"`; the existing rose `mobile.cy.ts` suite still passes unmodified.

### US-8 — Single-tap that misses every petal falls through to native scroll

The user taps an empty area of the rose canvas (no petal hit). The bloom does not start. The tap does not block subsequent scroll.

**Verifiable via:** `__ROSE_TEST_API__.getState()` remains `"idle"`; an immediately-following swipe scrolls the page normally.

### US-9 — iOS Safari URL bar transitions do not break section heights

When the user scrolls and the URL bar collapses (or reappears), each section continues to fill exactly one dynamic-viewport. Snap targets remain correct; no white gap appears at the top or bottom of a section.

**Verifiable via:** After a programmatic `visualViewport.height` change, `getBoundingClientRect().height` of each home section equals the new visual viewport height (or natural content height for writing if larger).

### US-10 — Desktop wheel/scroll behavior is unchanged

A desktop user with a mouse wheel still experiences: the welcome paint reveal, the snap-to-rose-on-wheel, the pinned wheel-driven truth-text scroll inside the rose, the release into writing once the truth text saturates. No scroll-snap fights the wheel pin. Petal hover highlight works.

**Verifiable via:** Existing rose Cypress suites (`bloom`, `click`, `content`, `edge-cases`, `interaction`, `loading`, `truth-statement`) pass unmodified at desktop viewport. `__ROSE_TEST_API__` test surface is unchanged.

### US-11 — Pointer-type changes at runtime are respected

If the active pointer type changes (e.g. user attaches a mouse to an iPad mid-session, or detaches it), the touch-versus-desktop config is re-applied without a page reload: orbit controls and scroll-snap follow the new state.

**Verifiable via:** Synthetic `matchMedia('(pointer: coarse)')` change event flips `controls.touches.ONE` and toggles the snap behavior.

### US-12 — Reduced-motion preference is honored on touch

A user with `prefers-reduced-motion: reduce` on a touch device does not get smooth-scroll animations from the Continue pill — the jump is instant. Snap behavior remains (snap is a positioning rule, not an animation).

**Verifiable via:** With reduced motion, `scroll-behavior` resolves to `auto`; the snap still triggers.

## Implementation Decisions

- **Touch detection: `matchMedia('(pointer: coarse)')`** rather than user-agent sniffing or viewport-width heuristics. It is the standards-correct signal for "the primary pointing device is a finger". Re-evaluated on `change`.
- **Single-finger touch on the rose canvas: disabled.** Configured via `OrbitControls.touches.ONE = THREE.TOUCH.NONE` when coarse-pointer matches; restored to default when fine-pointer matches.
- **Two-finger touch: kept as orbit.** `controls.touches.TWO = THREE.TOUCH.ROTATE`.
- **Wheel-driven `scrollMode` state machine on touch: short-circuited.** `handleWheel` returns immediately when coarse-pointer matches. Truth-text fades on bloom as today; no pinned-scroll on touch.
- **Tap-to-open petal on touch: preserved.** The existing `touchstart` raycaster runs; it calls `preventDefault()` only when a petal is actually hit, so empty taps fall through to native scroll.
- **Section height unit: `100dvh`** with `@supports not (height: 100dvh) { 100vh }` fallback for the three home sections and the home wrapper.
- **Vertical scroll snap on touch: `scroll-snap-type: y mandatory`** on `<html>`, gated by a coarse-pointer media query. Each home section uses `scroll-snap-align: start`. Mandatory is chosen because the user explicitly asked for seamless transitions; proximity is the documented fallback if mandatory feels too aggressive in field testing.
- **Programmatic smooth-scroll: `html { scroll-behavior: smooth }`** under coarse-pointer, with `prefers-reduced-motion` override falling back to `auto`.
- **Continue pill:** Lives inside the rose component's shadow DOM, positioned bottom-center, only rendered when coarse-pointer matches. It is an `<a href="#writing">` so the browser does the smooth-scroll natively and the pill works without JS click handlers.
- **Section IDs:** `welcome`, `rose`, `writing` are added to the host elements of the home stack so `#writing` (and future deep-links) target the section roots.
- **Desktop behavior is gated by `(pointer: fine)` paths or by absence of the coarse-pointer overrides.** No new conditional logic in the wheel-snap state machine itself.
- **`visualViewport` listener** drives the renderer resize so URL-bar transitions on iOS reflow the canvas correctly.

## Testing Decisions

- **New Cypress spec: `cypress/e2e/mobile-scroll-flow.cy.ts`.** Runs at `iphone-x` viewport and stubs `matchMedia('(pointer: coarse)')` to return `matches: true` in `onBeforeLoad`. Covers US-1, US-2, US-3, US-4, US-5, US-7, US-8.
- **Gesture simulation:** Uses `cy.get(...).trigger('touchstart' | 'touchmove' | 'touchend', { touches: [...] })` against the rose canvas to assert `window.scrollY` advances and `__ROSE_TEST_API__.getRoseRotation()` does not.
- **Two-finger orbit (US-6):** Asserted by triggering a two-touch sequence and verifying the rose rotation API value changes while `scrollY` stays put.
- **Desktop regression (US-10):** Existing rose suites (`bloom.cy.ts`, `click.cy.ts`, `content.cy.ts`, `edge-cases.cy.ts`, `interaction.cy.ts`, `loading.cy.ts`, `mdx.cy.ts`, `truth-statement.cy.ts`, `raycast-click.cy.ts`) run unmodified and must continue to pass.
- **Existing `cypress/e2e/rose/mobile.cy.ts`** also runs unmodified — it asserts API contracts (`getPetalCount`, `getControlsConfig`, content-panel visibility) that this change does not break.
- **Reduced-motion (US-12):** Asserted by toggling `prefers-reduced-motion` via Cypress' `cy.visit({ onBeforeLoad: (win) => { win.matchMedia = ... } })` pattern and verifying scroll-behavior resolves to `auto`.
- **iOS-style viewport change (US-9):** Asserted by dispatching a synthetic `visualViewport` resize and checking that each section's `getBoundingClientRect().height` follows.
- **Pointer-type change at runtime (US-11):** Asserted by dispatching a synthetic `MediaQueryList` change event from `(pointer: coarse)` matching to not matching, and confirming `controls.touches.ONE` flips.

## Out Of Scope

- Rose content panel sizing on small viewports (bottom-sheet, drag handle, overflow polish).
- Petal discoverability on touch (no pulse, no first-load ripple, no extra affordance).
- Truth-text font sizing on narrow viewports.
- In-page navigation primitives beyond the single Continue pill (no sticky top nav, no section-aware mini-nav).
- Rspress `_nav.json` updates for blog routes (Home / Writing / Blog menu items).
- Music-player + attribution layout overlap (inspection confirmed they already do not overlap; not an issue).
- Welcome-section paint-reveal interaction with iOS URL bar — covered indirectly by `100dvh` but not specifically re-tested.
- Blog/docs routes (`/blog/*`) mobile audit — using Rspress defaults, untouched here.
- Removing or replacing the desktop wheel-pinned truth-text scroll.

Each of these is acknowledged as a follow-up and is queued for its own diagnosis.

## Further Notes

- The user explicitly narrowed scope to "seamless scrolling between the first section, the rose section, and the last section." This PRD respects that scope literally.
- The wheel state machine in `golden-rose.ts` is intentionally left desktop-only. Mobile gets none of its complexity — that is the simplification.
- All new behavior is gated on `(pointer: coarse)`. Anything not behind that gate is desktop behavior, and desktop behavior is unchanged.
- Two MDX sections (`about`, `poetry`) are currently the only active petals. Mobile users will reach them via tap-to-open; the bottom-sheet polish for those panels is queued as a follow-up.
- `scroll-snap-type: mandatory` is the chosen default. If field testing on real phones reveals that mandatory snap fights short reading gestures inside the rose section, the documented one-word fallback is `proximity`.
