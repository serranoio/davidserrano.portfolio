import {
  arcanaLayerEdges,
  arcanaLayers,
  DEFAULT_ARCANA_LAYER,
  type ArcanaLayerId,
} from '../arcana-engineering';
import { ArcanaSpeed } from './arcana-speed';
import { useTabList } from './use-tab-list';
import './arcana-layers.css';

/** Where each layer sits on the diagram, in viewBox units; the loop runs Agents → Proof → Tech Stack → Agents. */
const NODE: Record<ArcanaLayerId, { x: number; y: number }> = {
  agents: { x: 130, y: 170 },
  proof: { x: 510, y: 70 },
  "tech-stack": { x: 510, y: 270 },
};
const VIEW = { width: 640, height: 340 };
const NODE_HALF = { width: 82, height: 30 };

/** An edge from one node's box to the next, curving outward, with its label at the curve's middle. */
function _edgePath(from: ArcanaLayerId, to: ArcanaLayerId) {
  const a = NODE[from], b = NODE[to];
  const towards = (p: { x: number; y: number }, q: { x: number; y: number }) => {
    // Leave the box through the side facing the other node.
    const dx = q.x - p.x, dy = q.y - p.y;
    const scale = Math.min(NODE_HALF.width / Math.abs(dx || 1), NODE_HALF.height / Math.abs(dy || 1)) + 0.04;
    return { x: p.x + dx * scale, y: p.y + dy * scale };
  };
  const start = towards(a, b), end = towards(b, a);
  const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  // Bow away from the centre of the loop so the three edges read as a cycle.
  const centre = { x: (NODE.agents.x + NODE.proof.x + NODE['tech-stack'].x) / 3, y: (NODE.agents.y + NODE.proof.y + NODE['tech-stack'].y) / 3 };
  const out = { x: mid.x - centre.x, y: mid.y - centre.y };
  const length = Math.hypot(out.x, out.y) || 1;
  const control = { x: mid.x + (out.x / length) * 40, y: mid.y + (out.y / length) * 40 };
  // Just outside the curve's apex, so the label never sits on its own line.
  const labelAt = { x: control.x + (out.x / length) * 4, y: control.y + (out.y / length) * 4 };
  return { d: `M${start.x} ${start.y} Q${control.x} ${control.y} ${end.x} ${end.y}`, labelAt };
}



const text = `The "Software Factory" is defined by 3 parts. This is ran completely locally! I doubt I will ever get freedom due to the scale that I can achieve just by running this locally.
 I dont have this in remote source control like github or gitlab. Shit all runs locally. I have a test harness 'bun run verify' that is my CI gate.
`;


const EDGES = arcanaLayerEdges.map((edge) => ({ ...edge, ..._edgePath(edge.from, edge.to) }));
const IDS = arcanaLayers.map((layer) => layer.id);
const HASH_PREFIX = 'engineering-';

export function ArcanaLayers() {
  const { selected, onKeyDown, tabProps } = useTabList<ArcanaLayerId>({
    ids: IDS,
    initial: DEFAULT_ARCANA_LAYER,
    hashOf: (id) => `${HASH_PREFIX}${id}`,
    fromHash: (hash) => IDS.find((id) => hash === `${HASH_PREFIX}${id}`),
  });
  const layer = arcanaLayers.find((l) => l.id === selected)!;

  return (
    <div className="arcana-layers">
      <p className="arcana-layers__lead">{text}</p>
      <div className="arcana-layers__diagram">
        <svg className="arcana-layers__edges" viewBox={`0 0 ${VIEW.width} ${VIEW.height}`} aria-hidden="true">
          <defs>
            <marker id="arcana-layers-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" />
            </marker>
          </defs>
          {EDGES.map((edge) => (
            <g key={`${edge.from}-${edge.to}`} className="arcana-layers__edge"
              data-lit={edge.from === selected || edge.to === selected || undefined}>
              <path d={edge.d} markerEnd="url(#arcana-layers-arrow)" />
              <text x={edge.labelAt.x} y={edge.labelAt.y} textAnchor="middle" dominantBaseline="middle">{edge.label}</text>
            </g>
          ))}
        </svg>
        <div className="arcana-layers__nodes" role="tablist" aria-label="Engineering layers" onKeyDown={onKeyDown}>
          {arcanaLayers.map((l, index) => (
            <button key={l.id} type="button" className="arcana-layers__node" id={`arcana-layer-${l.id}`}
              aria-controls="arcana-layer-panel" {...tabProps(l.id)}
              style={{ left: `${(NODE[l.id].x / VIEW.width) * 100}%`, top: `${(NODE[l.id].y / VIEW.height) * 100}%` }}>
              <span className="arcana-layers__index">{String(index + 1).padStart(2, '0')}</span>
              {l.name}
            </button>
          ))}
        </div>
        {/* Narrow screens drop the drawing and read the loop as a list of its edges. */}
        <ol className="arcana-layers__steps" aria-hidden="true">
          {arcanaLayerEdges.map((edge) => <li key={edge.label}>{edge.label}</li>)}
        </ol>
      </div>

      <section id="arcana-layer-panel" className="arcana-layers__panel" role="tabpanel"
        aria-labelledby={`arcana-layer-${layer.id}`} tabIndex={0}>
        <h3 className="arcana-layers__name">{layer.name}</h3>
        {layer.purpose && <p className="arcana-layers__purpose">{layer.purpose}</p>}
        <dl className="arcana-layers__groups">
          {layer.groups.map((group) => (
            <div key={group.label}>
              <dt>{group.label}</dt>
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
