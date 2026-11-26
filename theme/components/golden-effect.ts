import type { WordEffect } from './word-effect';

// How a `{{golden:word}}` in the preface is precious and golden, at the perfect ratio (see word-effect.ts
// for the contract; GLSL names defined here start with `golden`).
// Base placeholder: the word in its colour. Each variant replaces this.

export const GOLDEN_COLOR = '#d4af37';

export const GOLDEN_EFFECT: WordEffect = {
  color: GOLDEN_COLOR,
  // 0 as the word enters at the bottom of the screen, 1 as it leaves the top.
  progress: (pass) => pass,
  glyphShader: /* glsl */ `
    float edge = 1.0 - smoothstep(-aa, aa, dist);
    return vec4(mix(base.rgb, tint, 0.8), edge * 0.95 * uWordOpacity);
  `,
};
