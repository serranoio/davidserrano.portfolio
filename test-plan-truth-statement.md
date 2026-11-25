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

## TC-7 — Continuous section scrolling

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

---

## TC-8 — The forged star (Stormbreaker slot)

The `[[star]]` line in `docs/sections/truth-statement.txt` reserves an empty
slot (1.5 extra paragraph slots of scroll) under the Stormbreaker paragraph.
Tunables live in `theme/components/star-forge-config.ts`.

**Steps:**
1. Scroll until "It was the equivalent of the Stormbreaker…" is in focus, then keep scrolling slowly toward "Every strike of the hammer…".
2. In the console, read `__ROSE_TEST_API__.getStarProgress()` and `getStarIntensity()` at several points.
3. Scroll backward through the same range, then forward again quickly (wheel, scrollbar drag, Page Down).
4. Repeat at 375×667 with touch emulation, and with reduced motion enabled.
5. Click a petal while the beam is on.

**Expected:**
- The marker never renders as text; the gap under the Stormbreaker paragraph is empty except for the star.
- 0–0.25 progress: the sky and meteors dim slightly; a faint pinprick appears below the paragraph, deep behind the text.
- 0.25–0.55: the core swells and overexposes to white with a soft warm glare and slowly churning corona (white → pale gold → amber, never saturated orange); the sky warms a little.
- 0.55–0.8: a thin, soft-edged beam reaches from the star to the rose; dust motes glitter inside it; the rose takes warm light and its petals gild.
- 0.8–1: the beam thins and fades as the next paragraph rises; a faint ember remains.
- No hard edges, ghost flares, diffraction spikes or cartoon rays.
- `getStarProgress()` is 0 before the slot and 1 after it, and the same page position always reports the same progress and intensity in both directions. With reduced motion, the same position renders the same frame.
- Mobile shows fewer dust motes and a narrower offset, with the star still under the paragraph.
- The star, beam and rose light fade with the text during the bloom (TC-3) and return on close (TC-4).
- Paragraph arrows step over the star slot paragraph-to-paragraph; page height grows by exactly 1.5 × 40svh.
