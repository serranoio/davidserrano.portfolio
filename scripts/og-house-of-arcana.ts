/**
 * Renders the House of Arcana card from /engineering into the /house-of-arcana link preview image
 * (docs/public/og/house-of-arcana.png, 1200×630 — the Open Graph size).
 *
 * Prerequisite: a running site that serves /engineering — `bun run dev` (default http://localhost:4180) or
 * `bun run build && bun run preview`. Pass another origin with `--url <origin>` or OG_SITE_URL.
 *
 *   bun run og:house-of-arcana [--url http://localhost:4180]
 *
 * It uses Bun's built-in headless WebView (WKWebView on macOS; Chrome elsewhere), so it needs no dependency.
 * The real card is captured in place: a capture-only stylesheet hides the rest of the page and lays the card out
 * landscape to fill the frame; the site itself ships no extra page or flag for it.
 */
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { parseArgs } from 'node:util';
import { socialImageSize } from '../theme/social-preview';

const { width: WIDTH, height: HEIGHT } = socialImageSize;
/** Long enough for the spiral to bloom (1.6 s, arcana-spiral.helpers.ts) and leave comets in flight. */
const SPIRAL_SETTLE_MS = 3_200;
const TIMEOUT_MS = 30_000;
const OUTPUT = join(import.meta.dir, '../docs/public/og/house-of-arcana.png');

const { values } = parseArgs({ options: { url: { type: 'string' } } });
const origin = (values.url ?? process.env.OG_SITE_URL ?? 'http://localhost:4180').replace(/\/$/, '');

/**
 * Isolates the card on a full-frame Arcana stage and lays it out landscape: lockup and headline on the left,
 * the replay (resting on its poster) on the right, the call to action under the headline.
 */
const CAPTURE_CSS = `
  html, body { overflow: hidden !important; background: var(--arcana-canvas) !important; }
  body * { visibility: hidden !important; }
  .arcana-card-section, .arcana-card-section * { visibility: visible !important; }
  .arcana-card-section {
    position: fixed !important; inset: 0 !important; z-index: 2147483647 !important; margin: 0 !important;
    display: block !important; background: var(--arcana-canvas) !important;
  }
  .portfolio-page a.arcana-card {
    box-sizing: border-box; width: 100%; height: 100%; padding: 48px 56px;
    border: 0; border-radius: 0; box-shadow: none; transform: none; transition: none;
    grid-template-columns: minmax(0, 1fr) 540px; grid-template-rows: auto auto auto 1fr auto;
    column-gap: 48px; row-gap: 22px;
  }
  .arcana-card__header { grid-column: 1 / -1; }
  .arcana-card__title, .arcana-card__tagline, .arcana-card__headline, .arcana-card__footer { grid-column: 1; }
  .arcana-card__title-lead { font-size: 20px; }
  .arcana-card__title-mark { font-size: 84px; }
  .portfolio-page .arcana-card__headline { flex-direction: column; align-items: flex-start; align-self: end; }
  .arcana-card__headline-value { font-size: 76px; }
  .arcana-card__headline-label { font-size: 17px; }
  .arcana-card__video { grid-column: 2; grid-row: 3 / span 3; align-self: end; }
  .arcana-card__footer { justify-content: flex-start; }
  .arcana-card__spiral { width: 52%; top: -30%; right: -10%; }
`;

/** Resolves once a page-side expression is truthy. */
async function waitFor(view: Bun.WebView, expression: string, what: string) {
  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await view.evaluate<boolean>(`Promise.resolve(${expression}).then(Boolean)`)) return;
    await Bun.sleep(100);
  }
  throw new Error(`Timed out after ${TIMEOUT_MS} ms waiting for ${what} at ${origin}/engineering`);
}

const view = new Bun.WebView({ width: WIDTH, height: HEIGHT });
try {
  await view.navigate(`${origin}/engineering`);
  await waitFor(view, `document.querySelector('.arcana-card arcana-spiral')`, 'the House of Arcana card');
  await view.evaluate(`(() => {
    const style = document.createElement('style');
    style.textContent = ${JSON.stringify(CAPTURE_CSS)};
    document.head.append(style);
    // A still image cannot play the replay: rest it on its poster frame.
    const video = document.querySelector('.arcana-card video');
    video.pause();
    video.load();
    return true;
  })()`);
  await waitFor(view, `document.fonts.ready.then(() => document.fonts.status === 'loaded')`, 'fonts');
  await waitFor(
    view,
    `(() => { const i = new Image(); i.src = document.querySelector('.arcana-card video').poster; return i.decode().then(() => true, () => false); })()`,
    'the video poster',
  );
  // The spiral starts its bloom when it comes on screen; the capture stage puts it there.
  await Bun.sleep(SPIRAL_SETTLE_MS);
  const capture = await view.screenshot({ encoding: 'base64', format: 'png' });
  // The screenshot is at the display's pixel ratio (2400×1260 on a Retina Mac); scale it to the declared size.
  const png = await view.evaluate<string>(`(async () => {
    const image = new Image();
    image.src = 'data:image/png;base64,${capture}';
    await image.decode();
    const canvas = Object.assign(document.createElement('canvas'), { width: ${WIDTH}, height: ${HEIGHT} });
    const context = canvas.getContext('2d');
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, ${WIDTH}, ${HEIGHT});
    return canvas.toDataURL('image/png').split(',')[1];
  })()`);
  await mkdir(dirname(OUTPUT), { recursive: true });
  await Bun.write(OUTPUT, Buffer.from(png, 'base64'));
  console.log(`Wrote ${OUTPUT}`);
} finally {
  view.close();
}
