/**
 * The House of Arcana's engineering: the Software Factory, three layers in a loop (agents write changes, proof
 * decides which get in, the tech stack runs and produces the evidence the next change starts from), with the human
 * at its centre, prompting the agents and reviewing the proof. Facts come from the Arcana repository
 * (docsite/docs/architecture/tech-stack.md, guardrails.md, .agents/skills); update them together.
 */
export type ArcanaLayerId = 'human' | 'tech-stack' | 'proof' | 'agents';
/** The layers on the loop; the human sits inside it. */
export type ArcanaRingLayerId = Exclude<ArcanaLayerId, 'human'>;

export interface ArcanaLayerGroup {
  label: string;
  items: readonly string[];
}

export interface ArcanaLayer {
  id: ArcanaLayerId;
  name: string;
  /** What the layer is for, in one line. */
  purpose: string;
  groups: readonly ArcanaLayerGroup[];
}

export interface ArcanaLayerEdge {
  from: ArcanaLayerId;
  to: ArcanaLayerId;
  label: string;
}

export const arcanaLayers: readonly ArcanaLayer[] = [
  {
    id: 'human',
    name: 'Human',
    purpose: 'Prompts the agents and reviews the proof.',
    groups: [
      { label: 'Prompting', items: ['T3 Code', 'cmux'] },
      { label: 'Reviewing', items: ['Scenario journeys against the scenarios I specified', 'Glossary and architecture guardrails on the Rspress docs site'] },
    ],
  },
  {
    id: 'agents',
    name: 'Agents',
    purpose: 'Who builds it, and what keeps them honest.',
    groups: [
      { label: 'Contract', items: ['AGENTS.md operating contract for AI coding agents'] },
      { label: 'Skills', items: ['8 hypothesis-loop skills: claim → evidence', 'Review, doc work, Kalshi spec update, ingest operator'] },
      { label: 'Passes', items: ['Preflight', 'Subagent passes', 'Wrap-up gate'] },
      { label: 'Workflow', items: ['One worktree and database per task', 'One squash commit per task', 'Maintained commands, never throwaway scripts'] },
    ],
  },
  {
    id: 'proof',
    name: 'Proof',
    purpose: '',
    groups: [
      { label: 'Rules', items: ['~40 architecture guardrails, each with a review-fails list and required proof', 'Documentation first - agents define a new term in the glossary so I am aligned', 'Specification by example: every feature starts as if-this-then-that scenarios with acceptance criteria'] },
      { label: 'Enforcement', items: ['Local verification harness: runs only the tests a change reaches', 'Normal · UI · E2E · journey · scale · performance layers', 'Oxlint guardrail rules', 'knip', 'jscpd', 'lit-analyzer'] },
      { label: 'Evidence', items: ['Synthetic markets that act out each scenario', 'Scenario journeys through the real CLI and UI', 'Showcase demo run', 'Published performance reports'] },
    ],
  },
  {
    id: 'tech-stack',
    name: 'Tech Stack',
    purpose: 'What runs.',
    groups: [
      { label: 'Runtime', items: ['Bun 1.4', 'TypeScript 6', 'Turborepo monorepo', 'arcana CLI'] },
      { label: 'Data', items: ['Kalshi REST + WebSocket clients generated from OpenAPI / AsyncAPI', 'ClickHouse market capture', 'PostgreSQL control plane', 'SQLite research stores', 'Drizzle', 'zod'] },
      { label: 'Interface', items: ['Lit', 'Web Awesome', 'uPlot', 'Vite'] },
    ],
  },
];

/** The loop, in reading order. */
export const arcanaLayerEdges: readonly (ArcanaLayerEdge & { from: ArcanaRingLayerId; to: ArcanaRingLayerId })[] = [
  { from: 'agents', to: 'proof', label: 'write every change' },
  { from: 'proof', to: 'tech-stack', label: 'squash to main' },
  { from: 'tech-stack', to: 'agents', label: 'evidence for the next change' },
];

/** Where the human touches the loop: prompting the agents, and reviewing the proof. */
export const arcanaHumanEdges: readonly ArcanaLayerEdge[] = [
  { from: 'human', to: 'agents', label: 'prompts' },
  { from: 'proof', to: 'human', label: 'scenarios and proofs to review' },
];

/** The page opens on the human, who starts every change. */
export const DEFAULT_ARCANA_LAYER: ArcanaLayerId = 'human';
