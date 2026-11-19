// Every tunable for the living rose: what it is made of, how it is lit, how
// far it moves when it breathes, and how it answers the pointer. Kept apart
// from the scene code so the look can be adjusted without reading shaders.

// --- Petal flesh -----------------------------------------------------------
// The model's base-colour map is a flat saturated red with the petal's own
// shading and fibres baked in. We keep its tonal detail and re-colour it
// between these two tones: a deep wine in the folds, a dusty rose where the
// petal catches light.
export const PETAL = {
  deepColor: '#1f050d',
  lightColor: '#a83a58',
  // Range of the map's (linear) red channel mapped onto deep → light.
  toneRange: [0.085, 0.3] as const,
  // Colour of light that has passed through a petal: warmer and more
  // saturated than the surface, like a petal held up to a lamp.
  throughColor: '#e83e62',
  throughStrength: 1.9,
  // Occlusion-map range over which a petal goes from too thick to pass light
  // (its body, pressed against its neighbours) to thin enough to glow (its lip).
  thinRange: [0.6, 1.0] as const,
  // How far diffuse light wraps past the terminator (0 = hard Lambert).
  wrap: 0.4,
  // How much the baked occlusion also dims the direct light. Without it the
  // heart of the flower is lit as brightly as the tips and reads as wax.
  directOcclusion: 0.8,
  roughness: 1.0,
  specularIntensity: 0.3,
  // Velvet: a soft bright edge at grazing angles, no highlight face-on.
  sheen: 0.7,
  sheenColor: '#e58a93',
  sheenRoughness: 0.55,
  // The same velvet without needing the light: nap seen edge-on is paler,
  // seen face-on it drinks light and goes deeper.
  velvetColor: '#d98a96',
  velvetStrength: 0.07,
  faceOnDepth: 0.55,
  // Multiplies the model's normal map, which is faint on its own.
  normalStrength: 2.2,
  // Extra relief derived from the fibres painted into the base-colour map.
  fibreRelief: 0.016,
} as const;

// --- Gold: only ever an answer to the visitor ------------------------------
export const GOLD = {
  color: '#e8b04a',
  // Gold arrives edge-first. Below the first level only the rim is lit;
  // between the two the flesh itself turns, fully gold at the second.
  bodyRange: [0.15, 1] as const,
  // Emissive lift so a chosen petal glows rather than merely changes hue.
  glow: 0.15,
  rimGlow: 0.5,
  // Hover jumps straight to this level on the first frame, then settles.
  instantLevel: 0.75,
  attackPerSecond: 28,
  releasePerSecond: 4.5,
} as const;

// --- Offering: how the rose shows, unasked, that a petal can be chosen -----
// Every level below is on the same 0–1 gold scale as hover (which is 1), and
// a petal lifts in proportion to its level — so an offered petal is a quieter
// version of a hovered one, never a different effect.
export const OFFER = {
  // Ripple: on each breath this many camera-facing petals offer themselves
  // one after another, and the group moves around the rose breath by breath.
  rippleCount: 2,
  rippleLevel: 0.45,
  // Seconds between one petal of the ripple and the next.
  rippleStaggerSeconds: 0.75,
  // Degrees the ripple advances around the rose each breath, and the half
  // width of the camera-facing arc it sweeps before wrapping.
  rippleStepDegrees: 38,
  rippleArcDegrees: 70,
  // Only petals turned at least this far toward the viewer, and at least
  // this far out from the heart (0 heart, 1 rim), are offered: the rest are
  // hidden behind others.
  facing: 0.2,
  minReach: 0.45,
  // Reach: a petal near the pointer starts to offer itself before it is
  // touched, strongest for the nearest, gone beyond this screen distance.
  reachRadiusPx: 240,
  reachLevel: 0.85,
  // Held cue when motion is reduced: this many petals stay faintly gold.
  stillCount: 2,
  stillLevel: 0.36,
  // What a fully offered (hovered) petal does: world units up and outward,
  // and degrees its lip leans away from the heart.
  lift: 0.034,
  liftOut: 0.022,
  tiltDegrees: 6,
} as const;

// Sheet + rim: the model cuts most petals into a broad sheet and a thin strip
// along its lip. Two petal meshes whose centres sit within this distance
// (world units) of each other are one petal.
export const PETAL_PAIR_DISTANCE = 0.02;

// --- The one line of words under the rose -----------------------------------
export const HINT = {
  text: 'touch a petal',
  // Session-scoped: gone for the visit once a petal has been chosen.
  storageKey: 'rose-petal-hint-seen',
} as const;

// --- Stem, leaves, thorns ---------------------------------------------------
// They keep their own maps but are pulled down toward the dark so the bloom
// is the one place colour gathers.
export const FOLIAGE = {
  tint: '#6f6a5c',
  roughness: 0.9,
} as const;

// --- Light ------------------------------------------------------------------
export const LIGHT = {
  // The single warm light. It sits behind and to the side of the rose so thin
  // petal edges are lit from within.
  color: '#ffe2cc',
  intensity: 2.6,
  // Fraction the intensity swells and falls with the breath.
  swell: 0.3,
  distance: 6,
  // Degrees. Azimuth 0 points from the rose toward the default camera.
  azimuth: 108,
  azimuthDrift: 28,
  elevation: 34,
  elevationDrift: 9,
  // The light wanders on a much slower period than the breath.
  driftSeconds: 46,
  // Ambient fill: just enough that the shadow side is flesh, not a void.
  skyFill: '#6b5560',
  groundFill: '#1a0d10',
  fillIntensity: 0.5,
  exposure: 1.0,
} as const;

// --- Breath -----------------------------------------------------------------
export const BREATH_MOTION = {
  // Degrees an outer petal's lip leans away from the heart between exhale
  // and inhale.
  petalFlareDegrees: 8,
  // World units a petal eases outward along its radial axis.
  petalSpread: 0.02,
  petalLift: 0.006,
  // The heart of the flower moves less than the rim.
  innerWeight: 0.3,
  // Seconds the outermost petal trails the heart, plus a little per-petal
  // irregularity so the rim does not move as a rigid ring.
  outerLagSeconds: 0.55,
  lagJitterSeconds: 0.18,
} as const;

// --- Camera -----------------------------------------------------------------
export const CAMERA = {
  // A longer lens than before: the bloom fills more of the frame without the
  // camera moving closer.
  fov: 40,
  // Touch devices are mostly portrait, where a long lens would push the
  // bloom past the sides of the screen; they keep the wider view.
  coarseFov: 50,
} as const;
