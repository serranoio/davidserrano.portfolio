import { css } from 'lit';

// The round 48px button that floats over the page's corners: the music
// player bottom-right, the poem list bottom-left.
export const FLOATING_BUTTON_SIZE = css`48px`;

export default css`
  .floating-button {
    width: ${FLOATING_BUTTON_SIZE};
    height: ${FLOATING_BUTTON_SIZE};
    border-radius: 50%;
    border: 1px solid var(--color-primary-muted);
    background: var(--color-bg);
    color: var(--color-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
    -webkit-tap-highlight-color: transparent;
    transition: background 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
  }

  .floating-button:hover {
    background: var(--color-primary-tint);
    border-color: var(--color-primary);
  }

  .floating-button:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  .floating-button:active {
    transform: scale(0.95);
  }

  @media (prefers-reduced-motion: reduce) {
    .floating-button {
      transition: none;
    }
  }
`;
