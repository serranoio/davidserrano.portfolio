import { useState, type ReactNode } from 'react';
import type { BlogPost, BlogTag } from '../blog-posts';
import { engineeringProfile, type PhoenixPath } from '../engineering-profile';
import { PhoenixFigure } from './phoenix-figure';
import './portfolio-pages.css';

const GITHUB_MARK = 'M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z';

declare const __WRITING_CATALOG__: {
  posts: readonly BlogPost[];
  tags: readonly { id: BlogTag; label: string }[];
};

const writingCatalog = __WRITING_CATALOG__;

function PortfolioPage({ eyebrow, title, introduction, headerAction, children }: {
  eyebrow?: string;
  title: string;
  introduction?: string;
  headerAction?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="portfolio-page">
      <div className="portfolio-page__inner">
        <header className="portfolio-page__header">
          {eyebrow && <p className="portfolio-page__eyebrow">{eyebrow}</p>}
          <div className="portfolio-page__title-row">
            <h1>{title}</h1>
            {headerAction}
          </div>
          {introduction && <p className="portfolio-page__introduction">{introduction}</p>}
        </header>
        {children}
        <footer className="portfolio-page__footer">
          <a href="/">← Back to the whole picture</a>
          <span>David Serrano</span>
        </footer>
      </div>
    </main>
  );
}

function GitHubLink({ href }: { href: string }) {
  return (
    <a className="portfolio-icon-link" href={href} aria-label="GitHub">
      <svg viewBox="0 0 16 16" width="28" height="28" aria-hidden="true">
        <path fill="currentColor" d={GITHUB_MARK} />
      </svg>
    </a>
  );
}

function PhoenixPathSection({ path }: { path: PhoenixPath }) {
  const headingId = `phoenix-${path.id}-heading`;
  return (
    <section className={`phoenix-path phoenix-path--${path.id}`} aria-labelledby={headingId}>
      <p className="phoenix-path__name">{path.name}</p>
      <p className="phoenix-path__verse">{path.verse}</p>
      <h2 id={headingId}>{path.label}</h2>
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
    <PortfolioPage title="Engineering" headerAction={<GitHubLink href={profile.githubUrl} />}>
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
