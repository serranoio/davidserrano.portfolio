import type { ComponentType } from 'react';
import Architecture from '../../docs/sections/code-is-architecture.mdx';
import History from '../../docs/sections/history-in-cities.mdx';
import Forest from '../../docs/sections/the-forest.mdx';
import GuitarHero from '../../docs/sections/guitar-hero.mdx';
import Eagle from '../../docs/sections/like-an-eagle.mdx';
import Cooking from '../../docs/sections/cooking-a-dish.mdx';
import Dance from '../../docs/sections/code-is-dance.mdx';
import Forging from '../../docs/sections/forging-code.mdx';

// Each petal keeps its own section id so it can host a different article later.
// Import an MDX article and add a PETAL_SECTION_OVERRIDES entry to assign it
// to a specific petal. Indices follow the GLB petal meshes sorted by name.
export interface PetalSection {
  petalIndex: number;
  id: string;
  Component: ComponentType;
}

// Ballad of Programata: only the eight linked notes, in index order.
const ARTICLES: readonly ComponentType[] = [
  Architecture, History, Forest, GuitarHero, Eagle, Cooking, Dance, Forging,
];
const PETAL_COUNT = 46;
const PETAL_SECTION_OVERRIDES: readonly PetalSection[] = [
  { petalIndex: 41, id: 'code-is-architecture', Component: Architecture },
  { petalIndex: 43, id: 'history-in-cities', Component: History },
];

export const PETAL_SECTIONS: readonly PetalSection[] = [
  ...Array.from({ length: PETAL_COUNT }, (_, petalIndex) => ({
    petalIndex,
    id: `petal-${petalIndex}`,
    Component: ARTICLES[petalIndex % ARTICLES.length],
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
