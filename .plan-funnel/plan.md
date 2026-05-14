# Plan: 3D Golden Rose Navigation

## Problem Summary

The portfolio homepage needs a distinctive 3D golden rose as navigation and visual identity. Current state is a "Hello World" placeholder. The rose must be interactive (pan/rotate), have 3 clickable petals that reveal MDX content sections (About Me, Case Studies, Poetry), and work on both desktop and mobile.

## Goal And Non-Goals

### Goals
- Replace placeholder with interactive 3D golden rose
- 3 active petals reveal MDX content via bloom animation
- Works on desktop (mouse) and mobile (touch)
- Fits Golden Rose aesthetic (metallic gold, warm black)
- All 15 user scenarios pass E2E tests

### Non-Goals
- WebGL fallback (explicitly excluded)
- Accessibility for screen readers
- Sound effects
- CMS integration
- Deep linking to sections

---

## Scenario Harness Contract

### CLI Commands

```bash
bun run dev          # Start dev server on localhost:3001
bun run test:e2e     # Run all Cypress E2E tests
bun run cy:open      # Open Cypress UI
bun run cy:run --spec "cypress/e2e/rose/*.cy.ts"  # Rose tests only
```

### Test Structure

```
cypress/e2e/
  rose/
    loading.cy.ts       # US-1, US-2, US-3
    exploration.cy.ts   # US-4, US-5, US-6
    content.cy.ts       # US-7, US-8, US-9, US-10, US-11
    edge-cases.cy.ts    # US-12, US-13, US-14, US-15
```

### Test Utilities

- `data-testid="rose-canvas"` on Three.js canvas
- `data-active="true"` on clickable petal DOM overlays
- `data-section="about|case-studies|poetry"` on petal elements
- `data-animating="true"` during animations
- `window.__ROSE_TEST_API__` for Three.js state queries

---

## Resolved Technology Decisions

| Decision | Choice |
|----------|--------|
| 3D Framework | Three.js (vanilla, no React wrapper) |
| Component Shell | Lit Element |
| Rose Model | Procedural petals + metallic PBR shaders |
| Animation | Three.js native (no GSAP/spring) |
| Click Detection | Three.js Raycaster |
| Content Rendering | HTML overlay positioned by 3D state |
| MDX Integration | React island (lazy loaded when content opens) |
| Camera Controls | OrbitControls (bounded rotation, no zoom) |

### Dependencies to Install

```bash
bun add three
bun add -d @types/three
```

---

## Vertical Slices

> **TDD RULE**: Every slice follows: Write Tests → Run (Red) → Implement → Run (Green) → Done.
> A slice is NOT complete until its Cypress tests pass.

### Slice 1: Three.js Canvas in Lit Element

**Goal**: Empty Three.js scene renders in Lit element, replacing HelloWorld.

**Delivers**: Foundation for all subsequent work.

**Step 1 — Write Tests First**:
```typescript
// cypress/e2e/rose/loading.cy.ts
it('renders Three.js canvas', () => {
  cy.visit('/');
  cy.get('canvas[data-testid="rose-canvas"]').should('exist');
  cy.window().then((win) => {
    expect(win.console.error).to.not.be.called; // No errors
  });
});
```

**Step 2 — Implement (only after tests exist)**:

Files to create/modify:
- `theme/components/golden-rose.ts` — Lit element with Three.js setup
- `theme/components/golden-rose.styles.ts` — Styles (fullscreen canvas)
- `theme/index.tsx` — Update HomeLayout to render `<golden-rose>`

Implementation:
1. Create `GoldenRoseElement` extending `LitElement`
2. Add `<canvas>` to Lit template
3. Initialize Three.js in `firstUpdated()`: Scene, Camera, Renderer
4. Add animation loop with `requestAnimationFrame`
5. Render warm black background (Golden Rose palette)
6. Clean up Three.js resources in `disconnectedCallback()`
7. Register custom element: `customElements.define('golden-rose', GoldenRoseElement)`
8. Update `HomeLayout` in `theme/index.tsx`:
   - Import the Lit element file (side effect import for registration)
   - Return `<golden-rose />` JSX (React renders custom elements natively)
9. Add `data-testid="rose-canvas"` to canvas element

**Step 3 — Verify**:
- Run `bun run cy:run --spec "cypress/e2e/rose/loading.cy.ts"`
- Tests must pass before moving to Slice 2
- Manual: Black canvas fills viewport

**Covers scenarios**: Partial US-1, US-2

---

### Slice 2: Loading Shimmer

**Goal**: Gold shimmer displays while Three.js initializes.

**Delivers**: US-3 complete, polished loading experience.

**Files to modify**:
- `theme/components/golden-rose.ts` — Add loading state
- `theme/components/golden-rose.styles.ts` — Shimmer animation

**Implementation**:
1. Add `loading` state property to Lit element
2. Render shimmer overlay when `loading === true`
3. CSS keyframe animation for pulsing gold gradient
4. Set `loading = false` after first Three.js render
5. Fade transition from shimmer to canvas

**Verification**:
- E2E: Shimmer visible before canvas ready
- E2E: Shimmer removed after load
- Manual: Smooth gold pulse, no jarring transition

**Covers scenarios**: US-3

---

### Slice 3: Single Procedural Petal

**Goal**: One metallic gold petal renders in the scene.

**Delivers**: Proof of petal geometry and material.

**Step 1 — Write Tests First**:
```typescript
// cypress/e2e/rose/loading.cy.ts
it('renders a petal mesh', () => {
  cy.visit('/');
  cy.window().then((win) => {
    const api = win.__ROSE_TEST_API__;
    expect(api.getPetalCount()).to.be.gte(1);
  });
});
```

**Step 2 — Implement**:

Files to modify:
- `theme/components/golden-rose.ts` — Add petal creation

Implementation:
1. Create petal geometry (LatheGeometry or custom BufferGeometry)
2. Define petal shape via bezier curve or parametric function
3. Apply MeshStandardMaterial with metalness: 1, roughness: 0.3
4. Set gold color from CSS variable or hardcoded hex
5. Position petal in scene
6. Add basic lighting (directional + ambient)
7. Expose `__ROSE_TEST_API__.getPetalCount()` on window

**Verification**:
- E2E: `getPetalCount() >= 1`
- Manual: Metallic gold petal visible, looks organic

**Covers scenarios**: Partial US-1

---

### Slice 4: Full Rose (8-10 Petals)

**Goal**: Complete rose with configurable petal count, 30° angle.

**Delivers**: Visual centerpiece complete.

**Files to modify**:
- `theme/components/golden-rose.ts` — Petal generation loop

**Implementation**:
1. Create `PETAL_COUNT` constant (default 9)
2. Generate petals in radial pattern
3. Vary petal size/rotation for organic look
4. Position camera at 30° angle looking into rose
5. Group petals under single Object3D for easy rotation
6. Mark 3 petals as "active" (store in userData)

**Verification**:
- E2E: Multiple petals render
- Manual: Rose looks cohesive, 30° angle correct

**Covers scenarios**: US-1, US-2 (visual part)

---

### Slice 5: Orbit Controls (Pan/Rotate)

**Goal**: User can rotate rose with mouse drag or touch.

**Delivers**: US-4, US-5 complete.

**Files to modify**:
- `theme/components/golden-rose.ts` — Add OrbitControls

**Implementation**:
1. Import OrbitControls from `three/examples/jsm/controls/OrbitControls`
2. Initialize controls with camera and canvas
3. Disable zoom (`enableZoom = false`)
4. Set rotation limits (polar angle bounded)
5. Enable damping for momentum feel
6. Handle touch events (OrbitControls does this automatically)

**Verification**:
- E2E: Rose rotation changes on mouse drag
- E2E: No zoom on pinch
- Manual: Rotation feels smooth with inertia

**Covers scenarios**: US-4, US-5

---

### Slice 6: Petal Hover & Active Indicators

**Goal**: Active petals show etched symbols and glow on hover.

**Delivers**: US-6 complete.

**Files to modify**:
- `theme/components/golden-rose.ts` — Raycaster hover detection, petal textures

**Implementation**:
1. Add Raycaster for hover detection
2. On mousemove, cast ray and check petal intersections
3. If active petal hovered, increase emissive intensity (glow)
4. Reset emissive when hover ends
5. Add etched symbol to active petals:
   - Option A: Texture with symbol
   - Option B: Small geometry detail
6. Create 3 distinct symbols (person, briefcase/grid, feather/quill)

**Verification**:
- E2E: 3 petals have `data-active="true"`
- E2E: Hover triggers glow class/state
- Manual: Symbols visible, glow subtle but noticeable

**Covers scenarios**: US-6

---

### Slice 7: Petal Click Detection

**Goal**: Clicking active petal triggers callback with section name.

**Delivers**: Foundation for content reveal.

**Files to modify**:
- `theme/components/golden-rose.ts` — Click handler with raycasting

**Implementation**:
1. Add click/touch event listener to canvas
2. On click, raycast to find intersected petal
3. Check if petal has `userData.section`
4. If active petal, emit custom event or call method with section name
5. If inactive petal, do nothing
6. Add DOM overlays for test selectors (`data-section`)

**Verification**:
- E2E: Click active petal triggers state change
- E2E: Click inactive petal does nothing
- Manual: Click feels responsive

**Covers scenarios**: US-12 (partial), foundation for US-7-11

---

### Slice 8: Bloom Animation

**Goal**: Rose blooms when petal clicked, petals recede except selected.

**Delivers**: Core interaction animation.

**Files to modify**:
- `theme/components/golden-rose.ts` — Animation system

**Implementation**:
1. Create animation state: `idle | blooming | open | closing`
2. On petal click, set state to `blooming`
3. Animate over ~0.6s:
   - Selected petal moves toward camera and scales up
   - Other petals rotate outward/backward
   - Use easing function (ease-out-cubic)
4. Set `data-animating="true"` during animation
5. On animation complete, set state to `open`
6. Store original positions for reverse animation

**Verification**:
- E2E: `data-animating="true"` during animation
- E2E: Animation completes within expected time
- Manual: Animation feels organic, rose "opens up"

**Covers scenarios**: Partial US-7, US-8, US-9

---

### Slice 9: Content Container Positioning

**Goal**: HTML container positioned relative to bloomed rose.

**Delivers**: Place for MDX content to render.

**Files to modify**:
- `theme/components/golden-rose.ts` — Content container logic
- `theme/components/golden-rose.styles.ts` — Content panel styles

**Implementation**:
1. Add `<div id="content-root">` to Lit template
2. When bloom animation completes, show content container
3. Position container in center of viewport (or relative to rose center)
4. Style: semi-transparent background, rounded corners, scrollable
5. Size: responsive, max-width for readability
6. Apply Golden Rose palette (dark bg, gold accents)

**Verification**:
- E2E: Content container visible when `state === open`
- Manual: Container positioned well, styled correctly

**Covers scenarios**: Foundation for US-7, US-8, US-9

---

### Slice 10: MDX Content Loading (React Island)

**Goal**: MDX content loads and renders in content container.

**Delivers**: Full content experience.

**Prerequisites (may require build config)**:
- rspress/rsbuild must support dynamic MDX imports outside of `docs/` pages
- If dynamic import fails, may need to configure rsbuild to bundle MDX files
- Fallback: pre-compile MDX to JS modules at build time

**Step 1 — Write Tests First**:
```typescript
// cypress/e2e/rose/content.cy.ts
it('loads About Me content', () => {
  cy.visit('/');
  cy.get('[data-section="about"]').click();
  cy.get('#content-root').should('be.visible');
  cy.get('#content-root').contains('About').should('exist');
});
```

**Step 2 — Implement**:

Files to create/modify:
- `theme/components/golden-rose.ts` — React mounting logic
- `content/about.mdx` — About Me content
- `content/case-studies.mdx` — Case Studies content
- `content/poetry.mdx` — Poetry content
- `rspress.config.ts` — May need MDX config adjustments

Implementation:
1. When bloom completes, dynamically import React and ReactDOM
2. Dynamically import MDX file based on section name
3. Create React root on `#content-root`
4. Render MDX component
5. Handle scroll within content area
6. Store React root reference for cleanup

**Verification**:
- E2E: Content text appears after bloom
- E2E: Content is scrollable
- Manual: MDX renders correctly, interactive components work

**Covers scenarios**: US-7, US-8, US-9 complete

---

### Slice 11: Close Content (Click Outside)

**Goal**: Clicking outside content closes it and reverses bloom.

**Delivers**: US-10 complete.

**Files to modify**:
- `theme/components/golden-rose.ts` — Close logic

**Implementation**:
1. Add click listener on background/canvas area
2. When state is `open` and click is outside content container:
   - Unmount React root
   - Set state to `closing`
   - Reverse bloom animation (~0.4s)
   - Set state to `idle`
3. Return petals to original positions

**Verification**:
- E2E: Click outside closes content
- E2E: Rose returns to idle state
- Manual: Close animation smooth

**Covers scenarios**: US-10

---

### Slice 12: Section Switching

**Goal**: Can switch sections without closing first.

**Delivers**: US-11 complete.

**Files to modify**:
- `theme/components/golden-rose.ts` — Section switch logic

**Implementation**:
1. When content is open and different active petal clicked:
   - Fade out current content
   - Unmount current React root
   - Transition bloom to new petal (animate petal swap)
   - Mount new MDX content
   - Fade in new content
2. No intermediate "closed" state

**Verification**:
- E2E: Can switch from About to Case Studies directly
- E2E: No flash to closed state
- Manual: Transition feels seamless

**Covers scenarios**: US-11

---

### Slice 13: Edge Case Handling

**Goal**: Handle rapid clicks, resize, scroll isolation.

**Delivers**: US-13, US-14, US-15 complete.

**Files to modify**:
- `theme/components/golden-rose.ts` — Edge case logic

**Implementation**:
1. **Rapid clicks**: Ignore clicks while `data-animating="true"`
2. **Resize**: Add resize observer, update camera aspect and renderer size
3. **Scroll isolation**: Ensure scroll events on content don't propagate to OrbitControls

**Verification**:
- E2E: Rapid clicks don't break state
- E2E: Resize adapts layout
- E2E: Content scroll doesn't rotate rose

**Covers scenarios**: US-13, US-14, US-15

---

### Slice 14: Mobile Touch Refinement

**Goal**: Touch interactions feel native on mobile.

**Delivers**: Mobile polish.

**Files to modify**:
- `theme/components/golden-rose.ts` — Touch handling

**Implementation**:
1. Ensure touch events work for petal taps
2. Test touch drag for rotation
3. Ensure content is touch-scrollable
4. Add touch-action CSS to prevent browser gestures interfering
5. Test on real devices

**Verification**:
- E2E: Mobile viewport tests pass
- Manual: Touch feels natural on real device

**Covers scenarios**: US-2, US-5, US-8 (mobile aspects)

---

## Slice Order And Dependencies

```
Slice 1: Three.js Canvas
    │
    ├── Slice 2: Loading Shimmer (parallel OK)
    │
    └── Slice 3: Single Petal
            │
            └── Slice 4: Full Rose
                    │
                    ├── Slice 5: Orbit Controls
                    │
                    ├── Slice 6: Hover & Indicators
                    │
                    └── Slice 7: Click Detection
                            │
                            └── Slice 8: Bloom Animation
                                    │
                                    └── Slice 9: Content Container
                                            │
                                            └── Slice 10: MDX Loading
                                                    │
                                                    ├── Slice 11: Close Content
                                                    │
                                                    └── Slice 12: Section Switching
                                                            │
                                                            └── Slice 13: Edge Cases
                                                                    │
                                                                    └── Slice 14: Mobile Polish
```

**Critical path**: 1 → 3 → 4 → 7 → 8 → 9 → 10

---

## Parallelizable Work

| Slices | Can Parallelize? | Notes |
|--------|------------------|-------|
| Slice 2 (Shimmer) | Yes, after Slice 1 | Independent of petal work |
| Slice 5 (Controls) + Slice 6 (Hover) | Yes, after Slice 4 | Both need full rose, independent of each other |
| MDX content writing | Yes, anytime | Content files don't depend on code |
| Slice 13 (Edge Cases) + Slice 14 (Mobile) | Yes, after Slice 12 | Polish/hardening, independent |

**Recommended parallel tracks**:
1. Main track: Slices 1 → 3 → 4 → 7 → 8 → 9 → 10 → 11 → 12
2. Polish track: Slice 2 (early), Slices 5, 6 (mid), Slices 13, 14 (late)
3. Content track: Write MDX files anytime

---

## Risks And Failure Modes

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Procedural petal geometry looks bad | Medium | High | Start simple, iterate visually. Consider GLTF fallback. |
| Three.js + Lit shadow DOM issues | Low | Medium | Test early in Slice 1. Shadow DOM is supported. |
| MDX dynamic import fails with rsbuild | Medium | High | Test early in Slice 10. May need build config changes. |
| Mobile performance poor | Medium | Medium | Keep polygon count low, test on real devices early. |
| Raycasting accuracy on mobile | Low | Medium | Use generous hit areas, test touch events. |
| Animation timing feels wrong | Medium | Low | Expose timing constants, tune iteratively. |

---

## Execution Notes

### Test-Driven Development (MANDATORY)

**Every slice follows this workflow:**
1. **Write Cypress tests FIRST** — Before any implementation code
2. **Run tests** — Confirm they fail (red)
3. **Implement the feature** — Write the minimum code to pass
4. **Run tests** — Confirm they pass (green)
5. **Slice is ONLY complete when tests pass**

No slice is considered done until `bun run cy:run` passes for that slice's tests.

### For Implementation Agent

1. **Start with Slice 1 tests** — Write E2E test for canvas rendering, then implement.
2. **Tests before code** — Always. No exceptions.
3. **Commit per slice** — Each slice is a logical commit point (tests + implementation).
4. **MDX early** — Create stub MDX files before Slice 10 so tests can run.
5. **Mobile testing** — Don't wait until Slice 14. Test touch periodically.
6. **Visual tuning** — Petal shape, animation timing, colors will need iteration after tests pass.

### Test Data Setup

Create these MDX files early (can be stubs):
- `content/about.mdx`
- `content/case-studies.mdx`
- `content/poetry.mdx`

Each should have enough content to test scrolling (2+ viewport heights).

### Definition of Done

**Per-Slice**:
- Cypress tests for slice written BEFORE implementation
- Implementation code passes those tests
- `bun run cy:run` passes for slice-relevant tests

**Overall**:
- All 15 user scenarios pass
- `bun run test:e2e` exits 0
- Manual verification checklist completed for visual/UX items
