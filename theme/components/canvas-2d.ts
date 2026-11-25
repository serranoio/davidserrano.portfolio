// Small helpers shared by the home page's Canvas 2D renderers (the star sky,
// the ember halo, the Arcana spiral).

// Backing-store density is capped: past 2× the extra pixels cost fill rate
// without a visible gain for soft, glowing marks.
const MAX_PIXEL_RATIO = 2;

// Sprites are drawn once at this resolution and scaled down per mark.
const SPRITE_PX = 32;

// The device pixel ratio, clamped to [1, MAX_PIXEL_RATIO].
export function canvasPixelRatio(): number {
  const dpr = globalThis.devicePixelRatio;
  return Number.isFinite(dpr) && dpr > 0 ? Math.min(dpr, MAX_PIXEL_RATIO) : 1;
}

// Matches the canvas's backing store to its CSS box and scales drawing to CSS
// pixels. Returns the box size in CSS pixels.
export function fitCanvasToBox(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
): { width: number; height: number } {
  const { width, height } = canvas.getBoundingClientRect();
  const ratio = canvasPixelRatio();
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { width, height };
}

// A round, glowing mark of the given softness: a solid core out to
// (1 - softness) of the radius, then a falloff to nothing. The falloff is
// drawn as alpha and then filled with `color`, so any CSS colour works.
export function buildSoftSprite(color: string, softness: number): HTMLCanvasElement {
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = SPRITE_PX;
  const ctx = sprite.getContext('2d');
  if (!ctx) return sprite;
  const r = SPRITE_PX / 2;
  const core = Math.max(0, 1 - softness) * 0.7;
  const alpha = ctx.createRadialGradient(r, r, 0, r, r, r);
  alpha.addColorStop(0, 'rgba(0,0,0,1)');
  alpha.addColorStop(core, 'rgba(0,0,0,1)');
  alpha.addColorStop(core + (1 - core) * 0.45, 'rgba(0,0,0,0.25)');
  alpha.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = alpha;
  ctx.fillRect(0, 0, SPRITE_PX, SPRITE_PX);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, SPRITE_PX, SPRITE_PX);
  return sprite;
}

// Keeps a sprite per key so each colour/softness pair is drawn only once.
export class SpriteCache {
  private readonly sprites = new Map<string, HTMLCanvasElement>();

  get(color: string, softness: number): HTMLCanvasElement {
    const key = `${color}/${softness}`;
    let sprite = this.sprites.get(key);
    if (!sprite) {
      sprite = buildSoftSprite(color, softness);
      this.sprites.set(key, sprite);
    }
    return sprite;
  }
}
