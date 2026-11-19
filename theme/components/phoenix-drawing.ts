import { mirrorPath, ovalPath, penStroke, plumePath, type PenStroke } from './phoenix-pen';
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

interface TimedStroke extends PenStroke {
  /** Seconds after load when the pen touches down, and how long it travels. */
  delay: number;
  duration: number;
}

export interface PhoenixPart {
  id: PhoenixPartId;
  strokes: readonly TimedStroke[];
}

export const PHOENIX_CENTRE_X = 150;
export const PHOENIX_HEART = { x: PHOENIX_CENTRE_X, y: 170 } as const;
export const PHOENIX_EYE = { x: 155.5, y: 46.5 } as const;

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

function _write(id: PhoenixPartId, begin: number, end: number, inks: readonly Ink[]): PhoenixPart {
  const stagger = (end - begin) / inks.length;
  return {
    id,
    strokes: inks.map(([d, shade, at, snap], index) => {
      const stroke = penStroke(d, { shade, at, snap });
      const duration = Math.min(LONGEST_STROKE_SECONDS, Math.max(SHORTEST_STROKE_SECONDS, stroke.length / PEN_SPEED));
      return { ...stroke, delay: begin + stagger * index, duration };
    }),
  };
}

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
    plumePath([
      WING_WRIST[0] + (WING_SHOULDER[0] - WING_WRIST[0]) * along,
      WING_WRIST[1] + (WING_SHOULDER[1] - WING_WRIST[1]) * along,
    ], angle, length, FEATHER_LEAD, FEATHER_CURL),
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
