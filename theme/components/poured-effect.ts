import type { PourEffect } from './poured-word';
import { POUR_COLOR, POUR_SHARED_GLSL, createPourDrips } from './poured-drips';

// How a `{{word}}` in the preface is poured (see poured-word.ts for the
// contract). Variant B, pool and drips: the letters fill with gold from the
// bottom up under a calm surface and are full and readable by t = 0.2. Then
// they brim over: a soft light keeps settling down through the gold, and a
// few drips (poured-drips.ts) slowly gather and lengthen beneath them.
export const POUR_EFFECT: PourEffect = {
  color: POUR_COLOR,
  glyphDefs: POUR_SHARED_GLSL,
  glyphShader: /* glsl */ `
    float aspect = size.x / size.y;
    float edge = 1.0 - smoothstep(-aa, aa, dist);
    float filling = 1.0 - smoothstep(FULL_AT - 0.03, FULL_AT, t);

    // The surface (uv.y; below it is filled): a slow, shallow wave while it
    // is still rising.
    float surface = pourSurface(t)
      - filling * 0.012 * sin(uv.x * aspect * 7.0 - time * 1.6 + seed * 6.28);
    float aaUv = max(aa / size.y, 0.004);
    float filled = smoothstep(surface - aaUv, surface + aaUv, uv.y);

    // Pale gold at the surface, deepening gently toward the base.
    float depth = clamp((uv.y - surface) / 0.8, 0.0, 1.0);
    vec3 gold = mix(mix(uPourColor, POUR_HOT, 0.3), uPourColor * vec3(0.9, 0.78, 0.55), depth);
    // A fine bright line at the surface while it rises.
    gold = mix(gold, POUR_HOT, exp(-pow((uv.y - surface) / 0.02, 2.0)) * filling * 0.7);

    // Once full the pour carries on: a soft band of light keeps settling
    // down through the letters toward the drips.
    float after = smoothstep(FULL_AT - 0.02, FULL_AT + 0.1, t);
    float band = fract(time * 0.08 + t * 1.2 + seed);
    float settle = exp(-pow((uv.y - mix(-0.3, 1.3, band)) / 0.14, 2.0));
    gold = mix(gold, POUR_HOT, after * 0.3 * settle);

    // The empty mould: barely there.
    vec3 color = mix(base.rgb, gold, filled);
    float alpha = mix(0.06, 0.95, filled);
    return vec4(color, edge * alpha * uPourOpacity);
  `,
  createOverlay: createPourDrips,
};
