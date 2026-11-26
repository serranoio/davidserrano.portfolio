import type { PourEffect } from './poured-word';

// How a `{{word}}` in the preface is poured (see poured-word.ts for the
// contract). Base: the word fills with gold from the top down, readable by
// t = 0.2, then a slow sheen keeps running down through it.
export const POUR_EFFECT: PourEffect = {
  color: null,
  glyphShader: /* glsl */ `
    float level = t / 0.2;
    float fill = 1.0 - smoothstep(level - 0.08, level, uv.y);
    float edge = 1.0 - smoothstep(-aa, aa, dist);
    float sheen = 0.5 + 0.5 * sin((uv.y - time * 0.3 - t * 3.0) * 12.0);
    vec3 color = uPourColor * (0.85 + 0.35 * sheen * step(0.2, t));
    return vec4(color, edge * fill * 0.9 * uPourOpacity);
  `,
};
