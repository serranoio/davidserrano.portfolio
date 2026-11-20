import type { CSSProperties } from 'react';
import {
  arcanaHumanEdges,
  arcanaLayerEdges,
  arcanaLayers,
  DEFAULT_ARCANA_LAYER,
  type ArcanaLayerId,
  type ArcanaRingLayerId,
} from '../arcana-engineering';
import { arcanaOrdinal } from './arcana-ordinal';
import { ArcanaSpeed } from './arcana-speed';
import { useTabList } from './use-tab-list';
import './arcana-layers.css';

/**
 * The loop is drawn as a ring: each layer sits on one circle, clockwise Agents → Proof → Tech Stack → Agents, and
 * each edge is the arc between two layers. The human sits at the centre, joined by straight edges to the two layers
 * they touch. Units are viewBox units; the node buttons are placed by percentage.
 */
const VIEW = { width: 548, height: 480 };
const CENTRE = { x: 274, y: 246 };
const RADIUS = 176;
/** Degrees, clockwise from three o'clock: Agents at the top, the other two below it either side. */
const ANGLE: Record<ArcanaRingLayerId, number> = { agents: -90, proof: 30, 'tech-stack': 150 };
/** How far an arc stops short of each node's centre, so it leaves and enters at the button's edge. */
const ARC_GAP = 25;
/** Edge labels ride a parallel circle just outside the ring. */
const LABEL_GAP = 14;
const LABEL_CAP_HEIGHT = 9;

const _radians = (degrees: number) => (degrees * Math.PI) / 180;

/** A point on a circle around the centre. */
function _onRing(degrees: number, radius = RADIUS) {
  return { x: CENTRE.x + radius * Math.cos(_radians(degrees)), y: CENTRE.y + radius * Math.sin(_radians(degrees)) };
}

/** Where a layer's node sits: on the ring, or at the centre for the human. */
function _nodeAt(id: ArcanaLayerId) {
  return id === 'human' ? CENTRE : _onRing(ANGLE[id]);
}

/** How far a straight edge stops short of the human's node and of a ring node. */
const SPOKE_GAP = { human: 46, ring: 26 };
/** Each straight edge's label: the side of the line it sits on, and its lines (a long label wraps once). */
const SPOKE_LABEL_OFFSET = 12;

/**
 * A straight edge between the human and a ring layer, shortened at both ends, with its label set beside the line's
 * middle: to the right of an upright line, otherwise below it, anchored so the text runs away from the line and
 * stays inside the ring.
 */
function _spokeGeometry(from: ArcanaLayerId, to: ArcanaLayerId) {
  const a = _nodeAt(from), b = _nodeAt(to);
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  const ux = (b.x - a.x) / length, uy = (b.y - a.y) / length;
  const gapFrom = from === 'human' ? SPOKE_GAP.human : SPOKE_GAP.ring;
  const gapTo = to === 'human' ? SPOKE_GAP.human : SPOKE_GAP.ring;
  const start = { x: a.x + ux * gapFrom, y: a.y + uy * gapFrom };
  const end = { x: b.x - ux * gapTo, y: b.y - uy * gapTo };
  const upright = Math.abs(ux) < 0.3;
  // Upright lines take their label on the right; others below, on the perpendicular that points down.
  const side = upright ? { x: 1, y: 0 } : -uy > 0 ? { x: uy, y: -ux } : { x: -uy, y: ux };
  const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  return {
    d: `M${start.x.toFixed(2)} ${start.y.toFixed(2)} L${end.x.toFixed(2)} ${end.y.toFixed(2)}`,
    labelAt: { x: mid.x + side.x * SPOKE_LABEL_OFFSET, y: mid.y + side.y * SPOKE_LABEL_OFFSET },
    labelAnchor: side.x < 0 ? ('end' as const) : ('start' as const),
  };
}

/** An SVG arc from one angle to another; clockwise unless `reverse`. */
function _arc(from: number, to: number, radius: number, reverse = false) {
  const a = _onRing(reverse ? to : from, radius), b = _onRing(reverse ? from : to, radius);
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  return `M${a.x.toFixed(2)} ${a.y.toFixed(2)} A${radius} ${radius} 0 ${large} ${reverse ? 0 : 1} ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

/**
 * The edge from one layer to the next: its arrowed arc, and the path its label is set on. A label on the lower half
 * of the ring runs counter-clockwise, so it still reads left to right, one cap height further out to stay outside.
 */
function _edgeGeometry(from: ArcanaRingLayerId, to: ArcanaRingLayerId) {
  const start = ANGLE[from];
  const end = ANGLE[to] > start ? ANGLE[to] : ANGLE[to] + 360;
  const lower = Math.sin(_radians((start + end) / 2)) > 0.5;
  const labelRadius = RADIUS + LABEL_GAP + (lower ? LABEL_CAP_HEIGHT : 0);
  return {
    d: _arc(start + ARC_GAP, end - ARC_GAP, RADIUS),
    labelD: _arc(start, end, labelRadius, lower),
  };
}

const text = `The "Software Factory" is defined by 3 parts. This is ran completely locally! I doubt I will ever get freedom due to the scale that I can achieve just by running this locally.
 I dont have this in remote source control like github or gitlab. Shit all runs locally. I have a test harness 'bun run verify' that is my CI gate.
`;

const EDGES = arcanaLayerEdges.map((edge) => ({ ...edge, ..._edgeGeometry(edge.from, edge.to) }));
const SPOKES = arcanaHumanEdges.map((edge) => ({ ...edge, ..._spokeGeometry(edge.from, edge.to) }));
/** On narrow screens each layer reads its outgoing edge beneath its name. */
const OUT_EDGES = [...arcanaLayerEdges, ...arcanaHumanEdges];
/** A long spoke label wraps at its middle word. */
const _labelLines = (label: string) => {
  const words = label.split(' ');
  if (words.length < 4) return [label];
  const half = Math.ceil(words.length / 2);
  return [words.slice(0, half).join(' '), words.slice(half).join(' ')];
};
const IDS = arcanaLayers.map((layer) => layer.id);
const HASH_PREFIX = 'engineering-';

export function ArcanaLayers() {
  const { selected, onKeyDown, tabProps } = useTabList<ArcanaLayerId>({
    ids: IDS,
    initial: DEFAULT_ARCANA_LAYER,
    hashOf: (id) => `${HASH_PREFIX}${id}`,
    fromHash: (hash) => IDS.find((id) => hash === `${HASH_PREFIX}${id}`),
  });
  const index = arcanaLayers.findIndex((l) => l.id === selected);
  const layer = arcanaLayers[index]!;

  return (
    <div className="arcana-layers">
      <div className="arcana-layers__intro">
        <p className="arcana-layers__lead">{text}</p>
        <figure className="arcana-layers__figure">
        <figcaption className="arcana-kicker arcana-layers__caption">Software Factory</figcaption>
        <div className="arcana-layers__diagram">
          <svg className="arcana-layers__ring" viewBox={`0 0 ${VIEW.width} ${VIEW.height}`} aria-hidden="true">
            <defs>
              <marker id="arcana-layers-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6"
                orient="auto-start-reverse">
                <path d="M0 0 L10 5 L0 10 z" />
              </marker>
            </defs>
            <circle className="arcana-layers__orbit" cx={CENTRE.x} cy={CENTRE.y} r={RADIUS - 42} />
            {SPOKES.map((spoke) => {
              const lines = _labelLines(spoke.label);
              return (
                <g key={`${spoke.from}-${spoke.to}`} className="arcana-layers__edge arcana-layers__edge--spoke"
                  data-lit={spoke.from === selected || spoke.to === selected || undefined}>
                  <path className="arcana-layers__arc" d={spoke.d} markerEnd="url(#arcana-layers-arrow)" />
                  {(spoke.from === selected || spoke.to === selected) && <path className="arcana-layers__flow" d={spoke.d} />}
                  <text x={spoke.labelAt.x} y={spoke.labelAt.y} textAnchor={spoke.labelAnchor}>
                    {lines.map((line, i) => <tspan key={line} x={spoke.labelAt.x} dy={i === 0 ? `${-(lines.length - 1) * 0.55}em` : '1.1em'}>{line}</tspan>)}
                  </text>
                </g>
              );
            })}
            {EDGES.map((edge) => {
              const lit = edge.from === selected || edge.to === selected;
              const labelId = `arcana-layers-label-${edge.from}`;
              return (
                <g key={labelId} className="arcana-layers__edge" data-lit={lit || undefined}>
                  <path className="arcana-layers__arc" d={edge.d} markerEnd="url(#arcana-layers-arrow)" />
                  {lit && <path className="arcana-layers__flow" d={edge.d} />}
                  <path id={labelId} d={edge.labelD} fill="none" />
                  <text><textPath href={`#${labelId}`} startOffset="50%" textAnchor="middle">{edge.label}</textPath></text>
                </g>
              );
            })}
          </svg>
          <div className="arcana-layers__nodes" role="tablist" aria-label="Engineering layers" onKeyDown={onKeyDown}>
            {arcanaLayers.map((l, i) => {
              const at = _nodeAt(l.id);
              const out = OUT_EDGES.find((edge) => edge.from === l.id);
              return (
                <button key={l.id} type="button" className="arcana-layers__node" data-layer={l.id} id={`arcana-layer-${l.id}`}
                  aria-controls="arcana-layer-panel" {...tabProps(l.id)}
                  style={{ '--arcana-node-x': `${(at.x / VIEW.width) * 100}%`, '--arcana-node-y': `${(at.y / VIEW.height) * 100}%` } as CSSProperties}>
                  <span className="arcana-layers__index">{arcanaOrdinal(i)}</span>
                  <span className="arcana-layers__node-name">{l.name}</span>
                  {/* Narrow screens drop the ring and read each edge under the layer it leaves. */}
                  {out && <span className="arcana-layers__out" aria-hidden="true">{out.label}</span>}
                </button>
              );
            })}
          </div>
        </div>
        </figure>
      </div>

      <section id="arcana-layer-panel" className="arcana-layers__panel" role="tabpanel"
        aria-labelledby={`arcana-layer-${layer.id}`} tabIndex={0} key={layer.id}>
        <header className="arcana-layers__head">
          <span className="arcana-kicker">{arcanaOrdinal(index)} / {arcanaOrdinal(arcanaLayers.length - 1)}</span>
          <h3 className="arcana-layers__name">{layer.name}</h3>
          {layer.purpose && <p className="arcana-layers__purpose">{layer.purpose}</p>}
        </header>
        <dl className="arcana-layers__groups">
          {layer.groups.map((group) => (
            <div key={group.label} className="arcana-layers__group">
              <dt className="arcana-kicker">
                {group.label}<span className="arcana-layers__count" aria-hidden="true">{group.items.length}</span>
              </dt>
              <dd>
                <ul>{group.items.map((item) => <li key={item}>{item}</li>)}</ul>
              </dd>
            </div>
          ))}
        </dl>
        {layer.id === 'proof' && <ArcanaSpeed />}
      </section>
    </div>
  );
}
