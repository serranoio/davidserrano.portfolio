import { css } from 'lit';

export default css`
  :host {
    display: block;
    position: relative;
    width: 100vw;
    min-height: 100vh;
    /* Hardcoded — rspress's --color-bg is cream and would beat a var() fallback. */
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
  .grid {
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

  .card:hover {
    transform: translateY(-4px);
    border-color: rgba(244, 215, 123, 0.4);
    box-shadow: 0 14px 36px rgba(0, 0, 0, 0.45),
      0 0 0 1px rgba(244, 215, 123, 0.12);
  }

  .card:hover::before {
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

  .stack {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .chip {
    font-size: 0.74rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 0.3rem 0.65rem;
    border-radius: 999px;
    border: 1px solid rgba(244, 215, 123, 0.25);
    color: rgba(244, 215, 123, 0.85);
    background: rgba(244, 215, 123, 0.04);
  }

  @media (max-width: 640px) {
    :host {
      padding: 4rem 1rem 3.5rem;
    }
    .header {
      margin-bottom: 2.5rem;
    }
  }
`;
