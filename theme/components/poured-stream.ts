import * as THREE from 'three';
import type { PourFrame, PourOverlay, PourWord } from './poured-word';

// Variant B's stream and drips: everything of the pour that falls outside the
// letters themselves. The glyphs (poured-effect.ts) and this overlay share
// the GLSL below, so the stream always lands exactly on the liquid surface.

// The poured gold (the night palette's gold token).
export const POUR_COLOR = '#d4af37';

// The letters are brim-full at this pour progress.
const FULL_AT = 0.2;
// How far above the word the stream falls from, and how far below it the
// drips and falling drops may reach, in font sizes.
const STREAM_HEIGHT = 14;
const SPILL_DEPTH = 1.3;
const SIDE_MARGIN = 0.4;

// Shared by the glyph shader and the overlay. Coordinates are the word's
// line-box uv (x 0–1 left→right, y 0 top → 1 bottom).
export const POUR_SHARED_GLSL = /* glsl */ `
  // Line box height in font sizes (ascender + descender), and where in it
  // the baseline sits.
  #define LINE_EM 1.211
  #define BASELINE_UV 0.763
  #define FULL_AT ${FULL_AT.toFixed(3)}
  // A near-white gold for the hottest liquid (linear).
  #define POUR_HOT vec3(1.0, 0.86, 0.52)

  // The liquid's surface: from below the descenders up past the ascenders,
  // slow at first and quickening, so the word only reads near the end.
  float pourSurface(float t) {
    float x = clamp(t / FULL_AT, 0.0, 1.0);
    return mix(0.99, 0.03, x * x * x);
  }
  // How hard the stream runs: full while filling, a steady thinner flow after.
  float pourRate(float t) {
    return mix(1.0, 0.8, smoothstep(FULL_AT, FULL_AT + 0.2, t));
  }
  // Where along the word the stream lands: it sweeps left to right.
  float pourStreamU(float t) {
    return mix(0.12, 0.88, smoothstep(0.0, 1.0, t));
  }
  float pourHash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float pourNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(pourHash(i), pourHash(i + vec2(1.0, 0.0)), u.x),
               mix(pourHash(i + vec2(0.0, 1.0)), pourHash(i + vec2(1.0, 1.0)), u.x), u.y);
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

  // Distance to a vertical drip hanging from y0 down to y1 at x, with a
  // tapering neck and a bead at the tip.
  float dripDist(vec2 p, float x, float y0, float y1, float w0, float bead) {
    float k = clamp((y0 - p.y) / max(y0 - y1, 1e-5), 0.0, 1.0);
    float w = mix(w0, w0 * 0.45, k);
    float body = length(vec2(p.x - x, p.y - clamp(p.y, y1, y0))) - w;
    float tip = length(p - vec2(x, y1 + bead * 0.4)) - bead;
    return min(body, tip);
  }

  void main() {
    float L = uRect.x, B = uRect.y, R = uRect.z, T = uRect.w;
    float h = T - B;
    float fs = h / LINE_EM;
    vec2 p = vLocal;
    float t = uT;
    float aa = fwidth(p.y) * 1.2;

    vec3 color = vec3(0.0);
    float alpha = 0.0;

    // The stream: from high above down to the liquid surface (or the tops
    // of the letters once they are full).
    float surfaceY = T - pourSurface(t) * h;
    float landY = min(surfaceY, T - 0.4 * h);
    float top = T + ${STREAM_HEIGHT.toFixed(1)} * fs;
    // At the very start the stream's front is still falling.
    float headY = mix(top, landY, smoothstep(0.0, 0.05, t));
    float rate = pourRate(t) * smoothstep(0.0, 0.01, t);
    float fall = clamp((top - p.y) / (top - landY), 0.0, 1.0);
    float sx = mix(L, R, pourStreamU(t))
      + fs * (0.035 * sin(p.y * 21.0 + uTime * 3.7) + 0.02 * sin(p.y * 57.0 - uTime * 6.1)) * fall;
    // Falling liquid thins as it speeds up.
    float w = fs * 0.075 * rate * pow(1.0 + 3.0 * fall, -0.3);
    float d = abs(p.x - sx);
    float inStream = step(landY, p.y) * step(p.y, top);
    // Its front, while it is still falling.
    float front = smoothstep(headY - w * 2.0, headY, p.y);
    float core = smoothstep(w + aa, w - aa, d) * inStream * front;
    float glow = exp(-d * d / (w * w * 18.0 + 1e-8)) * 0.35 * inStream * front;
    // Bright ripples running down it, and its thread fading in from the dark.
    float ripple = 0.8 + 0.2 * sin(p.y * 160.0 / max(fs, 1e-4) * 0.1 + uTime * 9.0)
      + 0.15 * pourNoise(vec2(d / max(w, 1e-5), p.y / fs * 1.5 + uTime * 5.0));
    float emerge = smoothstep(top, top - (top - T) * 0.55, p.y);
    float spec = exp(-pow(d / max(w * 0.35, 1e-6), 2.0));
    vec3 streamColor = mix(uColor * ripple, POUR_HOT, spec * 0.6);
    float streamA = max(core * (0.65 + 0.35 * spec), glow) * emerge * rate;
    color = streamColor;
    alpha = streamA;

    // Where it lands: a splash glow and a few beads thrown up and out.
    vec2 land = vec2(mix(L, R, pourStreamU(t)), landY);
    vec2 e = (p - land) / vec2(fs * 0.3, fs * 0.09);
    float splash = exp(-dot(e, e) * 1.6) * 0.55 * rate;
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      float phase = fract(uTime * (0.9 + 0.17 * fi) + fi * 0.31 + uSeed);
      float dir = (mod(fi, 2.0) < 0.5 ? -1.0 : 1.0) * (0.6 + 0.3 * fi / 3.0);
      vec2 bead = land + vec2(dir * phase * fs * 0.35, sin(phase * 3.14159) * fs * (0.18 + 0.05 * fi));
      float r = fs * 0.022;
      float b = smoothstep(r + aa, r - aa, length(p - bead)) * (1.0 - phase) * rate;
      splash = max(splash, b);
    }
    color = mix(color, POUR_HOT, splash / max(alpha + splash, 1e-4));
    alpha = max(alpha, splash);

    // The overflow: drips grow from the letters' baseline once they are
    // full, and beads keep letting go of their tips and falling.
    float over = smoothstep(FULL_AT - 0.01, FULL_AT + 0.08, t);
    if (over > 0.0) {
      float baseY = T - BASELINE_UV * h;
      for (int i = 0; i < 6; i++) {
        float fi = float(i);
        float hx = pourHash(vec2(fi, uSeed * 13.0));
        // Under each letter, roughly (the p hangs from its descender).
        float u = (fi + 0.15 + 0.7 * hx) / 6.0;
        // Not every letter drips.
        if (i > 0 && pourHash(vec2(fi * 7.3, uSeed + 3.0)) < 0.3) continue;
        float y0 = i == 0 ? T - 0.98 * h : baseY;
        float start = FULL_AT + 0.01 + 0.4 * pourHash(vec2(fi * 3.1, uSeed + 1.0));
        float grow = smoothstep(start, start + 0.25, t);
        if (grow <= 0.0) continue;
        float hl = pourHash(vec2(fi * 5.7, uSeed + 2.0));
        float len = fs * (0.1 + 0.5 * hl * hl) * grow;
        float x = mix(L, R, u);
        float y1 = y0 - len;
        float bead = fs * (0.02 + 0.025 * grow * hl);
        float dd = dripDist(p, x, y0 + fs * 0.04, y1, fs * 0.04, bead);
        float drip = smoothstep(aa, -aa, dd) * over;
        float shine = 0.85 + 0.3 * sin((p.y / fs) * 18.0 + uTime * 5.0 + fi);
        // A bead lets go of the tip every couple of seconds and falls.
        float period = 1.6 + 1.2 * hx;
        float phase = fract(uTime / period + hx);
        vec2 drop = vec2(x, y1 - phase * phase * fs * 1.0);
        float dropA = smoothstep(bead + aa, bead * 0.8 - aa, length(p - drop))
          * (1.0 - phase) * smoothstep(0.5, 0.9, grow);
        float a = max(drip, dropA);
        color = mix(color, uColor * shine * 1.15, a / max(alpha + a, 1e-4));
        alpha = max(alpha, a);
      }
    }

    gl_FragColor = vec4(color, alpha * uOpacity);
    if (gl_FragColor.a < 0.002) discard;
    #include <colorspace_fragment>
  }
`;

// One word's stream and drips, on a plane from high above the word to just
// below it.
export function createPourStream(word: PourWord): PourOverlay {
  const fs = word.fontSize;
  const left = word.left - SIDE_MARGIN * fs;
  const right = word.right + SIDE_MARGIN * fs;
  const top = word.top + (STREAM_HEIGHT + 0.5) * fs;
  const bottom = word.bottom - SPILL_DEPTH * fs;
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
