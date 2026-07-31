# Robes — Product Naming Map (spec → system)

*2026-07-31 · Companion to `docs/system-architecture.md`. Translates the product spec's language (Pieces / The Look / Creating a Look) into the canonical names in the codebase and database, and marks what exists today vs. what is a new build. Use these names verbatim in Claude Code handoffs — every table, function and surface below is real and greppable.*

**Status legend** — **Live**: built and shipping on `beta` · **Partial**: exists, but differs from the spec's wording in a way the handoff must name · **New**: not built; landing zone named.

---

## Page 1 — Pieces

### The entity

| Spec language | Canonical name | Status |
|---|---|---|
| "A piece is an item of clothing" | **`wardrobe_items`** row (client cache `_waItems`). Columns: `label`, `category`, `color`, `brand`, `notes`, `image_url`, `times_worn`, `item_dna` jsonb, plus v2 (migration 10): `hero_position`, `seasons[]`, `occasions[]`, `price`, `fit_confidence`, `sentiment` | Live |
| "The LLM scans it for key metadata" | **`POST /api/wardrobe/analyse`** (Gemini 2.5-flash, temp 0, thinking 0) → `label/category/color/brand/notes` + **`item_dna`** (`display` incl. `editorial_color_name` + `primary_color_hex`, `structural_dna.silhouette_fit`, `llm_styling_context`, `ai_generated_notes`). The add experience is the **3-step wardrobe add flow** (`WA.open` → `_runStep2` → `_runStep3`, the onboarding-style reveal + "What Robes files" ledger). Photo → **`POST /api/wardrobe/upload`** → Cloudinary | Live |

### The three piece states

| Spec language | Canonical name | Status |
|---|---|---|
| Owned | `wardrobe_items` | Live |
| On a wishlist | **`wishlist_items`** — separate table by design (wardrobe counts/triggers/closet payloads untouched). `source_type ∈ robes · instagram · substack · screenshot · url · photo` | Live |
| Suggested by Robes | Two forms: (a) an **unowned rack item** inside a generated artifact — an item with no `wardrobe_match`, carrying `retailer_hint` + `price_point`; (b) once saved, a `wishlist_items` row with `source_type: 'robes'` ("Robes suggests" chip), written through the one shared helper **`_wlSaveFromItem`** | Live |
| (implied) wishlist → owned | **"I bought this"** (`__wlBought`) — copies the row into `wardrobe_items`, deletes the wishlist row, fires `__rbAddFork` | Live |

### Actions from a piece

| Spec action | Canonical name | Status |
|---|---|---|
| Style 3 ways | The **key-piece track**: `'style'` intent → `_cbStyleSubmit` → **`POST /api/style`** → saved as `lookbook_items.type: 'key-piece'`. Offered contextually by the **post-add fork modal** `__rbAddFork` ("Style it 3 ways" / "Build today's look around it") | Live |
| Build a Look | The **composer** (Looks Phase 2): writes **`looks`** + **`look_pieces`**; renders through `_rbConsole`/`_rbcRow`; entry is the "+ New look" `.rb-add-card` on the Looks tab | Live |
| Pack for a trip | From wardrobe: **"✈ Pack a trip" multi-select** → `__tvOpen({anchors})`. From a Look: **`Pack it`** → trip intake with the look's pieces as shortlist (`window._lkPackSeed`). Engine: **`POST /api/travel`** → `lookbook_items.type: 'travel-edit'` | Live |
| Re-sell (Vinted, Depop) | No component. Existing hooks a future build would stand on: `wardrobe_items.price` + `times_worn` (cost-per-wear already renders in the detail expander and Look detail stats), `sentiment` ("Irreplaceable" = never suggest letting it go) | New |

### Robes piece data gathering (future iteration)

| Spec item | What already exists | Status |
|---|---|---|
| Wear data | Piece level: `wardrobe_items.times_worn`. Look level: the **`wears`** table — immutable rows, `piece_ids` snapshot, one per `(look, date)`; written by `window.__lkAccrue` from all three wear paths | Live |
| Item cost / cost per wear | `wardrobe_items.price` (private, migration 10); cost-per-wear line in the detail expander; Look detail shows **cost per wear only when priced pieces AND a wear both exist** | Live |
| Resale profit / loss | Nothing; would extend the price columns | New |
| Spend data | `profiles.budget` (tier), `annual_spend`, `splurge_categories` — Style Notes "Taste & budget" tab | Live |

### Categorisation

`category` today is **single-level text** (Tops / Bottoms / Outerwear / Dresses / Shoes / Bags / Accessories / Swimwear / Other — the guardrail taxonomy enforced in the `/api/wardrobe/analyse` prompt; the `#wa-cat` select must always include `Other`). The 3-level taxonomy (Google Sheet) is a **schema change**: keep `category` as the back-compat L1 and land L2/L3 either as new columns or inside `item_dna` — a migration plus an analyse-prompt update, and every category-driven surface (Refine tabs, swap-modal candidate pools, `_dlSlot` rack ordering, composer slot-matching) reads L1 only until deliberately upgraded. **Status: New — treat as its own brief.**

---

## Page 2 — The Look

### The entity and its display

| Spec language | Canonical name | Status |
|---|---|---|
| "Each look has a name" | `looks.name` + **`name_provisional`** — titles are **offered, not applied** (A6): Robes' suggestion pre-fills, becomes the name only if she leaves it; field placeholder "Name your Look" | Live |
| Image left / pieces right | **The Look / The Rack** console — one renderer, **`_rbConsole`**: left = the standing **4:5 composition** (`rb-lookv2` board) *or* the look's photograph at the same ratio; right = **`_rbcRow` rack rows** under the eyebrow **"The Rack"**. Grid/strip thumbnails everywhere compose **`window._rbLookTile`** (`_ltTile`/`_ltMosaicHtml`) — the shared primitive; **never build a second look card** (handoff rule) | Live |
| Create by uploading a selfie + adding pieces | Composer photo path: image hosted via `/api/wardrobe/upload` first, stored as `looks.photo_url`, fills the left panel. **No garment extraction from the photo** (Phase 3, deliberately not built — the picture is just the look's image). Pieces are added via rack rows (`__lkApplyNew`, `__rbcAddMenu`) | Live |
| Create by adding pieces, image populates from thumbnails | The board composition — `rb-lookv2` tiles populate as pieces land; grid tiles show the `_ltMosaicHtml` mosaic | Live |

### Actions on a look

The four load-bearing actions on Look detail are, verbatim: **`Wear it today` · `Pin to a day` · `Pack it` · `Swap a piece`** ("Restyle" is reserved app-wide for AI re-mixes — vocabulary rule).

| Spec action | Canonical name | Status |
|---|---|---|
| "Wear today — daily prompt connects weather and vibe to an existing look" | Today, **`Wear it today`** = record the fact: tap IS the wear (no confirm), quiet undo on the card; writes a `wears` row + `times_worn` via `__lkAccrue`. The spec's version — running the look through the daily engine with weather/context — is a **different verb**: a `__dlSubmit`/`POST /api/daily` call with the look's pieces as `locked` (anchored) and `context` from `window.__rbCtx`. Name it distinctly in the brief (e.g. "Style this look for today") or sessions will overwrite the wear-logging tap | Partial |
| "Pin to a week — assigned to a date" | **`Pin to a day`** → writes **`planned_days`** with `source_type: 'look'` — top precedence tier (`_pdTier`), surfaces on the home rail + month calendar through the same DayCard; opener branches to Look detail (`_rbOpenPlannedDay`, uuid source_id) | Live |
| "adjustments made locally without change, or save a new look" | **Variant promotion** (A5/B5): editing a look **with history** opens *Update this look / Save as a new look / Leave it* — nothing applies until she picks. Promote writes a new row with `origin_look_id` + `source: 'variant'`; a look with no history just takes the edit | Live |
| "Pin to a trip → event → day" | Today `Pack it` routes to **trip intake** with the pieces as shortlist (`_lkPackSeed`) — the look travels as pieces, not as a unit. Assigning a look *as a look* to a trip event/day is **New**: landing zones are the trip blob's `tvData.days[].slots` and `planned_days` (`source_type: 'travel'`, `slot: day|evening`); the Travel day-card restructure this depends on is briefed separately and was deliberately deferred | New |
| "Post action — wear confirmation via checkbox" | The three existing wear paths, all through **`__lkAccrue`**: `_dcMarkWorn` ("Wore it ✓" in the day peek), `__rbRailWear` (rail fallback), `__dlWear` (daily console). Undo DELETEs the wear (the only correction — `wears` has no update policy) | Live |
| "or uploading a selfie of muse wearing the outfit" | The **OOTD capture phase** — schema already reserves `planned_days.ootd_photo_url` + `worn_at` (unwritten, migration 12) and `wears.note`. Write path is New | New |

---

## Page 3 — Creating a look (entry points)

| Spec entry point | Canonical name | Status |
|---|---|---|
| Wardrobe → Looks tab → all saved looks | **`__waSetView('looks')`** — the `#rb-wsub` row is *All pieces \| Looks \| Wishlist*; `/looks` deep link, crumb `Wardrobe › Looks`; grid of `_ltTile` mosaics; one sort control (**Last worn ↓ / First worn ↑**, never-worn falls to the end desc / front asc); "+ New look" `.rb-add-card` closes the grid | Live |
| Homepage placeholder to create a look | No home entry today. Nearest patterns to compose from: the concierge intent scaffolds (`_cbSetIntent`) and the module-ordering pass (`_rbFtueOrder`). Standing rule to respect: routes land on the home prompt; features are never locked | New |
| Wardrobe quick add — piece or look (mobile) | Adding a piece: **`#rb-wa-fab`** (mobile FAB) / `#rb-add-pill` (desktop) → **`__waAddChooser`**. Extending the chooser with "create a look" is the New part — the chooser is the right seam | Partial |
| Calendar / Weekly plan / Travel edit — add an existing look or create one | Pinning an existing look to a date already exists (`Pin to a day` above, and it wins precedence on the rail/calendar). Choosing an existing look from *inside* the weekly/travel consoles is **New**: seams are the weekly day modal (`#wk-day-modal`), the travel day console (`_tvPaintConsole`), and the day peek (`__rbDayPeek`); any picker built there must compose `_rbLookTile` | Partial |

---

## Handoff vocabulary — the names sessions must not invent around

| Concept | The one name |
|---|---|
| Look thumbnail/card anywhere | `window._rbLookTile` (`_ltTile`, `_ltStripHtml`, `_ltMosaicHtml`) |
| Day card on any surface | DayCard — `_dcCard` (normaliser `_dcMoments`) |
| Any Look/Rack console | `_rbConsole` + `_rbcRow` (+ `_rbSwapModal` for swaps, `__rbcAddMenu` for add) |
| The dated-day index | `planned_days` — index over the blobs, never a replacement; precedence at read time: `look` > `daily` > `travel` > `weekly` |
| The plan artifacts | `lookbook_items` — `type: key-piece · daily-look · weekly-plan · travel-edit · moodboard` (+ `weekly-plan` blobs `wkData`, travel `tvData`, daily `dlData`) |
| Track configuration | `_RB_TRACKS` — a new plan-shaped feature is a config entry, not a fork |
| The wear fact | `wears` — immutable, snapshot `piece_ids`, unique per `(look, date)`; accrual via `window.__lkAccrue` |
| Copy rules in play | never lock/unlock language; never `n / 15` fractions; "Restyle" = AI re-mix only; notice panels hairline + cream, ink borders mean *selected* |
