# Diagnosis — Blog Tag Organization

## The Request
Tag all blog articles with one or more of `spiritual`, `tech`, `dance`, `yoga`. Surface tags as an organizing dimension in:
1. The rspress **sidebar** (when reading the blog)
2. The **home page**
3. The **writing section** (the new home section that summarizes the writing)

## Current State

### Implemented
- 23 blog posts under `docs/blog/`.
- `docs/blog/_meta.json` orders the sidebar manually.
- A custom home (`theme/index.tsx → HomeLayout`) renders `<welcome-section>` → `<golden-rose>` → `<writing-section>` (the writing section already has three hardcoded theme cards with example titles).
- 4 posts have existing frontmatter `tags:` lines, but the tags don't match the new taxonomy (e.g. `[Song, Music]`, `[Kid, fun, enjoyment]`).

### Missing / Unreliable
- **No tag taxonomy is enforced** — 19 of 23 posts have no tags; the 4 that do use inconsistent labels.
- **No tag-filtered sidebar** — `_meta.json` is a flat ordered list with no grouping.
- **No tag index page or filter UI** — rspress core has no built-in tag system; tags in frontmatter are inert metadata.
- **`docs/index.md` is the rspress default ("My Site") and is overridden by `HomeLayout` in `theme/index.tsx`** — it is not the actual home users see, but it does exist on disk and could mislead future work.

## Unknowns Worth Pinning Down

1. **What does "home page should have it too" mean?**
   - Option A: The `<writing-section>` (which IS on the home) gets the tag-organized treatment, and there is nothing else to change on the home. (Recommended — the writing section is the home's writing surface.)
   - Option B: A separate tag-filter UI is added to the home (above or below the writing section).
   - Option C: The hero/welcome area gets a tag pill row.

2. **What does "sidebar" mean?**
   - Option A: Group posts under tag headings in the blog sidebar (e.g. ▾ Spiritual, ▾ Tech…). (Recommended — matches rspress's `_meta.json` group syntax.)
   - Option B: Add a single "Tags" entry that links to a tag index page.
   - Option C: Both.

3. **Should tag taxonomy be exclusive (one tag per post) or multi-tag?**
   - Multi-tag (recommended): posts like "Your Career Is a Song" are both `spiritual` and `tech`. A sidebar grouping then duplicates the entry under each tag heading.
   - Exclusive: simpler routing, but forces awkward primary-tag picks.

4. **Should the existing inconsistent tags on the 4 tagged posts be replaced or kept alongside?**
   - Recommended: replace with the new taxonomy (`spiritual`/`tech`/`dance`/`yoga`); the old tags are not used by any UI today.

5. **Tag → post mapping for all 23 posts** — needs author judgment per post; recommendations below.

## Recommended Tag Mapping (for confirmation)

| Post slug | Recommended tags |
|---|---|
| `about-the-founder` | spiritual |
| `become-a-kid-again` | spiritual |
| `daily-affirmation` | spiritual |
| `disruptive-strategic-design` | tech |
| `everything-in-moderation-is-unsufficient` | spiritual |
| `flow` | spiritual, yoga |
| `how-to-celebrate-your-birthday` | spiritual |
| `imagine-a-world` | spiritual |
| `intro-to-bachata` | dance |
| `intro` | spiritual |
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

## Product-First / Harness Boundary Check
N/A — this is a content/navigation feature with no scenario harness or backend route concerns.

## Risks & Constraints
- rspress core has no first-class tag system; this is an additive concern requiring either (a) a custom theme component that reads frontmatter at build time, (b) a generated tag index page, or (c) a hand-maintained `_meta.json` group structure. Decision deferred to the technology-decisions stage.
- The writing-section currently has hardcoded theme cards. Switching it to tag-driven cards needs to be reconciled with the names already chosen ("Inner Work & The Flow State", "Life as a Dance, Career as a Song", "Strategy & Engineering Craft") which don't 1:1 match `spiritual / tech / dance / yoga`.

## Resolutions Confirmed (2026-06-21)

1. **Home page** = the existing `<writing-section>` is the home's writing surface; it gets reorganized around the 4 tags. No other home changes.
2. **Sidebar** = group posts under tag headings in `docs/blog/_meta.json` using rspress's group syntax.
3. **Multi-tag** posts allowed; sidebar duplicates an entry under each tag heading it belongs to.
4. **Replace** the existing inconsistent tags with the new 4-tag taxonomy.
5. **Tag mapping** as recommended.
6. **`yoga` and `dance` are subsets of `spiritual`** — any post tagged `yoga` or `dance` is implicitly also `spiritual` and is double-tagged in frontmatter to make sidebar grouping mechanical (no implicit inheritance logic).

## Next Stage
Write `prd.md`.
