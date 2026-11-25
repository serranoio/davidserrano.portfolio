// The ember halo around the home hero photo: a few sparks rising from the
// firelight at the portrait's foot. Kept sparse — the halo frames the face,
// and the golden rose below stays the page's centrepiece.
//
// Positions are fractions of the photo box (0–1 across its width and height);
// the canvas is larger than the photo by `bleed` on each side so sparks can
// rise beside the portrait, not only over it.

export const EMBER_CONFIG = {
  // How far the canvas reaches past the photo, as a fraction of the photo's
  // size. welcome-section.styles.ts sizes the canvas from it.
  bleed: { top: 0.18, right: 0.24, bottom: 0.1, left: 0.24 },

  // Sparks alive at once; narrow (mobile) photos get fewer.
  count: { wide: 14, narrow: 9 },
  // Below this photo width (CSS px) the narrow count applies.
  narrowPhotoWidthPx: 320,

  // Where sparks are born. Horizontally they hug the portrait's sides:
  // distance from the centre line as a fraction of half the photo width.
  spawnSideOffset: [0.45, 1.05] as const,
  // Vertically they start in the lower part of the photo, where the fire is.
  spawnHeight: [0.62, 1.04] as const,

  // Rise speed (CSS px/sec) and life (sec). Slow: embers drift, not shoot.
  riseSpeedPx: [10, 24] as const,
  lifeSeconds: [4.5, 8] as const,
  // Side-to-side sway: amplitude (px) and frequency (Hz).
  swayPx: [4, 12] as const,
  swayHz: [0.12, 0.3] as const,
  // Sparks lean slightly away from the face as they rise (px/sec outward).
  outwardDriftPx: [0, 5] as const,

  // Sprite diameter (CSS px) and softness (0 crisp, 1 all glow).
  sizePx: [3.5, 7] as const,
  softness: 0.6,
  // Share of sparks in the pale gold colour; the rest are hot ember.
  paleShare: 0.35,

  // Peak opacity, and the share of life spent appearing / dissolving.
  peakOpacity: 0.85,
  fadeInShare: 0.18,
  fadeOutShare: 0.5,
  // Fast flicker on top of the fade.
  flickerHz: [1.6, 3.4] as const,
  flickerDepth: 0.3,

  // How much the shared breath moves the sparks' brightness (0–1).
  breathDepth: 0.4,
  // Breath level is written to the glow as a CSS variable; skip writes that
  // change it by less than this, so the style is not touched every frame.
  glowBreathStep: 0.01,
  glowBreathProperty: '--ember-breath',

  // Colour tokens the sparks are drawn in (read from the canvas's styles, so
  // they follow theme/index.css).
  colorTokens: { hot: '--color-ember-primary', pale: '--color-ember-soft' },
} as const;
