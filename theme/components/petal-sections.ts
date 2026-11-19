import type { ComponentType } from 'react';
import Architecture from '../../docs/sections/code-is-architecture.mdx';
import ArchitectureSource from '../../docs/sections/code-is-architecture.mdx?raw';
import History from '../../docs/sections/history-in-cities.mdx';
import HistorySource from '../../docs/sections/history-in-cities.mdx?raw';
import Forest from '../../docs/sections/the-forest.mdx';
import ForestSource from '../../docs/sections/the-forest.mdx?raw';
import GuitarHero from '../../docs/sections/guitar-hero.mdx';
import GuitarHeroSource from '../../docs/sections/guitar-hero.mdx?raw';
import Eagle from '../../docs/sections/like-an-eagle.mdx';
import EagleSource from '../../docs/sections/like-an-eagle.mdx?raw';
import Cooking from '../../docs/sections/cooking-a-dish.mdx';
import CookingSource from '../../docs/sections/cooking-a-dish.mdx?raw';
import Dance from '../../docs/sections/code-is-dance.mdx';
import DanceSource from '../../docs/sections/code-is-dance.mdx?raw';
import SystemDance from '../../docs/sections/the-system-dance.mdx';
import SystemDanceSource from '../../docs/sections/the-system-dance.mdx?raw';
import DataDance from '../../docs/sections/the-data-dance.mdx';
import DataDanceSource from '../../docs/sections/the-data-dance.mdx?raw';
import TeamDance from '../../docs/sections/the-team-dance.mdx';
import TeamDanceSource from '../../docs/sections/the-team-dance.mdx?raw';
import PartnerDance from '../../docs/sections/the-partner-dance.mdx';
import PartnerDanceSource from '../../docs/sections/the-partner-dance.mdx?raw';
import FlowState from '../../docs/sections/the-flow-state-in-coding.mdx';
import FlowStateSource from '../../docs/sections/the-flow-state-in-coding.mdx?raw';
import Forging from '../../docs/sections/forging-code.mdx';
import ForgingSource from '../../docs/sections/forging-code.mdx?raw';

// Each petal keeps its own section id so it can host a different article later.
// Import an MDX article and add a PETAL_SECTION_OVERRIDES entry to assign it
// to a specific petal. Indices follow the GLB petal meshes sorted by name.
export interface PetalSection {
  petalIndex: number;
  id: string;
  title: string;
  Component: ComponentType;
}

interface Article {
  title: string;
  Component: ComponentType;
}

// The poem's own first heading is its title, so renaming a poem in its file
// renames it everywhere.
const TITLE_PATTERN = /^#\s+(.+?)\s*$/m;

export function _titleOf(source: string): string {
  const title = TITLE_PATTERN.exec(source)?.[1];
  if (!title) throw new Error('[petal-sections] a section file has no "# " title heading');
  return title;
}

function article(Component: ComponentType, source: string): Article {
  return { title: _titleOf(source), Component };
}

// Ballad of Programata: the linked notes, in index order. The dance note is
// split into one article per poem, kept together after its opening poem.
const ARTICLES: readonly Article[] = [
  article(Architecture, ArchitectureSource),
  article(History, HistorySource),
  article(Forest, ForestSource),
  article(GuitarHero, GuitarHeroSource),
  article(Eagle, EagleSource),
  article(Cooking, CookingSource),
  article(Dance, DanceSource),
  article(SystemDance, SystemDanceSource),
  article(DataDance, DataDanceSource),
  article(TeamDance, TeamDanceSource),
  article(PartnerDance, PartnerDanceSource),
  article(FlowState, FlowStateSource),
  article(Forging, ForgingSource),
];
const PETAL_COUNT = 46;
const PETAL_SECTION_OVERRIDES: readonly PetalSection[] = [
  { petalIndex: 41, id: 'code-is-architecture', ...article(Architecture, ArchitectureSource) },
  { petalIndex: 43, id: 'history-in-cities', ...article(History, HistorySource) },
];

export const PETAL_SECTIONS: readonly PetalSection[] = [
  ...Array.from({ length: PETAL_COUNT }, (_, petalIndex) => ({
    petalIndex,
    id: `petal-${petalIndex}`,
    ...ARTICLES[petalIndex % ARTICLES.length],
  })).filter(
    ({ petalIndex }) => !PETAL_SECTION_OVERRIDES.some((entry) => entry.petalIndex === petalIndex)
  ),
  ...PETAL_SECTION_OVERRIDES,
].sort((a, b) => a.petalIndex - b.petalIndex);

// Loud at module load: duplicate petalIndex or id is a config bug, not a
// runtime degrade. Out-of-bounds petalIndex (depends on the loaded GLB) is
// checked later with a console.warn so a bad index doesn't crash the scene.
const seenIndices = new Set<number>();
const seenIds = new Set<string>();
for (const entry of PETAL_SECTIONS) {
  if (seenIndices.has(entry.petalIndex)) {
    throw new Error(
      `[petal-sections] duplicate petalIndex ${entry.petalIndex} — each petal slot can host only one section`
    );
  }
  if (seenIds.has(entry.id)) {
    throw new Error(
      `[petal-sections] duplicate id "${entry.id}" — section ids must be unique`
    );
  }
  seenIndices.add(entry.petalIndex);
  seenIds.add(entry.id);
}

// Derived views consumed by golden-rose.ts and poem-panel.tsx. Single source
// of truth above; these are just shapes the consumers want.
export const ACTIVE_PETAL_INDICES: readonly number[] = PETAL_SECTIONS.map(
  (s) => s.petalIndex
);

export const SECTIONS: readonly string[] = PETAL_SECTIONS.map((s) => s.id);

export const POEM_COMPONENTS: Record<string, ComponentType> = Object.fromEntries(
  PETAL_SECTIONS.map((s) => [s.id, s.Component])
);

export const SECTION_TITLES: Record<string, string> = Object.fromEntries(
  PETAL_SECTIONS.map((s) => [s.id, s.title])
);
