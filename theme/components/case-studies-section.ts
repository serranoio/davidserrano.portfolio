import { LitElement, html, type PropertyValues } from 'lit';
import styles from './case-studies-section.styles';
import { ShootingStarsCanvas } from './shooting-stars-canvas';

// Edit this array to change the cards rendered in the section. Each entry
// is one card. `stack` is rendered as a row of tag chips.
const CASE_STUDIES: ReadonlyArray<{
  title: string;
  blurb: string;
  stack: ReadonlyArray<string>;
}> = [
  {
    title: 'Project Alpha',
    blurb:
      'A revolutionary approach to data visualization that changed how teams understand their metrics.',
    stack: ['React', 'D3.js', 'WebGL'],
  },
  {
    title: 'Project Beta',
    blurb:
      'An AI-powered design tool that helps creators bring their visions to life.',
    stack: ['TypeScript', 'TensorFlow.js', 'Canvas API'],
  },
  {
    title: 'Project Gamma',
    blurb:
      'A real-time collaboration platform built for the modern distributed team.',
    stack: ['WebRTC', 'Node.js', 'Redis'],
  },
];

export class CaseStudiesSectionElement extends LitElement {
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
      <canvas class="stars-canvas" data-testid="case-studies-stars-canvas"></canvas>
      <header class="header">
        <span class="eyebrow">Case Studies</span>
        <h2>Work I'm proud of</h2>
        <p class="lede">
          A handful of projects where the constraints were sharp, the
          ambiguity was real, and the result still moves me to talk about.
        </p>
      </header>
      <div
        class="grid"
        data-testid="case-studies-grid"
        role="list"
      >
        ${CASE_STUDIES.map(
          (study) => html`
            <article
              class="card"
              data-testid="case-study-card"
              role="listitem"
            >
              <h3>${study.title}</h3>
              <p>${study.blurb}</p>
              <div class="stack">
                ${study.stack.map(
                  (tech) => html`<span class="chip">${tech}</span>`
                )}
              </div>
            </article>
          `
        )}
      </div>
    `;
  }
}

customElements.define('case-studies-section', CaseStudiesSectionElement);

declare global {
  interface HTMLElementTagNameMap {
    'case-studies-section': CaseStudiesSectionElement;
  }
}
