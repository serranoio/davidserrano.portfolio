import { breath } from './breath';
import { SpriteCache, fitCanvasToBox } from './canvas-2d';
import { EMBER_CONFIG as E } from './ember-halo-config';
import { randomIn } from './shooting-stars-config';

interface EmberPalette {
  hot: string;
  pale: string;
}

interface Ember {
  // Birth position (CSS px, canvas space) and the side it leans toward.
  x0: number;
  y0: number;
  side: -1 | 1;
  rise: number;
  drift: number;
  swayPx: number;
  swayHz: number;
  flickerHz: number;
  phase: number;
  size: number;
  age: number;
  life: number;
  sprite: HTMLCanvasElement;
}

const TAU = Math.PI * 2;

// Opacity of an ember `t` (0–1) through its life: it kindles, holds, and
// cools to nothing well before it dies.
function emberFade(t: number): number {
  const kindle = Math.min(1, t / E.fadeInShare);
  const cool = Math.min(1, Math.max(0, (1 - t) / E.fadeOutShare));
  return kindle * cool * cool;
}

// Canvas 2D sparks rising around the hero photo, breathing with the page's
// shared clock. Runs only while on screen and while motion is allowed; with
// reduced motion it draws nothing and the CSS glow stays still. Also writes
// the breath level to `glow` so the CSS firelight swells in the same rhythm.
// Disposable.
export class EmberHaloCanvas {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly sprites = new SpriteCache();
  private readonly visibility: IntersectionObserver;
  private readonly resizeObserver: ResizeObserver;
  private readonly unsubscribeStill: () => void;

  private embers: Ember[] = [];
  private rafId: number | null = null;
  private prevTime = 0;
  private onScreen = false;
  private width = 0;
  private height = 0;
  private lastGlowLevel = -1;
  private palette: EmberPalette | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly glow: HTMLElement
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('EmberHaloCanvas: 2d context unavailable');
    this.ctx = ctx;

    this.resizeObserver = new ResizeObserver(this.handleResize);
    this.resizeObserver.observe(canvas);
    this.visibility = new IntersectionObserver(([entry]) => {
      this.onScreen = entry?.isIntersecting ?? false;
      this.restart();
    });
    this.visibility.observe(canvas);
    this.unsubscribeStill = breath.onStillChange(this.restart);
  }

  dispose() {
    this.stop();
    this.visibility.disconnect();
    this.resizeObserver.disconnect();
    this.unsubscribeStill();
  }

  private handleResize = () => {
    ({ width: this.width, height: this.height } = fitCanvasToBox(this.canvas, this.ctx));
    this.embers = [];
    this.palette = null;
    this.restart();
  };

  private restart = () => {
    this.stop();
    if (this.onScreen && !breath.still) {
      this.prevTime = performance.now();
      this.rafId = requestAnimationFrame(this.tick);
      return;
    }
    // Held: no sparks, and the glow rests at the clock's still level.
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.embers = [];
    this.writeGlow(breath.level());
  };

  private stop() {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  // The photo's box inside the (larger) canvas.
  private photoBox() {
    const w = this.width / (1 + E.bleed.left + E.bleed.right);
    const h = this.height / (1 + E.bleed.top + E.bleed.bottom);
    return { x: w * E.bleed.left, y: h * E.bleed.top, w, h };
  }

  private targetCount(): number {
    return this.photoBox().w < E.narrowPhotoWidthPx ? E.count.narrow : E.count.wide;
  }

  // Read once per layout; the hero's tokens are night values in either theme.
  private colors(): EmberPalette {
    if (!this.palette) {
      const style = getComputedStyle(this.canvas);
      this.palette = {
        hot: style.getPropertyValue(E.colorTokens.hot).trim(),
        pale: style.getPropertyValue(E.colorTokens.pale).trim(),
      };
    }
    return this.palette;
  }

  private spawn(preAged: boolean): Ember {
    const colors = this.colors();
    const box = this.photoBox();
    const side = Math.random() < 0.5 ? -1 : 1;
    const life = randomIn(E.lifeSeconds);
    const color = Math.random() < E.paleShare ? colors.pale : colors.hot;
    return {
      x0: box.x + box.w / 2 + side * (box.w / 2) * randomIn(E.spawnSideOffset),
      y0: box.y + box.h * randomIn(E.spawnHeight),
      side,
      rise: randomIn(E.riseSpeedPx),
      drift: randomIn(E.outwardDriftPx),
      swayPx: randomIn(E.swayPx),
      swayHz: randomIn(E.swayHz),
      flickerHz: randomIn(E.flickerHz),
      phase: Math.random() * TAU,
      size: randomIn(E.sizePx),
      // The first sparks start mid-flight so the halo is already alight.
      age: preAged ? Math.random() * life : 0,
      life,
      sprite: this.sprites.get(color, E.softness),
    };
  }

  private writeGlow(level: number) {
    if (Math.abs(level - this.lastGlowLevel) < E.glowBreathStep) return;
    this.lastGlowLevel = level;
    this.glow.style.setProperty(E.glowBreathProperty, level.toFixed(2));
  }

  private tick = (now: number) => {
    const dt = Math.min(0.05, (now - this.prevTime) / 1000);
    this.prevTime = now;
    const level = breath.level();
    this.writeGlow(level);

    const target = this.targetCount();
    const preAged = this.embers.length === 0;
    while (this.embers.length < target) this.embers.push(this.spawn(preAged));

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.globalCompositeOperation = 'lighter';
    const breathGain = 1 - E.breathDepth * (1 - level);
    const nowSec = breath.now();

    for (let i = 0; i < this.embers.length; i++) {
      let e = this.embers[i];
      e.age += dt;
      if (e.age >= e.life) {
        e = this.embers[i] = this.spawn(false);
      }
      const x =
        e.x0 + e.side * e.drift * e.age + Math.sin(e.age * e.swayHz * TAU + e.phase) * e.swayPx;
      const y = e.y0 - e.rise * e.age;
      const flicker = 1 - E.flickerDepth * (0.5 + 0.5 * Math.sin(nowSec * e.flickerHz * TAU + e.phase));
      ctx.globalAlpha = E.peakOpacity * emberFade(e.age / e.life) * flicker * breathGain;
      ctx.drawImage(e.sprite, x - e.size / 2, y - e.size / 2, e.size, e.size);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    this.rafId = requestAnimationFrame(this.tick);
  };
}
