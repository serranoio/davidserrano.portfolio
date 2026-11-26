import type { WordEffect } from './word-effect';

// How a `{{potential:word}}` in the preface holds its potential (see word-effect.ts
// for the contract; GLSL names defined here start with `potential`).
// Base placeholder: the word in its colour. Each variant replaces this.

export const POTENTIAL_COLOR = '#c9b6ff';

export const POTENTIAL_EFFECT: WordEffect = {
  color: POTENTIAL_COLOR,
  // 0 as the word enters at the bottom of the screen, 1 as it leaves the top.
  progress: (pass) => pass,
  glyphShader: /* glsl */ `
    float edge = 1.0 - smoothstep(-aa, aa, dist);
    return vec4(mix(base.rgb, tint, 0.8), edge * 0.95 * uWordOpacity);
  `,
};
