import * as THREE from 'three';
import { Text } from 'troika-three-text';
import type { EffectFrame, EffectOverlay, EffectWord } from './word-effect';

// Variant B's ghosts: faint copies of the word, what it could become,
// drifting a little apart from it. As the word rises they are drawn back
// into it; once it has settled they stay as a soft, slowly breathing halo
// of what is still unrealized.

// A pale violet, cooler than the ivory text around it.
export const POTENTIAL_COLOR = '#c9b6ff';

// Where each ghost drifts, as a direction in font sizes (x, y), how much
// bigger it is than the word, its tilt (radians) and its own breathing
// phase: each a slightly different form the word could take. Uneven on
// purpose, so they never read as a pattern. They drift sideways and up,
// never down (below, a copy reads as a drop shadow), and stay inside the
// word's own line.
const GHOSTS = [
  { x: -0.42, y: 0.1, scale: 1.06, tilt: 0.02, phase: 0.0 },
  { x: 0.38, y: 0.05, scale: 1.1, tilt: -0.025, phase: 0.41 },
  { x: 0.05, y: 0.2, scale: 1.14, tilt: 0.0, phase: 0.73 },
  { x: 0.24, y: 0.14, scale: 1.18, tilt: 0.03, phase: 0.58 },
];
// How far apart they start (multiplying the directions above) and how close
// they come once settled: never all the way, so the possibilities stay
// visible around the word.
const SPREAD = { far: 1.1, near: 0.3 };
// Seconds per breath of the settled halo.
const BREATH = 5.2;

// 0 while the possibilities are apart, 1 once they've settled into the
// word. Shared with the glyph shader through the same curve.
export function potentialSettle(t: number): number {
  const x = THREE.MathUtils.clamp((t - 0.08) / (0.6 - 0.08), 0, 1);
  return x * x * (3 - 2 * x);
}

export function createPotentialGhosts(word: EffectWord): EffectOverlay {
  const group = new THREE.Group();
  const fs = word.fontSize;
  const source = word.mesh;
  const material = new THREE.MeshBasicMaterial({
    color: POTENTIAL_COLOR,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
  });
  const ghosts = GHOSTS.map(() => {
    const text = new Text();
    text.text = word.text;
    text.font = source.font;
    text.fontSize = source.fontSize;
    text.lineHeight = source.lineHeight;
    text.letterSpacing = source.letterSpacing;
    // Laid out from the word's own line-box corner, so a ghost at rest sits
    // exactly on the word.
    text.anchorX = 'left';
    text.anchorY = 'top';
    text.material = material;
    // Soft, not crisp: a faint fill inside a blurred glow of the letters, so
    // a ghost reads as a possibility, not a misprint. (Troika supports these;
    // the local type declaration doesn't list them.)
    Object.assign(text, {
      fillOpacity: 0.6,
      outlineBlur: '22%',
      outlineColor: POTENTIAL_COLOR,
      outlineOpacity: 0.45,
    });
    text.frustumCulled = false;
    text.raycast = () => {};
    // After the sky, before the words: behind the word's ink.
    text.renderOrder = -0.25;
    text.sync();
    group.add(text);
    return text;
  });
  const centre = new THREE.Vector2((word.left + word.right) / 2, (word.top + word.bottom) / 2);

  return {
    object: group,
    update({ t, time, opacity }: EffectFrame) {
      const settle = potentialSettle(t);
      const spread = THREE.MathUtils.lerp(SPREAD.far, SPREAD.near, settle);
      ghosts.forEach((ghost, i) => {
        const g = GHOSTS[i];
        // Settled, each keeps wandering out and back on its own breath.
        const breath = 0.55 + 0.45 * Math.sin(((time / BREATH) + g.phase) * Math.PI * 2);
        const reach = spread * THREE.MathUtils.lerp(1, breath, settle);
        // Each ghost its own size, as if the word might grow into it.
        const scale = 1 + (g.scale - 1) * (1 - 0.4 * settle) + 0.02 * breath * settle;
        ghost.scale.setScalar(scale);
        ghost.rotation.z = g.tilt * (1 - 0.5 * settle);
        ghost.position.set(
          centre.x + (word.left - centre.x) * scale + g.x * fs * reach,
          centre.y + (word.top - centre.y) * scale + g.y * fs * reach,
          -0.001
        );
      });
      // Clearer while apart, a little fainter once settled; never gone.
      material.opacity = THREE.MathUtils.lerp(0.36, 0.25, settle) * opacity * Math.min(1, t * 12);
      group.visible = opacity > 0.001 && t > 0;
    },
    dispose() {
      for (const ghost of ghosts) ghost.dispose();
      material.dispose();
    },
  };
}
