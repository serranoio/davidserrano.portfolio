import type { WordEffect } from './word-effect';
import { STORM_COLOR, STORM_SHARED_GLSL, createStormWire } from './storm-wire';

// How a `{{storm:word}}` in the preface is electrified (see word-effect.ts
// for the contract; GLSL names defined here start with `storm`). Variant A,
// live wire: the word is a conductor. Current crawls through its strokes,
// fine arcs flicker along its outlines (storm-wire.ts), and every few
// seconds one surge runs through the whole word, end to end.

export { STORM_COLOR };

export const STORM_EFFECT: WordEffect = {
  color: STORM_COLOR,
  // 0 as the word enters at the bottom of the screen, 1 as it leaves the top.
  progress: (pass) => pass,
  glyphDefs: STORM_SHARED_GLSL,
  glyphShader: /* glsl */ `
    float aspect = size.x / size.y;
    float edge = 1.0 - smoothstep(-aa, aa, dist);
    float charge = stormCharge(t);
    // Cool and pale with charge.
    vec3 color = mix(base.rgb, tint, 0.7 * charge);
    // Current crawling through the strokes: bright threads drifting along.
    float n = stormNoise(vec2(uv.x * aspect * 9.0 - time * 2.6, uv.y * 5.0 + time * 0.8)) * 0.6
      + stormNoise(vec2(uv.x * aspect * 17.0 + time * 3.4, uv.y * 9.0 - time * 1.3)) * 0.4;
    float crawl = smoothstep(0.6, 0.85, n);
    // The surge lights the letters as it passes through them.
    vec2 surge = stormSurge(time, uWordStill);
    float at = exp(-pow((uv.x - surge.x) / 0.07, 2.0)) * surge.y;
    color = mix(color, STORM_HOT, clamp((crawl * 0.5 + at * 0.85) * charge, 0.0, 0.9));
    return vec4(color, edge * 0.96 * uWordOpacity);
  `,
  createOverlay: createStormWire,
};
