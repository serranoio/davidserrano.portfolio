import { css } from 'lit';

export default css`
  :host {
    display: block;
    width: 100vw;
    height: 100vh;
    position: relative;
    overflow: hidden;
    background-color: var(--color-bg, #0a0a08);
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }

  .loading-shimmer {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(
      135deg,
      var(--color-bg, #0a0a08) 0%,
      #1a1a16 50%,
      var(--color-bg, #0a0a08) 100%
    );
    background-size: 200% 200%;
    animation: shimmer 2s ease-in-out infinite;
  }

  .loading-shimmer::after {
    content: '';
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      var(--color-gold-primary, #d4af37) 0%,
      transparent 70%
    );
    opacity: 0.3;
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes shimmer {
    0%, 100% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
  }

  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
      opacity: 0.3;
    }
    50% {
      transform: scale(1.2);
      opacity: 0.5;
    }
  }

  .loading-shimmer.fade-out {
    opacity: 0;
    transition: opacity 0.5s ease-out;
    pointer-events: none;
  }

  #content-root {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90%;
    max-width: 600px;
    max-height: 70vh;
    overflow-y: auto;
    background: rgba(8, 8, 6, 0.985);
    border: 1px solid rgba(244, 215, 123, 0.35);
    border-radius: 8px;
    padding: 2.25rem 2.5rem;
    color: #faf3df;
    font-family: var(--font-body, 'DM Sans', system-ui, sans-serif);
    font-size: 1.02rem;
    display: none;
    z-index: 10;
  }

  #content-root.visible {
    display: block;
  }

  #content-root h1,
  #content-root h2,
  #content-root h3 {
    font-family: var(--font-title, 'Cormorant Garamond', Georgia, serif);
    color: #f4d77b;
    text-shadow: 0 0 14px rgba(244, 215, 123, 0.25);
    font-weight: 600;
    letter-spacing: 0.015em;
    margin-top: 0;
  }

  #content-root h1 {
    font-size: 2.4rem;
    line-height: 1.15;
    margin-bottom: 0.75rem;
    letter-spacing: 0.025em;
  }

  #content-root h2 {
    font-size: 1.45rem;
    color: #ecd58a;
  }

  #content-root h3 {
    font-size: 1.2rem;
    color: #e6cd84;
  }

  /* Rspress's MDX renderer injects anchor links inside headings; hide them */
  #content-root .header-anchor,
  #content-root h1 > a,
  #content-root h2 > a,
  #content-root h3 > a {
    display: none;
  }

  .close-button {
    position: absolute;
    top: 1rem;
    right: 1rem;
    width: 2.5rem;
    height: 2.5rem;
    border: 1px solid var(--color-gold-muted, rgba(212, 175, 55, 0.3));
    border-radius: 50%;
    background: transparent;
    color: var(--color-gold-primary, #d4af37);
    font-size: 1.5rem;
    line-height: 1;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-button:hover {
    background: var(--color-gold-primary, #d4af37);
    color: var(--color-bg, #0a0a08);
    border-color: var(--color-gold-primary, #d4af37);
  }

  .close-button:focus {
    outline: 2px solid var(--color-gold-primary, #d4af37);
    outline-offset: 2px;
  }

  .content-body {
    margin-top: 1.5rem;
    line-height: 1.7;
    color: #f7efde;
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
    border-top: 1px solid rgba(244, 215, 123, 0.3);
    margin: 1.75rem 0;
  }

  .content-body em {
    font-style: italic;
    color: #f0d995;
  }

  .content-body strong {
    color: #f4d77b;
    font-weight: 600;
  }
`;
