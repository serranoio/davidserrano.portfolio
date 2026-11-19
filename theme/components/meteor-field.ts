import * as THREE from 'three';
import { breath } from './breath';
import {
  STAR_CONFIG,
  meteorOpacity,
  randomIn,
  starBrightness,
  starLayerFor,
} from './shooting-stars-config';

interface Meteor {
  line: THREE.Line;
  material: THREE.LineBasicMaterial;
  active: boolean;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  speed: number;
  length: number;
  age: number;
  life: number;
}

// World units a meteor travels before it has fully dissolved.
const METEOR_TRAVEL_RANGE = [7, 10] as const;

const STAR_VERTEX_SHADER = /* glsl */ `
attribute vec3 color;
attribute float aSize;
attribute float aSoft;
attribute float aBright;
attribute float aPhase;
attribute float aDrift;
attribute float aTwinkle;
uniform float uTime;
uniform float uPixelRatio;
uniform float uGain;
uniform float uTwinkleDepth;
varying vec3 vColor;
varying float vSoft;
varying float vAlpha;
void main() {
  // Each depth layer turns about the vertical axis at its own slow rate, so
  // near stars slide across far ones.
  float angle = uTime * aDrift;
  float c = cos( angle );
  float s = sin( angle );
  vec3 p = vec3( c * position.x + s * position.z, position.y, c * position.z - s * position.x );
  gl_Position = projectionMatrix * modelViewMatrix * vec4( p, 1.0 );
  gl_PointSize = aSize * uPixelRatio;
  float twinkle = 0.5 + 0.5 * sin( uTime * aTwinkle + aPhase );
  vColor = color;
  vSoft = aSoft;
  vAlpha = aBright * ( 1.0 - uTwinkleDepth * twinkle ) * uGain;
}
`;

const STAR_FRAGMENT_SHADER = /* glsl */ `
varying vec3 vColor;
varying float vSoft;
varying float vAlpha;
void main() {
  float d = length( gl_PointCoord - 0.5 ) * 2.0;
  float crisp = 1.0 - smoothstep( 0.6, 1.0, d );
  float soft = exp( - d * d * 4.5 ) * ( 1.0 - smoothstep( 0.8, 1.0, d ) );
  gl_FragColor = vec4( vColor, mix( crisp, soft, vSoft ) * vAlpha );
  #include <colorspace_fragment>
}
`;

// Stars and meteors for the rose scene. Lives in world space so the rose's
// camera orbit gives the sky natural depth. Mounted as a Group added to the
// rose's scene and driven from the rose's animation loop.
export class MeteorField {
  readonly group: THREE.Group;

  private readonly stars: THREE.Points;
  private readonly starsMaterial: THREE.ShaderMaterial;
  private readonly meteors: Meteor[] = [];

  private nextSpawnSec = 0;
  private opacity = 1;

  constructor() {
    this.group = new THREE.Group();

    this.starsMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: 1 },
        uGain: { value: 1 },
        uTwinkleDepth: { value: STAR_CONFIG.twinkleDepth },
      },
      vertexShader: STAR_VERTEX_SHADER,
      fragmentShader: STAR_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.stars = new THREE.Points(this.buildStarGeometry(), this.starsMaterial);
    this.stars.frustumCulled = false;
    this.group.add(this.stars);

    this.buildMeteorPool();
  }

  setPixelRatio(pixelRatio: number) {
    this.starsMaterial.uniforms.uPixelRatio.value = pixelRatio;
  }

  setOpacity(opacity: number) {
    this.opacity = opacity;
    this.stars.visible = opacity > 0.001;
  }

  update(nowSec: number, dt: number) {
    const still = breath.still;
    // Held sky: no drift, no twinkle, no meteors — but the stars stay.
    this.starsMaterial.uniforms.uTime.value = still ? 0 : nowSec;
    this.starsMaterial.uniforms.uGain.value = starBrightness(0, breath.level()) * this.opacity;

    if (nowSec >= this.nextSpawnSec) {
      // Keep the schedule moving while hidden so meteors don't rush back.
      if (!still && this.opacity > 0.001 && this.nextSpawnSec > 0) this.spawnMeteor();
      this.nextSpawnSec = nowSec + randomIn(STAR_CONFIG.meteorSpawnIntervalRange);
    }

    for (const m of this.meteors) {
      if (!m.active) continue;
      m.age += dt;
      if (m.age >= m.life || still) {
        m.active = false;
        m.line.visible = false;
        continue;
      }
      m.position.addScaledVector(m.velocity, dt);
      const positions = m.line.geometry.attributes.position as THREE.BufferAttribute;
      const tailScale = -m.length / m.speed;
      positions.setXYZ(0, m.position.x, m.position.y, m.position.z);
      positions.setXYZ(
        1,
        m.position.x + m.velocity.x * tailScale,
        m.position.y + m.velocity.y * tailScale,
        m.position.z + m.velocity.z * tailScale
      );
      positions.needsUpdate = true;
      m.material.opacity = meteorOpacity(m.age, m.life) * this.opacity;
      m.line.visible = m.material.opacity > 0.001;
    }
  }

  dispose() {
    this.starsMaterial.dispose();
    this.stars.geometry.dispose();
    for (const m of this.meteors) {
      m.line.geometry.dispose();
      m.material.dispose();
    }
    if (this.group.parent) this.group.parent.remove(this.group);
  }

  private buildStarGeometry(): THREE.BufferGeometry {
    const count = STAR_CONFIG.staticStarCount.rose;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const softness = new Float32Array(count);
    const brightness = new Float32Array(count);
    const phases = new Float32Array(count);
    const drifts = new Float32Array(count);
    const twinkles = new Float32Array(count);
    const base = new THREE.Color(STAR_CONFIG.starColor);
    const tint = new THREE.Color(STAR_CONFIG.starTintColor);
    const baseR = STAR_CONFIG.roseStarSphereRadius;
    const jitter = STAR_CONFIG.roseStarRadiusJitter;

    // Uniform distribution on a sphere surface — inverse-CDF on cos(phi) so
    // stars don't bunch at the poles. Tiny radial jitter gives the shell depth.
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = baseR * (1 + (Math.random() - 0.5) * 2 * jitter);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      const layer = starLayerFor(i, count);
      const color = Math.random() < STAR_CONFIG.starTintShare ? tint : base;
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      sizes[i] = randomIn(layer.sizeRange);
      softness[i] = layer.softness;
      brightness[i] = randomIn(layer.opacityRange);
      phases[i] = Math.random() * Math.PI * 2;
      drifts[i] = layer.driftRadPerSec;
      twinkles[i] = layer.twinkleHz * Math.PI * 2;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geom.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geom.setAttribute('aSoft', new THREE.BufferAttribute(softness, 1));
    geom.setAttribute('aBright', new THREE.BufferAttribute(brightness, 1));
    geom.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geom.setAttribute('aDrift', new THREE.BufferAttribute(drifts, 1));
    geom.setAttribute('aTwinkle', new THREE.BufferAttribute(twinkles, 1));
    return geom;
  }

  private buildMeteorPool() {
    const head = new THREE.Color(STAR_CONFIG.meteorHeadColor);
    // Additive blending: a black tail vertex is a fully transparent one, so
    // the streak tapers to nothing without needing per-vertex alpha.
    const colors = new Float32Array([head.r, head.g, head.b, 0, 0, 0]);
    for (let i = 0; i < STAR_CONFIG.meteorPoolSize.rose; i++) {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      geom.setAttribute('color', new THREE.BufferAttribute(colors.slice(), 3));
      const material = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const line = new THREE.Line(geom, material);
      line.visible = false;
      line.frustumCulled = false;
      this.group.add(line);
      this.meteors.push({
        line,
        material,
        active: false,
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
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

    // Spawn above-right of the rose, behind it on the z-axis so it reads as
    // atmosphere rather than foreground.
    meteor.position.set(
      3 + Math.random() * 3,
      3.2 + Math.random() * 2,
      -3 - Math.random() * 5
    );

    const angle =
      (STAR_CONFIG.meteorAngleDegrees +
        (Math.random() - 0.5) * 2 * STAR_CONFIG.meteorAngleJitterDegrees) *
      THREE.MathUtils.DEG2RAD;

    const speed = randomIn(STAR_CONFIG.meteorSpeedRangeWorld);
    meteor.speed = speed;
    meteor.velocity.set(Math.cos(angle) * speed, Math.sin(angle) * speed, 0);
    meteor.length = randomIn(STAR_CONFIG.meteorLengthRangeWorld);
    meteor.age = 0;
    meteor.life = randomIn(METEOR_TRAVEL_RANGE) / speed;
    meteor.active = true;
  }
}
