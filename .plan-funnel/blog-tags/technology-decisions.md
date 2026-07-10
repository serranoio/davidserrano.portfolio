# Technology Decisions — Blog Tag Organization

## Context
- rspress core (`@rspress/core` v2.0.9, `@rspress/shared` v2.0.9) is the only docs engine. No plugins are installed.
- `_meta.json` accepts a flat list of slug strings; rspress's `SidebarGroup` type supports nested groups with `text`, `link?`, `items: (SidebarGroup | SidebarItem | SidebarDivider | SidebarSectionHeader)[]`, plus `collapsible?` / `collapsed?`. The `themeConfig.sidebar[path]` field in `rspress.config.ts` overrides `_meta.json` ordering for that path.
- The home is rendered by a custom React/Lit `HomeLayout`; the writing section is a Lit element with hardcoded card content.

## Decision tree (resolved)

### Sidebar source of truth
| # | Decision | Choice | Why |
|---|---|---|---|
| 1 | How to group posts under tag headings | **Override `themeConfig.sidebar['/blog/']` in `rspress.config.ts`** with four `SidebarGroup` entries (Spiritual, Tech, Yoga, Dance). Same post appears under each group it's tagged with. | `_meta.json` is one flat list per directory; it can't natively duplicate a slug under multiple sections. `themeConfig.sidebar` accepts arbitrary nested groups and is the documented escape hatch. |
| 2 | What happens to `docs/blog/_meta.json` | **Leave as-is** | Once `themeConfig.sidebar['/blog/']` is set, rspress uses the config and ignores `_meta.json` for sidebar ordering. Removing it is unnecessary churn. |
| 3 | Group collapse state | **Spiritual expanded (`collapsed: false`); Tech, Yoga, Dance collapsed (`collapsed: true`)** | Spiritual is the largest group and the site's primary voice — visitors scanning the blog should see those titles first. |
| 4 | Post ordering within a tag group | **Alphabetical by title** | Deterministic, no editorial maintenance, and matches the lack of date frontmatter on most posts. |

### Single source of truth for post metadata
| # | Decision | Choice | Why |
|---|---|---|---|
| 1 | Where the slug → title → tags map lives | **A single TypeScript constant `BLOG_POSTS` in `theme/blog-posts.ts`**, exported as `readonly` array of `{ slug, title, tags }`. | Both `rspress.config.ts` (sidebar) and `theme/components/writing-section.ts` (tag cards) need this data; one constant prevents drift. DRY rule per CLAUDE.md. |
| 2 | How `rspress.config.ts` reads it | Direct `import { BLOG_POSTS } from './theme/blog-posts'` | The rspress config is a TS file already; rspack handles the import. |
| 3 | How the writing section reads it | Direct import in `theme/components/writing-section.ts`; filter by tag, pick first 3 by alphabetical title for the "example titles" rendered on each card. | Deterministic; matches the sidebar ordering rule. |
| 4 | Should `BLOG_POSTS` titles match each post's H1 / frontmatter `title:`? | **Yes** — the constant is the source of truth, and we hand-confirm against each post's frontmatter at write time. | Auto-extracting frontmatter at build would require a script and a build hook; not worth it for 23 posts. |
| 5 | Tag type safety | Export `type BlogTag = 'spiritual' \| 'tech' \| 'yoga' \| 'dance'` and have `BLOG_POSTS[i].tags: readonly BlogTag[]`. | Loud at compile time if a typo creeps into the taxonomy. |

### Writing-section card content
| # | Decision | Choice | Why |
|---|---|---|---|
| 1 | Where card titles/blurbs live | **A `TAG_CARDS` constant alongside `BLOG_POSTS`** in `theme/blog-posts.ts`, keyed by tag. | One file, both surfaces. |
| 2 | Card order | **Spiritual, Tech, Yoga, Dance** (matches the PRD). | Largest cluster first; matches sidebar ordering. |
| 3 | Example-title selection | **First three posts (alphabetical by title) tagged with that tag.** Falls back to "all of them" for `dance` which has only 2. | Deterministic; no hand-curated favorites list to maintain. |

### Blog post frontmatter
| # | Decision | Choice | Why |
|---|---|---|---|
| 1 | YAML tag format | `tags: [spiritual, yoga]` (inline array, unquoted). Matches existing frontmatter style. | rspress reads YAML; existing posts use this exact form. |
| 2 | Replace legacy tags | **Hard replace** the 4 posts that have `[Song, Music]`, `[Kid, fun, enjoyment]`, `[artist, dopamine detox]`, `[Love, Self-love, Amor, El Amor Propio]`. | Legacy tags are not used by any UI. |
| 3 | `intro.md` (which lacks frontmatter) | Add a `tags: [spiritual]` frontmatter block while preserving the existing `sidebar_position: 1`. | Required so it appears under Spiritual in the new sidebar groups. |

### Out of scope (explicitly rejected)
| Option | Why rejected |
|---|---|
| Build-time script that auto-extracts frontmatter into a JSON file | Over-engineering for 23 hand-edited posts; introduces a build step where none is needed. |
| Custom rspress plugin to render tag pages | PRD declares tag landing pages out of scope. |
| Tag inheritance logic (`yoga` implies `spiritual` at runtime) | PRD pinned: subset relationship is editorial; every post double-tags explicitly. |
| Per-post date frontmatter for chronological sort | Most posts lack dates; alphabetical-by-title is sufficient. |

## Product-First / Harness Boundary
N/A — no scenario harness in this feature.

## Constraints carried into the plan
- `BLOG_POSTS` and `TAG_CARDS` constants live together in `theme/blog-posts.ts` and are imported by both `rspress.config.ts` and `writing-section.ts`.
- The new sidebar config does not touch any production runtime route — it's a build-time docs config.
- Card example-title selection is deterministic (alphabetical, first 3) — no editorial maintenance on the cards as posts get added.
