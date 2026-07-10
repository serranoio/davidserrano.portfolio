export type BlogTag = 'spiritual' | 'tech' | 'yoga' | 'dance';

export interface BlogPost {
  slug: string;
  title: string;
  tags: readonly BlogTag[];
}

export const TAG_ORDER: readonly BlogTag[] = [
  'spiritual',
  'tech',
  'yoga',
  'dance',
];

export const TAG_LABELS: Record<BlogTag, string> = {
  spiritual: 'Spiritual',
  tech: 'Tech',
  yoga: 'Yoga',
  dance: 'Dance',
};

export const TAG_CARDS: Record<BlogTag, { title: string; blurb: string }> = {
  spiritual: {
    title: 'Inner Work & The Quiet Craft',
    blurb:
      'Essays on meditation, dopamine detox, gratitude, and the practice of becoming the creator of your own days.',
  },
  tech: {
    title: 'Strategy & Engineering Craft',
    blurb:
      'Where the inner work meets the work — diagnosis, guiding insight, and the missing piece behind agile teams that actually ship.',
  },
  yoga: {
    title: 'Flow, Breath & The Present Moment',
    blurb:
      'Living from prana — meditation, the flow state, and the truth that joy emanates from within.',
  },
  dance: {
    title: 'Life as a Dance',
    blurb:
      'Bachata, rhythm, and the metaphor that misstepping is part of the dance.',
  },
};

export const BLOG_POSTS: readonly BlogPost[] = [
  { slug: 'intro', title: 'Welcome', tags: ['spiritual'] },
  { slug: 'about-the-founder', title: 'About The Founder', tags: ['spiritual'] },
  { slug: 'become-a-kid-again', title: 'Become a Kid Again', tags: ['spiritual'] },
  { slug: 'daily-affirmation', title: 'Daily Affirmation', tags: ['spiritual'] },
  { slug: 'disruptive-strategic-design', title: 'Disruptive Strategic Design', tags: ['tech'] },
  {
    slug: 'everything-in-moderation-is-unsufficient',
    title: 'Everything In Moderation is a False Notion',
    tags: ['spiritual'],
  },
  { slug: 'flow', title: 'The Flow State', tags: ['spiritual', 'yoga'] },
  {
    slug: 'how-to-celebrate-your-birthday',
    title: 'How To Celebrate Your Birthday',
    tags: ['spiritual'],
  },
  { slug: 'imagine-a-world', title: 'Imagine A World', tags: ['spiritual'] },
  { slug: 'intro-to-bachata', title: 'Intro To Bachata', tags: ['spiritual', 'dance'] },
  { slug: 'my-weaknesses', title: 'My Weaknesses', tags: ['spiritual'] },
  { slug: 'thankgiving', title: 'The Greatest Thing to be Thankful For', tags: ['spiritual'] },
  { slug: 'the-forge', title: 'The Forge', tags: ['spiritual'] },
  { slug: 'the-lifelong-conflict', title: 'The Lifelong Conflict', tags: ['spiritual', 'yoga'] },
  { slug: 'the-machete-of-self-love', title: 'The Machete of Self Love', tags: ['spiritual'] },
  { slug: 'the-missing-piece-to-agile', title: 'The Missing Piece to Agile', tags: ['tech'] },
  {
    slug: 'the-phoenix-of-the-soul',
    title: 'The Phoenix Of The Soul - A Guided Meditation',
    tags: ['spiritual'],
  },
  { slug: 'the-shield-of-aeneas', title: 'The Shield of Aeneas', tags: ['spiritual'] },
  {
    slug: 'the-story-of-christ',
    title: "What the Story of Christ's Crucifixion Really Means",
    tags: ['spiritual'],
  },
  {
    slug: 'what-living-with-purpose-really-means',
    title: 'What Living with Purpose Really Means',
    tags: ['spiritual', 'yoga'],
  },
  { slug: 'work-hard-play-hard', title: 'Work Hard Play Hard Sucks A**', tags: ['spiritual', 'tech'] },
  { slug: 'your-career-is-a-song', title: 'Your Career Is a Song', tags: ['spiritual', 'tech'] },
  { slug: 'your-life-is-a-dance', title: 'The Dance of Life', tags: ['spiritual', 'dance'] },
];

export function postsByTag(tag: BlogTag): readonly BlogPost[] {
  return BLOG_POSTS.filter((p) => p.tags.includes(tag)).slice().sort((a, b) =>
    a.title.localeCompare(b.title)
  );
}
