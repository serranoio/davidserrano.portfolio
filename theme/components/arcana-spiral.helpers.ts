// The House of Arcana's homepage rose, ported: one camera looks into a tilted cup of comets, each a decorative
// market travelling from its opening at the centre to its resolution at the rim, drawn as a live chart dot over a
// gradient filling the area under its recent path. Deterministic in time; it claims no real market.
// Source: the-house-of-arcana packages/ui/src/pages/home-page/home-page.helpers.ts and home-page.market.ts.

/** The golden angle (≈137.508°): each comet turns by it from the last, so they overlap least, as in a sunflower. */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** The Arcana `flow.home*` token values the rose is built from, copied (durations in ms, lengths in rem). */
export const ARCANA_SPIRAL = {
  seeds: 233,
  rotationMs: 144_000,
  lifeMs: 34_000,
  breathMs: 8_000,
  bloomMs: 1_600,
  cameraSway: 5,
  cameraSwayMs: 34_000,
  cameraDistance: 2.6,
  cupDepth: 0.35,
  fog: 0.6,
  cupViewMargin: 6,
  precessionMs: 55_000,
  lightMs: 34_000,
  lightRadius: 1.1,
  lightHeight: 0.6,
  lightReach: 2.2,
  ambient: 0.8,
  lightStrength: 0.3,
  dotRem: 0.375,
  halo: 1.4,
  pulseMs: 1_470,
  pulseSweepMs: 4_000,
  pulseReach: 4.5,
  pulseLine: 0.05,
  pulseAlpha: 0.5,
  glint: 0.9,
  glintSharpness: 6,
  marketHeight: 0.16,
  marketTwist: 1.4,
  marketResolve: 0.12,
  trail: 0.25,
  trailPoints: 16,
  trailAlpha: 0.35,
  trailBands: 12,
  trailFrom: 0.12,
  trailTo: 0.4,
  sourceAlpha: 0.9,
  strength: 0.85,
  /** Arcana's homepage overfills its full-screen canvas (1.125); a corner mark keeps the whole cup in its box. */
  scale: 1,
} as const;

const S = ARCANA_SPIRAL;
const radians = (degrees: number) => (degrees * Math.PI) / 180;

/** Phase in [0, 2π) of a cycle; a still frame rests at phase 0. */
function cyclePhase(elapsedMs: number, periodMs: number) {
  return Number.isFinite(elapsedMs) && periodMs > 0 ? ((elapsedMs / periodMs) % 1) * Math.PI * 2 : 0;
}

/**
 * Camera pitch and cup lean that turn the cup as far as possible while always showing its inside: the lean sweeps the
 * view from straight down to the line over the rim (plus a margin), sway included.
 */
const VIEW = (() => {
  const rimHeight = S.cupDepth + S.marketHeight / 2;
  const floor = (Math.atan(rimHeight) * 180) / Math.PI + S.cupViewMargin;
  const lean = (90 - floor - S.cameraSway) / 2;
  return { lean, pitch: 90 - lean };
})();

type Vector = { x: number; y: number; z: number };
type Point = { x: number; y: number };
type Camera = { pitch: number; distance: number };
type Orientation = { lean: number; heading: number };
type Projection = Point & { scale: number; toward: number };

function camera(elapsedMs: number): Camera {
  const phase = Number.isFinite(elapsedMs) ? Math.sin((elapsedMs / S.cameraSwayMs) * Math.PI * 2) : 0;
  return { pitch: radians(VIEW.pitch + S.cameraSway * phase), distance: S.cameraDistance };
}

/** Looks down at the cup from the camera's pitch; the cup centre projects to the origin at scale 1. */
function project(point: Vector, view: Camera): Projection {
  const cos = Math.cos(view.pitch);
  const sin = Math.sin(view.pitch);
  const up = point.y * cos - point.z * sin;
  const toward = point.y * sin + point.z * cos;
  const scale = view.distance / Math.max(1e-3, view.distance - toward);
  return { x: point.x * scale, y: -up * scale, scale, toward };
}

/** Tips a point in the cup's frame by the orientation (Rodrigues rotation about the ground axis across the heading). */
function orient(point: Vector, o: Orientation): Vector {
  const ax = Math.sin(o.heading);
  const az = -Math.cos(o.heading);
  const cos = Math.cos(o.lean);
  const sin = Math.sin(o.lean);
  const dot = ax * point.x + az * point.z;
  const cross = { x: -az * point.y, y: az * point.x - ax * point.z, z: ax * point.y };
  return {
    x: point.x * cos + cross.x * sin + ax * dot * (1 - cos),
    y: point.y * cos + cross.y * sin,
    z: point.z * cos + cross.z * sin + az * dot * (1 - cos),
  };
}

const cupHeight = (radius: number) => S.cupDepth * radius * radius;
const fade = (toward: number) => 1 - S.fog * (1 - Math.min(1, Math.max(0, (toward + 1) / 2)));

/** Screen reach of the whole cup in cup radii across every camera sway, heading and market lift, so no frame clips. */
let reach: Point | undefined;
function cupReach(): Point {
  if (reach) return reach;
  let x = 0;
  let y = 0;
  const lift = S.marketHeight / 2;
  for (const side of [-1, 0, 1]) {
    const view = { pitch: radians(VIEW.pitch + side * S.cameraSway), distance: S.cameraDistance };
    for (let turn = 0; turn < 36; turn += 1) {
      const o = { lean: radians(VIEW.lean), heading: (turn / 36) * Math.PI * 2 };
      for (let ring = 1; ring <= 8; ring += 1)
        for (let step = 0; step < 48; step += 1)
          for (const offset of [-lift, lift]) {
            const r = ring / 8;
            const a = (step / 48) * Math.PI * 2;
            const p = project(orient({ x: Math.cos(a) * r, y: cupHeight(r) + offset, z: Math.sin(a) * r }, o), view);
            x = Math.max(x, Math.abs(p.x));
            y = Math.max(y, Math.abs(p.y));
          }
    }
  }
  return (reach = { x, y });
}

/** Deterministic value in [0, 1) for a pair of integers. */
function hash(a: number, b: number) {
  const value = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

/** Lives pair up in opening order, one YES and one NO per pair; which goes YES is hashed so the pattern never stripes. */
function outcomeOf(life: number): 0 | 1 {
  const flip = hash(Math.floor(life / 2), 3) < 0.5 ? 0 : 1;
  return ((life % 2) ^ flip) as 0 | 1;
}

/** Even odds at birth, a smooth drift toward the outcome, resolution over the last stretch of life. */
function marketAt(life: number, progress: number) {
  const outcome = outcomeOf(life);
  const lived = Math.min(1, Math.max(0, progress));
  const open = 0.5 + (outcome - 0.5) * lived * lived;
  const t = Math.min(1, Math.max(0, (lived - (1 - S.marketResolve)) / S.marketResolve));
  const resolved = t * t * (3 - 2 * t);
  return { probability: open + (outcome - open) * resolved, outcome, resolved };
}

const lift = (probability: number) => (probability - 0.5) * S.marketHeight;

type Seed = Vector & {
  envelope: number;
  progress: number;
  outcome: 0 | 1;
  resolved: number;
  trail: Vector[];
  floor: Vector[];
};

/** Each comet opens at the centre, travels out and up the cup as its market runs, resolves at the rim, then reopens. */
function seeds(elapsedMs: number, rotation: number): Seed[] {
  const moving = Number.isFinite(elapsedMs);
  return Array.from({ length: S.seeds }, (_, index) => {
    const origin = (index + 0.5) / S.seeds;
    const travelled = moving ? origin + elapsedMs / S.lifeMs : origin;
    const cycle = Math.floor(travelled);
    const progress = travelled - cycle;
    const life = cycle * S.seeds + (S.seeds - 1 - index);
    const point = (at: number): Vector => {
      // Square-root radius keeps an even density; the twist curls each path into a spiral arm.
      const radius = Math.sqrt(Math.max(0, at));
      const angle = index * GOLDEN_ANGLE + rotation + S.marketTwist * radius;
      return { x: Math.cos(angle) * radius, y: cupHeight(radius) + lift(marketAt(life, at).probability), z: Math.sin(angle) * radius };
    };
    const trail = Array.from({ length: S.trailPoints + 1 }, (_, step) => progress - (S.trail * step) / S.trailPoints)
      .filter((at) => at >= 0)
      .map(point);
    return {
      ...point(progress),
      ...marketAt(life, progress),
      progress,
      envelope: moving ? Math.min(1, progress * 12, (1 - progress) * 12) : 1,
      trail,
      floor: trail.map((p) => ({ x: p.x, y: cupHeight(Math.hypot(p.x, p.z)) + lift(0), z: p.z })),
    };
  });
}

/** `color` (any CSS colour) as an rgba string at `alpha`, read back through the canvas so every colour form works. */
function withAlpha(context: CanvasRenderingContext2D, color: string, alpha: number) {
  context.fillStyle = color;
  const normal = String(context.fillStyle);
  if (normal.startsWith('#')) {
    const value = Number.parseInt(normal.slice(1, 7), 16);
    return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
  }
  return normal.replace(/^rgba?\(([^,]+),([^,]+),([^,)]+).*$/, `rgba($1,$2,$3, ${alpha})`);
}

/** Faintest alpha drawn: one 8-bit step. WebKit's accelerated canvas paints far smaller alphas fully opaque. */
function setAlpha(context: CanvasRenderingContext2D, alpha: number) {
  if (!(alpha >= 1 / 255)) return false;
  context.globalAlpha = alpha;
  return true;
}

/** The colours the rose paints with, read from the page's tokens. */
export type ArcanaSpiralColors = {
  comet: string;
  yes: string;
  no: string;
  glint: string;
  /** Canvas compositing: `lighter` adds light on a night ground; `source-over` lays ink on a light one. */
  blend: GlobalCompositeOperation;
};

/** Comet heads (base and each outcome) and the glint, stamped scaled per comet. */
export type ArcanaSpiralSprites = { key: string; head: HTMLCanvasElement; yes: HTMLCanvasElement; no: HTMLCanvasElement; glow: HTMLCanvasElement };

const SPRITE_PIXELS = 64;

function sprite(paint: (context: CanvasRenderingContext2D, half: number) => void) {
  const image = document.createElement('canvas');
  image.width = image.height = SPRITE_PIXELS;
  const context = image.getContext('2d');
  if (context) paint(context, SPRITE_PIXELS / 2);
  return image;
}

/** A chart's live dot: a solid disc, brighter at its heart, inside a small soft halo in the same colour. */
function head(color: string, glint: string) {
  return sprite((context, half) => {
    const dot = half / Math.max(1, S.halo);
    const glow = context.createRadialGradient(half, half, dot, half, half, half);
    glow.addColorStop(0, withAlpha(context, color, 0.45));
    glow.addColorStop(0.4, withAlpha(context, color, 0.12));
    glow.addColorStop(1, withAlpha(context, color, 0));
    context.fillStyle = glow;
    context.fillRect(0, 0, SPRITE_PIXELS, SPRITE_PIXELS);
    const disc = context.createRadialGradient(half, half, 0, half, half, dot);
    disc.addColorStop(0, glint);
    disc.addColorStop(0.55, color);
    disc.addColorStop(1, color);
    context.fillStyle = disc;
    context.beginPath();
    context.arc(half, half, dot, 0, Math.PI * 2);
    context.fill();
  });
}

/** Builds the sprites, reusing `previous` while the colours are unchanged. */
export function arcanaSpiralSprites(colors: ArcanaSpiralColors, previous?: ArcanaSpiralSprites): ArcanaSpiralSprites {
  const key = `${colors.comet}|${colors.yes}|${colors.no}|${colors.glint}`;
  if (previous?.key === key) return previous;
  return {
    key,
    head: head(colors.comet, colors.glint),
    yes: head(colors.yes, colors.glint),
    no: head(colors.no, colors.glint),
    glow: sprite((context, half) => {
      const gradient = context.createRadialGradient(half, half, 0, half, half, half);
      gradient.addColorStop(0, withAlpha(context, colors.glint, 1));
      gradient.addColorStop(0.25, withAlpha(context, colors.glint, 0.55));
      gradient.addColorStop(1, withAlpha(context, colors.glint, 0));
      context.fillStyle = gradient;
      context.fillRect(0, 0, SPRITE_PIXELS, SPRITE_PIXELS);
    }),
  };
}

/** A clockwise turn from the top, in [0, 1), of a point around the centre. */
function sweepTurn(point: Point, centre: Point) {
  const turn = Math.atan2(point.x - centre.x, centre.y - point.y) / (Math.PI * 2);
  return turn - Math.floor(turn);
}

/** The ring a sweep fires as it passes a dot: it grows and fades for one period, then rests until the sweep returns. */
function pulseRing(turn: number, elapsedMs: number) {
  if (!Number.isFinite(elapsedMs)) return null;
  const since = elapsedMs - turn * S.pulseSweepMs;
  const age = since - Math.floor(since / S.pulseSweepMs) * S.pulseSweepMs;
  if (age >= S.pulseMs) return null;
  const phase = age / S.pulseMs;
  return { scale: 1 + (S.pulseReach - 1) * phase, alpha: S.pulseAlpha * (1 - phase) };
}

function strokePulse(context: CanvasRenderingContext2D, elapsedMs: number, dot: Point & { turn: number; diameter: number; color: string; strength: number }) {
  const ring = pulseRing(dot.turn, elapsedMs);
  if (!ring || dot.diameter <= 0 || !setAlpha(context, dot.strength * ring.alpha)) return;
  const across = dot.diameter * ring.scale;
  context.strokeStyle = dot.color;
  context.lineWidth = across * S.pulseLine;
  context.beginPath();
  context.arc(dot.x, dot.y, across / 2, 0, Math.PI * 2);
  context.stroke();
}

/** How much of its trail a comet shows: none while it darts away from the centre, all once it has slowed. */
function tailGrowth(progress: number) {
  const t = Math.min(1, Math.max(0, (progress - S.trailFrom) / (S.trailTo - S.trailFrom)));
  return t * t * (3 - 2 * t);
}

/** The area under a comet's path, in bands from the path down to its floor, fading band by band and toward its tail. */
function fillTrail(context: CanvasRenderingContext2D, trail: Point[], floor: Point[], color: string, alpha: number) {
  const length = Math.min(trail.length, floor.length);
  if (length < 2) return;
  const fadeAlong = context.createLinearGradient(trail[0]!.x, trail[0]!.y, trail[length - 1]!.x, trail[length - 1]!.y);
  fadeAlong.addColorStop(0, withAlpha(context, color, 1));
  fadeAlong.addColorStop(1, withAlpha(context, color, 0));
  context.fillStyle = fadeAlong;
  const at = (depth: number) =>
    Array.from({ length }, (_, i) => ({ x: trail[i]!.x + (floor[i]!.x - trail[i]!.x) * depth, y: trail[i]!.y + (floor[i]!.y - trail[i]!.y) * depth }));
  for (let band = 0; band < S.trailBands; band += 1) {
    if (!setAlpha(context, alpha * (1 - (band + 0.5) / S.trailBands))) continue;
    const outline = [...at(band / S.trailBands), ...at((band + 1) / S.trailBands).reverse()];
    context.beginPath();
    context.moveTo(outline[0]!.x, outline[0]!.y);
    for (const p of outline.slice(1)) context.lineTo(p.x, p.y);
    context.closePath();
    context.fill();
  }
}

/** Opening bloom in [0, 1], eased out so the rose settles rather than stops. */
const bloom = (elapsedMs: number) => 1 - (1 - Math.min(1, Math.max(0, elapsedMs / S.bloomMs))) ** 3;

/** Matches the backing store to the CSS box at a device ratio clamped to 2, and scales drawing to CSS pixels. */
export function fitArcanaSpiralCanvas(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D, width: number, height: number) {
  const dpr = globalThis.devicePixelRatio;
  const ratio = Number.isFinite(dpr) && dpr > 0 ? Math.min(dpr, 2) : 1;
  if (canvas.width !== Math.round(width * ratio)) canvas.width = Math.round(width * ratio);
  if (canvas.height !== Math.round(height * ratio)) canvas.height = Math.round(height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
}

/**
 * Paints one frame `elapsedMs` after start (`Infinity` for the settled still frame): the cup leans and precesses,
 * the light orbits, comets are projected and painted far to near — trails, then dots crossfading to their outcome's
 * colour as they resolve, their pulse rings, and a glint where the light is strongest.
 */
export function paintArcanaSpiral(
  context: CanvasRenderingContext2D,
  frame: { width: number; height: number; elapsedMs: number; rem: number; colors: ArcanaSpiralColors; sprites: ArcanaSpiralSprites },
) {
  const { width, height, elapsedMs, colors, sprites } = frame;
  context.clearRect(0, 0, width, height);
  const moving = Number.isFinite(elapsedMs);
  const opacity = bloom(elapsedMs);
  const fit = cupReach();
  const radius = Math.min(width / 2 / fit.x, height / 2 / fit.y) * S.scale * (0.6 + 0.4 * opacity);
  const view = camera(elapsedMs);
  const o = { lean: radians(VIEW.lean), heading: cyclePhase(elapsedMs, S.precessionMs) };
  const azimuth = (-3 * Math.PI) / 4 + cyclePhase(elapsedMs, S.lightMs);
  const light = { x: Math.cos(azimuth) * S.lightRadius, y: S.lightHeight, z: Math.sin(azimuth) * S.lightRadius };
  const strength = S.strength * (moving ? 0.9 + 0.1 * Math.sin((elapsedMs / S.breathMs) * Math.PI * 2) : 1);
  const dotSize = S.dotRem * frame.rem;
  const centre = { x: width / 2, y: height / 2 };
  const place = (v: Vector) => {
    const p = project(orient(v, o), view);
    return { x: centre.x + p.x * radius, y: centre.y + p.y * radius };
  };
  const fall = (world: Vector) => {
    const near = Math.max(0, 1 - Math.hypot(world.x - light.x, world.y - light.y, world.z - light.z) / S.lightReach);
    return near * near;
  };
  const stamps = seeds(elapsedMs, moving ? (elapsedMs / S.rotationMs) * Math.PI * 2 : 0)
    .map((seed) => {
      const world = orient(seed, o);
      const point = project(world, view);
      const lit = fall(world);
      return {
        seed,
        toward: point.toward,
        x: centre.x + point.x * radius,
        y: centre.y + point.y * radius,
        diameter: dotSize * seed.envelope,
        strength: opacity * seed.envelope * strength * fade(point.toward) * Math.min(1, S.ambient + S.lightStrength * lit),
        glint: S.glint * lit ** S.glintSharpness,
        trail: seed.trail.map(place),
        floor: seed.floor.map(place),
      };
    })
    .sort((a, b) => a.toward - b.toward);
  const colorOf = (seed: Seed) => (seed.resolved > 0.5 ? (seed.outcome === 1 ? colors.yes : colors.no) : colors.comet);

  context.globalCompositeOperation = colors.blend;
  for (const stamp of stamps) {
    const grown = tailGrowth(stamp.seed.progress);
    if (grown > 0) fillTrail(context, stamp.trail, stamp.floor, colorOf(stamp.seed), stamp.strength * S.trailAlpha * grown);
  }
  // One steady dot at the centre: the source every comet emerges from.
  const source = place({ x: 0, y: 0, z: 0 });
  const sourceSprite = dotSize * S.halo;
  const sourceStrength = opacity * strength * S.sourceAlpha;
  if (setAlpha(context, sourceStrength)) context.drawImage(sprites.head, source.x - sourceSprite / 2, source.y - sourceSprite / 2, sourceSprite, sourceSprite);
  strokePulse(context, elapsedMs, { ...source, turn: 0, diameter: dotSize, color: colors.comet, strength: sourceStrength });
  for (const { seed, x, y, diameter, strength: s, glint } of stamps) {
    const size = diameter * S.halo;
    const box = [x - size / 2, y - size / 2, size, size] as const;
    if (setAlpha(context, s * (1 - seed.resolved))) context.drawImage(sprites.head, ...box);
    if (setAlpha(context, s * seed.resolved)) context.drawImage(seed.outcome === 1 ? sprites.yes : sprites.no, ...box);
    strokePulse(context, elapsedMs, { x, y, turn: sweepTurn({ x, y }, source), diameter, color: colorOf(seed), strength: s });
    if (glint < 0.05 || !setAlpha(context, s * glint)) continue;
    const flare = diameter * 1.6;
    context.drawImage(sprites.glow, x - flare / 2, y - flare / 2, flare, flare);
  }
  context.globalCompositeOperation = 'source-over';
  context.globalAlpha = 1;
}
