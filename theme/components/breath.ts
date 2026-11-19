// One shared breath for the whole home page. The rose's petals, its light,
// and every star field sample this clock, so the page inhales and exhales as
// one body instead of running separate animations that merely coincide.

export const BREATH_CYCLE_SECONDS = 6;
// A resting breath is not a sine wave: the inhale is the shorter, active part
// and the exhale lets go quickly and then tapers.
const INHALE_FRACTION = 0.4;
// < 1 front-loads the exhale: most of the air leaves early, the rest trails.
const EXHALE_TAPER = 0.72;
// Level held when the visitor asks for reduced motion — a relaxed, slightly
// open pose rather than either extreme of the cycle.
const STILL_LEVEL = 0.4;

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

// 0 = fully exhaled (closed, dim), 1 = fully inhaled (open, bright).
export function breathLevelAt(seconds: number): number {
  const cycle = seconds / BREATH_CYCLE_SECONDS;
  const phase = cycle - Math.floor(cycle);
  if (phase < INHALE_FRACTION) {
    return 0.5 - 0.5 * Math.cos(Math.PI * (phase / INHALE_FRACTION));
  }
  const out = (phase - INHALE_FRACTION) / (1 - INHALE_FRACTION);
  return 0.5 + 0.5 * Math.cos(Math.PI * Math.pow(out, EXHALE_TAPER));
}

class BreathClock {
  private query: MediaQueryList | null = null;

  // True when motion should be held still. Read live so a preference change
  // takes effect without a reload.
  get still(): boolean {
    if (!this.query && typeof window !== 'undefined') {
      this.query = window.matchMedia(REDUCED_MOTION_QUERY);
    }
    return this.query?.matches ?? false;
  }

  // Seconds on the shared timeline. Every consumer uses this (not its own
  // frame timestamp) so separate canvases stay in phase.
  now(): number {
    return performance.now() / 1000;
  }

  // Which breath we are in, counted from page load.
  cycleIndex(): number {
    return Math.floor(this.now() / BREATH_CYCLE_SECONDS);
  }

  // `lagSeconds` lets a part of the body follow slightly behind the rest
  // (outer petals trail the heart) without leaving the shared rhythm.
  level(lagSeconds = 0): number {
    if (this.still) return STILL_LEVEL;
    return breathLevelAt(this.now() - lagSeconds);
  }
}

export const breath = new BreathClock();
