# Krio Griot — Brand & Voice Style Guide

Version 1.0 · August 2026
Built by Aisha LaDon Abdul Rahman, archivist and genealogist

---

## 1. The idea in one line

Krio Griot is a genealogy and archival platform for African American and diaspora family lines. Its differentiator is not search volume — it is **honesty about how each fact is known.**

**The governing frame:** a Sierra Leonean Mende griot, speaking from the far future, reciting a present-day family line. The future is the *posture*. The present is the *content*. Every date on the site is real history; only the voice comes from somewhere else.

---

## 2. Voice

### Person and stance
- **First person singular.** The griot speaks as herself: "I hold," "I looked," "I will not."
- She **addresses the visitor directly** as "you."
- She is **calm, certain, and unhurried.** She does not sell, hype, or exclaim.
- She **states limits plainly.** Refusal is part of her authority, not an apology.

### Where voice recedes
Voice belongs where trust is being established. It steps back where specification is required.

| Section | Register |
|---|---|
| Hero, notation, the 1870 break, footer | Griot — first person |
| Database fields, pricing, plan comparison, docs | Plain and literal |

A griot who won't tell you plainly what's in the box isn't trustworthy either. Switching registers is not breaking character.

### Rules
- Sentence case everywhere. Never Title Case.
- No exclamation marks.
- No em-dash-heavy corporate cadence. Short declaratives.
- Avoid "leverage," "unlock," "seamless," "empower," "powerful," "revolutionary."
- Minimize the word "AI." Prefer "the research engine," "the Archive Scanner," "I read," "I search."
- Never imply a Christian household as default. No "family bible" as the generic example — use "a letter kept," "a deed," "a register."
- Never invent an ancestor, a date, a place, or a proverb. Ever.

---

## 3. Core phrases

### Taglines (primary candidate first)
- **Named, not counted.** — current masthead line
- Say their names.
- I will always tell you how I know.
- Where the census stops, I keep going.

### Headline and hero
- **Sidɔm, a sabi usay yu kɔmɔt.** (Krio — "Sit, I know where you came from")
- I hold what survived of your line.
- I will say each name, and tell you every hand it passed through to reach you.

### Trust lines (use these — they are the brand)
- We tell you how we know, not just what we found.
- The silences are marked as silences.
- **I will not invent her.**
- A griot who guesses is not a griot.
- I will not fill a silence to make you feel better.
- Negative results are kept, not discarded.
- The log is kept whether I find someone or not.
- A name survives because someone kept it.
- They were counted and not named. That is a silence with a shape.

### Calls to action
- Ask me for a name
- Hear how I work
- Sit with me
- Start free

### Do not use
- "Unlock your family story"
- "Discover your roots"
- "Your journey begins"
- "Powerful AI-driven insights"
- Any phrasing that promises a result the records cannot guarantee

---

## 4. The seven ways of knowing

The core intellectual property. Every claim in the product carries one of these marks. Ship it as a `how_known` column before claiming it publicly.

| State | Meaning | Glyph | Color |
|---|---|---|---|
| **Documented** | A record is held | Solid ring, filled centre | Spring green |
| **Inferred** | Reasoned from evidence, not stated | Dashed ring, hollow centre | Pale blue |
| **Oral** | Testimony from kin | Small ring between two arcs | White |
| **Carried** | Handed down across a gap where no paper survived | Ring of long linked segments | Mango gold |
| **Contested** | Sources disagree | Two facing arcs that do not close | Mid blue |
| **Absent** | The record named no one — silence stated | Finely dotted open ring | Light blue |
| **Synthetic** | Machine-generated, never a record | Ring crossed by an X | White |

**Design rule:** each glyph must be distinguishable by *form alone*, without color. They must survive greyscale, small size, and low resolution.

**"Carried" is the original contribution.** Western archival practice has no equivalent. It is the griot's epistemology rendered as data.

---

## 5. Color

| Role | Name | Hex | Use |
|---|---|---|---|
| Ground | Deep harbour | `#04223F` | Page background |
| Ground 2 | Harbour | `#062F58` | Alternating sections, cards |
| Structure | Blue | `#2A6DB0` | Borders, rules, inactive states |
| Body text | Near-white | `#F0F6FC` | All body copy |
| Headline | White | `#FFFFFF` | Headings, names |
| Secondary text | Pale blue | `#C7DDF3` | Labels, captions, mono text |
| Verified | **Spring green** | `#3DDC84` | Documented state, CTAs, accents |
| Warm mark | **Mango gold** | `#EF9F27` | Logo, "carried" state, eyebrows |
| Warm shade | Blush | `#D85A30` | Logo two-tone only |
| Absent | Light blue | `#6FA9E0` | Absent state, gap markers |
| Paper | Bone | `#F4F2EC` | Document/scan surfaces |

### Palette origin
Blue, white, and green are the Sierra Leone flag — blue specifically for the natural harbour at Freetown, the water people left from and returned to. Green was shifted from flag leaf-green to a digital spring green to read as live signal rather than botanical.

### Rules
- **Mango gold is scarce.** It appears on the logo, the "carried" state, and section eyebrows. Nowhere else. If a second warm element appears, the mark stops being the signature.
- Green means verified. Do not use it decoratively.
- Body text is never pale blue on navy — contrast first.
- Bright green is for fills, marks, and bars. Never for paragraph text.
- Meaning must survive without hue.

---

## 6. Logo

**The mark is a mango** — asymmetric, tilted, filled two-tone gold and blush, with an offset green stem and leaf.

### Why filled, not outline
An outline reads as an egg. The interior two-tone carries the mango information and holds at 20px.

### Files
| File | Use |
|---|---|
| `kriogriot-mango-mark.svg` | Master — use for web wherever possible |
| `kriogriot-mango-mark-512/1024/2048.png` | Transparent raster, social avatars, decks |
| `kriogriot-mango-mark-white-512/1024.png` | Single-color reversed, for busy or photographic backgrounds |
| `kriogriot-lockup-white-1200/2400.png` | Horizontal lockup for dark backgrounds |
| `kriogriot-lockup-dark-1200/2400.png` | Horizontal lockup for light backgrounds |
| `kriogriot-favicon-32/64/180.png` | Browser and app icons |

All PNGs are RGBA with a genuinely transparent background.

### Rules
- Keep the stem. It is doing most of the identification work at small sizes.
- Never rotate, recolor, or add effects.
- Clear space around the mark: at least the width of the stem on all sides.
- Minimum size: 20px. Below that, use the favicon crop.
- The lockup's typeface is a placeholder — substitute the final brand face when chosen.

---

## 7. Typography

- **Body:** system sans stack. 17px base, line-height 1.7.
- **Headings:** 600 weight, tight tracking (`-0.02em`), sentence case.
- **Mono:** used for labels, dates, telemetry, archival notation, and eyebrows. Uppercase with wide tracking (`0.13em`) at 11–12.5px.
- **Names of ancestors** are the largest type on the page. They outrank headlines.
- Krio text must carry `lang="kri"` so screen readers pronounce it correctly.
- Confirm the chosen font renders **ɔ** (open o) natively — a fallback glyph mid-word is visible.

---

## 8. Interface principles

- **No emojis.** Anywhere. Ever.
- Iconography is SVG line work, Feather style, `stroke="currentColor"`, `stroke-width: 1.5`.
- Chrome must not lie. Telemetry strings show real archival notation (fonds, item, resolution) or nothing. No invented coordinates or fake confidence readouts.
- Motion respects `prefers-reduced-motion`.
- Sound is opt-in, never autoplay.
- Once a visitor takes manual control of the name rotation, it does not resume on its own.
- Every CRUD operation calls `showToast()` and force-refreshes the relevant page.
- Person-reference fields render as clickable chips.

---

## 9. Hashtags

**Verify availability and current usage before adopting.** These are candidates, not confirmed.

### Owned / brand
`#KrioGriot` · `#NamedNotCounted` · `#SayTheirNames` (widely used — check tone fit before adopting) · `#SevenWaysOfKnowing`

### Practice
`#BlackGenealogy` · `#AfricanAmericanGenealogy` · `#AncestralResearch` · `#FreedmensBureau` · `#1870BrickWall` · `#ReconstructionRecords` · `#ArchivalResearch` · `#DigitalArchives` · `#OralHistory` · `#GenealogyResearch`

### Heritage
`#SierraLeone` · `#Krio` · `#Mende` · `#Salone` · `#WestAfricanHeritage` · `#DiasporaRoots`

### Craft / build
`#BuildInPublic` · `#Afrofuturism` · `#ArchivesAndAI`

**Usage:** 3–5 per post. One brand, two practice, one heritage. Never stack fifteen.

---

## 10. Open items

- [ ] Replace placeholder ancestor names (Elias Perrin, Charlotte Dixon, Mariama) with real ones — permission required if not your own line
- [ ] Add `how_known` column to MySQL schema before the homepage claims evidence grades
- [ ] Add `custodian` field to support the "carried" state and chain of custody
- [ ] Confirm final brand typeface and update the lockup
- [ ] Decide on Kikakui (Mende syllabary) usage — Aisha is of Mende descent; script developed by Kisimi Kamara, Sierra Leone, early 1920s. Verify details before publishing any origin claim.
- [ ] Verify hashtag availability and current usage
- [ ] Consider recorded human voice saying each ancestor's name — stronger than any synthesized UI sound
