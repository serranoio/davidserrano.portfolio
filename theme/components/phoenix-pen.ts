/**
 * A pointed pen for SVG. A uniform stroke cannot swell and thin the way a
 * flexible nib does, so every stroke is turned into a filled outline: the
 * centreline is walked, and the nib opens to a shade and closes to a hairline
 * point at both ends.
 *
 * Centrelines are written as absolute `M x y C …` paths (cubics only).
 */

/** How one stroke is inked. */
export interface NibProfile {
  /** Width of the shade at its fullest, in viewBox units. */
  shade: number;
  /** Where along the stroke the shade is fullest, 0–1. */
  at?: number;
  /** Higher keeps the stroke a hairline for longer before it swells. */
  snap?: number;
}

export interface PenStroke {
  /** The centreline, used to reveal the stroke as if it were being written. */
  centreline: string;
  /** The inked shape. */
  outline: string;
  /** Widest point of the stroke, so the reveal can cover it. */
  width: number;
  length: number;
}

export type Point = readonly [number, number];
type Cubic = readonly [Point, Point, Point, Point];

const HAIRLINE = 0.55;
const SAMPLE_SPACING = 3;
const MIN_SAMPLES_PER_CURVE = 8;
const DEFAULT_PEAK = 0.5;
const DEFAULT_SNAP = 1.5;

const round = (value: number) => Math.round(value * 10) / 10;
const formatPoint = ([x, y]: Point) => `${round(x)} ${round(y)}`;

function _parseCubics(d: string): Cubic[] {
  const numbers = d.match(/-?\d*\.?\d+/g)?.map(Number) ?? [];
  const points: Point[] = [];
  for (let i = 0; i + 1 < numbers.length; i += 2) points.push([numbers[i], numbers[i + 1]]);
  const cubics: Cubic[] = [];
  for (let i = 0; i + 3 < points.length; i += 3) {
    cubics.push([points[i], points[i + 1], points[i + 2], points[i + 3]]);
  }
  return cubics;
}

function _cubicAt([p0, p1, p2, p3]: Cubic, t: number): { point: Point; tangent: Point } {
  const u = 1 - t;
  const blend = (axis: 0 | 1) =>
    u * u * u * p0[axis] + 3 * u * u * t * p1[axis] + 3 * u * t * t * p2[axis] + t * t * t * p3[axis];
  const slope = (axis: 0 | 1) =>
    3 * u * u * (p1[axis] - p0[axis]) + 6 * u * t * (p2[axis] - p1[axis]) + 3 * t * t * (p3[axis] - p2[axis]);
  return { point: [blend(0), blend(1)], tangent: [slope(0), slope(1)] };
}

function _walk(cubics: Cubic[]) {
  const samples: { point: Point; normal: Point; travelled: number }[] = [];
  let travelled = 0;
  let previous: Point | undefined;
  cubics.forEach((cubic, index) => {
    const chord = Math.hypot(cubic[3][0] - cubic[0][0], cubic[3][1] - cubic[0][1])
      + Math.hypot(cubic[1][0] - cubic[0][0], cubic[1][1] - cubic[0][1])
      + Math.hypot(cubic[3][0] - cubic[2][0], cubic[3][1] - cubic[2][1]);
    const steps = Math.max(MIN_SAMPLES_PER_CURVE, Math.ceil(chord / SAMPLE_SPACING));
    for (let step = index === 0 ? 0 : 1; step <= steps; step += 1) {
      const { point, tangent } = _cubicAt(cubic, step / steps);
      const size = Math.hypot(tangent[0], tangent[1]) || 1;
      if (previous) travelled += Math.hypot(point[0] - previous[0], point[1] - previous[1]);
      samples.push({ point, normal: [-tangent[1] / size, tangent[0] / size], travelled });
      previous = point;
    }
  });
  return { samples, length: travelled };
}

/** The nib's opening at a position 0–1 along the stroke. */
function _nibWidth(position: number, { shade, at = DEFAULT_PEAK, snap = DEFAULT_SNAP }: NibProfile) {
  const skew = Math.log(0.5) / Math.log(at);
  const swell = Math.sin(Math.PI * position ** skew) ** snap;
  const taper = Math.min(1, Math.sin(Math.PI * position) * 6);
  return HAIRLINE * taper + (shade - HAIRLINE) * swell;
}

export function penStroke(centreline: string, nib: NibProfile): PenStroke {
  const { samples, length } = _walk(_parseCubics(centreline));
  const left: Point[] = [];
  const right: Point[] = [];
  samples.forEach(({ point, normal, travelled }) => {
    const half = _nibWidth(travelled / length, nib) / 2;
    left.push([point[0] + normal[0] * half, point[1] + normal[1] * half]);
    right.push([point[0] - normal[0] * half, point[1] - normal[1] * half]);
  });
  const outline = `M${[...left, ...right.reverse()].map(formatPoint).join('L')}Z`;
  return { centreline, outline, width: Math.max(nib.shade, HAIRLINE), length };
}

/** Flip a centreline across a vertical axis, for the second wing. */
export function mirrorPath(d: string, axis: number): string {
  let isX = false;
  return d.replace(/-?\d*\.?\d+/g, (value) => {
    isX = !isX;
    return isX ? String(round(2 * axis - Number(value))) : value;
  });
}

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
const heading = (degrees: number): Point => [Math.cos(toRadians(degrees)), Math.sin(toRadians(degrees))];
const reach = ([x, y]: Point, [dx, dy]: Point, distance: number): Point => [x + dx * distance, y + dy * distance];

/** Where the pen arrives after travelling `distance` from `from` towards `angle` degrees. */
export const landing = (from: Point, angle: number, distance: number): Point => reach(from, heading(angle), distance);

/** A centreline through the given points: a start, then cubic triples. */
export const curvePath = ([start, ...rest]: readonly Point[]): string =>
  `M${formatPoint(start)} C${rest.map(formatPoint).join(' ')}`;

/**
 * A plume: one sweep of the pen from `from`, travelling `length` towards
 * `angle` (degrees, 0 = right, 90 = down). It sets off leaning `lead` degrees
 * off course and lifts away by `curl` degrees at the tip, like a flame.
 */
export function plumePath(from: Point, angle: number, length: number, lead: number, curl: number): string {
  const tip = landing(from, angle, length);
  const first = landing(from, angle + lead, length * 0.4);
  const second = landing(tip, angle + curl, -length * 0.32);
  return curvePath([from, first, second, tip]);
}

/**
 * An oval, the penman's basic exercise: an ellipse leaning by `tilt` degrees,
 * begun at `start` degrees around it and carried clockwise through `sweep`.
 */
export function ovalPath(centre: Point, radiusX: number, radiusY: number, tilt: number, start: number, sweep: number): string {
  const arcs = Math.ceil(Math.abs(sweep) / 90);
  const step = toRadians(sweep / arcs);
  const handle = (4 / 3) * Math.tan(step / 4);
  const [cos, sin] = heading(tilt);
  const place = (x: number, y: number): Point => [centre[0] + x * cos - y * sin, centre[1] + x * sin + y * cos];
  const on = (angle: number): Point => place(radiusX * Math.cos(angle), radiusY * Math.sin(angle));
  const off = (angle: number, direction: number): Point => place(
    radiusX * (Math.cos(angle) - direction * handle * Math.sin(angle)),
    radiusY * (Math.sin(angle) + direction * handle * Math.cos(angle)),
  );
  let angle = toRadians(start);
  let d = `M${formatPoint(on(angle))}`;
  for (let arc = 0; arc < arcs; arc += 1) {
    const next = angle + step;
    d += ` C${[off(angle, 1), off(next, -1), on(next)].map(formatPoint).join(' ')}`;
    angle = next;
  }
  return d;
}
