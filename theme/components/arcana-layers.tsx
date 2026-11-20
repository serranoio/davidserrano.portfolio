import type { CSSProperties } from 'react';
import {
  arcanaLayerEdges,
  arcanaLayers,
  DEFAULT_ARCANA_LAYER,
  type ArcanaLayerId,
} from '../arcana-engineering';
import { arcanaOrdinal } from './arcana-ordinal';
import { ArcanaSpeed } from './arcana-speed';
import { useTabList } from './use-tab-list';
import './arcana-layers.css';

/**
 * The loop is drawn as a ring: each layer sits on one circle, clockwise Agents → Proof → Tech Stack → Agents, and
 * each edge is the arc between two layers. Units are viewBox units; the node buttons are placed by percentage.
 */
const VIEW = { width: 548, height: 480 };
const CENTRE = { x: 274, y: 246 };
const RADIUS = 176;
/** Degrees, clockwise from three o'clock: Agents at the top, the other two below it either side. */
const ANGLE: Record<ArcanaLayerId, number> = { agents: -90, proof: 30, 'tech-stack': 150 };
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
function _edgeGeometry(from: ArcanaLayerId, to: ArcanaLayerId) {
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
        <div className="arcana-layers__diagram">
          <svg className="arcana-layers__ring" viewBox={`0 0 ${VIEW.width} ${VIEW.height}`} aria-hidden="true">
            <defs>
              <marker id="arcana-layers-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6"
                orient="auto-start-reverse">
                <path d="M0 0 L10 5 L0 10 z" />
              </marker>
            </defs>
            <circle className="arcana-layers__orbit" cx={CENTRE.x} cy={CENTRE.y} r={RADIUS - 42} />
            <text className="arcana-layers__core" x={CENTRE.x} y={CENTRE.y} textAnchor="middle">
              <tspan x={CENTRE.x} dy="-0.2em">Software</tspan>
              <tspan x={CENTRE.x} dy="1.15em">Factory</tspan>
            </text>
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
              const at = _onRing(ANGLE[l.id]);
              const out = arcanaLayerEdges.find((edge) => edge.from === l.id);
              return (
                <button key={l.id} type="button" className="arcana-layers__node" id={`arcana-layer-${l.id}`}
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
