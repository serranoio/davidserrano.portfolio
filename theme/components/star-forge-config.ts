// The star that forges Stormbreaker: under the Stormbreaker paragraph of the
// preface a star gathers, ignites and beams its light onto the golden rose.
//
// Everything here is driven by the star slot's local scroll progress t (0–1),
// so the same page position always renders the same frame. Time only adds a
// slow turbulence to the corona and a drift to the dust, and is frozen under
// reduced motion.
//
// Distances are world units of the rose scene; intensities above 1 are HDR
// and are compressed (toward white) by the renderer's Neutral tone mapping.

export const STAR_FORGE = {
  // The marker line in docs/sections/truth-statement.txt that reserves the
  // star's slot, and how many paragraph slots of extra scroll it adds.
  slot: { name: 'star', span: 1.5 },

  // Choreography over t. Each beat is [start, end].
  phases: {
    gather: [0, 0.25] as const,
    ignite: [0.25, 0.55] as const,
    // The beam rises over `beam` and reaches the rose by `beamReach`.
    beam: [0.55, 0.72] as const,
    beamReach: [0.55, 0.66] as const,
    afterglow: [0.8, 1] as const,
  },

  // Where the star sits: below the Stormbreaker paragraph and off to one
  // side of the rose, deep behind the words so the scroll carries it up
  // slower than the text (parallax). Offsets are from the opening
  // paragraph's place on the text plane: pushed away from the camera, to
  // camera-right, and up.
  placement: {
    // 0 = fixed in the sky, 1 = moves with the text.
    parallax: 0.5,
    depth: 2.2,
    lateral: { wide: 1.7, narrow: 0.75 },
    lift: 0.15,
  },

  // The star itself: a white-hot core whose glare falls off like 1/r² and is
  // baked into one billboard. Radii are world units at the star.
  star: {
    // Billboard half-size: the glare must have faded to nothing well inside it.
    extent: 1.35,
    pinprickRadius: 0.006,
    coreRadius: 0.05,
    emberRadius: 0.014,
    // Peak HDR brightness of the core at full ignition (the pinprick and the
    // ember are small fractions of it).
    coreIntensity: 9,
    pinprickIntensity: 0.9,
    emberIntensity: 0.55,
    // The glare: amplitude relative to the core and the radius where it has
    // halved. A second, wider and much fainter term is the scattered sky glow.
    glareGain: 0.55,
    glareRadius: 0.035,
    haloGain: 0.028,
    haloRadius: 0.34,
    // Corona turbulence: how much the noise modulates the inner glow, its
    // spatial scale (cycles per world unit) and how fast it churns.
    turbulence: 0.42,
    turbulenceScale: 22,
    turbulenceSpeed: 0.11,
  },

  // Blackbody ramp, by local brightness: the hottest light is white, it cools
  // through pale gold into deep amber — never a saturated orange.
  colors: {
    white: '#fff7ee',
    paleGold: '#ffdba4',
    amber: '#c9813c',
    // Brightness thresholds for amber→gold and gold→white.
    goldAt: 0.35,
    whiteAt: 2.2,
  },

  // The beam: a ribbon that always faces the camera with a gaussian cross
  // section. `sigma` is its core radius; the scatter term is the faint
  // airglow around it. Widths are world units.
  beam: {
    sigma: { wide: 0.011, narrow: 0.0075 },
    // How much thinner the beam is by the end of the afterglow.
    thinTo: 0.5,
    scatterSigmaScale: 7,
    scatterGain: 0.045,
    // HDR brightness of the beam's core line at full power.
    intensity: 1.8,
    // The ribbon is wider than the scatter so its edge carries no light; the
    // outer half of it fades to zero regardless.
    halfWidthSigmas: 24,
    // Soft ends: the beam fades in over this fraction of its length at the
    // star and lands softly at the rose.
    endSoftness: 0.08,
    // Travelling shimmer along the beam: depth and spatial frequency.
    shimmer: 0.14,
    shimmerScale: 6,
    shimmerSpeed: 0.35,
    // The beam lands this far short of the bloom's centre, inside the petals.
    landingInset: 0.12,
    // Ribbon segments along its length.
    segments: 64,
  },

  // Dust in the beam: motes drifting through the light catch it (the Tyndall
  // effect). Only motes inside the beam are lit.
  dust: {
    count: { wide: 900, narrow: 320 },
    // Radial spread around the axis, and the radius of the beam's faint
    // outer light that still catches a mote, both in beam sigmas.
    spreadSigmas: 4,
    litSigmas: 2.2,
    // Pixel size range at a reference distance of one world unit.
    sizePx: [1.8, 4.2] as const,
    // Distance along the beam the motes drift across the slot (fraction of
    // the beam's length), plus a slow wander over time.
    scrollDrift: 0.22,
    timeDriftPerSec: 0.006,
    wobble: 0.012,
    wobbleHz: 0.07,
    // HDR brightness of a mote sitting on the beam axis.
    intensity: 3.5,
    // Henyey–Greenstein anisotropy: dust scatters mostly forward, so motes
    // glitter most when the beam is coming toward the viewer.
    anisotropy: 0.55,
  },

  // Where the beam lands, a soft warm bloom on the petals.
  landing: {
    radius: 0.045,
    intensity: 0.7,
    glareGain: 0.25,
    extent: 0.3,
  },

  // Real light on the rose from the star's direction.
  light: {
    color: '#fff0d8',
    // Intensity at the rose, independent of the star's distance.
    intensity: 4.5,
    angleDegrees: 9,
    penumbra: 1,
  },

  // Petals gild under the beam (setPetalGold level).
  gild: 0.3,

  // The sky answers the star: it dims slightly as the star gathers, and
  // warms subtly while it burns.
  sky: {
    dim: 0.32,
    warmth: '#2a1606',
    warmthGain: 0.6,
  },
  // Meteors and stars quieten while the star gathers.
  meteorDim: 0.55,

  // Draw order: just behind the text, which is drawn after the star.
  renderOrder: -0.5,
} as const;

export type StarForgeLayout = 'wide' | 'narrow';
