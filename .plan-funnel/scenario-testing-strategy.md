# Scenario Testing Strategy: 3D Golden Rose Navigation

## Overview

This document maps PRD user scenarios to executable E2E tests using Cypress. The 3D nature of the rose requires special testing considerations for WebGL canvas interactions.

## Harness Contract

### CLI Commands

```bash
# Run all rose scenarios
bun run test:e2e

# Run specific scenario group
bun run cy:run --spec "cypress/e2e/rose/*.cy.ts"

# Open Cypress UI for development
bun run cy:open
```

### Test File Structure

```
cypress/
  e2e/
    rose/
      loading.cy.ts       # US-1, US-2, US-3
      exploration.cy.ts   # US-4, US-5, US-6
      content.cy.ts       # US-7, US-8, US-9, US-10, US-11
      edge-cases.cy.ts    # US-12, US-13, US-14, US-15
    smoke.cy.ts           # Existing smoke test
```

## Scenario Mappings

### Loading & Initial View

#### E2E-1: Rose renders on desktop (US-1)

**Automated Test:**
```
- Visit homepage at desktop viewport (1280x720)
- Wait for loading shimmer to appear
- Wait for canvas[data-testid="rose-canvas"] to exist
- Assert rose mesh is rendered (check for WebGL context)
- Assert 3 petals have data-active="true" attribute
```

**Manual Verification:**
- Run: `bun run dev`, open http://localhost:3001
- Expected: Gold shimmer appears, then 3D rose fades in
- Expected: Rose is angled ~30°, can see "into" it
- Expected: 3 petals have visible etched symbols
- Forbidden: Blank screen, console errors, broken geometry

#### E2E-2: Rose renders on mobile (US-2)

**Automated Test:**
```
- Visit homepage at mobile viewport (375x667)
- Same assertions as E2E-1
- Assert rose fits within viewport
- Assert touch targets are >= 44px
```

**Manual Verification:**
- Run: `bun run dev`, open on real mobile device or DevTools mobile emulation
- Expected: Rose renders at appropriate scale
- Expected: Petals are tappable without precision
- Forbidden: Rose overflows viewport, petals too small to tap

#### E2E-3: Loading state displays (US-3)

**Automated Test:**
```
- Throttle network to slow 3G
- Visit homepage
- Assert loading shimmer element exists
- Assert shimmer has gold color (check computed style)
- Wait for rose canvas
- Assert shimmer is removed
```

**Manual Verification:**
- Run with slow network throttling
- Expected: Gold shimmer pulses while loading
- Expected: Smooth transition to rose (no flash/jump)
- Forbidden: White flash, jarring pop-in

---

### Exploration

#### E2E-4: Pan/rotate on desktop (US-4)

**Automated Test:**
```
- Visit homepage, wait for rose
- Get initial rose rotation (query Three.js state or data attribute)
- Simulate mouse drag: mousedown at center, move 100px right, mouseup
- Assert rose rotation changed
- Assert rotation is bounded (check rotation limits)
```

**Manual Verification:**
- Run dev server, drag on empty space around rose
- Expected: Rose rotates smoothly following cursor
- Expected: Rotation has momentum/inertia
- Expected: Cannot flip rose completely upside down
- Forbidden: Jerky movement, unlimited rotation

#### E2E-5: Pan/rotate on mobile (US-5)

**Automated Test:**
```
- Visit homepage at mobile viewport
- Simulate touch drag
- Assert rose rotation changed
- Simulate pinch gesture
- Assert no zoom occurred (viewport scale unchanged)
```

**Manual Verification:**
- Open on real touch device, drag with finger
- Expected: Rotation feels natural
- Expected: Pinch does nothing (no zoom)
- Forbidden: Accidental zoom, unresponsive touch

#### E2E-6: Identify clickable petals (US-6)

**Automated Test:**
```
- Visit homepage, wait for rose
- Query petals with data-active="true"
- Assert count === 3
- For each active petal, assert etched symbol element exists
- Hover over active petal
- Assert glow effect applied (check class or style)
- Hover over inactive petal
- Assert no glow effect
```

**Manual Verification:**
- Look at rose at rest
- Expected: 3 petals have subtle etched symbols visible
- Hover over active petal
- Expected: Soft golden glow appears
- Hover over inactive petal
- Expected: No visual change
- Forbidden: All petals look the same, symbols too prominent

---

### Content Interaction

#### E2E-7: Open About Me on desktop (US-7)

**Automated Test:**
```
- Visit homepage, wait for rose
- Find About petal (data-section="about")
- Hover, assert glow
- Click petal
- Wait for bloom animation (check animation state or wait fixed time)
- Assert content panel visible
- Assert content contains "About" text (from MDX)
- Assert content is scrollable if overflow
```

**Manual Verification:**
- Click About petal
- Expected: Rose blooms outward (~0.5-0.8s)
- Expected: Other petals recede
- Expected: About petal moves to center and expands
- Expected: About MDX content fades in inside rose
- Forbidden: Janky animation, content outside rose, unreadable text

#### E2E-8: Open Case Studies on mobile (US-8)

**Automated Test:**
```
- Visit homepage at mobile viewport
- Tap Case Studies petal
- Assert bloom animation completes
- Assert content panel visible
- Assert content is touch-scrollable
- Scroll content, assert scroll position changes
```

**Manual Verification:**
- Tap Case Studies petal on mobile
- Expected: Same bloom animation
- Expected: Content fits mobile viewport
- Expected: Can scroll content with finger
- Forbidden: Content cut off, can't scroll

#### E2E-9: Open Poetry (US-9)

**Automated Test:**
```
- Same pattern as E2E-7/E2E-8
- Assert Poetry content loads
```

#### E2E-10: Close content view (US-10)

**Automated Test:**
```
- Open any section (use E2E-7 setup)
- Click outside content area (on background or rose body)
- Wait for close animation
- Assert content panel hidden
- Assert rose returned to initial state
- Assert previously active petal back in position
```

**Manual Verification:**
- With content open, click outside
- Expected: Reverse bloom animation (~0.4s)
- Expected: Rose returns to resting state
- Forbidden: Content stuck, broken rose state

#### E2E-11: Switch sections directly (US-11)

**Automated Test:**
```
- Open About section
- Click Case Studies petal (visible but receded)
- Assert About content fades out
- Assert bloom transitions to Case Studies
- Assert Case Studies content fades in
- Assert no intermediate "closed" state
```

**Manual Verification:**
- With About open, click Case Studies petal
- Expected: Smooth transition between sections
- Expected: No need to close first
- Forbidden: Flash to closed state, janky transition

---

### Edge Cases

#### E2E-12: Click non-active petal (US-12)

**Automated Test:**
```
- Visit homepage, wait for rose
- Find petal without data-active attribute
- Click it
- Assert no content panel appears
- Assert rose state unchanged
- Assert no console errors
```

**Manual Verification:**
- Click a decorative petal
- Expected: Nothing happens
- Forbidden: Error, unexpected behavior

#### E2E-13: Rapid clicks (US-13)

**Automated Test:**
```
- Visit homepage, wait for rose
- Click About petal
- Immediately click Case Studies petal (within 100ms)
- Wait for animations to settle
- Assert final state is valid (either About or Case Studies open, not broken)
- Assert no console errors
```

**Manual Verification:**
- Rapidly click multiple petals
- Expected: Either queues action or ignores during animation
- Forbidden: Broken state, multiple panels, crash

#### E2E-14: Resize browser (US-14)

**Automated Test:**
```
- Visit homepage, wait for rose
- Open content
- Resize viewport from 1280x720 to 800x600
- Assert rose still visible
- Assert content still readable
- Assert no layout breaks
```

**Manual Verification:**
- Resize browser while interacting
- Expected: Responsive adaptation
- Forbidden: Layout breaks, content overflow

#### E2E-15: Scroll content (US-15)

**Automated Test:**
```
- Open section with long content (ensure MDX has enough text)
- Scroll within content area
- Assert content scroll position changed
- Assert rose rotation unchanged
- Assert scroll contained to content area
```

**Manual Verification:**
- Open section, scroll content
- Expected: Content scrolls, rose stays still
- Forbidden: Rose rotates while scrolling content

---

## Testing Challenges & Mitigations

### WebGL Canvas Interaction

**Challenge:** Cypress cannot directly query Three.js scene objects.

**Mitigation:**
- Expose test hooks via `data-*` attributes on DOM elements that mirror 3D state
- Use `window.__ROSE_TEST_API__` for direct scene queries in tests
- Fall back to screenshot comparison for visual verification

### Animation Timing

**Challenge:** Animations make assertions timing-dependent.

**Mitigation:**
- Use `cy.wait()` with animation duration constants
- Expose animation state via data attributes (`data-animating="true"`)
- Use `cy.waitUntil()` for state-based waiting

### 3D Click Coordinates

**Challenge:** Clicking petals requires hitting 3D-projected positions.

**Mitigation:**
- Add invisible DOM overlay elements positioned over petals
- Use raycaster hit areas in Three.js that are generous
- Test clicks via element selectors, not coordinates

## Test Data Requirements

### MDX Content Files

Three MDX files with sufficient content for scroll testing:

- `content/about.mdx` - At least 2 viewport heights of content
- `content/case-studies.mdx` - At least 2 viewport heights of content
- `content/poetry.mdx` - At least 2 viewport heights of content

### Test Constants

```typescript
// cypress/support/constants.ts
export const ROSE_CONFIG = {
  BLOOM_ANIMATION_MS: 800,
  CLOSE_ANIMATION_MS: 400,
  CONTENT_FADE_MS: 300,
  VIEWPORT_DESKTOP: { width: 1280, height: 720 },
  VIEWPORT_MOBILE: { width: 375, height: 667 },
};
```

## Coverage Summary

| Scenario Group | Count | Automated | Manual Required |
|----------------|-------|-----------|-----------------|
| Loading | 3 | 3 | 3 |
| Exploration | 3 | 3 | 3 |
| Content | 5 | 5 | 5 |
| Edge Cases | 4 | 4 | 2 |
| **Total** | **15** | **15** | **13** |

All 15 user scenarios have automated E2E coverage. 13 require manual verification for visual/UX quality that automated tests cannot fully capture.
