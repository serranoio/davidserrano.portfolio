import { css } from 'lit';
import { skyEdge, skyHorizon } from './sky.styles';

export default css`
  :host {
    display: block;
    position: relative;
    width: 100%;
    min-height: 100svh;
    /* Same night as the rose below: it deepens toward the foot of the
       section and returns to the shared edge colour where the two meet. */
    background: linear-gradient(
      to bottom,
      ${skyEdge} 0%,
      ${skyEdge} 30%,
      ${skyHorizon} 78%,
      ${skyEdge} 100%
    );
    color: var(--color-text);
    font-family: var(--font-body, 'DM Sans', sans-serif);
  }

  .stars-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .container {
    position: relative;
    display: grid;
    grid-template-columns: 1.2fr 0.8fr;
    gap: clamp(3rem, 7vw, 7rem);
    align-items: center;
    width: min(1120px, 88%);
    min-height: 100svh;
    margin: 0 auto;
    padding: clamp(3rem, 7vh, 6rem) 0;
    box-sizing: border-box;
  }

  .signoff {
    margin: 2rem 0 0;
    font-size: 1rem;
    color: color-mix(in srgb, var(--color-text) 85%, transparent);
  }

  .subline {
    margin: 1.5rem 0 0;
    font-family: var(--font-title, 'Cormorant Garamond', Georgia, serif);
    font-size: clamp(1.3rem, 1.8vw, 1.6rem);
    line-height: 1.4;
  }

  .intro {
    max-width: 29rem;
    margin: 1.25rem 0 0;
    color: color-mix(in srgb, var(--color-text) 85%, transparent);
    font-size: 1rem;
    line-height: 1.75;
  }

  .photo-col {
    margin: 0;
    align-self: center;
  }

  .photo {
    width: 100%;
    aspect-ratio: 4 / 5;
    object-fit: cover;
    object-position: center 30%;
    display: block;
    border-radius: 2px;
  }

  @media (max-width: 768px) {
    .container {
      grid-template-columns: 1fr;
      gap: 2.5rem;
      width: min(32rem, 86%);
      padding: 3rem 0;
    }

    .photo-col {
      width: 72%;
      justify-self: end;
    }
  }
`;
