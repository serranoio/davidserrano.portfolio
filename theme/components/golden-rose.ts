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
import { ACTIVE_PETAL_INDICES, SECTIONS } from './petal-sections';
import truthStatement from '../../docs/sections/truth-statement.txt?raw';

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
  getControlsConfig: () => { minDistance: number; maxDistance: number; enablePan: boolean; touchesOne: number; enabled: boolean };
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
  getScrollMode: () => string;
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
    pillVisible: { type: Boolean, state: true },
    coarsePointer: { type: Boolean, state: true },
  };

  private _loading = true;
  private _roseState: 'idle' | 'blooming' | 'open' | 'closing' = 'idle';
  private _activeSection: string | null = null;
  private _coarsePointer = false;

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

  // Scroll-driven rose rotation: wheel events inject a yaw impulse that decays
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
  private prevFrameTime = 0;

  // Touch-vs-mouse signal. On coarse-pointer devices we disable single-finger
  // orbit so native page scroll passes through the canvas — without this, a
  // swipe rotates the camera and the user is trapped in the rose section.
  // Re-evaluated on `change` so convertibles that swap pointer type at runtime
  // get the right config.
  private coarseQuery: MediaQueryList | null = null;

  // The mobile-only "↓" pill needs to disappear once the rose isn't the
  // snapped section anymore; otherwise it overlays the writing grid.
  private pillObserver: IntersectionObserver | null = null;
  private _pillVisible = false;

  // Desktop wheel-pin state machine: drives the truth text on wheel and
  // releases when it saturates so the page can scroll through to writing.
  // Touch is gated out via coarseQuery.matches — mobile gets clean native
  // scroll instead.
  private scrollMode: 'free' | 'snapping' | 'pinned' | 'released-down' | 'released-up' = 'free';
  private snapEndTimeoutId: number | null = null;
  // Trigger snap when rose top is within this fraction of viewport-height
  // above/below the viewport top. 0.7 = "snap once ~30% of the rose is in view".
  private readonly SNAP_TRIGGER_FRACTION = 0.7;
  // After release, don't re-snap until rose has scrolled more than this
  // fraction past the viewport top in the released direction.
  private readonly RELEASE_EXIT_FRACTION = 0.5;
  private readonly SNAP_DURATION_MS = 700;
  // The truth statement grew from one paragraph to ten+; the old sensitivity
  // (0.003) meant ~40 wheel ticks to saturate, which felt like a trap. Bump
  // to 0.03 so 3–5 trackpad swipes get the user through the text and onto
  // the writing section. Test in mobile-scroll-flow.cy.ts asserts the page
  // does reach writing after a bounded number of wheels.
  private readonly TEXT_SCROLL_SENSITIVITY = 0.03;

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

  get pillVisible() {
    return this._pillVisible;
  }
  set pillVisible(val: boolean) {
    const oldVal = this._pillVisible;
    this._pillVisible = val;
    this.requestUpdate('pillVisible', oldVal);
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
        touchesOne: (this.controls?.touches?.ONE ?? THREE.TOUCH.ROTATE) as number,
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
      getScrollMode: () => this.scrollMode,
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
    // Hide the "↓" pill once the rose host stops being mostly visible. The
    // pill only renders under (pointer: coarse), but the observer is cheap
    // and runs on every device; the CSS gate handles the visibility cut.
    if (typeof IntersectionObserver !== 'undefined') {
      this.pillObserver = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry) this.pillVisible = entry.intersectionRatio >= 0.5;
        },
        { threshold: [0.5] }
      );
      this.pillObserver.observe(this as unknown as Element);
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
    // Wheel is repurposed to scroll the background paragraphs, not zoom.
    this.controls.enableZoom = false;
    this.controls.autoRotate = false;
    this.controls.target.set(0, 1.3, 0);

    // Shooting stars. Created up-front so the sky exists even before the
    // GLB rose model finishes loading.
    this.meteorField = new MeteorField();
    this.scene.add(this.meteorField.group);

    // Coarse-pointer gating: disable single-finger orbit on touch so native
    // page scroll passes through the 100vh canvas. Two-finger orbit stays.
    this.coarseQuery = window.matchMedia('(pointer: coarse)');
    this.applyTouchConfig();
    this.coarseQuery.addEventListener('change', this.handleCoarseChange);

    // Handle resize. iOS Safari URL-bar transitions don't always fire
    // window.resize, but they do fire visualViewport.resize — listen to
    // both so the canvas tracks the visual viewport instead of clipping.
    window.addEventListener('resize', this.handleResize);
    window.visualViewport?.addEventListener('resize', this.handleResize);

    // Handle mouse move for hover detection
    canvas.addEventListener('mousemove', this.handleMouseMove);

    // Handle click/tap for petal selection
    canvas.addEventListener('click', this.handleCanvasClick);

    // Wheel listener is on `window`, not the canvas — we need to intercept
    // wheels before the cursor sits over the rose so we can snap-to-center
    // as the user is scrolling in from above or below.
    window.addEventListener('wheel', this.handleWheel, { passive: false });
  }

  // Touch devices use the canvas as the scene interaction surface:
  // one-finger drag orbits the rose. Background text movement lives in
  // explicit UI buttons so drag never has to choose between scene control and
  // prose scrolling.
  private applyTouchConfig = () => {
    if (!this.controls || !this.coarseQuery) return;
    const isCoarse = this.coarseQuery.matches;
    this.coarsePointer = isCoarse;
    this.controls.enabled = true;
    this.controls.touches.ONE = THREE.TOUCH.ROTATE;
    this.controls.touches.TWO = THREE.TOUCH.ROTATE;
    this.roseText?.setMobileLayout(isCoarse);
    if (this.renderer?.domElement) {
      this.renderer.domElement.style.touchAction = isCoarse ? 'none' : 'none';
    }
  };

  private handleCoarseChange = () => {
    this.applyTouchConfig();
  };

  // Desktop scroll-hijack state machine.
  //
  // Mobile (coarseQuery.matches): early-return, native scroll always wins.
  // Mobile users also have CSS scroll-snap on <html> doing the section
  // snapping for them — see theme/index.tsx.
  //
  // Desktop flow downward:
  //   free → wheel-down while rose's top is in upper SNAP_TRIGGER_FRACTION
  //     → snapping (smooth-scroll page so rose top hits viewport top)
  //     → pinned (wheel drives truth-text scroll + rose yaw)
  //     → truth text saturates → released-down (page scroll resumes)
  //     → rose has scrolled past viewport top by RELEASE_EXIT_FRACTION → free.
  //
  // Reverse symmetry applies for scrolling back up. The pinned state
  // forwards wheel events to roseText.scrollBy at TEXT_SCROLL_SENSITIVITY
  // so the user gets through the statement in a handful of swipes.
  private handleWheel = (event: WheelEvent) => {
    // Panel open/animating: eat the wheel entirely so the page can't scroll
    // out from under the user while they're reading a section.
    if (this.roseState !== 'idle') {
      event.preventDefault();
      return;
    }
    // Touch devices: never pin. Native scroll + CSS snap own the flow.
    if (this.coarseQuery?.matches) return;
    if (!this.roseText) return;

    const hostRect = this.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const dy = event.deltaY;

    if (this.scrollMode === 'snapping') {
      event.preventDefault();
      return;
    }

    if (this.scrollMode === 'released-down') {
      if (hostRect.top < -viewportH * this.RELEASE_EXIT_FRACTION) {
        this.scrollMode = 'free';
      }
      return;
    }

    if (this.scrollMode === 'released-up') {
      if (hostRect.top > viewportH * this.RELEASE_EXIT_FRACTION) {
        this.scrollMode = 'free';
      }
      return;
    }

    if (this.scrollMode === 'pinned') {
      const target = this.roseText.getScrollTarget();
      const max = this.roseText.getMaxScrollOffset();
      // End of truth text + scrolling down → release into writing.
      if (dy > 0 && target >= max - 0.001) {
        this.scrollMode = 'released-down';
        return;
      }
      // Top of truth text + scrolling up → release back into welcome.
      if (dy < 0 && target <= 0.001) {
        this.scrollMode = 'released-up';
        return;
      }
      event.preventDefault();
      this.roseText.scrollBy(dy, this.TEXT_SCROLL_SENSITIVITY);
      this.scrollDeltaYaw += dy * this.SCROLL_YAW_SENSITIVITY;
      return;
    }

    // mode === 'free' — consider whether to snap onto the rose.
    const trigger = viewportH * this.SNAP_TRIGGER_FRACTION;
    if (dy > 0 && hostRect.top > 0 && hostRect.top < trigger) {
      this.beginSnap();
      event.preventDefault();
      return;
    }
    if (dy < 0 && hostRect.top < 0 && hostRect.top > -trigger) {
      this.beginSnap();
      event.preventDefault();
      return;
    }
    // Otherwise: no interception, page scrolls naturally.
  };

  private beginSnap() {
    this.scrollMode = 'snapping';
    const roseTopDoc = this.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: roseTopDoc, behavior: 'smooth' });
    if (this.snapEndTimeoutId !== null) clearTimeout(this.snapEndTimeoutId);
    this.snapEndTimeoutId = window.setTimeout(() => {
      if (this.scrollMode === 'snapping') this.scrollMode = 'pinned';
      this.snapEndTimeoutId = null;
    }, this.SNAP_DURATION_MS);
  }

  private handleMouseMove = (event: MouseEvent) => {
    const canvas = event.target as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.updateHover();
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
    if (!this.roseText || this.roseState !== 'idle') return;
    const target = this.roseText.getScrollTarget();
    const max = this.roseText.getMaxScrollOffset();
    const atEnd = target >= max - 0.001;
    const atStart = target <= 0.001;

    if (direction > 0 && atEnd) {
      this.scrollToHomeSection('writing-section');
      return;
    }

    if (direction < 0 && atStart) {
      this.scrollToHomeSection('welcome-section');
      return;
    }

    this.roseText.scrollByParagraph(direction);
    this.scrollDeltaYaw += direction * 0.08;
  }

  private handleTruthPrev = () => this.handleTruthNav(-1);
  private handleTruthNext = () => this.handleTruthNav(1);

  private scrollToHomeSection(selector: 'welcome-section' | 'writing-section') {
    const section = document.querySelector(selector) as HTMLElement | null;
    if (!section) return;
    const top = section.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top, behavior: 'auto' });
  }

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
      this.roseText.setMobileLayout(this.coarseQuery?.matches ?? false);
      this.scene.add(this.roseText.group);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[golden-rose] failed to create truth text mesh:', err);
    }
  }

  private handleResize = () => {
    if (!this.camera || !this.renderer) return;

    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
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

    // Gentle auto-spin + scroll-driven yaw impulse (decays each frame).
    if (this.roseState === 'idle' && this.roseGroup) {
      const spin = this.autoRotateEnabled ? 0.002 : 0;
      this.roseGroup.rotation.y += spin + this.scrollDeltaYaw;
      this.scrollDeltaYaw *= this.SCROLL_YAW_DECAY;
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

    if (this.meteorField) {
      // Same fade curve as truth text — meteors are atmosphere and should
      // yield to the panel just like the prose does.
      const fade = Math.min(1, Math.max(0, this.bloomProgress / this.TRUTH_FADE_RATIO));
      this.meteorField.setOpacity(1 - fade);
      this.meteorField.update(now / 1000, dt);
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
    window.visualViewport?.removeEventListener('resize', this.handleResize);

    // Remove canvas event listeners
    const canvas = this.renderer?.domElement;
    if (canvas) {
      canvas.removeEventListener('mousemove', this.handleMouseMove);
      canvas.removeEventListener('click', this.handleCanvasClick);
    }
    window.removeEventListener('wheel', this.handleWheel);
    this.coarseQuery?.removeEventListener('change', this.handleCoarseChange);
    this.coarseQuery = null;
    this.pillObserver?.disconnect();
    this.pillObserver = null;
    if (this.snapEndTimeoutId !== null) {
      clearTimeout(this.snapEndTimeoutId);
      this.snapEndTimeoutId = null;
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
    this.meteorField?.dispose();
    this.meteorField = null;
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
    `;
  }
}

customElements.define('golden-rose', GoldenRoseElement);

declare global {
  interface HTMLElementTagNameMap {
    'golden-rose': GoldenRoseElement;
  }
}
