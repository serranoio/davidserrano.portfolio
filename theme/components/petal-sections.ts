import type { ComponentType } from 'react';
import TodoV1 from '../../docs/sections/to-do-v1.mdx';
import TodoV2 from '../../docs/sections/to-do-v2.mdx';

// The current rose_separated.glb contains 46 petal meshes, sorted by name.
// Every petal has its own section id and can host a different MDX article.
// To publish an article: import its MDX component, then add/replace an entry
// in PETAL_SECTION_OVERRIDES using the desired petalIndex and a unique id.
// Unassigned petals alternate between the two placeholder articles.

export interface PetalSection {
  petalIndex: number;
  id: string;
  Component: ComponentType;
}

const PETAL_COUNT = 46;

const PETAL_SECTION_OVERRIDES: readonly PetalSection[] = [
  // Prominent front-right and front-left petals keep both articles reachable.
  { petalIndex: 41, id: 'todo-v1', Component: TodoV1 },
  { petalIndex: 43, id: 'todo-v2', Component: TodoV2 },
];

export const PETAL_SECTIONS: readonly PetalSection[] = [
  ...Array.from({ length: PETAL_COUNT }, (_, petalIndex) => ({
    petalIndex,
    id: `petal-${petalIndex}`,
    Component: petalIndex % 2 === 0 ? TodoV1 : TodoV2,
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
