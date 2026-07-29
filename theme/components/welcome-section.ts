import { LitElement, html, type PropertyValues } from 'lit';
import styles from './welcome-section.styles';
import { ShootingStarsCanvas } from './shooting-stars-canvas';

export class WelcomeSectionElement extends LitElement {
  static styles = [styles];

  private starsRenderer: ShootingStarsCanvas | null = null;
  private rafId: number | null = null;
  private targetProgress = 0;
  private currentProgress = 0;

  firstUpdated(_changed: PropertyValues) {
    super.firstUpdated(_changed);
    const canvas = this.renderRoot.querySelector(
      '.stars-canvas'
    ) as HTMLCanvasElement | null;
    if (canvas) {
      this.starsRenderer = new ShootingStarsCanvas(canvas);
      this.starsRenderer.start();
    }
    this.rafId = requestAnimationFrame(this.tick);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.starsRenderer?.dispose();
    this.starsRenderer = null;
  }

  // Poll the section's scroll position each frame instead of listening for
  // scroll events. Scroll events can coalesce or drop the first few pixels of
  // movement (especially on trackpads); rAF polling guarantees we see every
  // visible change. Paint normalizes to ~25% of the section height so the
  // headline finishes quickly.
  private tick = () => {
    const rect = this.getBoundingClientRect();
    const height = rect.height || window.innerHeight;
    const scrolled = Math.max(0, -rect.top);
    this.targetProgress = Math.min(1, scrolled / (height * 0.25));
    this.currentProgress += (this.targetProgress - this.currentProgress) * 0.32;
    this.style.setProperty('--paint-progress', this.currentProgress.toFixed(4));
    this.rafId = requestAnimationFrame(this.tick);
  };

  render() {
    return html`
      <canvas class="stars-canvas" data-testid="welcome-stars-canvas"></canvas>
      <div class="container">
        <div class="text-col">
          <div class="headline-wrap" data-testid="welcome-headline">
            <h1 class="headline-stroke" aria-hidden="true">Hey, I'm David</h1>
            <h1 class="headline">Hey, I'm David</h1>
            <svg
              class="paintbrush"
              viewBox="0 0 120 40"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <!-- Handle -->
              <rect x="52" y="16" width="56" height="8" rx="2" fill="#5a3f17" />
              <rect
                x="52"
                y="16"
                width="56"
                height="3"
                rx="1.5"
                fill="#7a5a2a"
              />
              <!-- Ferrule (gold band) -->
              <rect x="40" y="13" width="14" height="14" fill="#d4af37" />
              <rect x="40" y="13" width="14" height="3" fill="#f4d77b" />
              <!-- Bristles -->
              <path
                d="M40 13 L20 11 L6 17 L6 23 L20 29 L40 27 Z"
                fill="#fff7e0"
                stroke="#f4d77b"
                stroke-width="0.6"
              />
              <!-- Paint blob at tip -->
              <ellipse cx="5" cy="20" rx="4" ry="3" fill="#f4d77b" />
            </svg>
          </div>
          <p class="subline" data-testid="welcome-subline">Welcome</p>
          <p class="intro" data-testid="welcome-intro">
            I believe that every day of your life matters, where each day is
            another step in your life's dance. The good steps, the bad steps and
            everything in between are what make your life beautiful. Each hobby,
            career, activity, is a different act within your life's dance.
            Living this way makes you feel like you are a rose and each day is a
            petal where all petals contribute to make the rose of your life so
            beautiful. My goal is to show the world that your life is art.
          </p>
        </div>
        <div class="photo-col">
          <img
            class="photo"
            src="/img/david-hero.jpg"
            alt="David standing near the Golden Gate Bridge"
            data-testid="welcome-photo"
            loading="eager"
            decoding="async"
          />
        </div>
      </div>
      <div class="scroll-hint" aria-hidden="true">↓</div>
    `;
  }
}

customElements.define('welcome-section', WelcomeSectionElement);

declare global {
  interface HTMLElementTagNameMap {
    'welcome-section': WelcomeSectionElement;
  }
}
