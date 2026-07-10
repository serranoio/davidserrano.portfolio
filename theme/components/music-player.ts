import { LitElement, html } from 'lit';
import styles from './music-player.styles';

const VIDEO_ID = 'thoR1IWLiqc';
const INITIAL_VOLUME = 50;
const BOUNCE_TIMEOUT_MS = 10_000;
const ACK_STORAGE_KEY = 'musicAcknowledged';

// Singleton loader for the YouTube IFrame API. The API script registers a
// global `onYouTubeIframeAPIReady` callback exactly once — wrap it in a
// promise so multiple potential consumers all await the same load.
let ytApiPromise: Promise<unknown> | null = null;
function loadYouTubeAPI(): Promise<unknown> {
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const w = window as unknown as {
      YT?: { Player: unknown };
      onYouTubeIframeAPIReady?: () => void;
    };
    if (w.YT && w.YT.Player) {
      resolve(w.YT);
      return;
    }
    const previous = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(w.YT);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    document.head.appendChild(script);
  });
  return ytApiPromise;
}

export class MusicPlayerElement extends LitElement {
  static styles = [styles];

  static properties = {
    playing: { type: Boolean, state: true },
    bouncing: { type: Boolean, state: true },
  };

  private _playing = false;
  private _bouncing = false;

  // YouTube player instance. Typed `any` because the API ships an untyped
  // global; adding @types/youtube as a dep for two method calls is overkill.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private player: any = null;
  private playerHost: HTMLDivElement | null = null;
  private bounceTimer: number | null = null;

  get playing() {
    return this._playing;
  }
  set playing(v: boolean) {
    const old = this._playing;
    this._playing = v;
    this.requestUpdate('playing', old);
  }

  get bouncing() {
    return this._bouncing;
  }
  set bouncing(v: boolean) {
    const old = this._bouncing;
    this._bouncing = v;
    this.requestUpdate('bouncing', old);
  }

  connectedCallback() {
    super.connectedCallback();

    let acknowledged = false;
    try {
      acknowledged = localStorage.getItem(ACK_STORAGE_KEY) === 'true';
    } catch {
      // Private mode or storage disabled — assume not acknowledged, no persist
    }

    if (!acknowledged) {
      this.bouncing = true;
      this.bounceTimer = window.setTimeout(() => {
        this.bouncing = false;
      }, BOUNCE_TIMEOUT_MS);
    }

    void this.initPlayer();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.bounceTimer !== null) {
      clearTimeout(this.bounceTimer);
      this.bounceTimer = null;
    }
    this.player?.destroy?.();
    this.player = null;
    this.playerHost?.remove();
    this.playerHost = null;
  }

  private async initPlayer() {
    // YouTube IFrame API requires a target element with an id in the light
    // DOM. Park a 1×1 host off-screen on body; the API replaces it with the
    // actual iframe. `display: none` can pause playback on some browsers, so
    // hide via opacity + off-screen positioning instead.
    this.playerHost = document.createElement('div');
    this.playerHost.id = `yt-player-host-${Math.random().toString(36).slice(2)}`;
    this.playerHost.style.cssText = [
      'position: fixed',
      'left: -9999px',
      'top: -9999px',
      'width: 1px',
      'height: 1px',
      'opacity: 0',
      'pointer-events: none',
    ].join(';');
    document.body.appendChild(this.playerHost);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const YT = (await loadYouTubeAPI()) as any;
    this.player = new YT.Player(this.playerHost.id, {
      videoId: VIDEO_ID,
      playerVars: {
        autoplay: 0,
        controls: 0,
        modestbranding: 1,
        rel: 0,
        // loop=1 only works when paired with playlist=<same id> — YouTube quirk
        loop: 1,
        playlist: VIDEO_ID,
      },
      events: {
        onReady: () => {
          // setVolume is a no-op on iOS (volume is OS-only there). Harmless
          // on platforms that honor it.
          this.player?.setVolume?.(INITIAL_VOLUME);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onStateChange: (event: any) => {
          // 1 = PLAYING, 2 = PAUSED, 0 = ENDED (loop should re-trigger, but
          // defensively treat ENDED as not-playing for the UI)
          if (event.data === 1) this.playing = true;
          else if (event.data === 2 || event.data === 0) this.playing = false;
        },
      },
    });
  }

  private handleClick = () => {
    this.acknowledge();
    if (!this.player) return;
    if (this.playing) {
      this.player.pauseVideo();
    } else {
      this.player.playVideo();
    }
  };

  private acknowledge() {
    if (this.bouncing) {
      this.bouncing = false;
      if (this.bounceTimer !== null) {
        clearTimeout(this.bounceTimer);
        this.bounceTimer = null;
      }
    }
    try {
      localStorage.setItem(ACK_STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
  }

  render() {
    const label = this.playing
      ? 'Pause background music'
      : 'Play background music';
    return html`
      <button
        class="player-button ${this.bouncing ? 'bouncing' : ''}"
        @click=${this.handleClick}
        aria-label=${label}
        data-testid="music-player-button"
        data-state=${this.playing ? 'playing' : 'paused'}
      >
        ${this.playing ? this.renderPauseIcon() : this.renderMusicIcon()}
      </button>
    `;
  }

  private renderMusicIcon() {
    return html`
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
        <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
      </svg>
    `;
  }

  private renderPauseIcon() {
    return html`
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
        <rect x="6" y="5" width="4" height="14" rx="1" />
        <rect x="14" y="5" width="4" height="14" rx="1" />
      </svg>
    `;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('music-player')) {
  customElements.define('music-player', MusicPlayerElement);
}

declare global {
  interface HTMLElementTagNameMap {
    'music-player': MusicPlayerElement;
  }
}
