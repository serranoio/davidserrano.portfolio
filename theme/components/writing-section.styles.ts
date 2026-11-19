import { css } from 'lit';

export default css`
  :host {
    display: block;
    position: relative;
    width: 100vw;
    min-height: 100vh;
    min-height: 100svh;
    background: var(--color-bg);
    color: var(--color-text);
    font-family: var(--font-body, 'DM Sans', system-ui, sans-serif);
    padding: 6rem 1.5rem 5rem;
    box-sizing: border-box;
    overflow: hidden;
  }

  .stars-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 0;
  }

  .header {
    position: relative;
    z-index: 1;
  }

  .header {
    display: flex;
    min-height: calc(100vh - 11rem);
    min-height: calc(100svh - 11rem);
    align-items: center;
    justify-content: center;
    max-width: 1100px;
    margin: 0 auto;
    text-align: center;
  }

  .writing-link {
    font-family: var(--font-title, 'Cormorant Garamond', Georgia, serif);
    font-size: clamp(2.4rem, 5vw, 3.6rem);
    font-weight: 500;
    line-height: 1.1;
    color: var(--color-gold-light);
    letter-spacing: 0.01em;
    text-decoration: none;
    text-shadow: 0 0 20px color-mix(in srgb, var(--color-gold-light) 18%, transparent);
    transition: color 0.3s ease, text-shadow 0.3s ease;
  }

  .writing-link:hover,
  .writing-link:focus-visible {
    color: color-mix(in srgb, var(--color-gold-light) 60%, var(--color-text));
    text-shadow: 0 0 28px color-mix(in srgb, var(--color-gold-light) 32%, transparent);
    outline: none;
  }

  @media (max-width: 640px) {
    :host {
      padding: 4rem 1rem 3.5rem;
    }
    .header {
      min-height: calc(100vh - 7.5rem);
      min-height: calc(100svh - 7.5rem);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .writing-link {
      transition: none;
    }
  }
`;
