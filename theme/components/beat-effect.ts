import type { WordEffect } from './word-effect';

// How a `{{beat:word}}` in the preface beats like a heart (see
// word-effect.ts for the contract). Base: the word swells on each
// lub-dub and flushes crimson.

// The night palette's crimson (--color-crimson-light).
export const BEAT_COLOR = '#e83e62';

// The heartbeat every beat effect shares: a resting heart, lub then dub.
export const BEAT_SHARED_GLSL = /* glsl */ `
  // Seconds per beat (about 66 bpm), and when in it the dub follows the lub.
  #define BEAT_PERIOD 0.9
  #define BEAT_DUB 0.2
  // 0 at rest, 1 at the peak of the lub; the dub is a softer echo.
  float beatPulse(float time, float seed) {
    float phase = fract(time / BEAT_PERIOD + seed * 0.37);
    float lub = exp(-pow((phase - 0.04) / 0.045, 2.0));
    float dub = 0.6 * exp(-pow((phase - 0.04 - BEAT_DUB) / 0.05, 2.0));
    return max(lub, dub);
  }
`;

export const BEAT_EFFECT: WordEffect = {
  color: BEAT_COLOR,
  // The beat runs the whole way across the screen.
  progress: (pass) => pass,
  glyphDefs: BEAT_SHARED_GLSL,
  glyphShader: /* glsl */ `
    float edge = 1.0 - smoothstep(-aa, aa, dist);
    float pulse = beatPulse(time, seed);
    vec3 color = mix(base.rgb, tint, 0.55 + 0.45 * pulse);
    return vec4(color, edge * 0.95 * uWordOpacity);
  `,
  vertexDefs: BEAT_SHARED_GLSL,
  vertexShader: /* glsl */ `
    vec2 centre = (rect.xy + rect.zw) * 0.5;
    return centre + (corner - centre) * (1.0 + 0.08 * beatPulse(time, seed));
  `,
};
