import { LitElement, html, type PropertyValues } from 'lit';
import styles from './welcome-section.styles';
import { ShootingStarsCanvas } from './shooting-stars-canvas';

export class WelcomeSectionElement extends LitElement {
  static styles = [styles];

  private starsRenderer: ShootingStarsCanvas | null = null;

  firstUpdated(_changed: PropertyValues) {
    super.firstUpdated(_changed);
    const canvas = this.renderRoot.querySelector<HTMLCanvasElement>('.stars-canvas');
    // The renderer holds the sky still on its own when motion is reduced.
    if (canvas) {
      this.starsRenderer = new ShootingStarsCanvas(canvas);
      this.starsRenderer.start();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.starsRenderer?.dispose();
    this.starsRenderer = null;
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
          <p class="intro">Turn on the music and enjoy the journey with me.</p>
          <p class="signoff">I'm David. I welcome you to my headspace.</p>
        </div>
        <figure class="photo-col">
          <img
            class="photo"
            src="/img/david-hero.jpg"
            alt="David standing near the Golden Gate Bridge"
            data-testid="welcome-photo"
            loading="eager"
            decoding="async"
          />
        </figure>
      </div>
    `;
  }
}

customElements.define('welcome-section', WelcomeSectionElement);

declare global {
  interface HTMLElementTagNameMap {
    'welcome-section': WelcomeSectionElement;
  }
}
