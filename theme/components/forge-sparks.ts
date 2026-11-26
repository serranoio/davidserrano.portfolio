import * as THREE from 'three';
import { breath } from './breath';
import type { EffectFrame, EffectOverlay, EffectWord } from './word-effect';

// Variant A, struck on the anvil: the forge's timeline, shared by the glyphs
// (forge-effect.ts) and the overlay below, and the overlay itself — the
// spray of sparks each hammer blow throws, and the faint glow of the hot
// metal. Everything about the word's shape and heat is set by its progress
// t, so the same scroll position always shows the same word; only the
// sparks run on the clock, from the moment a blow is struck.

// Hot iron, as the word first appears.
export const FORGE_COLOR = '#ff8a3d';

// Where in the word's pass the three blows land: the word is struck as it
// rises through the lower half of the screen and is finished by the middle.
export const FORGE_BLOWS = [0.24, 0.33, 0.42] as const;

export const FORGE_SHARED_GLSL = /* glsl */ `
  #define FORGE_LINE_EM 1.211
  // Baseline, as a fraction of the line box from its top.
  #define FORGE_BASELINE 0.763
  #define FORGE_BLOW_0 ${FORGE_BLOWS[0].toFixed(3)}
  #define FORGE_BLOW_1 ${FORGE_BLOWS[1].toFixed(3)}
  #define FORGE_BLOW_2 ${FORGE_BLOWS[2].toFixed(3)}

  // The jolt of one blow, as the word scrolls past it: a hard squash that
  // springs back with one small rebound. 0 before the blow.
  float forgeJolt(float t, float blow) {
    float a = t - blow;
    if (a < 0.0) return 0.0;
    return smoothstep(0.0, 0.003, a) * exp(-a / 0.011) * cos(a * 140.0);
  }
  float forgeJolts(float t) {
    return forgeJolt(t, FORGE_BLOW_0) + forgeJolt(t, FORGE_BLOW_1) + forgeJolt(t, FORGE_BLOW_2);
  }
  // How unfinished the shape still is: 1 before the first blow, 0 after the
  // last; each blow takes a third.
  float forgeRough(float t) {
    return 1.0 - (smoothstep(FORGE_BLOW_0, FORGE_BLOW_0 + 0.008, t)
      + smoothstep(FORGE_BLOW_1, FORGE_BLOW_1 + 0.008, t)
      + smoothstep(FORGE_BLOW_2, FORGE_BLOW_2 + 0.008, t)) / 3.0;
  }
  // Heat, 0 (cold steel) to 1 (white-hot): glowing from the fire as it
  // rises, flaring a little less at each blow and cooling between them,
  // cold by the time it's well past the middle of the screen.
  float forgeFlare(float t, float blow, float peak) {
    float a = t - blow;
    return a < 0.0 ? 0.0 : peak * exp(-a / 0.05);
  }
  float forgeHeat(float t) {
    float ember = 0.72 * (1.0 - smoothstep(0.2, 0.62, t));
    float flare = max(forgeFlare(t, FORGE_BLOW_0, 0.92),
      max(forgeFlare(t, FORGE_BLOW_1, 0.8), forgeFlare(t, FORGE_BLOW_2, 0.68)));
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
// Where along the word each blow lands (0 left – 1 right).
const STRIKE_U = [0.34, 0.64, 0.5];

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
  uniform vec3 uAge;       // seconds since each blow was struck (< 0: not struck)
  uniform vec3 uStrikeU;
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

    vec2 s0 = forgeSpray(p, vec2(mix(L, R, uStrikeU.x), faceY), uAge.x, 0.0, fs, aa);
    vec2 s1 = forgeSpray(p, vec2(mix(L, R, uStrikeU.y), faceY), uAge.y, 1.0, fs, aa);
    vec2 s2 = forgeSpray(p, vec2(mix(L, R, uStrikeU.z), faceY), uAge.z, 2.0, fs, aa);
    vec2 spray = max(s0, max(s1, s2));
    vec3 sparkColor = mix(vec3(1.0, 0.42, 0.1), vec3(1.0, 0.9, 0.62), spray.y);
    // Sparks burn out before the plane's edge rather than being cut by it.
    vec2 inside = min(p - uBounds.xy, uBounds.zw - p);
    spray *= smoothstep(0.0, fs * 0.45, min(inside.x, inside.y));

    // The hot metal's faint glow, hugging the word.
    vec2 c = vec2((L + R) * 0.5, uRect.y + 0.45 * h);
    vec2 q = (p - c) / vec2((R - L) * 0.5 + fs * 0.35, h * 0.45 + fs * 0.2);
    float heat = forgeHeat(uT);
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

  const age = new THREE.Vector3(-1, -1, -1);
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uRect: { value: new THREE.Vector4(word.left, word.bottom, word.right, word.top) },
      uBounds: { value: new THREE.Vector4(left, bottom, right, top) },
      uT: { value: 0 },
      uOpacity: { value: 1 },
      uAge: { value: age },
      uStrikeU: { value: new THREE.Vector3(...STRIKE_U.map((u) => Math.min(1, Math.max(0, u + (word.seed - 0.5) * 0.12)))) },
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

  // When each blow was struck (clock seconds), or null.
  const struck: (number | null)[] = FORGE_BLOWS.map(() => null);
  let lastT: number | null = null;

  return {
    object: mesh,
    update({ t, time, opacity }: EffectFrame) {
      FORGE_BLOWS.forEach((blow, k) => {
        // Struck only by scrolling down through it — not by landing past it
        // on load, and never while motion is held still.
        if (lastT !== null && lastT < blow && t >= blow && t - blow < 0.05 && !breath.still) struck[k] = time;
        if (t < blow) struck[k] = null;
      });
      lastT = t;
      age.set(
        struck[0] === null ? -1 : time - struck[0],
        struck[1] === null ? -1 : time - struck[1],
        struck[2] === null ? -1 : time - struck[2]
      );
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
