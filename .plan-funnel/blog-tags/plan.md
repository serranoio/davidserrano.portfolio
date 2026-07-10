# Plan — Blog Tag Organization

## Implementation constraints (carried from earlier stages)
- Taxonomy: `spiritual | tech | yoga | dance`. `yoga` and `dance` are editorial subsets of `spiritual`; every post tagged `yoga` or `dance` must be double-tagged with `spiritual` in frontmatter. No runtime inheritance logic.
- Single source of truth file `theme/blog-posts.ts` exports `BLOG_POSTS`, `TAG_CARDS`, and `type BlogTag`. Imported by both `rspress.config.ts` and `theme/components/writing-section.ts`.
- Sidebar: override `themeConfig.sidebar['/blog/']`. Spiritual expanded; Tech, Yoga, Dance collapsed. Alphabetical-by-title within each group.
- Writing-section: 4 cards (Spiritual, Tech, Yoga, Dance) in that order; example titles = first 3 alphabetical posts per tag (Dance shows all of them since only 2 exist).
- No scenario harness; verification is `bun run dev` + manual + the existing Cypress rose suite continuing to pass.
- All 23 blog posts get their frontmatter tags fully replaced per the PRD's mapping table.

## Vertical slices

Slices are independent enough that each leaves the site in a runnable state. Order matters only because Slice 2 imports the file Slice 1 creates.

---

### Slice 1 — `theme/blog-posts.ts` (single source of truth)

**Goal**: Create the typed constant that every other slice imports from.

**Files added**
- `theme/blog-posts.ts`

**Contents**
- `export type BlogTag = 'spiritual' | 'tech' | 'yoga' | 'dance';`
- `export interface BlogPost { slug: string; title: string; tags: readonly BlogTag[]; }`
- `export const BLOG_POSTS: readonly BlogPost[] = [ ... 23 entries ... ];` — one entry per post. Titles transcribed from each post's `title:` frontmatter (or first `# Heading` for posts without title frontmatter).
- `export const TAG_CARDS: Record<BlogTag, { title: string; blurb: string }> = { spiritual: { title: 'Inner Work & The Quiet Craft', blurb: '...' }, tech: { ... }, yoga: { ... }, dance: { ... } };` — exact strings from the PRD.
- `export const TAG_ORDER: readonly BlogTag[] = ['spiritual', 'tech', 'yoga', 'dance'];`
- `export const TAG_LABELS: Record<BlogTag, string> = { spiritual: 'Spiritual', tech: 'Tech', yoga: 'Yoga', dance: 'Dance' };` — sidebar headings (short form).
- `export function postsByTag(tag: BlogTag): readonly BlogPost[]` — filters `BLOG_POSTS`, sorts alphabetically by title.

**Verification**
- `bunx tsc --noEmit` produces no new errors mentioning `blog-posts.ts`.
- Manual: open the file, confirm 23 entries and 4 tag-card definitions.

**Done when**: File exists, type-checks, and a quick `console.log(postsByTag('dance'))` invocation (deleted after) returns the 2 expected posts.

---

### Slice 2 — Rewire `<writing-section>` to use tag data

**Goal**: Replace the 3 hardcoded theme cards with 4 tag-driven cards from `BLOG_POSTS` / `TAG_CARDS`.

**Files changed**
- `theme/components/writing-section.ts`: replace `WRITING_THEMES` constant with a derived array `TAG_ORDER.map(tag => ({ tag, ...TAG_CARDS[tag], examples: postsByTag(tag).slice(0, 3).map(p => p.title) }))`. Render `${theme.examples.length}` items unchanged.
- `theme/components/writing-section.styles.ts`: no change. The 4-card auto-fit grid wraps naturally on the existing breakpoints.

**Verification**
- `bun run dev`, open the home, confirm 4 cards in the correct order with the correct titles, blurbs, and example titles.
- Confirm cards still link to `/blog/intro`.

**Done when**: The home renders 4 tag cards driven entirely by `theme/blog-posts.ts`; removing or renaming a post in `BLOG_POSTS` shows up immediately on HMR.

---

### Slice 3 — Override `themeConfig.sidebar['/blog/']`

**Goal**: Group blog posts under tag headings in the sidebar.

**Files changed**
- `rspress.config.ts`:
  - `import { TAG_ORDER, TAG_LABELS, postsByTag } from './theme/blog-posts';`
  - Inside `themeConfig`, add `sidebar`:
    ```ts
    sidebar: {
      '/blog/': TAG_ORDER.map((tag) => ({
        text: TAG_LABELS[tag],
        collapsible: true,
        collapsed: tag !== 'spiritual',
        items: postsByTag(tag).map((p) => ({
          text: p.title,
          link: `/blog/${p.slug}`,
        })),
      })),
    }
    ```
  - This matches the `SidebarGroup` shape exported from `@rspress/shared` (`{ text, items, collapsible?, collapsed? }`). The same `SidebarItem` (same `link`) appearing under multiple groups is structurally supported because each group's `items` array is independent.

**Verification**
- `bun run dev`, open `/blog/flow`, confirm sidebar shows four group headings in the order Spiritual / Tech / Yoga / Dance.
- Confirm posts tagged `[spiritual, yoga]` (e.g. `flow`) appear under both **Spiritual** and **Yoga**.
- Confirm Spiritual is expanded by default; Tech/Yoga/Dance are collapsed.
- Confirm alphabetical ordering within each group.

**Done when**: The sidebar matches the four-group structure across every blog page.

---

### Slice 4 — Apply tags to all 23 blog post frontmatters

**Goal**: Make per-post tag rendering work and align reality with `BLOG_POSTS`.

**Files changed (23 files)**
For each post in `docs/blog/`:
- Add/replace the `tags:` line in the YAML frontmatter to match the PRD mapping table.
- Remove legacy tag lines (`[Song, Music]`, `[Kid, fun, enjoyment]`, `[artist, dopamine detox]`, `[Love, Self-love, Amor, El Amor Propio]`).
- `intro.md` currently has a frontmatter block with only `sidebar_position: 1`; add `tags: [spiritual]` to it (preserve `sidebar_position`).

Posts and tags (from PRD):

| Slug | Tags |
|---|---|
| intro | spiritual |
| about-the-founder | spiritual |
| become-a-kid-again | spiritual |
| daily-affirmation | spiritual |
| disruptive-strategic-design | tech |
| everything-in-moderation-is-unsufficient | spiritual |
| flow | spiritual, yoga |
| how-to-celebrate-your-birthday | spiritual |
| imagine-a-world | spiritual |
| intro-to-bachata | spiritual, dance |
| my-weaknesses | spiritual |
| thankgiving | spiritual |
| the-forge | spiritual |
| the-lifelong-conflict | spiritual, yoga |
| the-machete-of-self-love | spiritual |
| the-missing-piece-to-agile | tech |
| the-phoenix-of-the-soul | spiritual |
| the-shield-of-aeneas | spiritual |
| the-story-of-christ | spiritual |
| what-living-with-purpose-really-means | spiritual, yoga |
| work-hard-play-hard | spiritual, tech |
| your-career-is-a-song | spiritual, tech |
| your-life-is-a-dance | spiritual, dance |

**Verification**
- `bun run dev`, open `/blog/your-career-is-a-song`, confirm rspress renders the `spiritual` and `tech` tag chips.
- Open `/blog/the-machete-of-self-love`, confirm the legacy `[Love, Self-love, Amor, El Amor Propio]` tags are gone and replaced with `[spiritual]`.
- `bun run dev` reports no new compile errors mentioning any of the 23 post files.

**Done when**: All 23 post frontmatters carry exactly the tags from the table above; `BLOG_POSTS` in code and the per-post frontmatter are consistent.

---

## Cross-slice integration check (after all 4 slices)
1. `bun run dev` — home shows 4 tag cards; sidebar (on any blog post) shows 4 tag groups; multi-tagged posts duplicate across groups; per-post chips render.
2. Existing Cypress rose suite (`cypress/e2e/rose/`) passes unchanged.
3. The four card example-title lists on the home **match** the first 3 alphabetical post titles in each tag's sidebar group — same source of truth, same ordering.
4. `bunx tsc --noEmit` produces no new errors beyond the pre-existing JSX `IntrinsicElements` warnings.

## Current-state status going in
- Tag taxonomy: **not implemented**. 4 posts carry inconsistent legacy tags; 19 carry none.
- Sidebar grouping: **not implemented**. `_meta.json` is a flat ordered list.
- Writing-section: **partially implemented** with 3 hardcoded prose-theme cards (the surface exists but does not yet reflect tag data).
- Per-post tag chips: **implemented by rspress core** but only firing on the 4 posts with legacy tags.

## Risks & open items
- **Dead link in `the-machete-of-self-love.md`** breaks `bun run build` and is pre-existing. Not in scope here. Dev-server verification (the primary check) still works.
- **Title transcription** — the slug→title map in `BLOG_POSTS` must match each post's actual title. Verified by reading each post's frontmatter / first heading at write time. Drift after this slice is a maintenance hazard; mitigated by the fact that adding a post requires editing `BLOG_POSTS` (loud, single file).

## Parallelism
- Slice 1 must land before Slice 2 or Slice 3 (both import from it).
- Slice 4 (frontmatter edits) is independent and can be done in parallel with Slice 1 — but easier sequenced after Slice 1 so the slug list is locked in.
- Slices 2 and 3 are independent once Slice 1 lands.

## Handoff
This plan is ready for a single implementation agent. No harness, no scenario seeding, no production-contract leakage concerns.
