import * as THREE from 'three';
import { breath } from './breath';
import type { EffectFrame, EffectOverlay, EffectWord } from './word-effect';

// Variant A, struck on the anvil: the forge's timeline, shared by the glyphs
// (forge-effect.ts) and the overlay below, and the overlay itself — the
// spray of sparks each hammer blow throws, and the faint glow of the hot
// metal. The hammer keeps a smith's steady beat on the clock for as long as
// the word is in the fire; the scroll decides how hot it still is and how
// finished its shape, so the same scroll position always shows the same
// stage of the work, struck in the same rhythm.

// Hot iron, as the word first appears.
export const FORGE_COLOR = '#ff8a3d';

// The hammer: one blow every `period` seconds while the word is in the
// fire, from `start` to `end` of its pass up the screen (it rises through
// the lower half and is finished by the middle).
export const FORGE_RHYTHM = { period: 0.7, start: 0.2, end: 0.46 } as const;

export const FORGE_SHARED_GLSL = /* glsl */ `
  #define FORGE_LINE_EM 1.211
  // Baseline, as a fraction of the line box from its top.
  #define FORGE_BASELINE 0.763
  #define FORGE_PERIOD ${FORGE_RHYTHM.period.toFixed(3)}
  #define FORGE_START ${FORGE_RHYTHM.start.toFixed(3)}
  #define FORGE_END ${FORGE_RHYTHM.end.toFixed(3)}

  // 1 while the word is in the fire, easing in and out at the ends.
  float forgeInFire(float t) {
    return smoothstep(FORGE_START, FORGE_START + 0.02, t) * (1.0 - smoothstep(FORGE_END - 0.03, FORGE_END, t));
  }
  // Seconds since the last blow landed.
  float forgeSinceBlow(float time) {
    return fract(time / FORGE_PERIOD) * FORGE_PERIOD;
  }
  // Which blow that was (for varying where it lands).
  float forgeBlowIndex(float time) {
    return floor(time / FORGE_PERIOD);
  }
  // The jolt of a blow: a hard squash that springs back with one small
  // rebound, the same every time. Held at rest under reduced motion.
  float forgeJolts(float t, float time, float still) {
    float a = forgeSinceBlow(time);
    float jolt = smoothstep(0.0, 0.015, a) * exp(-a / 0.07) * cos(a * 26.0);
    return jolt * forgeInFire(t) * (1.0 - still);
  }
  // How unfinished the shape still is: 1 as it enters the fire, 0 once it
  // leaves; the blows work it steadily in between.
  float forgeRough(float t) {
    return 1.0 - smoothstep(FORGE_START, FORGE_END, t);
  }
  // Heat, 0 (cold steel) to 1 (white-hot): glowing from the fire as it
  // rises and cooling by a little past the middle of the screen; each blow
  // flares it by the same amount while it's in the fire.
  float forgeHeat(float t, float time, float still) {
    float ember = 0.72 * (1.0 - smoothstep(0.2, 0.62, t));
    float flare = 0.9 * exp(-forgeSinceBlow(time) / 0.18) * forgeInFire(t) * (1.0 - still);
    return max(ember, flare);
  }
  // Incandescence for a heat: dark red, cherry, orange, yellow, near white.
  vec3 forgeGlow(float h) {
    vec3 c = mix(vec3(0.45, 0.05, 0.03), vec3(0.88, 0.2, 0.06), smoothstep(0.1, 0.4, h));
    c = mix(c, vec3(1.0, 0.52, 0.13), smoothstep(0.35, 0.65, h));
    c = mix(c, vec3(1.0, 0.82, 0.46), smoothstep(0.6, 0.85, h));
    return mix(c, vec3(1.0, 0.96, 0.86), smoothstep(0.85, 1.0, h));
  }
  float forgeHash(float n) {
    return fract(sin(n * 91.345) * 47453.5453);
  }
`;

// The overlay reaches this far past the word (font sizes): enough for the
// sparks' arc, short of the neighbouring lines' letters.
const REACH_X = 1.8;
const REACH_UP = 0.6;
const REACH_DOWN = 0.6;

const vertexShader = /* glsl */ `
  varying vec2 vLocal;
  void main() {
    vLocal = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec4 uRect;      // left, bottom, right, top (paragraph-local)
  uniform float uT;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uStill;
  uniform float uSeed;
  uniform vec4 uBounds;    // the overlay plane: left, bottom, right, top
  varying vec2 vLocal;
  ${FORGE_SHARED_GLSL}

  // Distance from p to the segment a–b.
  float forgeSegment(vec2 p, vec2 a, vec2 b) {
    vec2 ab = b - a;
    float k = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-10), 0.0, 1.0);
    return length(p - a - ab * k);
  }

  // One blow's sparks, age seconds after it was struck at origin.
  vec2 forgeSpray(vec2 p, vec2 origin, float age, float blow, float fs, float aa) {
    if (age < 0.0 || age > 0.9) return vec2(0.0);
    float light = 0.0, hot = 0.0;
    for (int i = 0; i < 10; i++) {
      float n = float(i) + blow * 31.0;
      float life = mix(0.35, 0.6, forgeHash(n + 0.3));
      if (age > life) continue;
      // Thrown up and out from the struck face in a tight spray that arcs
      // back down over the word, never far into its neighbours.
      float side = forgeHash(n + 0.1) < 0.5 ? -1.0 : 1.0;
      float angle = mix(0.45, 1.25, forgeHash(n + 0.7));
      float speed = fs * mix(2.2, 4.0, forgeHash(n + 0.9));
      vec2 v0 = vec2(side * cos(angle), sin(angle)) * speed;
      float g = fs * 12.0;
      vec2 pos = origin + v0 * age + vec2(0.0, -0.5 * g * age * age);
      vec2 vel = v0 + vec2(0.0, -g * age);
      // A short streak along its flight, thinning as it cools.
      float d = forgeSegment(p, pos - vel * 0.05, pos);
      float fade = 1.0 - smoothstep(life * 0.45, life, age);
      // At least a pixel wide, so a spark never vanishes into sub-pixels.
      float w = max(fs * 0.024, aa * 0.9);
      float core = smoothstep(w + aa, w - aa * 0.5, d);
      float halo = exp(-d * d / (w * w * 10.0)) * 0.4;
      float s = max(core, halo) * fade;
      light = max(light, s);
      hot = max(hot, s * (1.0 - age / life));
    }
    return vec2(light, hot);
  }

  void main() {
    float L = uRect.x, R = uRect.z, T = uRect.w;
    float h = T - uRect.y;
    float fs = h / FORGE_LINE_EM;
    vec2 p = vLocal;
    float aa = fwidth(p.x);
    // The struck face: the top of the lowercase letters.
    float faceY = T - 0.42 * h;

    // Every blow throws its spray from a slightly different spot on the
    // struck face; the sparks fade out with the fire.
    float blow = forgeBlowIndex(uTime);
    float strikeU = mix(0.28, 0.72, forgeHash(blow * 1.7 + uSeed * 13.0));
    float age = uStill > 0.5 ? -1.0 : forgeSinceBlow(uTime);
    vec2 spray = forgeSpray(p, vec2(mix(L, R, strikeU), faceY), age, mod(blow, 7.0), fs, aa)
      * forgeInFire(uT);
    vec3 sparkColor = mix(vec3(1.0, 0.42, 0.1), vec3(1.0, 0.9, 0.62), spray.y);
    // Sparks burn out before the plane's edge rather than being cut by it.
    vec2 inside = min(p - uBounds.xy, uBounds.zw - p);
    spray *= smoothstep(0.0, fs * 0.45, min(inside.x, inside.y));

    // The hot metal's faint glow, hugging the word.
    vec2 c = vec2((L + R) * 0.5, uRect.y + 0.45 * h);
    vec2 q = (p - c) / vec2((R - L) * 0.5 + fs * 0.35, h * 0.45 + fs * 0.2);
    float heat = forgeHeat(uT, uTime, uStill);
    float glow = exp(-dot(q, q) * 1.8) * 0.36 * smoothstep(0.2, 0.9, heat);

    vec3 color = sparkColor * spray.x * 1.6 + forgeGlow(heat) * glow;
    float alpha = clamp(max(spray.x, glow), 0.0, 1.0);
    gl_FragColor = vec4(color, alpha * uOpacity);
    if (alpha < 0.002) discard;
    #include <colorspace_fragment>
  }
`;

// One word's sparks and glow.
export function createForgeSparks(word: EffectWord): EffectOverlay {
  const fs = word.fontSize;
  const left = word.left - REACH_X * fs;
  const right = word.right + REACH_X * fs;
  const top = word.top + REACH_UP * fs;
  const bottom = word.bottom - REACH_DOWN * fs;
  const geometry = new THREE.PlaneGeometry(right - left, top - bottom);
  geometry.translate((left + right) / 2, (top + bottom) / 2, 0);

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uRect: { value: new THREE.Vector4(word.left, word.bottom, word.right, word.top) },
      uBounds: { value: new THREE.Vector4(left, bottom, right, top) },
      uT: { value: 0 },
      uOpacity: { value: 1 },
      uTime: { value: 0 },
      uStill: { value: 0 },
      uSeed: { value: word.seed },
    },
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.raycast = () => {};
  // After the words (0): sparks fly in front of the letters they leave, and
  // the glow is additive, so it only warms them.
  mesh.renderOrder = 0.5;
  mesh.position.z = -0.001;

  return {
    object: mesh,
    update({ t, time, opacity }: EffectFrame) {
      material.uniforms.uTime.value = time;
      material.uniforms.uStill.value = breath.still ? 1 : 0;
      material.uniforms.uT.value = t;
      material.uniforms.uOpacity.value = opacity;
      mesh.visible = opacity > 0.001 && t > 0;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
