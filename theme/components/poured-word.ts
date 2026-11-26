import * as THREE from 'three';
import { createTextDerivedMaterial, getSelectionRects, type SelectionRect, type Text } from 'troika-three-text';
import { createDerivedMaterial } from 'troika-three-utils';
import { breath } from './breath';
import { POUR_EFFECT } from './poured-effect';

// A word wrapped as `{{word}}` in the preface is poured onto the screen: it
// is drawn by POUR_EFFECT (poured-effect.ts) instead of as plain text, and
// how much of it has been poured is set by where it is on screen.
//
// This file owns the plumbing every pour shares: finding the word, the
// shader hook into its glyphs, the scroll-driven progress and the clock.
// The look of the pour lives entirely in poured-effect.ts.

// The pour's progress t (0–1) runs from the moment the word rises into view
// at the bottom of the screen to the moment it leaves at the top. Heights
// are world units of the word above the text's focal line, measured in the
// browser at the default camera per layout; re-measure if the camera or
// the text layout changes. Like the star, the same page position always
// renders the same pour.
export const POUR_PASS = {
  wide: { enter: -0.19, exit: 2.3 },
  narrow: { enter: -0.79, exit: 2.57 },
};

// Where on its pass across the screen the word is poured. Effects are
// written to be readable from t = EFFECT_READABLE; the pass is remapped so
// that happens at `readable` of the way up the screen. Before `start` the
// pour has not begun (t = 0); the pour itself then takes the same share of
// the pass it was written for, and the rest of the pass runs on to t = 1.
export const POUR_TIMING = { start: 0.2, readable: 0.4 };
const EFFECT_READABLE = 0.2;

function pourTime(pass: number): number {
  const { start, readable } = POUR_TIMING;
  if (pass <= start) return 0;
  if (pass <= readable) return (EFFECT_READABLE * (pass - start)) / (readable - start);
  return EFFECT_READABLE + ((1 - EFFECT_READABLE) * (pass - readable)) / (1 - readable);
}

// Glyphs can overhang their characters' selection rects a little; this much
// extra (as a fraction of font size) on each side still counts as the word.
const RECT_PAD = 0.12;
// The shader has room for this many poured words per paragraph.
const MAX_POURS = 4;

export interface PourSpan {
  start: number;
  end: number;
}

// One poured word as laid out in its paragraph, in that paragraph mesh's
// local space (x right, y up; units are world units).
export interface PourWord {
  readonly text: string;
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
  readonly fontSize: number;
  // The paragraph's mesh, so an overlay can match its font and layout.
  readonly mesh: Text;
  // Stable per word, 0–1: lets two pours of the same word differ.
  readonly seed: number;
  // Where the word sits in the mesh's text: characters [start, end).
  readonly start: number;
  readonly end: number;
}

// Scene objects an effect draws around one word (streams, drips, drops):
// anything that must reach outside the glyphs themselves. `object` is added
// to the paragraph mesh, so it uses the PourWord's local coordinates.
export interface PourOverlay {
  readonly object: THREE.Object3D;
  update(frame: PourFrame): void;
  dispose(): void;
}

export interface PourFrame {
  // Pour progress, 0 (word entering at the bottom) to 1 (leaving at the top).
  t: number;
  // Seconds; frozen while reduced motion is on.
  time: number;
  // The text's overall opacity (it fades out while a poem is open).
  opacity: number;
}

export interface PourEffect {
  // CSS colour of the poured material.
  readonly color: string | null;
  // GLSL at file scope (helpers, constants) for glyphShader.
  readonly glyphDefs?: string;
  // GLSL body of
  //   vec4 pourGlyph(vec2 uv, vec2 size, float t, float time, float dist,
  //                  float aa, vec4 base, float seed)
  // run for every fragment of the word's glyphs, returning its colour
  // (straight alpha). uv: 0–1 across the word's line box, x left→right,
  // y top→bottom. size: the box in world units. dist: signed distance to
  // the glyph edge in world units (< 0 inside). aa: antialiasing width at
  // this pixel. base: how plain text would draw here. Uniforms in scope:
  // vec3 uPourColor, float uPourOpacity (the text's overall opacity).
  readonly glyphShader: string;
  // Optional scene objects drawn around each word.
  createOverlay?(word: PourWord): PourOverlay | null;
}

// `{{word}}` draws as just `word`, poured.
export const POUR_MARKER = /\{\{([^{}]+)\}\}/;

// Seconds since load, held while reduced motion is on.
let clockOffset = 0;
let frozenAt: number | null = null;
function pourClock(): number {
  const now = performance.now() / 1000;
  if (breath.still) {
    frozenAt ??= now - clockOffset;
    return frozenAt;
  }
  if (frozenAt !== null) {
    clockOffset = now - frozenAt;
    frozenAt = null;
  }
  return now - clockOffset;
}

function hash(text: string, index: number): number {
  let h = 2166136261 ^ index;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

// Troika gives one rect per glyph; merge them into one rect per line.
function lineRects(rects: SelectionRect[]): SelectionRect[] {
  const lines: SelectionRect[] = [];
  for (const rect of rects) {
    const line = lines.find((l) => Math.abs(l.top - rect.top) < 1e-4 && Math.abs(l.bottom - rect.bottom) < 1e-4);
    if (line) {
      line.left = Math.min(line.left, rect.left);
      line.right = Math.max(line.right, rect.right);
    } else {
      lines.push({ ...rect });
    }
  }
  return lines;
}

// Uniforms of one paragraph's pour shader.
function createUniforms(color: THREE.Color) {
  return {
    uPourRects: { value: Array.from({ length: MAX_POURS }, () => new THREE.Vector4()) },
    uPourProgress: { value: new Array<number>(MAX_POURS).fill(0) },
    uPourSeed: { value: new Array<number>(MAX_POURS).fill(0) },
    uPourCount: { value: 0 },
    uPourTime: { value: 0 },
    uPourOpacity: { value: 1 },
    uPourPad: { value: 0 },
    uPourColor: { value: color },
  };
}
type PourUniforms = ReturnType<typeof createUniforms>;

// Troika's text shader, wrapped twice: inside, to carry each fragment's
// position in the text block; outside, to hand the word's fragments to the
// effect once Troika has worked out the glyph shape.
function derivePourMaterial(base: THREE.Material, uniforms: PourUniforms): THREE.Material {
  const located = createDerivedMaterial(base, {
    chained: true,
    vertexDefs: 'varying vec2 vPourLocal;',
    // `position` here is already Troika's laid-out glyph corner.
    vertexMainOutro: 'vPourLocal = position.xy;',
  });
  const text = createTextDerivedMaterial(located);
  return createDerivedMaterial(text, {
    chained: true,
    uniforms,
    fragmentDefs: /* glsl */ `
      #define POUR_MAX ${MAX_POURS}
      uniform vec4 uPourRects[POUR_MAX];
      uniform float uPourProgress[POUR_MAX];
      uniform float uPourSeed[POUR_MAX];
      uniform int uPourCount;
      uniform float uPourTime;
      uniform float uPourOpacity;
      uniform float uPourPad;
      uniform vec3 uPourColor;
      varying vec2 vPourLocal;
      ${POUR_EFFECT.glyphDefs ?? ''}
      vec4 pourGlyph(vec2 uv, vec2 size, float t, float time, float dist, float aa, vec4 base, float seed) {
        ${POUR_EFFECT.glyphShader}
      }
    `,
    fragmentColorTransform: /* glsl */ `
      for (int i = 0; i < POUR_MAX; i++) {
        if (i >= uPourCount) break;
        vec4 r = uPourRects[i];
        if (vPourLocal.x < r.x - uPourPad || vPourLocal.x > r.z + uPourPad ||
            vPourLocal.y < r.y || vPourLocal.y > r.w) continue;
        vec2 size = r.zw - r.xy;
        vec2 uv = vec2((vPourLocal.x - r.x) / size.x, (r.w - vPourLocal.y) / size.y);
        vec4 poured = pourGlyph(uv, size, uPourProgress[i], uPourTime,
          troikaGetFragDistValue(), troikaGetAADist(), gl_FragColor, uPourSeed[i]);
        gl_FragColor = poured;
        if (gl_FragColor.a <= 0.0) discard;
        break;
      }
    `,
  });
}

// The poured words of one paragraph.
export class PouredWords {
  private readonly uniforms: PourUniforms;
  private words: PourWord[] = [];
  // One per word, aligned with `words`; null where the effect draws none.
  private overlays: (PourOverlay | null)[] = [];

  constructor(
    private readonly mesh: Text,
    private readonly spans: readonly PourSpan[],
    fallbackColor: string
  ) {
    this.uniforms = createUniforms(new THREE.Color(POUR_EFFECT.color ?? fallbackColor));
    const uniforms = this.uniforms;
    mesh.createDerivedMaterial = (base) => derivePourMaterial(base, uniforms);
  }

  // After every layout: find where the words landed and rebuild overlays.
  relayout() {
    this.disposeOverlays();
    this.words = [];
    const info = this.mesh.textRenderInfo;
    if (!info) return;
    const text = this.mesh.text;
    this.spans.forEach((span, spanIndex) => {
      // A word broken over two lines yields one rect per line.
      for (const rect of lineRects(getSelectionRects(info, span.start, span.end))) {
        if (this.words.length >= MAX_POURS) return;
        this.words.push({
          text: text.slice(span.start, span.end),
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          fontSize: this.mesh.fontSize,
          mesh: this.mesh,
          seed: hash(text, spanIndex),
          start: span.start,
          end: span.end,
        });
      }
    });
    this.words.forEach((word, index) => {
      this.uniforms.uPourRects.value[index].set(word.left, word.bottom, word.right, word.top);
      this.uniforms.uPourSeed.value[index] = word.seed;
      const overlay = POUR_EFFECT.createOverlay?.(word) ?? null;
      if (overlay) this.mesh.add(overlay.object);
      this.overlays.push(overlay);
    });
    this.uniforms.uPourCount.value = this.words.length;
    this.uniforms.uPourPad.value = this.mesh.fontSize * RECT_PAD;
  }

  // `lift`: world height of the paragraph mesh's origin above the focal line.
  update(lift: number, pass: { enter: number; exit: number }, opacity: number) {
    const time = pourClock();
    this.uniforms.uPourTime.value = time;
    this.uniforms.uPourOpacity.value = opacity;
    this.words.forEach((word, index) => {
      const height = lift + (word.top + word.bottom) / 2;
      const t = pourTime(THREE.MathUtils.clamp((height - pass.enter) / (pass.exit - pass.enter), 0, 1));
      this.uniforms.uPourProgress.value[index] = t;
      this.overlays[index]?.update({ t, time, opacity });
    });
  }

  // Pour progress of each word, in reading order.
  getProgress(): number[] {
    return this.uniforms.uPourProgress.value.slice(0, this.words.length);
  }

  private disposeOverlays() {
    for (const overlay of this.overlays) {
      if (!overlay) continue;
      this.mesh.remove(overlay.object);
      overlay.dispose();
    }
    this.overlays = [];
  }

  dispose() {
    this.disposeOverlays();
  }
}
