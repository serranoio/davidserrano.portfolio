// The small slice of YAML frontmatter this site reads: scalars, string lists
// and the `published` flag. Pure, so build code and browser code share it.

export const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?/;

export function frontmatterOf(source: string): string {
  return source.match(FRONTMATTER_RE)?.[1] ?? '';
}

export function withoutFrontmatter(source: string): string {
  return source.replace(FRONTMATTER_RE, '');
}

export function parseScalar(frontmatter: string, key: string): string | undefined {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  return match?.[1]?.trim().replace(/^['"]|['"]$/g, '');
}

/** `key: [a, b]` or a block list of `- a` lines. */
export function parseList(frontmatter: string, key: string): string[] {
  const unquote = (item: string) => item.trim().replace(/^-\s+/, '').replace(/^['"]|['"]$/g, '');
  const inline = frontmatter.match(new RegExp(`^${key}:\\s*\\[([^\\]]*)\\]\\s*$`, 'm'));
  if (inline) return inline[1].split(',').map(unquote).filter(Boolean);
  const block = frontmatter.match(new RegExp(`^${key}:\\s*\\n((?:\\s+-\\s+.+\\n?)+)`, 'm'));
  return block ? block[1].split('\n').map(unquote).filter(Boolean) : [];
}

/** A post or poem is shown only while its frontmatter says `published: true`; anything else is a draft. */
export function isPublished(source: string): boolean {
  return parseScalar(frontmatterOf(source), 'published') === 'true';
}
