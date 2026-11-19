import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import type { PhoenixPoint } from './phoenix-drawing';
import { PhoenixCoal } from './phoenix-ember';
import './phoenix-sparks.css';

/** Each sending is a short run from each source: a lead coal and what trails it. */
const SPARK_RUN: readonly { size: number; lag: number; lift: number }[] = [
  { size: 1, lag: 0, lift: 0.16 },
  { size: 0.62, lag: 140, lift: 0.25 },
  { size: 0.42, lag: 270, lift: 0.08 },
];
/* Slow enough to follow with the eye: fire drifting, not a spark thrown. */
const FLIGHT_MS_PER_PX = 2.6;
const SHORTEST_FLIGHT_MS = 950;
const LONGEST_FLIGHT_MS = 1600;
const FLIGHT_STEPS = 10;
const SPARK_GLOW = 2.6;

interface Spark {
  key: number;
  from: PhoenixPoint;
  to: PhoenixPoint;
  size: number;
  lag: number;
  lift: number;
  onLand?: () => void;
}

export interface PhoenixSparksHandle {
  /**
   * Send fire from points on the screen to an element, which may be scrolling
   * into view as it flies. `onLand` runs once, when the first coal arrives.
   */
  send: (sources: readonly PhoenixPoint[], target: Element, onLand: () => void) => void;
}

export const prefersStillness = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A rising arc from one point to another, as keyframes. Fire climbs before it lands. */
function _flightPath({ from, to, size, lift }: Spark): Keyframe[] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  // Bow the path sideways off its line, always towards the top of the page.
  const side = dx >= 0 ? 1 : -1;
  const peak = { x: from.x + dx / 2 + dy * lift * side, y: from.y + dy / 2 - dx * lift * side };
  return Array.from({ length: FLIGHT_STEPS + 1 }, (_, step) => {
    const t = step / FLIGHT_STEPS;
    const u = 1 - t;
    const x = u * u * from.x + 2 * u * t * peak.x + t * t * to.x;
    const y = u * u * from.y + 2 * u * t * peak.y + t * t * to.y;
    return {
      transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${(size * (1 - 0.35 * t)).toFixed(3)})`,
      opacity: step === 0 ? 0 : 1,
    };
  });
}

function SparkCoal({ spark, onDone }: { spark: Spark; onDone: (spark: Spark) => void }) {
  const coal = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const distance = Math.hypot(spark.to.x - spark.from.x, spark.to.y - spark.from.y);
    const flight = coal.current?.animate(_flightPath(spark), {
      duration: Math.min(LONGEST_FLIGHT_MS, Math.max(SHORTEST_FLIGHT_MS, distance * FLIGHT_MS_PER_PX)),
      delay: spark.lag,
      easing: 'cubic-bezier(0.45, 0, 0.25, 1)',
      fill: 'both',
    });
    if (!flight) return undefined;
    flight.onfinish = () => onDone(spark);
    return () => flight.cancel();
    // A spark flies once, on the path it was born with.
  }, []);
  return <PhoenixCoal ref={coal} className="phoenix-spark" glow={SPARK_GLOW} />;
}

/**
 * The air between the bird and the words. It lies over the whole phoenix and
 * moves with the page, so a spark keeps its course while its section scrolls
 * into view.
 */
export function PhoenixSparks({ ref }: { ref: Ref<PhoenixSparksHandle> }) {
  const air = useRef<HTMLDivElement>(null);
  const born = useRef(0);
  const [sparks, setSparks] = useState<readonly Spark[]>([]);

  useImperativeHandle(ref, () => ({
    send(sources, target, onLand) {
      if (!air.current || prefersStillness()) {
        onLand();
        return;
      }
      const origin = air.current.getBoundingClientRect();
      const landing = target.getBoundingClientRect();
      const to = { x: landing.left + landing.width / 2 - origin.left, y: landing.top + landing.height / 2 - origin.top };
      const run = sources.flatMap((source, sourceIndex) => SPARK_RUN.map((shape, index): Spark => ({
        ...shape,
        key: (born.current += 1),
        from: { x: source.x - origin.left, y: source.y - origin.top },
        to,
        onLand: sourceIndex === 0 && index === 0 ? onLand : undefined,
      })));
      setSparks((flying) => [...flying, ...run]);
    },
  }), []);

  const land = (spark: Spark) => {
    spark.onLand?.();
    setSparks((flying) => flying.filter((other) => other.key !== spark.key));
  };

  return (
    <div ref={air} className="phoenix-sparks" aria-hidden="true">
      {sparks.map((spark) => <SparkCoal key={spark.key} spark={spark} onDone={land} />)}
    </div>
  );
}
