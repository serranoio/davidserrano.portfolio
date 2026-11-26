import type { WordEffect } from './word-effect';
import { GOLDEN_COLOR, createGoldenGrid } from './golden-grid';

// How a `{{golden:phrase}}` in the preface is precious and golden, at the
// perfect ratio (see word-effect.ts for the contract; GLSL names defined
// here start with `golden`). Variant B, gold leaf, measured: the letters are
// burnished gold leaf — laid in faintly uneven square sheets, with a warm
// sheen that slides across as the phrase rises and a rare, tiny glint — and
// beneath them a hairline dimension line measures each word at its golden
// sections (golden-grid.ts).

const LEAF_GLSL = /* glsl */ `
  float goldenHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
`;

export const GOLDEN_EFFECT: WordEffect = {
  color: GOLDEN_COLOR,
  // 0 as the phrase enters at the bottom of the screen, 1 as it leaves the top.
  progress: (pass) => pass,
  glyphDefs: LEAF_GLSL,
  glyphShader: /* glsl */ `
    float fs = size.y / 1.211;
    float edge = 1.0 - smoothstep(-aa, aa, dist);
    vec2 q = uv * size / fs;            // position in font sizes
    // Leaf: square sheets, each a shade apart, laid edge to edge.
    vec2 sheet = floor(q / 0.42 + seed * 7.0);
    float shade = goldenHash(sheet) - 0.5;
    vec3 leaf = tint * (1.06 + 0.1 * shade) * vec3(1.0, 0.97, 0.9);
    // Burnished: deeper in the letters' feet, a warm sheen across them that
    // slides with the scroll, as if the page tilted under a lamp.
    leaf *= mix(0.84, 1.0, smoothstep(0.92, 0.5, uv.y));
    float sheenAt = mix(-0.4, 1.4, t);
    float sheen = exp(-pow((uv.x + (0.5 - uv.y) * 0.25 - sheenAt) / 0.22, 2.0));
    leaf = mix(leaf, vec3(1.0, 0.92, 0.72), 0.45 * sheen);
    // A rare, tiny glint: one cell at a time catches the light, slowly.
    vec2 cell = floor(q / 0.16);
    float h = goldenHash(cell + seed * 13.0);
    float phase = fract(time * 0.11 + h * 7.0);
    float twinkle = smoothstep(0.0, 0.04, phase) * smoothstep(0.1, 0.04, phase) * step(0.93, h);
    vec2 f = fract(q / 0.16) - 0.5;
    float star = exp(-dot(f, f) * 40.0) + 0.5 * exp(-abs(f.x) * 40.0 - abs(f.y) * 6.0) + 0.5 * exp(-abs(f.y) * 40.0 - abs(f.x) * 6.0);
    leaf = mix(leaf, vec3(1.0, 0.98, 0.9), clamp(twinkle * star, 0.0, 1.0));
    return vec4(leaf, edge * 0.97 * uWordOpacity);
  `,
  createOverlay: createGoldenGrid,
};
