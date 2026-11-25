import { css, unsafeCSS } from 'lit';
import { skyEdge, skyHorizon } from './sky.styles';
import { EMBER_CONFIG } from './ember-halo-config';

const pct = (fraction: number) => `${fraction * 100}%`;
const { bleed } = EMBER_CONFIG;
// The ember canvas reaches past the photo by the renderer's own bleed, so
// its idea of where the photo sits matches the layout.
const emberCanvasTop = unsafeCSS(`-${pct(bleed.top)}`);
const emberCanvasLeft = unsafeCSS(`-${pct(bleed.left)}`);
const emberCanvasWidth = unsafeCSS(pct(1 + bleed.left + bleed.right));
const emberCanvasHeight = unsafeCSS(pct(1 + bleed.top + bleed.bottom));
const emberBreathVar = unsafeCSS(EMBER_CONFIG.glowBreathProperty);

// A feathered rectangle: two fades intersected, each reaching nothing at
// the photo's edge so no straight border survives. The face sits inside the
// opaque middle; the feet sink into the firelight. Mask colours are alpha only.
const portraitMask = css`linear-gradient(
    to right,
    transparent,
    black 18%,
    black 82%,
    transparent
  ),
  linear-gradient(to bottom, transparent, black 14%, black 66%, transparent)`;

export default css`
  :host {
    display: block;
    position: relative;
    width: 100%;
    min-height: 100svh;
    /* Same night as the rose below: it deepens toward the foot of the
       section and returns to the shared edge colour where the two meet. */
    background: linear-gradient(
      to bottom,
      ${skyEdge} 0%,
      ${skyEdge} 30%,
      ${skyHorizon} 78%,
      ${skyEdge} 100%
    );
    color: var(--color-text);
    font-family: var(--font-body, 'DM Sans', sans-serif);
    /* The halo spills past the photo; never into a sideways scroll. */
    overflow-x: clip;
  }

  .stars-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .container {
    position: relative;
    display: grid;
    grid-template-columns: 1.2fr 0.8fr;
    gap: clamp(3rem, 7vw, 7rem);
    align-items: center;
    width: min(1120px, 88%);
    min-height: 100svh;
    margin: 0 auto;
    padding: clamp(3rem, 7vh, 6rem) 0;
    box-sizing: border-box;
  }

  .signoff {
    margin: 2rem 0 0;
    font-size: 1rem;
    color: color-mix(in srgb, var(--color-text) 85%, transparent);
  }

  .subline {
    margin: 1.5rem 0 0;
    font-family: var(--font-title, 'Cormorant Garamond', Georgia, serif);
    font-size: clamp(1.3rem, 1.8vw, 1.6rem);
    line-height: 1.4;
  }

  .intro {
    max-width: 29rem;
    margin: 1.25rem 0 0;
    color: color-mix(in srgb, var(--color-text) 85%, transparent);
    font-size: 1rem;
    line-height: 1.75;
  }

  /* Ember halo: no frame. The portrait's edges dissolve into the night and
     it rises out of a low firelight, with a few sparks drifting up around
     it. The fire colour leans toward gold by --ember-halo-heat and the whole
     glow is scaled by --ember-halo-gain (both per theme, theme/index.css). */
  .photo-col {
    position: relative;
    isolation: isolate;
    margin: 0;
    align-self: center;
    --ember-fire: color-mix(
      in srgb,
      var(--color-ember-primary) var(--ember-halo-heat, 75%),
      var(--color-gold-light)
    );
  }

  .ember-glow {
    position: absolute;
    inset: -20% -34% -18%;
    z-index: -1;
    pointer-events: none;
    background:
      /* The fire, low behind the portrait's foot. */
      radial-gradient(
        ellipse 44% 36% at 50% 62%,
        color-mix(in srgb, var(--ember-fire) 62%, transparent),
        color-mix(in srgb, var(--ember-fire) 20%, transparent) 55%,
        transparent 100%
      ),
      /* Its warmth reaching up around the figure. */
      radial-gradient(
        ellipse 48% 48% at 50% 50%,
        color-mix(in srgb, var(--color-ember-soft) 12%, transparent),
        transparent 100%
      );
    /* Swells with the shared breath; rests at the clock's still level when
       motion is reduced (the renderer writes ${emberBreathVar}). */
    opacity: calc(var(--ember-halo-gain, 1) * (0.6 + 0.4 * var(${emberBreathVar}, 0.4)));
    will-change: opacity;
  }

  /* Only the outer edges fade; the face stays crisp. */
  .portrait {
    position: relative;
    -webkit-mask-image: ${portraitMask};
    -webkit-mask-composite: source-in;
    mask-image: ${portraitMask};
    mask-composite: intersect;
  }

  /* Firelight from below, warming the lower photo and leaving the face. */
  .portrait::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to top,
      color-mix(in srgb, var(--ember-fire) 40%, transparent),
      transparent 50%
    );
    mix-blend-mode: soft-light;
    pointer-events: none;
  }

  .photo {
    width: 100%;
    aspect-ratio: 4 / 5;
    object-fit: cover;
    object-position: center 30%;
    display: block;
  }

  .ember-canvas {
    position: absolute;
    top: ${emberCanvasTop};
    left: ${emberCanvasLeft};
    width: ${emberCanvasWidth};
    height: ${emberCanvasHeight};
    pointer-events: none;
  }

  @media (max-width: 768px) {
    .container {
      grid-template-columns: 1fr;
      gap: 2.5rem;
      width: min(32rem, 86%);
      padding: 3rem 0;
    }

    .photo-col {
      width: 72%;
      justify-self: end;
    }
  }
`;
