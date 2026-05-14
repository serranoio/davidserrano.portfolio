# Diagnosis: 3D Golden Rose Navigation

## Problem Statement

The portfolio homepage needs a distinctive, memorable centerpiece that embodies the "Golden Rose" aesthetic while serving as the primary navigation. Current state is a placeholder "Hello World" Lit element.

## Desired Outcome

A 3D metallic gold rose rendered in Three.js that:
- Serves as **navigation** to 3 content sections (About Me, Case Studies, Poetry)
- Creates an **unforgettable first impression** - not a generic portfolio
- Embodies **organic elegance meets precious metal** - the golden rose that doesn't exist in nature

## Resolved Decisions

### Interaction Pattern: Bloom Outward

When user clicks an active petal:
1. The entire rose blooms more fully
2. Clicked petal moves to center and expands
3. Other petals recede backward
4. Content is revealed **inside/behind** the expanded petal
5. No camera zooming - transformation happens in place

To return: Click anywhere outside the content area.

### Visual Structure

| Aspect | Decision |
|--------|----------|
| Total petals | 8-10 (configurable) |
| Active petals | 3 (About Me, Case Studies, Poetry) |
| Inactive petals | Decorative, non-clickable |
| Active indicators | Subtle etched symbols on the 3 active petals |
| Orientation | To be determined - whatever works best for interaction |
| Theme | Metallic gold, warm black background, Golden Rose palette |

### Content Integration

- Content sourced from **MDX files** (integrates with rspress)
- Rendered inside the bloomed rose area
- Must support text, images, and rspress MDX features

### Platform Requirements

- **Must work on mobile** - fully interactive touch support
- Pan/rotate controls for exploring the rose
- Responsive to screen size

## Technical Constraints

### Existing Stack
- rspress static site with custom theme
- Lit elements for components
- Golden Rose CSS variables defined
- Bun for package management

### Integration Points
- Three.js must integrate with rspress/React theme
- MDX content must be loadable dynamically
- Rose component lives in the HomeLayout override

## Resolved Questions

| Question | Decision |
|----------|----------|
| Orientation | 30° angled view - see into the rose like a cup |
| Mobile interaction | Simple tap - tap petal to open, tap outside to close |
| Loading state | Gold shimmer - subtle pulsing gold gradient |
| WebGL fallback | None - no fallback, WebGL required |
| Performance | Defer to implementation - keep polygon count reasonable |

## Risks

| Risk | Mitigation |
|------|------------|
| Three.js + rspress/React integration complexity | Use @react-three/fiber for React integration |
| Mobile 3D performance | Keep polygon count low, use LOD, test early |
| Petal click detection accuracy | Raycasting with generous hit areas |
| Content readability inside 3D space | Content renders in 2D overlay positioned by 3D coordinates |

## Current State

- **Portfolio site**: Implemented - rspress with Golden Rose theme
- **Homepage component**: Implemented - Lit element showing "Hello World"
- **3D rose**: Missing - not yet built
- **Content sections**: Missing - MDX files not yet created
- **Three.js integration**: Missing - not yet installed or configured
