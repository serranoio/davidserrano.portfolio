import { css, unsafeCSS } from 'lit';
import { SKY } from './shooting-stars-config';

// The night's colours as CSS, for the sections that paint their own sky in
// CSS and must meet the WebGL sky of the rose scene without a seam.
// `skyEdge` is the colour every home section meets its neighbours with: the
// night background token.
export const skyEdge = css`var(--color-bg)`;
export const skyHorizon = unsafeCSS(SKY.horizon);
