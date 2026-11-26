import * as THREE from 'three';
import { getSelectionRects } from 'troika-three-text';
import type { EffectFrame, EffectOverlay, EffectWord } from './word-effect';

// Variant B's drips: the part of the pour that hangs outside the letters.
// Once the letters (poured-effect.ts) are full they brim over: a few drips
// gather under them, each hanging from where liquid really would collect
// (the bottom of a bowl, the foot of a stem) and tapering into a bead. Few,
// unequal, slow: the pour is deliberate, never a splatter and never a row
// of identical teardrops.

// The poured gold (the night palette's gold token).
export const POUR_COLOR = '#d4af37';

// The letters are brim-full at this pour progress.
const FULL_AT = 0.2;
const SIDE_MARGIN = 0.4;
// The longest drip and its bead stay this far (font sizes) below the line
// box, clear of the next line's letters.
const BELOW = 0.6;

// At most this many drips per word.
const MAX_DRIPS = 3;
// Where along a letter's width liquid collects at its foot: bowl bottoms
// and stem feet. Letters not listed (descenders, diagonals, capitals) don't
// drip.
const DRIP_POINTS: Record<string, number> = {
  a: 0.8, b: 0.5, c: 0.5, d: 0.5, e: 0.5, h: 0.82, i: 0.5, l: 0.5, m: 0.86,
  n: 0.8, o: 0.5, r: 0.26, s: 0.5, t: 0.55, u: 0.82,
};
// Drip lengths below the baseline, in font sizes, longest first. Shuffled
// across the chosen letters so the longest is not always in the same place.
const DRIP_LENGTHS = [0.5, 0.3, 0.14];

function rand(seed: number, n: number): number {
  const x = Math.sin(seed * 91.7 + n * 47.3) * 43758.5453;
  return x - Math.floor(x);
}

// Where this word's drips hang (paragraph-local x) and how each grows.
function placeDrips(word: EffectWord): THREE.Vector4[] {
  const info = word.mesh.textRenderInfo;
  if (!info) return [];
  const text = word.mesh.text;
  const candidates: { x: number; index: number }[] = [];
  for (let i = word.start; i < word.end; i++) {
    const at = DRIP_POINTS[text[i]];
    const rect = getSelectionRects(info, i, i + 1)[0];
    // Only letters on this rect's line, and with somewhere to drip from.
    if (at === undefined || !rect || Math.abs(rect.top - word.top) > 1e-4) continue;
    candidates.push({ x: rect.left + at * (rect.right - rect.left), index: i });
  }
  // Pick letters in a seeded order, never two side by side.
  const order = candidates
    .map((c, n) => ({ c, key: rand(word.seed, n) }))
    .sort((a, b) => a.key - b.key)
    .map(({ c }) => c);
  const chosen: typeof candidates = [];
  for (const c of order) {
    if (chosen.length >= MAX_DRIPS) break;
    if (chosen.some((o) => Math.abs(o.index - c.index) < 2)) continue;
    chosen.push(c);
  }
  return chosen.map((c, n) => {
    // x, length (font sizes), when it starts to form (t), bead size (0–1).
    const length = DRIP_LENGTHS[n] * (0.9 + 0.2 * rand(word.seed, 10 + n));
    const start = FULL_AT + 0.02 + 0.22 * rand(word.seed, 20 + n) + 0.06 * n;
    return new THREE.Vector4(c.x, length, start, rand(word.seed, 30 + n));
  });
}

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
  uniform vec3 uColor;
  uniform vec4 uDrips[${MAX_DRIPS}]; // x, length (fs), start (t), bead (0–1)
  uniform int uDripCount;
  varying vec2 vLocal;
  ${POUR_SHARED_GLSL}

  float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
  }

  // Signed distance to a drip hanging from (x, y0) down to y1: it flares
  // out of the letter like a meniscus, narrows softly, and gathers into a
  // pear-shaped bead that is only a little wider than its neck.
  float dripDist(vec2 p, float x, float y0, float y1, float r, float w) {
    float len = max(y0 - y1, 1e-5);
    float k = clamp((y0 - p.y) / len, 0.0, 1.0);
    float width = w * (0.72 + 1.5 * exp(-k * 7.0));
    float neck = length(vec2(p.x - x, p.y - clamp(p.y, y1 + r, y0))) - width;
    // The bead is heavier at the bottom and draws up into the neck.
    vec2 q = p - vec2(x, y1 + r);
    q.y *= q.y > 0.0 ? 0.62 : 1.08;
    float bead = length(q) - r;
    return smin(neck, bead, r * 1.6);
  }

  void main() {
    float T = uRect.w;
    float h = T - uRect.y;
    float fs = h / LINE_EM;
    vec2 p = vLocal;
    float t = uT;
    float aa = fwidth(p.x) * 1.5;

    vec3 color = vec3(0.0);
    float alpha = 0.0;

    // The drips, behind the letters they hang from.
    float baseY = T - BASELINE_UV * h;
    for (int i = 0; i < ${MAX_DRIPS}; i++) {
      if (i >= uDripCount) break;
      vec4 drip = uDrips[i];
      // Forms soon after it starts, then keeps lengthening to the end.
      float age = clamp((t - drip.z) / (1.0 - drip.z), 0.0, 1.0);
      if (age <= 0.0) continue;
      float grow = 1.0 - pow(1.0 - age, 2.2);
      float r = fs * mix(0.02, 0.034 + 0.01 * drip.w, grow);
      float y0 = baseY + fs * 0.06;
      float y1 = baseY - fs * drip.y * grow;
      float dd = dripDist(p, drip.x, y0, min(y1, y0 - 2.0 * r), r, fs * 0.021);
      float a = smoothstep(aa, -aa, dd) * smoothstep(0.0, 0.08, age);
      if (a <= 0.0) continue;
      // The deep gold of the letters' feet, lit softly from the left: a
      // thin highlight runs down one side and a slow sheen slides down.
      float across = clamp((p.x - drip.x) / (r * 1.4), -1.0, 1.0);
      float highlight = exp(-pow((across + 0.45) / 0.3, 2.0));
      float sheen = 0.5 + 0.5 * sin((p.y / fs) * 4.0 + uTime * 1.1 + drip.w * 6.28);
      vec3 dc = uColor * mix(vec3(0.95, 0.82, 0.58), vec3(0.78, 0.62, 0.4), 0.5 + 0.5 * across);
      dc = mix(dc, mix(uColor, POUR_HOT, 0.5), clamp(highlight * (0.45 + 0.2 * sheen), 0.0, 1.0));
      color = mix(color, dc, a / max(alpha + a, 1e-4));
      alpha = max(alpha, a * 0.95);
    }

    gl_FragColor = vec4(color, alpha * uOpacity);
    if (gl_FragColor.a < 0.002) discard;
    #include <colorspace_fragment>
  }
`;

// One word's drips, on a plane from the word's line box to just below it.
export function createPourDrips(word: EffectWord): EffectOverlay {
  const fs = word.fontSize;
  const left = word.left - SIDE_MARGIN * fs;
  const right = word.right + SIDE_MARGIN * fs;
  const top = word.top;
  const bottom = word.bottom - BELOW * fs;
  const drips = placeDrips(word);
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
      uColor: { value: new THREE.Color(POUR_COLOR) },
      uDrips: { value: drips.concat(Array.from({ length: MAX_DRIPS - drips.length }, () => new THREE.Vector4())) },
      uDripCount: { value: drips.length },
    },
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.raycast = () => {};
  // After the sky and the star (-1, -0.5), before the words (0): the drips
  // hang behind the letters' ink.
  mesh.renderOrder = -0.25;
  mesh.position.z = -0.001;

  return {
    object: mesh,
    update({ t, time, opacity }: EffectFrame) {
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
