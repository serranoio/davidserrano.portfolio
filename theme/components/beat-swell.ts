import * as THREE from 'three';
import type { EffectFrame, EffectOverlay, EffectWord } from './word-effect';

// Proposal A's heart: the beat every beat word shares, and the faint warm
// bloom that breathes behind each word with it.

// The night palette's crimson (--color-crimson-light).
export const BEAT_COLOR = '#e83e62';

// The heartbeat every beat effect shares: a resting heart, lub then dub.
export const BEAT_SHARED_GLSL = /* glsl */ `
  // Seconds per beat (about 64 bpm), and how far into it the dub follows.
  #define BEAT_PERIOD 0.94
  #define BEAT_DUB 0.24
  // How long (s) the swell takes to travel from the word's centre to its ends.
  #define BEAT_SPREAD 0.06

  // One contraction at phase 0: a quick rise, then a slow, easing release.
  float beatThump(float phase, float rise, float fall) {
    float up = smoothstep(0.0, rise, phase);
    float down = exp(-max(phase - rise, 0.0) / fall);
    return up * down;
  }
  // 0 at rest, 1 at the peak of the lub; the dub is a softer echo.
  float beatPulse(float time) {
    float phase = fract(time / BEAT_PERIOD) * BEAT_PERIOD;
    float lub = beatThump(phase, 0.07, 0.11);
    float dub = 0.55 * beatThump(phase - BEAT_DUB, 0.06, 0.13) * step(BEAT_DUB, phase);
    return max(lub, dub);
  }
  // The beat is strongest as the word crosses the middle of the screen and
  // quieter as it enters or leaves.
  float beatStrength(float t) {
    return mix(0.45, 1.0, sin(3.14159 * clamp(t, 0.0, 1.0)));
  }
`;

// How far the bloom reaches past the word, in font sizes.
const BLOOM_REACH = 1.1;

const vertexShader = /* glsl */ `
  varying vec2 vLocal;
  void main() {
    vLocal = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec4 uRect;     // left, bottom, right, top (paragraph-local)
  uniform float uT;
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uColor;
  varying vec2 vLocal;
  ${BEAT_SHARED_GLSL}

  void main() {
    vec2 centre = (uRect.xy + uRect.zw) * 0.5;
    vec2 halfSize = (uRect.zw - uRect.xy) * 0.5;
    float fs = (uRect.w - uRect.y) / 1.211;
    // A soft ellipse hugging the word, a little wider than tall.
    vec2 q = (vLocal - centre) / (halfSize + vec2(fs * 0.55, fs * 0.25));
    float body = exp(-dot(q, q) * 1.6);
    float pulse = beatPulse(uTime) * beatStrength(uT);
    // Barely there at rest; it warms and opens a little on each beat.
    float spread = exp(-dot(q, q) * mix(1.6, 1.15, pulse));
    float glow = mix(body * 0.05, spread * 0.2, pulse);
    gl_FragColor = vec4(uColor * vec3(0.9, 0.35, 0.42), glow * uOpacity);
    if (gl_FragColor.a < 0.002) discard;
    #include <colorspace_fragment>
  }
`;

// One word's bloom, on a plane a little larger than the word.
export function createBeatBloom(word: EffectWord): EffectOverlay {
  const reach = BLOOM_REACH * word.fontSize;
  const left = word.left - reach;
  const right = word.right + reach;
  const top = word.top + reach;
  const bottom = word.bottom - reach;
  const geometry = new THREE.PlaneGeometry(right - left, top - bottom);
  geometry.translate((left + right) / 2, (top + bottom) / 2, 0);

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uRect: { value: new THREE.Vector4(word.left, word.bottom, word.right, word.top) },
      uT: { value: 0 },
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uColor: { value: new THREE.Color(BEAT_COLOR) },
    },
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.raycast = () => {};
  // After the sky and the star (-1, -0.5), before the words (0): the bloom
  // sits behind the letters' ink.
  mesh.renderOrder = -0.25;
  mesh.position.z = -0.001;

  return {
    object: mesh,
    update({ t, time, opacity }: EffectFrame) {
      material.uniforms.uT.value = t;
      material.uniforms.uTime.value = time;
      material.uniforms.uOpacity.value = opacity;
      mesh.visible = opacity > 0.001;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
