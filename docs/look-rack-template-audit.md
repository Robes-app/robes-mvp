# AUDIT — The Look & The Rack: Template Consistency
**Date:** 2026-07-12 · **Branch audited:** `claude/look-rack-template-audit-54i6g7` (P0 simplification line)
**Scope:** Daily Look (`__dlRenderResult`), Calendar-embedded Look (Weekly Plan, `_wkPaintConsole`), Planned Trip Outfit (Travel Edit, `_tvPaintConsole`) — plus any component that functionally renders a look or a swappable piece rack under another name.

---

## 0. Instance inventory (traced by rendering logic, not names)

| Context | Look renderer | Rack renderer | CSS strategy |
|---|---|---|---|
| Daily | `public/js/dashboard-personalize.js:2905` (`.dlm-look` panel inside `__dlRenderResult`) | `dashboard-personalize.js:2848` (`.dlm-rack` rows) | Classed CSS `_DL_CSS` using `:root` tokens |
| Calendar (Weekly) | `dashboard-personalize.js:3461` (dark panel inside `_wkPaintConsole`) | `dashboard-personalize.js:3427` (inline-styled cards) | **100% inline styles, hard-coded hexes** |
| Trip (Travel) | `dashboard-personalize.js:4719` (`.tvm-panel` inside `_tvPaintConsole`) | `dashboard-personalize.js:4754` (`.tvm-row` rows) | Classed CSS `_TV_CSS` mirroring `_DL_CSS` |

Rack-like components found that are **not** named "Rack":
- **Travel Edit "The Edit" capsule cards** (`tv-cap-${ci}`, `_tvPaintEditCards` + the Edit-pane card builder) — render the *same capsule items* as the Outfits-tab rack but as a different card component: Pack checkbox + Swap, **no flick-through**, different layout. Two piece-card templates inside one surface.
- **Moodboard rail** (`.mbr-card`, `_mbShowResult`) — eyebrow literally reads "The rack", has flick (`__mbFlip`), Swap, `+ Add a piece`, but **no Anchor**. Hidden this branch behind `_RB_MB_HIDDEN`, still divergent code.
- **Weekly day strip / Travel day strip** (`_wkPaintStrip:3360` vs `_tvPaintWeek:4625`) — same job (day navigator with thumbnails + meta), two implementations with different markup, thumb counts (3 vs 4) and packed-status affordances.
- Key Piece (`__kpRenderResult`) renders 3 editorial looks, not a Look/Rack console — legitimately a different component, out of scope.

The good news at the interaction layer: all three contexts **share the flick engine** (`_dlOptions` / `_dlOptIndex` / `_dlApplyOption`, `dashboard-personalize.js:2510–2543`) and the same empty-flick toast. The divergences are in structure, chrome, and which actions exist at all.

---

## 1. THE LOOK — canonical checks

### 1.1 Header — `"The Look — {x} Pieces — {Day/Date} — ROBES"`
| Context | Rendered | Verdict |
|---|---|---|
| Daily (`:2909`) | `The look · {x} pieces` + right-aligned `Robes` | ⚠ Missing **Day/Date** segment |
| Weekly (`:3465`) | `The look · {Day} · {x} pieces` | ✗ Missing the **ROBES** suffix |
| Travel (`:4722`) | `The look · {Day n} · {x} pieces` + `Robes` | ✓ Only full match |

Also structural: **Weekly's Look panel is dark ink (`#202021`)** while Daily and Travel are white/cream `.dlm-panel`/`.tvm-panel` cards. Same component, opposite visual identity — the single most visible template break.

*(All three use `The look` sentence-case with `·` separators rather than the spec's em-dashes/title case — internally consistent; decide the canon string once and apply everywhere.)*

### 1.2 Stylist note — top of The Look, inline text
- **Daily ✗** — the true stylist note (`stylist_summary`) lives in a **separate module** below the panel (`.dlm-note`, `:2920–2927`, "The stylist's note" card). The quote at the top of the panel (`:2912`) is **client-synthesized from piece names** (`:2813–2824`), not the stylist note.
- **Weekly ✓** — `d.note` renders inline at the top of the panel (`:3466`).
- **Travel ✓** — the slot's `how` line renders inline at the top (`:4726`).

Three different sources in three positions. Fix: render `stylist_summary` (Daily) inline at the top of the panel like Weekly/Travel; drop or demote the synthetic quote.

### 1.3 Transition tip — footer, all contexts
- **Daily ⚠** — exists but renders **inside the stylist-note module** (`:2926`), not the footer.
- **Weekly ✗ / Travel ✗** — the field **does not exist in the schemas** (`server.js:647 WEEKLY_SCHEMA`, `:958 TRAVEL_SCHEMA`, `:854 WEEKLY_DAY_SCHEMA`, `:1456 TRAVEL_DAY_SCHEMA`). Nothing to render.

Fix: add `transition_tip` to the weekly day object and travel slot object server-side, and render it in the shared footer position in all three.

### 1.4 Anchoring — anchored pieces survive a restyle
- **Daily ✓** — `__dlAnchor` (`:2565`), locked pieces posted to `/api/daily` and re-marked on the fresh data (`:2432–2449`).
- **Weekly ✓** — `__wkAnchor` (`:3498`), anchors posted to `/api/weekly/day`, re-marked in `_wkApplyDay` (`:3541–3563`).
- **Travel ✗ — anchoring does not exist at all.** No `__tvAnchor`, no `anchored` flag anywhere in the travel code (verified by grep across `:3790–6200`), and `/api/travel/day` accepts no anchors. A restyled trip day can discard any piece she deliberately kept.

Fix: port the Weekly pattern — `anchored` on capsule/formula entries, an ANCHORED block in the `/api/travel/day` prompt (mirror `server.js`'s weekly-day handling), re-mark on apply.

### 1.5 Primary CTA — `↻ Restyle this day`
- **Daily ⚠** — label is **"Restyle it"**, placed in the *Rack* header (`:2936`), icon is a diagonal-arrows SVG, not `↻`. The footer adds a second restyle-flavoured CTA ("Dress me again") that actually returns to the prompt — different semantics under a similar label.
- **Weekly ✓** — `↻ Restyle this day` (`:3472`), under the Look panel.
- **Travel ✗ — no restyle CTA exists.** The closest is `✎ The real plan`, which opens the day modal and **requires typing an activity**; there is no one-tap re-mix.

Fix: one label (`↻ Restyle this day`), one icon (`↻` or one shared SVG), one position, in all three; add `__tvRestyleDay` that posts `/api/travel/day` with the day's current activity (exactly what `__wkRestyleDay:3565` does).

---

## 2. THE RACK — canonical checks

### 2.1 Header
| Context | Rendered | Verdict |
|---|---|---|
| Daily (`:2931–2938`) | "The rack" + h2 **"Flip through. Robes reads the day."** + italic subtitle line + "Restyle it" CTA | ⚠ Spec says the title/subtitle **should be removed** — both still present. No Day/Date segment. |
| Weekly (`:3477`) | "The rack · {Day} · {occasion}" + "✎ The real plan" link | ⚠ No Restyle CTA in the header (it lives under the Look panel); no title (consistent with spec's removal). |
| Travel (`:4800–4808`) | "The rack · {Day}" + **h2 = the slot's look title** + "✎ The real plan" / "Pack this look" | ⚠ h2 repurposed for different content; no Restyle CTA. |

Fix: header = `The rack · {Day/Date}` + `Restyle it`-family CTA everywhere; delete Daily's title + subtitle strings; move Travel's `s.title` elsewhere (e.g. the Look quote area) if it must survive.

### 2.2 Card layout — thumbnail, label, title, brand, price / owned tag
- **Daily** `.dlm-row` (`:2859`) — 112px 1:1 image (slot label + `i/n` count overlaid), 21px serif name, provenance line (✓ In your wardrobe OR brand + retailer · price), actions footer.
- **Travel** `.tvm-row` (`:4769`) — same geometry ✓, plus a "Worth adding"/"Added to the pack" tag and an italic formula-note line (`:4780`) — acceptable trip-contextual additions.
- **Weekly ✗** — a bespoke card (`:3437–3458`): 72×92 thumbnail, slot eyebrow relocated into the text column, 17px name, `oi/n` counter styled and positioned differently, **plus a `description` line no other context has**. Field order, geometry and type scale all diverge — it is a different component in everything but purpose.

### 2.3 Swap — same trigger, same flow, same confirmation
- **Daily `__dlSwap` (`:3035`) and Travel `__tvSwap` (`:5519`) are line-for-line duplicate modals** — same trigger (card button + board tile tap), same flow (category grid → AI-alternative fallback → Snap mine → affiliate CTA), same confirmation toast pattern. Consistent UX ✓, but the consistency is maintained by copy-paste; they have already forked once (`_dlRerender` vs full `__tvRenderResult` + scroll restore) and will drift.
- **Weekly ✗ — Swap does not exist.** No swap button on cards, and the board tile tap is repurposed (see 2.5). The only way to change a piece is the flick carousel, which can't reach the swap modal's "Snap mine" or full-wardrobe grid.

Fix: extract one `_rbSwapModal(item, onApply, idPrefix)` and call it from all three (and from the moodboard rail, which has a third copy of the same pattern).

### 2.4 CTA set — Anchor, Swap (+ trip-only third action)
| Context | Spec | Actual | Verdict |
|---|---|---|---|
| Daily | Anchor, Swap | Anchor (lock SVG), Swap | ✓ |
| Calendar | Anchor, Swap | **Anchor only** (labelled `⚓ Anchored` — different icon language) | ✗ Swap missing |
| Trip | Anchor, Swap, Add/Pack | **Pack/Packed or + Add, Swap — no Anchor** | ✗ Anchor missing (third action present and correctly trip-only ✓) |

The trip-only Pack/+Add action does **not** leak into Daily or Calendar ✓.

### 2.5 `< >` navigation
- Behaviour is genuinely identical everywhere — all three call the shared option helpers ✓.
- Visuals are not: Daily/Travel use identical 32px SVG-chevron buttons + dots (with an `i / n` fallback above 8 options); Weekly uses raw `‹ ›` text characters at 26px, no >8 fallback, and a differently-styled counter on the thumbnail.
- **Board-tile tap action diverges**: Daily and Travel tiles open the **Swap modal**; Weekly tiles **toggle Anchor** (`:3416`). This is exactly the "relearn the interaction" failure the audit exists to catch — the same-looking tile does two different things depending on the page (and makes accidental anchoring easy on Weekly).
- Option sets legitimately differ by schema (Daily = original + AI alternates + owned; Weekly/Travel = original + owned). Expected, but dot counts will differ per context — worth a note, not a bug.

---

## 3. Other consistency gaps (found while tracing)

1. **Weekly is excluded from the Share flow.** No Share button in its footer (Back to dashboard / Plan a new week only, `:3719–3730`), `_shareActiveEntry` (`:5736`) has no `wkResultPage` branch, and `server.js`'s `publicSharePayload` has no `weekly-plan` case — a weekly plan cannot be published at any layer. Every other saved surface shares. *Fix: wk branch in `_shareActiveEntry`, `weekly-plan` mapping in `publicSharePayload`, Share (+ Rename) in the wk footer.*
2. **Weekly has no "Wear today".** Daily logs `times_worn` via `__dlWear`; the weekly surface — the one most tied to actually wearing an outfit each day — can't log wears. *Fix: per-day "Wear today" calling the same PATCH helper.*
3. **Weekly has no "+ Add a piece".** Daily rack, moodboard rail and the Travel Edit pane all have an add-piece affordance; Weekly's rack ends dead. *Fix: reuse `__dlAddPiece`'s `_waAfterAdd` pattern.*
4. **Restyle loading states are three different patterns.** Daily: full-screen overlay + 90s abort + 15s Cancel (`_rbOverlayGuard`). Weekly `__wkRestyleDay` (`:3565`): dims `#wk-day` to opacity 0.5 with **no AbortController, no timeout, and the button is not disabled** — a double-tap fires two parallel restyles and a hung fetch dims the console forever. Travel `__tvDayApply`: button-disable only. *Fix: a shared inline-busy helper with abort/timeout for the surgical day calls.*
5. **Weekly's CSS is entirely inline with hard-coded hexes** (`#202021`, `#A89880`, …) while Daily/Travel use injected classed CSS on `:root` tokens. Weekly will silently stop tracking any future token change. *Fix: extract `_WK_CSS` on tokens — or better, see the canonical fix below.*
6. **Feedback blocks are three visual variants** of the same 👍/👎-plus-comment module (Daily's centered serif card `:2944`, Weekly's compact card `:3705`, Travel's own). *Fix: one `_rbFeedbackBlock(surface, payloadFn)`.*
7. **Anchor microcopy/iconography drift**: "Anchored — every restyle builds around it" (Daily) vs "Anchored — this day restyles around it" (Weekly); lock SVG vs `⚓`. *Fix: one string, one icon.*
8. **Two day-strip implementations** (`_wkPaintStrip` vs `_tvPaintWeek`) — same navigator pattern, different markup/meta. Candidate for the same shared-renderer treatment.

---

## 4. Suggested canonical fix (priority order)

**P0 — user-visible interaction breaks**
1. Add **Swap to Weekly** (cards + tile tap) via a shared `_rbSwapModal`; retire the tile-tap-anchors behaviour so tiles mean "swap" everywhere.
2. Add **Anchor to Travel** (rack + tiles), extend `/api/travel/day` with an `anchors` block mirroring `/api/weekly/day`, and add a one-tap **`↻ Restyle this day`** to the Travel rack header.
3. Unify the **restyle CTA** (label, icon, position) across all three; Daily's "Restyle it" becomes "↻ Restyle this day" in the same slot.

**P1 — template unification**
4. Extract one **`_rbConsole(cfg)`** renderer for the Look panel + Rack (config: day label, items, note, transition tip, action set `{anchor, swap, pack}`, callbacks). Daily/Weekly/Travel become thin adapters; Weekly inherits the white panel, tokenised CSS, SVG arrows and Daily card geometry for free. Keep the trip-only Pack/+Add as the config-driven third action.
5. Normalise the **headers** to the canon strings (`The look · {x} pieces · {Day/Date} · Robes` / `The rack · {Day/Date}`), remove Daily's rack title + subtitle, and move Daily's `stylist_summary` inline to the top of the Look panel.
6. Add **`transition_tip`** to the weekly-day and travel-slot schemas; render it in the shared footer position in all three.

**P2 — parity + hygiene**
7. Weekly: Share/Rename wiring end-to-end, "Wear today", "+ Add a piece".
8. Shared inline-busy/abort helper for the day-restyle fetches; unify anchor toast copy and feedback blocks; fold the Travel Edit capsule card and the day strips into the shared component set when convenient.

---

## 5. Status — fixed on this branch (2026-07-12)

**Done**
- **Weekly Swap** — shared `_rbSwapModal` extracted (Daily `__dlSwap` and Travel `__tvSwap` now call it instead of carrying duplicate modals); Weekly gained `__wkSwap`/`__wkSwapApply`/`__wkSnapMine`, Swap buttons on rack cards, and board tiles now open Swap (tap-anchors behaviour retired — tiles mean "swap" in all three contexts).
- **Travel Anchor** — `__tvAnchor`, anchored row border + "Anchored" pill (Daily's visual), Anchor CTA in every rack row; `/api/travel/day` accepts `anchors` and holds them fixed; anchors persist in `tvData`.
- **Restyle CTA unified** — `↻ Restyle this day` in the rack header in all three contexts (Daily renamed from "Restyle it"; Travel gained one-tap `__tvRestyleDay` that re-mixes the selected day without forcing a typed plan).
- **Stylist note at top of The Look** — Daily's `stylist_summary` now renders inline at the top of the panel (synthetic quote is fallback only); the separate note module is gone. Weekly/Travel already complied.
- **Transition tip in the panel footer, all three** — added `transition_tip` to `WEEKLY_SCHEMA` days, `WEEKLY_DAY_SCHEMA`, `TRAVEL_SCHEMA`/`TRAVEL_DAY_SCHEMA` slots (token budgets bumped: travel 8000→9000, travel/day 2500→2800, outfits 6500→7200) and render it in the same footer strip in Daily, Weekly and Travel.
- **Headers normalised** — Look: `The look · {Day} · {x} pieces` + `Robes` in all three (Daily gained the weekday, Weekly gained the Robes suffix). Rack: `The rack · {Day}` (+ occasion/title where the context has one); Daily's marketing title + subtitle removed.
- **Weekly console visual parity** — white Look panel (dark panel retired), Daily-geometry rack cards (1:1 viewport, slot label + i/n on the image, 21px serif name, anchored pill, provenance line — the extra description line dropped), 32px flick arrows + capped dot rail, lock-icon Anchor (⚓ variant retired).
- **Weekly parity features** — footer Share / Wear today / Plan a new week; `+ Add a piece`; share wiring end-to-end (`_shareActiveEntry`/`_shareBuild`/`_shareFindOrMake` + server `publicSharePayload` `weekly-plan` branch).
- **Interaction hygiene** — anchor toast copy unified ("Anchored — restyles build around it"); day-restyle fetches got 75s aborts + re-entry guards (Weekly and Travel).

**P1/P2 completion (second pass, 2026-07-12)**
- **`_rbConsole(cfg)` extracted** — one canonical Look-panel + Rack renderer (`.rbc-*` classes, one tokenised stylesheet injected once). Daily, Weekly and Travel consoles are now thin adapters supplying frames, provenance lines, the trip-only Pack/+Add third action and their own handlers; the markup cannot fork again. Image-poller contracts unchanged (`data-dlimg`/`data-tvimg` ride in the frame objects).
- **Day strips unified** — `_rbDayStrip` (`.rbd-*`) renders both the Weekly and Travel calendars: one card design with day name, date (weekly), packed-status dot (travel), "· your plan" marker, overlapping thumbs, dimmed left-free days, scroll-snap.
- **Feedback blocks unified** — `_rbFeedbackBlock`/`_rbFeedbackArm` + one `__rbFbRate`/`__rbFbSubmit` pair power the Daily, Weekly and Travel blocks (per-surface copy only). The weekly `hidden`-vs-inline-display gotcha dies with the old markup.
- **Weekly Rename** — `__rbRename('wk')` + footer Rename button + `#wk-headline` live patch.
- **Shared abort guard** — `_rbDayPost(url, body)` (75s abort) now backs both `/api/weekly/day` and `/api/travel/day` calls.

**Deliberately left**
- The Travel Edit tab's capsule cards keep their own grid-card component — they are a packing checklist (1:3 matrix selection, packed sync by id), not a rack; folding them into `_rbcRow` would change that tab's information design, not fix an inconsistency.
