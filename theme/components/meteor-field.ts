import * as THREE from 'three';
import { STAR_CONFIG } from './shooting-stars-config';

interface Meteor {
  line: THREE.Line;
  active: boolean;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  speed: number;
  length: number;
}

const DEG_TO_RAD = Math.PI / 180;

// Three.js shooting-stars renderer for the rose scene. Mirrors the welcome
// canvas visually (same direction, color, cadence) but lives in world space
// so the rose's camera orbit gives it natural depth. Mounted as a Group
// added to the rose's scene; driven from the rose's animate() loop.
export class MeteorField {
  readonly group: THREE.Group;

  private readonly stars: THREE.Points;
  private readonly meteors: Meteor[] = [];
  private readonly starsMaterial: THREE.PointsMaterial;

  private nextSpawnSec = 0;
  private opacity = 1;

  constructor() {
    this.group = new THREE.Group();

    const built = this.buildStaticStars();
    this.stars = built.points;
    this.starsMaterial = built.material;
    this.group.add(this.stars);

    this.buildMeteorPool();
  }

  setOpacity(opacity: number) {
    this.opacity = opacity;
    this.starsMaterial.opacity = opacity * 0.9;
    this.stars.visible = opacity > 0.001;
    for (const m of this.meteors) {
      if (!m.active) {
        m.line.visible = false;
        continue;
      }
      (m.line.material as THREE.LineBasicMaterial).opacity = opacity;
      m.line.visible = opacity > 0.001;
    }
  }

  update(nowSec: number, dt: number) {
    if (this.opacity < 0.001) {
      // Still advance the spawn schedule so meteors don't all rush back at once
      // when the panel closes. Cheap.
      if (nowSec >= this.nextSpawnSec) this.scheduleNext(nowSec);
      return;
    }

    if (nowSec >= this.nextSpawnSec) {
      this.spawnMeteor();
      this.scheduleNext(nowSec);
    }

    for (const m of this.meteors) {
      if (!m.active) continue;
      m.position.addScaledVector(m.velocity, dt);
      if (m.position.y < -3 || m.position.x < -8) {
        m.active = false;
        m.line.visible = false;
        continue;
      }
      const positions = (m.line.geometry as THREE.BufferGeometry).attributes
        .position as THREE.BufferAttribute;
      const tailScale = -m.length / m.speed;
      positions.setXYZ(0, m.position.x, m.position.y, m.position.z);
      positions.setXYZ(
        1,
        m.position.x + m.velocity.x * tailScale,
        m.position.y + m.velocity.y * tailScale,
        m.position.z + m.velocity.z * tailScale
      );
      positions.needsUpdate = true;
    }
  }

  dispose() {
    this.starsMaterial.dispose();
    this.stars.geometry.dispose();
    for (const m of this.meteors) {
      m.line.geometry.dispose();
      (m.line.material as THREE.Material).dispose();
    }
    if (this.group.parent) this.group.parent.remove(this.group);
  }

  private buildStaticStars(): { points: THREE.Points; material: THREE.PointsMaterial } {
    const count = STAR_CONFIG.staticStarCount.rose;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const head = new THREE.Color(STAR_CONFIG.meteorHeadColor);
    const baseR = STAR_CONFIG.roseStarSphereRadius;
    const jitter = STAR_CONFIG.roseStarRadiusJitter;

    // Uniform distribution on a sphere surface — inverse-CDF on cos(phi) so
    // stars don't bunch at the poles. Tiny radial jitter gives the shell depth.
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = baseR * (1 + (Math.random() - 0.5) * 2 * jitter);
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      // Per-star brightness 0.45–1.0 keeps the sky from looking like a uniform
      // grid. Multiplied into the head color so all stars stay warm-white-ish.
      const brightness = 0.45 + Math.random() * 0.55;
      colors[i * 3]     = head.r * brightness;
      colors[i * 3 + 1] = head.g * brightness;
      colors[i * 3 + 2] = head.b * brightness;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      // Fixed pixel size — distant stars should look distant, not perspective-
      // shrunk based on which side of the sphere you're orbiting.
      size: 1.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: false,
      depthWrite: false,
    });
    const points = new THREE.Points(geom, material);
    points.frustumCulled = false;
    return { points, material };
  }

  private buildMeteorPool() {
    const headColor = new THREE.Color(STAR_CONFIG.meteorHeadColor);
    const tailColor = new THREE.Color(STAR_CONFIG.meteorTailColor);
    const colors = new Float32Array([
      headColor.r, headColor.g, headColor.b,
      tailColor.r, tailColor.g, tailColor.b,
    ]);
    for (let i = 0; i < STAR_CONFIG.meteorPoolSize.rose; i++) {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      geom.setAttribute('color', new THREE.BufferAttribute(colors.slice(), 3));
      const material = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 1,
        depthWrite: false,
      });
      const line = new THREE.Line(geom, material);
      line.visible = false;
      line.frustumCulled = false;
      this.group.add(line);
      this.meteors.push({
        line,
        active: false,
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        speed: 0,
        length: 0,
      });
    }
  }

  private scheduleNext(nowSec: number) {
    const [min, max] = STAR_CONFIG.meteorSpawnIntervalRange;
    this.nextSpawnSec = nowSec + min + Math.random() * (max - min);
  }

  private spawnMeteor() {
    const meteor = this.meteors.find((m) => !m.active);
    if (!meteor) return;

    // Spawn above-right of the rose, behind it on the z-axis so it reads as
    // atmosphere rather than foreground.
    meteor.position.set(
      4 + Math.random() * 2,
      4 + Math.random() * 2,
      -3 - Math.random() * 5
    );

    const baseAngle = STAR_CONFIG.meteorAngleDegrees * DEG_TO_RAD;
    const jitter =
      (Math.random() - 0.5) * 2 * STAR_CONFIG.meteorAngleJitterDegrees * DEG_TO_RAD;
    const angle = baseAngle + jitter;

    const [sMin, sMax] = STAR_CONFIG.meteorSpeedRangeWorld;
    const speed = sMin + Math.random() * (sMax - sMin);
    meteor.speed = speed;
    meteor.velocity.set(Math.cos(angle) * speed, Math.sin(angle) * speed, 0);

    const [lMin, lMax] = STAR_CONFIG.meteorLengthRangeWorld;
    meteor.length = lMin + Math.random() * (lMax - lMin);

    meteor.active = true;
    meteor.line.visible = true;
    (meteor.line.material as THREE.LineBasicMaterial).opacity = this.opacity;
  }
}
