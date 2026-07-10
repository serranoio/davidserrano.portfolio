import { POEM_COMPONENTS } from './petal-sections';

export function PoemPanel({ section }: { section: string | null }) {
  if (!section) return null;
  const Component = POEM_COMPONENTS[section];
  return Component ? <Component /> : null;
}
