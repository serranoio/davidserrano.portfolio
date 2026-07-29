import * as fs from 'node:fs';
import * as path from 'node:path';

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

const BLOG_DIR = path.join(process.cwd(), 'docs', 'blog');
const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---/;
const FALLBACK_TITLES: Record<string, string> = {
  intro: 'Welcome',
};

function parseScalar(frontmatter: string, key: string): string | undefined {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  return match?.[1]?.trim().replace(/^['"]|['"]$/g, '');
}

function parseTags(frontmatter: string): BlogTag[] {
  const inlineMatch = frontmatter.match(/^tags:\s*\[([^\]]*)\]\s*$/m);

  if (inlineMatch) {
    return inlineMatch[1]
      .split(',')
      .map((tag) => tag.trim().replace(/^['"]|['"]$/g, ''))
      .filter((tag): tag is BlogTag => isBlogTag(tag));
  }

  const blockMatch = frontmatter.match(/^tags:\s*\n((?:\s+-\s+.+\n?)+)/m);

  if (!blockMatch) {
    return [];
  }

  return blockMatch[1]
    .split('\n')
    .map((line) => line.trim().replace(/^-\s+/, '').replace(/^['"]|['"]$/g, ''))
    .filter((tag): tag is BlogTag => isBlogTag(tag));
}

function isBlogTag(tag: string): tag is BlogTag {
  return TAG_ORDER.includes(tag as BlogTag);
}

function readBlogPosts(): BlogPost[] {
  return fs
    .readdirSync(BLOG_DIR)
    .filter((file) => /\.(md|mdx)$/.test(file))
    .map((file) => {
      const slugFromFile = file.replace(/\.(md|mdx)$/, '');
      const content = fs.readFileSync(path.join(BLOG_DIR, file), 'utf8');
      const frontmatter = content.match(FRONTMATTER_RE)?.[1] ?? '';
      const slug = parseScalar(frontmatter, 'slug') ?? slugFromFile;
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
