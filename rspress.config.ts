import * as path from 'node:path';
import { defineConfig } from '@rspress/core';
import { BLOG_POSTS, TAG_GROUPS, TAG_LABELS, UNPUBLISHED_ROUTES, postsByTag, type BlogPost } from './theme/blog-posts';
import { buildDocHistory } from './theme/doc-history';

// Writes docs/blog/history/** (one page per version) before routes are scanned.
const DOC_HISTORY = buildDocHistory();

// The welcome note belongs to no part of the phoenix; it opens the sidebar and stays off the writing list.
const INTRO_SLUG = 'intro';
const postLink = (post: BlogPost) => ({ text: post.title, link: `/blog/${post.slug}` });

export default defineConfig({
  root: path.join(__dirname, 'docs'),
  title: 'David Serrano',
  icon: '/serrano-heart.png',
  logo: '/serrano-heart.png',
  logoText: 'David Serrano',
  // Posts not in published mode are never built: no page, no sidebar entry.
  // The poems in docs/sections/ appear only inside the rose, never as pages of their own.
  route: { exclude: [...UNPUBLISHED_ROUTES, 'sections/**'] },
  themeConfig: {
    nav: [
      { text: 'Engineering', link: '/engineering' },
      { text: 'Writing', link: '/writing', activeMatch: '^/(writing(?:\\.html)?$|blog/)' },
    ],
    socialLinks: [
      {
        icon: 'github',
        mode: 'link',
        content: 'https://github.com/serranoio/davidserrano.portfolio',
      },
    ],
    sidebar: {
      // The welcome note, then the phoenix's three parts, each holding its tags.
      '/blog/': [
        ...BLOG_POSTS.filter((post) => post.slug === INTRO_SLUG).map(postLink),
        ...TAG_GROUPS.map((group) => ({
          text: group.label,
          collapsible: true,
          collapsed: false,
          items: group.tags.map((tag) => ({
            text: TAG_LABELS[tag],
            collapsible: true,
            collapsed: true,
            items: postsByTag(tag).map(postLink),
          })),
        })),
      ],
    },
  },
  builderConfig: {
    html: {
      tags: [
        // Default to the dark theme. Rspress otherwise falls back to the OS
        // setting; a visitor's own toggle choice is stored and still wins.
        {
          tag: 'script',
          children: `{const k='rspress-theme-appearance';if(!localStorage.getItem(k)){localStorage.setItem(k,'dark');const r=document.documentElement;r.classList.add('dark','rp-dark');r.style.colorScheme='dark';}}`,
          append: false,
        },
      ],
    },
    source: {
      define: {
        __DOC_HISTORY__: JSON.stringify(DOC_HISTORY),
        __WRITING_CATALOG__: JSON.stringify({
          posts: BLOG_POSTS.filter((post) => post.slug !== INTRO_SLUG),
          groups: TAG_GROUPS.map((group) => ({
            id: group.id,
            label: group.label,
            tags: group.tags.map((id) => ({ id, label: TAG_LABELS[id] })),
          })),
        }),
      },
    },
    tools: {
      rspack: (config) => {
        config.module ??= {};
        config.module.rules ??= [];
        // Treat any `import x from '...?raw'` as the file's raw contents.
        // Used by golden-rose to inline the truth-statement prose, and by
        // petal-sections to read each poem's title from its own heading.
        const rawQuery = /raw/;
        // A raw import of a poem must skip the MDX compiler, or the "source"
        // would be compiled JavaScript instead of the words.
        for (const rule of config.module.rules) {
          if (rule && typeof rule === 'object' && rule.test instanceof RegExp && rule.test.test('poem.mdx')) {
            rule.resourceQuery = { not: [rawQuery] };
          }
        }
        config.module.rules.push({
          resourceQuery: rawQuery,
          type: 'asset/source',
        });
        // A poem's comments, and a draft poem's words, never reach the bundle.
        config.module.rules.push({
          test: /docs[\\/]sections[\\/][^\\/]+\.mdx$/,
          enforce: 'pre',
          use: [{ loader: path.join(__dirname, 'theme/loaders/strip-poem-comments.cjs') }],
        });
        return config;
      },
    },
  },
});
