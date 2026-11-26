// Poem files are notes as well as poems. Runs before the MDX compiler (and
// before `?raw` imports), so neither of these ever reaches the bundle:
// - comments: anything inside `%% … %%` (Obsidian) or `<!-- … -->`, which can
//   hold anything, even text MDX would reject;
// - drafts: a poem whose frontmatter lacks `published: true` keeps only its
//   frontmatter, so petal-sections sees it is a draft and its words never ship.
//   (Same rule as isPublished in theme/frontmatter.ts.)
const COMMENT = /%%[\s\S]*?%%|<!--[\s\S]*?-->/g;
const FRONTMATTER = /^---\n([\s\S]*?)\n---\n?/;
const PUBLISHED = /^published:\s*['"]?true['"]?\s*$/m;

module.exports = function stripPoemComments(source) {
  const frontmatter = source.match(FRONTMATTER)?.[1] ?? '';
  if (!PUBLISHED.test(frontmatter)) return `---\n${frontmatter}\n---\n`;
  return source.replace(COMMENT, '');
};
