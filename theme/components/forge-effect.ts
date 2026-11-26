import type { WordEffect } from './word-effect';
import { FORGE_COLOR, FORGE_SHARED_GLSL, createForgeSparks } from './forge-sparks';

// How a `{{forge:word}}` in the preface looks like it was forged (see
// word-effect.ts for the contract; GLSL names defined here start with
// `forge`). Variant A, struck on the anvil: the word rises out of the fire
// soft-edged, a little tall and glowing, and the hammer strikes it on a
// steady beat while it is in the fire. Every blow is the same: it squashes
// the word and springs back, flares its heat and throws a short spray of
// sparks (forge-sparks.ts). As it climbs, the work finishes its shape and
// it cools, ending as crisp, dark tempered steel with a cold edge.

export const FORGE_EFFECT: WordEffect = {
  color: FORGE_COLOR,
  // 0 as the word enters at the bottom of the screen, 1 as it leaves the top.
  progress: (pass) => pass,
  glyphDefs: FORGE_SHARED_GLSL,
  glyphShader: /* glsl */ `
    float fs = size.y / FORGE_LINE_EM;
    float heat = forgeHeat(t, time, uWordStill);
    float rough = forgeRough(t);
    // Unworked metal has a soft, glowing edge; each blow sharpens it.
    float soft = aa + rough * fs * 0.03;
    float edge = smoothstep(soft, -aa, dist);

    // Tempered steel: dark and blued, lit along its edges and from above.
    float rim = 1.0 - smoothstep(0.0, fs * 0.022, -dist);
    vec3 steel = mix(vec3(0.4, 0.45, 0.54), vec3(0.58, 0.62, 0.7), 1.0 - uv.y);
    steel = mix(steel, vec3(0.86, 0.9, 0.98), rim * 0.75);
    // Hot metal is brightest in its body; the edges cool first.
    vec3 hot = forgeGlow(heat * mix(0.82, 1.0, smoothstep(0.0, -fs * 0.03, dist)));
    vec3 color = mix(steel, hot, smoothstep(0.02, 0.3, heat));
    return vec4(color, edge * 0.97 * uWordOpacity);
  `,
  vertexDefs: FORGE_SHARED_GLSL,
  vertexShader: /* glsl */ `
    float h = rect.w - rect.y;
    float baseline = rect.y + h * (1.0 - FORGE_BASELINE);
    float jolt = forgeJolts(t, time, uWordStill);
    float rough = forgeRough(t);
    // Each blow squashes the letters onto their baseline and spreads them;
    // until the last, they stand a little tall and narrow, unfinished.
    float sy = 1.0 + 0.09 * rough - 0.16 * jolt;
    float sx = 1.0 - 0.03 * rough + 0.07 * jolt;
    return vec2(glyph.x + (corner.x - glyph.x) * sx, baseline + (corner.y - baseline) * sy);
  `,
  createOverlay: createForgeSparks,
};
