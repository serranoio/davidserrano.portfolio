import * as THREE from 'three';
import { Text, getSelectionRects } from 'troika-three-text';
import { EFFECT_MARKER, EffectWords, WORD_PASS, type EffectSpan } from './word-effect';
import type { WordEffectName } from './word-effects';
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

// A line like `[[star]]` standing alone as a paragraph reserves an empty slot
// in the stack instead of rendering: room (and scroll) for a scene beat
// between two paragraphs. It is never drawn.
const SLOT_MARKER = /^\[\[([\w-]+)\]\]$/;

// How far (world units) the last paragraph rises above the focal line by
// the end of the section: its centre then sits just under the site header
// (about 86% of the way up the screen). Measured in the browser at the
// default camera per layout, like WORD_PASS.
const END_LIFT = { wide: 1.97, narrow: 2.15 };

// A whole line that starts with `//` (after any indentation) is a comment.
const COMMENT_LINE = /^[ \t]*\/\/.*$/gm;

// A markdown link, `[words](https://…)`, draws as just its words, in the link
// colour and underlined, and opens its URL when clicked.
const LINK = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
// Underline thickness, and its height above the descender line (a selection
// rect's bottom), as fractions of font size: just under the baseline.
const UNDERLINE_THICKNESS = 0.05;
const UNDERLINE_RISE = 0.14;

interface TextLink {
  start: number;
  end: number;
  href: string;
}

// Links and effect words (`{{pour:poured}}`, see word-effect.ts), in one
// pass so each keeps its place in the words that are finally drawn.
const MARKUP = new RegExp(`${LINK.source}|${EFFECT_MARKER.source}`, 'g');

// The words to draw, and where in them each link and effect word sits.
export function parseMarkup(paragraph: string): { text: string; links: TextLink[]; effects: EffectSpan[] } {
  const links: TextLink[] = [];
  const effects: EffectSpan[] = [];
  let text = '';
  let last = 0;
  for (const match of paragraph.matchAll(MARKUP)) {
    text += paragraph.slice(last, match.index);
    const words = match[1] ?? match[4];
    if (match[1] !== undefined) {
      links.push({ start: text.length, end: text.length + words.length, href: match[2] });
    } else {
      effects.push({ start: text.length, end: text.length + words.length, effect: match[3] as WordEffectName });
    }
    text += words;
    last = match.index + match[0].length;
  }
  return { text: text + paragraph.slice(last), links, effects };
}

// Extra paragraph slots each named marker adds (unknown names add none).
export type SlotSpans = Readonly<Record<string, number>>;

// Where everything sits in the stack, in paragraph slots: paragraph i is
// centred at `positions[i]`; a named slot runs from the paragraph before its
// marker to the paragraph after it.
export interface TruthLayout {
  paragraphs: string[];
  positions: number[];
  slots: Record<string, { start: number; end: number }>;
  totalSlots: number;
}

export class RoseText {
  readonly group: THREE.Group;
  readonly meshes: Text[] = [];
  private readonly links: TextLink[][] = [];
  private readonly underlines: THREE.Mesh[][] = [];
  private readonly underlineMaterial: THREE.MeshBasicMaterial;
  // Per paragraph: its effect words, or null when it has none.
  private readonly effects: (EffectWords | null)[] = [];
  private wordPass = WORD_PASS.wide;

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
  private readonly layout: TruthLayout;

  // Mirror the opacity we *intend* to render at. Reading back from
  // mesh.material.opacity on a Troika Text mesh isn't reliable (Troika wraps
  // the assigned material in a derived shader material), so the test API
  // returns this field instead of round-tripping through Troika.
  private lastOpacity = 1;

  // `color` and `linkColor` are resolved colour tokens (any CSS colour string).
  constructor(
    body: string,
    bloomCenter: THREE.Vector3,
    color: string,
    slotSpans: SlotSpans = {},
    linkColor: string = color
  ) {
    if (typeof body !== 'string') {
      throw new TypeError(
        `RoseText requires a string body, got ${typeof body}. ` +
          `Check that the import uses ?raw and resolves to text, not a module.`
      );
    }

    this.layout = RoseText.layout(body, slotSpans);
    const { paragraphs } = this.layout;
    this.group = new THREE.Group();
    this.underlineMaterial = new THREE.MeshBasicMaterial({
      color: linkColor,
      transparent: true,
      opacity: TEXT_OPACITY,
      toneMapped: false,
      depthWrite: false,
    });

    paragraphs.forEach((paragraph, index) => {
      const { text: words, links, effects } = parseMarkup(paragraph);
      const text = new Text();
      text.text = words;
      // Troika leaves characters before the first range uncoloured (black), so
      // the ranges must start at 0 in the text colour.
      text.colorRanges = links.length
        ? Object.fromEntries([
            [0, color],
            ...links.flatMap((link) => [[link.start, linkColor], [link.end, color]]),
          ])
        : null;
      this.links.push(links);
      this.underlines.push([]);
      text.fontSize = TEXT_FONT_SIZE;
      text.lineHeight = TEXT_LINE_HEIGHT;
      text.maxWidth = TEXT_MAX_WIDTH;
      text.anchorX = 'center';
      text.anchorY = 'middle';
      text.textAlign = 'center';
      text.color = color;
      text.font = textFontUrl;
      text.letterSpacing = TEXT_LETTER_SPACING;
      text.material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: TEXT_OPACITY,
        toneMapped: false,
        depthWrite: false,
      });
      text.frustumCulled = false;
      this.effects.push(effects.length ? new EffectWords(text, effects) : null);
      // Stack each paragraph downward along local Y. Paragraph 0 sits at the
      // top of the stack so the first paragraph is what the user sees first.
      text.position.y = -this.layout.positions[index] * PARAGRAPH_SPACING;
      this.meshes.push(text);
      this.syncMesh(index);
      this.group.add(text);
    });

    this.bloomCenter = bloomCenter.clone();
    this.heightOffset = TEXT_OFFSET.y;
    this.radialDistance = Math.abs(TEXT_OFFSET.z);
    this.maxScrollOffset = RoseText.scrollLength(this.layout, false);

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
    this.underlineMaterial.opacity = TEXT_OPACITY * opacity;
    this.lastOpacity = opacity;

    // Each paragraph's height above the focal line drives its effect words.
    this.effects.forEach((words, index) => {
      if (!words) return;
      const lift = this.scrollOffset - this.layout.positions[index] * this.paragraphSpacing;
      words.update(lift, this.wordPass, TEXT_OPACITY * opacity);
    });
  }

  // Lays the paragraph out again, then redraws its link underlines to match.
  private syncMesh(index: number) {
    const mesh = this.meshes[index];
    mesh.sync(() => {
      for (const line of this.underlines[index]) {
        mesh.remove(line);
        line.geometry.dispose();
      }
      this.underlines[index] = [];
      this.effects[index]?.relayout();
      const info = mesh.textRenderInfo;
      if (!info) return;
      for (const link of this.links[index]) {
        for (const rect of getSelectionRects(info, link.start, link.end)) {
          const thickness = mesh.fontSize * UNDERLINE_THICKNESS;
          const line = new THREE.Mesh(
            new THREE.PlaneGeometry(rect.right - rect.left, thickness),
            this.underlineMaterial
          );
          line.position.set((rect.left + rect.right) / 2, rect.bottom + mesh.fontSize * UNDERLINE_RISE, 0);
          line.frustumCulled = false;
          // Never in the way of a click: the link is hit-tested on the text itself.
          line.raycast = () => {};
          mesh.add(line);
          this.underlines[index].push(line);
        }
      }
    });
  }

  // The URL of the link under the ray, or null. Only while the words are showing.
  linkAt(raycaster: THREE.Raycaster): string | null {
    if (this.lastOpacity <= 0.001) return null;
    const local = new THREE.Vector3();
    for (let index = 0; index < this.meshes.length; index++) {
      const links = this.links[index];
      const mesh = this.meshes[index];
      const info = mesh.textRenderInfo;
      if (links.length === 0 || !info) continue;
      const hit = raycaster.intersectObject(mesh, false)[0];
      if (!hit) continue;
      mesh.worldToLocal(local.copy(hit.point));
      for (const link of links) {
        const inside = getSelectionRects(info, link.start, link.end).some(
          (rect) => local.x >= rect.left && local.x <= rect.right && local.y >= rect.bottom && local.y <= rect.top
        );
        if (inside) return link.href;
      }
    }
    return null;
  }

  setScrollProgress(progress: number) {
    this.scrollOffset = THREE.MathUtils.clamp(progress, 0, 1) * this.maxScrollOffset;
  }

  setMobileLayout(enabled: boolean) {
    this.heightOffset = enabled ? MOBILE_HEIGHT_OFFSET : TEXT_OFFSET.y;
    this.radialDistance = enabled ? MOBILE_RADIAL_DISTANCE : Math.abs(TEXT_OFFSET.z);
    this.paragraphSpacing = enabled ? MOBILE_PARAGRAPH_SPACING : PARAGRAPH_SPACING;
    this.wordPass = enabled ? WORD_PASS.narrow : WORD_PASS.wide;
    this.maxScrollOffset = RoseText.scrollLength(this.layout, enabled);
    this.scrollOffset = Math.max(0, Math.min(this.maxScrollOffset, this.scrollOffset));

    this.meshes.forEach((mesh, index) => {
      mesh.fontSize = enabled ? MOBILE_TEXT_FONT_SIZE : TEXT_FONT_SIZE;
      mesh.lineHeight = enabled ? MOBILE_TEXT_LINE_HEIGHT : TEXT_LINE_HEIGHT;
      mesh.maxWidth = enabled ? MOBILE_TEXT_MAX_WIDTH : TEXT_MAX_WIDTH;
      mesh.position.y = -this.layout.positions[index] * this.paragraphSpacing;
      this.syncMesh(index);
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

  // Scroll position in paragraph slots (0 = first paragraph in focus).
  private scrolledSlots(): number {
    return this.paragraphSpacing > 0 ? this.scrollOffset / this.paragraphSpacing : 0;
  }

  getActiveParagraphIndex(): number {
    const scrolled = this.scrolledSlots();
    let nearest = 0;
    this.layout.positions.forEach((position, index) => {
      if (Math.abs(position - scrolled) < Math.abs(this.layout.positions[nearest] - scrolled)) {
        nearest = index;
      }
    });
    return nearest;
  }

  // Each paragraph's place on the poem's scroll timeline (0–1).
  getParagraphProgresses(): number[] {
    const total = this.maxScrollOffset;
    return this.layout.positions.map((position) => (total > 0 ? (position * this.paragraphSpacing) / total : 0));
  }

  // 0 while the paragraph before the named slot is in focus, 1 once the
  // paragraph after it is; 0 for a slot the text does not have.
  getSlotProgress(name: string): number {
    const slot = this.layout.slots[name];
    if (!slot || slot.end <= slot.start) return 0;
    return THREE.MathUtils.clamp((this.scrolledSlots() - slot.start) / (slot.end - slot.start), 0, 1);
  }

  // World position on the text plane, as of the last update(), of the
  // paragraph that opens the named slot. `parallax` (0–1) scales how far it
  // has scrolled from the focal line, so something set deep behind the words
  // moves less than they do. Leaves `out` untouched and returns false for an
  // unknown slot.
  getSlotAnchor(name: string, parallax: number, out: THREE.Vector3): boolean {
    const slot = this.layout.slots[name];
    if (!slot) return false;
    const opening = slot.start * this.paragraphSpacing;
    out.set(
      this.group.position.x,
      this.bloomCenter.y + this.heightOffset + parallax * (this.scrollOffset - opening),
      this.group.position.z
    );
    return true;
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

  // Progress (0–1) of every word with the named effect, in reading order.
  getEffectProgress(effect: WordEffectName): number[] {
    return this.effects.flatMap((words) => words?.getProgress(effect) ?? []);
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
    for (const line of this.underlines.flat()) line.geometry.dispose();
    for (const words of this.effects) words?.dispose();
    this.underlineMaterial.dispose();
    this.meshes.length = 0;
    if (this.group.parent) this.group.parent.remove(this.group);
  }

  static layout(body: string, slotSpans: SlotSpans = {}): TruthLayout {
    const paragraphs: string[] = [];
    const positions: number[] = [];
    const slots: TruthLayout['slots'] = {};
    let open: string[] = [];
    let cursor = 0;
    let pending = 0;
    for (const block of RoseText.parseParagraphs(body)) {
      const marker = SLOT_MARKER.exec(block);
      if (marker) {
        const name = marker[1];
        pending += slotSpans[name] ?? 0;
        slots[name] = { start: cursor, end: cursor };
        open.push(name);
        continue;
      }
      const position = paragraphs.length === 0 ? pending : cursor + 1 + pending;
      for (const name of open) slots[name].end = position;
      paragraphs.push(block);
      positions.push(position);
      open = [];
      cursor = position;
      pending = 0;
    }
    // A marker after the last paragraph still extends the scroll.
    for (const name of open) slots[name].end = cursor + pending;
    return { paragraphs, positions, slots, totalSlots: cursor + pending };
  }

  // How far (world units) the text travels over the section's scroll: until
  // the last paragraph is in focus, then on until it reaches the top of the
  // screen, so the preface ends on its last words up by the header.
  static scrollLength(layout: TruthLayout, narrow: boolean): number {
    const spacing = narrow ? MOBILE_PARAGRAPH_SPACING : PARAGRAPH_SPACING;
    return layout.totalSlots * spacing + (narrow ? END_LIFT.narrow : END_LIFT.wide);
  }

  // The same, in paragraph slots of that layout.
  static scrollSlots(body: string, slotSpans: SlotSpans, narrow: boolean): number {
    return RoseText.scrollLength(RoseText.layout(body, slotSpans), narrow) / (narrow ? MOBILE_PARAGRAPH_SPACING : PARAGRAPH_SPACING);
  }

  static parseParagraphs(body: string): string[] {
    return body
      // A line starting with `//` is a note to self: never drawn, and it
      // takes no room in the stack.
      .replace(COMMENT_LINE, '')
      .split(/\n\s*\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }
}
