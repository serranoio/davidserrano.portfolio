import * as fs from 'node:fs';
import * as path from 'node:path';
import { frontmatterOf, isPublished, parseList, parseScalar } from './frontmatter';

export type BlogTag =
  | 'spiritual'
  | 'meditation'
  | 'self-mastery'
  | 'self-love'
  | 'gratitude'
  | 'poetry'
  | 'myth'
  | 'dance'
  | 'yoga'
  | 'tech'
  | 'strategy'
  | 'work'
  | 'personal';

export interface BlogPost {
  slug: string;
  title: string;
  tags: readonly BlogTag[];
}

export const TAG_ORDER: readonly BlogTag[] = [
  'spiritual',
  'meditation',
  'self-mastery',
  'self-love',
  'gratitude',
  'poetry',
  'myth',
  'dance',
  'yoga',
  'tech',
  'strategy',
  'work',
  'personal',
];

export const TAG_LABELS: Record<BlogTag, string> = {
  spiritual: 'Spiritual',
  meditation: 'Meditation',
  'self-mastery': 'Self Mastery',
  'self-love': 'Self Love',
  gratitude: 'Gratitude',
  poetry: 'Poetry',
  myth: 'Myth',
  dance: 'Dance',
  yoga: 'Yoga',
  tech: 'Tech',
  strategy: 'Strategy',
  work: 'Work',
  personal: 'Personal',
};

export const TAG_CARDS: Record<BlogTag, { title: string; blurb: string }> = {
  spiritual: {
    title: 'Inner Work & The Quiet Craft',
    blurb:
      'Essays on meditation, dopamine detox, gratitude, and the practice of becoming the creator of your own days.',
  },
  meditation: {
    title: 'Meditation & Stillness',
    blurb:
      'Guided practices and essays on presence, breath, awareness, and returning to the moment.',
  },
  'self-mastery': {
    title: 'Self Mastery',
    blurb:
      'Writing on discipline, desire, weakness, resilience, and the hard work of becoming whole.',
  },
  'self-love': {
    title: 'Self Love',
    blurb:
      'Essays about choosing yourself without attaching your worth to external outcomes.',
  },
  gratitude: {
    title: 'Gratitude',
    blurb:
      'Pieces about thankfulness, celebration, and the spiritual meaning of ordinary days.',
  },
  poetry: {
    title: 'Poetry',
    blurb:
      'Poetic writing, mythic language, and essays shaped more like song than instruction.',
  },
  myth: {
    title: 'Myth & Sacred Story',
    blurb:
      'Interpretations of ancient, religious, and symbolic stories as maps for inner life.',
  },
  dance: {
    title: 'Life as a Dance',
    blurb:
      'Bachata, rhythm, and the metaphor that misstepping is part of the dance.',
  },
  yoga: {
    title: 'Flow, Breath & The Present Moment',
    blurb:
      'Living from prana — meditation, the flow state, and the truth that joy emanates from within.',
  },
  tech: {
    title: 'Strategy & Engineering Craft',
    blurb:
      'Where the inner work meets the work — diagnosis, guiding insight, and the missing piece behind agile teams that actually ship.',
  },
  strategy: {
    title: 'Strategy',
    blurb:
      'Diagnosis, guiding insight, product judgment, and the discipline of choosing a better path.',
  },
  work: {
    title: 'Work & Calling',
    blurb:
      'Writing about career, craft, ambition, burnout, and turning work into art.',
  },
  personal: {
    title: 'Personal',
    blurb:
      'First-person reflections from the founder, including weaknesses, values, and origin story.',
  },
};

export type TagGroupId = 'heart' | 'mind' | 'wings';

export interface TagGroup {
  id: TagGroupId;
  label: string;
  tags: readonly BlogTag[];
}

/**
 * The phoenix's three parts, in the order its fire travels: the heart is what
 * you nurture, the mind is what you maintain, the wings are what you create.
 * `spiritual` belongs to none of them: it is the phoenix itself, on nearly
 * every piece, so it is not offered as a filter.
 */
export const TAG_GROUPS: readonly TagGroup[] = [
  { id: 'heart', label: 'Heart', tags: ['self-love', 'gratitude', 'poetry', 'personal'] },
  { id: 'mind', label: 'Mind', tags: ['meditation', 'yoga', 'self-mastery', 'myth'] },
  { id: 'wings', label: 'Wings', tags: ['dance', 'tech', 'work', 'strategy'] },
];

const BLOG_DIR = path.join(process.cwd(), 'docs', 'blog');
const FALLBACK_TITLES: Record<string, string> = {
  intro: 'Welcome',
};

function parseTags(frontmatter: string): BlogTag[] {
  return parseList(frontmatter, 'tags').filter(isBlogTag);
}

function isBlogTag(tag: string): tag is BlogTag {
  return TAG_ORDER.includes(tag as BlogTag);
}

const BLOG_FILES = fs.readdirSync(BLOG_DIR).filter((file) => /\.(md|mdx)$/.test(file));
const readBlogFile = (file: string) => fs.readFileSync(path.join(BLOG_DIR, file), 'utf8');

/** Route globs (relative to docs/) for posts not in published mode; they are never built. */
export const UNPUBLISHED_ROUTES: readonly string[] = BLOG_FILES
  .filter((file) => !isPublished(readBlogFile(file)))
  .map((file) => `blog/${file}`);

function readBlogPosts(): BlogPost[] {
  return BLOG_FILES
    .map((file) => [file, readBlogFile(file)] as const)
    .filter(([, content]) => isPublished(content))
    .map(([file, content]) => {
      const slugFromFile = file.replace(/\.(md|mdx)$/, '');
      const frontmatter = frontmatterOf(content);
      // Rspress routes follow filenames; `slug` frontmatter does not rename them.
      const slug = slugFromFile;
      const title = parseScalar(frontmatter, 'title') ?? FALLBACK_TITLES[slug] ?? slug;
      const tags = parseTags(frontmatter);

      return { slug, title, tags };
    })
    .filter((post) => post.tags.length > 0);
}

export const BLOG_POSTS: readonly BlogPost[] = readBlogPosts();

export function postsByTag(tag: BlogTag): readonly BlogPost[] {
  return BLOG_POSTS.filter((p) => p.tags.includes(tag)).slice().sort((a, b) =>
    a.title.localeCompare(b.title)
  );
}
