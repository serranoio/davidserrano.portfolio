import type { WordEffect } from './word-effect';
import { BEAT_COLOR, BEAT_SHARED_GLSL, createBeatBloom } from './beat-swell';

// How a `{{beat:word}}` in the preface beats like a heart (see
// word-effect.ts for the contract). Proposal A, swell: on every beat the
// letters swell and settle, the centre of the word moving a beat
// before its ends like muscle contracting, and the crimson flushes bright. Behind the word a faint warm
// bloom breathes with it (beat-swell.ts). Every beat word shares one heart,
// so both "passion"s beat together.

export const BEAT_EFFECT: WordEffect = {
  color: BEAT_COLOR,
  // The beat runs the whole way across the screen.
  progress: (pass) => pass,
  glyphDefs: BEAT_SHARED_GLSL,
  glyphShader: /* glsl */ `
    float edge = 1.0 - smoothstep(-aa, aa, dist);
    // The same staggered beat the glyph's shape feels.
    float spread = abs(uv.x - 0.5) * 2.0;
    float pulse = beatPulse(time - spread * BEAT_SPREAD) * beatStrength(t);
    // At rest a deep, calm crimson; each beat flushes it bright and warm.
    vec3 rest = tint * vec3(0.78, 0.62, 0.66);
    vec3 flush = mix(tint, vec3(1.0, 0.5, 0.56), 0.18) * 1.1;
    vec3 color = mix(rest, flush, pulse);
    // A touch more light toward the letters' cores than their edges.
    color *= 1.0 + 0.12 * pulse * smoothstep(0.0, -aa * 3.0, dist);
    return vec4(color, edge * mix(0.9, 1.0, pulse) * uWordOpacity);
  `,
  vertexDefs: BEAT_SHARED_GLSL,
  vertexShader: /* glsl */ `
    vec2 centre = (rect.xy + rect.zw) * 0.5;
    float halfWidth = max((rect.z - rect.x) * 0.5, 1e-5);
    float spread = clamp(abs(glyph.x - centre.x) / halfWidth, 0.0, 1.0);
    float pulse = beatPulse(time - spread * BEAT_SPREAD) * beatStrength(t);
    // Each glyph swells about its own centre and is carried outward a
    // little with the whole word, so the letters never crowd each other.
    vec2 fromWord = glyph - centre;
    vec2 moved = centre + fromWord * (1.0 + 0.04 * pulse);
    return moved + (corner - glyph) * (1.0 + 0.085 * pulse);
  `,
  createOverlay: createBeatBloom,
};
