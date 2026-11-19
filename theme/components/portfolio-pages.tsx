import { useState, type ReactNode } from 'react';
import type { BlogPost, BlogTag } from '../blog-posts';
import { engineeringProfile, type PhoenixPath } from '../engineering-profile';
import { PhoenixFigure } from './phoenix-figure';
import './portfolio-pages.css';

declare const __WRITING_CATALOG__: {
  posts: readonly BlogPost[];
  tags: readonly { id: BlogTag; label: string }[];
};

const writingCatalog = __WRITING_CATALOG__;

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

function PhoenixPathSection({ path }: { path: PhoenixPath }) {
  const headingId = `phoenix-${path.id}-heading`;
  return (
    <section className={`phoenix-path phoenix-path--${path.id}`} aria-labelledby={headingId}>
      <h2 className="phoenix-path__name" id={headingId}>{path.name}</h2>
      <p className="phoenix-path__verse">{path.verse}</p>
      <ul className="phoenix-path__entries">
        {path.links.map((link) => (
          <li key={link.href}>
            <a href={link.href}>{link.title} <span aria-hidden="true">→</span></a>
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

export function EngineeringPage() {
  const profile = engineeringProfile;
  return (
    <PortfolioPage>
      <div className="phoenix">
        <div className="phoenix__figure"><PhoenixFigure /></div>
        {profile.paths.map((path) => <PhoenixPathSection key={path.id} path={path} />)}
        <p className="phoenix__ground">{profile.groundingLine}</p>
      </div>
    </PortfolioPage>
  );
}

export function WritingPage() {
  const [selectedTag, setSelectedTag] = useState<BlogTag | null>(null);
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
