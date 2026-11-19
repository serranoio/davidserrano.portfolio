import { LitElement, html, type PropertyValues } from 'lit';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import styles from './golden-rose.styles';
import { PoemPanel } from './poem-panel';
import { RoseText } from './rose-text';
import { MeteorField } from './meteor-field';
import { SkyDome } from './sky-dome';
import { breath } from './breath';
import { createPetalLook, createPetalMaterial, setPetalGold } from './petal-material';
import { COLOR_TOKEN, readColorToken } from '../design-tokens';
import {
  BREATH_MOTION,
  CAMERA,
  FOLIAGE,
  GOLD,
  HINT,
  LIGHT,
  OFFER,
  PETAL_PAIR_DISTANCE,
} from './rose-look';
import { ACTIVE_PETAL_INDICES, SECTIONS, SECTION_TITLES } from './petal-sections';
import truthStatement from '../../docs/sections/truth-statement.txt?raw';

const ROSE_MODEL_URL = '/models/rose_separated.glb';
// The light's elevation wanders on a period unrelated to its azimuth so the
// path never visibly repeats.
const LIGHT_ELEVATION_PERIOD_RATIO = 0.62;

// Test API interface
interface RoseTestAPI {
  getPetalCount: () => number;
  getState: () => string;
  getActiveSection: () => string | null;
  getRoseRotation: () => { x: number; y: number; z: number };
  getCameraPosition: () => { x: number; y: number; z: number };
  getHoveredPetal: () => number | null;
  getActivePetalIndices: () => number[];
  getControlsConfig: () => { minDistance: number; maxDistance: number; enablePan: boolean; touchesOne: number | null; enabled: boolean };
  orbitCamera: (azimuth: number, polar: number) => void;
  clickPetal: (index: number) => void;
  clickPetalBySection: (sectionId: string) => void;
  getPetalIndexForSection: (sectionId: string) => number | null;
  getPetalPositions: () => Array<{ x: number; y: number; z: number }>;
  getAnimationFPS: () => number;
  closeContent: () => void;
  getTruthTextOpacity: () => number;
  getTruthTextWorldPosition: () => { x: number; y: number; z: number };
  getTruthParagraphCount: () => number;
  getTruthScrollOffset: () => number;
  getTruthScrollTarget: () => number;
  getTruthMaxScrollOffset: () => number;
  getTruthActiveParagraphScreenBounds: () => { left: number; right: number; top: number; bottom: number } | null;
  projectPetalToScreen: (index: number) => { x: number; y: number } | null;
  raycastAtCanvas: (x: number, y: number) => { index: number; isActive: boolean; section: string | null } | null;
  setAutoRotate: (enabled: boolean) => void;
}

export class GoldenRoseElement extends LitElement {
  static styles = [styles];

  static properties = {
    loading: { type: Boolean, state: true },
    roseState: { type: String, state: true },
    activeSection: { type: String, state: true },
    coarsePointer: { type: Boolean, state: true },
    hintSeen: { type: Boolean, state: true },
    hoveredTitle: { type: String, state: true },
  };

  private _loading = true;
  private _roseState: 'idle' | 'blooming' | 'open' | 'closing' = 'idle';
  private _activeSection: string | null = null;
  private _coarsePointer = false;
  private _hintSeen = false;
  private _hoveredTitle: string | null = null;
  // The last title shown stays in the label while it fades out.
  private lastTitle = '';

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
  // Bloom progress drives its opacity in animationLoop().
  private roseText: RoseText | null = null;
  // Fraction of the bloom over which the text fades. 0.4 = fully gone by the
  // time the bloom is 40% complete, so the panel never lands on top of text.
  private readonly TRUTH_FADE_RATIO = 0.4;

  // Scroll-driven rose rotation: page movement adds a yaw impulse that decays
  // each frame, giving a momentum feel on top of the idle auto-spin.
  private scrollDeltaYaw = 0;
  private readonly SCROLL_YAW_DECAY = 0.88;
  private readonly SCROLL_YAW_SENSITIVITY = 0.0006;

  // Test hook: when true, suppress the idle auto-spin so e2e tests can
  // project petal positions and click them deterministically.
  private autoRotateEnabled = true;

  // Shooting stars in the rose's scene. Mirrors the welcome canvas visually
  // so the two sections feel like the same sky.
  private meteorField: MeteorField | null = null;
  private skyDome: SkyDome | null = null;

  // The one warm light. Drifts slowly and swells with the shared breath.
  private keyLight: THREE.DirectionalLight | null = null;

  // Per-petal offer level (0 = living flesh at rest, 1 = hovered). It sets
  // both how gold the petal is and how far it lifts. Hover, the breath
  // ripple and the pointer's nearness all feed it.
  private goldLevels: number[] = [];
  // A sheet mesh and its rim-strip mesh are one petal: `petalGroups` lists
  // the mesh indices of each, `petalGroupOf` maps a mesh back to its group.
  private petalGroups: number[][] = [];
  private petalGroupOf: number[] = [];
  private offerTargets: number[] = [];
  // Groups offering themselves this breath, in the order they take turns.
  private rippleGroups: number[] = [];
  private rippleCycle = -1;
  private rippleAngle = -OFFER.rippleArcDegrees;
  // Pointer position in canvas CSS pixels while a fine pointer is over the
  // scene; null otherwise.
  private pointerPx: THREE.Vector2 | null = null;
  private prevFrameTime = 0;

  // Pointer type selects text layout and paragraph-button visibility.
  // Re-evaluate on change for convertible devices; one-finger scrolling
  // remains native regardless of the primary pointer type.
  private coarseQuery: MediaQueryList | null = null;

  private sceneViewport: HTMLElement | null = null;
  private viewportObserver: ResizeObserver | null = null;
  private previousScrollProgress: number | null = null;

  // Each petal's geometry is baked in world-space coords with pivot at origin
  // (Blender's "Separate by Loose Parts" doesn't relocate per-piece origins).
  // We store its centroid + radial/tangent so the bloom can flare around the
  // petal's own center instead of the model origin.
  private originalPetalTransforms: Array<{
    center: THREE.Vector3;
    radial: THREE.Vector3;
    tangent: THREE.Vector3;
    // 0 at the heart of the flower, 1 at its outermost petal.
    reach: number;
    // How much of the breath this petal takes (rim > heart) and how many
    // seconds it trails the heart of the flower.
    breathWeight: number;
    breathLag: number;
  }> = [];

  get hoveredTitle() {
    return this._hoveredTitle;
  }

  set hoveredTitle(val: string | null) {
    const oldVal = this._hoveredTitle;
    if (oldVal === val) return;
    this._hoveredTitle = val;
    if (val !== null) this.lastTitle = val;
    this.requestUpdate('hoveredTitle', oldVal);
  }

  get hintSeen() {
    return this._hintSeen;
  }
  set hintSeen(val: boolean) {
    const oldVal = this._hintSeen;
    this._hintSeen = val;
    this.requestUpdate('hintSeen', oldVal);
  }

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

  get coarsePointer() {
    return this._coarsePointer;
  }
  set coarsePointer(val: boolean) {
    const oldVal = this._coarsePointer;
    this._coarsePointer = val;
    this.requestUpdate('coarsePointer', oldVal);
  }

  connectedCallback() {
    super.connectedCallback();
    // Reserve the reading distance before the model loads so loading cannot
    // move the writing section. Stable viewport units avoid toolbar-driven
    // changes to the poem's scroll distance on mobile.
    const steps = Math.max(0, RoseText.parseParagraphs(truthStatement).length - 1);
    this.style.setProperty('--poem-scroll-distance', `${steps * 40}svh`);
    // Storage can be unavailable (private mode, blocked site data); the hint
    // then simply shows again next time.
    try {
      this.hintSeen = window.sessionStorage.getItem(HINT.storageKey) === '1';
    } catch {
      this.hintSeen = false;
    }
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
        touchesOne: this.controls?.touches.ONE ?? null,
        enabled: this.controls?.enabled ?? false,
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
      clickPetalBySection: (sectionId: string) => {
        const idx = this.petals.findIndex(
          (p) => p.userData?.section === sectionId
        );
        if (idx !== -1) this.handlePetalClick(idx);
      },
      getPetalIndexForSection: (sectionId: string) => {
        const idx = this.petals.findIndex(
          (p) => p.userData?.section === sectionId
        );
        return idx === -1 ? null : idx;
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
      getTruthParagraphCount: () => this.roseText?.getParagraphCount() ?? 0,
      getTruthScrollOffset: () => this.roseText?.getScrollOffset() ?? 0,
      getTruthScrollTarget: () => this.roseText?.getScrollTarget() ?? 0,
      getTruthMaxScrollOffset: () => this.roseText?.getMaxScrollOffset() ?? 0,
      getTruthActiveParagraphScreenBounds: () =>
        this.roseText?.getActiveParagraphScreenBounds(this.camera, {
          width: window.innerWidth,
          height: window.innerHeight,
        }) ?? null,
      projectPetalToScreen: (index: number) => {
        const petal = this.petals[index];
        if (!petal || !this.camera || !this.renderer) return null;
        // World position → NDC via the live camera matrix, then NDC → canvas
        // pixels using the actual renderer size. This is what raycasting uses
        // internally; if the projection lands off-canvas, the petal isn't
        // visible from the current camera angle.
        // Force the rose's world matrix to refresh so projection uses the
        // current rotation, not last-frame rotation.
        this.roseGroup?.updateMatrixWorld(true);
        const ndc = new THREE.Vector3();
        petal.getWorldPosition(ndc);
        ndc.project(this.camera);
        const size = new THREE.Vector2();
        this.renderer.getSize(size);
        return {
          x: ((ndc.x + 1) / 2) * size.x,
          y: ((1 - ndc.y) / 2) * size.y,
        };
      },
      setAutoRotate: (enabled: boolean) => {
        this.autoRotateEnabled = enabled;
      },
      raycastAtCanvas: (x: number, y: number) => {
        if (!this.camera || !this.renderer) return null;
        const size = new THREE.Vector2();
        this.renderer.getSize(size);
        const ndcX = (x / size.x) * 2 - 1;
        const ndcY = -(y / size.y) * 2 + 1;
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
        const hits = raycaster.intersectObjects(this.petals);
        if (hits.length === 0) return null;
        const mesh = hits[0].object as THREE.Mesh;
        const ud = mesh.userData as { index?: number; isActive?: boolean; section?: string | null };
        return {
          index: ud.index ?? -1,
          isActive: ud.isActive ?? false,
          section: ud.section ?? null,
        };
      },
    };
  }

  firstUpdated(_changedProperties: PropertyValues) {
    super.firstUpdated(_changedProperties);
    this.sceneViewport = this.renderRoot.querySelector('.scene-viewport');
    const canvas = this.renderRoot.querySelector('canvas') as HTMLCanvasElement;
    if (canvas) {
      this.initThreeJS(canvas);
      this.createRose();
      this.animationLoop();
    }
    const mount = this.renderRoot.querySelector('#content-mount') as HTMLElement | null;
    if (mount) {
      this._reactRoot = createRoot(mount);
      this._reactRoot.render(createElement(PoemPanel, { section: this.activeSection }));
    }
    if (this.sceneViewport) {
      this.viewportObserver = new ResizeObserver(this.handleResize);
      this.viewportObserver.observe(this.sceneViewport);
    }
  }

  updated(changed: PropertyValues) {
    super.updated(changed);
    if (changed.has('activeSection') && this._reactRoot) {
      this._reactRoot.render(createElement(PoemPanel, { section: this.activeSection }));
    }
  }

  private initThreeJS(canvas: HTMLCanvasElement) {
    // Scene
    this.scene = new THREE.Scene();
    // Fallback only — the sky dome paints over it every frame.
    this.scene.background = new THREE.Color(readColorToken(this, COLOR_TOKEN.bg));

    // Camera - positioned for a nice view of the rose
    this.camera = new THREE.PerspectiveCamera(
      CAMERA.fov,
      (this.sceneViewport?.clientWidth || 1) / (this.sceneViewport?.clientHeight || 1),
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
    this.handleResize();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // Neutral keeps a saturated red a red as it brightens; ACES skews it
    // orange and flattens the folds.
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = LIGHT.exposure;

    // Lighting: a low ambient fill so the shadow side stays flesh, and one
    // warm light behind the rose that the petals let through.
    this.scene.add(new THREE.HemisphereLight(LIGHT.skyFill, LIGHT.groundFill, LIGHT.fillIntensity));
    this.keyLight = new THREE.DirectionalLight(LIGHT.color, LIGHT.intensity);
    this.scene.add(this.keyLight, this.keyLight.target);
    this.updateKeyLight(0);

    // Orbit Controls
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 1.4;
    this.controls.maxDistance = 8;
    this.controls.enablePan = false;
    // Wheel input belongs to the page; it must never zoom or trap scrolling.
    this.controls.enableZoom = false;
    this.controls.autoRotate = false;
    this.controls.target.set(0, 1.3, 0);

    // Shooting stars. Created up-front so the sky exists even before the
    // GLB rose model finishes loading.
    this.skyDome = new SkyDome();
    this.scene.add(this.skyDome.mesh);
    this.meteorField = new MeteorField();
    this.meteorField.setPixelRatio(this.renderer.getPixelRatio());
    this.scene.add(this.meteorField.group);

    // Adapt text and navigation to the pointer while preserving native scroll.
    this.coarseQuery = window.matchMedia('(pointer: coarse)');
    this.applyTouchConfig();
    this.coarseQuery.addEventListener('change', this.handleCoarseChange);

    // Handle mouse move for hover detection
    canvas.addEventListener('mousemove', this.handleMouseMove);
    canvas.addEventListener('mouseleave', this.handleMouseLeave);

    // Handle click/tap for petal selection
    canvas.addEventListener('click', this.handleCanvasClick);
  }

  private applyTouchConfig = () => {
    if (!this.controls || !this.coarseQuery) return;
    const isCoarse = this.coarseQuery.matches;
    this.coarsePointer = isCoarse;
    // One finger scrolls the page, including on hybrid devices. Mouse drag
    // still orbits; two-finger rotation is available when the browser allows it.
    this.controls.touches.ONE = null;
    this.controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
    this.roseText?.setMobileLayout(isCoarse);
    this.camera.fov = isCoarse ? CAMERA.coarseFov : CAMERA.fov;
    this.camera.updateProjectionMatrix();
    this.renderer.domElement.style.touchAction = 'pan-y pinch-zoom';
  };

  private handleCoarseChange = () => {
    this.applyTouchConfig();
  };

  // CSS owns pinning. The same document position always renders the same
  // paragraph position, including when reversing, restoring scroll, or using
  // the keyboard/scrollbar. No wheel interception or boundary resets.
  private updateScrollProgress() {
    if (!this.roseText || !this.sceneViewport) return;
    const rect = this.getBoundingClientRect();
    const distance = Math.max(0, rect.height - this.sceneViewport.clientHeight);
    const progress = distance > 0 ? THREE.MathUtils.clamp(-rect.top / distance, 0, 1) : 0;
    this.roseText.setScrollProgress(progress);
    if (this.previousScrollProgress !== null && !breath.still) {
      const delta = (progress - this.previousScrollProgress) * distance;
      this.scrollDeltaYaw += THREE.MathUtils.clamp(delta, -100, 100) * this.SCROLL_YAW_SENSITIVITY;
    }
    this.previousScrollProgress = progress;
  }

  private handleMouseMove = (event: MouseEvent) => {
    const canvas = event.target as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    // Reach is for pointers that can hover; a touch's synthesized mousemove
    // must not leave petals reaching toward where a finger was.
    this.pointerPx = this.coarsePointer
      ? null
      : (this.pointerPx ?? new THREE.Vector2()).set(
          event.clientX - rect.left,
          event.clientY - rect.top
        );
    this.updateHover();
  };

  private handleMouseLeave = () => {
    this.pointerPx = null;
    if (this.hoveredPetalIndex !== null) {
      this.unhighlightPetal(this.hoveredPetalIndex);
      this.hoveredPetalIndex = null;
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

  private setGold(index: number, level: number) {
    this.goldLevels[index] = level;
    setPetalGold(this.petals[index].material as THREE.Material, level);
  }

  // Gold answers at once: the petal jumps most of the way on the very next
  // frame and settles the rest, instead of easing up from nothing.
  private highlightPetal(index: number) {
    const isActive = this.petals[index].userData.isActive;
    if (isActive) {
      for (const member of this.petalGroups[this.petalGroupOf[index]]) {
        this.setGold(member, Math.max(this.goldLevels[member], GOLD.instantLevel));
      }
    }
    const section: string | null = this.petals[index].userData.section;
    this.hoveredTitle = section ? SECTION_TITLES[section] ?? null : null;
    if (this.renderer) {
      this.renderer.domElement.style.cursor = isActive ? 'pointer' : 'default';
    }
  }

  private unhighlightPetal(_index: number) {
    // The gold itself fades in updateOffers(); only the cursor and title reset here.
    this.hoveredTitle = null;
    if (this.renderer) {
      this.renderer.domElement.style.cursor = 'default';
    }
  }

  // Where the camera sits around the rose, in the rose's own (spinning)
  // frame — the direction a petal's radial axis is compared against to tell
  // whether it faces the viewer.
  private cameraDirectionInRose(): THREE.Vector3 {
    return this.camera.position
      .clone()
      .sub(this.bloomCenter)
      .setY(0)
      .normalize()
      .applyAxisAngle(THREE.Object3D.DEFAULT_UP, -this.roseGroup.rotation.y);
  }

  // Clickable petals the viewer can actually see, each with its angle
  // around the rose measured from straight-at-the-camera (degrees, signed).
  private offerablePetals(toCamera: THREE.Vector3): Array<{ group: number; angle: number }> {
    const found: Array<{ group: number; angle: number }> = [];
    this.petalGroups.forEach((members, group) => {
      const lead = members[0];
      const o = this.originalPetalTransforms[lead];
      if (!this.petals[lead].userData.isActive) return;
      if (o.reach < OFFER.minReach || o.radial.dot(toCamera) < OFFER.facing) return;
      const cross = toCamera.z * o.radial.x - toCamera.x * o.radial.z;
      found.push({
        group,
        angle: Math.atan2(cross, o.radial.dot(toCamera)) * THREE.MathUtils.RAD2DEG,
      });
    });
    return found;
  }

  // The petals nearest `angle` around the rose, ordered along the sweep so
  // they take their turns in the direction the ripple is travelling.
  private petalsNearAngle(toCamera: THREE.Vector3, angle: number, count: number): number[] {
    return this.offerablePetals(toCamera)
      .sort((a, b) => Math.abs(a.angle - angle) - Math.abs(b.angle - angle))
      .slice(0, count)
      .sort((a, b) => a.angle - b.angle)
      .map((entry) => entry.group);
  }

  // Ripple: once per breath a few camera-facing petals are chosen a little
  // further round the rose than last time. Each lifts and warms on the
  // inhale, one after another, and settles on the exhale.
  private addRippleOffers(toCamera: THREE.Vector3) {
    if (breath.still) {
      // Held cue: the same few petals, faintly gold, not moving.
      if (this.rippleGroups.length === 0) {
        this.rippleGroups = this.petalsNearAngle(toCamera, 0, OFFER.stillCount);
      }
      for (const group of this.rippleGroups) this.offerTargets[group] = OFFER.stillLevel;
      return;
    }
    const cycle = breath.cycleIndex();
    if (cycle !== this.rippleCycle) {
      this.rippleCycle = cycle;
      this.rippleAngle += OFFER.rippleStepDegrees;
      if (this.rippleAngle > OFFER.rippleArcDegrees) this.rippleAngle = -OFFER.rippleArcDegrees;
      this.rippleGroups = this.petalsNearAngle(toCamera, this.rippleAngle, OFFER.rippleCount);
    }
    this.rippleGroups.forEach((group, turn) => {
      this.offerTargets[group] =
        OFFER.rippleLevel * breath.level(turn * OFFER.rippleStaggerSeconds);
    });
  }

  // Reach: petals near the pointer begin to offer themselves before they are
  // touched — strongest for the nearest, fading with screen distance.
  private addReachOffers(toCamera: THREE.Vector3) {
    if (!this.pointerPx || breath.still) return;
    const size = this.renderer.getSize(new THREE.Vector2());
    const projected = new THREE.Vector3();
    for (const { group } of this.offerablePetals(toCamera)) {
      this.petals[this.petalGroups[group][0]].getWorldPosition(projected).project(this.camera);
      const distance = Math.hypot(
        ((projected.x + 1) / 2) * size.x - this.pointerPx.x,
        ((1 - projected.y) / 2) * size.y - this.pointerPx.y
      );
      const nearness = Math.max(0, 1 - distance / OFFER.reachRadiusPx);
      this.offerTargets[group] = Math.max(this.offerTargets[group], OFFER.reachLevel * nearness);
    }
  }

  // One level per petal drives both its gold and its lift. Hover is the
  // strongest source; the ripple and the pointer's nearness are quieter
  // versions of the same answer.
  private updateOffers(dt: number) {
    this.offerTargets.fill(0);
    if (this.roseState === 'idle') {
      const toCamera = this.cameraDirectionInRose();
      this.addRippleOffers(toCamera);
      this.addReachOffers(toCamera);
    }
    const hovered = this.hoveredPetalIndex;
    if (hovered !== null && this.petals[hovered].userData.isActive) {
      this.offerTargets[this.petalGroupOf[hovered]] = 1;
    }

    this.petals.forEach((_petal, index) => {
      const target = this.offerTargets[this.petalGroupOf[index]];
      const level = this.goldLevels[index];
      if (level === target) return;
      const rate = target > level ? GOLD.attackPerSecond : GOLD.releasePerSecond;
      const next = level + (target - level) * (1 - Math.exp(-rate * dt));
      this.setGold(index, Math.abs(next - target) < 0.001 ? target : next);
    });
  }

  // The hint has done its work once any petal has been chosen.
  private markHintSeen() {
    if (this.hintSeen) return;
    this.hintSeen = true;
    try {
      window.sessionStorage.setItem(HINT.storageKey, '1');
    } catch {
      // Not remembered beyond this page view; nothing else depends on it.
    }
  }

  private updateKeyLight(nowSec: number) {
    if (!this.keyLight) return;
    const turn = breath.still ? 0 : (nowSec / LIGHT.driftSeconds) * Math.PI * 2;
    const azimuth = (LIGHT.azimuth + LIGHT.azimuthDrift * Math.sin(turn)) * THREE.MathUtils.DEG2RAD;
    const elevation =
      (LIGHT.elevation + LIGHT.elevationDrift * Math.sin(turn * LIGHT_ELEVATION_PERIOD_RATIO)) *
      THREE.MathUtils.DEG2RAD;
    this.keyLight.position
      .set(
        Math.sin(azimuth) * Math.cos(elevation),
        Math.sin(elevation),
        Math.cos(azimuth) * Math.cos(elevation)
      )
      .multiplyScalar(LIGHT.distance)
      .add(this.bloomCenter);
    this.keyLight.target.position.copy(this.bloomCenter);
    this.keyLight.intensity = LIGHT.intensity * (1 - LIGHT.swell * (1 - breath.level()));
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
    this.markHintSeen();

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
  // progress in animationLoop() so it lands exactly when the bloom finishes.
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

  private handleTruthNav(direction: 1 | -1) {
    if (!this.roseText || !this.sceneViewport || this.roseState !== 'idle') return;
    const rect = this.getBoundingClientRect();
    const start = rect.top + window.scrollY;
    const distance = Math.max(0, rect.height - this.sceneViewport.clientHeight);
    const steps = Math.max(1, this.roseText.getParagraphCount() - 1);
    const paragraph = THREE.MathUtils.clamp(-rect.top / (distance || 1), 0, 1) * steps;
    // Round in the travel direction so reversing halfway through a button
    // transition returns to the preceding paragraph immediately.
    const next = direction > 0 ? Math.floor(paragraph + 0.01) + 1 : Math.ceil(paragraph - 0.01) - 1;
    let top = start + (next / steps) * distance;
    if (next < 0 || next > steps) {
      const section = document.querySelector(next < 0 ? 'welcome-section' : 'writing-section');
      if (!section) return;
      top = section.getBoundingClientRect().top + window.scrollY;
    }
    window.scrollTo({ top, behavior: breath.still ? 'instant' : 'smooth' });
  }

  private handleTruthPrev = () => this.handleTruthNav(-1);
  private handleTruthNext = () => this.handleTruthNav(1);

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

    // Keep what the model ships with: every mesh arrives with its own
    // base-colour, normal and occlusion/roughness maps. Petals get the living
    // material built from those maps; stem, leaves and thorns keep their own
    // material, quietened so colour gathers in the bloom.
    const petalMeshes: THREE.Mesh[] = [];
    const allMeshes: THREE.Mesh[] = [];
    const petalLook = createPetalLook(this);
    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const source = child.material as THREE.MeshStandardMaterial;
      allMeshes.push(child);
      if (child.name.startsWith('petal_')) {
        child.material = createPetalMaterial({
          map: source.map,
          normalMap: source.normalMap,
          ormMap: source.aoMap ?? source.roughnessMap,
        }, petalLook);
        petalMeshes.push(child);
      } else {
        source.metalness = 0;
        source.metalnessMap = null;
        source.roughness = FOLIAGE.roughness;
        source.color.set(FOLIAGE.tint);
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

    // petalIndex in petal-sections.ts refers directly to this array (GLB mesh
    // order, sorted by name). Petals stay exactly where the model placed
    // them — we just mark the registered ones as active/clickable.
    const centers = petalMeshes.map((p) => {
      const c = new THREE.Vector3();
      new THREE.Box3().setFromObject(p).getCenter(c);
      return c;
    });
    this.bloomCenter.set(0, 0, 0);
    centers.forEach((c) => this.bloomCenter.add(c));
    this.bloomCenter.divideScalar(centers.length);

    for (const idx of ACTIVE_PETAL_INDICES) {
      if (idx < 0 || idx >= petalMeshes.length) {
        // eslint-disable-next-line no-console
        console.warn(
          `[golden-rose] petal-sections registers petalIndex ${idx}, but the loaded rose model only has ${petalMeshes.length} petals — this section will not appear`
        );
      }
    }

    petalMeshes.forEach((petal, i) => {
      const activeSlot = ACTIVE_PETAL_INDICES.indexOf(i);
      const isActive = activeSlot !== -1;
      petal.userData = {
        index: i,
        isActive,
        section: isActive ? SECTIONS[activeSlot] : null,
      };
      this.petals.push(petal);
      this.goldLevels.push(0);

      const center = centers[i];
      petal.geometry.translate(-center.x, -center.y, -center.z);
      petal.position.copy(center);

      const dx = center.x - this.bloomCenter.x;
      const dz = center.z - this.bloomCenter.z;
      const len = Math.hypot(dx, dz) || 1e-6;
      const radial = new THREE.Vector3(dx / len, 0, dz / len);
      const tangent = new THREE.Vector3(-radial.z, 0, radial.x);

      this.originalPetalTransforms.push({
        center: center.clone(),
        radial,
        tangent,
        reach: len,
        breathWeight: 0,
        breathLag: 0,
      });
    });

    // Pair each sheet with its rim strip: two meshes that are each other's
    // nearest neighbour and all but concentric are one petal.
    const nearest = centers.map((center, i) => {
      let best = -1;
      centers.forEach((other, k) => {
        if (k !== i && (best === -1 || center.distanceTo(other) < center.distanceTo(centers[best]))) {
          best = k;
        }
      });
      return best;
    });
    this.petalGroupOf = centers.map(() => -1);
    centers.forEach((center, i) => {
      if (this.petalGroupOf[i] !== -1) return;
      const partner = nearest[i];
      const paired =
        partner !== -1 &&
        nearest[partner] === i &&
        center.distanceTo(centers[partner]) < PETAL_PAIR_DISTANCE;
      const members = paired ? [i, partner] : [i];
      members.forEach((member) => (this.petalGroupOf[member] = this.petalGroups.length));
      this.petalGroups.push(members);
    });
    this.offerTargets = this.petalGroups.map(() => 0);

    // Normalise each petal's distance from the heart into its share of the
    // breath: the rim moves most and slightly later than the centre. A sheet
    // and its rim strip share one set of numbers so they move as one.
    const rim = Math.max(...this.originalPetalTransforms.map((o) => o.reach), 1e-6);
    for (const members of this.petalGroups) {
      const reach = this.originalPetalTransforms[members[0]].reach / rim;
      const breathLag =
        reach * BREATH_MOTION.outerLagSeconds + Math.random() * BREATH_MOTION.lagJitterSeconds;
      for (const member of members) {
        const o = this.originalPetalTransforms[member];
        o.reach = reach;
        o.breathWeight = THREE.MathUtils.lerp(BREATH_MOTION.innerWeight, 1, reach);
        o.breathLag = breathLag;
      }
    }

    if (this.controls) {
      this.controls.target.copy(this.bloomCenter);
      this.camera.lookAt(this.bloomCenter);
    }

    // Reveal the rose first — any Troika failure cannot keep the shimmer up.
    this.loading = false;

    try {
      this.roseText = new RoseText(truthStatement, this.bloomCenter, readColorToken(this, COLOR_TOKEN.text));
      this.roseText.setMobileLayout(this.coarseQuery?.matches ?? false);
      this.scene.add(this.roseText.group);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[golden-rose] failed to create truth text mesh:', err);
    }
  }

  private handleResize = () => {
    if (!this.camera || !this.renderer || !this.sceneViewport) return;
    const { clientWidth: width, clientHeight: height } = this.sceneViewport;
    if (!width || !height) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  };

  private animationLoop = () => {
    this.animationFrameId = requestAnimationFrame(this.animationLoop);

    // Track FPS
    const now = performance.now();
    this.frameCount++;
    if (now - this.lastFrameTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFrameTime = now;
    }

    // Clamped delta for time-based animation (meteors). Skip the spike on the
    // very first frame; cap to 0.05s so a tab-switch doesn't teleport meteors.
    const dt = this.prevFrameTime > 0 ? Math.min(0.05, (now - this.prevFrameTime) / 1000) : 0.016;
    this.prevFrameTime = now;

    this.updateScrollProgress();

    // Update controls
    this.controls?.update();

    if (this.roseState === 'blooming') {
      this.bloomProgress += 16 / this.BLOOM_DURATION;
      if (this.bloomProgress >= 1) {
        this.bloomProgress = 1;
        this.roseState = 'open';
        if (this.controls) this.controls.enabled = true; // user can orbit at top-down
      }
      this.updateCameraFly(this.easeOutCubic(this.bloomProgress));
    }

    if (this.roseState === 'closing') {
      this.bloomProgress -= 16 / this.BLOOM_DURATION;
      if (this.bloomProgress <= 0) {
        this.bloomProgress = 0;
        this.roseState = 'idle';
        this.activeSection = null;
        if (this.controls) this.controls.enabled = true;
      }
      // During close, bloomProgress goes 1→0 so we want the fly-back to track
      // (1 - bloomProgress)' worth — but beginCameraFlyBack already swapped
      // start/target, so we just lerp by (1 - eased).
      this.updateCameraFly(1 - this.easeOutCubic(this.bloomProgress));
    }

    // Gentle auto-spin + scroll-driven yaw impulse (decays each frame).
    if (this.roseState === 'idle' && this.roseGroup) {
      const spin = this.autoRotateEnabled && !breath.still ? 0.002 : 0;
      this.roseGroup.rotation.y += spin + this.scrollDeltaYaw;
      this.scrollDeltaYaw *= this.SCROLL_YAW_DECAY;
    }

    // Bloom and breath share one pose: the breath keeps moving the petals
    // in every state, the bloom is laid over it. Offers are settled first
    // because an offered petal also lifts.
    if (this.petals.length > 0) this.updateOffers(dt);
    this.posePetals(this.easeOutCubic(this.bloomProgress));
    this.updateKeyLight(now / 1000);
    this.skyDome?.update(now / 1000);

    if (this.roseText) {
      // One formula across all states: idle→1, blooming/closing→linear,
      // open→0. bloomProgress lives in [0,1] for all of them.
      const fade = Math.min(1, Math.max(0, this.bloomProgress / this.TRUTH_FADE_RATIO));
      this.roseText.update(this.camera, 1 - fade);
    }

    if (this.meteorField) {
      // Same fade curve as truth text — meteors are atmosphere and should
      // yield to the panel just like the prose does.
      const fade = Math.min(1, Math.max(0, this.bloomProgress / this.TRUTH_FADE_RATIO));
      this.meteorField.setOpacity(1 - fade);
      this.meteorField.update(now / 1000, dt);
    }

    this.renderer?.render(this.scene, this.camera);
  };

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  // `bloom` is the eased open amount (0 closed, 1 fully flared). On top of
  // it every petal loosens and tightens a few degrees with the shared breath,
  // around the same per-petal axes the bloom uses. The breath turns the
  // other way from the bloom: a positive turn about the tangent tips a
  // petal's lip in over the heart (the bloom then carries it right over),
  // whereas a breath should lean the lip outward.
  private posePetals(bloom: number) {
    this.petals.forEach((petal, index) => {
      const o = this.originalPetalTransforms[index];
      if (!o) return;
      const air = breath.level(o.breathLag) * o.breathWeight;
      // An offered petal rises out of the bloom toward the viewer's hand;
      // the gesture belongs to the closed rose and fades as it opens.
      const offer = this.goldLevels[index] * (1 - bloom);

      // Geometry is re-centered at load so each petal's local origin = its
      // centroid. Rotating `petal.quaternion` therefore pivots the petal
      // around its own centroid with no translation compensation needed.
      petal.quaternion.setFromAxisAngle(
        o.tangent,
        this.BLOOM_FLARE * bloom -
          (BREATH_MOTION.petalFlareDegrees * air + OFFER.tiltDegrees * offer) *
            THREE.MathUtils.DEG2RAD
      );
      petal.position
        .copy(o.center)
        .addScaledVector(
          o.radial,
          this.BLOOM_SPREAD * bloom + BREATH_MOTION.petalSpread * air + OFFER.liftOut * offer
        );
      petal.position.y +=
        this.BLOOM_LIFT * bloom + BREATH_MOTION.petalLift * air + OFFER.lift * offer;
    });
  }

  private cleanup() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.viewportObserver?.disconnect();
    this.viewportObserver = null;
    this.sceneViewport = null;

    // Remove canvas event listeners
    const canvas = this.renderer?.domElement;
    if (canvas) {
      canvas.removeEventListener('mousemove', this.handleMouseMove);
      canvas.removeEventListener('mouseleave', this.handleMouseLeave);
      canvas.removeEventListener('click', this.handleCanvasClick);
    }
    this.coarseQuery?.removeEventListener('change', this.handleCoarseChange);
    this.coarseQuery = null;
    // Dispose controls
    this.controls?.dispose();

    // Dispose Three.js resources
    this.petals.forEach((petal) => {
      petal.geometry.dispose();
      (petal.material as THREE.Material).dispose();
    });
    this.roseText?.dispose();
    this.roseText = null;
    this.meteorField?.dispose();
    this.meteorField = null;
    this.skyDome?.dispose();
    this.skyDome = null;
    this.keyLight = null;
    this.renderer?.dispose();
  }

  private handleCloseClick = () => {
    this.closeSection();
  };

  render() {
    return html`
      <div
        class="scene-viewport ${this.roseState === 'open' ? 'reading' : ''}"
        data-testid="rose-viewport"
      >
        ${this.loading
          ? html`<div class="loading-shimmer" data-testid="loading-shimmer"></div>`
          : null}
        <canvas data-testid="rose-canvas"></canvas>
        <p
          class="petal-hint ${this.hintSeen || this.loading ? 'gone' : ''}"
          data-testid="petal-hint"
          aria-hidden=${this.hintSeen ? 'true' : 'false'}
        >
          ${HINT.text}
        </p>
        <p
          class="petal-title ${this.hoveredTitle !== null && this.roseState === 'idle' && !this.coarsePointer ? 'shown' : ''}"
          data-testid="petal-title"
          aria-hidden="true"
        >
          ${this.hoveredTitle ?? this.lastTitle}
        </p>
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
        <div class="attribution" data-testid="model-attribution">
          <a
            href="https://sketchfab.com/3d-models/rose-6281bf3703584323bb4d8326f1f1b59d"
            target="_blank"
            rel="noopener noreferrer"
          >
            Thank you Heliona for this model from Sketchfab
          </a>
        </div>
        <div
          class="truth-nav ${this.coarsePointer ? 'coarse' : ''}"
          data-testid="truth-nav"
          aria-label="Truth statement navigation"
        >
          <button
            class="truth-nav-button"
            type="button"
            data-testid="truth-nav-prev"
            aria-label="Previous truth paragraph"
            @click=${this.handleTruthPrev}
          >
            <span aria-hidden="true">↑</span>
          </button>
          <button
            class="truth-nav-button"
            type="button"
            data-testid="truth-nav-next"
            aria-label="Next truth paragraph"
            @click=${this.handleTruthNext}
          >
            <span aria-hidden="true">↓</span>
          </button>
        </div>
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
