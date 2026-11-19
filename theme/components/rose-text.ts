import * as THREE from 'three';
import { Text } from 'troika-three-text';
// Troika parses fonts itself and cannot read woff2, so the scene text loads
// the same face the page uses (Cormorant Garamond, light) as a .woff.
import textFontUrl from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-300-normal.woff';

// Position behind the rose so the petals foreground the paragraph instead
// of the paragraph foregrounding the petals. Y is negative so the first
// paragraph starts well below the rose — the user scrolls down to bring
// subsequent paragraphs up into focal range. Z is firmly negative — the
// rose lives near z≈0, text sits well behind it.
const TEXT_OFFSET = new THREE.Vector3(0, -0.62, -1.1);

// Flat and quiet: unlit warm ivory, no outline, no glow. It should read like
// words set on the night, not like an object in the scene.
const TEXT_COLOR = 0xe6dccb;
const TEXT_OPACITY = 0.86;
const TEXT_FONT_SIZE = 0.098;
const TEXT_LINE_HEIGHT = 1.42;
const TEXT_LETTER_SPACING = 0.012;
const TEXT_MAX_WIDTH = 2.5;
const MOBILE_TEXT_FONT_SIZE = 0.06;
const MOBILE_TEXT_LINE_HEIGHT = 1.24;
const MOBILE_TEXT_MAX_WIDTH = 1.45;

// World-units between paragraph centers: enough air that only one paragraph
// holds the eye at a time.
const PARAGRAPH_SPACING = 1.4;
const MOBILE_PARAGRAPH_SPACING = 1.0;
const MOBILE_HEIGHT_OFFSET = -0.3;
const MOBILE_RADIAL_DISTANCE = 1.35;

export class RoseText {
  readonly group: THREE.Group;
  readonly meshes: Text[] = [];

  // The text orbits the rose, always sitting on the opposite side of the
  // bloom center from the camera. Whole group orbits together so the stack
  // stays coherent regardless of camera angle.
  private readonly bloomCenter: THREE.Vector3;
  private heightOffset: number;
  private radialDistance: number;

  // Document progress is the sole source of the rendered paragraph position.
  private scrollOffset = 0;
  private maxScrollOffset: number;
  private paragraphSpacing = PARAGRAPH_SPACING;

  // Mirror the opacity we *intend* to render at. Reading back from
  // mesh.material.opacity on a Troika Text mesh isn't reliable (Troika wraps
  // the assigned material in a derived shader material), so the test API
  // returns this field instead of round-tripping through Troika.
  private lastOpacity = 1;

  constructor(body: string, bloomCenter: THREE.Vector3) {
    if (typeof body !== 'string') {
      throw new TypeError(
        `RoseText requires a string body, got ${typeof body}. ` +
          `Check that the import uses ?raw and resolves to text, not a module.`
      );
    }

    const paragraphs = RoseText.parseParagraphs(body);
    this.group = new THREE.Group();

    paragraphs.forEach((paragraph, index) => {
      const text = new Text();
      text.text = paragraph;
      text.fontSize = TEXT_FONT_SIZE;
      text.lineHeight = TEXT_LINE_HEIGHT;
      text.maxWidth = TEXT_MAX_WIDTH;
      text.anchorX = 'center';
      text.anchorY = 'middle';
      text.textAlign = 'center';
      text.color = TEXT_COLOR;
      text.font = textFontUrl;
      text.letterSpacing = TEXT_LETTER_SPACING;
      text.material = new THREE.MeshBasicMaterial({
        color: TEXT_COLOR,
        transparent: true,
        opacity: TEXT_OPACITY,
        toneMapped: false,
        depthWrite: false,
      });
      text.frustumCulled = false;
      // Stack each paragraph downward along local Y. Paragraph 0 sits at the
      // top of the stack so the first paragraph is what the user sees first.
      text.position.y = -index * PARAGRAPH_SPACING;
      text.sync();
      this.meshes.push(text);
      this.group.add(text);
    });

    this.bloomCenter = bloomCenter.clone();
    this.heightOffset = TEXT_OFFSET.y;
    this.radialDistance = Math.abs(TEXT_OFFSET.z);
    this.maxScrollOffset = Math.max(0, (paragraphs.length - 1) * PARAGRAPH_SPACING);

    // Seed initial position; overwritten each frame by update().
    this.group.position.copy(this.bloomCenter).add(TEXT_OFFSET);
  }

  // Each frame: position the group on the opposite side of the bloom center
  // from the camera (in the XZ plane), yaw it to face the camera, then
  // apply the scrolled Y offset to translate the stack through the focal
  // region.
  update(camera: THREE.Camera, opacity: number) {
    const dx = camera.position.x - this.bloomCenter.x;
    const dz = camera.position.z - this.bloomCenter.z;
    const len = Math.hypot(dx, dz) || 1;
    this.group.position.set(
      this.bloomCenter.x - (dx / len) * this.radialDistance,
      this.bloomCenter.y + this.heightOffset + this.scrollOffset,
      this.bloomCenter.z - (dz / len) * this.radialDistance
    );

    this.group.rotation.y = Math.atan2(
      camera.position.x - this.group.position.x,
      camera.position.z - this.group.position.z
    );

    for (const mesh of this.meshes) {
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.opacity = TEXT_OPACITY * opacity;
      mesh.visible = opacity > 0.001;
    }
    this.lastOpacity = opacity;
  }

  setScrollProgress(progress: number) {
    this.scrollOffset = THREE.MathUtils.clamp(progress, 0, 1) * this.maxScrollOffset;
  }

  setMobileLayout(enabled: boolean) {
    this.heightOffset = enabled ? MOBILE_HEIGHT_OFFSET : TEXT_OFFSET.y;
    this.radialDistance = enabled ? MOBILE_RADIAL_DISTANCE : Math.abs(TEXT_OFFSET.z);
    this.paragraphSpacing = enabled ? MOBILE_PARAGRAPH_SPACING : PARAGRAPH_SPACING;
    this.maxScrollOffset = Math.max(0, (this.meshes.length - 1) * this.paragraphSpacing);
    this.scrollOffset = Math.max(0, Math.min(this.maxScrollOffset, this.scrollOffset));

    this.meshes.forEach((mesh, index) => {
      mesh.fontSize = enabled ? MOBILE_TEXT_FONT_SIZE : TEXT_FONT_SIZE;
      mesh.lineHeight = enabled ? MOBILE_TEXT_LINE_HEIGHT : TEXT_LINE_HEIGHT;
      mesh.maxWidth = enabled ? MOBILE_TEXT_MAX_WIDTH : TEXT_MAX_WIDTH;
      mesh.position.y = -index * this.paragraphSpacing;
      mesh.sync();
    });
  }

  getScrollOffset(): number {
    return this.scrollOffset;
  }

  getMaxScrollOffset(): number {
    return this.maxScrollOffset;
  }

  getScrollTarget(): number {
    return this.scrollOffset;
  }

  getParagraphCount(): number {
    return this.meshes.length;
  }

  getActiveParagraphIndex(): number {
    if (this.paragraphSpacing <= 0) return 0;
    return Math.max(
      0,
      Math.min(this.meshes.length - 1, Math.round(this.scrollOffset / this.paragraphSpacing))
    );
  }

  getActiveParagraphScreenBounds(camera: THREE.Camera, viewport: { width: number; height: number }) {
    const mesh = this.meshes[this.getActiveParagraphIndex()];
    if (!mesh) return null;
    mesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(mesh);
    if (box.isEmpty()) return null;

    const corners = [
      new THREE.Vector3(box.min.x, box.min.y, box.min.z),
      new THREE.Vector3(box.min.x, box.min.y, box.max.z),
      new THREE.Vector3(box.min.x, box.max.y, box.min.z),
      new THREE.Vector3(box.min.x, box.max.y, box.max.z),
      new THREE.Vector3(box.max.x, box.min.y, box.min.z),
      new THREE.Vector3(box.max.x, box.min.y, box.max.z),
      new THREE.Vector3(box.max.x, box.max.y, box.min.z),
      new THREE.Vector3(box.max.x, box.max.y, box.max.z),
    ];
    const projected = corners.map((corner) => {
      const ndc = corner.project(camera);
      return {
        x: ((ndc.x + 1) / 2) * viewport.width,
        y: ((1 - ndc.y) / 2) * viewport.height,
      };
    });
    return {
      left: Math.min(...projected.map((p) => p.x)),
      right: Math.max(...projected.map((p) => p.x)),
      top: Math.min(...projected.map((p) => p.y)),
      bottom: Math.max(...projected.map((p) => p.y)),
    };
  }

  getOpacity(): number {
    return this.meshes.length === 0 ? 0 : this.lastOpacity;
  }

  getWorldPosition(): { x: number; y: number; z: number } {
    const first = this.meshes[0];
    if (!first) return { x: 0, y: 0, z: 0 };
    const worldPos = new THREE.Vector3();
    first.getWorldPosition(worldPos);
    return { x: worldPos.x, y: worldPos.y, z: worldPos.z };
  }

  dispose() {
    for (const mesh of this.meshes) {
      mesh.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.meshes.length = 0;
    if (this.group.parent) this.group.parent.remove(this.group);
  }

  static parseParagraphs(body: string): string[] {
    return body
      .split(/\n\s*\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }
}
