import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type Ref } from 'react';
import type { BlogPost, BlogTag, TagGroupId } from '../blog-posts';
import { engineeringProfile, type PhoenixPath, type PhoenixPathId } from '../engineering-profile';
import { ArcanaCard } from './arcana-card';
import { PHOENIX_WRITTEN_AT, type PhoenixPoint } from './phoenix-drawing';
import { PhoenixCoal } from './phoenix-ember';
import { PhoenixFigure } from './phoenix-figure';
import { PhoenixSparks, prefersStillness, type PhoenixSparksHandle } from './phoenix-sparks';
import './portfolio-pages.css';

declare const __WRITING_CATALOG__: {
  posts: readonly BlogPost[];
  groups: readonly WritingGroup[];
};

interface WritingTag { id: BlogTag; label: string }
type WritingSelection = { kind: 'group'; id: TagGroupId } | { kind: 'tag'; id: BlogTag };
interface WritingGroup { id: TagGroupId; label: string; tags: readonly WritingTag[] }

const writingCatalog = __WRITING_CATALOG__;
const WRITING_TAG_PARAM = 'tag';
const WRITING_GROUP_PARAM = 'group';
const WRITING_LEAD = 'Writing from the';

export function PortfolioPage({ eyebrow, title, introduction, children }: {
  eyebrow?: string;
  title?: string;
  introduction?: string;
  children: ReactNode;
}) {
  return (
    <main className="portfolio-page">
      <div className="portfolio-page__inner">
        {title && <header className="portfolio-page__header">
          {eyebrow && <p className="portfolio-page__eyebrow">{eyebrow}</p>}
          <div className="portfolio-page__title-row">
            <h1>{title}</h1>
          </div>
          {introduction && <p className="portfolio-page__introduction">{introduction}</p>}
        </header>}
        {children}
        <footer className="portfolio-page__footer">
          <a href="/">← Back to the whole picture</a>
          <span>David Serrano</span>
        </footer>
      </div>
    </main>
  );
}

const KINDLE_POINT = 'phoenix-path__kindle';

/**
 * One path's words. The heading is where its fire lands: the heart keeps a
 * twin of the bird's ember there, the others a point on the rule beneath.
 */
function PhoenixPathSection({ path, kindling, caught, ref }: {
  path: PhoenixPath;
  /** A spark is on its way here and has not landed yet. */
  kindling: boolean;
  /** Fire sent by a resting pointer has landed, and the pointer is still there. */
  caught: boolean;
  ref: Ref<HTMLElement>;
}) {
  const headingId = `phoenix-${path.id}-heading`;
  return (
    <section ref={ref} className={`phoenix-path phoenix-path--${path.id}`} aria-labelledby={headingId}
      tabIndex={-1} data-kindling={kindling || undefined} data-caught={caught || undefined}>
      <h2 className="phoenix-path__name" id={headingId}>
        {path.name}
        <span className="phoenix-path__rule" aria-hidden="true" />
        {path.id === 'heart'
          ? <PhoenixCoal className={`${KINDLE_POINT} phoenix-path__coal`} shape="heart" />
          : <span className={KINDLE_POINT} aria-hidden="true" />}
      </h2>
      <p className="phoenix-path__verse">{path.verse}</p>
      <ul className="phoenix-path__entries">
        {path.links.map((link) => (
          <li key={link.href}>
            {/* A link to this page's own section points down to it; the rest lead away. */}
            <a href={link.href} data-in-page={link.href.startsWith('#') || undefined}>
              {link.title}{'\u00a0'}<span aria-hidden="true">{link.href.startsWith('#') ? '↓' : '→'}</span>
            </a>
          </li>
        ))}
        {path.notes.map((note) => (
          <li key={note.title}>
            <span className="phoenix-path__note-title">{note.title}</span>
            <span className="phoenix-path__note-description">{note.description}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Scroll only when the section is not already whole on the screen. */
function _bringIntoView(section: HTMLElement) {
  const { top, bottom } = section.getBoundingClientRect();
  if (top >= 0 && bottom <= window.innerHeight) return;
  section.scrollIntoView({ block: 'center', behavior: prefersStillness() ? 'auto' : 'smooth' });
}

export function EngineeringPage() {
  const profile = engineeringProfile;
  const sections = useRef<Partial<Record<PhoenixPathId, HTMLElement | null>>>({});
  const sparks = useRef<PhoenixSparksHandle>(null);
  const [kindling, setKindling] = useState<PhoenixPathId | null>(null);

  const [caught, setCaught] = useState<PhoenixPathId | null>(null);
  const hovered = useRef<PhoenixPathId | null>(null);

  /** Send a part's fire to its words. One flight at a time per part. */
  const sendFire = (id: PhoenixPathId, sources: PhoenixPoint[], onLanded?: () => void) => {
    const landing = sections.current[id]?.querySelector(`.${KINDLE_POINT}`);
    if (!landing || kindling === id) return;
    setKindling(id);
    sparks.current?.send(sources, landing, () => {
      setKindling((flying) => (flying === id ? null : flying));
      onLanded?.();
    });
  };

  /** Resting a pointer on a part sends its fire; the words stay caught while it rests there. */
  const hover = (id: PhoenixPathId, sources: PhoenixPoint[]) => {
    hovered.current = id;
    sendFire(id, sources, () => { if (hovered.current === id) setCaught(id); });
  };
  const leave = (id: PhoenixPathId) => {
    if (hovered.current === id) hovered.current = null;
    setCaught((held) => (held === id ? null : held));
  };

  /** Pressing a part hands the visitor to its words. A finger sends the fire now; a mouse already has. */
  const press = (id: PhoenixPathId, sources: PhoenixPoint[], hovering: boolean) => {
    const section = sections.current[id];
    if (!section) return;
    section.focus({ preventScroll: true });
    _bringIntoView(section);
    if (!hovering) sendFire(id, sources);
  };

  return (
    <PortfolioPage>
      <div className="phoenix" style={{ '--phoenix-written': `${PHOENIX_WRITTEN_AT.toFixed(2)}s` } as CSSProperties}>
        <div className="phoenix__figure"><PhoenixFigure onHover={hover} onLeave={leave} onPress={press} /></div>
        {profile.paths.map((path) => (
          <PhoenixPathSection key={path.id} path={path} kindling={kindling === path.id} caught={caught === path.id}
            ref={(section) => { sections.current[path.id] = section; }} />
        ))}
        <p className="phoenix__ground">{profile.groundingLine}</p>
        <PhoenixSparks ref={sparks} />
      </div>
      <ArcanaCard />
    </PortfolioPage>
  );
}

export function WritingPage() {
  const [selected, setSelected] = useState<WritingSelection | null>(null);
  // Pressing what is already chosen lets go of it.
  const toggle = (next: WritingSelection) =>
    setSelected((current) => (current?.kind === next.kind && current.id === next.id ? null : next));
  const groups: readonly WritingGroup[] = writingCatalog.groups
    .map((group) => ({ ...group, tags: group.tags.filter((tag) =>
      writingCatalog.posts.some((post) => post.tags.includes(tag.id))) }))
    .filter((group) => group.tags.length > 0);
  const tags = groups.flatMap((group) => group.tags);
  // A link may arrive already filtered, e.g. /writing.html?tag=tech or ?group=heart.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tag = tags.find((candidate) => candidate.id === params.get(WRITING_TAG_PARAM));
    const group = groups.find((candidate) => candidate.id === params.get(WRITING_GROUP_PARAM));
    if (tag) setSelected({ kind: 'tag', id: tag.id });
    else if (group) setSelected({ kind: 'group', id: group.id });
  }, []);
  const selectedGroup = selected?.kind === 'group' ? groups.find((group) => group.id === selected.id) : undefined;
  const selectedTags: readonly BlogTag[] | null = selected === null ? null
    : selectedGroup ? selectedGroup.tags.map((tag) => tag.id) : [selected.id as BlogTag];
  const selectedLabel = selectedGroup?.label ?? tags.find((tag) => tag.id === selected?.id)?.label;
  const posts = writingCatalog.posts
    .filter((post) => !selectedTags || selectedTags.some((tag) => post.tags.includes(tag)))
    .slice().sort((a, b) => a.title.localeCompare(b.title));
  return (
    <PortfolioPage>
      <div className="writing-backdrop" aria-hidden="true"><PhoenixFigure /></div>
      <h1 className="writing-heading">Writing</h1>
      <section aria-label="Browse my writing">
        <div className="writing-lead">{WRITING_LEAD}</div>
        <div className="writing-groups" role="group" aria-label="Filter writing by topic">
          {groups.map((group) => (
            <div className={`writing-group writing-group--${group.id}`} key={group.id}>
              <h2 className="writing-group__name">
                <button type="button" aria-pressed={selected?.kind === 'group' && selected.id === group.id}
                  onClick={() => toggle({ kind: 'group', id: group.id })}>{group.label}</button>
              </h2>
              <ul className="writing-group__tags">
                {group.tags.map((tag) => (
                  <li key={tag.id}>
                    <button type="button" aria-pressed={selected?.kind === 'tag' && selected.id === tag.id}
                      onClick={() => toggle({ kind: 'tag', id: tag.id })}>{tag.label}</button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="writing-status">
          <p className="writing-count" role="status" aria-live="polite">
            {posts.length} {posts.length === 1 ? 'piece' : 'pieces'}{selectedLabel ? ` · ${selectedLabel}` : ''}
          </p>
          <button type="button" className="writing-all" aria-pressed={selected === null} onClick={() => setSelected(null)}>All writing</button>
        </div>
        <ul className="writing-list">
          {posts.map((post) => (
            <li key={post.slug}>
              <a href={`/blog/${post.slug}.html`}>
                <span>
                  <span className="writing-list__title">{post.title}</span>
                  <span className="writing-list__topics">{tags.filter((tag) => post.tags.includes(tag.id)).map((tag) => tag.label).join(' · ')}</span>
                </span>
                <span aria-hidden="true">↗</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </PortfolioPage>
  );
}
