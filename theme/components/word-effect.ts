import * as THREE from 'three';
import { createTextDerivedMaterial, getSelectionRects, type SelectionRect, type Text } from 'troika-three-text';
import { createDerivedMaterial } from 'troika-three-utils';
import { breath } from './breath';
import { WORD_EFFECTS, type WordEffectName } from './word-effects';

// A word wrapped as `{{name:word}}` in the preface (`{{pour:poured}}`,
// `{{beat:passion}}`) is drawn by the named effect instead of as plain
// text. The effects are listed in word-effects.ts.
//
// This file owns the plumbing every effect shares: finding the word, the
// shader hooks into its glyphs (their shape and their position), the
// scroll-driven progress and the clock. The look lives in each effect.

// A word's pass across the screen (0–1) runs from the moment it rises into
// view at the bottom to the moment it leaves at the top. Heights are world
// units of the word above the text's focal line, measured in the browser
// at the default camera per layout; re-measure if the camera or the text
// layout changes. Like the star, the same page position always renders the
// same frame.
export const WORD_PASS = {
  wide: { enter: -0.19, exit: 2.3 },
  narrow: { enter: -0.79, exit: 2.57 },
};

// The shader has room for this many effect words per paragraph.
const MAX_WORDS = 4;

export interface EffectSpan {
  start: number;
  end: number;
  effect: WordEffectName;
}

// One effect word as laid out in its paragraph, in that paragraph mesh's
// local space (x right, y up; units are world units).
export interface EffectWord {
  readonly text: string;
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
  readonly fontSize: number;
  // The paragraph's mesh, so an overlay can match its font and layout.
  readonly mesh: Text;
  // Stable per word, 0–1: lets two uses of the same word differ.
  readonly seed: number;
  // Where the word sits in the mesh's text: characters [start, end).
  readonly start: number;
  readonly end: number;
}

// Scene objects an effect draws around one word: anything that must reach
// outside the glyphs themselves. `object` is added to the paragraph mesh,
// so it uses the EffectWord's local coordinates.
export interface EffectOverlay {
  readonly object: THREE.Object3D;
  update(frame: EffectFrame): void;
  dispose(): void;
}

export interface EffectFrame {
  // The effect's progress (its `progress` of the word's pass), 0–1.
  t: number;
  // Seconds; frozen while reduced motion is on.
  time: number;
  // The text's overall opacity (it fades out while a poem is open).
  opacity: number;
}

// GLSL names an effect defines must start with its own prefix, since every
// effect's code shares one shader.
export interface WordEffect {
  // CSS colour, handed to the shaders as `tint`.
  readonly color: string;
  // The effect's t from the word's pass across the screen (both 0–1).
  progress(pass: number): number;
  // GLSL at file scope (helpers, constants) for glyphShader.
  readonly glyphDefs?: string;
  // GLSL body of
  //   vec4 f(vec2 uv, vec2 size, float t, float time, float dist, float aa,
  //          vec4 base, float seed, vec3 tint)
  // run for every fragment of the word's glyphs, returning its colour
  // (straight alpha). uv: 0–1 across the word's line box, x left→right,
  // y top→bottom, where the glyph sat before any vertexShader moved it.
  // size: the box in world units. dist: signed distance to the glyph edge
  // in world units (< 0 inside). aa: antialiasing width at this pixel.
  // base: how plain text would draw here. Uniforms in scope: float
  // uWordOpacity (the text's overall opacity) and float uWordStill (1 while
  // reduced motion holds `time` still: rest anything driven by the clock).
  readonly glyphShader: string;
  // GLSL at file scope for vertexShader.
  readonly vertexDefs?: string;
  // Optional GLSL body of
  //   vec2 f(vec2 corner, vec2 glyph, vec4 rect, float t, float time, float seed)
  // returning where a corner of one of the word's glyph quads goes. corner
  // and glyph (the glyph's centre) are paragraph-local; rect is the word's
  // line box (left, bottom, right, top). Return `corner` to leave it.
  readonly vertexShader?: string;
  // Optional scene objects drawn around each word.
  createOverlay?(word: EffectWord): EffectOverlay | null;
}

const EFFECT_NAMES = Object.keys(WORD_EFFECTS) as WordEffectName[];

// `{{name:word}}` draws as just `word`, with the named effect.
export const EFFECT_MARKER = new RegExp(`\\{\\{(${EFFECT_NAMES.join('|')}):([^{}]+)\\}\\}`);

// Seconds since load, held while reduced motion is on.
let clockOffset = 0;
let frozenAt: number | null = null;
function effectClock(): number {
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

// Uniforms of one paragraph's effect shader.
function createUniforms() {
  return {
    uWordRects: { value: Array.from({ length: MAX_WORDS }, () => new THREE.Vector4()) },
    uWordProgress: { value: new Array<number>(MAX_WORDS).fill(0) },
    uWordSeed: { value: new Array<number>(MAX_WORDS).fill(0) },
    uWordKind: { value: new Array<number>(MAX_WORDS).fill(0) },
    uWordTint: { value: Array.from({ length: MAX_WORDS }, () => new THREE.Color()) },
    uWordCount: { value: 0 },
    uWordTime: { value: 0 },
    uWordOpacity: { value: 1 },
    uWordStill: { value: 0 },
  };
}
type EffectUniforms = ReturnType<typeof createUniforms>;

const SHARED_DEFS = /* glsl */ `
  #define WORD_MAX ${MAX_WORDS}
  uniform vec4 uWordRects[WORD_MAX];
  uniform float uWordProgress[WORD_MAX];
  uniform float uWordSeed[WORD_MAX];
  uniform float uWordKind[WORD_MAX];
  uniform vec3 uWordTint[WORD_MAX];
  uniform int uWordCount;
  uniform float uWordTime;
  uniform float uWordOpacity;
  // 1 while reduced motion holds the clock still, else 0.
  uniform float uWordStill;
  varying vec2 vWordLocal;
  // Which effect word this glyph belongs to (its index), or -1. Decided per
  // glyph from its centre, so a glyph overhanging its word still belongs to
  // it and a neighbouring glyph (the full stop after it) never does.
  varying float vWordIndex;
`;

// Calls the effect whose index is `kind`, as an if-chain over every effect.
function dispatch(call: (name: WordEffectName) => string | null): string {
  return EFFECT_NAMES.map((name, kind) => {
    const body = call(name);
    return body ? `if (kind == ${kind}) { ${body} }` : '';
  }).join('\n');
}

const VERTEX_DEFS = /* glsl */ `
  ${SHARED_DEFS}
  ${EFFECT_NAMES.map((name) => {
    const effect: WordEffect = WORD_EFFECTS[name];
    if (!effect.vertexShader) return '';
    return `${effect.vertexDefs ?? ''}
      vec2 wordVertex_${name}(vec2 corner, vec2 glyph, vec4 rect, float t, float time, float seed) {
        ${effect.vertexShader}
      }`;
  }).join('\n')}
`;

// Runs once Troika has laid out the glyph corner (`position`); its glyph
// bounds and offset are in scope here.
const VERTEX_INTRO = /* glsl */ `
  vWordLocal = position.xy;
  vWordIndex = -1.0;
  vec2 wordGlyph = vec2(
    (aTroikaGlyphBounds.x + aTroikaGlyphBounds.z) * 0.5 + uTroikaPositionOffset.x,
    (aTroikaGlyphBounds.y + aTroikaGlyphBounds.w) * 0.5 - uTroikaPositionOffset.y
  );
  for (int i = 0; i < WORD_MAX; i++) {
    if (i >= uWordCount) break;
    vec4 r = uWordRects[i];
    if (wordGlyph.x < r.x || wordGlyph.x > r.z || wordGlyph.y < r.y || wordGlyph.y > r.w) continue;
    vWordIndex = float(i);
    int kind = int(uWordKind[i] + 0.5);
    ${dispatch((name) =>
      WORD_EFFECTS[name].vertexShader
        ? `position.xy = wordVertex_${name}(position.xy, wordGlyph, r, uWordProgress[i], uWordTime, uWordSeed[i]);`
        : null
    )}
    break;
  }
`;

const FRAGMENT_DEFS = /* glsl */ `
  ${SHARED_DEFS}
  ${EFFECT_NAMES.map((name) => {
    const effect: WordEffect = WORD_EFFECTS[name];
    return `${effect.glyphDefs ?? ''}
      vec4 wordGlyph_${name}(vec2 uv, vec2 size, float t, float time, float dist, float aa,
                             vec4 base, float seed, vec3 tint) {
        ${effect.glyphShader}
      }`;
  }).join('\n')}
`;

const FRAGMENT_TRANSFORM = /* glsl */ `
  for (int i = 0; i < WORD_MAX; i++) {
    if (i >= uWordCount) break;
    if (abs(vWordIndex - float(i)) > 0.5) continue;
    vec4 r = uWordRects[i];
    vec2 size = r.zw - r.xy;
    vec2 uv = vec2((vWordLocal.x - r.x) / size.x, (r.w - vWordLocal.y) / size.y);
    float dist = troikaGetFragDistValue();
    float aa = troikaGetAADist();
    int kind = int(uWordKind[i] + 0.5);
    ${dispatch(
      (name) =>
        `gl_FragColor = wordGlyph_${name}(uv, size, uWordProgress[i], uWordTime, dist, aa, gl_FragColor, uWordSeed[i], uWordTint[i]);`
    )}
    if (gl_FragColor.a <= 0.0) discard;
    break;
  }
`;

// Troika's text shader, wrapped twice: inside, to note each corner's place
// in the text block and let effects move their glyphs; outside, to hand the
// words' fragments to their effects once Troika has worked out the glyph
// shape.
function deriveEffectMaterial(base: THREE.Material, uniforms: EffectUniforms): THREE.Material {
  const located = createDerivedMaterial(base, {
    chained: true,
    uniforms,
    vertexDefs: VERTEX_DEFS,
    // `position` here is already Troika's laid-out glyph corner.
    vertexMainIntro: VERTEX_INTRO,
  });
  const text = createTextDerivedMaterial(located);
  return createDerivedMaterial(text, {
    chained: true,
    uniforms,
    fragmentDefs: FRAGMENT_DEFS,
    fragmentColorTransform: FRAGMENT_TRANSFORM,
  });
}

// The effect words of one paragraph.
export class EffectWords {
  private readonly uniforms = createUniforms();
  private words: (EffectWord & { effect: WordEffectName })[] = [];
  // One per word, aligned with `words`; null where the effect draws none.
  private overlays: (EffectOverlay | null)[] = [];

  constructor(
    private readonly mesh: Text,
    private readonly spans: readonly EffectSpan[]
  ) {
    const uniforms = this.uniforms;
    mesh.createDerivedMaterial = (base) => deriveEffectMaterial(base, uniforms);
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
        if (this.words.length >= MAX_WORDS) return;
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
          effect: span.effect,
        });
      }
    });
    const u = this.uniforms;
    this.words.forEach((word, index) => {
      const effect: WordEffect = WORD_EFFECTS[word.effect];
      u.uWordRects.value[index].set(word.left, word.bottom, word.right, word.top);
      u.uWordSeed.value[index] = word.seed;
      u.uWordKind.value[index] = EFFECT_NAMES.indexOf(word.effect);
      u.uWordTint.value[index].set(effect.color);
      const overlay = effect.createOverlay?.(word) ?? null;
      if (overlay) this.mesh.add(overlay.object);
      this.overlays.push(overlay);
    });
    u.uWordCount.value = this.words.length;
  }

  // `lift`: world height of the paragraph mesh's origin above the focal line.
  update(lift: number, pass: { enter: number; exit: number }, opacity: number) {
    const time = effectClock();
    this.uniforms.uWordTime.value = time;
    this.uniforms.uWordOpacity.value = opacity;
    this.uniforms.uWordStill.value = breath.still ? 1 : 0;
    this.words.forEach((word, index) => {
      const height = lift + (word.top + word.bottom) / 2;
      const along = THREE.MathUtils.clamp((height - pass.enter) / (pass.exit - pass.enter), 0, 1);
      const t = WORD_EFFECTS[word.effect].progress(along);
      this.uniforms.uWordProgress.value[index] = t;
      this.overlays[index]?.update({ t, time, opacity });
    });
  }

  // Progress of each word with the named effect, in reading order.
  getProgress(effect: WordEffectName): number[] {
    return this.words.flatMap((word, index) =>
      word.effect === effect ? [this.uniforms.uWordProgress.value[index]] : []
    );
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
