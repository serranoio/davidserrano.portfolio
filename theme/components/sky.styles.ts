import { unsafeCSS } from 'lit';
import { SKY } from './shooting-stars-config';

// The night's colours as CSS, for the sections that paint their own sky in
// CSS and must meet the WebGL sky of the rose scene without a seam.
export const skyEdge = unsafeCSS(SKY.edge);
export const skyHorizon = unsafeCSS(SKY.horizon);
