import * as fs from 'node:fs';
import type { RouteMeta } from '@rspress/core';
import { FRONTMATTER_RE, parseScalar } from './blog-posts';

/** Where the built site is served (davidserrano.dev serves this Rspress build). Link previews need absolute URLs. */
export const siteOrigin = 'https://davidserrano.dev';

/** Open Graph's recommended image size; images under docs/public/og/ are rendered at it. */
export const socialImageSize = { width: 1200, height: 630 };

const escapeAttribute = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const meta = (key: 'property' | 'name', id: string, content: string | number) =>
  `<meta ${key}="${id}" content="${escapeAttribute(String(content))}">`;

/**
 * Head tags for a rich link preview (iMessage, Slack, Discord, X, LinkedIn…) on any page whose frontmatter names a
 * `socialImage` (a public path such as /og/house-of-arcana.png); title and description come from the same
 * frontmatter. Rendered into each page's static HTML, since crawlers do not run JavaScript.
 */
export function socialPreviewHead(route: RouteMeta): string | undefined {
  const frontmatter = fs.readFileSync(route.absolutePath, 'utf8').match(FRONTMATTER_RE)?.[1] ?? '';
  const image = parseScalar(frontmatter, 'socialImage');
  if (!image) return undefined;
  const title = parseScalar(frontmatter, 'title') ?? '';
  const description = parseScalar(frontmatter, 'description') ?? '';
  const imageUrl = new URL(image, siteOrigin).href;
  return [
    meta('property', 'og:type', 'website'),
    meta('property', 'og:url', new URL(route.routePath, siteOrigin).href),
    meta('property', 'og:title', title),
    meta('property', 'og:description', description),
    meta('property', 'og:image', imageUrl),
    meta('property', 'og:image:width', socialImageSize.width),
    meta('property', 'og:image:height', socialImageSize.height),
    meta('property', 'og:image:alt', title),
    meta('name', 'twitter:card', 'summary_large_image'),
    meta('name', 'twitter:title', title),
    meta('name', 'twitter:description', description),
    meta('name', 'twitter:image', imageUrl),
  ].join('');
}
