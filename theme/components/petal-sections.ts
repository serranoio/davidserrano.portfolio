import type { ComponentType } from 'react';
import About from '../../docs/sections/about.mdx';
import Poetry from '../../docs/sections/poetry.mdx';

// Registry of which rose petals are clickable and what MDX renders inside.
//
// To add a new section:
//   1. Drop a new MDX file in docs/sections/
//   2. Add an `import` line above for it
//   3. Add an entry below: { petalIndex, id, Component }
//
// `petalIndex` indexes directly into the GLB's petal meshes, sorted by name
// (so it's stable across reloads). The petal at that index stays exactly
// where the model placed it — registering it just makes it clickable and
// glowing. To discover which physical petal a given index is, open the
// browser console and call:
//   __ROSE_TEST_API__.getPetalPositions()
// — that returns [{x,y,z}, ...] in the same order as petalIndex.
//
// `id` is the slug used as `activeSection` state and dispatched in the
// `section-selected` event detail. Keep it URL-safe and unique.

export interface PetalSection {
  petalIndex: number;
  id: string;
  Component: ComponentType;
}

export const PETAL_SECTIONS: readonly PetalSection[] = [
  // Indices verified empirically with __ROSE_TEST_API__.raycastAtCanvas():
  // these two are the petals that *win* their own raycast from the default
  // camera angle (the GLB has co-located duplicate meshes, so naive picks
  // get occluded by a sibling at the same XYZ).
  //
  // 41 = front-right outer petal (x≈0.09, z≈0.15) — covers a wide right
  //      area, several "lower" petals (19, 24, 25, 26, 31, 34, 39, 44) all
  //      raycast to this one. Big and prominent.
  // 43 = front-left outer petal (x≈-0.15, z≈0.12). Pair to 41 on the left.
  //
  // To find more click-winning indices later, run cypress on
  // cypress/e2e/rose/raycast-click.cy.ts and inspect API output via
  // __ROSE_TEST_API__.raycastAtCanvas(x, y).
  { petalIndex: 41, id: 'about', Component: About },
  { petalIndex: 43, id: 'poetry', Component: Poetry },
];

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
