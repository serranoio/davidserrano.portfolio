import { css, unsafeCSS } from 'lit';
import { BREATH_CYCLE_SECONDS } from './breath';
import { skyEdge } from './sky.styles';

const breathCycle = unsafeCSS(`${BREATH_CYCLE_SECONDS}s`);

export default css`
  :host {
    display: block;
    width: 100vw;
    height: calc(100svh + var(--poem-scroll-distance, 0px));
    position: relative;
    /* Always night: theme/index.css gives this element the night token
       values in either theme, so --color-bg here is never the light cream. */
    background-color: ${skyEdge};
    /* Quiet ivory for everything set over the night; gold is kept for the
       moment something is chosen. */
    --rose-ink: var(--color-text);
    --rose-ink-quiet: color-mix(in srgb, var(--color-text) 55%, transparent);
    --rose-gold: var(--color-gold-light);
  }

  .scene-viewport {
    position: sticky;
    top: 0;
    width: 100%;
    height: 100svh;
    overflow: hidden;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }

  /* The scene has no frame: its sky dissolves into the sections above and
     below instead of ending at an edge. */
  .scene-viewport::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 1;
    background: linear-gradient(
      to bottom,
      ${skyEdge} 0%,
      transparent 16%,
      transparent 84%,
      ${skyEdge} 100%
    );
  }

  /* While a poem is open the night deepens behind the words — a pool of
     dark with no edge, in place of a panel. */
  .scene-viewport::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 2;
    background: radial-gradient(
      ellipse 62% 78% at 50% 50%,
      color-mix(in srgb, var(--color-bg) 94%, transparent) 0%,
      color-mix(in srgb, var(--color-bg) 88%, transparent) 45%,
      color-mix(in srgb, var(--color-bg) 0%, transparent) 100%
    );
    opacity: 0;
    transition: opacity 0.7s ease;
  }

  .scene-viewport.reading::after {
    opacity: 1;
  }

  /* The one line of words under the rose. No box, no glow: starlight-coloured
     type that leaves for good once a petal has been chosen. */
  .petal-hint {
    position: absolute;
    left: 50%;
    top: calc(50% + 13svh);
    transform: translateX(-50%);
    margin: 0;
    z-index: 3;
    pointer-events: none;
    white-space: nowrap;
    font-family: var(--font-title, 'Cormorant Garamond', Georgia, serif);
    font-weight: 300;
    font-size: 1.3rem;
    letter-spacing: 0.14em;
    color: var(--rose-ink);
    opacity: 0.85;
    transition: opacity 1.4s ease, visibility 0s;
  }

  .petal-hint.gone {
    opacity: 0;
    visibility: hidden;
    transition: opacity 1.4s ease, visibility 0s linear 1.4s;
  }

  .loading-shimmer {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${skyEdge};
  }

  /* One slow breath of rose light where the flower will be. */
  .loading-shimmer::after {
    content: '';
    width: 9rem;
    height: 9rem;
    border-radius: 50%;
    background: radial-gradient(circle, color-mix(in srgb, var(--color-crimson-primary) 50%, transparent) 0%, transparent 68%);
    animation: breathe ${breathCycle} ease-in-out infinite;
  }

  @keyframes breathe {
    0%, 100% {
      transform: scale(0.9);
      opacity: 0.35;
    }
    40% {
      transform: scale(1.12);
      opacity: 0.7;
    }
  }

  #content-root {
    box-sizing: border-box;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 88%;
    max-width: 34rem;
    color: var(--rose-ink);
    font-family: var(--font-body, 'DM Sans', system-ui, sans-serif);
    font-size: 1.02rem;
    visibility: hidden;
    opacity: 0;
    transition: opacity 0.6s ease, visibility 0s linear 0.6s;
    z-index: 10;
  }

  .content-body::-webkit-scrollbar {
    display: none;
  }

  #content-root.visible {
    visibility: visible;
    opacity: 1;
    transition: opacity 0.6s ease 0.15s, visibility 0s;
  }

  #content-root h1,
  #content-root h2,
  #content-root h3 {
    font-family: var(--font-title, 'Cormorant Garamond', Georgia, serif);
    color: var(--rose-ink);
    font-weight: 400;
    letter-spacing: 0.01em;
    margin-top: 0;
  }

  #content-root h1 {
    font-size: 2.6rem;
    font-weight: 300;
    line-height: 1.1;
    margin-bottom: 1.75rem;
  }

  #content-root h2 {
    font-size: 1.5rem;
  }

  #content-root h3 {
    font-size: 1.25rem;
  }

  /* Rspress's MDX renderer injects anchor links inside headings; hide them */
  #content-root .header-anchor,
  #content-root h1 > a,
  #content-root h2 > a,
  #content-root h3 > a {
    display: none;
  }

  /* A bare glyph with a full-size hit target and no ring around it, set
     above the column where the words have already faded out. */
  .close-button {
    position: absolute;
    top: 0;
    right: 0;
    z-index: 1;
    width: 2.75rem;
    height: 2.75rem;
    border: none;
    background: transparent;
    color: var(--rose-ink-quiet);
    font-family: var(--font-title, 'Cormorant Garamond', Georgia, serif);
    font-size: 2.6rem;
    font-weight: 300;
    line-height: 1;
    cursor: pointer;
    transition: color 0.12s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-button:hover {
    color: var(--rose-gold);
  }

  .close-button:focus-visible {
    outline: 1px solid var(--rose-gold);
    outline-offset: 2px;
  }

  .content-body {
    box-sizing: border-box;
    max-height: 74vh;
    overflow-y: auto;
    overscroll-behavior-y: contain;
    scrollbar-width: none;
    padding: 4.5rem 0.5rem 4rem;
    /* Lines fade in and out at the top and bottom instead of being cut. */
    -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 4rem, #000 calc(100% - 3.5rem), transparent 100%);
    mask-image: linear-gradient(to bottom, transparent 0, #000 4rem, #000 calc(100% - 3.5rem), transparent 100%);
    line-height: 1.8;
    color: var(--rose-ink);
  }

  .content-body p {
    margin-bottom: 1rem;
  }

  .content-body h2 {
    margin-top: 1.75rem;
    margin-bottom: 0.75rem;
  }

  .content-body ul {
    margin: 1rem 0;
    padding-left: 1.5rem;
  }

  .content-body li {
    margin-bottom: 0.5rem;
  }

  .content-body hr {
    border: none;
    border-top: 1px solid color-mix(in srgb, var(--color-text) 16%, transparent);
    width: 3rem;
    margin: 2.5rem 0;
  }

  .content-body em {
    font-style: italic;
  }

  .content-body strong {
    font-weight: 500;
  }

  .attribution {
    position: absolute;
    /* Sits above the body-level music player (48 px button at bottom: 1rem) */
    bottom: 4rem;
    right: 1rem;
    z-index: 5;
    pointer-events: none;
    font-family: var(--font-body, 'DM Sans', system-ui, sans-serif);
    font-size: 0.72rem;
    letter-spacing: 0.02em;
  }

  .attribution a {
    pointer-events: auto;
    color: var(--rose-ink);
    opacity: 0.38;
    text-decoration: none;
    transition: opacity 0.12s ease, color 0.12s ease;
  }

  .attribution a:hover,
  .attribution a:focus-visible {
    opacity: 1;
    color: var(--rose-gold);
    outline: none;
  }

  @media (max-width: 480px) {
    .attribution {
      font-size: 0.65rem;
      /* Still above the player on mobile (same 48 px button + ~1 rem gap) */
      bottom: 4rem;
      right: 0.6rem;
    }
  }

  .truth-nav {
    display: none;
  }

  .truth-nav.coarse {
    position: absolute;
    right: calc(1rem + env(safe-area-inset-right));
    /* Music player is fixed at bottom: 1rem with a 48px button; sit just above it. */
    bottom: calc(4.75rem + env(safe-area-inset-bottom));
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0);
    transition: opacity 0.3s ease, transform 0.3s ease;
    z-index: 49;
  }

  .truth-nav-button {
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.3rem;
    line-height: 1;
    color: var(--rose-ink-quiet);
    background: transparent;
    border: none;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: color 0.12s ease;
  }

  .truth-nav-button:active {
    color: var(--rose-gold);
  }

  .truth-nav-button:focus-visible {
    outline: 1px solid var(--rose-gold);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    .truth-nav,
    .petal-hint,
    .petal-hint.gone,
    #content-root,
    #content-root.visible,
    .scene-viewport::after {
      transition: none;
    }

    .loading-shimmer::after {
      animation: none;
    }
  }
`;
