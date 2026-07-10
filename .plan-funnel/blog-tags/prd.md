# PRD — Blog Tag Organization

## Problem
The blog has 23 posts spanning spiritual practice, engineering, and creative metaphors, but readers have no way to filter or browse by theme. The new `<writing-section>` on the home page summarizes types of writing but does so with hardcoded prose. Tagging is needed as a first-class organizing dimension across the sidebar, the home page's writing section, and (implicitly) every post itself.

## Taxonomy
Four tags. `yoga` and `dance` are **subsets of `spiritual`** (every post tagged `yoga` or `dance` must also be tagged `spiritual` — enforced by hand-edited frontmatter, no inheritance logic).

- **`spiritual`** — self-development, meditation, dopamine detox, faith, gratitude, the inner work.
- **`tech`** — engineering, strategy, agile, software craft.
- **`yoga`** — flow state, breath, purpose, meditation practice (subset of `spiritual`).
- **`dance`** — bachata, "life as a dance" metaphor essays (subset of `spiritual`).

Multi-tag is allowed (a post may carry e.g. `[spiritual, tech]`).

## User Scenarios

### Scenario 1 — Reader browses the blog sidebar by tag
A reader opens any blog page (e.g. `/blog/flow`) and sees the left sidebar with posts grouped under tag headings: **Spiritual**, **Tech**, **Yoga**, **Dance**. A post tagged `[spiritual, yoga]` appears under both **Spiritual** and **Yoga**. Clicking any post navigates to that post.

### Scenario 2 — Reader lands on the home and explores writing themes
A reader scrolls past the welcome and the rose and reaches the writing section. They see **four tag cards** (one per tag) — each card shows the tag name, a one-line description of the theme, and three example article titles drawn from that tag. Clicking a card takes them to the blog (currently `/blog/intro`, or to a tag-filtered destination if one exists — see "Out of Scope" below).

### Scenario 3 — Reader sees a post's tags on the post itself
When a reader opens a blog post, the post's tags are visible (rspress already renders frontmatter `tags:` as tag chips in its default theme; this scenario is satisfied by ensuring every post has the correct `tags:` frontmatter).

## Out of Scope
- **No dedicated tag index pages** (e.g. `/blog/tags/spiritual`). Sidebar grouping + writing-section cards are the navigation surfaces. If the user later wants tag landing pages, that's a follow-up.
- **No tag-filtered home page UI** beyond the writing section.
- **No tag inheritance logic** at build/render time — `yoga` posts must explicitly carry both `[spiritual, yoga]` in frontmatter. The subset relationship is editorial, not mechanical.
- **No old-tag preservation** — the 4 posts with inconsistent existing tags (`[Song, Music]`, `[Kid, fun, enjoyment]`, etc.) have their tags fully replaced.
- **No dynamic tag count badges** ("Spiritual (15)") in the sidebar in this iteration.

## Solution Boundary

### What changes
1. **23 blog post frontmatters** — each gets `tags:` set to one or more of `[spiritual, tech, yoga, dance]` per the mapping confirmed in diagnosis.
2. **`docs/blog/_meta.json`** — converted from a flat ordered list into a grouped structure where each group is a tag heading.
3. **`theme/components/writing-section.ts`** — the three hardcoded theme cards are replaced with four tag cards driven by a single shared TypeScript constant (the tag → title/blurb/example-titles mapping).
4. **`docs/blog/intro.md`** — receives the `spiritual` tag for completeness (it appears in the sidebar under Spiritual).

### What does not change
- `theme/index.tsx` (the home composition is unchanged; only the writing-section's contents change).
- `theme/components/writing-section.styles.ts` (4 cards still flow through the same `auto-fit, minmax(280px, 1fr)` grid).
- The rspress core; no plugins added.
- The welcome section, golden rose, or any other component.

## Tag → Post Mapping (Source of Truth)

| Post slug | Tags |
|---|---|
| `intro` | spiritual |
| `about-the-founder` | spiritual |
| `become-a-kid-again` | spiritual |
| `daily-affirmation` | spiritual |
| `disruptive-strategic-design` | tech |
| `everything-in-moderation-is-unsufficient` | spiritual |
| `flow` | spiritual, yoga |
| `how-to-celebrate-your-birthday` | spiritual |
| `imagine-a-world` | spiritual |
| `intro-to-bachata` | spiritual, dance |
| `my-weaknesses` | spiritual |
| `thankgiving` | spiritual |
| `the-forge` | spiritual |
| `the-lifelong-conflict` | spiritual, yoga |
| `the-machete-of-self-love` | spiritual |
| `the-missing-piece-to-agile` | tech |
| `the-phoenix-of-the-soul` | spiritual |
| `the-shield-of-aeneas` | spiritual |
| `the-story-of-christ` | spiritual |
| `what-living-with-purpose-really-means` | spiritual, yoga |
| `work-hard-play-hard` | spiritual, tech |
| `your-career-is-a-song` | spiritual, tech |
| `your-life-is-a-dance` | spiritual, dance |

(Note: `intro-to-bachata` updated from `dance` → `[spiritual, dance]` to enforce the subset rule.)

## Writing-Section Tag Cards (Source of Truth)

| Tag | Card title | Card blurb | Example titles |
|---|---|---|---|
| `spiritual` | Inner Work & The Quiet Craft | Essays on meditation, dopamine detox, gratitude, and the practice of becoming the creator of your own days. | *About The Founder*, *The Machete of Self-Love*, *The Phoenix of the Soul* |
| `tech` | Strategy & Engineering Craft | Where the inner work meets the work — diagnosis, guiding insight, and the missing piece behind agile teams that actually ship. | *Disruptive Strategic Design*, *The Missing Piece to Agile*, *Your Career Is a Song* |
| `yoga` | Flow, Breath & The Present Moment | Living from prana — meditation, the flow state, and the truth that joy emanates from within. | *The Flow State*, *The Lifelong Conflict*, *What Living With Purpose Really Means* |
| `dance` | Life as a Dance | Bachata, rhythm, and the metaphor that misstepping is part of the dance. | *Intro to Bachata*, *Your Life Is a Dance* |

## Current Status — Direct Language
- Tag taxonomy: **not implemented** (4 posts have inconsistent legacy tags; 19 posts have none).
- Sidebar grouping by tag: **not implemented**.
- Writing-section tag cards: **not implemented** (three hardcoded prose-theme cards exist instead).
- Per-post tag rendering: **implemented by rspress core** when frontmatter `tags:` exists — works today on the 4 posts that have legacy tags.

## Acceptance Criteria
1. All 23 blog post frontmatters carry the tags specified in the mapping table above and only those tags (legacy tags are removed).
2. Opening any blog post in the dev server shows a sidebar with four group headings — Spiritual, Tech, Yoga, Dance — and each post appears under every heading whose tag it carries.
3. Opening the home page in the dev server shows the writing section with four tag cards (in the order Spiritual, Tech, Yoga, Dance), each with the title/blurb/example titles defined above, and the CTA still reads "Read the blog →" → `/blog/intro`.
4. The build (`bun run build`) does not introduce new errors beyond the pre-existing dead-link error in `the-machete-of-self-love.md`.
