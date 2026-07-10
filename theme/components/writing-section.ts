import { LitElement, html, type PropertyValues } from 'lit';
import styles from './writing-section.styles';
import { ShootingStarsCanvas } from './shooting-stars-canvas';
import { TAG_ORDER, TAG_CARDS, postsByTag } from '../blog-posts';

const WRITING_THEMES = TAG_ORDER.map((tag) => ({
  tag,
  title: TAG_CARDS[tag].title,
  blurb: TAG_CARDS[tag].blurb,
  examples: postsByTag(tag).slice(0, 3).map((p) => p.title),
}));

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
        <span class="eyebrow">Writing</span>
        <h2>Poetry for the everyday human</h2>
        <p class="lede">
          An assortment of essays on self-development told in a poetic way —
          flow state, strategy, and the quiet craft of becoming.
        </p>
      </header>
      <div
        class="grid"
        data-testid="writing-grid"
        role="list"
      >
        ${WRITING_THEMES.map(
          (theme) => html`
            <a
              class="card"
              href=${BLOG_LINK}
              data-testid="writing-theme-card"
              role="listitem"
            >
              <h3>${theme.title}</h3>
              <p>${theme.blurb}</p>
              <ul class="examples">
                ${theme.examples.map(
                  (title) => html`<li>${title}</li>`
                )}
              </ul>
            </a>
          `
        )}
      </div>
      <div class="cta-wrap">
        <a
          class="cta"
          href=${BLOG_LINK}
          data-testid="writing-cta"
        >
          Read the blog <span class="arrow" aria-hidden="true">→</span>
        </a>
      </div>
    `;
  }
}

customElements.define('writing-section', WritingSectionElement);

declare global {
  interface HTMLElementTagNameMap {
    'writing-section': WritingSectionElement;
  }
}
