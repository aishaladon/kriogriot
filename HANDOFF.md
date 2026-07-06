# Krio Griot — Handoff Notes

A genealogy research platform (Node/Express server + vanilla JS/HTML/CSS client) backed by Airtable for data storage and the Anthropic API for AI-assisted research. Originally built and iterated on with Claude Code on macOS; this note exists so a fresh session (e.g. Claude Cowork on Windows) has context the code alone won't fully convey.

## Structure

- `server/index.js` — Express routes
- `server/airtable.js` — all Airtable read/write logic, table schemas, profile aggregation
- `server/anthropic.js` — AI research / metadata extraction calls
- `client/app.js` — main app logic (all pages, tables, modals, toasts)
- `client/family-tree.js` / `family-tree.css` — interactive family tree page
- `client/landing.html` / `landing.css` — public marketing/landing page
- `client/index.html` / `styles.css` — the main app shell + styles

No git repo was initialized as of this handoff — consider setting one up for easier multi-machine sync going forward.

## Recent work (most recent session)

1. **Hero card stack on landing page** — 5 cards in an alternating cascade layout (`client/landing.css` `.ancestor-card:nth-child(n)`), not a flat overlap.

2. **Full person-profile expansion** — clicking a person's name now shows *everything* linked to them, not just a sparse summary:
   - `server/airtable.js` `getAncestorProfile()` now fetches and returns **8 separate arrays**: `questions`, `sources`, `evidence`, `dnaTests`, `dnaMatches`, `archives`, `collections`, `researchLog` (previously DNA Tests+Matches and Archives+Collections were merged into 2 generic arrays — this was changed to keep them distinct).
   - Added `getResearchLogByAncestor()` — Research Log was previously not fetched into the profile at all.
   - `client/app.js` `openProfile()` renders a rich bio grid (birth name, AKA, sex, race/ethnicity, places, generation, line, FamilySearch ID, Ancestry/Geni URLs, notes) plus **8 tabs** (one per data type above), each with full-column tables (not just 2–3 sparse fields).

3. **Person-link chips** — any field across tables that links to a Person (Research Questions, Research Log, DNA Matches, etc.) now renders as a clickable chip (`renderPersonLinks()` in `app.js`) that opens that person's profile via `openProfile(id)`.

4. **No emojis anywhere, ever** — explicit, repeated user instruction. All emoji icons were replaced with inline SVG (Feather-style, `stroke="currentColor"`, no fill, `stroke-width: 1.5`). If you're tempted to add an emoji for visual flair — don't. Use a simple line-icon SVG instead. There's a `_SVG` object and `_EMPTY_ICONS` map in `app.js` with reusable icon strings.

5. **Center-screen toast notifications** — `showToast()` in `app.js` was redesigned to show a centered (not bottom) notification with a success/error/warning/info icon. **Every save, delete, add, and bulk operation should call `showToast()`** (or `showAlert()`, which calls it internally) and force-refresh the affected page afterward via `showPage(pageId, true)` or `loadedPages.delete(pageId)` + reload. This was a recent explicit ask — if you add a new CRUD action, follow this pattern.

6. **Bulk select + delete** for duplicate-person records (`dupBulkDelete()`, `dupUpdateSelection()` in `app.js`).

## Known gotchas

- **Airtable field names with trailing spaces.** Two Research Questions fields have a literal trailing space in their Airtable field name: `"Reasonably Exhaustive Search Done "` and `"Conflicts Resolved "`. If a "field not found" error shows up referencing one of these, check for the trailing space — it's real, not a typo, and must match exactly in `TABLE_SCHEMAS` / any fetch code.
- If you hit similar "unknown field" errors elsewhere, use Airtable's Meta API (`GET /v0/meta/bases/{baseId}/tables`) to get exact field names/types rather than guessing.
- `.env` is **not** in this handoff or any zip — it must be recreated by hand on each machine using `.env.example` as the template (`ANTHROPIC_API_KEY`, `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`, `PORT`).
- The `uploads/` folder (locally cached scanned-archive images) is also excluded from transfers — the app already saves an `Image URL` back to Airtable for each archive item, so the local cache is generally not load-bearing.

## Conventions to keep following

- No emojis, ever, anywhere in the UI — simple line-icon SVGs only.
- Any CRUD action (save/edit/delete/bulk-edit/bulk-delete) should show a `showToast()` confirmation and force-refresh the relevant page/grid so the user sees the change immediately.
- Person-reference fields should render as clickable chips linking to that person's profile, not plain text.
