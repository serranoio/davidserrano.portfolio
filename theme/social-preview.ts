/** Link preview constants, kept free of Rspress runtime imports so scripts/og-house-of-arcana.ts can load them. */

/** Where the built site is served (davidserrano.dev serves this Rspress build). Link previews need absolute URLs. */
export const siteOrigin = 'https://davidserrano.dev';

/** Open Graph's recommended image size; images under docs/public/og/ are rendered at it. */
export const socialImageSize = { width: 1200, height: 630 };
