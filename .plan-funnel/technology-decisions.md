# Technology Decisions: 3D Golden Rose Navigation

## Overview

This document records implementation-shaping architecture and technology decisions made after the PRD and scenario testing strategy were confirmed.

## Decision Summary

| Fork | Decision | Rationale |
|------|----------|-----------|
| Rose 3D Model | Hybrid procedural + shaders | Full control over petal interaction, metallic look via shaders |
| Animation | Three.js native | User preference for pure Three.js, no extra dependencies |
| Content Rendering | HTML overlay | MDX needs rich formatting and scroll, positioned relative to rose |
| Click Detection | Three.js raycasting | Direct, accurate, no sync issues |
| Three.js Integration | Vanilla Three.js in Lit | User preference, works well in shadow DOM |
| MDX Content | React island | Full MDX interactivity while keeping Lit/Three.js architecture |

---

## Decision 1: Rose 3D Model — Hybrid Procedural

### Chosen
Procedural petal geometry with metallic gold shaders.

### Rejected Options
- **Import GLTF model**: Harder to make individual petals interactive, dependency on external model file
- **Pure procedural full rose**: Overly complex for organic look

### Implementation Notes
- Each petal is a separate Three.js mesh (enables individual interaction)
- Petal shape generated via code (bezier curves or parametric surface)
- Petal count configurable via constant (default 8-10)
- Metallic gold appearance via PBR material (MeshStandardMaterial with metalness/roughness)
- Etched symbols on 3 active petals via texture or geometry detail

---

## Decision 2: Animation — Three.js Native

### Chosen
Three.js native animation system (no external animation libraries).

### Rejected Options
- **@react-spring/three**: Requires React integration
- **GSAP**: Additional dependency, licensing considerations

### Implementation Notes
- Use `requestAnimationFrame` loop for continuous animation
- Bloom animation: Tween petal positions/rotations over ~0.5-0.8s
- Use easing functions for organic feel (ease-out-cubic or similar)
- Store animation state to handle interruptions (rapid clicks)
- Consider using Three.js `AnimationMixer` if keyframe approach preferred

---

## Decision 3: Content Rendering — HTML Overlay

### Chosen
HTML overlay positioned relative to 3D rose bloom state.

### Rejected Options
- **Three.js TextGeometry**: No formatting, no images, no scroll
- **Render to canvas texture**: Static, no scroll, complex
- **CSS3DRenderer**: Added complexity without clear benefit

### Implementation Notes
- Content panel is a DOM element positioned absolutely over canvas
- Position/size calculated from Three.js camera and rose state
- Content scrolls naturally (native browser scroll)
- Background styled to blend with rose (semi-transparent dark or match rose interior)
- Z-index layering: canvas → content panel → close area detection

---

## Decision 4: Click Detection — Three.js Raycasting

### Chosen
Three.js Raycaster for petal click detection.

### Rejected Options
- **DOM overlay hit areas**: Requires syncing DOM positions with 3D, more complex

### Implementation Notes
- Single Raycaster instance reused per frame
- On click/tap, cast ray from camera through mouse/touch position
- Check intersections against petal meshes
- Active petals have `userData.section` property ("about", "case-studies", "poetry")
- Inactive petals have no section, click ignored
- Generous hit detection (petal bounding box or simplified geometry)

---

## Decision 5: Three.js + Lit Integration

### Chosen
Vanilla Three.js instantiated within Lit element lifecycle.

### Implementation Notes

```typescript
// Lit element structure
export class GoldenRoseElement extends LitElement {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  firstUpdated() {
    const canvas = this.renderRoot.querySelector('canvas');
    this.initThreeJS(canvas);
    this.animate();
  }

  disconnectedCallback() {
    // Cleanup Three.js resources
    this.renderer.dispose();
  }
}
```

- Three.js lives entirely within Lit element's shadow DOM
- Canvas element in Lit template
- Animation loop managed by Lit element
- Events (click, touch, resize) handled at Lit level, passed to Three.js
- Styles in separate `.styles.ts` file per CLAUDE.md rules

---

## Decision 6: MDX Content — React Island

### Chosen
Mount a scoped React root for MDX content when a petal is clicked.

### Rejected Options
- **Pre-render MDX to static HTML**: Loses interactivity
- **Plain HTML/Markdown**: Loses MDX features
- **Full React migration**: Abandons Lit architecture
- **Navigate to rspress pages**: Breaks "content inside rose" UX

### Implementation Notes

```typescript
// When petal clicked in Lit element
openContent(section: string) {
  const container = this.renderRoot.querySelector('#content-root');

  // Dynamically import React and MDX content
  import('react-dom/client').then(({ createRoot }) => {
    import(`./content/${section}.mdx`).then((MDXContent) => {
      this.reactRoot = createRoot(container);
      this.reactRoot.render(<MDXContent.default />);
    });
  });
}

closeContent() {
  this.reactRoot?.unmount();
}
```

- React + ReactDOM only loaded when content opens (code splitting)
- Each MDX file is dynamically imported based on section
- React root scoped to content container element
- Unmount React root on close to clean up
- MDX files stored in `content/` directory
- Full MDX interactivity (custom components, imports, etc.)

### Build Configuration
- rspress/rsbuild must be configured to:
  - Bundle MDX files for dynamic import
  - Include React runtime (but can be lazy loaded)
  - Handle MDX in non-page context (not just docs pages)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  rspress (SSG)                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  theme/index.tsx (HomeLayout override)                │  │
│  │  └─> Renders <golden-rose> Lit element                │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  GoldenRoseElement (Lit)                              │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  <canvas> — Three.js scene                      │  │  │
│  │  │  • Rose mesh (procedural petals)                │  │  │
│  │  │  • Raycaster for click detection                │  │  │
│  │  │  • OrbitControls for pan/rotate                 │  │  │
│  │  │  • Animation loop                               │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │                                                       │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  <div id="content-root"> — React island         │  │  │
│  │  │  • Mounted when petal clicked                   │  │  │
│  │  │  • Renders MDX content                          │  │  │
│  │  │  • Unmounted on close                           │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │                                                       │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  <div id="loading"> — Gold shimmer              │  │  │
│  │  │  • Visible while Three.js initializes           │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  content/                                                   │
│  ├── about.mdx                                              │
│  ├── case-studies.mdx                                       │
│  └── poetry.mdx                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Dependencies to Add

| Package | Purpose |
|---------|---------|
| `three` | 3D rendering |
| `@types/three` | TypeScript types |
| (React already present via rspress) | MDX rendering |

No additional animation libraries. No @react-three/fiber.

---

## Open Implementation Details (Deferred)

| Detail | Deferred Because |
|--------|------------------|
| Exact petal geometry (bezier vs parametric) | Visual tuning during implementation |
| Polygon count / LOD | Performance testing during implementation |
| Easing function choice | Feel testing during implementation |
| Exact content panel positioning | Visual tuning during implementation |
| MDX bundling configuration | Build tooling details |
