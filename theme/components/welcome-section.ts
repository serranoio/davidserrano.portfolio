import { LitElement, html, type PropertyValues } from 'lit';
import { query } from 'lit/decorators.js';
import styles from './welcome-section.styles';
import { ShootingStarsCanvas } from './shooting-stars-canvas';
import { EmberHaloCanvas } from './ember-halo-canvas';

export class WelcomeSectionElement extends LitElement {
  static styles = [styles];

  @query('.stars-canvas') private accessor _starsCanvas: HTMLCanvasElement | null = null;
  @query('.ember-canvas') private accessor _emberCanvas: HTMLCanvasElement | null = null;
  @query('.ember-glow') private accessor _emberGlow: HTMLElement | null = null;

  private starsRenderer: ShootingStarsCanvas | null = null;
  private emberRenderer: EmberHaloCanvas | null = null;

  firstUpdated(_changed: PropertyValues) {
    super.firstUpdated(_changed);
    // Both renderers hold still on their own when motion is reduced.
    if (this._starsCanvas) {
      this.starsRenderer = new ShootingStarsCanvas(this._starsCanvas);
      this.starsRenderer.start();
    }
    if (this._emberCanvas && this._emberGlow) {
      this.emberRenderer = new EmberHaloCanvas(this._emberCanvas, this._emberGlow);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.starsRenderer?.dispose();
    this.starsRenderer = null;
    this.emberRenderer?.dispose();
    this.emberRenderer = null;
  }

  render() {
    return html`
      <canvas class="stars-canvas" data-testid="welcome-stars-canvas" aria-hidden="true"></canvas>
      <div class="container">
        <div class="text-col">
          <p class="subline" data-testid="welcome-subline">
            Take a deep breath in, inhale<br />
            exhale, let go.
          </p>
          <p class="intro">
            You're alive, it's beautiful and it is enough to be content.
          </p>
          <p class="intro">Turn on the music and enjoy the experience with me.</p>
        </div>
        <figure class="photo-col">
          <div class="ember-glow" aria-hidden="true"></div>
          <div class="portrait">
            <img
              class="photo"
              src="/img/david-hero.jpg"
              alt="David standing near the Golden Gate Bridge"
              data-testid="welcome-photo"
              loading="eager"
              decoding="async"
            />
          </div>
          <canvas class="ember-canvas" data-testid="welcome-ember-canvas" aria-hidden="true"></canvas>
        </figure>
      </div>
      <footer class="outro">
        <a class="poetry-cue" href="#rose" data-testid="welcome-poetry-cue">
          <span>Read my coding poetry</span>
          <svg class="poetry-arrow" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 4v15M5.5 12.5 12 19l6.5-6.5" />
          </svg>
        </a>
        <p class="signoff">I'm David and I welcome you to my headspace.</p>
      </footer>
    `;
  }
}

customElements.define('welcome-section', WelcomeSectionElement);

declare global {
  interface HTMLElementTagNameMap {
    'welcome-section': WelcomeSectionElement;
  }
}
