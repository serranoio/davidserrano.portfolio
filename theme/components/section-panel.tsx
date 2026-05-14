import About from '../../docs/sections/about.mdx';
import CaseStudies from '../../docs/sections/case-studies.mdx';
import Poetry from '../../docs/sections/poetry.mdx';

const SECTION_COMPONENTS: Record<string, React.ComponentType> = {
  about: About,
  'case-studies': CaseStudies,
  poetry: Poetry,
};

export function SectionPanel({ section }: { section: string | null }) {
  if (!section) return null;
  const Component = SECTION_COMPONENTS[section];
  return Component ? <Component /> : null;
}
