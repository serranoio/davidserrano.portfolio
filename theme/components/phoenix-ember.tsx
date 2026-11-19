import type { Ref } from 'react';
import './phoenix-ember.css';

/**
 * The ember: the one orange thing on the page. It is defined once here and
 * lit in more than one place — at the heart of the bird, beside the words of
 * the heart, and in every spark that leaves the bird — so they are visibly
 * the same fire, breathing on the same clock.
 */
const HALO_GRADIENT = 'phoenix-halo';
const COAL_GRADIENT = 'phoenix-coal';

/** How far the glow reaches, in coal radii, around the ember in the bird. */
export const EMBER_GLOW = 52 / 6;

interface EmberPlace {
  x: number;
  y: number;
  /** Radius of the coal itself. */
  r: number;
}

/** The ember's two gradients. Rendered once, inside the figure's `<defs>`. */
export function EmberGradients() {
  return (
    <>
      <radialGradient id={HALO_GRADIENT}>
        <stop className="phoenix-ember__halo-stop" offset="0" stopOpacity="0.7" />
        <stop className="phoenix-ember__halo-stop" offset="0.35" stopOpacity="0.22" />
        <stop className="phoenix-ember__halo-stop" offset="1" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={COAL_GRADIENT}>
        <stop className="phoenix-ember__coal-core" offset="0" />
        <stop className="phoenix-ember__coal-edge" offset="0.6" />
        <stop className="phoenix-ember__coal-edge" offset="1" stopOpacity="0.55" />
      </radialGradient>
    </>
  );
}

/** The glow around a coal. Drawn separately so ink can pass between the two. */
export function EmberHalo({ x, y, r, glow = EMBER_GLOW }: EmberPlace & { glow?: number }) {
  return <circle className="phoenix-ember__halo" cx={x} cy={y} r={r * glow} fill={`url(#${HALO_GRADIENT})`} />;
}

export function EmberCoal({ x, y, r }: EmberPlace) {
  return (
    <g className="phoenix-ember__coal">
      <circle cx={x} cy={y} r={r} fill={`url(#${COAL_GRADIENT})`} />
    </g>
  );
}

const COAL_BOX = 20;
const COAL_PLACE: EmberPlace = { x: 0, y: 0, r: COAL_BOX / 2 };

/**
 * A coal on its own, outside the bird. It burns with the gradients of the
 * ember in the figure, so it only glows on a page where the phoenix stands.
 */
export function PhoenixCoal({ className = '', glow, ref }: {
  className?: string;
  glow?: number;
  ref?: Ref<SVGSVGElement>;
}) {
  return (
    <svg ref={ref} className={`phoenix-coal ${className}`} aria-hidden="true"
      viewBox={`${-COAL_BOX / 2} ${-COAL_BOX / 2} ${COAL_BOX} ${COAL_BOX}`}>
      <EmberHalo {...COAL_PLACE} glow={glow} />
      <EmberCoal {...COAL_PLACE} />
    </svg>
  );
}
