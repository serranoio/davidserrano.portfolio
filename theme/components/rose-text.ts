import * as THREE from 'three';
import { Text } from 'troika-three-text';

// Position behind the rose so the petals foreground the paragraph instead
// of the paragraph foregrounding the petals. Y is slightly elevated so the
// rose's silhouette doesn't eat the whole block. Z is firmly negative —
// the rose lives near z≈0, text sits well behind it.
const TEXT_OFFSET = new THREE.Vector3(0, 0.55, -1.1);

// Visual tuning. Bumped up a touch since the text now sits ~1 unit farther
// from the camera and needs to read at the same apparent size.
const TEXT_COLOR = 0xf6dc8a;
const TEXT_FONT_SIZE = 0.14;
const TEXT_LINE_HEIGHT = 1.35;
const TEXT_MAX_WIDTH = 3.8;
const TEXT_OUTLINE_WIDTH = 0.006;
const TEXT_OUTLINE_OPACITY = 0.7;
const TEXT_OUTLINE_COLOR = 0x1a1208;

export class RoseText {
  readonly mesh: Text;

  // The text orbits the rose, always sitting on the opposite side of the
  // bloom center from the camera. This guarantees that no matter how the
  // user rotates around the rose, the petals foreground the paragraph
  // instead of the paragraph drifting in front of the camera.
  private readonly bloomCenter: THREE.Vector3;
  private readonly heightOffset: number;
  private readonly radialDistance: number;

  constructor(body: string, bloomCenter: THREE.Vector3) {
    if (typeof body !== 'string') {
      throw new TypeError(
        `RoseText requires a string body, got ${typeof body}. ` +
          `Check that the import uses ?raw and resolves to text, not a module.`
      );
    }
    const text = new Text();
    text.text = body.trim();
    text.fontSize = TEXT_FONT_SIZE;
    text.lineHeight = TEXT_LINE_HEIGHT;
    text.maxWidth = TEXT_MAX_WIDTH;
    text.anchorX = 'center';
    text.anchorY = 'middle';
    text.textAlign = 'center';
    text.color = TEXT_COLOR;
    // Metallic gold to match the rose's petals — same DirectionalLights catch
    // the letters as catch the petals. Emissive keeps them luminous when the
    // user orbits to an angle where the lights don't hit them straight on.
    text.material = new THREE.MeshStandardMaterial({
      color: TEXT_COLOR,
      metalness: 0.85,
      roughness: 0.28,
      emissive: 0x6b4f1a,
      emissiveIntensity: 0.55,
      transparent: true,
      opacity: 1,
    });
    text.outlineWidth = TEXT_OUTLINE_WIDTH;
    text.outlineColor = TEXT_OUTLINE_COLOR;
    text.outlineOpacity = TEXT_OUTLINE_OPACITY;
    text.frustumCulled = false;
    text.sync(() => {
      const pos = (text.geometry as THREE.BufferGeometry | undefined)?.getAttribute(
        'position'
      );
      // eslint-disable-next-line no-console
      console.log('[rose-text] sync complete', {
        verts: pos?.count ?? 0,
        position: text.position.toArray(),
      });
    });

    this.bloomCenter = bloomCenter.clone();
    this.heightOffset = TEXT_OFFSET.y;
    this.radialDistance = Math.abs(TEXT_OFFSET.z);

    // Seed an initial position so the mesh has a valid transform before the
    // first animate() tick. Overwritten each frame by update().
    text.position.copy(this.bloomCenter).add(TEXT_OFFSET);
    this.mesh = text;
  }

  // Each frame: position the text on the opposite side of the bloom center
  // from the camera (in the XZ plane), then yaw it to face the camera.
  // Net effect: the paragraph is always "behind the rose" from the user's
  // current viewpoint, regardless of how far they've orbited.
  update(camera: THREE.Camera, opacity: number) {
    const dx = camera.position.x - this.bloomCenter.x;
    const dz = camera.position.z - this.bloomCenter.z;
    const len = Math.hypot(dx, dz) || 1;
    this.mesh.position.set(
      this.bloomCenter.x - (dx / len) * this.radialDistance,
      this.bloomCenter.y + this.heightOffset,
      this.bloomCenter.z - (dz / len) * this.radialDistance
    );

    this.mesh.rotation.y = Math.atan2(
      camera.position.x - this.mesh.position.x,
      camera.position.z - this.mesh.position.z
    );

    const material = this.mesh.material as THREE.MeshStandardMaterial;
    material.opacity = opacity;
    this.mesh.outlineOpacity = TEXT_OUTLINE_OPACITY * opacity;
    this.mesh.visible = opacity > 0.001;
  }

  setText(body: string) {
    this.mesh.text = body.trim();
    this.mesh.sync();
  }

  getOpacity(): number {
    return (this.mesh.material as THREE.MeshStandardMaterial).opacity;
  }

  getWorldPosition(): { x: number; y: number; z: number } {
    return {
      x: this.mesh.position.x,
      y: this.mesh.position.y,
      z: this.mesh.position.z,
    };
  }

  dispose() {
    this.mesh.dispose();
    (this.mesh.material as THREE.Material).dispose();
    if (this.mesh.parent) this.mesh.parent.remove(this.mesh);
  }
}
