import { useRef, type CSSProperties } from 'react';
import type { PhoenixPathId } from '../engineering-profile';
import {
  PHOENIX_EYE, PHOENIX_HEART, PHOENIX_PARTS, PHOENIX_TOUCH, type PhoenixPoint, type PhoenixTouch,
} from './phoenix-drawing';
import { EmberCoal, EmberGradients, EmberHalo } from './phoenix-ember';
import './phoenix-figure.css';

/** Extra width on the reveal so the widest shade is never clipped. */
const REVEAL_MARGIN = 3;
const EMBER = { ...PHOENIX_HEART, r: 6 } as const;
const INK_REACH = 120;
const INKS = [...new Set(PHOENIX_PARTS.map((part) => part.id))];
const inkId = (part: string) => `phoenix-ink-${part}`;

/**
 * The phoenix, flourished with a pointed pen. Each stroke is a filled shape
 * with real thick-and-thin; a mask carrying its centreline is drawn on load,
 * so the bird appears to be written. The heart is the one warm point: an
 * ember that breathes, and tints the ink nearest to it.
 *
 * The head, the wings and the heart can be touched. A press reports which
 * part, and where on the screen its fire leaves from.
 */
export function PhoenixFigure({ onPress }: {
  onPress?: (part: PhoenixPathId, sources: PhoenixPoint[]) => void;
}) {
  const figure = useRef<SVGSVGElement>(null);
  const press = ({ id, sources }: PhoenixTouch) => {
    const toScreen = figure.current?.getScreenCTM();
    if (!toScreen) return;
    onPress?.(id, sources.map(({ x, y }) => {
      const point = new DOMPoint(x, y).matrixTransform(toScreen);
      return { x: point.x, y: point.y };
    }));
  };
  return (
    <svg ref={figure} className="phoenix-figure" viewBox="0 0 300 400" role="presentation" aria-hidden="true">
      <defs>
        {INKS.map((part) => (
          <radialGradient key={part} id={inkId(part)} className={`phoenix-figure__ink phoenix-figure__ink--${part}`}
            gradientUnits="userSpaceOnUse" cx={PHOENIX_HEART.x} cy={PHOENIX_HEART.y} r={INK_REACH}>
            <stop className="phoenix-figure__ink-hot" offset="0" />
            <stop className="phoenix-figure__ink-warm" offset="0.3" />
            <stop className="phoenix-figure__ink-cool" offset="1" />
          </radialGradient>
        ))}
        <EmberGradients />
      </defs>
      <EmberHalo {...EMBER} />
      {PHOENIX_PARTS.map((part, partIndex) => (
        <g key={partIndex} className={`phoenix-figure__part phoenix-figure__part--${part.id}`} fill={`url(#${inkId(part.id)})`}>
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
      <EmberCoal {...EMBER} />
      {PHOENIX_TOUCH.map((touch) => (
        <g key={touch.id} className={`phoenix-figure__touch phoenix-figure__touch--${touch.id}`} onClick={() => press(touch)}>
          {touch.shapes.map((shape) => <path key={shape} d={shape} />)}
        </g>
      ))}
    </svg>
  );
}
