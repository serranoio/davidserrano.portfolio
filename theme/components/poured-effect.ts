import type { PourEffect } from './poured-word';
import { POUR_COLOR, POUR_SHARED_GLSL, createPourStream } from './poured-stream';

// How a `{{word}}` in the preface is poured (see poured-word.ts for the
// contract). Variant B, stream and pool: a thin stream of liquid gold falls
// from high above onto the word and the letters fill from the bottom up,
// like a mould being poured. By t = 0.2 they are full and readable; the
// stream never stops, sweeping along the word, so the letters brim over:
// a glowing sheet runs down their edges and drips gather beneath them
// (drips and stream are drawn by poured-stream.ts).
export const POUR_EFFECT: PourEffect = {
  color: POUR_COLOR,
  glyphDefs: POUR_SHARED_GLSL,
  glyphShader: /* glsl */ `
    float fs = size.y / LINE_EM;
    float aspect = size.x / size.y;
    float edge = 1.0 - smoothstep(-aa, aa, dist);

    // The liquid's surface (uv.y; below it is filled). A mound where the
    // stream lands, and a slosh that the filling keeps stirring.
    float surface = pourSurface(t);
    float flow = pourRate(t);
    float dx = (uv.x - pourStreamU(t)) * aspect;
    float mound = 0.07 * flow * exp(-dx * dx * 40.0);
    float filling = 1.0 - smoothstep(0.17, 0.2, t);
    float slosh = filling * (0.022 * sin(uv.x * aspect * 13.0 - time * 3.1 + seed * 6.28)
      + 0.014 * sin(uv.x * aspect * 29.0 + time * 4.3));
    surface -= mound + slosh;
    float aaUv = max(aa / size.y, 0.004);
    float filled = smoothstep(surface - aaUv, surface + aaUv, uv.y);

    // Molten gold: brightest just under the surface, deepening to amber.
    float depth = clamp((uv.y - surface) / 0.7, 0.0, 1.0);
    vec3 gold = mix(uPourColor * 1.3, uPourColor * vec3(0.95, 0.75, 0.45), depth);
    // Slow currents stirred by the stream.
    float current = pourNoise(vec2(uv.x * aspect * 7.0 + time * 0.25, uv.y * 5.0 - time * 0.9));
    gold *= 0.9 + 0.22 * current;
    // A bright meniscus line at the surface while it is still in the glyphs.
    float meniscus = exp(-pow((uv.y - surface) / 0.025, 2.0)) * filling;
    gold = mix(gold, POUR_HOT, meniscus * 0.6);

    // Once brim-full, the overflow: a glowing sheet runs down the letter
    // edges, streaked by the flow, growing as the pour goes on.
    float over = smoothstep(0.19, 0.32, t) * (0.55 + 0.45 * t);
    float rim = exp(dist / (fs * 0.03));
    float streak = smoothstep(0.35, 0.85,
      pourNoise(vec2(uv.x * aspect * 22.0 + seed * 9.0, uv.y * 2.5 - time * 1.4)));
    float sheet = over * (0.2 * rim + 1.1 * streak);
    // Fresh gold spreads from where the stream lands.
    sheet += over * 0.5 * exp(-dx * dx * 6.0) * smoothstep(0.6, 0.0, uv.y);
    gold = mix(gold, POUR_HOT, clamp(sheet, 0.0, 0.85));

    // The empty mould: barely there.
    vec3 color = mix(base.rgb, gold, filled);
    float alpha = mix(0.06, 0.95, filled);
    return vec4(color, edge * alpha * uPourOpacity);
  `,
  createOverlay: createPourStream,
};
