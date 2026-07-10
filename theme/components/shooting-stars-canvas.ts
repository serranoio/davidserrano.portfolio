import { STAR_CONFIG } from './shooting-stars-config';

interface Star {
  x: number;
  y: number;
  baseOpacity: number;
  twinklePhase: number;
  parallaxFactor: number;
}

interface Meteor {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  length: number;
}

const DEG_TO_RAD = Math.PI / 180;
const BASE_ANGLE_RAD = STAR_CONFIG.meteorAngleDegrees * DEG_TO_RAD;
const ANGLE_JITTER_RAD = STAR_CONFIG.meteorAngleJitterDegrees * DEG_TO_RAD;

// Canvas 2D shooting-stars renderer for the welcome section. Owns its rAF
// loop and a window scroll listener for parallax. Disposable.
export class ShootingStarsCanvas {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly reducedMotion: boolean;
  private readonly dpr: number;

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
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    this.scheduleNextMeteor(this.prevTime / 1000);
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
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.round(rect.width * this.dpr);
    this.canvas.height = Math.round(rect.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  private seedStars() {
    this.stars.length = 0;
    const count = STAR_CONFIG.staticStarCount.welcome;
    const [oMin, oMax] = STAR_CONFIG.staticStarOpacityRange;
    const layers = STAR_CONFIG.parallaxLayerFactors;
    // Seed across 2× the visible height so parallax-shifted stars wrap cleanly.
    const seedH = this.height * 2;
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * seedH,
        baseOpacity: oMin + Math.random() * (oMax - oMin),
        twinklePhase: Math.random() * Math.PI * 2,
        parallaxFactor: layers[i % layers.length],
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
      });
    }
  }

  private scheduleNextMeteor(nowSec: number) {
    const [min, max] = STAR_CONFIG.meteorSpawnIntervalRange;
    this.nextSpawnSec = nowSec + min + Math.random() * (max - min);
  }

  private spawnMeteor(nowSec: number) {
    const meteor = this.meteors.find((m) => !m.active);
    this.scheduleNextMeteor(nowSec);
    if (!meteor) return;

    const [sMin, sMax] = STAR_CONFIG.meteorSpeedRangePx;
    const speed = sMin + Math.random() * (sMax - sMin);
    const angle = BASE_ANGLE_RAD + (Math.random() - 0.5) * 2 * ANGLE_JITTER_RAD;
    const [lMin, lMax] = STAR_CONFIG.meteorLengthRangePx;

    meteor.active = true;
    meteor.x = this.width + 80;
    meteor.y = -40 + Math.random() * this.height * 0.55;
    meteor.vx = Math.cos(angle) * speed;
    meteor.vy = Math.sin(angle) * speed;
    meteor.speed = speed;
    meteor.length = lMin + Math.random() * (lMax - lMin);
  }

  private tick = (now: number) => {
    const dt = Math.min(0.05, (now - this.prevTime) / 1000);
    this.prevTime = now;
    const nowSec = now / 1000;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    if (!this.reducedMotion && nowSec >= this.nextSpawnSec) {
      this.spawnMeteor(nowSec);
    }

    this.drawStars(nowSec);
    if (!this.reducedMotion) this.drawMeteors(dt);

    this.rafId = requestAnimationFrame(this.tick);
  };

  private drawStars(nowSec: number) {
    const ctx = this.ctx;
    const twinkleW = STAR_CONFIG.staticStarTwinkleHz * Math.PI * 2;
    const seedH = this.height * 2;
    for (const star of this.stars) {
      // Parallax: smaller factor = farther = lags scroll. drawY shifts opposite
      // to scrollY, scaled by (1 - factor) so factor=1 means "moves with content"
      // and factor=0 means "locked to viewport".
      const offset = this.scrollY * (1 - star.parallaxFactor);
      let y = star.y + offset;
      // Wrap so we always have stars visible in the canvas.
      y = ((y % seedH) + seedH) % seedH - this.height * 0.5;
      if (y < -2 || y > this.height + 2) continue;

      const twinkle = this.reducedMotion
        ? 1
        : 0.7 + 0.3 * Math.sin(nowSec * twinkleW + star.twinklePhase);
      ctx.fillStyle = `rgba(255, 247, 224, ${(star.baseOpacity * twinkle).toFixed(3)})`;
      ctx.fillRect(star.x, y, 1.5, 1.5);
    }
  }

  private drawMeteors(dt: number) {
    const ctx = this.ctx;
    for (const m of this.meteors) {
      if (!m.active) continue;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      if (m.x < -200 || m.y > this.height + 200) {
        m.active = false;
        continue;
      }
      const tailX = m.x - (m.vx / m.speed) * m.length;
      const tailY = m.y - (m.vy / m.speed) * m.length;
      const grad = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
      grad.addColorStop(0, STAR_CONFIG.meteorHeadColor);
      grad.addColorStop(1, 'rgba(244, 215, 123, 0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();
    }
  }
}
