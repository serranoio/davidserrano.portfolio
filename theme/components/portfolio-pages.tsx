import { useState, type ReactNode } from 'react';
import type { BlogPost, BlogTag } from '../blog-posts';
import { engineeringProfile } from '../engineering-profile';
import './portfolio-pages.css';

declare const __WRITING_CATALOG__: {
  posts: readonly BlogPost[];
  tags: readonly { id: BlogTag; label: string }[];
};

const writingCatalog = __WRITING_CATALOG__;

function PortfolioPage({ eyebrow, title, introduction, children }: {
  eyebrow: string;
  title: string;
  introduction: string;
  children: ReactNode;
}) {
  return (
    <main className="portfolio-page">
      <div className="portfolio-page__inner">
        <header className="portfolio-page__header">
          <p className="portfolio-page__eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="portfolio-page__introduction">{introduction}</p>
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

export function EngineeringPage() {
  const profile = engineeringProfile;
  return (
    <PortfolioPage eyebrow="Engineering" title="Software as a craft."
      introduction={profile.introduction}>
      <nav className="portfolio-links" aria-label="Professional links">
        {profile.resumeUrl && <a href={profile.resumeUrl}>Read my résumé <span aria-hidden="true">↗</span></a>}
        <a href={profile.githubUrl}>Find me on GitHub <span aria-hidden="true">↗</span></a>
        {profile.contactUrl && <a href={profile.contactUrl}>Get in touch <span aria-hidden="true">↗</span></a>}
      </nav>
      {profile.experience.length > 0 && (
        <section className="portfolio-section" aria-labelledby="experience-heading">
          <h2 id="experience-heading">Experience</h2>
          {profile.experience.map((experience) => (
            <article className="experience-entry" key={`${experience.organization}-${experience.role}-${experience.period}`}>
              <p className="portfolio-page__eyebrow">{experience.period}</p>
              <h3>{experience.role} · {experience.organization}</h3>
              <p>{experience.description}</p>
            </article>
          ))}
        </section>
      )}
      <section className="portfolio-section engineering-story" aria-label="The Ballad of Programata">
        <a className="portfolio-text-link" href="/#rose">
          <span>Read The Ballad Of Programata: where you can find beauty in engineering</span>
          <span aria-hidden="true">→</span>
        </a>
      </section>
      <section className="portfolio-section" aria-labelledby="engineering-writing-heading">
        <h2 id="engineering-writing-heading">Thinking about the work</h2>
        <ul className="portfolio-reading-list">
          <li><a href="/blog/the-missing-piece-to-agile.html">The Missing Piece to Agile <span aria-hidden="true">↗</span></a></li>
          <li><a href="/blog/disruptive-strategic-design.html">Disruptive Strategic Design <span aria-hidden="true">↗</span></a></li>
        </ul>
      </section>
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
