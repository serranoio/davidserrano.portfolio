# Manual Test Plan — Rose Truth Statement (3D)

## Setup

1. From repo root: `bun install`
2. Start dev server: `bun run dev --port 3002`
3. Open `http://localhost:3002/` in Chrome

---

## TC-1 — Statement renders in the 3D scene after rose loads

**Steps:**
1. Hard-refresh the home page
2. Observe the shimmer, then the rose
3. Scroll to the rose and look for the gold text behind it

**Expected:**
- During shimmer, no text mesh in the scene
- After load, gold text appears behind and below the rose
- Text begins with: "The Ballad of Programata"
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
1. Open `docs/sections/truth-statement.txt`
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
- Text is visible behind the rose
- Text fits in the viewport horizontally (no clipping at edges)
- One-finger vertical swipes scroll the page and advance/reverse the poem; mouse drag still orbits
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
  - initial world position below the rose center
  - mobile viewport renders


---

## TC-8 — Continuous section scrolling

**Steps:**
1. Slowly scroll from the hero into the rose, through the poem, and into “I write too.”
2. Reverse direction while reading and halfway across each section boundary.
3. Repeat with quick wheel movements, a scrollbar drag, Page Up/Page Down, and one-finger mobile swipes.
4. Reload halfway through the poem, and test a delayed model load.
5. On mobile, use the paragraph arrows in both directions, including with reduced motion enabled.

**Expected:**
- The rose remains pinned while the poem advances with page position.
- Entry and exit follow the same continuous movement; there is no automatic snap, whole-section jump, or input lockout.
- Reversing retraces the poem without resetting it.
- Model loading does not move the writing section; reload restores the poem at the restored page position.
- Paragraph buttons scroll the same page timeline, respect reduced motion, and leave the screen with the rose.

**Automated coverage:** `cypress/e2e/desktop-scroll-flow.cy.ts` and `cypress/e2e/mobile-scroll-flow.cy.ts`.
