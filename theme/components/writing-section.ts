import { LitElement, html, type PropertyValues } from 'lit';
import styles from './writing-section.styles';
import { ShootingStarsCanvas } from './shooting-stars-canvas';
const BLOG_LINK = '/blog/intro';

export class WritingSectionElement extends LitElement {
  static styles = [styles];

  private starsRenderer: ShootingStarsCanvas | null = null;

  firstUpdated(_changed: PropertyValues) {
    super.firstUpdated(_changed);
    const canvas = this.renderRoot.querySelector('.stars-canvas') as HTMLCanvasElement | null;
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
      <canvas class="stars-canvas" data-testid="writing-stars-canvas"></canvas>
      <header class="header">
        <a
          class="writing-link"
          href=${BLOG_LINK}
          data-testid="writing-cta"
        >
          I write too.
        </a>
      </header>
    `;
  }
}

customElements.define('writing-section', WritingSectionElement);

declare global {
  interface HTMLElementTagNameMap {
    'writing-section': WritingSectionElement;
  }
}
