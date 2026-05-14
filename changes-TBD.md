# changes-TBD — Rose Truth Statement (3D)

## Goal

Add an editable statement of intent rendered **inside the Three.js scene** alongside the golden rose. The text begins:

> I seek for the truth. I would rather be wrong and discover the truth than right and have chosen a falsity. The golden rose represents the Truth, as within in it is encoded the golden ratio — a super simple formula that compounds to create a rose so beautiful. Nature had to let go of the ego in order to discover this formula. It had to go back to square 1, to the fundamental building blocks of this universe to discover this effective formula.

Not a poem inside a petal panel. Not a DOM overlay either — text lives in the WebGL scene, lit by the same lights as the rose, fading out when a section opens. User edits a single markdown file.

## Resolved design decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | Render strategy | `troika-three-text` (SDF, in-scene mesh) |
| 2 | Content location | `docs/sections/truth-statement.md` (plain prose, raw import) |
| 3 | Scene placement | Above the bloom center, slightly receded in Z — anchored to `scene`, NOT `roseGroup` |
| 4 | Orientation | Y-axis billboard — yaws to face the camera, stays upright |
| 5 | Visibility | Material opacity driven by bloom progress — fades 1→0 during `blooming`, 0 while `open`, 0→1 during `closing` |
| 6 | Material | `MeshStandardMaterial`, gold-toned, lower metalness (~0.4) — luminous, not shiny |
| 7 | Test surface | `__ROSE_TEST_API__.getTruthTextOpacity()` and `getTruthTextWorldPosition()` |

## File-level change list

### New files

- `docs/sections/truth-statement.md` — the prose. User-editable.
- `theme/components/rose-text.ts` — Troika `Text` mesh wrapper. Owns mesh, material, sync, opacity, billboard math, disposal.

### Modified files

- `package.json` — add `troika-three-text` dependency
- `theme/components/golden-rose.ts`
  - Import the `.md` content via `?raw` and the new `RoseText` class
  - Instantiate `RoseText` in `firstUpdated` after `initThreeJS`, add its mesh to `scene`
  - Each animate frame: call `roseText.update(camera, opacity)` where opacity derives from `bloomProgress` + `roseState`
  - Extend `RoseTestAPI` with `getTruthTextOpacity` and `getTruthTextWorldPosition`
  - Dispose `roseText` in `cleanup()`
- `cypress/e2e/rose/` — new spec file

### Tests

- `cypress/e2e/rose/truth-statement.cy.ts`
  - Opacity > 0.9 after load and during idle
  - Opacity → 0 while a section is open
  - Opacity recovers after section close
  - World position is positioned above the rose center (positive Y)
  - Renders on mobile viewport

## Opacity curve (from `bloomProgress`)

- `idle`: opacity = 1
- `blooming`: opacity = `1 - clamp(bloomProgress / 0.4, 0, 1)` — fades out in the first 40% of the bloom
- `open`: opacity = 0
- `closing`: opacity = `1 - clamp(bloomProgress / 0.4, 0, 1)` — same curve, rides bloomProgress back down so the text reappears late in the close

## Out of scope

- No nav header
- No changes to petal sections or the rose 3D model
- No localization
- No animation on the text itself beyond the opacity fade
