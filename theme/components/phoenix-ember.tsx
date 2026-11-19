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
export const EMBER_GLOW = 52 / 8;

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

export type EmberShape = 'round' | 'heart';

/** A heart one unit in radius, and the tongue of flame that rises from its cleft. */
const HEART = 'M0 0.95 C-0.35 0.62 -1 0.22 -1 -0.32 C-1 -0.72 -0.7 -0.95 -0.42 -0.95 C-0.22 -0.95 -0.07 -0.82 0 -0.62 '
  + 'C0.07 -0.82 0.22 -0.95 0.42 -0.95 C0.7 -0.95 1 -0.72 1 -0.32 C1 0.22 0.35 0.62 0 0.95 Z';
const HEART_FLAME = 'M-0.02 -0.6 C-0.26 -0.86 -0.12 -1.16 0.06 -1.5 C0.08 -1.24 0.32 -1.04 0.1 -0.6 Z';

/** The coal itself: a round spark, or the fiery heart the bird and its words share. */
export function EmberCoal({ x, y, r, shape = 'round' }: EmberPlace & { shape?: EmberShape }) {
  const fill = `url(#${COAL_GRADIENT})`;
  return (
    <g className="phoenix-ember__coal">
      {shape === 'round' ? <circle cx={x} cy={y} r={r} fill={fill} /> : (
        <g transform={`translate(${x} ${y}) scale(${r})`} fill={fill}>
          <path className="phoenix-ember__flame" d={HEART_FLAME} />
          <path d={HEART} />
        </g>
      )}
    </g>
  );
}

const COAL_BOX = 20;
const COAL_PLACE: EmberPlace = { x: 0, y: 0, r: COAL_BOX / 2 };

/**
 * A coal on its own, outside the bird. It burns with the gradients of the
 * ember in the figure, so it only glows on a page where the phoenix stands.
 */
export function PhoenixCoal({ className = '', glow, shape, ref }: {
  className?: string;
  glow?: number;
  shape?: EmberShape;
  ref?: Ref<SVGSVGElement>;
}) {
  return (
    <svg ref={ref} className={`phoenix-coal ${className}`} aria-hidden="true"
      viewBox={`${-COAL_BOX / 2} ${-COAL_BOX / 2} ${COAL_BOX} ${COAL_BOX}`}>
      <EmberHalo {...COAL_PLACE} glow={glow} />
      <EmberCoal {...COAL_PLACE} shape={shape} />
    </svg>
  );
}
