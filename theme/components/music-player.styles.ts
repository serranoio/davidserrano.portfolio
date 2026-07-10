import { css } from 'lit';

export default css`
  :host {
    position: fixed;
    bottom: calc(1rem + env(safe-area-inset-bottom));
    right: calc(1rem + env(safe-area-inset-right));
    z-index: 50;
  }

  .player-button {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: 1px solid var(--color-gold-muted, rgba(212, 175, 55, 0.4));
    background: var(--color-bg, #0a0a08);
    color: var(--color-gold-primary, #d4af37);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
    -webkit-tap-highlight-color: transparent;
    transition: background 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
  }

  .player-button:hover {
    background: rgba(212, 175, 55, 0.12);
    border-color: var(--color-gold-primary, #d4af37);
  }

  .player-button:focus-visible {
    outline: 2px solid var(--color-gold-primary, #d4af37);
    outline-offset: 2px;
  }

  .player-button:active {
    transform: scale(0.95);
  }

  .player-button.bouncing {
    animation: music-bounce 800ms ease-in-out infinite;
  }

  @keyframes music-bounce {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-6px); }
  }

  @media (prefers-reduced-motion: reduce) {
    .player-button.bouncing {
      animation: none;
    }
  }
`;
