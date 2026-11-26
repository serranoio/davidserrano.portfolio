import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { formatDate } from './dates';
import { FRONTMATTER_RE, frontmatterOf, isPublished } from './frontmatter';

/**
 * Build-time version history for published blog posts, read from git.
 *
 * A post's history starts at the latest commit that switched it to
 * `published: true`. Every commit since then that touched the post becomes a
 * version: a rendered page of the post as it was, plus that commit's diff,
 * written to `docs/blog/history/<slug>/<short>` (gitignored, rebuilt on every
 * dev start and build).
 */

export interface DocVersion {
  hash: string;
  short: string;
  /** Author date, already formatted ("Nov 25, 2026") so SSR and client agree. */
  date: string;
  subject: string;
  route: string;
}

/** Slug → versions, newest first. */
export type DocHistoryIndex = Record<string, DocVersion[]>;

const ROOT = process.cwd();
const BLOG_DIR = path.join(ROOT, 'docs', 'blog');
const HISTORY_DIR_NAME = 'history';
const HISTORY_DIR = path.join(BLOG_DIR, HISTORY_DIR_NAME);
const RECORD = '\x1e';
const FIELD = '\x1f';

function git(args: string[]): string {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

/** Hosts like Netlify clone shallowly; a shallow clone would silently truncate history. */
function ensureFullHistory(): void {
  if (git(['rev-parse', '--is-shallow-repository']).trim() !== 'true') return;
  git(['fetch', '--unshallow', '--quiet']);
  if (git(['rev-parse', '--is-shallow-repository']).trim() === 'true') {
    throw new Error('doc-history: the git clone is shallow and could not be unshallowed.');
  }
}

interface Commit {
  hash: string;
  date: string;
  subject: string;
  /** The post's path at that commit (it may have been renamed since). */
  path: string;
  patch: string;
}

/** Commits that touched the file, oldest first, following renames. Merges carry no patch and are skipped. */
function commitsFor(relPath: string): Commit[] {
  const log = git(['log', '--follow', '-p', '--no-color', `--format=${RECORD}%H${FIELD}%aI${FIELD}%s`, '--', relPath]);
  const commits: Commit[] = [];
  for (const record of log.split(RECORD).slice(1)) {
    const newline = record.indexOf('\n');
    const [hash, date, subject] = record.slice(0, newline).split(FIELD);
    const patch = record.slice(newline + 1).trim();
    const filePath = patch.match(/^diff --git a\/.+ b\/(.+)$/m)?.[1];
    if (!filePath) continue;
    commits.push({ hash, date, subject, path: filePath, patch });
  }
  return commits.reverse();
}

function contentAt(commit: Commit): string | undefined {
  try {
    return git(['show', `${commit.hash}:${commit.path}`]);
  } catch {
    return undefined; // the commit deleted the file
  }
}

/** Only the hunks; the `diff --git` / index / ---/+++ header is noise to a reader. */
function hunksOf(patch: string): string {
  const start = patch.search(/^@@/m);
  return start === -1 ? '' : patch.slice(start).trimEnd();
}

/** A fence longer than any backtick run inside the diff, so the diff can never close it. */
function fenceFor(text: string): string {
  const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  return '`'.repeat(Math.max(3, longest + 1));
}

function versionPage(content: string, commit: Commit): string {
  const frontmatter = frontmatterOf(content)
    .split('\n')
    .filter((line) => !/^published:/.test(line))
    .join('\n');
  const body = content
    .replace(FRONTMATTER_RE, '')
    // Sibling links (`./flow.md`) are relative to docs/blog, not this nested folder.
    .replace(/\]\(\.\//g, '](/blog/');
  const hunks = hunksOf(commit.patch);
  const fence = fenceFor(hunks);
  const changes = hunks
    ? `${fence}diff\n${hunks}\n${fence}`
    : 'This commit renamed or moved the post without changing its words.';
  return [
    '---',
    frontmatter,
    'head:',
    '  - - meta',
    '    - name: robots',
    '      content: noindex',
    '---',
    body.trimEnd(),
    '',
    '## Changes in this version {#version-changes}',
    '',
    changes,
    '',
  ].join('\n');
}

export function buildDocHistory(): DocHistoryIndex {
  ensureFullHistory();
  fs.rmSync(HISTORY_DIR, { recursive: true, force: true });

  const index: DocHistoryIndex = {};
  for (const file of fs.readdirSync(BLOG_DIR)) {
    const ext = file.match(/\.(md|mdx)$/)?.[1];
    if (!ext) continue;
    const slug = file.slice(0, -ext.length - 1);
    if (!isPublished(fs.readFileSync(path.join(BLOG_DIR, file), 'utf8'))) continue;

    const commits = commitsFor(path.posix.join('docs', 'blog', file));
    const states = commits.map((commit) => {
      const content = contentAt(commit);
      return { commit, content, published: content !== undefined && isPublished(content) };
    });

    // The latest switch into published mode: published here, not published just before.
    let start = -1;
    states.forEach((state, i) => {
      if (state.published && (i === 0 || !states[i - 1].published)) start = i;
    });
    if (start === -1) {
      index[slug] = []; // published only in the working tree, not yet committed
      continue;
    }

    const versions: DocVersion[] = [];
    for (const { commit, content } of states.slice(start)) {
      if (content === undefined) continue;
      const short = commit.hash.slice(0, 7);
      const outDir = path.join(HISTORY_DIR, slug);
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, `${short}.${ext}`), versionPage(content, commit));
      versions.push({
        hash: commit.hash,
        short,
        date: formatDate(commit.date),
        subject: commit.subject,
        route: `/blog/${HISTORY_DIR_NAME}/${slug}/${short}`,
      });
    }
    index[slug] = versions.reverse();
  }
  return index;
}
