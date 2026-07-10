import * as path from 'node:path';
import { defineConfig } from '@rspress/core';
import { TAG_ORDER, TAG_LABELS, postsByTag } from './theme/blog-posts';

export default defineConfig({
  root: path.join(__dirname, 'docs'),
  title: 'David Serrano',
  icon: '/serrano-heart.png',
  logo: '/serrano-heart.png',
  logoText: 'David Serrano',
  themeConfig: {
    socialLinks: [
      {
        icon: 'github',
        mode: 'link',
        content: 'https://github.com/serranoio/davidserrano.portfolio',
      },
    ],
    sidebar: {
      '/blog/': TAG_ORDER.map((tag) => ({
        text: TAG_LABELS[tag],
        collapsible: true,
        collapsed: tag !== 'spiritual',
        items: postsByTag(tag).map((p) => ({
          text: p.title,
          link: `/blog/${p.slug}`,
        })),
      })),
    },
  },
  builderConfig: {
    tools: {
      rspack: (config) => {
        config.module ??= {};
        config.module.rules ??= [];
        // Treat any `import x from '...?raw'` as the file's raw contents.
        // Used by golden-rose to inline the truth-statement prose.
        config.module.rules.push({
          resourceQuery: /raw/,
          type: 'asset/source',
        });
        return config;
      },
    },
  },
});
