import type { WordEffect } from './word-effect';

// How a `{{forge:word}}` in the preface looks like it was forged (see word-effect.ts
// for the contract; GLSL names defined here start with `forge`).
// Base placeholder: the word in its colour. Each variant replaces this.

export const FORGE_COLOR = '#ff8a3d';

export const FORGE_EFFECT: WordEffect = {
  color: FORGE_COLOR,
  // 0 as the word enters at the bottom of the screen, 1 as it leaves the top.
  progress: (pass) => pass,
  glyphShader: /* glsl */ `
    float edge = 1.0 - smoothstep(-aa, aa, dist);
    return vec4(mix(base.rgb, tint, 0.8), edge * 0.95 * uWordOpacity);
  `,
};
