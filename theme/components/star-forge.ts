import * as THREE from 'three';
import { breath } from './breath';
import { STAR_FORGE, type StarForgeLayout } from './star-forge-config';
import {
  BEAM_FRAGMENT_SHADER,
  BEAM_VERTEX_SHADER,
  DUST_FRAGMENT_SHADER,
  DUST_VERTEX_SHADER,
  GLOW_FRAGMENT_SHADER,
  GLOW_VERTEX_SHADER,
} from './star-forge.shaders';

const { star: STAR, beam: BEAM, dust: DUST } = STAR_FORGE;
// Dust layout is seeded so every visit (and every screenshot) is the same sky.
const DUST_SEED = 0x5ab3e1;
// Fallback "up" when the beam itself points straight up.
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const WORLD_SIDE = new THREE.Vector3(1, 0, 0);

function smoothstep(edges: readonly [number, number], x: number): number {
  return THREE.MathUtils.smoothstep(x, edges[0], edges[1]);
}

type Span = readonly [number, number];

// The beats over slot progress t for a text layout, timed so the beam lands
// on the rose at that layout's strike point.
export function starForgePhases(layout: StarForgeLayout) {
  const strike = STAR_FORGE.strikeAt[layout];
  const { leadIn } = STAR_FORGE;
  const scaled = ([start, end]: Span): Span => [start * strike, end * strike];
  const beamReach = scaled(leadIn.beamReach);
  return {
    gather: scaled(leadIn.gather),
    ignite: scaled(leadIn.ignite),
    beamReach,
    beam: [beamReach[0], strike + STAR_FORGE.beamSettle] as Span,
    afterglow: STAR_FORGE.afterglow,
  };
}

// How far each beat of the choreography has played at slot progress t. Pure:
// the same t always yields the same levels, whichever way the page scrolls.
export function starForgeLevels(t: number, layout: StarForgeLayout) {
  const phases = starForgePhases(layout);
  const gather = smoothstep(phases.gather, t);
  const ignite = smoothstep(phases.ignite, t);
  const beam = smoothstep(phases.beam, t);
  const after = smoothstep(phases.afterglow, t);

  const burning =
    STAR.pinprickIntensity * gather +
    (STAR.coreIntensity - STAR.pinprickIntensity) * ignite * ignite;
  const coreIntensity = THREE.MathUtils.lerp(burning, STAR.emberIntensity, after);
  const coreRadius = THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(STAR.pinprickRadius, STAR.coreRadius, ignite),
    STAR.emberRadius,
    after
  );
  const fade = 1 - after;
  return {
    gather,
    ignite,
    beam: beam * fade,
    // Extra length past 1 lets the soft front clear the landing point.
    reach: smoothstep(phases.beamReach, t) * (1 + BEAM.endSoftness),
    thin: THREE.MathUtils.lerp(1, BEAM.thinTo, after),
    coreIntensity,
    coreRadius,
    light: beam * fade,
    gild: STAR_FORGE.gild * beam * fade,
    skyDim: STAR_FORGE.sky.dim * gather * fade,
    skyWarm: STAR_FORGE.sky.warmthGain * ignite * fade,
    meteorDim: STAR_FORGE.meteorDim * gather * fade,
  };
}

export type StarForgeLevels = ReturnType<typeof starForgeLevels>;

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let r = Math.imul(a ^ (a >>> 15), 1 | a);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// Colour ramp uniforms shared by every star material.
function blackbodyUniforms() {
  const { colors } = STAR_FORGE;
  return {
    uWhite: { value: new THREE.Color(colors.white) },
    uPaleGold: { value: new THREE.Color(colors.paleGold) },
    uAmber: { value: new THREE.Color(colors.amber) },
    uGoldAt: { value: colors.goldAt },
    uWhiteAt: { value: colors.whiteAt },
  };
}

function beamAlongUniforms() {
  return { uReach: { value: 0 }, uEndSoftness: { value: BEAM.endSoftness } };
}

function additiveMaterial(params: THREE.ShaderMaterialParameters): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    ...params,
  });
}

interface GlowShape {
  extent: number;
  glareGain: number;
  glareRadius: number;
  haloGain: number;
  haloRadius: number;
  turbulence: number;
}

function createGlow(shape: GlowShape) {
  const material = additiveMaterial({
    uniforms: {
      ...blackbodyUniforms(),
      uCenter: { value: new THREE.Vector3() },
      uExtent: { value: shape.extent },
      uCoreRadius: { value: STAR.pinprickRadius },
      uCoreIntensity: { value: 0 },
      uGlareGain: { value: shape.glareGain },
      uGlareRadius: { value: shape.glareRadius },
      uHaloGain: { value: shape.haloGain },
      uHaloRadius: { value: shape.haloRadius },
      uTurbulence: { value: shape.turbulence },
      uTurbulenceScale: { value: STAR.turbulenceScale },
      uTime: { value: 0 },
      uOpacity: { value: 1 },
    },
    vertexShader: GLOW_VERTEX_SHADER,
    fragmentShader: GLOW_FRAGMENT_SHADER,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = STAR_FORGE.renderOrder;
  return { mesh, material };
}

// A ribbon of (segments + 1) vertex pairs; the vertex shader lays it along
// the beam and turns it to face the camera.
function createBeamGeometry(): THREE.BufferGeometry {
  const pairs = BEAM.segments + 1;
  const u = new Float32Array(pairs * 2);
  const side = new Float32Array(pairs * 2);
  const index: number[] = [];
  for (let i = 0; i < pairs; i++) {
    u[i * 2] = u[i * 2 + 1] = i / BEAM.segments;
    side[i * 2] = -1;
    side[i * 2 + 1] = 1;
    if (i < BEAM.segments) {
      const a = i * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pairs * 6), 3));
  geometry.setAttribute('aU', new THREE.BufferAttribute(u, 1));
  geometry.setAttribute('aSide', new THREE.BufferAttribute(side, 1));
  geometry.setIndex(index);
  return geometry;
}

function createDustGeometry(): THREE.BufferGeometry {
  const count = DUST.count.wide;
  const random = mulberry32(DUST_SEED);
  const u = new Float32Array(count);
  const offset = new Float32Array(count * 2);
  const seed = new Float32Array(count);
  const size = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    u[i] = random();
    // Uniform over a disc around the axis, a few beam radii wide.
    const angle = random() * Math.PI * 2;
    const radius = DUST.spreadSigmas * Math.sqrt(random());
    offset[i * 2] = Math.cos(angle) * radius;
    offset[i * 2 + 1] = Math.sin(angle) * radius;
    seed[i] = random();
    size[i] = THREE.MathUtils.lerp(DUST.sizePx[0], DUST.sizePx[1], random());
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute('aU', new THREE.BufferAttribute(u, 1));
  geometry.setAttribute('aOffset', new THREE.BufferAttribute(offset, 2));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  return geometry;
}

// The star that forges Stormbreaker, built from objects in the rose's own
// scene: a glow billboard for the star, a ribbon for the beam, a cloud of
// dust the beam lights, a soft bloom where it lands and a real spot light on
// the rose. No post-processing.
export class StarForge {
  readonly group = new THREE.Group();

  private readonly star = createGlow(STAR);
  private readonly landing = createGlow(
    {
      extent: STAR_FORGE.landing.extent,
      glareGain: STAR_FORGE.landing.glareGain,
      glareRadius: STAR_FORGE.landing.radius,
      haloGain: 0,
      haloRadius: 1,
      turbulence: 0,
    }
  );
  private readonly beam: THREE.Mesh;
  private readonly beamMaterial: THREE.ShaderMaterial;
  private readonly dust: THREE.Points;
  private readonly dustMaterial: THREE.ShaderMaterial;
  private readonly light: THREE.SpotLight;

  private layout: StarForgeLayout;
  private readonly anchor = new THREE.Vector3();
  private readonly target = new THREE.Vector3();
  private readonly starPosition = new THREE.Vector3();
  private readonly beamEnd = new THREE.Vector3();
  private readonly scratch = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private levels: StarForgeLevels = starForgeLevels(0, 'wide');
  private progress = 0;
  private opacity = 0;

  private readonly skyTint = new THREE.Color();
  private readonly skyWarmth = new THREE.Color(STAR_FORGE.sky.warmth);

  constructor(layout: StarForgeLayout) {
    this.layout = layout;

    this.beamMaterial = additiveMaterial({
      uniforms: {
        ...blackbodyUniforms(),
        ...beamAlongUniforms(),
        uStart: { value: new THREE.Vector3() },
        uEnd: { value: new THREE.Vector3() },
        uHalfWidth: { value: 0 },
        uSigma: { value: 0 },
        uScatterSigma: { value: 0 },
        uScatterGain: { value: BEAM.scatterGain },
        uIntensity: { value: 0 },
        uLength: { value: 1 },
        uShimmer: { value: BEAM.shimmer },
        uShimmerScale: { value: BEAM.shimmerScale },
        uTime: { value: 0 },
        uOpacity: { value: 1 },
      },
      vertexShader: BEAM_VERTEX_SHADER,
      fragmentShader: BEAM_FRAGMENT_SHADER,
      side: THREE.DoubleSide,
    });
    this.beam = new THREE.Mesh(createBeamGeometry(), this.beamMaterial);
    this.beam.frustumCulled = false;
    this.beam.renderOrder = STAR_FORGE.renderOrder;

    this.dustMaterial = additiveMaterial({
      uniforms: {
        ...blackbodyUniforms(),
        ...beamAlongUniforms(),
        uStart: { value: new THREE.Vector3() },
        uEnd: { value: new THREE.Vector3() },
        uAcrossA: { value: new THREE.Vector3() },
        uAcrossB: { value: new THREE.Vector3() },
        uSigma: { value: 0 },
        uLitSigma: { value: 0 },
        uDrift: { value: 0 },
        uTime: { value: 0 },
        uWobble: { value: DUST.wobble },
        uWobbleHz: { value: DUST.wobbleHz },
        uPixelRatio: { value: 1 },
        uIntensity: { value: 0 },
        uAnisotropy: { value: DUST.anisotropy },
        uOpacity: { value: 1 },
      },
      vertexShader: DUST_VERTEX_SHADER,
      fragmentShader: DUST_FRAGMENT_SHADER,
    });
    this.dust = new THREE.Points(createDustGeometry(), this.dustMaterial);
    this.dust.frustumCulled = false;
    this.dust.renderOrder = STAR_FORGE.renderOrder;

    this.light = new THREE.SpotLight(
      STAR_FORGE.light.color,
      0,
      0,
      STAR_FORGE.light.angleDegrees * THREE.MathUtils.DEG2RAD,
      STAR_FORGE.light.penumbra,
      2
    );

    this.group.add(this.star.mesh, this.beam, this.dust, this.landing.mesh, this.light, this.light.target);
    this.setLayout(layout);
  }

  setLayout(layout: StarForgeLayout) {
    this.layout = layout;
    this.dust.geometry.setDrawRange(0, DUST.count[layout]);
  }

  setPixelRatio(pixelRatio: number) {
    this.dustMaterial.uniforms.uPixelRatio.value = pixelRatio;
  }

  // `anchor` is the slot's place among the words (world space); `target` is
  // where the beam lands (the bloom's centre).
  place(anchor: THREE.Vector3, target: THREE.Vector3) {
    this.anchor.copy(anchor);
    this.target.copy(target);
  }

  update(camera: THREE.Camera, t: number, opacity: number, nowSec: number) {
    this.progress = THREE.MathUtils.clamp(t, 0, 1);
    this.opacity = opacity;
    const levels = (this.levels = starForgeLevels(this.progress, this.layout));
    const visible = opacity > 0.001 && levels.gather > 0;
    this.group.visible = visible;
    this.light.intensity = 0;
    if (!visible) return;

    const time = breath.still ? 0 : nowSec;
    this.placeStar(camera);
    this.updateStar(levels, opacity, time);
    this.updateBeam(levels, opacity, time);
    this.updateLight(levels, opacity);
  }

  // 0–1 through the star's slot.
  getProgress(): number {
    return this.progress;
  }

  // The star core's rendered HDR brightness (0 when hidden).
  getIntensity(): number {
    return this.group.visible ? this.levels.coreIntensity * this.opacity : 0;
  }

  // How gold the petals should be under the beam (0–1).
  getGild(): number {
    return this.levels.gild * this.opacity;
  }

  // Multiplier for the sky's brightness and a warm linear tint to add.
  getSkyGrade(): { gain: number; tint: THREE.Color } {
    const k = this.opacity;
    this.skyTint.copy(this.skyWarmth).multiplyScalar(this.levels.skyWarm * k);
    return { gain: 1 - this.levels.skyDim * k, tint: this.skyTint };
  }

  // Multiplier for the meteors and background stars.
  getMeteorGain(): number {
    return 1 - this.levels.meteorDim * this.opacity;
  }

  dispose() {
    for (const object of [this.star.mesh, this.landing.mesh, this.beam, this.dust]) {
      object.geometry.dispose();
      (object.material as THREE.Material).dispose();
    }
    this.light.dispose();
    if (this.group.parent) this.group.parent.remove(this.group);
  }

  // Deep behind the words along the line of sight, a little to camera-right.
  private placeStar(camera: THREE.Camera) {
    const { placement } = STAR_FORGE;
    const away = this.scratch.subVectors(this.target, camera.position).setY(0).normalize();
    this.right.setFromMatrixColumn(camera.matrixWorld, 0).setY(0).normalize();
    this.starPosition
      .copy(this.anchor)
      .addScaledVector(away, placement.depth)
      .addScaledVector(this.right, placement.lateral[this.layout])
      .addScaledVector(WORLD_UP, placement.lift);
    this.beamEnd
      .subVectors(this.starPosition, this.target)
      .normalize()
      .multiplyScalar(BEAM.landingInset)
      .add(this.target);
  }

  private updateStar(levels: StarForgeLevels, opacity: number, time: number) {
    const u = this.star.material.uniforms;
    u.uCenter.value.copy(this.starPosition);
    u.uCoreRadius.value = levels.coreRadius;
    u.uCoreIntensity.value = levels.coreIntensity;
    u.uTime.value = time * STAR.turbulenceSpeed;
    u.uOpacity.value = opacity;
  }

  private updateBeam(levels: StarForgeLevels, opacity: number, time: number) {
    const on = levels.beam > 0.001;
    this.beam.visible = this.dust.visible = this.landing.mesh.visible = on;
    if (!on) return;

    const sigma = BEAM.sigma[this.layout] * levels.thin;
    const length = this.starPosition.distanceTo(this.beamEnd);
    const b = this.beamMaterial.uniforms;
    b.uStart.value.copy(this.starPosition);
    b.uEnd.value.copy(this.beamEnd);
    b.uSigma.value = sigma;
    b.uScatterSigma.value = sigma * BEAM.scatterSigmaScale;
    b.uHalfWidth.value = sigma * BEAM.halfWidthSigmas;
    b.uIntensity.value = BEAM.intensity * levels.beam;
    b.uReach.value = levels.reach;
    b.uLength.value = length;
    b.uTime.value = time * BEAM.shimmerSpeed;
    b.uOpacity.value = opacity;

    const d = this.dustMaterial.uniforms;
    const axis = this.scratch.subVectors(this.beamEnd, this.starPosition).normalize();
    const acrossA = d.uAcrossA.value as THREE.Vector3;
    acrossA.crossVectors(axis, Math.abs(axis.y) > 0.95 ? WORLD_SIDE : WORLD_UP).normalize();
    (d.uAcrossB.value as THREE.Vector3).crossVectors(axis, acrossA).normalize();
    d.uStart.value.copy(this.starPosition);
    d.uEnd.value.copy(this.beamEnd);
    d.uSigma.value = sigma;
    d.uLitSigma.value = sigma * DUST.litSigmas;
    d.uDrift.value = this.progress * DUST.scrollDrift + time * DUST.timeDriftPerSec;
    d.uTime.value = time;
    d.uIntensity.value = DUST.intensity * levels.beam;
    d.uReach.value = levels.reach;
    d.uOpacity.value = opacity;

    // The landing bloom grows once the beam has arrived.
    const landed = THREE.MathUtils.clamp(levels.reach - 1, 0, BEAM.endSoftness) / BEAM.endSoftness;
    const l = this.landing.material.uniforms;
    l.uCenter.value.copy(this.beamEnd);
    l.uCoreRadius.value = STAR_FORGE.landing.radius;
    l.uCoreIntensity.value = STAR_FORGE.landing.intensity * levels.beam * landed;
    l.uOpacity.value = opacity;
  }

  private updateLight(levels: StarForgeLevels, opacity: number) {
    const distance = this.starPosition.distanceTo(this.target);
    this.light.position.copy(this.starPosition);
    this.light.target.position.copy(this.target);
    // Inverse-square decay: scale by distance² so the rose receives the
    // configured intensity wherever the star happens to hang.
    this.light.intensity = STAR_FORGE.light.intensity * distance * distance * levels.light * opacity;
  }
}
