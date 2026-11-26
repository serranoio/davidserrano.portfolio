import type { WordEffect } from './word-effect';
import { POTENTIAL_COLOR, createPotentialGhosts } from './potential-ghosts';

// How a `{{potential:word}}` in the preface holds its potential (see
// word-effect.ts for the contract; GLSL names defined here start with
// `potential`). Variant B, possibilities: faint copies of the word drift a
// little apart from it, what it could become, and are drawn back into it as
// it rises. Settled, the word keeps a soft halo of what is still unrealized
// (the copies are potential-ghosts.ts). The word itself firms up from a
// cool, uncertain violet to a clear pale light as its possibilities gather.

export { POTENTIAL_COLOR };

export const POTENTIAL_EFFECT: WordEffect = {
  color: POTENTIAL_COLOR,
  // 0 as the word enters at the bottom of the screen, 1 as it leaves the top.
  progress: (pass) => pass,
  glyphShader: /* glsl */ `
    float edge = 1.0 - smoothstep(-aa, aa, dist);
    // The same settling curve the ghosts follow.
    float x = clamp((t - 0.08) / 0.52, 0.0, 1.0);
    float settle = x * x * (3.0 - 2.0 * x);
    vec3 uncertain = mix(base.rgb, tint, 0.75) * 0.85;
    vec3 clear = mix(base.rgb, tint, 0.35) * 1.05;
    vec3 color = mix(uncertain, clear, settle);
    return vec4(color, edge * mix(0.82, 0.96, settle) * uWordOpacity);
  `,
  createOverlay: createPotentialGhosts,
};
