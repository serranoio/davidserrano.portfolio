import { LitElement, html, type PropertyValues } from 'lit';
import styles from './welcome-section.styles';
import { ShootingStarsCanvas } from './shooting-stars-canvas';

export class WelcomeSectionElement extends LitElement {
  static styles = [styles];

  private starsRenderer: ShootingStarsCanvas | null = null;

  firstUpdated(_changed: PropertyValues) {
    super.firstUpdated(_changed);
    const canvas = this.renderRoot.querySelector<HTMLCanvasElement>('.stars-canvas');
    if (canvas && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.starsRenderer = new ShootingStarsCanvas(canvas);
      this.starsRenderer.start();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.starsRenderer?.dispose();
    this.starsRenderer = null;
  }

  private enterRose(event: Event) {
    const rose = document.getElementById('rose');
    if (!rose) return;
    event.preventDefault();
    rose.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'start',
    });
    // Move keyboard navigation into the destination as well as the viewport.
    rose.setAttribute('tabindex', '-1');
    rose.focus({ preventScroll: true });
  }

  render() {
    return html`
      <canvas class="stars-canvas" data-testid="welcome-stars-canvas" aria-hidden="true"></canvas>
      <div class="container">
        <div class="text-col">
          <p class="greeting">Hey, I'm David.</p>
          <div class="headline-wrap" data-testid="welcome-headline">
            <h1 class="headline">Your life<br />is <em>art.</em></h1>
          </div>
          <p class="subline" data-testid="welcome-subline">
            Where every step is another brushstroke you paint.
            Your heart is an endless paintbucket. It has the potential to radiate colors in every facet of your life.
          </p>
          <p class="intro">
            I'm here to help you discover this source of life, or rather,
            return to this oasis that already exists inside of you.
          </p>
          <nav class="destinations" aria-label="Explore my work">
            <a class="destination-link" href="/engineering.html">
              Explore my engineering <span aria-hidden="true">↗</span>
            </a>
            <a class="destination-link" href="/writing.html">
              Read my writing <span aria-hidden="true">↗</span>
            </a>
          </nav>
          <div class="invitation">
            <a class="explore-link" href="#rose" @click=${this.enterRose}>
              Discover the beauty in engineering <span aria-hidden="true">↓</span>
            </a>
            <p class="journey-note">It starts with the day I saw code become art.</p>
          </div>
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
          <figcaption>David Serrano · San Francisco</figcaption>
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
