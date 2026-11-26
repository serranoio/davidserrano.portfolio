import { POEM_COMPONENTS, SECTION_TAGS } from './petal-sections';

export function PoemPanel({ section }: { section: string | null }) {
  if (!section) return null;
  const Component = POEM_COMPONENTS[section];
  if (!Component) return null;
  const tags = SECTION_TAGS[section] ?? [];
  return (
    <>
      {tags.length > 0 && (
        <ul className="poem-tags" aria-label="Tags">
          {tags.map((tag) => <li key={tag} className="poem-tag">{tag}</li>)}
        </ul>
      )}
      <Component />
    </>
  );
}
