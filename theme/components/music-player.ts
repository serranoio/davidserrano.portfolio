import { LitElement, html } from 'lit';
import styles from './music-player.styles';

const VIDEO_ID = 'thoR1IWLiqc';
const INITIAL_VOLUME = 50;
const BOUNCE_TIMEOUT_MS = 10_000;
const LOAD_TIMEOUT_MS = 10_000;
const ACK_STORAGE_KEY = 'musicAcknowledged';

type PlaybackState = 'paused' | 'loading' | 'playing' | 'error';
interface YouTubePlayer {
  playVideo(): void;
  pauseVideo(): void;
  setVolume(volume: number): void;
  unMute(): void;
  destroy(): void;
}
interface PlayerEvent {
  target: YouTubePlayer;
  data?: number;
}
interface YouTubeAPI {
  Player: new (host: HTMLElement, options: {
    width: number;
    height: number;
    videoId: string;
    playerVars: Record<string, string | number>;
    events: {
      onReady(event: PlayerEvent): void;
      onStateChange(event: PlayerEvent): void;
      onError(event: PlayerEvent): void;
      onAutoplayBlocked(event: PlayerEvent): void;
    };
  }) => YouTubePlayer;
}
type YouTubeWindow = Window & { YT?: YouTubeAPI; onYouTubeIframeAPIReady?: () => void };

let ytApiPromise: Promise<YouTubeAPI> | null = null;
function loadYouTubeAPI(): Promise<YouTubeAPI> {
  const win = window as YouTubeWindow;
  if (win.YT?.Player) return Promise.resolve(win.YT);
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise<YouTubeAPI>((resolve, reject) => {
    const previous = win.onYouTubeIframeAPIReady;
    const script = document.createElement('script');
    const cleanup = () => {
      clearTimeout(timeout);
      script.onerror = null;
      if (win.onYouTubeIframeAPIReady === onReady) win.onYouTubeIframeAPIReady = previous;
    };
    const fail = () => {
      cleanup();
      script.remove();
      reject(new Error('YouTube could not load'));
    };
    const onReady = () => {
      cleanup();
      if (win.YT?.Player) resolve(win.YT);
      else reject(new Error('YouTube player API is unavailable'));
      previous?.();
    };
    const timeout = window.setTimeout(fail, LOAD_TIMEOUT_MS);
    win.onYouTubeIframeAPIReady = onReady;
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = fail;
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    // A failed request must not poison every subsequent retry.
    ytApiPromise = null;
    throw error;
  });
  return ytApiPromise;
}

export class MusicPlayerElement extends LitElement {
  static styles = [styles];
  static properties = {
    playbackState: { type: String, state: true },
    message: { type: String, state: true },
    bouncing: { type: Boolean, state: true },
  };

  private _playbackState: PlaybackState = 'paused';
  private _message = '';
  private _bouncing = false;
  private player: YouTubePlayer | null = null;
  private ready = false;
  private initializing = false;
  private playRequested = false;
  private hasInteracted = false;
  private generation = 0;
  private bounceTimer: number | null = null;
  private playbackTimer: number | null = null;

  get playbackState() { return this._playbackState; }
  set playbackState(value: PlaybackState) {
    const old = this._playbackState;
    this._playbackState = value;
    this.requestUpdate('playbackState', old);
  }
  get message() { return this._message; }
  set message(value: string) {
    const old = this._message;
    this._message = value;
    this.requestUpdate('message', old);
  }
  get bouncing() { return this._bouncing; }
  set bouncing(value: boolean) {
    const old = this._bouncing;
    this._bouncing = value;
    this.requestUpdate('bouncing', old);
  }

  connectedCallback() {
    super.connectedCallback();
    let acknowledged = false;
    try { acknowledged = localStorage.getItem(ACK_STORAGE_KEY) === 'true'; } catch { /* Storage may be disabled. */ }
    if (!acknowledged) {
      this.bouncing = true;
      this.bounceTimer = window.setTimeout(() => { this.bouncing = false; }, BOUNCE_TIMEOUT_MS);
    }
    void this.initPlayer();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.bounceTimer !== null) clearTimeout(this.bounceTimer);
    this.bounceTimer = null;
    this.resetPlayer();
    this.playRequested = false;
    this.playbackState = 'paused';
    this.message = '';
  }

  private clearPlaybackTimer() {
    if (this.playbackTimer !== null) clearTimeout(this.playbackTimer);
    this.playbackTimer = null;
  }

  private resetPlayer() {
    this.generation++;
    this.clearPlaybackTimer();
    this.player?.destroy();
    this.player = null;
    this.ready = false;
    this.initializing = false;
    this.renderRoot.querySelector('.player-mount')?.replaceChildren();
  }

  private showError(message: string, reset = false) {
    if (reset) this.resetPlayer();
    else this.clearPlaybackTimer();
    this.playRequested = false;
    this.playbackState = 'error';
    this.message = message;
  }

  private async initPlayer() {
    if (this.initializing || this.ready || !this.isConnected) return;
    this.initializing = true;
    const generation = ++this.generation;
    const current = () => this.isConnected && generation === this.generation;
    try {
      const YT = await loadYouTubeAPI();
      await this.updateComplete;
      if (!current()) return;
      const mount = this.renderRoot.querySelector('.player-mount')!;
      const host = document.createElement('div');
      mount.replaceChildren(host);
      this.playbackTimer = window.setTimeout(() => {
        if (current()) this.showError('Music could not load. Click to retry.', true);
      }, LOAD_TIMEOUT_MS);
      // Passing the element itself keeps the third-party iframe in Shadow DOM.
      this.player = new YT.Player(host, {
        width: 200,
        height: 200,
        videoId: VIDEO_ID,
        playerVars: {
          autoplay: 0, controls: 0, rel: 0, playsinline: 1,
          loop: 1, playlist: VIDEO_ID, origin: window.location.origin,
        },
        events: {
          onReady: (event) => {
            if (!current()) return;
            this.player = event.target;
            this.ready = true;
            this.initializing = false;
            this.clearPlaybackTimer();
            event.target.setVolume(INITIAL_VOLUME);
            if (this.playRequested) this.play();
          },
          onStateChange: (event) => {
            if (!current()) return;
            if (event.data === 1) {
              this.clearPlaybackTimer();
              this.playRequested = true;
              this.playbackState = 'playing';
              this.message = '';
            } else if (event.data === 2 || event.data === 0) {
              this.clearPlaybackTimer();
              this.playRequested = false;
              this.playbackState = 'paused';
              this.message = '';
            }
          },
          onError: () => {
            if (current()) this.showError('This music could not play. Click to retry.', true);
          },
          onAutoplayBlocked: () => {
            if (current()) this.showError('Playback was blocked. Click to try again.');
          },
        },
      });
    } catch {
      if (current()) this.showError('Music could not load. YouTube may be blocked. Click to retry.', true);
    }
  }

  private play() {
    if (!this.ready || !this.player) return;
    this.clearPlaybackTimer();
    this.playbackTimer = window.setTimeout(() => {
      this.showError('Music did not start. Click to try again.');
    }, LOAD_TIMEOUT_MS);
    try {
      this.player.unMute();
      this.player.playVideo();
    } catch {
      this.showError('Music could not start. Click to retry.', true);
    }
  }

  private handleClick = () => {
    this.hasInteracted = true;
    this.acknowledge();
    this.message = '';
    if (this.playRequested || this.playbackState === 'playing') {
      this.playRequested = false;
      if (this.ready) {
        this.clearPlaybackTimer();
        this.player?.pauseVideo();
      }
      this.playbackState = 'paused';
      return;
    }
    this.playRequested = true;
    this.playbackState = 'loading';
    this.message = 'Loading music…';
    if (this.ready) this.play();
    else void this.initPlayer();
  };

  private acknowledge() {
    this.bouncing = false;
    if (this.bounceTimer !== null) clearTimeout(this.bounceTimer);
    this.bounceTimer = null;
    try { localStorage.setItem(ACK_STORAGE_KEY, 'true'); } catch { /* Storage may be disabled. */ }
  }

  render() {
    const labels: Record<PlaybackState, string> = {
      paused: 'Play background music',
      loading: 'Cancel loading background music',
      playing: 'Pause background music',
      error: 'Retry background music',
    };
    return html`
      <div class="player-mount" aria-hidden="true" inert></div>
      <p class="player-message" role="status" ?hidden=${!this.message || !this.hasInteracted}>${this.message}</p>
      <button
        class="player-button ${this.bouncing ? 'bouncing' : ''}"
        @click=${this.handleClick}
        aria-label=${labels[this.playbackState]}
        aria-busy=${this.playbackState === 'loading'}
        data-testid="music-player-button"
        data-state=${this.playbackState}
      >
        ${this.playbackState === 'playing' ? this.renderPauseIcon() : this.renderMusicIcon()}
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
