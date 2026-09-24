# Robes — Brand & Design System Reference

*Extracted 2026-09-24 from the live beta (`platform` branch, beta.byrobes.com), for rebuilding as shared tokens for Tailwind (Next.js) and NativeWind (Expo). Companion file: `tokens.draft.json` in this folder.*

**How to read this.** "Canon" means it is declared in `public/css/tokens.css` (the file calls itself "THE single source of truth") or ratified in `public/specimen.html` ("Robes — brand guidelines v1.0, July 2026"). "De facto" means it is what the shipped CSS actually does, counted across `public/*.html`, `public/css/*.css`, `public/js/dashboard-personalize.js` (1.7 MB; most dashboard UI is injected CSS-in-JS from here) and the email shell in `notify.js`. Where the canon and the de facto values disagree, this doc says so and recommends one.

Main sources:
- `public/css/tokens.css`: canonical tokens (35 lines).
- `public/specimen.html`: the living brand guideline page (served at `/specimen`, noindex).
- `public/dashboard.html` lines 486–1853: nav, dock, home, sheets, toast, wardrobe grid, concierge, dialog shell.
- `public/js/dashboard-personalize.js`: look cards, rack and console, DayCard, composer, overlays.
- `public/css/robes-mvp.css`: landing page on www, including the **on-dark** aliases.
- `public/onboarding.html`: dark intro shell (`.dk*`), the best existing dark-mode precedent.
- `notify.js` `mailShell()` (lines 66–95): transactional email.
- `server.js` lines 846–852: copy rules for generated text (`BANNED_CONSTRUCTIONS_RULE`, `ROW_NOTE_RULE`, `PANEL_NOTE_RULE`, `WEEK_SUMMARY_RULE`).
- `docs/product-naming-map.md`, CLAUDE.md dated deltas: naming decisions.

---

## 1. Brand essence & voice

### Essence
- **Positioning line (specimen):** "Warm, not cold. *Restrained, not minimal.*" The reference pairing is **"Jacquemus meets Bottega"**: editorial luxury in product form, "a stylist's hand, not a tech product's."
- **Manifest description:** "Your personal stylist — one prompt gets you dressed for anything."
- **Signature lines:** "Your piece, *worn three ways.*" · "One piece. Three ways to wear it." · "dressed for anything."
- **Persona:** Robes is a stylist with a point of view. It is warm, specific and finished, never a machine and never a salesperson. "She has been dressed, not sold to." (`PANEL_NOTE_RULE`)
- **Who she is:** internal specs and prompts call the user "she/her". UI copy addresses her as **you/your**. Robes speaks of itself in the **third person** as a subject with hands: "Robes reads your receipt", "Robes builds it around what's yours", "Robes can build from yours now."

### Voice rules (ratified in specimen §05, CLAUDE.md, server.js)
1. **Never "AI".** It must not appear in product copy, marketing or error states. The same goes for machine language such as "the engine" or "the system" (these were removed from `style_dna.js` voice strings). Use verbs of hands: *reads, files, composes, dresses, builds, keeps*.
2. **"Generating…" is banned** in the same way. **Current violations:** `dashboard-personalize.js` lines 6762–6763 ("Generating your look…") and lines 7536 and 23373 ("Generating editorial looks") still show on loading overlays. Replace them with "Composing your look…" or "Dressing it…".
3. **Errors own the failure warmly.** For example: *"Robes couldn't finish those looks — please try again in a moment."* Never show raw server text, never blame her, and never leak a schema.
4. **No exclamation marks, anywhere.**
5. **Never lock or unlock.** Features are never gated in copy. Write "{Feature} just opened.", not "unlocked". Never show `n / 15` fractions (the "Learning meter" decision, 2026-07-29).
6. **Honesty over promise.** Below 15 pieces, copy says looks are woven from what she owns plus editorial fills. Her decisions are named as hers: *"Left free."*, never "Nothing yet."
7. **The italic is the wink.** The serif italic second line carries the charm, so the sans stays plain and working.
8. **Her words win.** Where her typed plan competes with a rewrite for a title, her words surface. Her saved titles are never re-cased or renamed.
9. **Email voice checks** (four-session funnel brief): repeat only what she gave Robes. Name what she owns before naming any gap. No scarcity, no "you need". Never promise weather Robes can't stand behind.

### Banned constructions (enforced on generated copy, held by hand in product copy)
From `server.js` `BANNED_CONSTRUCTIONS_RULE`:
- **"X yet Y"**, e.g. "comfortable yet refined".
- **Benefit justification:** "perfect for", "ideal for", "suitable for", "great for", "keeping you comfortable".
- **Machine connectives:** "ensuring", "while maintaining", "creating a", "allowing for", "centers around".
- **Adverb inflation:** "effortlessly", "seamlessly", "timelessly", "meticulously".
- **Dead adjectives:** "elevated", "versatile", "polished aesthetic", "vibrant spirit".
- **Sustainability or virtue framing** of any kind.
- **Quotation marks** in generated fields.
- **Row notes** must never begin with "Perfect", "Ideal", "Great" or "A".

### Micro-copy formats
- **Row note** (per garment): 6–12 words, verb-led participle, no item name. Examples: "Worn open, sleeves cuffed once above the wrist." / "Belted at the natural waist, not the hip."
- **Panel note** (per look): up to 30 words. Describes balance and register, and names garments by type only.
- **Week summary:** up to 40 words, with no specific garments.
- **Headlines end with a full stop:** "Your three looks are ready." · "She'd wear it." · "Nothing planned this week."
- **Typography in copy:** curly apostrophes (’), the em dash (—) for asides, the ellipsis character (…), and the interpunct (·) between meta fragments ("Monday · Dublin · 20°C", "Lookbook / Diary" crumbs).

### Capitalisation & spelling
- **Sentence case** for everything a user reads as a sentence or action: "Save this look", "Build this look", "Wear on a day", "Add a piece", "Stop these emails".
- **Small caps (CSS uppercase + tracking)** for eyebrows and house CTAs. Author the source string in sentence case and let the style uppercase it. Never type caps into the string.
- **Product nouns are capitalised as proper nouns** in chrome: Lookbook, Diary, Wardrobe, Inspiration, Wishlist, The Rack. Generic nouns stay lowercase: a look, a piece, a travel edit, a key piece.
- **Wordmark:** always "Robes" in text. It renders as ROBES only through the wordmark style.
- **British spelling dominates** ("colour" 23 vs "color" 6 in rendered strings, "catalogue"). Standardise on British English (en-GB). "color" in the specimen body sample and one "favorite" are strays.
- **Inconsistency to fix:** "Style notes" (avatar menu) vs "Style Notes" (page `<title>`). Recommend **Style Notes** as a proper noun, matching Lookbook and Diary.

### Naming map: user-facing product terms (current, as shipped)

| Term (UI) | What it is | Notes / rules |
|---|---|---|
| **Robes** | The brand and the stylist persona | Third-person subject: "Robes reads…" |
| **Home** | Landing surface (mobile dock only; the wordmark is Home on desktop) | Kept by founder call |
| **Lookbook** | Tab: every saved look and result, one grid | Shelves: All looks · Key pieces styled · Daily looks · Travel edits |
| **Diary** | Tab: the dated plan (month and list) | **Renamed from "Calendar" everywhere** (2026-08-10). "It's in your diary." The Diary creates nothing |
| **Wardrobe** | Tab: what she owns | Sub-views: All pieces · Wishlist |
| **Inspiration** | Tab: key pieces styled, moodboards | A key-piece result lights Inspiration, not Lookbook |
| **Look** | A saved outfit entity | Named first, then saved. "Save this look", "Build this look", "Look details →" |
| **Piece** | One item of clothing | Never "item" or "garment" in chrome. States: owned (wardrobe), wishlist, and borrowed/editorial fill |
| **Key piece** | A piece "worn three ways" | Eyebrow "Key piece"; the kp flow |
| **Daily look** / **Dress today** / **Style today** | Today's look from the prompt | The prompt's three doors: *Style today · Plan a trip · Style a piece* |
| **Travel edit** | Trip capsule | **The noun everywhere** (2026-08-12). "Holiday" never appears in chrome |
| **The Rack** | The product-listing column of a look's pieces | Rows carry thumb / name / brand / provenance / swap |
| **The Canvas · The Anchor · The Texture · The Exclamation Point** | Formula roles cast onto pieces | Display order: Canvas first. Role hints in serif italic |
| **The Styling Concierge** | Home band of guided services | Cards: Key Piece → Weekly Planner → Travel Edit. "Robes is learning" meter lives inside it |
| **Style Notes** | Colour analysis, Your model, Taste & budget | Entry via avatar menu |
| **Your model** | Her avatar that wears looks | "Build your model once and she wears every look you keep." |
| **Founding Stylist** | Membership label under her name in the avatar menu | |
| **Wear** | The one scheduling verb | Wear it today · Wear on a day · Pack it · Wore it |
| **Restyle** | Robes re-mixes a look | Reserved for the generative re-mix only |
| **Refine** | Filter and sort sheet | |
| **Swap** | Replace a piece in a look | "Swap in yours · N", "Swap pieces" |
| **Filed** | A piece that has been added and read | "Five pieces filed." "What Robes files" ledger |
| **Keep / Pin** | Save a result, attach a look to a day | |

### Retired or forbidden in chrome
AI · Generating · lock/unlock · Calendar (now Diary) · Holiday (now Travel edit) · "Nothing yet" · `n / 15` · Weekly plan (the track was removed and "Wear on a day" covers it) · Moodboards (P0-hidden) · exclamation marks.

---

## 2. Colour

### 2.1 Frequency-ranked inventory (hex literals and `var()` references)

**Token references** (`var(--x)` count across all sources):
- `--ink` 669
- `--ink-faint` 625
- `--ink-soft` 278
- `--rule-mid` 236
- `--rule` 182
- `--rose` 95
- `--cream-100` 86
- `--cream-200` 81
- `--sage` 63
- `--cream-300` 60
- `--cream` 52
- `--cream-400` 46
- `--sage-bg` 18
- `--rose-bg` 15
- `--mauve` 13
- `--rose-mid` 9
- `--sage-mid` 6

**Literal colours** (count, value, where):

| # | Value | Role today | Where |
|---|---|---|---|
| 368 | `#FFFFFF` | Card and input surface, text on ink | Everywhere (card = white on cream) |
| 349 | `#202021` | **ink**: text, filled CTA, toast, dark shell | Mostly var fallbacks in personalize.js, emails, legal pages |
| 102 | `#FAF8F5` | **cream**: page ground, text on dark | |
| 51 | `#6E6A64` | ink-soft | |
| 40 | `#A89880` | **legacy ink-faint** (pre-contrast fix). Now `--on-dark-2` | Hard-coded in SVG strokes, stylenotes, reset, **email footer** |
| 39 | `#D8CFC0` | cream-400: dashed invites, opaque strong border | |
| 36 | `rgba(32,32,33,.12)` | rule-mid hairline | |
| 34 | `#EFE9DC` | cream-200: image placeholder | |
| 33 | `#E7E0CF` | cream-300: opaque border (landing, DayCard, lt-card, email card) | |
| 31 | `rgba(32,32,33,.14)` | stray hairline | |
| 31 | `rgba(32,32,33,.28)` | **strong border** (primary-outline button, menus shadow) | |
| 29 | `#8E7077` | rose | |
| 28 | `#C9BCA6` | stray cream-400 variant (stylenotes, onboarding) | |
| 28 | `#9A9082` | stray ink-faint fallback in `var(--ink-faint,#9A9082)` | |
| 25 | `#F3EFE6` | stray cream-100 variant | |
| 25 | `rgba(32,32,33,.08)` | faint divider / track | |
| 24 | `rgba(0,0,0,.45)` | delete-confirm scrim (`#rb-del-modal`), off-brand pure black | |
| 23 | `rgba(32,32,33,.3)` | placeholder text, hover border | |
| 22 | `#2A2520` | stray warm near-black (rack labels) | |
| 18 | `#5C574F` | stray ink-soft fallback | |
| 17 | `#D4C8C4` | mauve | |
| 17 | `rgba(32,32,33,.22)` | hover border | |
| 15 | `#E3E1CC` | sage base (sage-bg/-mid are this at .40/.72) | |
| 13 | `#7E7C5A` | sage | |
| 13 | `rgba(250,248,245,.92)` | frosted cream chip/overlay | |
| 12 | `#F5F0E8` | cream-100 | |
| 12 | `#C4B8A4` | `--cream-500` (onboarding), meter ticks | |
| 10 | `#7E6F50` | ink-faint (canonical since contrast fix) | |
| 9 | `#8E6A7C` | stray rose variant | |
| 6 | `rgba(142,112,119,.45)` | rose focus border | |
| 5 | `#4A7C59` | **success/owned** green | |
| 5 | `#8B3A30` | **error** text | |
| 5 | `#E8D5D2` | `--muted` blush (landing radials) | |
| 4 | `#4A463F` | email body text | |
| — | `#A54242` / `#B07E36` | admin-only red/amber | `admin.html` |
| — | `#FDF0EE` / `#E8C8C2` | error message fill/border | `signup.html` |
| — | `#F0F5EF` / `#C2D8BE` / `#2E5C28` | success message fill/border/text | `signup.html` |
| — | `#F6E9E4` / `#A4472B` / `#EDF0E4` / `#5A6B3B` | second error/success set | `reset.html` (duplicate, consolidate) |
| — | `#8E8A83` | email footer text | `notify.js` |

`style_dna.js` hexes (`#C89428`, `#B23A72`, `#963A2E`…) are **seasonal-palette data** (her colour analysis), not UI chrome. Exclude them from tokens.

**Drift:** about 60 distinct near-duplicate greys and creams live only in personalize.js fallbacks and injected CSS (`#9A958E`, `#55524E`, `#F7F4EE`, `#EDE6D8`, `#EDE8E0`, `#E3DDD2`…). All should collapse to the tokens below.

### 2.2 Consolidated semantic palette (light, the shipped mode)

| Token | Value | Source / use |
|---|---|---|
| **Neutrals (raw)** | | |
| cream / cream-50 | `#FAF8F5` | Page ground ("the ground everything sits on") |
| cream-100 | `#F5F0E8` | Panel fills, chips, segmented-control track |
| cream-200 | `#EFE9DC` | Image placeholders, disabled CTA fill |
| cream-300 | `#E7E0CF` | Opaque borders (landing, DayCard, look card, email) |
| cream-400 | `#D8CFC0` | Dashed invitations, deep tint |
| cream-500 | `#C4B8A4` | Meter ticks, locked-state glyphs (onboarding) |
| ink | `#202021` | Primary text, filled CTA, dark ground |
| ink-soft | `#6E6A64` | Secondary text |
| ink-faint | `#7E6F50` | Eyebrows, meta, hints (the warm tertiary) |
| taupe (on-dark-2) | `#A89880` | Muted text **on dark only** |
| **Accents** | | |
| rose | `#8E7077` | Brand accent: Inspiration, the concierge eyebrow, send button, links. Large text or icons only |
| rose-subtle | `rgba(212,200,196,.26)` | Rose wash (selected/hover pill) |
| rose-muted | `rgba(212,200,196,.60)` | Rose tint (icon tiles, quote rule) |
| rose-border | `rgba(142,112,119,.45)` | Rose focus/hover border |
| mauve | `#D4C8C4` | Decorative only: trips, pinned, day-scope, onboarding accent |
| sage | `#7E7C5A` | Weeks, worn, progress, "Yours" badge. Large text or icons only |
| sage-subtle | `rgba(227,225,204,.40)` | Sage wash |
| sage-muted | `rgba(227,225,204,.72)` | Sage tint, avatar fill |
| sage-border | `rgba(126,124,90,.45)` | Sage selected border |
| blush | `#E8D5D2` | Landing radial wash only |
| **Semantic** | | |
| bg.canvas | cream `#FAF8F5` | |
| bg.surface | `#FFFFFF` | Cards, inputs, pills |
| bg.subtle | cream-100 | |
| bg.muted | cream-200 | |
| bg.inverse | ink | |
| bg.frosted | `rgba(250,248,245,.90)` + blur 16 | Sticky nav |
| bg.glass | `rgba(255,255,255,.70)` + blur 22 | Mobile dock |
| text.primary | ink | 15.4:1 on cream |
| text.secondary | ink-soft | 5.1:1 |
| text.tertiary | ink-faint | 4.6:1 (smallest text tier) |
| text.placeholder | `rgba(32,32,33,.32)`, **proposed `#75706A`** | Current fails; see §7 |
| text.inverse | cream | |
| text.accent | rose (large), **proposed `#7A5C63` for small text** (5.6:1) | |
| text.accent-alt | sage (large), **proposed `#5E5C3F` for small text** (6.4:1) | |
| border.subtle | `rgba(32,32,33,.075)` (`--rule`) | Hairline dividers |
| border.default | `rgba(32,32,33,.12)` (`--rule-mid`) | Card/input hairline |
| border.hover | `rgba(32,32,33,.22)` | |
| border.strong | `rgba(32,32,33,.28)` | Outline-primary button, pressed |
| border.opaque | cream-300 | Where layering needs opacity (DayCard, look card) |
| border.opaque-strong | cream-400 | |
| border.selected | ink | "ink borders mean *selected*" |
| border.dashed | cream-400 (1.5px dashed) | Invitation / not-yours-yet |
| **Status** | | |
| success | `#4A7C59` text (4.86:1 on white), bg `rgba(74,124,89,.08)` | "In your wardrobe" tags |
| success.strong | `#2E5C28` on `#F0F5EF`, border `#C2D8BE` | Form success message |
| error | `#8B3A30` on `#FDF0EE`, border `#E8C8C2` | Form error, save-state error |
| warning | **proposed `#8B6A2E`** (4.7:1) on `#FBF6EE` (4.65) | Admin amber `#B07E36` fails (3.6:1) |
| info | Use ink on cream-100; no blue exists | |
| **Overlays** | | |
| scrim.modal | `rgba(32,32,33,.34)` + `blur(7px) saturate(1.04)` | Dialog backdrop |
| scrim.sheet | `rgba(32,32,33,.42)` | Bottom sheet backdrop |
| scrim.loading | `rgba(250,248,245,.92)` + blur 6 | Full-screen compose overlay (z 900) |
| scrim.image-chip | `rgba(32,32,33,.55)` / `.78` + blur 4 | Wear pill / owned badge on photos |
| frost.chip | `rgba(250,248,245,.92)` + blur 6 | Worn/today chips on photos |

**Accent semantics:** rose means inspiration, the brand and shopping ("Shop" actions, the concierge). Sage means planning, time and ownership (weeks, worn, progress, Yours). Mauve is ornament. **Black fill is reserved** for "the one real commitment on the screen": Save this look, Start packing, the send CTA and the toast (2026-08-12 decision).

### 2.3 Dark mode (proposed)

No `prefers-color-scheme` handling exists anywhere today. There is strong precedent, though:
- the onboarding dark shell (`.dk`: ink ground, cream text, `radial-gradient(rgba(212,200,196,.14))` glow, 5% grain);
- the landing `.on-dark` aliases (`--on-dark-1: cream`, `--on-dark-2: #A89880`, `--border-on-dark: rgba(250,248,245,.12)`, `.btn-light` = cream fill with ink text);
- the manifest `background_color`/`theme_color` `#202021`;
- the app icon (cream serif R on ink).

The proposal keeps the brand ink as the ground rather than pure black:

| Role | Light | Dark (proposed) | Dark contrast |
|---|---|---|---|
| bg.canvas | `#FAF8F5` | `#202021` | — |
| bg.surface (cards) | `#FFFFFF` | `#2A2A2B` | — |
| bg.subtle | `#F5F0E8` | `#2F2E2D` | — |
| bg.muted (placeholders) | `#EFE9DC` | `#383634` | — |
| bg.inverse | `#202021` | `#FAF8F5` | — |
| text.primary | `#202021` | `#FAF8F5` | 15.4 / 13.5 (surface) |
| text.secondary | `#6E6A64` | `#B5ACA0` | 7.3 / 6.4 |
| text.tertiary | `#7E6F50` | `#A89880` (existing on-dark-2) | 5.8 / 5.1 |
| text.placeholder | `#75706A` | `rgba(250,248,245,.50)` | 4.85 |
| border.subtle | `rgba(32,32,33,.075)` | `rgba(250,248,245,.08)` | — |
| border.default | `rgba(32,32,33,.12)` | `rgba(250,248,245,.12)` (existing) | — |
| border.strong | `rgba(32,32,33,.28)` | `rgba(250,248,245,.28)` | — |
| accent.rose | `#8E7077` | `#B8969D` | 6.1 / 5.4 |
| accent.sage | `#7E7C5A` | `#A9A67E` | 6.5 / 5.8 |
| accent.mauve | `#D4C8C4` | `#D4C8C4` (unchanged, decorative) | — |
| action.primary bg/fg | ink / white | cream / ink (`.btn-light`) | 15.4 |
| success | `#4A7C59` | `#8FBF9A` | 7.8 |
| error | `#8B3A30` | `#D9A0A0` | 7.35 |
| warning | `#8B6A2E` | `#D6B06A` | 8.0 |
| scrim.modal | ink @ .34 | `rgba(0,0,0,.55)` | — |

Photography is not inverted. Image placeholders use `#383634`, and the monogram glyph switches to `#A89880`.

---

## 3. Typography

### 3.1 Families

| Role | Family | Weights used | Fallback stack |
|---|---|---|---|
| Display / serif | **Cormorant** (the display cut, *not* Cormorant Garamond; ratified by founder decision 2026-07-27 via the /specimen side-by-side) | 300, 400 (500 loaded, rare); italic 300/400 (500 italic on some pages) | `'Cormorant', Georgia, serif` |
| Sans / UI | **Inter** | 300 (body), 400, 500 (labels/emphasis) | `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` |
| Mono | none (specimen only) | — | `ui-monospace, SFMono-Regular, Menlo, monospace` |
| Email | Georgia wordmark; `'Cormorant Garamond', Georgia` heading; Helvetica/Arial body | — | `notify.js` |

**Weight usage count:** 300 ×279, 500 ×269, 400 ×112, **600 ×35, 700 ×31**. Weights 600 and 700 are **not loaded** (the Google Fonts URLs and `@font-face` load 300/400/500 only), so browsers fake-bold them. For native you must either ship Inter 600 (SemiBold) or map 600/700 to 500. **Recommendation:** ship Inter 600 for the 9px small-caps CTA (`.btn-ink`, `.day-today-tag`), and map 700 to 600.

**Rules (canon):**
- Cormorant 300–400 only for display.
- **Never below ~17px** in the serif, because weight 300 gets fragile below that. Exception: `.lt-title` at 14px (`.lt-card` compact), which is a violation.
- Inter at **9px minimum**, and only uppercase and tracked at that size. Nothing renders below 9px. Violations: the dock at 8.5px on screens narrower than 360px, plus five 8px, one 7.5px and one 7px usage.
- Inputs render at 16px on mobile to prevent focus zoom.

### 3.2 Font files & licensing
- **Web pages** (index, look, board, onboarding, signup, stylenotes, specimen, legal) load **Google Fonts CSS2**: `Cormorant:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500` + `Inter:wght@300;400;500`.
- **The dashboard self-hosts** 51 woff2 files in `public/dashboard-assets/`. Their UUID names are Google Fonts subset files, identifiable by the unicode-range blocks in `dashboard.html` lines 26–484:
  - Cormorant normal: `0e704224…` (latin), `42397a22…` (latin-ext), `5ce6ef7b…` (vietnamese), `54d9cd8d…` (cyrillic), `9b359e70…` (cyrillic-ext).
  - Cormorant italic: `729e2f14…` (latin), `7123ac0f…`, `96771e9a…`, `63241363…`, `3a7d8127…`.
  - Inter: `384a4127…` (latin), `b4790757…` (latin-ext), `5579572e…` (vietnamese), `1e30db3e…` (greek), `49f9cce4…` (greek-ext), `d02d1953…` (cyrillic), `22fba687…` (cyrillic-ext).
  - These are variable-font subsets, so one file per subset serves all weights.
- **Licences:** Cormorant (Christian Thalmann / Catharsis Fonts) and Inter (Rasmus Andersson) are both **SIL Open Font License 1.1**. Embedding in iOS and Android apps and self-hosting on web are permitted. Bundle `OFL.txt` with the app, and do not sell the fonts on their own. **No commercial licence check is needed.**
- **Expo:** use `@expo-google-fonts/cormorant` (`Cormorant_300Light`, `_400Regular`, `_500Medium`, `_300Light_Italic`, `_400Regular_Italic`) and `@expo-google-fonts/inter` (`Inter_300Light`, `_400Regular`, `_500Medium`, `_600SemiBold`). In RN each weight/style is a separate family name, so the NativeWind `fontFamily` map must be per-weight (see the tokens file).
- **Next.js:** `next/font/google` with `Cormorant({ weight:['300','400','500'], style:['normal','italic'] })` + `Inter({ weight:['300','400','500','600'] })`.
- **Flag:** email uses "Cormorant Garamond", a different family from the ratified Cormorant. Most mail clients fall back to Georgia anyway, but the declared stack should be `'Cormorant', Georgia, 'Times New Roman', serif` for consistency.
- **Flag:** weather glyphs use platform emoji (🌦). The specimen calls this "the one earned exception". Native renders Apple/Google emoji differently, so consider a small line-icon set instead.

### 3.3 De facto type scale

Sans font-size frequency (px): 11 ×160, 12 ×159, 9 ×153, 10 ×142, 13 ×112, 14 ×76, 15 ×69, 11.5 ×64, 16 ×59, 9.5 ×52, 12.5 ×46, 10.5 ×38, 13.5 ×37. Half-pixel sizes collapse into the nearest step.

| Token | Size / line-height | Family · weight | Tracking | Case | Used for (examples) |
|---|---|---|---|---|---|
| `display-2xl` | clamp(40px, 6vw, 62px) / 1.0 | Cormorant 300 | -0.01em | Sentence | Home masthead `.dash-greet`, onboarding `.dk-heading` (40–60), landing hero |
| `display-xl` | 52px / 1.1 | Cormorant 300 | 0 | Sentence + italic 2nd line | Specimen masthead, confirm screen (38–58) |
| `display-lg` | clamp(33px, 4.4vw, 48px) / 1.08 | Cormorant 300 | -0.01em | Sentence | Dialog heading `.fm-h`, `.cs-h` |
| `display-md` | 30–33px / 1.1–1.15 | Cormorant 300 (italic for greeting) | 0 | Sentence | Section heads, email heading 30/1.15, `.greeting` 33 |
| `title-lg` | 26–27px / 1.1 | Cormorant 300 or italic 400 | 0 | Sentence | `.sheet-title` 26 italic, `.trip-dest` 27 |
| `title-md` | 21–23px / 1.08–1.2 | Cormorant 300/400 | 0 | Sentence | Card titles `.lt-card .lt-title` 22, `.rbc-name` 21, `.trip-tile-dest` 23 |
| `title-sm` | 18–19px / 1.25 | Cormorant italic 400 | 0 | Sentence | `.mix-title`, `.share-name`, mobile card title 17–19 |
| `serif-floor` | 17px / 1.3 | Cormorant 300 italic | 0 | Sentence | Hints, loading lines ("Reading your week…"), `.saw-val` |
| `quote` | 16px / 1.42 | Cormorant 300 italic | 0 | Sentence | Panel note `.rbc-quote` (2px rose-mid left rule) |
| `hint` | 13–14px | Cormorant italic | 0 | Sentence | `.cb-hint`, `.hp-hint`. **Below the serif floor**, flagged |
| `wordmark` | 17px (nav), 21px (landing), 15px (dialog/email), 30px (splash) | Cormorant 400 (300 on splash) | .34em nav · .26em landing · .28em dialog/email · .42em splash | UPPER | Always `text-indent` = tracking to optically centre |
| `body-lg` | 15–16px / 1.65–1.85 | Inter 300 | 0 | Sentence | Lede, email body 15/1.65, landing confirm 16/1.85, prompt textarea 16/1.6 |
| `body` | 13.5–14px / 1.6–1.7 | Inter 300 | 0 | Sentence | Default reading text, `.fm-sub` 14/1.7 |
| `body-sm` | 12.5–13px / 1.5–1.6 | Inter 300/400 | 0–.01em | Sentence | Sheet sub, menu items, form input 13 |
| `ui` | 12px / 1.3 | Inter 400/500 | 0 | Sentence | Pills `.cb-pill`/`.qpill`, nav tabs 13, piece name 12.5/500 |
| `caption` | 11–11.5px / 1.4 | Inter 300/400 | .01em | Sentence | Meta lines `.mix-meta`, `.sec-meta`, brand line |
| `label-caps` (CTA) | 11px / 1 | Inter 500 | .14–.2em | UPPER | `.cb-send` .16em, `.fm-cta` .2em, email CTA .14em, `.rb-lk-act` 11/.04em sentence |
| `eyebrow` | 10px / 1.2 | Inter 500 (400 on landing) | **.2em** (canon), .22–.24em section | UPPER | Every section/card head. **Always ink-faint** (rose for the concierge and wardrobe title) |
| `micro-caps` | 9–9.5px / 1 | Inter 500–600 | .12–.18em | UPPER | Badges `.mix-badge`, field labels 9.5/.2em, dock labels 9.5/.04em, "Share this look" |
| `data` | 18–30px | Cormorant 400 | 0 | — | Stats `.trip-stat strong` 30, `.limit-val` 18 Inter 500 |

**Line-height scale** (frequency): 1 ×78 (labels/pills), 1.6 ×43, 1.15 ×31, 1.2 ×27, 1.25/1.3 ×24, 1.5 ×23, 1.1 ×21, 1.7 ×20. Consolidated: `none 1`, `tight 1.05`, `snug 1.15`, `title 1.25`, `normal 1.5`, `relaxed 1.6`, `loose 1.7`, `prose 1.85`.

**Letter-spacing scale** (frequency of .2em is 110, the house eyebrow): `tighter -0.014em`, `tight -0.01em`, `normal 0`, `wide .01em`, `wider .04em`, `caps-sm .08em`, `caps .14em`, `caps-md .16–.18em`, `eyebrow .2em`, `eyebrow-wide .24em`, `mark-sm .28em`, `mark .34em`, `mark-xl .42em`.

**Italic convention:** a Cormorant italic `<em>` inside a Cormorant roman headline, usually recoloured to ink-faint or ink-soft ("Your piece, *worn three ways.*"). The sans never goes italic.

**Numerals:** `font-variant-numeric: tabular-nums` on date fields.

---

## 4. Structure: spacing, radii, borders, shadows, z-index, breakpoints, motion

### 4.1 Layout
- **Shell** max width is `--shell: 1440px`, centred.
- **Gutter** `--s6` steps with the viewport: 80px (≥1200), 64px (1024–1199), 40px (768–1023), 24px (<768). Mobile dashboard bleed is 20/26/36px.
- **Nav height** `--nav-h: 64px`, sticky, frosted cream, 0.5px bottom rule.
- **Reading measures:** prompt 760px, display headline 620px, prose ≤720px, sheet 540px, dialog 620px (`.fm`), small dialog 460px (`.cs`), email 520px.
- **Grids** always use `minmax(0,1fr)` columns and drop a column rather than widen cells:
  - Wardrobe: 5/4/3/2 columns at ≥1200/≥1024/≥768/<768, gap 16.
  - Lookbook: 3/2/1 columns, gap 22.
- **Tablet (768–1023)** stays desktop-shaped with the top bar. **Mobile (<768)** gets the floating dock and single columns.

### 4.2 Spacing
Padding/gap/margin frequency: 8 ×232, 14 ×223, 12 ×208, 10 ×200, 16 ×177, 6 ×164, 2 ×111, 9 ×111, 18 ×106, 24 ×101, 4 ×99, 7 ×97, 20 ×80, 11 ×71, 13 ×70, 22 ×64. Larger values: 26, 28, 30, 32, 34, 36, 40, 44, 48, 54, 56, 64, 80.

This is a **2px-granular 4px system**. Tailwind's default 4px scale already covers it (`0.5`=2, `1`=4, `1.5`=6, `2`=8, `2.5`=10, `3`=12, `3.5`=14, `4`=16, `5`=20, `6`=24, `7`=28, `8`=32, `9`=36, `10`=40, `11`=44, `12`=48, `14`=56, `16`=64, `20`=80). Add `4.5`=18 and `5.5`=22 (both high-frequency). Map odd values (7, 9, 11, 13) to the nearest even step during the port.

Section rhythm: 54px under the concierge, 38px under the masthead, 84px between specimen sections, 30–32px panel padding, 22–26px sheet padding.

### 4.3 Radii

| Token | Value | Use | Freq |
|---|---|---|---|
| `none` | 0 | Full-bleed image inside a card | 19 |
| `hair` | 2px | DayCard `.rb-dc`, form message, editorial frames | 45 |
| `xs` | 3–4px | Look card `.lt-card` 3, `.fm-cta` 3, `.fm-tile`/prompt 4 | 76 |
| `dialog` | 6px | `.fm-dialog`, email images | 22 |
| `sm` | 8px `--rad-sm` | Inputs, menu items, thumbs | 90+19 |
| `md` | 12px `--rad` | Panels, prompt box, image wraps, menus | 56 |
| `card` | 14px `--rad-card` | Concierge box, cards | 15 |
| `lg` | 18px `--rad-lg` | Sheet top corners, trip tiles, specimen cards | 16 |
| `dock` | 24px | Mobile dock | 2 |
| `pill` | 100px (use 9999) | **All pills, buttons, chips, toasts**. "Pills are always 100px" | 251 |
| `full` | 50% | Avatars, icon buttons, dots | 80 |

**Tension to resolve.** The canon (tokens.css) is "soft-rounded", 8/12/14/18. Newer Claude Design ports (look card, DayCard, dialog, dialog CTA) went **editorial-sharp** at 2–6px. Both ship. Recommendation: keep both families explicitly. Use `sharp` (2px) for editorial frames (look card, DayCard, image frames, dialog CTA) and `soft` (8–18) for controls and containers. Pills stay pills. Retire the strays (7, 9, 10, 16, 20px).

### 4.4 Borders
- **Hairline 0.5px** (273 uses) is the signature. On native, `StyleSheet.hairlineWidth` is the equivalent. **1px** (340 uses) is used for opaque cream borders and newer components.
- **Dashed** 1.5px (or 1px) `cream-400` / `rule-mid` means *an invitation, or not-yours-yet*: add tiles, empty days, wishlist tiles.
- **Selected:** warm cream fill plus a darker warm border plus a small ink mark. Never a heavy black fill. **Violation:** the wardrobe filter `.wg-pill.active` is a black fill.
- **Accent rule:** 2px `rose-mid` left border on the panel-note quote. The active nav tab uses a 1.5px ink underline. The active dock tab uses a 24×2px ink bar.

### 4.5 Shadows
Shadows are for **floating elements only**. Cards never get one; they get a hairline.

| Token | Value | Use |
|---|---|---|
| `xs` | `0 1px 3px rgba(32,32,33,.08)` | Swatches, tiny lifts |
| `sm` | `0 2px 10px rgba(32,32,33,.10)` | Floating chips |
| `menu` | `0 18px 48px -18px rgba(32,32,33,.28)` | Avatar menu, add menu |
| `popover` | `0 24px 60px -12px rgba(32,32,33,.28)` | **Most common (×23)**: panels, pickers, modals in personalize.js |
| `toast` | `0 16px 40px -12px rgba(32,32,33,.40)` | Toast |
| `dialog` | `0 50px 120px -40px rgba(32,32,33,.55)` | `.fm`/`.cs` dialogs |
| `drawer` | `-18px 0 50px rgba(32,32,33,.08)` | Side drawers |
| `ring-accent` | `0 0 0 3–4px rgba(142,112,119,.06–.07)` | Prompt `:focus-within` glow |
| `ring-today` | `0 0 0 2px sage-mid` | Today's day card |
| `ring-selected` | `0 0 0 2px cream, 0 0 0 3px ink` | Selected swatch |

### 4.6 Z-index (consolidated from 28 distinct values)

| Layer | Value(s) today | Proposed |
|---|---|---|
| raised (in-card badges) | 1–5 | 1–5 |
| dropdown / add menu | 40 | 40 |
| mobile dock | 48 | 48 |
| sticky nav | 50 | 50 |
| avatar menu | 60 | 60 |
| sheet | 200 | 200 |
| modal dialog `.fm` | 300 | 300 |
| toast | 300 (dashboard), 600 (landing) | **400**, above the modal |
| full-screen compose overlay | 900 | 900 |
| stacked modals (delete, coming-soon, swap) | 930–990 | 950 |
| critical (boot, tweaks) | 1000, 9000 | 1000 |

### 4.7 Breakpoints (max-width, desktop-first today)
The canonical three are **767/768** (mobile shell, 39 uses), **1023/1024** (tablet) and **1199/1200** (desktop gutter). Secondary: 359 (tiny phone, dock label shrink), 520 (dialog goes full-bleed), 640 (compact masthead, footer share hides), 820/860/900/960 (component-specific). There are also `prefers-reduced-motion: reduce` (9) and `hover: none` (2).

Tailwind (min-width) mapping: `xs: 360`, `sm: 520`, `md: 768`, `lg: 1024`, `xl: 1200`, `2xl: 1440`. The 640 breakpoint is also used and becomes `sm2: 640` if needed; otherwise fold it into 520/768.

### 4.8 Motion
- **One curve (canon):** `--ease: cubic-bezier(0.4,0,0.2,1)`, "everything moves on this curve".
- **Also in use:** `cubic-bezier(0.22,0.7,0.2,1)` (Diary sheets and slide-ins, emphasized-decelerate) and `cubic-bezier(0.22,1,0.36,1)` (ease-out-expo).
- **Durations** (transition frequency): .15s ×112, .2s ×115, .18s ×27, .14s ×11, .25s ×7, .3s ×6, .4s ×9, .5s ×8, .55s ×2.

| Token | Value | Use |
|---|---|---|
| `instant` | 140ms | Menu item hover |
| `fast` | 150ms | Colour/border hover (default) |
| `base` | 200ms | Opacity, wordmark hover, cards |
| `moderate` | 280ms | Sheet slide, toast |
| `slow` | 450ms | Dialog backdrop fade, image hover zoom |
| `slower` | 550ms | Dialog rise |
| `deliberate` | 800ms | Splash fade, robesFadeUp 700ms |

**Named motions:**
- `fmRise`: translateY(20px) scale(.985) to none, 550ms.
- `fadeUp`: 10–12px, 440–700ms.
- Image hover: `scale(1.025–1.04)` over 400–500ms.
- Primary button hover: `opacity .86` + `translateY(-1px)`.
- Arrow nudge: `translateX(2–3px)`.
- Toast: rises 80px and fades in 300ms.
- Sheet: rises 36px in 280ms.

**Loops:**
- Spinner: .8–.9s linear, 38px, 2px `rule-mid` ring with an ink top.
- `kpLoadBar`: 2.5s ease-in-out.
- `rb-pulse`: 1.4s.
- Placeholder pulse `kpPhPulse`: 1.8s (1 to .55 opacity).
- `rbInstBreathe`: 2.4s.
- Concierge spark twinkle: 2.8s.
- Landing skeleton `sheen`: 1.6s linear.

**Reduced motion:** the twinkle and decorative loops are disabled under `prefers-reduced-motion` (9 guards). Port this as a global rule.

---

## 5. Components inventory

Class names below are cited for lookup. Line numbers are for `public/dashboard.html` unless a file is named.

### Buttons (specimen §04: "A small set of moves, repeated with discipline")

| Variant | Anatomy | Tokens | Source |
|---|---|---|---|
| **Primary: ink pill** | Pill, ink fill, cream/white text. Either small caps (9–11px, 500–600, .14–.2em) or 13px/500 sentence case | `bg.inverse`, `radius.pill`, padding 11–14 × 20–22. Hover: opacity .86 + lift 1px | `.cb-send` (1511), `.sheet-cta` (1215), `.trip-foot-primary`, specimen `.btn-ink`, email CTA |
| **Primary: block (editorial)** | Full-width, 3px radius, 17px padding, 11px/500/.2em caps, trailing arrow that nudges 3px. Disabled: cream-200 fill + ink-faint text | `radius.xs` | `.fm-cta` (1742), `.cs-cta` |
| **Secondary: hairline pill** | White fill, 0.5–1px `rule-mid` border, ink-soft 11–12px text. Hover: border .22–.3 and ink text | | `.trip-foot-ghost`, `.rb-lk-act`, specimen `.btn-out`, `.trip-adjust` |
| **Secondary-emphasised** | White, border `rgba(32,32,33,.28)`, ink 500 text (replaced black on the Look detail) | `border.strong` | `.rb-lk-act.primary` (personalize.js) |
| **Tertiary: underlined text** | ink-faint or ink-soft 11–12px, underline offset 2–3px | | specimen `.btn-ghost`, `.fm-later em` |
| **Link: accent** | rose 11.5px, hover opacity .7 | | `.sec-link`, `.copy-btn` |
| **Icon button: circle** | 28–33px circle, hairline, ink-soft icon 13–15px, frosted or transparent | ≥44px target via `::after` | `.rb-rename-tbtn` (575), `#rb-share-btn` (566), `.hp-add` (692), `.fm-x` |
| **Send: rose circle** | 30px rose circle, white 13px arrow | | `.hp-send` (718) |
| **Photo overlay pill** | ink @.55 + blur 4, white 10px caps .08em, appears on hover (always shown on touch) | `scrim.image-chip` | `.rb-lk-wearx` ("Wear") |
| **Back pill (mobile)** | White pill, 1px `rule-mid`, `‹` + 11px/.04em label | | `#rb-backpill` (560) |

### Pills, chips, segmented controls
- **Suggestion pill:** `.cb-pill`/`.qpill` (1515, 724). White, hairline, 12–12.5px ink-soft, padding 6–8 × 13–15. Hover: rose border, rose text and rose-subtle fill.
- **Filter pill:** `.wg-pill` (1157). Same anatomy, but active is an ink fill, which violates the selected-state rule. **Recommendation:** cream-100 fill + ink border + ink text.
- **Segmented control:** `.cb-intents`/`.hp-modes` (1497, 678). A cream-100 track with 3–4px inset, holding pill segments of 12–12.5px/500 ink-soft. The active segment gets a white fill, hairline and ink text.
- **Badge (caps):** `.mix-badge`. 9px/600/.16em, rose text on rose-subtle, pill. `.day-today-tag` is sage on frosted cream.
- **Owned tag:** `.mbr-own`. 10px, success green on `rgba(74,124,89,.08)`, 20px radius.
- **Yours badge on photo:** `.tt-yours`/`.wg-owned-badge`. Sage @.92 or ink @.78 with white 9px text, blur 4.
- **Attached chip:** `.hp-chip`. Rose tint, 26px round thumb, label, ✕.
- **Weather chip:** `.trip-wchip`. cream-100, 11px ink-soft.
- **Dashed invitation chip:** specimen `.chip-dashed`. 1.5px dashed cream-400, 12px radius.

### Cards
- **Look card** (`window._rbLookTile` → `_ltTile`, `.lt-card`, personalize.js). White card with a **1px cream-300 border, 3px radius, no shadow**. Anatomy: square (1:1) mosaic or photo zone, then info at padding 14×18×18, then the small-caps type eyebrow, then a Cormorant 22px/400/1.15 title (19px on mobile), then an 11px/300 meta line. Hover: the border goes to cream-400. Overlays: ✕ and the "Wear" pill. **This is the one card family for all Lookbook shelves.**
- **Look mosaic:** `.rb-lk-mos` is 3:4, or 4:5 in rails. Grid cells are separated by a 4px gap on cream-200.
- **Piece card (wardrobe grid):** `.wg-item` (1177). A 3:4 image wrap at `radius.md` on a cream-200 placeholder. The image zooms 1.03 on hover. There is an optional owned badge top-left. Below: name 12.5px/500 ink with ellipsis, and meta 10.5px ink-faint. The add tile `.wg-add` is 1.5px dashed.
- **Piece page photo:** `.rb-pc-photo` is 1:1 at `radius.sm`.
- **Rack row (The Rack):** `.rbc-row` (personalize.js). White, hairline, `radius.md`, 12px padding, grid `112px 1fr`, gap 16. Anatomy: thumb or hero, then `.rbc-name` Cormorant 21px/400, brand, provenance ("In your wardrobe" green tag or retailer), then flick-through and swap actions. Role strips (`.rbc-rolestrip`) group rows under The Canvas, The Anchor, The Texture and The Exclamation Point, with serif-italic role hints. Ghost strips show when a role is empty. The single dashed **+ Add a piece** control is the way in.
- **Compact rack card** (moodboard rail): `.mbr-card` (952). A 44px thumb at 7px radius. The monogram fallback `.mbr-mono` is a gradient `#EFE9DC → #E3D9CB` with a Cormorant 19px glyph in `#B8A898`.
- **DayCard:** `.rb-dc` (personalize.js). White, 1px cream-300, 2px radius, 16px padding, min-height 176 (a single 132px height in the diary home room). Compact variant `.dc-compact`.
- **Trip tile:** `.trip-tile` (824). A horizontal white card at `radius.lg`, with a 92px image, Cormorant 23px destination (italic part in ink-soft), dates, and a meta row with sage/rose counts and interpunct dots. A 30px circular go-arrow nudges 2px on hover.
- **Mode/service card:** `.mc` (645). White, hairline, `radius.md`, a 30px icon tile at `radius.sm`. Active states tint rose or sage.
- **Specimen card:** white, 0.5px `rule-mid`, `radius.lg`, padding 34×38.

### Modals, sheets, overlays
- **Dialog (`.fm`, `.cs`, 1673–1799):**
  - Backdrop: ink @.34 + `blur(7px) saturate(1.04)`, fading in over 450ms.
  - Dialog: `min(620px,100%)`, cream ground with **5% SVG grain**, 1px cream-300 border, 6px radius, `shadow.dialog`, `fmRise` over 550ms.
  - Rail: a sticky three-column row with the ROBES mark (15px/.28em), step dots and a ✕.
  - Body: heading Cormorant 33–48px/300 and sub 14px/1.7.
  - Full-bleed below 520px.
- **Bottom sheet (`.sheet`, 1188):**
  - Overlay: ink @.42.
  - Sheet: cream, `radius.lg` top corners only, max 540px, padding 26×32×44, a 36×4 handle in `rule-mid`.
  - Title: Cormorant italic 26px. Sub: 12.5px.
  - CTA: full-width ink pill.
  - Motion: translateY(36px) to 0 over 280ms.
- **Stacked micro-modals** (swap own-or-shop, delete confirm, coming soon) sit at z 930–990. The delete scrim uses pure black @.45, which is off-palette; use ink.
- **Compose/loading overlay:** `#kp-loading-overlay` (personalize.js ~23370). Full-screen frosted cream (@.92 + blur 6) at z 900. A Cormorant 28px line, rotating status copy, a load bar, a 90s hard abort, and a quiet "Cancel" after 15s.

### Navigation
- **Top bar** (`.nav`, 505–556):
  - 64px, sticky, frosted cream @.9 + blur 16, 0.5px rule.
  - Left: wordmark (Cormorant 400 17px, .34em tracking with matching text-indent, hover opacity .62), then tabs `#rb-topnav` with a 26px gap.
  - Tabs: Lookbook · Diary · Wardrobe · Inspiration, 13px ink-faint. Active is ink with a 1.5px ink underline. Invisible `::after` hit area.
  - Right: weather pill (11.5px ink-soft, dot separators) and a 30px avatar circle (sage-mid fill, 11px/500 initial, hover ring 3px sage-subtle).
- **Avatar dropdown** (`.av-menu`, 618): 208px, cream, hairline, `radius.md`, 6px padding, `shadow.menu`. Opens with opacity plus translateY(-6px to 0) over 180ms. The header shows the name (13px/500) and "Founding Stylist" (11px ink-faint). Items are 12.5px ink-soft at `radius.sm`, hover `rgba(32,32,33,.04)`.
- **Mobile dock** (`#rb-dock`, 584–599):
  - Fixed bottom, with safe-area padding.
  - Container: glass white @.7 + blur 22, 1px `rgba(231,224,207,.85)`, **24px radius**.
  - Five tabs: Home · Lookbook · Diary · Wardrobe · Inspiration. Each is a 20px line icon over a 9.5px/500/.04em caps label, ink-soft.
  - Active: ink plus a 24×2 ink bar at the top.
- **Mobile return band:** below 768px the back pill replaces the wordmark. Share becomes a 33px header circle.
- **In-page tabs and shelves:** `#sn-tabs` (All looks | Key pieces styled | Daily looks | Travel edits) and wardrobe All pieces | Wishlist. Both use the filter-pill anatomy and scroll horizontally on mobile.

### Inputs
- **Concierge prompt (hero)** (`.concierge-box`, 1496):
  - White, hairline, `radius.card`, padding 8×8×12.
  - Parts: segmented intents, then a twinkling rose spark icon, then a 16px/300/1.6 textarea (placeholder ink @.32), then a serif-italic 14px hint, then the ink send pill.
  - Focus-within: rose border @.45 + 4px rose glow @.06.
- **Field** (`.field-input`, 1204): white, hairline, `radius.sm`, 12×14 padding, 13px. Focus: border ink @.25.
- **Field label** (`.field-label`): 9.5px/500/.2em caps, ink-faint.
- **Onboarding/landing underline input:** transparent, 1px bottom border only (`.ob-input`), on dark.
- **Stepper:** `.limit-btn` is a 34px circle. The track is 3px `rgba(32,32,33,.08)` with an ink fill.
- **Copy-link row:** `.copy-row` is white, hairline, `radius.sm`, with the URL in 12px ink-faint and a rose "Copy".

### Toasts & notices
- **Toast** (`.toast`, 1297): fixed bottom-centre 34px, **ink pill**, cream 12.5px text, 13×22 padding, `shadow.toast`, 14px sage-mid check icon. Rises 80px over 300ms. Non-interactive.
- **Notice panels:** hairline + cream (never an ink border, because ink means selected).
- **Form messages:** 2px radius, 10×14 padding, 13px/300, in the error or success tint (`signup.html` 333–352).

### Empty states
- **Philosophy:** "One door". An empty surface offers exactly one action, and nothing reads as broken.
- **Dashed tiles:** `.day-empty`, `.rb-add-card`, `.rb-wl-tile`, `.trip-tile-add`. 1.5px dashed on cream-100 or transparent, ink-faint icon (20–24px, stroke 1.4–1.5) with a short label. Hover shifts to sage or ink.
- **Missing image:** the frame hides itself on error and settles to a **serif monogram** ("an empty card reads as broken; a monogram reads as pending"). This is a Cormorant glyph on a cream gradient.
- **Copy:** name what she owns first. Use "Left free." rather than "Nothing yet." Never use lock language.

### Loaders / "composing" animations
- **Spinner:** `.gen-spinner`. 38px, 2px `rule-mid` ring with an ink top, .8s linear.
- **Step list:** `.gen-steps`. 12px lines at .4 opacity. The active line goes to full opacity with a sage dot.
- **Serif status line:** italic 21–28px in ink or ink-faint, rotating lines such as "Reading your week…", "Composing outfits…" (and the banned "Generating…").
- **Load bar:** `kpLoadBar`, a sweeping 2.5s bar.
- **Image placeholders:** pulse between opacity 1 and .55 (`kpPhPulse` 1.8s, `rbLkFill` 1.5s) on cream-200. The landing uses a linear `sheen` shimmer.
- **Concierge spark:** `cbTwinkle` 2.8s (scale .88 to 1, opacity .45 to 1). Disabled under reduced motion.

### Image treatments
- **Aspect ratios:** 3:4 portrait is the canon default (piece grid, key-piece looks, day cards, wishlist, add tiles). 4:5 is used for the look hero and composer canvas (`.rbc-hero`, `.rb-lkm-canvas`, rails), 18 uses. 1:1 is used for the look-card mosaic zone, piece photo and rack tiles. The moodboard mix is 16:11.
- **Treatment:** `object-fit: cover` on a cream-200 placeholder, clipped by the container radius. Hover zooms 1.025–1.04 over 400–500ms with `--ease`.
- **Generated images** are always portrait.

---

## 6. Iconography & imagery

- **Icon style:** inline SVG line icons on a 24-unit viewBox. `fill:none`, `stroke:currentColor`, **round caps and joins**, stroke 1.4–2.2 (mode 1.6/1.2/1.4/1.8), rendered at 13–20px. This is visually Feather/Lucide-like but hand-inlined; no icon library is loaded. **For the port:** `lucide-react` and `lucide-react-native` match closely. Set `strokeWidth={1.6}` by default, 1.4 for 20px+ and 2–2.2 for ≤11px.
- **Typographic symbols** (specimen canon): ✦ ☾ ✓ ↺ ‹ › → · ✕ ×. Platform emoji never ship in chrome, except weather glyphs.
- **Wordmark:** the text "ROBES" in Cormorant 400, uppercase, with wide tracking. Sizes:
  - nav: 17px, .34em
  - landing: 21px, .26em
  - dialog rail and email: 15px, .28em (email falls back to Georgia)
  - onboarding splash: 30px, 300 weight, .42em, cream on ink
  
  Always pair the tracking with a matching `text-indent` (or `padding-left`) so the word centres optically. No logo mark or SVG logo file exists.
- **App icon / monogram:** a cream serif capital **R** (Cormorant) centred on an ink `#202021` square with a subtle radial lift. Files: `public/images/robes-icon-{64,192,512}.png`, `public/apple-touch-icon.png`. The 512 is declared `any maskable`, so check the safe zone before reusing it for Android adaptive icons. No iOS 1024 icon or splash asset exists yet. The manifest has `theme_color`/`background_color` `#202021`, `display: standalone`, `start_url: /dashboard`.
- **Surface texture:** 4–5% SVG fractal-noise **grain** over cream (dialogs, landing, onboarding dark shell), plus soft mauve/blush radial washes (landing `.radials`, onboarding `.dk-glow`).
- **Photography direction:**
  - The image prompts in `server.js` define the look. Garments: "Editorial still-life photograph of a single {piece} … styled alone on a neutral **cream-linen surface, soft daylight, quiet luxury catalogue aesthetic**. No model, no text, no collage."
  - Looks: "PORTRAIT ORIENTATION ONLY. Single fashion editorial photograph — one {wearer}, alone… **Soft natural light, luxury campaign aesthetic**." Also "clean warm-grey studio backdrop".
  - The palette leans warm neutral (sand, ivory, walnut, marble). Figures are full-length and head-to-toe.
  - Seed imagery: `public/dashboard-assets/` holds `w_*` PNGs (generated tennis/linen still-lifes and street shots) and `un_*` JPGs. The `un_*` files are **Unsplash photos** (the IDs are Unsplash photo IDs; free under the Unsplash License, attribution optional).
  - **Flag:** `public/images/looks/look1.jpg` carries the Gemini ✦ watermark bottom-right. Do not reuse it in app-store screenshots.

---

## 7. Accessibility gaps

WCAG 2.2 contrast ratios below were computed from the actual hex values; alpha colours were blended over the named surface.

**Passing (canon):**
- ink on cream: 15.36:1
- ink-soft `#6E6A64` on cream: 5.07 (on white 5.37, on cream-100 4.74)
- ink-faint `#7E6F50` on cream: 4.63 (on white 4.91)
- cream on ink: 15.36
- `#A89880` on ink: 5.79 (fine as on-dark text)
- error `#8B3A30` on `#FDF0EE`: 6.87
- success `#2E5C28` on `#F0F5EF`: 7.10
- email body `#4A463F`: 9.38

**Failing or at-risk text:**

| Pair | Ratio | Where | Fix |
|---|---|---|---|
| ink-faint `#7E6F50` on **cream-100** `#F5F0E8` | **4.33** | Eyebrows/meta on panel fills, segmented tracks | Use ink-soft on cream-100/200, or darken ink-faint to `#766849` |
| ink-faint on **cream-200** `#EFE9DC` | **4.06** | Disabled CTA label, captions on placeholders | Same |
| Legacy `#A89880` on cream / white | **2.65 / 2.81** | ~40 hard-coded uses: SVG strokes, stylenotes links, reset page, **email footer + unsubscribe link** | Replace with `#7E6F50`. Keep `#A89880` for on-dark only |
| Fallback `#9A9082` / `#9A958E` | 2.96 / 2.97 | `var(--ink-faint,#9A9082)` fallbacks, some inline `stroke='%239A9082'` | Fix the fallbacks, because they render whenever the token fails |
| rose `#8E7077` on cream / white | **4.18 / 4.44** | Small text despite the canon ("large labels only"): `.concierge-ey` 10px, `.wg-title` 11px, `.share-ey` 9px, `.sec-link` 11.5px, `.copy-btn`, `.mix-badge` 9px | Small-text rose becomes `#7A5C63` (5.6) |
| sage `#7E7C5A` on cream / white | **4.03 / 4.27** | `.day-occ` 11.5px, `.subtab.active` 11.5px, `.day-today-tag` 9px, trip counts | Small-text sage becomes `#5E5C3F` (6.4) |
| sage on sage-subtle (blended `#F1EFE5`) | **3.70** | Active subtab, `.hp-add.is-key` | Same |
| rose on rose-subtle (blended `#F0ECE8`) | **3.77** | Pill hover state text | Same |
| White on sage @.92 (`.tt-yours`, 9px) | ~4.2 | "Yours" badge on photos | Use ink @.78 (the `.wg-owned-badge` style) |
| Placeholder ink @.30–.32 | **1.9–2.0** | All textareas and inputs | Use `#75706A` (4.6 on cream, 4.9 on white) or accept it as a hint and pair it with a visible label |
| Email footer `#8E8A83` on white | **3.44** | `notify.js` | `#6E6A64` |
| Admin amber `#B07E36` on white | **3.57** | admin.html only | `#8B6A2E` |
| Onboarding dark eyebrows cream @.32–.34 on ink | **2.8–3.0** | `.dk-splash-sub`, `.dk-eyebrow` | Cream @.62 (6.7) or `#A89880` (5.8) |

**Non-text contrast (WCAG 1.4.11, 3:1):**
- `rule-mid` blended over cream is `#E0DEDC`, only **1.27:1**. Hairline input and card borders are therefore effectively invisible as control boundaries.
- The white card on cream is 1.06:1.
- Input focus changes only the border, to ink @.25, which also fails 3:1.
- Acceptable for decorative card edges. **Not acceptable for form fields and the prompt box:** give inputs a `border.strong` (`rgba(32,32,33,.28)`) resting border, and a 2px ink focus ring.

**Focus states:**
- Canon: global `:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px }`.
- Present in dashboard, onboarding, signup, reset, stylenotes, look, board, specimen and robes-mvp.css.
- **Missing** in `admin.html`, `privacy.html` and `terms.html`, and it's unclear whether it reaches injected components that set `outline:none` (textareas `.cb-ta`, `.home-prompt textarea`, `.field-input` all set `outline:none` and rely on a border shift).
- **For the port:** make a visible focus ring a primitive (web `focus-visible:outline-2 outline-offset-2 outline-ink`; native relies on platform focus for hardware keyboards).

**Type floors violated:**
- Serif below 17px: `.lt-title` 14px, `.cb-hint` 14px, `.hp-hint` 13px, `⌕` search hints 13px.
- Sans below 9px: dock 8.5px on screens narrower than 360px, plus 8px ×5, 7.5px ×1, 7px ×1.

**Touch targets:**
- The canon is 44px minimum, via invisible `::after` hit areas.
- Visible controls at 28–34px: rename 28, `.hp-add`/`.hp-send`/`.fm-x`/avatar 30, share 33, stepper 34.
- Several of these lack an `::after` expansion. On native, use `hitSlop` to reach 44pt.

**Other:**
- Zoom is never locked, and inputs are 16px on mobile (good).
- Reduced motion is honoured for decorative loops only. Also disable image hover-zoom and `fmRise` translate.
- **Colour-only meaning:** sage vs rose counts in trip meta (`.s`/`.r`) rely on hue. Pair them with words, which some already have.
- **Accent weight:** the black-fill filter pill contradicts the "black = one commitment" rule. That is a hierarchy and semantics issue, not strictly an accessibility one.
