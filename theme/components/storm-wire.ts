import * as THREE from 'three';
import { Text, createTextDerivedMaterial } from 'troika-three-text';
import { createDerivedMaterial } from 'troika-three-utils';
import { breath } from './breath';
import type { EffectFrame, EffectOverlay, EffectWord } from './word-effect';

// Variant A, live wire: the word is a conductor. Current crawls through its
// strokes and fine arcs flicker along the outside of its outlines, hugging
// every curve; every few seconds one surge of current runs through the
// whole word, end to end. Cool blue-white, otherwise calm.
//
// The arcs are drawn by an exact copy of the word laid over it whose only
// visible part is its outline pass: Troika's glyph distance field tells
// every fragment there how far it is from the letters, so the arcs can
// follow the real letter shapes.

// Electric blue-white.
export const STORM_COLOR = '#b9d4ff';

// Seconds between surges, and how long one takes to cross the word.
export const STORM_SURGE = { period: 3.2, cross: 0.6 } as const;

// How far from the letters the arcs may wander, in font sizes.
const REACH = 0.16;

// Shared by the glyph shader and the arcs. Every name starts with `storm`.
export const STORM_SHARED_GLSL = /* glsl */ `
  #define STORM_SURGE_PERIOD ${STORM_SURGE.period.toFixed(3)}
  #define STORM_SURGE_CROSS ${STORM_SURGE.cross.toFixed(3)}
  #define STORM_HOT vec3(0.9, 0.96, 1.0)
  #define STORM_DEEP vec3(0.42, 0.62, 1.0)

  float stormHash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float stormNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(stormHash(i), stormHash(i + vec2(1.0, 0.0)), u.x),
               mix(stormHash(i + vec2(0.0, 1.0)), stormHash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  // The charge comes up as the word rises into view.
  float stormCharge(float t) {
    return smoothstep(0.08, 0.24, t) * (1.0 - smoothstep(0.93, 1.0, t));
  }
  // The current surge: x = where its front is along the word (0 left – 1
  // right; off the word between surges), y = 1 while it runs. Every surge
  // is the same; none under reduced motion.
  vec2 stormSurge(float time, float still) {
    float s = fract(time / STORM_SURGE_PERIOD) * STORM_SURGE_PERIOD;
    float front = s / STORM_SURGE_CROSS;
    float on = (1.0 - smoothstep(1.0, 1.3, front)) * (1.0 - still);
    return vec2(front * 1.3 - 0.15, on);
  }
`;

const ARC_DEFS = /* glsl */ `
  ${STORM_SHARED_GLSL}
  uniform float uFs;
  uniform float uWidth;
  uniform float uT;
  uniform float uTime;
  uniform float uStill;
  uniform float uOpacity;
  varying vec2 vStormLocal;
`;

// Runs once Troika has worked out the glyph shape. Only the outline pass
// draws: the word's own fill is the real word underneath.
const ARC_TRANSFORM = /* glsl */ `
  if (uTroikaEdgeOffset <= 0.0) discard;
  float d = troikaGetFragDistValue();
  vec2 q = vStormLocal / uFs;
  float u = vStormLocal.x / uWidth;
  float charge = stormCharge(uT);
  vec2 surge = stormSurge(uTime, uStill);
  float at = exp(-pow((u - surge.x) / 0.07, 2.0)) * surge.y;

  // Fine, jagged arcs hugging the outline in short stretches that crawl
  // along the letters; their shape re-strikes many times a second, so they
  // crackle like live current instead of tracing the letters.
  float strike = floor(uTime * 14.0) * (1.0 - uStill);
  vec2 jump = vec2(stormHash(vec2(strike, 1.3)), stormHash(vec2(strike, 7.9))) * 40.0;
  float r = uFs * (0.006 + 0.06 * stormNoise(q * 11.0 + jump));
  float lw = max(uFs * 0.006, fwidth(d) * 0.7);
  float line = 1.0 - smoothstep(lw * 0.5, lw * 1.6, abs(d - r));
  float present = smoothstep(0.6, 0.76, stormNoise(q * 2.6 + vec2(-uTime * 1.5, uTime * 0.7)) + at * 0.3);
  float flicker = 0.75 + 0.25 * stormHash(vec2(strike, 3.1));
  float arcs = line * present * flicker;
  // A faint ionised glow around the letters, brighter where the surge is.
  float outside = smoothstep(0.0, uFs * 0.01, d);
  float halo = exp(-max(d, 0.0) / (uFs * 0.025)) * outside * (0.03 + 0.35 * at);

  float a = clamp(arcs * (0.55 + 0.6 * at) + halo, 0.0, 1.0) * charge * uOpacity;
  gl_FragColor = vec4(mix(STORM_DEEP, STORM_HOT, arcs), a);
  if (gl_FragColor.a < 0.003) discard;
`;

// Each character's caret: start x, end x, bottom y, top y (Troika lays
// these out for every Text; the local type declaration doesn't list them).
function carets(text: Text): Float32Array | undefined {
  return (text.textRenderInfo as { caretPositions?: Float32Array } | null)?.caretPositions;
}

// The arcs around one word: an exact copy of it, laid over it, drawing only
// light outside its letters.
export function createStormWire(word: EffectWord): EffectOverlay {
  const source = word.mesh;
  const fs = word.fontSize;
  const uniforms = {
    uFs: { value: fs },
    uWidth: { value: Math.max(word.right - word.left, 1e-5) },
    uT: { value: 0 },
    uTime: { value: 0 },
    uStill: { value: 0 },
    uOpacity: { value: 1 },
  };

  const text = new Text();
  text.text = word.text;
  text.font = source.font;
  text.fontSize = source.fontSize;
  text.lineHeight = source.lineHeight;
  text.letterSpacing = source.letterSpacing;
  text.anchorX = 'left';
  text.anchorY = 'top';
  text.outlineWidth = REACH * fs;
  text.material = new THREE.MeshBasicMaterial({
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
  });
  text.createDerivedMaterial = (base) => {
    const located = createDerivedMaterial(base, {
      chained: true,
      vertexDefs: 'varying vec2 vStormLocal;',
      // `position` here is Troika's laid-out glyph corner.
      vertexMainIntro: 'vStormLocal = position.xy;',
    });
    return createDerivedMaterial(createTextDerivedMaterial(located), {
      chained: true,
      uniforms,
      fragmentDefs: ARC_DEFS,
      fragmentColorTransform: ARC_TRANSFORM,
    });
  };
  text.frustumCulled = false;
  text.raycast = () => {};
  // After the words: its light adds onto the night around them.
  text.renderOrder = 0.5;
  // Once laid out, move it so its first character sits exactly where the
  // word's first character does in the paragraph.
  text.sync(() => {
    const mine = carets(text);
    const theirs = carets(source);
    if (!mine || !theirs) return;
    text.position.set(theirs[word.start * 4] - mine[0], theirs[word.start * 4 + 2] - mine[2], 0.001);
  });

  return {
    object: text,
    update({ t, time, opacity }: EffectFrame) {
      uniforms.uT.value = t;
      uniforms.uTime.value = time;
      uniforms.uStill.value = breath.still ? 1 : 0;
      uniforms.uOpacity.value = opacity;
      text.visible = opacity > 0.001 && t > 0.05;
    },
    dispose() {
      (text.material as THREE.Material).dispose();
      text.dispose();
    },
  };
}
