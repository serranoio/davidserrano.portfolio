# PRD: 3D Golden Rose Navigation

## Problem Statement

The portfolio homepage needs a distinctive, interactive centerpiece that serves as both visual identity and navigation. The current homepage shows a placeholder "Hello World" text. The desired experience is a 3D metallic gold rose that embodies the "Golden Rose" aesthetic—organic elegance meets precious metal—while providing navigation to three content sections: About Me, Case Studies, and Poetry.

## Solution

A Three.js-rendered 3D metallic gold rose positioned at 30° angle, allowing users to look "into" the rose. The rose has 8-10 petals total, with 3 active petals marked by subtle etched symbols. Clicking an active petal triggers a bloom animation where the rose opens further, the selected petal moves to center and expands, and content (from MDX files) is revealed inside the rose. Users can pan/rotate around the rose to explore it. Clicking outside the content area closes it and returns to the default rose view.

### Core Behavior

1. **Initial State**: Rose at 30° angle, gently rotating or idle, 3 petals have visible etched symbols
2. **Hover (Desktop)**: Active petals glow subtly on hover
3. **Click Active Petal**: Rose blooms outward, clicked petal expands to center, content appears inside
4. **Content View**: MDX content rendered inside the bloomed rose area
5. **Close**: Click outside content to return to initial state
6. **Navigation**: Can click different active petal while content is open to swap sections

## User Scenarios

### Loading & Initial View

**US-1**: User navigates to homepage on desktop
- Page loads
- Gold shimmer loading state appears
- Three.js initializes
- 3D gold rose fades in at 30° angle
- Rose has 8-10 petals, 3 with visible etched symbols
- User can see the rose is interactive

**US-2**: User navigates to homepage on mobile
- Same as US-1, but touch-optimized
- Rose renders at appropriate scale for viewport
- Touch targets are adequately sized

**US-3**: User waits for rose to load
- Gold shimmer pulses subtly while loading
- No jarring transition when rose appears
- Loading completes within reasonable time (< 3 seconds on decent connection)

### Exploration

**US-4**: User pans/rotates the rose on desktop
- User clicks and drags on empty space
- Rose rotates smoothly following cursor
- Can view rose from different angles
- Rotation has inertia/momentum feel
- Rotation is bounded (cannot flip rose upside down)

**US-5**: User pans/rotates the rose on mobile
- User touches and drags on empty space
- Same rotation behavior as desktop
- Two-finger pinch does NOT zoom (no zoom allowed)
- Rotation feels natural on touch

**US-6**: User identifies which petals are clickable
- 3 petals have subtle etched symbols visible at rest
- Symbols are distinct enough to notice but not garish
- On desktop hover, active petals emit soft golden glow
- Non-active petals have no hover effect

### Content Interaction

**US-7**: User clicks "About Me" petal on desktop
- User hovers over About petal (glow appears)
- User clicks
- Rose blooms animation plays (~0.5-0.8s)
- Other petals recede
- About petal moves to center and expands
- About Me MDX content fades in inside the rose
- Content is readable and scrollable if needed

**US-8**: User taps "Case Studies" petal on mobile
- User taps the Case Studies petal
- Same bloom animation as desktop
- Content appears inside rose
- Content is touch-scrollable
- Content fits mobile viewport appropriately

**US-9**: User taps "Poetry" petal
- Same interaction pattern as US-7/US-8
- Poetry MDX content displayed

**US-10**: User closes content view
- Content is open (any section)
- User clicks/taps anywhere outside the content area
- Close animation plays (reverse bloom)
- Rose returns to initial state
- Previously active petal returns to its position

**US-11**: User switches directly between sections
- About Me content is open
- User clicks Case Studies petal (still visible but receded)
- About content fades out
- Rose transitions to Case Studies bloom
- Case Studies content fades in
- No need to close first

### Edge Cases

**US-12**: User clicks non-active petal
- User clicks a decorative petal (no etched symbol)
- Nothing happens
- No error, no feedback needed
- Rose continues idle state

**US-13**: User rapidly clicks multiple petals
- Animation in progress
- User clicks another petal
- Either: queue the action, or ignore until animation complete
- No broken states or glitches

**US-14**: User resizes browser window
- Rose and content adapt to new viewport
- No layout breaks
- Content remains readable

**US-15**: User scrolls while content is open
- Content area is scrollable if content exceeds viewport
- Scrolling content does NOT rotate the rose
- Scroll is contained to content area

## Implementation Decisions

### Technology Stack

| Component | Technology |
|-----------|------------|
| 3D Rendering | Three.js via @react-three/fiber |
| React Integration | @react-three/fiber, @react-three/drei |
| Rose Model | Procedural geometry OR imported GLTF |
| Content | MDX files, dynamically imported |
| State Management | React useState/useContext (minimal) |
| Animation | Three.js animations or @react-spring/three |

### Architecture

- **GoldenRose component**: Main Three.js canvas wrapper
- **Rose mesh**: 3D rose geometry with petal groups
- **Petal component**: Individual petal with click handling, hover state
- **ContentPanel**: 2D React overlay positioned relative to 3D space
- **MDX loader**: Dynamic import of MDX content based on active section

### Integration with rspress

- Replace current Lit `HelloWorld` with React-based `GoldenRose`
- Keep existing theme CSS variables for color consistency
- MDX files stored in `docs/` or `content/` directory

### Current Implementation Status

| Component | Status |
|-----------|--------|
| rspress site | Implemented |
| Golden Rose theme (CSS) | Implemented |
| Lit HelloWorld placeholder | Implemented (to be replaced) |
| Three.js integration | Missing |
| 3D rose model | Missing |
| Petal interaction | Missing |
| Content sections (MDX) | Missing |
| Bloom animation | Missing |

## Testing Decisions

### E2E Testing (Cypress)

Each user scenario maps to a Cypress test. Key testing challenges:
- Three.js canvas requires special handling (WebGL context)
- Click coordinates must target 3D-projected positions
- Animation timing must be accounted for

### Test Strategy

1. **Smoke test**: Rose renders without error
2. **Interaction tests**: Petal clicks trigger correct behavior
3. **Content tests**: MDX content loads and displays
4. **Responsive tests**: Mobile viewport behaves correctly
5. **Navigation tests**: Section switching works

### Manual Verification Required

- Visual quality of metallic gold material
- Animation smoothness and feel
- Touch interaction naturalness on real devices
- Performance on lower-end mobile devices

## Out Of Scope

- WebGL fallback (explicitly excluded per user decision)
- Accessibility for screen readers (3D interaction is inherently visual)
- Multiple rose variants or themes
- Sound effects
- Save/restore view state
- Deep linking to specific sections
- Analytics tracking
- CMS integration for content

## Further Notes

### Performance Considerations

- Target 60fps on mid-range mobile devices
- Keep polygon count reasonable (exact count TBD in implementation)
- Consider LOD (Level of Detail) if performance issues arise
- Lazy load MDX content only when section is opened

### Content Structure

Three MDX files needed:
- `about.mdx` - About Me section
- `case-studies.mdx` - Case Studies/portfolio work
- `poetry.mdx` - Code poetry/creative writing

### Animation Timing

- Bloom animation: ~0.5-0.8 seconds
- Content fade in: ~0.3 seconds after bloom completes
- Close animation: reverse bloom, ~0.4 seconds
- Hover glow: instant on, 0.2s fade off

### Petal Configuration

The number of petals (8-10) should be configurable via a constant or prop, allowing easy adjustment during visual tuning without code changes.
