import { css } from 'lit';

export default css`
  :host {
    display: block;
    position: relative;
    width: 100%;
    min-height: 100svh;
    background: #0a0a08;
    color: #faf3df;
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

  .greeting {
    margin: 0 0 1.5rem;
    font-size: 1rem;
    color: #d9cba9;
  }

  .headline {
    font-family: var(--font-title, 'Cormorant Garamond', Georgia, serif);
    font-weight: 400;
    font-size: clamp(4.5rem, 8.4vw, 7.5rem);
    line-height: 0.92;
    letter-spacing: -0.035em;
    margin: 0;
  }

  .headline em {
    color: #e6c886;
    font-weight: 400;
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
    color: #c8c0ae;
    font-size: 1rem;
    line-height: 1.75;
  }

  .invitation {
    margin-top: 1.5rem;
  }

  .destinations {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 1.75rem;
    margin-top: 1.5rem;
  }

  .destination-link {
    display: inline-flex;
    gap: 0.75rem;
    align-items: center;
    min-height: 44px;
    color: #faf3df;
    text-decoration: underline;
    text-underline-offset: 0.4em;
    text-decoration-color: #a48a54;
    font-size: 0.95rem;
  }

  .destination-link:hover {
    color: #e6c886;
  }

  .destination-link:focus-visible {
    outline: 2px solid #e6c886;
    outline-offset: 4px;
  }

  .explore-link {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    min-height: 48px;
    box-sizing: border-box;
    border-bottom: 1px solid #a48a54;
    color: #e6c886;
    text-decoration: none;
    font-size: 0.9rem;
    transition: color 180ms ease;
  }

  .explore-link span {
    transition: transform 180ms ease;
  }

  .explore-link:hover {
    color: #faf3df;
  }

  .explore-link:hover span {
    transform: translateY(3px);
  }

  .explore-link:focus-visible {
    outline: 2px solid #e6c886;
    outline-offset: 6px;
  }

  .explore-link:active {
    color: #d9cba9;
  }

  .journey-note {
    margin: 0.75rem 0 0;
    color: #b9af98;
    font-size: 0.875rem;
    line-height: 1.5;
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

  figcaption {
    margin-top: 1rem;
    color: #b9af98;
    font-size: 0.875rem;
    line-height: 1.5;
  }

  @media (max-width: 768px) {
    .container {
      grid-template-columns: 1fr;
      gap: 2.5rem;
      width: min(32rem, 86%);
      padding: 3rem 0;
    }

    .headline {
      font-size: clamp(4.5rem, 17vw, 6.5rem);
    }

    .greeting {
      margin-bottom: 1.25rem;
    }

    .destinations {
      column-gap: 1rem;
    }

    .photo-col {
      width: 72%;
      justify-self: end;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .explore-link,
    .explore-link span {
      transition: none;
    }
  }
`;
