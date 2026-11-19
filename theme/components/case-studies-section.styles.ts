import { css } from 'lit';

export default css`
  :host {
    display: block;
    position: relative;
    width: 100vw;
    min-height: 100vh;
    /* Hardcoded — rspress's --color-bg is cream and would beat a var() fallback. */
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
    color: var(--color-gold-primary);
    margin-bottom: 1rem;
    opacity: 0.85;
  }

  h2 {
    font-family: var(--font-title, 'Cormorant Garamond', Georgia, serif);
    font-size: clamp(2.4rem, 5vw, 3.6rem);
    font-weight: 500;
    margin: 0 0 1rem;
    color: var(--color-gold-light);
    text-shadow: 0 0 20px color-mix(in srgb, var(--color-gold-light) 18%, transparent);
    letter-spacing: 0.01em;
    line-height: 1.1;
  }

  .lede {
    max-width: 640px;
    margin: 0 auto;
    font-size: 1.05rem;
    line-height: 1.65;
    color: color-mix(in srgb, var(--color-text) 82%, transparent);
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
      color-mix(in srgb, var(--color-bg-muted) 65%, transparent) 0%,
      color-mix(in srgb, var(--color-bg) 85%, transparent) 100%
    );
    border: 1px solid color-mix(in srgb, var(--color-gold-light) 16%, transparent);
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
      color-mix(in srgb, var(--color-gold-light) 8%, transparent),
      transparent 60%
    );
    opacity: 0;
    transition: opacity 0.35s ease;
    pointer-events: none;
  }

  .card:hover {
    transform: translateY(-4px);
    border-color: color-mix(in srgb, var(--color-gold-light) 40%, transparent);
    box-shadow: 0 14px 36px rgba(0, 0, 0, 0.45),
      0 0 0 1px color-mix(in srgb, var(--color-gold-light) 12%, transparent);
  }

  .card:hover::before {
    opacity: 1;
  }

  .card h3 {
    font-family: var(--font-title, 'Cormorant Garamond', Georgia, serif);
    font-size: 1.65rem;
    font-weight: 600;
    margin: 0 0 0.75rem;
    color: var(--color-gold-light);
    letter-spacing: 0.015em;
  }

  .card p {
    margin: 0 0 1.25rem;
    font-size: 0.97rem;
    line-height: 1.6;
    color: color-mix(in srgb, var(--color-text) 78%, transparent);
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
    border: 1px solid color-mix(in srgb, var(--color-gold-light) 25%, transparent);
    color: color-mix(in srgb, var(--color-gold-light) 85%, transparent);
    background: color-mix(in srgb, var(--color-gold-light) 4%, transparent);
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
