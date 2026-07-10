// Shared sky model. The welcome-section canvas and the rose-scene meteor
// field read from here so the two implementations look like the same sky
// without coordinating constants.

export const STAR_CONFIG = {
  staticStarCount: { welcome: 120, rose: 600 },

  // Radius of the spherical shell the rose-scene static stars sit on.
  // Camera orbits at 1.4–8 units, so 25 puts the stars firmly "out there"
  // — they read as a distant universe rather than scenery near the rose.
  roseStarSphereRadius: 25,
  // Small radial jitter so the shell has depth instead of being a perfect
  // surface. ±15% reads as a thin starfield, not a flat skybox.
  roseStarRadiusJitter: 0.15,
  meteorPoolSize: { welcome: 6, rose: 4 },
  meteorSpawnIntervalRange: [2.5, 5.0] as const,

  // Top-right → bottom-left at ~25° below horizontal, with ±10° jitter per meteor.
  meteorAngleDegrees: 180 + 25,
  meteorAngleJitterDegrees: 10,

  // Warm white head fading to gold tail — harmonizes with the rose's gold.
  meteorHeadColor: '#fff7e0',
  meteorTailColor: '#f4d77b',

  // Canvas: px/sec; rose: world-units/sec (renderer-specific).
  meteorSpeedRangePx: [600, 1100] as const,
  meteorSpeedRangeWorld: [3, 5] as const,
  meteorLengthRangePx: [80, 140] as const,
  meteorLengthRangeWorld: [0.8, 1.4] as const,

  staticStarOpacityRange: [0.25, 0.85] as const,
  staticStarTwinkleHz: 0.4,

  // Three parallax layers for the welcome canvas. Smaller factor = farther
  // away = scrolls slower. Stars cycle through these layers round-robin.
  parallaxLayerFactors: [0.85, 0.65, 0.4] as const,
} as const;
