import { LitElement, html } from 'lit';
import { query } from 'lit/decorators.js';
import styles from './arcana-spiral.styles';
import {
  arcanaSpiralSprites,
  fitArcanaSpiralCanvas,
  paintArcanaSpiral,
  type ArcanaSpiralColors,
  type ArcanaSpiralSprites,
} from './arcana-spiral.helpers';

/**
 * The House of Arcana's homepage rose as a decorative mark. It animates only while on screen and motion is allowed;
 * otherwise it holds the settled still frame, repainted when the box or the site theme changes.
 * Colours come from the `--arcana-spiral-*` tokens in theme/index.css.
 */
export class ArcanaSpiralElement extends LitElement {
  static styles = [styles];

  @query('canvas') private accessor _canvas: HTMLCanvasElement | null = null;

  private _frame = 0;
  private _startedAt = 0;
  private _onScreen = false;
  private _sprites?: ArcanaSpiralSprites;
  private _motion?: MediaQueryList;
  private _resize?: ResizeObserver;
  private _visible?: IntersectionObserver;
  private _theme?: MutationObserver;

  render() {
    return html`<canvas aria-hidden="true"></canvas>`;
  }

  firstUpdated() {
    this._motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this._motion.addEventListener('change', this._restart);
    this._startedAt = performance.now();
    this._resize = new ResizeObserver(() => this._paint(performance.now()));
    this._resize.observe(this);
    this._visible = new IntersectionObserver(([entry]) => {
      this._onScreen = entry?.isIntersecting ?? false;
      this._restart();
    });
    this._visible.observe(this);
    this._theme = new MutationObserver(() => this._paint(performance.now()));
    this._theme.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    this._paint(this._startedAt);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stop();
    this._motion?.removeEventListener('change', this._restart);
    this._resize?.disconnect();
    this._visible?.disconnect();
    this._theme?.disconnect();
  }

  private get _still() {
    return this._motion?.matches ?? false;
  }

  private _restart = () => {
    this._stop();
    if (this._onScreen && !this._still) this._frame = requestAnimationFrame(this._tick);
    else this._paint(performance.now());
  };

  private _stop() {
    cancelAnimationFrame(this._frame);
    this._frame = 0;
  }

  private _tick = (now: number) => {
    this._paint(now);
    this._frame = requestAnimationFrame(this._tick);
  };

  private _colors(): ArcanaSpiralColors {
    const style = getComputedStyle(this);
    const read = (name: string) => style.getPropertyValue(name).trim();
    return {
      comet: read('--arcana-spiral-comet'),
      yes: read('--arcana-spiral-yes'),
      no: read('--arcana-spiral-no'),
      glint: read('--arcana-spiral-glint'),
      blend: (read('--arcana-spiral-blend') || 'source-over') as GlobalCompositeOperation,
    };
  }

  private _paint(now: number) {
    const canvas = this._canvas;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    fitArcanaSpiralCanvas(canvas, context, width, height);
    const colors = this._colors();
    this._sprites = arcanaSpiralSprites(colors, this._sprites);
    paintArcanaSpiral(context, {
      width,
      height,
      // Reduced motion shows the settled, fully bloomed frame and nothing in flight.
      elapsedMs: this._still ? Number.POSITIVE_INFINITY : now - this._startedAt,
      rem: Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16,
      colors,
      sprites: this._sprites,
    });
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('arcana-spiral')) {
  customElements.define('arcana-spiral', ArcanaSpiralElement);
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'arcana-spiral': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}
