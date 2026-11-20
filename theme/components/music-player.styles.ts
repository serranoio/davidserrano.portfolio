import { css } from 'lit';

export default css`
  :host {
    position: fixed;
    bottom: calc(1rem + env(safe-area-inset-bottom));
    right: calc(1rem + env(safe-area-inset-right));
    z-index: 50;
  }

  .player-mount {
    position: fixed;
    left: -9999px;
    top: -9999px;
    width: 200px;
    height: 200px;
    opacity: 0;
    pointer-events: none;
  }

  .player-message {
    position: absolute;
    right: 0;
    bottom: 100%;
    box-sizing: border-box;
    width: min(17rem, calc(100vw - 2rem));
    margin: 0 0 0.75rem;
    padding: 0.75rem 1rem;
    border: 1px solid var(--color-primary-muted);
    border-radius: 8px;
    background: var(--color-bg);
    color: var(--color-text);
    font: 0.875rem/1.5 var(--font-body, system-ui, sans-serif);
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
