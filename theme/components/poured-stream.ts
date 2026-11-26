import * as THREE from 'three';
import type { PourFrame, PourOverlay, PourWord } from './poured-word';

// Variant B's stream: the part of the pour that falls outside the letters.
// One fine thread of gold descends out of the dark and lands on the liquid
// surface inside the word (poured-effect.ts). The glyphs and this overlay
// share the GLSL below, so the thread always meets the surface exactly.
//
// Restraint is the brief: a single smooth thread, a soft landing glow, no
// splashes or drips, nothing that spills onto the neighbouring lines.

// The poured gold (the night palette's gold token).
export const POUR_COLOR = '#d4af37';

// The letters are brim-full at this pour progress.
const FULL_AT = 0.2;
// How far above the word the thread falls from, in font sizes. Most of
// that height is a long fade out of the dark.
const STREAM_HEIGHT = 10;
const SIDE_MARGIN = 0.4;
const BELOW = 0.3;

// Shared by the glyph shader and the overlay. Coordinates are the word's
// line-box uv (x 0–1 left→right, y 0 top → 1 bottom).
export const POUR_SHARED_GLSL = /* glsl */ `
  // Line box height in font sizes (ascender + descender), and where in it
  // the baseline sits.
  #define LINE_EM 1.211
  #define BASELINE_UV 0.763
  #define FULL_AT ${FULL_AT.toFixed(3)}
  // Pale, near-white gold for the freshest liquid (linear).
  #define POUR_HOT vec3(1.0, 0.9, 0.66)

  // The liquid's surface: from below the descenders up past the ascenders,
  // easing in and out, so the word only reads near the end.
  float pourSurface(float t) {
    float x = clamp(t / FULL_AT, 0.0, 1.0);
    return mix(0.99, 0.03, smoothstep(0.0, 1.0, x));
  }
  // How hard the stream runs: full while filling, then a finer thread that
  // keeps pouring to the end.
  float pourRate(float t) {
    return mix(1.0, 0.6, smoothstep(FULL_AT, 1.0, t));
  }
  // Where along the word the stream lands: it drifts slowly left to right.
  float pourStreamU(float t) {
    return mix(0.2, 0.8, smoothstep(0.0, 1.0, t));
  }
`;

const vertexShader = /* glsl */ `
  varying vec2 vLocal;
  void main() {
    vLocal = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec4 uRect;       // left, bottom, right, top (paragraph-local)
  uniform float uT;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uSeed;
  uniform vec3 uColor;
  varying vec2 vLocal;
  ${POUR_SHARED_GLSL}

  void main() {
    float L = uRect.x, T = uRect.w;
    float h = T - uRect.y;
    float fs = h / LINE_EM;
    vec2 p = vLocal;
    float t = uT;
    float aa = fwidth(p.x) * 1.5;

    // It lands on the liquid surface while filling, then on the letters'
    // x-height (the top of most of them) once they are full.
    float landY = min(T - pourSurface(t) * h, T - 0.44 * h);
    float top = T + ${STREAM_HEIGHT.toFixed(1)} * fs;
    float rate = pourRate(t) * smoothstep(0.0, 0.015, t);
    // At the very start the thread's leading end is still falling.
    float headY = mix(top, landY, smoothstep(0.0, 0.06, t));

    // 0 at the top, 1 where it lands.
    float fall = clamp((top - p.y) / (top - landY), 0.0, 1.0);
    // A slow, shallow sway, stilled toward the landing point.
    float sway = fs * 0.05 * sin((p.y / fs) * 0.45 + uTime * 0.6 + uSeed * 6.28)
      * (1.0 - fall) * (1.0 - fall);
    float landX = mix(L, uRect.z, pourStreamU(t));
    float d = abs(p.x - landX - sway);

    // A hairline above, gathering a little weight as it nears the word.
    float w = fs * mix(0.018, 0.034, fall * fall) * rate;
    // Never thinner than a pixel: below that, fade it instead.
    float px = fwidth(p.x);
    float thin = clamp(w / px, 0.35, 1.0);
    w = max(w, px * 0.5);
    float inStream = step(landY, p.y) * smoothstep(headY - fs * 0.3, headY, p.y);
    float core = smoothstep(w + aa, w - aa, d) * thin;
    float halo = exp(-d * d / (w * w * 25.0 + 1e-8)) * 0.3;
    // A long fade out of the dark: invisible at the top, whole by the word.
    float emerge = smoothstep(0.0, 0.75, fall);
    // Light sliding gently down the thread.
    float glint = 0.86 + 0.14 * sin((p.y / fs) * 1.6 + uTime * 2.2);
    float stream = max(core, halo) * inStream * emerge * rate;
    vec3 color = mix(uColor, POUR_HOT, 0.35 + 0.3 * core) * glint;

    // Where it lands: a soft, low glow on the surface.
    vec2 e = (p - vec2(landX, landY)) / vec2(fs * 0.32, fs * 0.07);
    float landing = exp(-dot(e, e) * 1.4) * 0.4 * rate;
    color = mix(color, POUR_HOT, landing / max(stream + landing, 1e-4));
    float alpha = max(stream, landing);

    gl_FragColor = vec4(color, alpha * uOpacity);
    if (gl_FragColor.a < 0.002) discard;
    #include <colorspace_fragment>
  }
`;

// One word's stream, on a plane from high above the word to just below it.
export function createPourStream(word: PourWord): PourOverlay {
  const fs = word.fontSize;
  const left = word.left - SIDE_MARGIN * fs;
  const right = word.right + SIDE_MARGIN * fs;
  const top = word.top + (STREAM_HEIGHT + 0.5) * fs;
  const bottom = word.bottom - BELOW * fs;
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
      uSeed: { value: word.seed },
      uColor: { value: new THREE.Color(POUR_COLOR) },
    },
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.raycast = () => {};
  // After the sky and the star (-1, -0.5), before the words (0): the stream
  // passes behind their ink.
  mesh.renderOrder = -0.25;
  mesh.position.z = -0.001;

  return {
    object: mesh,
    update({ t, time, opacity }: PourFrame) {
      material.uniforms.uT.value = t;
      material.uniforms.uTime.value = time;
      material.uniforms.uOpacity.value = opacity;
      mesh.visible = opacity > 0.001 && t > 0;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
