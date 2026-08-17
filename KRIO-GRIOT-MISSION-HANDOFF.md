# Krio Griot — Mission Handoff for Claude Code

**Read this entire document before touching any code.** This is not a style guide and not a bug list — it is the "why" that has been missing from prior sessions. If a feature request in this document conflicts with something already built, this document wins. Ask before assuming.

---

## 1. What Krio Griot is

Krio Griot (kriogriot.com) is a genealogy and archival research platform built by Aisha LaDon Abdul Rahman — archivist, genealogist, and founder of Legacy Lab LLC — for African American and African diaspora families.

The governing creative frame: **a Sierra Leonean Mende griot, speaking from the year 3000, reciting a present-day family line.** The future is the posture. The present is the content. Every date, record, and name on the site is real history — only the voice comes from somewhere else. The griot is a keeper of oral history and lineage, the West African role this platform is named for.

Tagline: **"Named, not counted."** — a direct reference to the fact that, for most of American history, enslaved and formerly enslaved people were recorded as tally marks and property, not names. This platform exists to reverse that.

## 2. The purpose — the part that got missed

**Krio Griot is meant to be a one-stop shop.**

Right now, someone researching an African American or diaspora ancestor has to go to FamilySearch, then Ancestry, then the National Archives (NARA) catalog, then maybe Chronicling America for newspapers, then Slave Voyages, then a university's slavery-era archive, then back to FamilySearch for the Freedmen's Bureau collection — logging in and out of five to seven different platforms, most of which were never built with this specific research problem in mind.

**Krio Griot's core product is collapsing that into one search, in one place.** A person should be able to come to Krio Griot, enter what they know about an ancestor, and have the platform search across the relevant free/public genealogical and archival databases simultaneously — the way the site already promises through its brand voice ("I search," "I hold what survived of your line") — and return real, cited results, clearly marked by how each fact is known.

This was the single most important differentiator discussed from the earliest planning conversations onward. It is not a "nice to have" or a stretch goal. **It is the product.** Everything else — the person profiles, the family tree, the epistemic notation system, the DNA match interpretation — supports this core function or presents its output. If this function does not work, Krio Griot is a pretty database front-end, not the platform it was designed to be.

This is why finding out it was never actually implemented — after weeks of build sessions, believing it was ready to beta test and share publicly — is such a serious problem. It needs to be treated as the top-priority gap, not one item on a longer list.

## 3. Who this is for

African American and diaspora researchers, many of whom hit the "1870 brick wall" — the point before which most formerly enslaved people appear in records only as property, not as named individuals. This audience is often underserved by mainstream genealogy platforms that were not built around Reconstruction-era, Freedmen's Bureau, and colonial-archive research patterns. Krio Griot is also meant to serve descendants of the enslaved connected to specific institutional histories (e.g., university slavery-era projects like GU272/Georgetown).

The platform must be honest, not aspirational, about what it can and cannot find — this is core to the brand voice (see Section 6) and to the trust this audience is owed. A missing record is reported as absent, not glossed over.

## 4. The feature that must be built: multi-database research aggregation

### 4.1 What "done" looks like

A researcher submits a query (ancestor name, approximate dates, location, and whatever else is known — enslaver surname, county, spouse, etc.) through a research intake form or an ancestor's profile ("Run Research" or equivalent). The platform:

1. Queries multiple real databases **through their actual APIs**, not through generic web search, and not by scraping login-walled sites.
2. Compiles what it finds into a structured result: which database, which collection, what was found (or explicitly, that nothing was found), and a citation/link back to the source record.
3. Saves findings back into the platform's own data (MySQL) so they persist on the ancestor's profile, tagged with the correct epistemic state (see Section 6.4) and a source citation.
4. Never fabricates a result. If a database returns nothing, that is reported as an "absent" result — see the brand voice principle "the log is kept whether I find someone or not."

### 4.2 The databases, their actual API status, and why this matters

This is the part that seems to have gotten lost. Not everything can be integrated the same way — Claude Code needs to know the real constraints going in, or it will either give up on the whole feature or fake something with generic web search that returns nothing useful.

| Source | Public API? | Cost | Notes |
|---|---|---|---|
| **FamilySearch** | Yes — free developer API | Free | Priority #1. Billions of indexed records including the full Freedmen's Bureau collection, fully digitized and searchable. Has an MCP connector available for direct Claude integration. Requires free developer registration at developers.familysearch.org. |
| **NARA (National Archives) catalog** | Yes — public API | Free | Catalog search; tells you what exists and whether it's digitized. Many records require an in-person or written request even when catalogued. |
| **Chronicling America** (Library of Congress newspapers) | Yes — public API | Free | Newspaper archive, useful for obituaries, notices, and social records. |
| **Slave Voyages** | Public database, check current API/access terms | Free | Transatlantic and intra-American slave trade records. |
| **DPLA** (Digital Public Library of America) | Yes — public API | Free | Aggregates many archives; useful secondary source. |
| **GU272 / Georgetown Memory Project and similar university projects** | Varies by institution — verify per source | Usually free | Check current access method per project; some are static datasets, not live APIs. |
| **Geni.com** | Yes — public API | Free | Requires app registration (App ID/Secret). Sparse for pre-1870 African American lines, stronger for finding living cousins and collaborative trees. Lower priority. |
| **MyHeritage** | Yes, has an API | Paid — requires active MyHeritage subscription (~$179/yr) | Do not build against this until Aisha confirms she wants to pay for the subscription. Flag as a paid-tier integration, not default. |
| **Findmypast** | Documented API exists | Paid subscription required | Same treatment as MyHeritage — confirm before building. |
| **Ancestry.com** | **No public API.** Closed years ago. | N/A | **Cannot be integrated.** Their Terms of Service explicitly prohibit automated access/scraping. Do not attempt to automate login or scrape Ancestry under any circumstance — this is a real legal/ethical line, not a technical inconvenience to route around. |
| **GEDmatch** | No public API | N/A | Cannot be integrated directly. |

**The critical technical point:** general-purpose AI web search (e.g., Claude's web search tool) does **not** reach into FamilySearch's or MyHeritage's actual record databases — those live behind their own search engines, not as indexed public web pages. A prior build used web search for this and it returned little to nothing useful, which is likely part of why this feature reads as "not really working" even though something resembling it may have been attempted. **Direct API integration is the only way this feature actually works.** This is not optional plumbing — it is the entire mechanism by which the one-stop-shop promise gets fulfilled.

### 4.3 What to check before writing new code

Before building anything, Claude Code should:

1. Grep the current codebase (`server/`) for any existing FamilySearch, NARA, Chronicling America, Slave Voyages, DPLA, Geni, or MyHeritage integration attempts, partial or otherwise, and report what it finds — including whether real API keys were ever wired up versus just left as placeholders in `.env.example`.
2. Check `.env` on the live Hostinger server (not just local) for which of these API keys actually exist and are populated, versus referenced in code but never set.
3. Report back honestly on what is real and working versus what is stubbed, mocked, or silently failing before writing new integration code. Do not assume prior session's claims of "done" are accurate — verify against the live site and live database.

### 4.4 Build order (suggested, confirm with Aisha before starting)

1. **FamilySearch first.** Free, highest record volume, has the Freedmen's Bureau collection, has an MCP connector option worth evaluating directly.
2. **NARA catalog second.** Free, tells researchers what exists even where digitization is incomplete.
3. **Chronicling America third.** Free, adds social/newspaper context.
4. Everything else (Slave Voyages, DPLA, GU272-style university projects, Geni) as subsequent passes — confirm scope with Aisha before each.
5. MyHeritage / Findmypast only if/when Aisha confirms she wants to pay for and connect a subscription-tier account.
6. Ancestry / GEDmatch: not buildable. Do not attempt.

## 5. Current technical state (verify all of this against the live server before proceeding — do not trust this list blindly either)

- Live site: kriogriot.com, hosted on Hostinger, Node.js/Express server, MySQL backend (database `u106934582_kriogriot`).
- **The Airtable-to-MySQL migration is complete.** Airtable is retired. Do not reference or rebuild against Airtable.
- The GitHub repo (`aishaladon/kriogriot`) is **stale and does not reflect the deployed site.** The live site uses a navy/mango/spring-green palette not present in the repo. Do not treat GitHub as source of truth for current design or code — the live `landing.html` / `landing.css` on the server are the source of truth for the front end.
- A Griot's Mango (handcrafted ancestor keepsake booklet) intake flow, admin view, and email notifications are separately specified and reportedly built — verify against live behavior, don't assume.
- pCloud archival file-renaming/metadata pipeline is a separate, deferred-scope project — not part of this handoff unless explicitly reopened.

## 6. Brand and voice guardrails (short form — full detail in KRIO-GRIOT-STYLE-GUIDE.md)

Any UI or copy touching this feature must follow these, non-negotiably:

1. **No emojis anywhere, ever.** SVG line icons only (Feather-style, `stroke="currentColor"`, `stroke-width: 1.5`).
2. **Never fabricate a result.** If a database search finds nothing, say so plainly — "the log is kept whether I find someone or not." This is a hard rule, not a tone preference — fabricated genealogical results actively harm this audience.
3. **Every result carries an epistemic state** — one of seven: documented, inferred, oral, carried, contested, absent, synthetic. A record actually pulled from FamilySearch/NARA/etc. is **documented**, not "verified" or "confirmed" — use the platform's own vocabulary.
4. **Minimize the word "AI."** Prefer "the research engine," "I search," "I read." The griot voice speaks in first person where it's present at all; technical/data areas can be plain and literal, but never hype-y ("unlock," "powerful," "revolutionary" are banned words).
5. **Every CRUD operation must call `showToast()` and force-refresh the relevant page** — established convention, keep following it.
6. **Person-reference fields render as clickable chips** via `renderPersonLinks()` / `openProfile()` — established convention, keep following it.

## 7. What Claude Code should do first, concretely

1. Read this document fully.
2. Read `KRIO-GRIOT-STYLE-GUIDE.md` for full brand/voice/design rules.
3. Audit the live server and codebase for what research-aggregation code actually exists today (Section 4.3) and report findings before writing anything new.
4. Propose a build plan for FamilySearch integration specifically, including exactly what needs to be registered/obtained (developer account, API key) and where it goes in `.env` on the live Hostinger server — and wait for confirmation before writing code.
5. Do not redesign, restyle, or "improve" any part of the site that isn't explicitly part of this feature. Aisha has been explicit and repeated on this point: surgical, minimal changes only, no unsolicited rebuilds.

## 8. How to know this is actually done (not just claimed done)

- A real query, run against the live site, returns real results from at least FamilySearch and NARA — or an honest "nothing found in these collections" response — with source citations, not a generic AI-written summary.
- Results are visibly saved to the ancestor's profile in MySQL with the correct epistemic tag.
- Aisha has personally tested it against a real ancestor she's already researched by hand, and the results match what she already knows exists (or honestly report what doesn't).
- No emoji, no fabricated confidence numbers, no invented sources anywhere in the output.

Do not report this feature as complete until it has been tested this way. "The code compiles and the button doesn't throw an error" is not the bar.
