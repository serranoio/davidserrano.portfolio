import { css } from 'lit';

export default css`
  :host {
    display: block;
    position: relative;
    width: 100vw;
    /* dvh tracks the visual viewport so iOS Safari URL-bar transitions
       don't carve a strip off the section. Older browsers fall back to vh. */
    height: 100vh;
    height: 100dvh;
    scroll-snap-align: start;
    overflow: hidden;
    /* Hardcoded — rspress defines --color-bg as a light cream which would
       win over a var() fallback and leave the night sky unreadable. */
    background-color: #0a0a08;
    color: #faf3df;
    font-family: var(--font-body, 'DM Sans', system-ui, sans-serif);
    /* --paint-progress is set on the host each rAF tick by the element. */
  }

  .stars-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 0;
  }

  .container {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: 1.1fr 0.9fr;
    gap: 4rem;
    align-items: center;
    width: min(1200px, 92vw);
    height: 100%;
    margin: 0 auto;
    padding: 2rem;
    box-sizing: border-box;
  }

  .text-col {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    align-items: flex-start;
  }

  /* Headline is two stacked copies inside a wrap:
     - .headline-stroke: outline-only, always fully visible (the "canvas")
     - .headline: solid gold, clip-pathed left→right by --paint-progress
     The paintbrush rides the leading edge of the clip. */
  .headline-wrap {
    position: relative;
    display: inline-block;
    line-height: 1;
  }

  .headline-stroke,
  .headline {
    font-family: var(--font-title, 'Cormorant Garamond', Georgia, serif);
    font-weight: 600;
    font-size: clamp(3rem, 7vw, 5.5rem);
    line-height: 1.05;
    letter-spacing: 0.01em;
    margin: 0;
    white-space: nowrap;
  }

  .headline-stroke {
    color: rgba(244, 215, 123, 0.22);
    -webkit-text-stroke: 1.25px rgba(244, 215, 123, 0.75);
    text-stroke: 1.25px rgba(244, 215, 123, 0.75);
    pointer-events: none;
  }

  .headline {
    position: absolute;
    top: 0;
    left: 0;
    color: #f4d77b;
    text-shadow: 0 0 24px rgba(244, 215, 123, 0.25);
    clip-path: inset(0 calc((1 - var(--paint-progress, 0)) * 100%) 0 0);
  }

  .paintbrush {
    position: absolute;
    top: 50%;
    left: calc(var(--paint-progress, 0) * 100%);
    transform: translate(-30%, -40%) rotate(-18deg);
    width: clamp(70px, 9vw, 110px);
    height: auto;
    pointer-events: none;
    opacity: clamp(0, calc(var(--paint-progress, 0) * 6), 1);
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5));
  }

  .subline {
    font-family: var(--font-title, 'Cormorant Garamond', Georgia, serif);
    font-style: italic;
    font-size: clamp(1.1rem, 1.8vw, 1.5rem);
    color: rgba(244, 215, 123, 0.65);
    letter-spacing: 0.18em;
    margin: 0;
    /* Fades in during the second half of the paint reveal — quiet entrance. */
    opacity: clamp(0, calc((var(--paint-progress, 0) - 0.5) * 2), 1);
    transform: translateY(calc((1 - clamp(0, (var(--paint-progress, 0) - 0.5) * 2, 1)) * 8px));
    transition: transform 0.05s linear;
  }

  .intro {
    max-width: 34rem;
    margin: 0.25rem 0 0;
    color: rgba(250, 243, 223, 0.78);
    font-size: clamp(1rem, 1.35vw, 1.18rem);
    line-height: 1.65;
    letter-spacing: 0;
    text-wrap: balance;
  }

  .photo-col {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .photo {
    width: min(420px, 80%);
    aspect-ratio: 4 / 5;
    object-fit: cover;
    object-position: center 30%;
    display: block;
    border: 1px solid rgba(244, 215, 123, 0.35);
    border-radius: 4px;
    box-shadow:
      0 0 30px rgba(244, 215, 123, 0.08),
      0 8px 32px rgba(0, 0, 0, 0.6);
  }

  .scroll-hint {
    position: absolute;
    bottom: 1.75rem;
    left: 50%;
    transform: translateX(-50%);
    color: rgba(244, 215, 123, 0.45);
    font-size: 1.5rem;
    z-index: 1;
    animation: bob 2.5s ease-in-out infinite;
    pointer-events: none;
    /* Fades out as the user starts scrolling. */
    opacity: clamp(0, calc(1 - var(--paint-progress, 0) * 3), 1);
  }

  @keyframes bob {
    0%, 100% { transform: translate(-50%, 0); }
    50% { transform: translate(-50%, 0.5rem); }
  }

  @media (max-width: 768px) {
    .container {
      grid-template-columns: 1fr;
      grid-template-rows: auto auto;
      gap: 2.5rem;
      align-content: center;
    }
    .text-col {
      order: 2;
      align-items: center;
      text-align: center;
    }
    .intro {
      max-width: min(32rem, 88vw);
      font-size: 1rem;
      line-height: 1.55;
    }
    .photo-col {
      order: 1;
    }
    .photo {
      width: min(220px, 55%);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .scroll-hint { animation: none; }
    .subline { transition: none; }
  }
`;
