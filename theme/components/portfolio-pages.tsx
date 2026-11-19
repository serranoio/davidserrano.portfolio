import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type Ref } from 'react';
import type { BlogPost, BlogTag } from '../blog-posts';
import { engineeringProfile, type PhoenixPath, type PhoenixPathId } from '../engineering-profile';
import { ArcanaSpeed } from './arcana-speed';
import { PHOENIX_WRITTEN_AT, type PhoenixPoint } from './phoenix-drawing';
import { PhoenixCoal } from './phoenix-ember';
import { PhoenixFigure } from './phoenix-figure';
import { PhoenixSparks, prefersStillness, type PhoenixSparksHandle } from './phoenix-sparks';
import './portfolio-pages.css';

declare const __WRITING_CATALOG__: {
  posts: readonly BlogPost[];
  tags: readonly { id: BlogTag; label: string }[];
};

const writingCatalog = __WRITING_CATALOG__;
const WRITING_TAG_PARAM = 'tag';

function PortfolioPage({ eyebrow, title, introduction, children }: {
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
            <a href={link.href}>{link.title}{'\u00a0'}<span aria-hidden="true">→</span></a>
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
      <ArcanaSpeed />
    </PortfolioPage>
  );
}

export function WritingPage() {
  const [selectedTag, setSelectedTag] = useState<BlogTag | null>(null);
  // A link may arrive already filtered, e.g. /writing.html?tag=tech.
  useEffect(() => {
    const asked = new URLSearchParams(window.location.search).get(WRITING_TAG_PARAM);
    if (writingCatalog.tags.some((tag) => tag.id === asked)) setSelectedTag(asked as BlogTag);
  }, []);
  const posts = writingCatalog.posts
    .filter((post) => !selectedTag || post.tags.includes(selectedTag))
    .slice().sort((a, b) => a.title.localeCompare(b.title));
  const tags = writingCatalog.tags.filter((tag) =>
    writingCatalog.posts.some((post) => post.tags.includes(tag.id)));
  return (
    <PortfolioPage eyebrow="Writing" title="A life, put into words."
      introduction="Essays and poems about craft, dance, inner work, and learning to live with purpose. All written by me.">
      <section aria-label="Browse my writing">
        <div className="writing-filters" role="group" aria-label="Filter writing by topic">
          <button type="button" aria-pressed={selectedTag === null} onClick={() => setSelectedTag(null)}>All writing</button>
          {tags.map((tag) => (
            <button type="button" key={tag.id} aria-pressed={selectedTag === tag.id}
              onClick={() => setSelectedTag(tag.id)}>{tag.label}</button>
          ))}
        </div>
        <p className="writing-count" role="status" aria-live="polite">
          {posts.length} {posts.length === 1 ? 'piece' : 'pieces'}{selectedTag ? ` · ${tags.find((tag) => tag.id === selectedTag)?.label}` : ''}
        </p>
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

export function AboutPage() {
  return (
    <PortfolioPage eyebrow="About David" title="One life. Many ways to create."
      introduction="I write code, dance bachata, and write poems. Each is a way of discovering beauty — in what I build, in what I feel, and in the people I share it with.">
      <div className="about-composition">
        <img src="/img/david-hero.jpg" alt="David near the Golden Gate Bridge" width="400" height="500" />
        <section className="about-story" aria-labelledby="purpose-heading">
          <h2 id="purpose-heading">Your life is art.</h2>
          <p>Where every step is another brushstroke you paint. Your heart is an
            endless paintbucket. It has the potential to radiate colors in every
            facet of your life.</p>
          <p>I'm here to help you discover this source of life, or rather, return
            to this oasis that already exists inside of you.</p>
          <p>The good steps, the bad steps, and everything in between all belong
            in the picture. This site is a place for the different parts of my life
            to meet.</p>
          <a className="portfolio-text-link" href="/blog/about-the-founder.html">Read my story <span aria-hidden="true">↗</span></a>
        </section>
      </div>
      <nav className="portfolio-links" aria-label="More of my life">
        <a href="/engineering.html">Explore my engineering <span aria-hidden="true">↗</span></a>
        <a href="/writing.html">Read my writing <span aria-hidden="true">↗</span></a>
      </nav>
    </PortfolioPage>
  );
}
