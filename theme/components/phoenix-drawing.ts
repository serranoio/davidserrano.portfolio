import { curvePath, landing, mirrorPath, ovalPath, penStroke, plumePath, type PenStroke, type Point } from './phoenix-pen';
import type { PhoenixPathId } from '../engineering-profile';

/**
 * The phoenix, written stroke by stroke in the order the meditation tells it:
 * the fire rises to the mind, the wings open through the hands, the body's
 * ovals cross at the heart, and the tail comes down to rest on the ground.
 *
 * Anchors (viewBox 0 0 300 400): head 150,40 · heart 150,170 ·
 * wingtips 20,150 and 280,150 · tail 150,380.
 */
export type PhoenixPartId = PhoenixPathId | 'ground';

/** A centreline and how the nib inks it: [path, shade, where the shade peaks, snap]. */
type Ink = readonly [d: string, shade: number, at?: number, snap?: number];

export interface TimedStroke extends PenStroke {
  /** Seconds after load when the pen touches down, and how long it travels. */
  delay: number;
  duration: number;
}

export interface PhoenixPart {
  id: PhoenixPartId;
  strokes: readonly TimedStroke[];
}

/**
 * The hairline that ties a part of the bird to its words. Its centrelines run
 * from the bird towards the text, the way the fire travels when it is lit.
 */
export interface PhoenixThread {
  /** Strokes that cross the page to the section's text. */
  reach: readonly TimedStroke[];
  /** Strokes that stay with the bird even when the text sits elsewhere. */
  lodged: readonly TimedStroke[];
  /** Written from the text back to the bird, as something that flew in. */
  flown?: boolean;
}

export interface PhoenixPoint {
  x: number;
  y: number;
}

export const PHOENIX_CENTRE_X = 150;
export const PHOENIX_HEART: PhoenixPoint = { x: PHOENIX_CENTRE_X, y: 170 };
export const PHOENIX_EYE: PhoenixPoint = { x: 155.5, y: 46.5 };

const PEN_SPEED = 520; // viewBox units per second
const SHORTEST_STROKE_SECONDS = 0.22;
const LONGEST_STROKE_SECONDS = 0.62;

const mirrored = (inks: readonly Ink[]): Ink[] =>
  inks.map(([d, ...nib]) => [mirrorPath(d, PHOENIX_CENTRE_X), ...nib] as const);

/** Both sides of a symmetric gesture, written as a pair. */
const paired = (inks: readonly Ink[]): Ink[] => {
  const twins = mirrored(inks);
  return inks.flatMap((ink, index) => [ink, twins[index]]);
};

function _time(begin: number, end: number, inks: readonly Ink[]): TimedStroke[] {
  const stagger = (end - begin) / inks.length;
  return inks.map(([d, shade, at, snap], index) => {
    const stroke = penStroke(d, { shade, at, snap });
    const duration = Math.min(LONGEST_STROKE_SECONDS, Math.max(SHORTEST_STROKE_SECONDS, stroke.length / PEN_SPEED));
    return { ...stroke, delay: begin + stagger * index, duration };
  });
}

const _write = (id: PhoenixPartId, begin: number, end: number, inks: readonly Ink[]): PhoenixPart =>
  ({ id, strokes: _time(begin, end, inks) });

const NECK_AND_HEAD: readonly Ink[] = [
  ['M150 170 C140 150 146 126 153 108 C160 90 164 72 160 58 C157 46 149 38 141 39 C135 40 130 44 123 50 C121 52 121 54 123 55', 5, 0.34],
  ['M123 50 C132 50 139 52 143 58 C148 66 147 78 143 92 C138 110 136 136 146 160', 2.2, 0.6],
  ['M152 40 C156 26 168 16 182 18 C191 19 194 27 188 30 C184 32 181 28 184 25', 2.2, 0.4],
  ['M148 38 C147 25 153 12 165 5', 1.8],
  ['M156 44 C166 37 180 37 193 44', 1.8],
];

const WING_SHOULDER = [158, 160] as const;
const WING_WRIST = [206, 120] as const;
const FEATHER_LEAD = 16;
const FEATHER_CURL = -24;

const featherRoot = (along: number): Point => [
  WING_WRIST[0] + (WING_SHOULDER[0] - WING_WRIST[0]) * along,
  WING_WRIST[1] + (WING_SHOULDER[1] - WING_WRIST[1]) * along,
];

/** One feather of the fan: [place along the arm (0 wrist – 1 shoulder), angle, length, shade]. */
const WING_FEATHERS: readonly (readonly [along: number, angle: number, length: number, shade: number])[] = [
  [0, -68, 84, 3],
  [0.1, -55, 96, 3.3],
  [0.22, -42, 104, 3.5],
  [0.34, -29, 108, 3.5],
  [0.46, -16, 104, 3.3],
  [0.58, -2, 96, 3.1],
  [0.7, 13, 84, 2.9],
  [0.82, 29, 70, 2.6],
  [0.94, 46, 56, 2.3],
];

const RIGHT_WING: readonly Ink[] = [
  ['M152 168 C164 148 184 128 206 120', 4.6, 0.55],
  ...WING_FEATHERS.map(([along, angle, length, shade]): Ink => [
    plumePath(featherRoot(along), angle, length, FEATHER_LEAD, FEATHER_CURL),
    shade, 0.42,
  ]),
];

/** The oval leans so its top rests on the heart; its twin crosses it there. */
const RIGHT_BODY_OVAL: readonly Ink[] = [
  [ovalPath([158, 200], 21, 42, 17, -84, 352), 3.6, 0.36],
];

/**
 * The train falls straight from the body and only flares at the last moment,
 * so every plume ends lying along the ground; one pair crosses on the way down.
 * Written from the middle outwards.
 */
const TAIL: readonly Ink[] = [
  ['M151 243 C156 290 146 340 152 383', 3.6, 0.6],
  ['M149 244 C147 300 146 350 132 381', 2, 0.7],
  ['M153 244 C156 298 162 346 180 380', 2, 0.7],
  ['M156 242 C164 288 142 332 112 360 C98 373 80 381 62 381', 2.8, 0.68],
  ['M144 242 C136 288 158 332 188 360 C202 373 220 381 238 381', 2.8, 0.68],
  ['M148 240 C146 290 140 330 110 356 C84 378 44 384 22 376 C8 370 8 354 20 352 C29 351 33 360 26 364', 4.2, 0.56],
  ['M153 239 C158 288 168 328 198 352 C222 371 256 380 276 370 C290 362 286 346 274 348 C266 350 265 360 272 362', 4.2, 0.56],
];

const GROUND_LINE: readonly Ink[] = [
  ['M-30 385 C40 379 110 389 150 385 C200 380 270 389 330 384', 1.6, 0.5, 1],
];

export const PHOENIX_PARTS: readonly PhoenixPart[] = [
  _write('mind', 0.35, 1.05, mirrored(NECK_AND_HEAD)),
  _write('hands', 1.0, 1.9, paired(RIGHT_WING)),
  _write('heart', 1.7, 2.0, paired(RIGHT_BODY_OVAL)),
  _write('ground', 1.95, 2.55, TAIL),
  _write('ground', 2.6, 2.7, GROUND_LINE),
];

/** Seconds after load when the last stroke lifts off the page. */
export const PHOENIX_WRITTEN_AT = Math.max(
  ...PHOENIX_PARTS.flatMap((part) => part.strokes.map((stroke) => stroke.delay + stroke.duration)),
);

/**
 * The threads. Each is its section's own line of verse, drawn as lightly as
 * the crest. Their far ends are placed for the wide layout, where the mind is
 * written above the bird, the hands to its left and the heart to its right.
 */

/** The fire rises: a wisp climbs from the tip of the crest, between the essays, to the verse. */
const WISP: readonly Ink[] = [
  ['M135 5 C127 0 125 -9 133 -15 C142 -22 151 -27 146 -40 C143 -49 148 -56 153 -61', 1.7, 0.3],
];

/** To care for what you love: the feather nearest the words carries on towards them. */
const [REACHING_FEATHER_ALONG, REACHING_FEATHER_ANGLE, REACHING_FEATHER_LENGTH] = WING_FEATHERS[5];
const FEATHER_TIP = landing(featherRoot(REACHING_FEATHER_ALONG), REACHING_FEATHER_ANGLE, REACHING_FEATHER_LENGTH);
const FEATHER_REACH: readonly Ink[] = mirrored([
  [curvePath([FEATHER_TIP, landing(FEATHER_TIP, REACHING_FEATHER_ANGLE + FEATHER_CURL, 16), [305, 125], [315, 136]]), 1.5, 0.45],
]);

/** Where the arrow landed: it flew from the verse and is lodged in the ember. */
const ARROW_ANGLE = -13.5;
const ARROW_LENGTH = 56;
const ARROW_FLETCHINGS = [42, 47, 52];
const FLETCHING_SPREAD = 38;
const FLETCHING_LENGTH = 9;
const FLETCHING_LEAD = 14;
const HEART_POINT: Point = [PHOENIX_HEART.x, PHOENIX_HEART.y];
const ARROW_NOCK = landing(HEART_POINT, ARROW_ANGLE, ARROW_LENGTH);
const ARROW: readonly Ink[] = [
  [plumePath(HEART_POINT, ARROW_ANGLE, ARROW_LENGTH, 0, 0), 1.7, 0.3],
  ...ARROW_FLETCHINGS.flatMap((along) => [-1, 1].map((side): Ink => [
    plumePath(landing(HEART_POINT, ARROW_ANGLE, along), ARROW_ANGLE + side * FLETCHING_SPREAD,
      FLETCHING_LENGTH, -side * FLETCHING_LEAD, 0),
    1.3, 0.4,
  ])),
];
const ARROW_FLIGHT: readonly Ink[] = [
  [curvePath([ARROW_NOCK, landing(ARROW_NOCK, ARROW_ANGLE, 30), [288, 143], [314, 152]]), 1.2, 0.5],
];

export const PHOENIX_THREADS: Record<PhoenixPathId, PhoenixThread> = {
  mind: { reach: _time(1.05, 1.5, WISP), lodged: [] },
  hands: { reach: _time(1.9, 2.2, FEATHER_REACH), lodged: [] },
  heart: { reach: _time(2.0, 2.3, ARROW_FLIGHT), lodged: _time(2.3, 2.6, ARROW), flown: true },
};

/** How a part of the bird is touched: the area that answers, and where its fire leaves from. */
export interface PhoenixTouch {
  id: PhoenixPathId;
  /** Closed shapes far wider than the ink, so a hairline is never the target. */
  shapes: readonly string[];
  sources: readonly PhoenixPoint[];
}

const RIGHT_WING_REACH = 'M154 166 L198 104 L230 28 L268 38 L298 78 L292 148 L266 184 L232 204 L198 214 Z';
const RIGHT_WING_SOURCE: PhoenixPoint = { x: 232, y: 112 };
const HEAD_AND_NECK_REACH = 'M102 -4 L198 -4 L202 62 L176 102 L170 142 L130 142 L124 102 L98 62 Z';
const CROWN: PhoenixPoint = { x: PHOENIX_CENTRE_X, y: 42 };

/** In painting order: where they overlap, the later part is the one touched. */
export const PHOENIX_TOUCH: readonly PhoenixTouch[] = [
  {
    id: 'hands',
    shapes: [RIGHT_WING_REACH, mirrorPath(RIGHT_WING_REACH, PHOENIX_CENTRE_X)],
    sources: [RIGHT_WING_SOURCE, { ...RIGHT_WING_SOURCE, x: 2 * PHOENIX_CENTRE_X - RIGHT_WING_SOURCE.x }],
  },
  { id: 'mind', shapes: [HEAD_AND_NECK_REACH], sources: [CROWN] },
  { id: 'heart', shapes: [`${ovalPath([PHOENIX_CENTRE_X, 197], 36, 54, 0, 0, 360)} Z`], sources: [PHOENIX_HEART] },
];
