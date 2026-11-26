import { usePage } from '@rspress/core/runtime';
import { Link } from '@rspress/core/theme';
import type { DocHistoryIndex, DocVersion } from '../doc-history';
import './version-history.css';

declare const __DOC_HISTORY__: DocHistoryIndex;

const history = __DOC_HISTORY__;

interface Selection {
  slug: string;
  versions: DocVersion[];
  /** The version on screen; the newest one when reading the live post. */
  selected: DocVersion | undefined;
  isLatestPage: boolean;
}

function useSelection(): Selection | undefined {
  const { page } = usePage();
  const route = page.routePath.replace(/\.html$/, '').replace(/\/$/, '');
  const old = route.match(/^\/blog\/history\/([^/]+)\/([^/]+)$/);
  const slug = old?.[1] ?? route.match(/^\/blog\/([^/]+)$/)?.[1];
  const versions = slug ? history[slug] : undefined;
  if (!slug || !versions) return undefined;
  const selected = old ? versions.find((v) => v.short === old[2]) : versions[0];
  return { slug, versions, selected, isLatestPage: !old };
}

function hrefFor(slug: string, version: DocVersion, index: number): string {
  return index === 0 ? `/blog/${slug}` : version.route;
}

function VersionList({ selection }: { selection: Selection }) {
  const { slug, versions, selected, isLatestPage } = selection;
  if (versions.length === 0) {
    return <p className="version-history__empty">Not committed yet. Versions appear after the first published commit.</p>;
  }
  return (
    <ol className="version-history__list">
      {versions.map((version, index) => {
        const active = version.hash === selected?.hash;
        // The live post renders the newest version; its diff lives on that version's own page.
        const changesHref = isLatestPage && index === 0 ? `${version.route}#version-changes` : '#version-changes';
        return (
          <li key={version.hash} className={`version-history__item${active ? ' is-active' : ''}`}>
            <Link href={hrefFor(slug, version, index)} className="version-history__link" aria-current={active ? 'page' : undefined}>
              <span className="version-history__date">
                {version.date}
                {index === 0 && <span className="version-history__badge">Latest</span>}
              </span>
              <span className="version-history__subject">{version.subject}</span>
            </Link>
            {active && (
              <Link href={changesHref} className="version-history__changes">
                See what changed
              </Link>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Version list in the right-hand outline column (it becomes the outline drawer on narrow screens). */
export function VersionHistoryPanel() {
  const selection = useSelection();
  if (!selection) return null;
  return (
    <nav className="version-history" aria-label="Version history">
      <h2 className="version-history__title">Version history</h2>
      <VersionList selection={selection} />
    </nav>
  );
}

/** Above the post: on an old version, says so; on narrow screens, the version list itself. */
export function VersionHistoryBanner() {
  const selection = useSelection();
  if (!selection) return null;
  const { slug, versions, selected, isLatestPage } = selection;
  return (
    <>
      {!isLatestPage && selected && (
        <aside className="version-banner" role="note">
          <p>
            {selected === versions[0] ? 'This is the latest version, ' : "You're reading the version from "}
            <strong>{selected.date}</strong>: {selected.subject}
          </p>
          <p className="version-banner__actions">
            <Link href="#version-changes">See what changed</Link>
            {selected !== versions[0] && <Link href={`/blog/${slug}`}>Read the latest</Link>}
          </p>
        </aside>
      )}
      <details className="version-history version-history--inline">
        <summary className="version-history__title">
          Version history <span className="version-history__count">{versions.length}</span>
        </summary>
        <VersionList selection={selection} />
      </details>
    </>
  );
}
