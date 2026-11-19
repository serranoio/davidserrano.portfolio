// Shared sky model. The welcome/writing canvases and the rose-scene sky read
// from here so the separate implementations look like the same night without
// coordinating constants.

// One depth layer of stars. Distance is expressed as softness and stillness:
// far stars are small blurred motes that barely move, near stars are crisp.
export interface StarLayer {
  // Share of the total star count that lives in this layer.
  share: number;
  // Diameter in CSS pixels of the drawn sprite, [min, max].
  sizeRange: readonly [number, number];
  // 0 = hard-edged point, 1 = fully gaussian blur.
  softness: number;
  opacityRange: readonly [number, number];
  // Canvas: scroll parallax (smaller = farther = lags the page more).
  parallaxFactor: number;
  // Rose scene: radians per second the layer turns about the vertical axis.
  driftRadPerSec: number;
  twinkleHz: number;
}

export const STAR_CONFIG = {
  staticStarCount: { welcome: 150, rose: 760 },

  // Far → near.
  layers: [
    { share: 0.58, sizeRange: [4, 7], softness: 1, opacityRange: [0.25, 0.5], parallaxFactor: 0.35, driftRadPerSec: 0.0012, twinkleHz: 0.07 },
    { share: 0.3, sizeRange: [2.6, 3.6], softness: 0.45, opacityRange: [0.5, 0.85], parallaxFactor: 0.6, driftRadPerSec: 0.003, twinkleHz: 0.13 },
    { share: 0.12, sizeRange: [2.4, 3.4], softness: 0, opacityRange: [0.85, 1], parallaxFactor: 0.85, driftRadPerSec: 0.006, twinkleHz: 0.22 },
  ] as readonly StarLayer[],

  // How much a star's own slow twinkle moves its brightness (0–1).
  twinkleDepth: 0.22,
  // How much the shared breath moves every star's brightness (0–1): the sky
  // brightens on the inhale and dims on the exhale.
  breathDepth: 0.34,

  // Warm white, with a share of stars leaning faintly toward rose.
  starColor: '#fff3e2',
  starTintColor: '#f3c9c4',
  starTintShare: 0.3,

  // Radius of the spherical shell the rose-scene stars sit on. Camera orbits
  // at 1.4–8 units, so 25 puts the stars firmly "out there".
  roseStarSphereRadius: 25,
  roseStarRadiusJitter: 0.15,

  meteorPoolSize: { welcome: 3, rose: 3 },
  // Rare: a meteor should be a small event, not weather.
  meteorSpawnIntervalRange: [9, 20] as const,

  // Top-right → bottom-left at ~25° below horizontal, with ±10° jitter per meteor.
  meteorAngleDegrees: 180 + 25,
  meteorAngleJitterDegrees: 10,

  meteorHeadColor: '#fff3e2',
  // Brightness at the middle of its flight; it fades in and out around that.
  meteorPeakOpacity: 0.65,
  // Seconds a meteor takes to appear after it spawns.
  meteorFadeInSeconds: 0.5,

  // Canvas: px/sec; rose: world-units/sec (renderer-specific). Slower and
  // longer than a "shooting" star — closer to a slow fall.
  meteorSpeedRangePx: [380, 620] as const,
  meteorSpeedRangeWorld: [2.0, 3.0] as const,
  meteorLengthRangePx: [240, 420] as const,
  meteorLengthRangeWorld: [2.4, 3.8] as const,
  meteorWidthPx: 1.1,
} as const;

// The night itself: the gradient and haze of the sky. Its edge — the colour
// every home section meets its neighbours with — is the `--color-bg` token.
export const SKY = {
  zenith: '#08070a',
  horizon: '#0f0a0c',
  haze: '#22111a',
  // 0–1 strength of the drifting haze, and how much of it follows the breath.
  hazeStrength: 0.7,
  hazeBreath: 0.25,
  hazeDriftPerSec: 0.006,
} as const;

export function randomIn(range: readonly [number, number]): number {
  return range[0] + Math.random() * (range[1] - range[0]);
}

// Deterministic layer assignment: star i of `count` falls into a layer
// according to the layers' shares, so both renderers get the same mix.
export function starLayerFor(index: number, count: number): StarLayer {
  const position = (index + 0.5) / count;
  let cumulative = 0;
  for (const layer of STAR_CONFIG.layers) {
    cumulative += layer.share;
    if (position < cumulative) return layer;
  }
  return STAR_CONFIG.layers[STAR_CONFIG.layers.length - 1];
}

// Per-star brightness multiplier from its own twinkle and the shared breath.
// `twinkle` and `breathLevel` are both 0–1.
export function starBrightness(twinkle: number, breathLevel: number): number {
  return (
    (1 - STAR_CONFIG.twinkleDepth * twinkle) *
    (1 - STAR_CONFIG.breathDepth * (1 - breathLevel))
  );
}

const METEOR_FADE_OUT_START = 0.55;

// Opacity of a meteor `ageSec` into a flight lasting `lifeSec`: it surfaces,
// holds, and dissolves well before it would leave the frame.
export function meteorOpacity(ageSec: number, lifeSec: number): number {
  const fadeIn = Math.min(1, ageSec / STAR_CONFIG.meteorFadeInSeconds);
  const t = Math.min(1, Math.max(0, (ageSec / lifeSec - METEOR_FADE_OUT_START) / (1 - METEOR_FADE_OUT_START)));
  const fadeOut = 1 - t * t * (3 - 2 * t);
  return STAR_CONFIG.meteorPeakOpacity * fadeIn * fadeOut;
}
