import * as path from 'node:path';
import { defineConfig } from '@rspress/core';

export default defineConfig({
  root: path.join(__dirname, 'docs'),
  title: 'My Site',
  icon: '/rspress-icon.png',
  logo: {
    light: '/rspress-light-logo.png',
    dark: '/rspress-dark-logo.png',
  },
  themeConfig: {
    socialLinks: [
      {
        icon: 'github',
        mode: 'link',
        content: 'https://github.com/web-infra-dev/rspress',
      },
    ],
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
