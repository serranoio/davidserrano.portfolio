# Manual Test Plan — Rose Truth Statement (3D)

## Setup

1. From repo root: `bun install`
2. Start dev server: `bun run dev`
3. Open the home page in Chrome

---

## TC-1 — Statement renders in the 3D scene after rose loads

**Steps:**
1. Hard-refresh the home page
2. Observe the shimmer, then the rose
3. Look for the gold text above the rose

**Expected:**
- During shimmer, no text mesh in the scene
- After load, gold text appears in the scene, above the rose
- Text begins with: "I seek for the truth."
- Text is rendered crisply (no pixelation), lit by the same lights as the rose
- Text does NOT rotate with the rose's idle spin (it lives in world space)

---

## TC-2 — Y-axis billboard while orbiting

**Steps:**
1. Click and drag on the canvas to orbit the camera horizontally (left ↔ right)
2. Drag vertically (up ↔ down)

**Expected:**
- During horizontal orbit, the text yaws to keep facing the camera — always legible
- During vertical orbit, the text stays upright (does NOT pitch with the camera)
- No flicker / depth artifacts

---

## TC-3 — Fade during bloom

**Steps:**
1. Click an active glowing petal
2. Watch the bloom animation closely

**Expected:**
- Text fades from full opacity to invisible over the first ~40% of the bloom
- Text is fully invisible by the time the camera reaches its top-down position
- No "popping" — the fade is smooth

---

## TC-4 — Reappears after closing

**Steps:**
1. With a section panel open (end of TC-3), click the close `×`
2. Watch the rose close

**Expected:**
- Text is invisible at the start of the close
- Text fades back to full opacity in the last portion of the close animation
- At idle, final state matches TC-1

---

## TC-5 — User can edit the prose

**Steps:**
1. Open `docs/sections/truth-statement.md`
2. Change one word (e.g. "Truth" → "TRUTH")
3. Save the file
4. Reload (HMR if it kicks in; otherwise hard refresh)

**Expected:**
- The change appears on the rose scene's text mesh
- No code change outside that single file was needed

---

## TC-6 — Mobile viewport

**Steps:**
1. DevTools → mobile viewport (375×667)
2. Reload

**Expected:**
- Text is visible above the rose
- Text fits in the viewport horizontally (no clipping at edges)
- Touch-drag on the canvas still orbits — text Y-billboards
- Tap an active petal — text fades, panel opens — TC-3 behavior holds on mobile

---

## TC-7 — Cypress regression + new spec passes

**Steps:**
1. From repo root: `bun run cy:run --spec "cypress/e2e/rose/**/*.cy.ts"`

**Expected:**
- All existing rose specs continue to pass
- New `truth-statement.cy.ts` passes:
  - opacity > 0.9 after load
  - opacity → 0 when a section is open
  - opacity returns after close
  - world position above the rose center
  - mobile viewport renders
