import { css } from 'lit';
import { FLOATING_BUTTON_SIZE } from './floating-button.styles';

// Mirrors the music player's corner inset on the other side of the screen.
const inset = css`1rem`;

export default css`
  /* A layer over the whole scene that lets clicks fall through to the rose
     everywhere except its own button and panel. Rendered inside the sticky
     scene viewport, so it stays on screen only while the rose does. */
  :host {
    position: absolute;
    inset: 0;
    z-index: 20;
    pointer-events: none;
  }

  .toggle {
    position: absolute;
    left: calc(${inset} + env(safe-area-inset-left));
    bottom: calc(${inset} + env(safe-area-inset-bottom));
    /* Above the panel, so the same button that opened it can close it. */
    z-index: 1;
    pointer-events: auto;
  }

  .toggle[aria-expanded='true'] {
    background: var(--color-primary-tint);
    border-color: var(--color-primary);
  }

  .panel {
    box-sizing: border-box;
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: min(20rem, calc(100vw - 3rem));
    display: flex;
    flex-direction: column;
    /* Clear Rspress's fixed nav above and the toggle button below. */
    padding: calc(var(--rp-nav-height, 64px) + 1rem) 1.25rem
      calc(${inset} * 2 + ${FLOATING_BUTTON_SIZE} + env(safe-area-inset-bottom));
    padding-left: calc(1.25rem + env(safe-area-inset-left));
    background: color-mix(in srgb, var(--color-bg) 94%, transparent);
    border-right: 1px solid var(--rp-c-divider);
    box-shadow: 8px 0 32px rgba(0, 0, 0, 0.35);
    color: var(--rose-ink);
    font-family: var(--font-body, 'DM Sans', system-ui, sans-serif);
    pointer-events: auto;
    transform: translateX(-100%);
    visibility: hidden;
    transition: transform 0.35s ease, visibility 0s linear 0.35s;
  }

  .panel.open {
    transform: translateX(0);
    visibility: visible;
    transition: transform 0.35s ease, visibility 0s;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
  }

  .panel-heading {
    margin: 0;
    font-family: var(--font-title, 'Cormorant Garamond', Georgia, serif);
    font-weight: 300;
    font-size: 1.6rem;
    letter-spacing: 0.06em;
    color: var(--rose-ink);
  }

  .close {
    width: 2.75rem;
    height: 2.75rem;
    margin-right: -0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: var(--rose-ink-quiet);
    font-family: var(--font-title, 'Cormorant Garamond', Georgia, serif);
    font-size: 2rem;
    font-weight: 300;
    line-height: 1;
    cursor: pointer;
    transition: color 0.12s ease;
  }

  .poems {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior-y: contain;
    margin: 0 -0.5rem;
    padding: 0;
    list-style: none;
  }

  .poem {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    width: 100%;
    min-height: 2.75rem;
    padding: 0.4rem 0.5rem 0.4rem 1rem;
    border: none;
    border-left: 2px solid transparent;
    background: transparent;
    color: var(--rose-ink-quiet);
    font-family: var(--font-title, 'Cormorant Garamond', Georgia, serif);
    font-size: 1.2rem;
    line-height: 1.3;
    text-align: left;
    cursor: pointer;
    transition: color 0.12s ease, border-color 0.12s ease;
  }

  .poem:hover,
  .poem.hovered,
  .close:hover,
  .step:hover:not(:disabled) {
    color: var(--rose-ink);
  }

  /* The petal under the pointer carries this poem. */
  .poem.hovered {
    border-left-color: var(--rose-gold);
  }

  /* Already read: it steps back, marked done; still there to reread. */
  .poem.read .poem-title {
    opacity: 0.5;
  }

  .read-mark {
    flex: none;
    font-family: var(--font-body, system-ui, sans-serif);
    font-size: 0.85rem;
    color: var(--rose-gold);
  }

  .poem[aria-current='true'] {
    color: var(--color-primary);
    border-left-color: var(--color-primary);
  }

  .poem:focus-visible,
  .close:focus-visible,
  .step:focus-visible {
    outline: 1px solid var(--color-primary);
    outline-offset: -1px;
  }

  .steps {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    margin-top: 1rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--rp-c-divider);
  }

  .step {
    min-height: 2.75rem;
    padding: 0 0.5rem;
    border: none;
    background: transparent;
    color: var(--rose-ink-quiet);
    font: inherit;
    font-size: 0.9rem;
    letter-spacing: 0.04em;
    cursor: pointer;
    transition: color 0.12s ease, opacity 0.12s ease;
  }

  .step:disabled {
    opacity: 0.35;
    cursor: default;
  }

  @media (prefers-reduced-motion: reduce) {
    .panel,
    .panel.open,
    .poem,
    .close,
    .step {
      transition: none;
    }
  }
`;
