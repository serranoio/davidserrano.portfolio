import { breath } from './breath';
import { SpriteCache, fitCanvasToBox } from './canvas-2d';
import {
  STAR_CONFIG,
  meteorOpacity,
  randomIn,
  starBrightness,
  starLayerFor,
  type StarLayer,
} from './shooting-stars-config';

interface Star {
  x: number;
  y: number;
  size: number;
  baseOpacity: number;
  twinklePhase: number;
  layer: StarLayer;
  sprite: HTMLCanvasElement;
}

interface Meteor {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  length: number;
  age: number;
  life: number;
}

const DEG_TO_RAD = Math.PI / 180;
const BASE_ANGLE_RAD = STAR_CONFIG.meteorAngleDegrees * DEG_TO_RAD;
const ANGLE_JITTER_RAD = STAR_CONFIG.meteorAngleJitterDegrees * DEG_TO_RAD;

// Fraction of the viewport diagonal a meteor crosses before it has dissolved.
const METEOR_TRAVEL_RANGE = [0.55, 0.8] as const;

// Canvas 2D sky for the welcome and writing sections: the same layered,
// breathing stars as the rose scene, with scroll parallax standing in for
// camera depth. Owns its rAF loop and scroll listener. Disposable.
export class ShootingStarsCanvas {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly sprites = new SpriteCache();

  private stars: Star[] = [];
  private meteors: Meteor[] = [];
  private rafId: number | null = null;
  private prevTime = 0;
  private nextSpawnSec = 0;
  private scrollY = 0;
  private width = 0;
  private height = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('ShootingStarsCanvas: 2d context unavailable');
    this.ctx = ctx;

    this.resize();
    this.seedStars();
    this.seedMeteorPool();

    window.addEventListener('resize', this.handleResize);
    window.addEventListener('scroll', this.handleScroll, { passive: true });
    this.scrollY = window.scrollY;
  }

  start() {
    if (this.rafId !== null) return;
    this.prevTime = performance.now();
    this.nextSpawnSec = breath.now() + randomIn(STAR_CONFIG.meteorSpawnIntervalRange);
    this.rafId = requestAnimationFrame(this.tick);
  }

  dispose() {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('scroll', this.handleScroll);
  }

  private handleResize = () => {
    this.resize();
    this.seedStars();
  };

  private handleScroll = () => {
    this.scrollY = window.scrollY;
  };

  private resize() {
    ({ width: this.width, height: this.height } = fitCanvasToBox(this.canvas, this.ctx));
  }

  private seedStars() {
    this.stars.length = 0;
    const count = STAR_CONFIG.staticStarCount.welcome;
    // Seed across 2× the visible height so parallax-shifted stars wrap cleanly.
    const seedH = this.height * 2;
    for (let i = 0; i < count; i++) {
      const layer = starLayerFor(i, count);
      const color =
        Math.random() < STAR_CONFIG.starTintShare
          ? STAR_CONFIG.starTintColor
          : STAR_CONFIG.starColor;
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * seedH,
        size: randomIn(layer.sizeRange),
        baseOpacity: randomIn(layer.opacityRange),
        twinklePhase: Math.random() * Math.PI * 2,
        layer,
        sprite: this.sprites.get(color, layer.softness),
      });
    }
  }

  private seedMeteorPool() {
    const size = STAR_CONFIG.meteorPoolSize.welcome;
    for (let i = 0; i < size; i++) {
      this.meteors.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        speed: 0,
        length: 0,
        age: 0,
        life: 0,
      });
    }
  }

  private spawnMeteor() {
    const meteor = this.meteors.find((m) => !m.active);
    if (!meteor) return;

    const speed = randomIn(STAR_CONFIG.meteorSpeedRangePx);
    const angle = BASE_ANGLE_RAD + (Math.random() - 0.5) * 2 * ANGLE_JITTER_RAD;

    meteor.active = true;
    // Begins inside the frame (it fades in), upper right.
    meteor.x = this.width * (0.55 + Math.random() * 0.45);
    meteor.y = this.height * (0.02 + Math.random() * 0.4);
    // Canvas y grows downward, so the "below horizontal" angle flips sign.
    meteor.vx = Math.cos(angle) * speed;
    meteor.vy = -Math.sin(angle) * speed;
    meteor.speed = speed;
    meteor.length = randomIn(STAR_CONFIG.meteorLengthRangePx);
    meteor.age = 0;
    meteor.life = (Math.hypot(this.width, this.height) * randomIn(METEOR_TRAVEL_RANGE)) / speed;
  }

  private tick = (now: number) => {
    const dt = Math.min(0.05, (now - this.prevTime) / 1000);
    this.prevTime = now;
    const still = breath.still;
    // Shared timeline, so this sky twinkles and breathes in phase with the
    // rose's. Held at zero when motion is reduced.
    const nowSec = still ? 0 : breath.now();

    this.ctx.clearRect(0, 0, this.width, this.height);

    if (!still && breath.now() >= this.nextSpawnSec) {
      this.spawnMeteor();
      this.nextSpawnSec = breath.now() + randomIn(STAR_CONFIG.meteorSpawnIntervalRange);
    }

    this.drawStars(nowSec, still);
    if (!still) this.drawMeteors(dt);

    this.rafId = requestAnimationFrame(this.tick);
  };

  private drawStars(nowSec: number, still: boolean) {
    const ctx = this.ctx;
    const seedH = this.height * 2;
    const level = breath.level();
    for (const star of this.stars) {
      // Parallax: smaller factor = farther = lags scroll. drawY shifts opposite
      // to scrollY, scaled by (1 - factor) so factor=1 means "moves with content"
      // and factor=0 means "locked to viewport".
      const offset = still ? 0 : this.scrollY * (1 - star.layer.parallaxFactor);
      let y = star.y + offset;
      // Wrap so we always have stars visible in the canvas.
      y = ((y % seedH) + seedH) % seedH - this.height * 0.5;
      if (y < -4 || y > this.height + 4) continue;

      const twinkle =
        0.5 + 0.5 * Math.sin(nowSec * star.layer.twinkleHz * Math.PI * 2 + star.twinklePhase);
      ctx.globalAlpha = star.baseOpacity * starBrightness(twinkle, level);
      ctx.drawImage(star.sprite, star.x - star.size / 2, y - star.size / 2, star.size, star.size);
    }
    ctx.globalAlpha = 1;
  }

  private drawMeteors(dt: number) {
    const ctx = this.ctx;
    for (const m of this.meteors) {
      if (!m.active) continue;
      m.age += dt;
      if (m.age >= m.life) {
        m.active = false;
        continue;
      }
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      const tailX = m.x - (m.vx / m.speed) * m.length;
      const tailY = m.y - (m.vy / m.speed) * m.length;
      const grad = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
      grad.addColorStop(0, STAR_CONFIG.meteorHeadColor);
      grad.addColorStop(1, `${STAR_CONFIG.meteorHeadColor}00`);
      ctx.globalAlpha = meteorOpacity(m.age, m.life);
      ctx.strokeStyle = grad;
      ctx.lineWidth = STAR_CONFIG.meteorWidthPx;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}
