import type { CSSProperties } from 'react';
import { PHOENIX_EYE, PHOENIX_HEART, PHOENIX_PARTS } from './phoenix-drawing';
import './phoenix-figure.css';

/** Extra width on the reveal so the widest shade is never clipped. */
const REVEAL_MARGIN = 3;

/**
 * The phoenix, flourished with a pointed pen. Each stroke is a filled shape
 * with real thick-and-thin; a mask carrying its centreline is drawn on load,
 * so the bird appears to be written. The heart is the one warm point: an
 * ember that breathes, and tints the ink nearest to it.
 */
export function PhoenixFigure() {
  return (
    <svg className="phoenix-figure" viewBox="0 0 300 400" role="presentation" aria-hidden="true">
      <defs>
        <radialGradient id="phoenix-ink" gradientUnits="userSpaceOnUse" cx={PHOENIX_HEART.x} cy={PHOENIX_HEART.y} r="120">
          <stop className="phoenix-figure__ink-hot" offset="0" />
          <stop className="phoenix-figure__ink-warm" offset="0.3" />
          <stop className="phoenix-figure__ink-cool" offset="1" />
        </radialGradient>
        <radialGradient id="phoenix-halo">
          <stop className="phoenix-figure__halo-stop" offset="0" stopOpacity="0.7" />
          <stop className="phoenix-figure__halo-stop" offset="0.35" stopOpacity="0.22" />
          <stop className="phoenix-figure__halo-stop" offset="1" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="phoenix-coal">
          <stop className="phoenix-figure__coal-core" offset="0" />
          <stop className="phoenix-figure__coal-edge" offset="0.6" />
          <stop className="phoenix-figure__coal-edge" offset="1" stopOpacity="0.55" />
        </radialGradient>
      </defs>
      <circle className="phoenix-figure__halo" cx={PHOENIX_HEART.x} cy={PHOENIX_HEART.y} r="52" fill="url(#phoenix-halo)" />
      {PHOENIX_PARTS.map((part, partIndex) => (
        <g key={partIndex} className={`phoenix-figure__part phoenix-figure__part--${part.id}`}>
          {part.strokes.map((stroke, strokeIndex) => {
            const maskId = `phoenix-stroke-${partIndex}-${strokeIndex}`;
            const timing = {
              '--pen-delay': `${stroke.delay.toFixed(2)}s`,
              '--pen-duration': `${stroke.duration.toFixed(2)}s`,
            } as CSSProperties;
            return (
              <g key={maskId}>
                <mask id={maskId} maskUnits="userSpaceOnUse" x="-60" y="-20" width="420" height="440">
                  <path className="phoenix-figure__pen" d={stroke.centreline} pathLength={1}
                    strokeWidth={stroke.width + REVEAL_MARGIN} style={timing} />
                </mask>
                <path d={stroke.outline} mask={`url(#${maskId})`} />
              </g>
            );
          })}
          {part.id === 'mind' && (
            <circle className="phoenix-figure__eye" cx={PHOENIX_EYE.x} cy={PHOENIX_EYE.y} r="1.1" />
          )}
        </g>
      ))}
      <g className="phoenix-figure__ember">
        <circle cx={PHOENIX_HEART.x} cy={PHOENIX_HEART.y} r="6" fill="url(#phoenix-coal)" />
      </g>
    </svg>
  );
}
