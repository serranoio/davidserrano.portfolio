import { css } from 'lit';

export default css`
  :host {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background-color: var(--color-bg, #0a0a08);
    font-family: var(--font-title, 'Cormorant Garamond', Georgia, serif);
  }

  h1 {
    font-size: clamp(3rem, 10vw, 8rem);
    font-weight: 300;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--color-gold-primary, #d4af37);
    margin: 0;
    text-shadow: 0 0 40px rgba(212, 175, 55, 0.15);
  }
`;
