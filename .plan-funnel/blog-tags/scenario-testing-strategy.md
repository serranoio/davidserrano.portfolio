# Scenario Testing Strategy — Blog Tag Organization

**Status: skipped by user request (2026-06-21).**

This feature is a content/navigation change with no scenario harness or backend route surface. Verification is manual + existing Cypress patterns:

- **Manual home check** — `bun run dev`, open the home, confirm the writing section shows 4 tag cards in the documented order with the documented titles/blurbs/examples.
- **Manual sidebar check** — open any blog post (e.g. `/blog/flow`), confirm the sidebar shows four group headings (Spiritual, Tech, Yoga, Dance) and that multi-tag posts appear under each tag they carry.
- **Manual per-post tag check** — open `/blog/your-career-is-a-song`, confirm rspress renders the `[spiritual, tech]` tags.
- **Existing Cypress suite** — no new cypress tests required for this feature. Existing tests under `cypress/e2e/rose/` must continue to pass (they don't touch the writing section or sidebar).

No CLI-invocable harness contract is introduced.
