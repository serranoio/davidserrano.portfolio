import { useFrontmatter, useHead, usePage } from '@rspress/core/runtime';
import { siteOrigin, socialImageSize } from './social-preview';

/**
 * Head tags for a rich link preview (iMessage, Slack, Discord, X, LinkedIn…) on any page whose frontmatter names a
 * `socialImage` (a public path such as /og/house-of-arcana.png); title and description come from the same
 * frontmatter. Server-rendered into each page's static HTML, since crawlers do not run JavaScript.
 *
 * Rspress's Layout emits its own og:type, og:title and og:description through the same head manager, and for
 * `pageType: custom` its og:title is the site title. These tags carry high priority so they replace those
 * (one tag per key) rather than lose to them.
 */
export function useSocialPreviewHead() {
  const { frontmatter } = useFrontmatter();
  const { page } = usePage();
  const image = typeof frontmatter.socialImage === 'string' ? frontmatter.socialImage : undefined;
  const title = String(frontmatter.title ?? '');
  const description = String(frontmatter.description ?? '');
  const imageUrl = image && new URL(image, siteOrigin).href;
  useHead(
    {
      meta: imageUrl
        ? [
            { property: 'og:type', content: 'website' },
            { property: 'og:url', content: new URL(page.routePath, siteOrigin).href },
            { property: 'og:title', content: title },
            { property: 'og:description', content: description },
            { property: 'og:image', content: imageUrl },
            { property: 'og:image:width', content: String(socialImageSize.width) },
            { property: 'og:image:height', content: String(socialImageSize.height) },
            { property: 'og:image:alt', content: title },
            { name: 'twitter:card', content: 'summary_large_image' },
            { name: 'twitter:title', content: title },
            { name: 'twitter:description', content: description },
            { name: 'twitter:image', content: imageUrl },
          ]
        : [],
    },
    { tagPriority: 'high' },
  );
}
