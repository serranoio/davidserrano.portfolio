import { css } from 'lit';

export default css`
  :host {
    display: block;
    position: relative;
    width: 100vw;
    min-height: 100vh;
    min-height: 100dvh;
    scroll-snap-align: start;
    background: #0a0a08;
    color: #f7efde;
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

  .header,
  .grid,
  .cta-wrap {
    position: relative;
    z-index: 1;
  }

  .header {
    max-width: 1100px;
    margin: 0 auto 3.5rem;
    text-align: center;
  }

  .eyebrow {
    display: inline-block;
    text-transform: uppercase;
    letter-spacing: 0.32em;
    font-size: 0.78rem;
    color: var(--color-gold-primary, #d4af37);
    margin-bottom: 1rem;
    opacity: 0.85;
  }

  h2 {
    font-family: var(--font-title, 'Cormorant Garamond', Georgia, serif);
    font-size: clamp(2.4rem, 5vw, 3.6rem);
    font-weight: 500;
    margin: 0 0 1rem;
    color: #f4d77b;
    text-shadow: 0 0 20px rgba(244, 215, 123, 0.18);
    letter-spacing: 0.01em;
    line-height: 1.1;
  }

  .lede {
    max-width: 640px;
    margin: 0 auto;
    font-size: 1.05rem;
    line-height: 1.65;
    color: rgba(247, 239, 222, 0.82);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.75rem;
    max-width: 1100px;
    margin: 0 auto;
  }

  .card {
    position: relative;
    display: block;
    text-decoration: none;
    color: inherit;
    background: linear-gradient(
      180deg,
      rgba(28, 22, 10, 0.65) 0%,
      rgba(14, 12, 8, 0.85) 100%
    );
    border: 1px solid rgba(244, 215, 123, 0.16);
    border-radius: 10px;
    padding: 1.75rem 1.6rem 1.6rem;
    transition: transform 0.35s ease, border-color 0.35s ease,
      box-shadow 0.35s ease;
  }

  .card::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 10px;
    background: radial-gradient(
      circle at top left,
      rgba(244, 215, 123, 0.08),
      transparent 60%
    );
    opacity: 0;
    transition: opacity 0.35s ease;
    pointer-events: none;
  }

  .card:hover,
  .card:focus-visible {
    transform: translateY(-4px);
    border-color: rgba(244, 215, 123, 0.4);
    box-shadow: 0 14px 36px rgba(0, 0, 0, 0.45),
      0 0 0 1px rgba(244, 215, 123, 0.12);
    outline: none;
  }

  .card:hover::before,
  .card:focus-visible::before {
    opacity: 1;
  }

  .card h3 {
    font-family: var(--font-title, 'Cormorant Garamond', Georgia, serif);
    font-size: 1.65rem;
    font-weight: 600;
    margin: 0 0 0.75rem;
    color: #f4d77b;
    letter-spacing: 0.015em;
  }

  .card p {
    margin: 0 0 1.25rem;
    font-size: 0.97rem;
    line-height: 1.6;
    color: rgba(247, 239, 222, 0.78);
  }

  .examples {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .examples li {
    font-family: var(--font-title, 'Cormorant Garamond', Georgia, serif);
    font-style: italic;
    font-size: 0.98rem;
    line-height: 1.45;
    color: rgba(244, 215, 123, 0.78);
  }

  .examples li::before {
    content: '✦';
    display: inline-block;
    width: 1.1rem;
    margin-right: 0.25rem;
    color: rgba(244, 215, 123, 0.45);
    font-size: 0.7rem;
    transform: translateY(-2px);
  }

  .cta-wrap {
    max-width: 1100px;
    margin: 3rem auto 0;
    text-align: center;
  }

  .cta {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.85rem 1.6rem;
    font-family: var(--font-body, 'DM Sans', system-ui, sans-serif);
    font-size: 0.95rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    text-decoration: none;
    color: #f4d77b;
    background: rgba(244, 215, 123, 0.04);
    border: 1px solid rgba(244, 215, 123, 0.45);
    border-radius: 999px;
    transition: background 0.3s ease, border-color 0.3s ease,
      transform 0.3s ease, box-shadow 0.3s ease;
  }

  .cta:hover,
  .cta:focus-visible {
    background: rgba(244, 215, 123, 0.12);
    border-color: rgba(244, 215, 123, 0.85);
    transform: translateY(-2px);
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45),
      0 0 0 1px rgba(244, 215, 123, 0.18);
    outline: none;
  }

  .cta .arrow {
    transition: transform 0.3s ease;
  }

  .cta:hover .arrow,
  .cta:focus-visible .arrow {
    transform: translateX(4px);
  }

  @media (max-width: 640px) {
    :host {
      padding: 4rem 1rem 3.5rem;
    }
    .header {
      margin-bottom: 2.5rem;
    }
    .cta-wrap {
      margin-top: 2rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .card,
    .cta,
    .cta .arrow {
      transition: none;
    }
  }
`;
