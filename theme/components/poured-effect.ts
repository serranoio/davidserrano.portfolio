import type { PourEffect } from './poured-word';
import { POUR_COLOR, POUR_SHARED_GLSL, createPourStream } from './poured-stream';

// How a `{{word}}` in the preface is poured (see poured-word.ts for the
// contract). Variant B, stream and pool: a fine thread of gold falls onto
// the word and the letters fill from the bottom up under a calm surface. By
// t = 0.2 they are full and readable. The thread never stops: it drifts
// along the word, its light spreading where it lands, while a slow glow
// keeps settling down through the gold (the thread is poured-stream.ts).
export const POUR_EFFECT: PourEffect = {
  color: POUR_COLOR,
  glyphDefs: POUR_SHARED_GLSL,
  glyphShader: /* glsl */ `
    float aspect = size.x / size.y;
    float edge = 1.0 - smoothstep(-aa, aa, dist);
    float filling = 1.0 - smoothstep(FULL_AT - 0.03, FULL_AT, t);

    // The surface (uv.y; below it is filled): a low swell where the stream
    // lands and a slow, shallow wave while it is still rising.
    float dx = (uv.x - pourStreamU(t)) * aspect;
    float surface = pourSurface(t)
      - 0.035 * pourRate(t) * exp(-dx * dx * 30.0)
      - filling * 0.012 * sin(uv.x * aspect * 7.0 - time * 1.6 + seed * 6.28);
    float aaUv = max(aa / size.y, 0.004);
    float filled = smoothstep(surface - aaUv, surface + aaUv, uv.y);

    // Pale gold at the surface, deepening gently toward the base.
    float depth = clamp((uv.y - surface) / 0.8, 0.0, 1.0);
    vec3 gold = mix(mix(uPourColor, POUR_HOT, 0.3), uPourColor * vec3(0.9, 0.78, 0.55), depth);
    // A fine bright line at the surface while it rises.
    gold = mix(gold, POUR_HOT, exp(-pow((uv.y - surface) / 0.02, 2.0)) * filling * 0.7);

    // Once full the pour carries on: light spreads from where the thread
    // lands, and a soft band keeps settling down through the letters.
    float after = smoothstep(FULL_AT - 0.02, FULL_AT + 0.1, t);
    float spread = exp(-dx * dx * 3.0) * (1.0 - 0.6 * uv.y);
    float band = fract(time * 0.08 + t * 1.2 + seed);
    float settle = exp(-pow((uv.y - mix(-0.3, 1.3, band)) / 0.14, 2.0));
    gold = mix(gold, POUR_HOT, after * clamp(0.35 * spread + 0.3 * settle, 0.0, 0.6));

    // The empty mould: barely there.
    vec3 color = mix(base.rgb, gold, filled);
    float alpha = mix(0.06, 0.95, filled);
    return vec4(color, edge * alpha * uPourOpacity);
  `,
  createOverlay: createPourStream,
};
