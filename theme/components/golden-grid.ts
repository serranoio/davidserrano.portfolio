import * as THREE from 'three';
import type { EffectFrame, EffectOverlay, EffectWord } from './word-effect';

// Variant B's measure. Under each line of the phrase, in the space below
// its letters, runs a typographer's dimension line: one hairline the
// word's exact width, with ticks at its ends and at its golden sections
// (0.382 and 0.618), the 0.618 tick taller and set with a single gold point.
// It draws outward from that point as the phrase rises and never leaves the
// word's own width or its line's height.

export const GOLDEN_COLOR = '#d4af37';

// Line box height in font sizes, and where (from the top, as a fraction of
// the box) the measure runs: below the baseline (0.763), above the box's
// bottom.
const LINE_EM = 1.211;
const MEASURE_UV = 0.9;

const vertexShader = /* glsl */ `
  varying vec2 vLocal;
  void main() {
    vLocal = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec4 uRect;   // left, bottom, right, top
  uniform float uFs;
  uniform float uT;
  uniform float uOpacity;
  uniform vec3 uColor;
  varying vec2 vLocal;

  // A hairline at offset 0, at most a pixel wide.
  float goldenHair(float off, float px) {
    float w = max(uFs * 0.004, px * 0.5);
    return smoothstep(w + px, w - px * 0.5, abs(off)) * min(1.0, w / (px * 0.5));
  }

  void main() {
    vec2 p = vLocal;
    float px = max(fwidth(p.x), 1e-6);
    float L = uRect.x, R = uRect.z, T = uRect.w;
    float w = R - L, h = T - uRect.y;
    float y = T - ${MEASURE_UV} * h;
    // Drawn outward from the golden section, done by mid-screen.
    float grow = smoothstep(0.1, 0.5, uT);
    float g = L + w * 0.618;
    float reach = max(g - L, R - g) * grow;
    float drawn = smoothstep(reach, reach - uFs * 0.08, abs(p.x - g)) * step(L - px, p.x) * step(p.x, R + px);

    // The line, broken around the golden point like a dimension's label,
    // so it reads as a measure, not an underline.
    float gap = smoothstep(uFs * 0.05, uFs * 0.08, abs(p.x - g));
    float line = goldenHair(p.y - y, px) * drawn * gap;
    // Ticks cross the line; the ends and the golden section stand tallest.
    float up = abs(p.y - y);
    float tick = 0.0;
    tick = max(tick, goldenHair(p.x - L, px) * step(up, uFs * 0.07));
    tick = max(tick, goldenHair(p.x - R, px) * step(up, uFs * 0.07));
    tick = max(tick, 0.8 * goldenHair(p.x - (L + w * 0.382), px) * step(up, uFs * 0.04));
    tick *= drawn;
    // The golden section's point: a small bead of light, there from the start.
    float dotR = uFs * 0.02;
    float bead = smoothstep(dotR + px, dotR - px * 0.5, length(p - vec2(g, y))) * smoothstep(0.08, 0.2, uT);
    float alpha = max(max(line * 0.3, tick * 0.5), bead * 0.9) * uOpacity;
    gl_FragColor = vec4(mix(uColor, vec3(1.0, 0.94, 0.78), 0.3 + 0.4 * bead), alpha);
    if (gl_FragColor.a < 0.003) discard;
    #include <colorspace_fragment>
  }
`;

export function createGoldenGrid(word: EffectWord): EffectOverlay {
  const h = word.top - word.bottom;
  const fs = h / LINE_EM;
  const pad = fs * 0.05;
  const geometry = new THREE.PlaneGeometry(word.right - word.left + 2 * pad, h);
  geometry.translate((word.left + word.right) / 2, (word.top + word.bottom) / 2, 0);
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uRect: { value: new THREE.Vector4(word.left, word.bottom, word.right, word.top) },
      uFs: { value: fs },
      uT: { value: 0 },
      uOpacity: { value: 1 },
      uColor: { value: new THREE.Color(GOLDEN_COLOR) },
    },
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.raycast = () => {};
  // After the sky, before the words: the measure sits behind the letters' ink.
  mesh.renderOrder = -0.25;
  mesh.position.z = -0.001;
  return {
    object: mesh,
    update({ t, opacity }: EffectFrame) {
      material.uniforms.uT.value = t;
      material.uniforms.uOpacity.value = opacity;
      mesh.visible = opacity > 0.001 && t > 0.1;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
