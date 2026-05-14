import { LitElement, html, PropertyValues } from 'lit';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import styles from './golden-rose.styles';
import { SectionPanel } from './section-panel';
import { RoseText } from './rose-text';
import truthStatement from '../../docs/sections/truth-statement.txt?raw';

// Active petal slots in the petals array — preserved as test contract:
// clickPetal(0) → about, (3) → case-studies, (6) → poetry.
const ACTIVE_PETAL_INDICES = [0, 3, 6];
const SECTIONS = ['about', 'case-studies', 'poetry'];
const ROSE_MODEL_URL = '/models/rose_separated.glb';

// Test API interface
interface RoseTestAPI {
  getPetalCount: () => number;
  getState: () => string;
  getActiveSection: () => string | null;
  getRoseRotation: () => { x: number; y: number; z: number };
  getCameraPosition: () => { x: number; y: number; z: number };
  getHoveredPetal: () => number | null;
  getActivePetalIndices: () => number[];
  getControlsConfig: () => { minDistance: number; maxDistance: number; enablePan: boolean };
  orbitCamera: (azimuth: number, polar: number) => void;
  clickPetal: (index: number) => void;
  getPetalPositions: () => Array<{ x: number; y: number; z: number }>;
  getAnimationFPS: () => number;
  closeContent: () => void;
  getTruthTextOpacity: () => number;
  getTruthTextWorldPosition: () => { x: number; y: number; z: number };
}

export class GoldenRoseElement extends LitElement {
  static styles = [styles];

  static properties = {
    loading: { type: Boolean, state: true },
    roseState: { type: String, state: true },
    activeSection: { type: String, state: true },
  };

  private _loading = true;
  private _roseState: 'idle' | 'blooming' | 'open' | 'closing' = 'idle';
  private _activeSection: string | null = null;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private petals: THREE.Mesh[] = [];
  private roseGroup!: THREE.Group;
  private animationFrameId: number | null = null;

  // Raycasting for hover/click detection
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private hoveredPetalIndex: number | null = null;

  // Animation tracking
  private lastFrameTime = 0;
  private frameCount = 0;
  private fps = 60;
  private bloomProgress = 0;
  private readonly BLOOM_DURATION = 1000; // ms
  private readonly BLOOM_SPREAD = 0.64;
  private readonly BLOOM_FLARE = Math.PI / 0.875; // ~206° (4× of π/3.5)
  private readonly BLOOM_LIFT = 0.04;
  private bloomCenter = new THREE.Vector3();

  // Camera fly-to: on click the camera flies from its current position to a
  // top-down view of the bloom. On close it flies back to where it started.
  private camFlyStartPos: THREE.Vector3 | null = null;
  private camFlyTargetPos: THREE.Vector3 | null = null;
  private camFlyStartTarget: THREE.Vector3 | null = null;
  private camFlyTargetTarget: THREE.Vector3 | null = null;
  private readonly TOPDOWN_DISTANCE = 1.6;
  private readonly TOPDOWN_TILT = 0.18; // slight Z offset so lookAt isn't degenerate

  // React root mounted into the shadow-DOM `#content-mount` div. Renders
  // the active section's MDX module as its children change.
  private _reactRoot: Root | null = null;

  // Truth statement rendered as an in-scene Troika SDF text mesh. Lives in
  // `scene` (not `roseGroup`) so it doesn't spin with the idle rotation.
  // Bloom progress drives its opacity in animate().
  private roseText: RoseText | null = null;
  // Fraction of the bloom over which the text fades. 0.4 = fully gone by the
  // time the bloom is 40% complete, so the panel never lands on top of text.
  private readonly TRUTH_FADE_RATIO = 0.4;

  // Each petal's geometry is baked in world-space coords with pivot at origin
  // (Blender's "Separate by Loose Parts" doesn't relocate per-piece origins).
  // We store its centroid + radial/tangent so the bloom can flare around the
  // petal's own center instead of the model origin.
  private originalPetalTransforms: Array<{
    center: THREE.Vector3;
    radial: THREE.Vector3;
    tangent: THREE.Vector3;
  }> = [];

  get loading() {
    return this._loading;
  }
  set loading(val: boolean) {
    const oldVal = this._loading;
    this._loading = val;
    this.requestUpdate('loading', oldVal);
  }

  get roseState() {
    return this._roseState;
  }
  set roseState(val: 'idle' | 'blooming' | 'open' | 'closing') {
    const oldVal = this._roseState;
    this._roseState = val;
    this.requestUpdate('roseState', oldVal);
  }

  get activeSection() {
    return this._activeSection;
  }
  set activeSection(val: string | null) {
    const oldVal = this._activeSection;
    this._activeSection = val;
    this.requestUpdate('activeSection', oldVal);
  }

  connectedCallback() {
    super.connectedCallback();
    // Expose test API
    (window as any).__ROSE_TEST_API__ = this.createTestAPI();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.cleanup();
    this._reactRoot?.unmount();
    this._reactRoot = null;
    delete (window as any).__ROSE_TEST_API__;
  }

  private createTestAPI(): RoseTestAPI {
    return {
      getPetalCount: () => this.petals.length,
      getState: () => this.roseState,
      getActiveSection: () => this.activeSection,
      getRoseRotation: () => ({
        x: this.roseGroup?.rotation.x ?? 0,
        y: this.roseGroup?.rotation.y ?? 0,
        z: this.roseGroup?.rotation.z ?? 0,
      }),
      getCameraPosition: () => ({
        x: this.camera?.position.x ?? 0,
        y: this.camera?.position.y ?? 0,
        z: this.camera?.position.z ?? 0,
      }),
      getHoveredPetal: () => this.hoveredPetalIndex,
      getActivePetalIndices: () => [...ACTIVE_PETAL_INDICES],
      getControlsConfig: () => ({
        minDistance: this.controls?.minDistance ?? 0,
        maxDistance: this.controls?.maxDistance ?? 0,
        enablePan: this.controls?.enablePan ?? false,
      }),
      orbitCamera: (azimuthDelta: number, polarDelta: number) => {
        if (this.controls) {
          // Programmatically rotate by changing spherical coordinates
          const spherical = new THREE.Spherical();
          spherical.setFromVector3(this.camera.position);
          spherical.theta += azimuthDelta;
          spherical.phi += polarDelta;
          // Clamp phi to avoid flipping
          spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));
          this.camera.position.setFromSpherical(spherical);
          this.camera.lookAt(this.controls.target);
          this.controls.update();
        }
      },
      clickPetal: (index: number) => {
        this.handlePetalClick(index);
      },
      getPetalPositions: () => {
        return this.petals.map((petal) => ({
          x: petal.position.x,
          y: petal.position.y,
          z: petal.position.z,
        }));
      },
      getAnimationFPS: () => this.fps,
      closeContent: () => {
        this.closeSection();
      },
      getTruthTextOpacity: () => this.roseText?.getOpacity() ?? 0,
      getTruthTextWorldPosition: () =>
        this.roseText?.getWorldPosition() ?? { x: 0, y: 0, z: 0 },
    };
  }

  firstUpdated(_changedProperties: PropertyValues) {
    super.firstUpdated(_changedProperties);
    const canvas = this.renderRoot.querySelector('canvas') as HTMLCanvasElement;
    if (canvas) {
      this.initThreeJS(canvas);
      this.createRose();
      this.animate();
    }
    const mount = this.renderRoot.querySelector('#content-mount') as HTMLElement | null;
    if (mount) {
      this._reactRoot = createRoot(mount);
      this._reactRoot.render(createElement(SectionPanel, { section: this.activeSection }));
    }
  }

  updated(changed: PropertyValues) {
    super.updated(changed);
    if (changed.has('activeSection') && this._reactRoot) {
      this._reactRoot.render(createElement(SectionPanel, { section: this.activeSection }));
    }
  }

  private initThreeJS(canvas: HTMLCanvasElement) {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a08);

    // Camera - positioned for a nice view of the rose
    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 1.7, 2.4);
    this.camera.lookAt(0, 1.3, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7);
    this.scene.add(directionalLight);

    const backLight = new THREE.DirectionalLight(0xd4af37, 0.3);
    backLight.position.set(-5, 5, -5);
    this.scene.add(backLight);

    // Orbit Controls
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 1.4;
    this.controls.maxDistance = 8;
    this.controls.enablePan = false;
    this.controls.autoRotate = false;
    this.controls.target.set(0, 1.3, 0);

    // Handle resize
    window.addEventListener('resize', this.handleResize);

    // Handle mouse move for hover detection
    canvas.addEventListener('mousemove', this.handleMouseMove);
    canvas.addEventListener('touchmove', this.handleTouchMove);

    // Handle click/tap for petal selection
    canvas.addEventListener('click', this.handleCanvasClick);
    canvas.addEventListener('touchstart', this.handleCanvasTouch);
  }

  private handleMouseMove = (event: MouseEvent) => {
    const canvas = event.target as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.updateHover();
  };

  private handleTouchMove = (event: TouchEvent) => {
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      const canvas = event.target as HTMLCanvasElement;
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
      this.updateHover();
    }
  };

  private updateHover() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.petals);

    if (intersects.length > 0) {
      const hitPetal = intersects[0].object as THREE.Mesh;
      const petalIndex = hitPetal.userData.index;

      if (this.hoveredPetalIndex !== petalIndex) {
        // Unhighlight previous
        if (this.hoveredPetalIndex !== null) {
          this.unhighlightPetal(this.hoveredPetalIndex);
        }
        // Highlight new
        this.hoveredPetalIndex = petalIndex;
        this.highlightPetal(petalIndex);
      }
    } else if (this.hoveredPetalIndex !== null) {
      this.unhighlightPetal(this.hoveredPetalIndex);
      this.hoveredPetalIndex = null;
    }
  }

  private highlightPetal(index: number) {
    const petal = this.petals[index];
    const material = petal.material as THREE.MeshStandardMaterial;
    const isActive = petal.userData.isActive;

    material.emissive.setHex(isActive ? 0x6b5a1f : 0x2a250d);
    material.emissiveIntensity = isActive ? 0.3 : 0.15;

    // Change cursor if active petal
    if (isActive && this.renderer) {
      this.renderer.domElement.style.cursor = 'pointer';
    }
  }

  private unhighlightPetal(index: number) {
    const petal = this.petals[index];
    const material = petal.material as THREE.MeshStandardMaterial;
    const isActive = petal.userData.isActive;

    material.emissive.setHex(isActive ? 0x3d2f0a : 0x000000);
    material.emissiveIntensity = isActive ? 0.1 : 0;

    if (this.renderer) {
      this.renderer.domElement.style.cursor = 'default';
    }
  }

  private handlePetalClick(petalIndex: number) {
    const petal = this.petals[petalIndex];
    if (!petal || !petal.userData.isActive) {
      return; // Only respond to active petals
    }

    const section = petal.userData.section;
    if (!section) return;

    // Don't allow re-clicking while animating
    if (this.roseState === 'blooming' || this.roseState === 'closing') {
      return;
    }

    this.beginCameraFlyToTop();

    this.activeSection = section;
    this.roseState = 'blooming';
    this.bloomProgress = 0;

    this.dispatchEvent(
      new CustomEvent('section-selected', {
        detail: { section },
        bubbles: true,
        composed: true,
      })
    );
  }

  // Start a camera fly to a top-down view of the bloom. Driven by the bloom
  // progress in animate() so it lands exactly when the bloom finishes.
  private beginCameraFlyToTop() {
    if (!this.camera || !this.controls) return;
    const bloomWorld = this.bloomCenter.clone();
    this.camFlyStartPos = this.camera.position.clone();
    this.camFlyTargetPos = bloomWorld.clone().add(
      new THREE.Vector3(0, this.TOPDOWN_DISTANCE, this.TOPDOWN_TILT)
    );
    this.camFlyStartTarget = this.controls.target.clone();
    this.camFlyTargetTarget = bloomWorld;
    this.controls.enabled = false;
  }

  // Reverse the camera fly, returning to where the camera was at click time.
  private beginCameraFlyBack() {
    if (!this.camera || !this.controls) return;
    if (!this.camFlyStartPos || !this.camFlyTargetPos) return;
    const start = this.camFlyStartPos;
    const startT = this.camFlyStartTarget!;
    this.camFlyStartPos = this.camera.position.clone();
    this.camFlyTargetPos = start;
    this.camFlyStartTarget = this.controls.target.clone();
    this.camFlyTargetTarget = startT;
    this.controls.enabled = false;
  }

  // Interpolate camera position + orbit target between the captured anchors.
  private updateCameraFly(t: number) {
    if (!this.camFlyStartPos || !this.camFlyTargetPos || !this.camFlyStartTarget || !this.camFlyTargetTarget) return;
    this.camera.position.lerpVectors(this.camFlyStartPos, this.camFlyTargetPos, t);
    this.controls.target.lerpVectors(this.camFlyStartTarget, this.camFlyTargetTarget, t);
    this.camera.lookAt(this.controls.target);
  }

  private closeSection() {
    if (this.roseState !== 'open') {
      return;
    }

    this.beginCameraFlyBack();
    this.roseState = 'closing';
    this.bloomProgress = 1; // Start from fully open

    this.dispatchEvent(
      new CustomEvent('section-closed', {
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleCanvasClick = (event: MouseEvent) => {
    // Update mouse position
    const canvas = event.target as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Raycast to find clicked petal
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.petals);

    if (intersects.length > 0) {
      const hitPetal = intersects[0].object as THREE.Mesh;
      this.handlePetalClick(hitPetal.userData.index);
    }
  };

  private handleCanvasTouch = (event: TouchEvent) => {
    if (event.touches.length !== 1) return;

    const touch = event.touches[0];
    const canvas = event.target as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;

    // Raycast to find touched petal
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.petals);

    if (intersects.length > 0) {
      const hitPetal = intersects[0].object as THREE.Mesh;
      this.handlePetalClick(hitPetal.userData.index);
    }
  };

  private createRose() {
    this.roseGroup = new THREE.Group();
    this.scene.add(this.roseGroup);

    const loader = new GLTFLoader();
    loader.load(
      ROSE_MODEL_URL,
      (gltf) => this.onRoseLoaded(gltf.scene),
      undefined,
      (error) => {
        console.error('Error loading rose model:', error);
        this.loading = false;
      }
    );
  }

  private onRoseLoaded(model: THREE.Group) {
    // Apply final scale at the model root, then bake each mesh's accumulated
    // world transform into its geometry so every mesh ends up with identity
    // transforms in `roseGroup`. After this, petal-local frame == world frame
    // — the bloom math (tangent axes, radial directions) operates on the
    // same coordinate space the petal's vertices live in.
    model.scale.set(1.5, 1.5, 1.5);
    model.updateMatrixWorld(true);

    const goldMaterial = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.9,
      roughness: 0.3,
      side: THREE.DoubleSide,
    });

    const petalMeshes: THREE.Mesh[] = [];
    const allMeshes: THREE.Mesh[] = [];
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = goldMaterial.clone();
        allMeshes.push(child);
        if (child.name.startsWith('petal_')) {
          petalMeshes.push(child);
        }
      }
    });
    petalMeshes.sort((a, b) => a.name.localeCompare(b.name));

    for (const m of allMeshes) {
      m.updateMatrixWorld(true);
      const flatGeom = m.geometry.clone();
      flatGeom.applyMatrix4(m.matrixWorld);
      m.geometry = flatGeom;
      m.position.set(0, 0, 0);
      m.quaternion.identity();
      m.scale.set(1, 1, 1);
      if (m.parent) m.parent.remove(m);
      this.roseGroup.add(m);
    }

    const activePetals = this.pickActivePetals(petalMeshes);
    const arranged = this.arrangePetals(petalMeshes, activePetals);

    const centers = arranged.map((p) => {
      const c = new THREE.Vector3();
      new THREE.Box3().setFromObject(p).getCenter(c);
      return c;
    });
    this.bloomCenter.set(0, 0, 0);
    centers.forEach((c) => this.bloomCenter.add(c));
    this.bloomCenter.divideScalar(centers.length);

    arranged.forEach((petal, i) => {
      const activeSlot = ACTIVE_PETAL_INDICES.indexOf(i);
      const isActive = activeSlot !== -1;
      petal.userData = {
        index: i,
        isActive,
        section: isActive ? SECTIONS[activeSlot] : null,
      };
      if (isActive) {
        const mat = petal.material as THREE.MeshStandardMaterial;
        mat.emissive.setHex(0x6b4f1a);
        mat.emissiveIntensity = 0.25;
      }
      this.petals.push(petal);

      const center = centers[i];
      petal.geometry.translate(-center.x, -center.y, -center.z);
      petal.position.copy(center);

      const dx = center.x - this.bloomCenter.x;
      const dz = center.z - this.bloomCenter.z;
      const len = Math.hypot(dx, dz) || 1e-6;
      const radial = new THREE.Vector3(dx / len, 0, dz / len);
      const tangent = new THREE.Vector3(-radial.z, 0, radial.x);

      this.originalPetalTransforms.push({ center: center.clone(), radial, tangent });
    });

    if (this.controls) {
      this.controls.target.copy(this.bloomCenter);
      this.camera.lookAt(this.bloomCenter);
    }

    // Reveal the rose first — any Troika failure cannot keep the shimmer up.
    this.loading = false;

    try {
      this.roseText = new RoseText(truthStatement, this.bloomCenter);
      this.scene.add(this.roseText.mesh);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[golden-rose] failed to create truth text mesh:', err);
    }
  }

  // Pick 3 substantial outer petals spaced ~120° apart around the bloom axis.
  // Drops thin single-shell petals (the GLB has 21 of those — they render
  // paper-thin and look "invisible with an outline" from many angles).
  private pickActivePetals(petals: THREE.Mesh[]): THREE.Mesh[] {
    const data = petals.map((mesh) => {
      const center = new THREE.Vector3();
      new THREE.Box3().setFromObject(mesh).getCenter(center);
      const verts = mesh.geometry.getAttribute('position')?.count ?? 0;
      return { mesh, center, verts };
    });

    const bloomCenter = new THREE.Vector3();
    data.forEach((d) => bloomCenter.add(d.center));
    bloomCenter.divideScalar(data.length);

    const enriched = data.map((d) => {
      const dx = d.center.x - bloomCenter.x;
      const dz = d.center.z - bloomCenter.z;
      return {
        mesh: d.mesh,
        verts: d.verts,
        radial: Math.hypot(dx, dz),
        angle: Math.atan2(dz, dx),
      };
    });

    enriched.sort((a, b) => b.radial - a.radial);
    let outer = enriched.slice(0, Math.floor(enriched.length / 2));

    // Drop the thinnest 35% by vert count — those are the single-shell sheets.
    outer.sort((a, b) => b.verts - a.verts);
    outer = outer.slice(0, Math.max(3, Math.floor(outer.length * 0.65)));

    outer.sort((a, b) => a.angle - b.angle);
    const step = outer.length / 3;
    return [0, Math.floor(step), Math.floor(step * 2)].map((i) => outer[i].mesh);
  }

  // Place active petals at ACTIVE_PETAL_INDICES so the test contract
  // (clickPetal(0)→about, etc.) holds; fill the rest with the remaining petals.
  private arrangePetals(
    all: THREE.Mesh[],
    active: THREE.Mesh[]
  ): THREE.Mesh[] {
    const activeSet = new Set(active);
    const nonActive = all.filter((p) => !activeSet.has(p));
    const arranged: THREE.Mesh[] = new Array(all.length);
    ACTIVE_PETAL_INDICES.forEach((slot, k) => {
      arranged[slot] = active[k];
    });
    let n = 0;
    for (let i = 0; i < arranged.length; i++) {
      if (!arranged[i]) arranged[i] = nonActive[n++];
    }
    return arranged;
  }

  private handleResize = () => {
    if (!this.camera || !this.renderer) return;

    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private animate = () => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    // Track FPS
    const now = performance.now();
    this.frameCount++;
    if (now - this.lastFrameTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFrameTime = now;
    }

    // Update controls
    this.controls?.update();

    if (this.roseState === 'blooming') {
      this.bloomProgress += 16 / this.BLOOM_DURATION;
      if (this.bloomProgress >= 1) {
        this.bloomProgress = 1;
        this.roseState = 'open';
        if (this.controls) this.controls.enabled = true; // user can orbit at top-down
      }
      const eased = this.easeOutCubic(this.bloomProgress);
      this.updatePetalPositions(eased);
      this.updateCameraFly(eased);
    }

    if (this.roseState === 'closing') {
      this.bloomProgress -= 16 / this.BLOOM_DURATION;
      if (this.bloomProgress <= 0) {
        this.bloomProgress = 0;
        this.roseState = 'idle';
        this.activeSection = null;
        if (this.controls) this.controls.enabled = true;
      }
      const eased = this.easeOutCubic(this.bloomProgress);
      this.updatePetalPositions(eased);
      // During close, bloomProgress goes 1→0 so we want the fly-back to track
      // (1 - bloomProgress)' worth — but beginCameraFlyBack already swapped
      // start/target, so we just lerp by (1 - eased).
      this.updateCameraFly(1 - eased);
    }

    // Gentle rotation when idle and no user interaction
    if (this.roseState === 'idle' && this.roseGroup && !this.controls?.enableRotate) {
      this.roseGroup.rotation.y += 0.002;
    }

    if (this.roseState === 'idle') {
      this.bobActivePetals(now);
    }

    if (this.roseText) {
      // One formula across all states: idle→1, blooming/closing→linear,
      // open→0. bloomProgress lives in [0,1] for all of them.
      const fade = Math.min(1, Math.max(0, this.bloomProgress / this.TRUTH_FADE_RATIO));
      this.roseText.update(this.camera, 1 - fade);
    }

    this.renderer?.render(this.scene, this.camera);
  };

  // Soft "I'm clickable" bounce + glow pulse on the active petals while idle.
  // Bounce uses |sin| so the petal lifts off its rest position and lands again,
  // never sinking below it. Glow pulses on the same clock with a phase offset.
  private bobActivePetals(now: number) {
    const t = now * 0.0016;
    ACTIVE_PETAL_INDICES.forEach((idx, slot) => {
      const petal = this.petals[idx];
      const o = this.originalPetalTransforms[idx];
      if (!petal || !o) return;

      const phase = slot * (Math.PI * 2 / 3);
      const bounce = Math.abs(Math.sin(t + phase)) * 0.032;
      petal.position.copy(o.center);
      petal.position.y += bounce;

      const mat = petal.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.18 + Math.sin(t * 1.1 + phase) * 0.08;
    });
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private updatePetalPositions(progress: number) {
    this.petals.forEach((petal, index) => {
      const o = this.originalPetalTransforms[index];
      if (!o) return;

      // Geometry is re-centered at load so each petal's local origin = its
      // centroid. Rotating `petal.quaternion` therefore pivots the petal
      // around its own centroid with no translation compensation needed.
      petal.quaternion.setFromAxisAngle(o.tangent, this.BLOOM_FLARE * progress);
      petal.position.copy(o.center);
      petal.position.x += o.radial.x * this.BLOOM_SPREAD * progress;
      petal.position.z += o.radial.z * this.BLOOM_SPREAD * progress;
      petal.position.y += this.BLOOM_LIFT * progress;
    });
  }

  private cleanup() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.handleResize);

    // Remove canvas event listeners
    const canvas = this.renderer?.domElement;
    if (canvas) {
      canvas.removeEventListener('mousemove', this.handleMouseMove);
      canvas.removeEventListener('touchmove', this.handleTouchMove);
      canvas.removeEventListener('click', this.handleCanvasClick);
      canvas.removeEventListener('touchstart', this.handleCanvasTouch);
    }

    // Dispose controls
    this.controls?.dispose();

    // Dispose Three.js resources
    this.petals.forEach((petal) => {
      petal.geometry.dispose();
      (petal.material as THREE.Material).dispose();
    });
    this.roseText?.dispose();
    this.roseText = null;
    this.renderer?.dispose();
  }

  private handleCloseClick = () => {
    this.closeSection();
  };

  render() {
    return html`
      ${this.loading
        ? html`<div class="loading-shimmer" data-testid="loading-shimmer"></div>`
        : null}
      <canvas data-testid="rose-canvas"></canvas>
      <div id="content-root" class="${this.roseState === 'open' ? 'visible' : ''}">
        <button
          class="close-button"
          data-testid="close-button"
          @click=${this.handleCloseClick}
          aria-label="Close content"
        >
          ×
        </button>
        <div id="content-mount" class="content-body" data-testid="content-body"></div>
      </div>
    `;
  }
}

customElements.define('golden-rose', GoldenRoseElement);

declare global {
  interface HTMLElementTagNameMap {
    'golden-rose': GoldenRoseElement;
  }
}
