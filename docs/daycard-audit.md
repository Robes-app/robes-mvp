# DayCard Audit — Findings Report

**Scope:** `public/js/dashboard-personalize.js` (12,724 lines) + `supabase/planned_days_migration.sql`, branch `beta`. Read-only diagnostic — no files changed as part of the audit.

**Headline:** The four surfaces are backed by **one shared data index** (`planned_days`) and **one shared opener** (`_rbOpenPlannedDay`), but the *rendering* of a day is **four bespoke code paths** with three different thumbnail strategies, three different evening signals, and three different title fields. The single cheapest structural fix is converging the body-tap / select-day handlers — see D-05.

The four surfaces:

1. **Homepage rail** — "The Week Ahead" horizontal card row
2. **Weekly Plan** — Mon–Sun day strip above The Look / The Rack
3. **Holiday / Travel Edit** — "Day 1 / Day 2 …" trip strip under the `02 · Outfits` tab
4. **Lookbook Calendar** — month-grid day cells under the CALENDAR toggle

---

## 1. Component inventory

| Surface | Function(s) | File:line | Shared or bespoke |
|---|---|---|---|
| **Homepage rail** | `_rbRail` IIFE; card builder `cardHtml(slot,i)` | `10978–11358`; card `11129–11174` | **Bespoke.** Only the *opener* (`_rbOpenPlannedDay`) is shared. |
| **Weekly strip** | `_wkPaintStrip()` → maps into shared `_rbDayStrip` | `5817–5836`; shell `_rbDayStrip` `4631–4646` | **Shell shared, adapter bespoke.** |
| **Travel strip** | `_tvPaintWeek()` → maps into shared `_rbDayStrip` | `7365–7393`; shell `4631–4646` | **Shell shared, adapter bespoke.** |
| **Calendar cell** | `_rbMonthView` IIFE; `_mvPaint` cells + `_mvBands` bands | `11368–11625`; cells `11522–11591`; bands `11496–11520` | **Bespoke.** |

**Shared components that exist:**
- `_rbDayStrip(days, sel)` (`4631–4646`) — the button/DOM shell for Weekly + Travel strips only. Each surface feeds it a **bespoke mapper reading a different source shape** (`d.items` vs `d.slots[].formula[].item_index → capsule`).
- `_rbConsole(cfg, items)` (`4586+`) — the *console panel below* the strips (not the card); ownership copy is genuinely centralized here (`4589–4593`).
- `window._rbOpenPlannedDay(m)` (`11267–11279`) — **the one shared opener**; rail card, calendar cell, and `?d=` deep link all route through it. Explicitly documented as such (`11264–11266`).

**Data layer (shared by all four):** `planned_days` is a flat **row-per-moment index** over the `wkData`/`tvData`/`dlData` blobs — *not* a `days` table. Grouping into a day happens client-side in `_pdSlots()` (`2942–2952`). Rail reads it via `_pdRail` (`2956–2973`); calendar via `_pdMonth` (`2976–2987`). Weekly/Travel strips **do not read `planned_days` at all** — they read the live in-memory blob (`_wkState.data` / `window.__lastTvData`).

**Fossil:** dead `.tvm-day` CSS (`7128–7140`, `7243`) duplicates `.rbd-day` — leftover from before the strips were unified onto `_rbDayStrip`. → **LEGACY**, safe to remove.

---

## 2. Slot matrix (7 slots × 4 surfaces)

| # | Slot | Homepage rail | Weekly strip | Travel strip | Calendar cell |
|---|---|---|---|---|---|
| 1 | **Eyebrow** | ✅ `slot.date` via `fmtCard` (11135) | ✅ weekday+date, split from `d.day_label` (5823–24) | ⚠️ **"Day N" only — no calendar date** (`d.date` never set; strip's date branch never fires) (7380) | ✅ serif numeral from `date` (11565) |
| 2 | **Title = occasion** | ✅ `activity ‖ headline ‖ 'Planned'` (11154) | ✅ **`d.occasion`** (5826) — AI-overwritten, see D-02 | ✅ `day_label` part[1] **‖ `slots[0].title`** (7383) | ✅ `activity ‖ headline` (11574) |
| 3 | **Evening line** | ✅ text `Evening · {act}` from `slot==='evening'` row (11156) | ❌ **absent on card** (toggle in console only) | ⚠️ implicit **"2 looks"** via `slots.length` (7384); toggle in console | ✅ **☾ marker** from `eveW` (11576–77) |
| 4 | **Thumbnails** | ❌ **none — color swatches** from `item_ids→hex` instead (11160) | ✅ ≤**4** images, `wardrobe_match ‖ generatedImages` (5830) | ✅ ≤**4** images pooled across all slots (7385) | ✅ ≤**3** `thumb_urls` (11578) |
| 5 | **Footer `{n} pieces · {n} yours`** | ❌ (counts live only in `rb-upnext`) | ⚠️ `{n} pieces · {n} yours` abbreviated (5829) | ❌ **`{n} looks`** — no ownership (7384) | ❌ absent |
| 6 | **Context chip** | ✅ dot+tag `srcFact/srcDot` (11107) | ❌ page-level only (6381) | ❌ page-level only (7884) | ✅ **row-spanning band**, not in cell (11555) |
| 7 | **State** | ✅ 7 states + pinned/worn (11085) | ✅ active/dim/your-plan (no worn dot) | ✅ active/dim/packed-dot | ✅ bare/free/past/fut/today/pinned |

---

## 3. Findings (per divergence)

### D-01 — Evening signal reads three different underlying blob fields.
- **Surfaces:** all four.
- **What diverges:** At the *index* layer they agree (`planned_days.slot === 'evening'`, read by rail `11132` and calendar `11563`). But the **blob-level source fields the row-builders normalize from have accumulated three shapes**: Weekly `w.evenings[].day_index` + `w.days[i].evening_look` (`_pdRowsWk` 2749–2762); Travel `d.slots[].slot` indexing `capsule` (`_pdRowsTv` 2790–2805); Daily `dlData.slot` scalar (`_pdRowsDl` 2817). The live consoles read these divergent fields directly (`_wkConItems` 5851, `_tvLookState` 7299–7315). *Signal presentation* also diverges: rail = text line, calendar = ☾, Weekly = console toggle (no card signal), Travel = "2 looks" + console toggle.
- **file:line:** `2749–2762`, `2790–2805`, `2817`, `5851`, `7299–7315`, `11132`, `11563`, `11576–77`.
- **Classification: INTENTIONAL-LOOKING.** Per-surface signal density is a deliberate design choice (rail/calendar are compact reads; consoles are editors). Apparent intent: match signal weight to surface. The three-field blob accumulation is real but already reconciled at the `planned_days.slot` layer, so not itself user-visible — flag for awareness, do not resolve blind.

### D-02 — Title field diverges: Weekly strip shows the AI occasion, everyone else prefers the user's words.
- **Surfaces:** Weekly strip vs rail/calendar (and Travel).
- **What diverges:** Rail (`11154`) and calendar (`11574`) render `activity ‖ headline`, where `activity` is preferentially the user's typed text (`user_activity`/`occasion_label`, `_pdRowsWk` 2743). The **Weekly strip card instead renders `d.occasion`** (`5826`), and `_wkApplyDay` (`6209`) **overwrites `d.occasion` with the server-generated occasion** over the raw typed activity (`d.occasion = fresh.occasion || activity || d.occasion`). Travel strip synthesizes its title from a `day_label` substring with a `slots[0].title` fallback (`7383`) — a third mechanism. The user's typed text becomes only a small "· your plan" flag on both strips, never the big title.
- **file:line:** `5826`, `6209`, `7383`, `11154`, `11574`, `2743`.
- **Classification: STATE/LOGIC BUG** for the field inconsistency (Weekly strip can display a generated occasion where the same day on the rail/calendar shows the user's words — same day, two titles). The `_wkApplyDay` server-occasion-wins behavior underneath is **INTENTIONAL-LOOKING** (a product choice about whose phrasing wins) — escalate that half rather than silently flipping it.

### D-03 — `{n} yours` is computable only from the blob, not from `planned_days`.
- **Surfaces:** Weekly strip renders it (`5829`); Travel strip, rail, calendar do not.
- **What diverges:** `_pdOwnedIds` (`2718–2722`) pushes an id **only when `wardrobe_match` exists**, so `planned_days.item_ids` is an **owned-only list with no denominator** and no unowned/suggested split. There is no `total_items` column. Every working `{n} yours` site in the file computes against the full blob's item array (`5121`, `6368`, `7515`), never against `item_ids`.
- **file:line:** `2718–2722`, `5121`, `5829`, `6368`, `7515`.
- **Classification: STATE/LOGIC BUG** (data-shape). Adding the count to rail/calendar is **not** a rendering change — it needs a new denormalized column on `planned_days` (populated in `_pdRowsWk/Tv/Dl`) or a blob join back via `snLoad()` (the way `_pdParent` already resolves title). See §6.

### D-04 — Travel renders two differently-worded ownership counts in one panel, and the score bar measures the wrong thing.
- **Surface:** Travel console.
- **What diverges:** Shared `_rbConsole` prints `{n} of {m} from your wardrobe` (`4593`); `_tvPaintConsole`'s `readHtml` *also* prints `{n} of {m} pieces are already yours` (`7515–16`) — and its score bar numerator counts **packed**, not owned (`7521`). Weekly has no second line.
- **file:line:** `4593`, `7511–14`, `7515–16`, `7521`.
- **Classification: INTENTIONAL-LOOKING.** Code comments (`7511–14`) show the packed-vs-owned split is deliberate for the buying-intent surface. The duplicate differently-worded line is the resolvable part, but resolving it changes visible copy — escalate.

### D-05 — Body-tap / select-day is 3–4 separate implementations. (The prominent one.)
- **Surfaces:** all four.
- **What diverges:** `__rbRailTap` (`11242–11251`, flag-aware: scope-prompt vs open), `__wkSelectDay` (`5809–5815`), `__tvSelectDay` (`7354–7359`), `__mvCell` (`11595–11600`). Weekly and Travel select-day are byte-for-byte parallel (set index → reset occasion → repaint strip → repaint console) using different globals — never factored into a shared `_rbSelectDay`. Only the terminal *open* (`_rbOpenPlannedDay`) is shared, and only rail + calendar + deep-link use it (the strips don't).
- **file:line:** `5809–5815`, `7354–7359`, `11242–11251`, `11267–11279`, `11595–11600`.
- **Classification: LEGACY.** Converging these is the cheapest structural fix and it re-sequences the rest of this work — flagged prominently as requested.

### D-06 — Homepage uses two open-labels for one action.
- **Surface:** rail.
- **What diverges:** `11171`: `state === 'today' ? 'Open the look →' : 'Open →'`. The switch is purely `state==='today'`. (Past cards show `Wore it?`/`Worn ✓`; empty/free show `Dress today →`/`Dress this day →`/`Dress it →`.)
- **file:line:** `11171`.
- **Classification: INTENTIONAL-LOOKING** (today gets the fuller label deliberately); trivial. Noted per question F.

### D-07 — Calendar collapses `worn`, `past-empty`, and `out-of-month` into shared treatments.
- **Surface:** calendar.
- **What diverges:** Class chain `11567–11573`: `is-bare` (first branch) captures **both** out-of-month **and** in-month-empty, before past/future are tested — so a past empty day is indistinguishable from a day outside the month. `worn` is **never checked in `_mvPaint`** (the only `status==='worn'` check in the file is the rail, `11134`) — a worn day and an unworn planned day both render `is-past`. Past vs future-unplanned are distinguished **only by the raw `date < today` / `date > today` comparison**, and only for cells that already have content.
- **file:line:** `11134`, `11567–11573`.
- **Classification: INTENTIONAL-LOOKING** for the worn collapse (month-scale simplification; the rail carries worn). The past-empty-vs-out-of-month identity is a byproduct of branch order — borderline; flag for product, since `status` and `inMonth` are both already on hand, making a distinction a pure rendering change if wanted.

### D-08 — Calendar band stacking: confirmed 2-lane hard cap; "4 banners" cannot come from the lane code alone.
See §5.1. **Classification: STATE/LOGIC BUG candidate** (ghost/superseded bands) + unhandled density (`+N more` gives no reveal).

### D-09 — Calendar "empty hero slot": dismissed as an image slot.
See §5.2. **Classification: not a defect** — band-lane `padding-top`, working as keyed.

### D-10 — Four different thumbnail strategies.
- **Surfaces:** all four.
- **What diverges:** Rail: **no images**, color swatches from `item_ids→hex` (`11160`, deliberate "palette whisper" design). Calendar: ≤3 `thumb_urls` (`11578`). Weekly/Travel strips: ≤4 resolved images (`5830`/`7385`).
- **file:line:** `5830`, `7385`, `11160`, `11578`.
- **Classification: INTENTIONAL-LOOKING** (rail's imageless design is documented product intent). Note the 3-vs-4 thumb-count inconsistency between calendar and strips as minor.

### D-11 — Travel strip has no calendar date in the eyebrow.
- **Surface:** Travel strip.
- **What diverges:** `d.date` is never set in `_tvPaintWeek`, so the shared shell's date branch (`4640`) never fires; strip shows "Day 1/2/3".
- **file:line:** `4640`, `7380`.
- **Classification: INTENTIONAL-LOOKING** (a trip is day-indexed, not calendar-dated, by design).

### D-12 — Dead `.tvm-day` CSS fossil.
- **Surface:** Travel strip styles.
- **What diverges:** `.tvm-day` rules (`7128–7140`, `7243`) duplicate `.rbd-day`; the class is never emitted (strip markup uses `.rbd-day`).
- **Classification: LEGACY.** Safe to remove.

---

## 4. Answers to questions A–F

**A. Evening mechanism.** Not one field. At the **index** layer, rail (`11132`) and calendar (`11563`) both read `planned_days.slot === 'evening'` — *same normalized field*. At the **blob/console** layer three distinct fields have accumulated: Weekly `evening_look`+`evenings[]`, Travel `slots[].slot`+`capsule`, Daily `dlData.slot`. The row-builders `_pdRowsWk/Tv/Dl` are the normalizers that flatten all three into `planned_days.slot`. Signal *rendering* differs by surface (text / ☾ / toggle / "2 looks"). → D-01.

**B. Title semantics.** Rail + calendar: `activity ‖ headline` (user words preferred). Weekly strip: `d.occasion` (server-overwritten in `_wkApplyDay:6209`). Travel strip: `day_label` substring `‖ slots[0].title`. Three mechanisms; Weekly is the odd one that can show a generated occasion where the rail shows the typed one. → D-02.

**C. Ownership counts — rendering or data change?** **Data change.** `planned_days.item_ids` is owned-only (`_pdOwnedIds:2718`) with no denominator and no unowned list; no total-count column exists. Rail and calendar cannot compute `{n} yours` from the row they already have — it requires either a new denormalized column populated in the row-builders, or a blob join via `snLoad()` (as `_pdParent` does for title). → D-03.

**D. State logic.**
- Rail (`cardState:11085`): `empty-past / empty-today / empty-future / free / past / today / planned`, plus `pinned` and `worn` modifiers. Worn *is* distinguished here.
- Weekly strip: `active / dim(rest) / your-plan flag`. **No worn state** (`__wkWear` logs `times_worn` but never repaints the strip, `6146–6171`).
- Travel strip: `active / dim(no slots) / packed-dot`. The dot is **packing**, not worn.
- Calendar (`11567–73`): `bare / free / past / fut / today / pinned`. **Worn never checked; past-empty == out-of-month.** Past vs future distinguishable only by date comparison, and only for populated cells. → D-07.

**E. Data shape.** No `days` table. `planned_days` = row-per-moment, unique on `(user_id, source_id, day_index, slot)`, grouped client-side into days by `_pdSlots` (`2942–2952`). **Rail** → `_pdRail`→`_pdSlots` (precedence `daily>travel>weekly`, ties to latest `updated_at`; `_pdTier/_pdWinner` `2892–2897`). **Calendar** → `_pdMonth` (`2976–2987`, returns *unresolved* rows so bands see losing rows) then `_mvFresh`/`_pdWinner` at paint. **Weekly/Travel strips** → do **not** touch `planned_days`; they iterate the live blob `_wkState.data.days` / `window.__lastTvData.days` directly. So the four surfaces genuinely differ: two read the index, two read the blob.

**F. Two-action model.**
- Body-tap: Rail `__rbRailTap` (`11242`, flag ON → `_ikScopeDay` scopes the prompt; flag OFF → opens). Weekly `__wkSelectDay` (`5809`) / Travel `__tvSelectDay` (`7354`) re-point the console below. Calendar `__mvCell` (`11595`) opens via the shared `_rbOpenPlannedDay`. **These are separate implementations** (D-05) — the two strip handlers are parallel-but-duplicated; only the rail/calendar *open* converges on `_rbOpenPlannedDay`.
- Open affordance: Rail CTA button, labels `Open the look →` (today) / `Open →` (else) at `11171`, condition = `state==='today'` (D-06). The strips have **no separate open link** — the whole day button *is* the select-day handler. `rb-upnext` uses its own `Open the trip →`/`Open the week →`/`Open →` (`11224`).
- Calendar body-tap: cell → `__mvCell` → `_rbOpenPlannedDay` (lands on the specific day). Band tap is different: `__mvBand` → `__snOpenItem(sid)` (opens the parent artifact at its default day, `11601–11604`). Bare/empty cells get no `onclick` (`11580`).

---

## 5. Suspected defects — confirmed / dismissed

### 5.1 Context-banner collision — PARTIALLY DISMISSED as a lane bug; a real ghost-band path confirmed.
The lane engine (`11526–11536`) uses a fixed 2-element `laneEnd`; a 3rd/4th concurrent segment can only ever increment `weekMore[w]` → a single `+N more` text node (`11557`). **The code cannot render 4 stacked `.rb-mband` buttons in one week row.** So the observed "four banners" is not this algorithm failing. Two real causes are consistent with the code:

1. **Ghost/superseded bands (STATE/LOGIC BUG candidate):** `_mvBands` groups by raw `source_id` (`11497`); supersession (`_pdFreshest` `2933–2941`) resolves *per date per source_type*. A **rescheduled** trip/week (moved to new dates, not regenerated over the same ones) leaves the old source's rows on its old dates unsuppressed — so a stale band renders alongside its replacement, inflating the count past the "1 trip + 1 week" the 2-lane design assumes.
2. Adjacent week rows (each legitimately 2 bands, `gap:8px`) reading visually as one dense block.

Also latent: lane assignment iterates in **query/discovery order, not sorted by `start_col`** (`11529` iterates `Object.keys` order), which deviates from the "greedy by start column" description — a minor correctness gap. No `z-index` on `.rb-mband`; stacking is DOM-order only, and `.rb-mw` has no `overflow` clip. **Recommend reproducing with the actual August 2026 data to confirm which cause; the ghost-band path is the one to instrument.**

### 5.2 Empty hero slot — DISMISSED.
There is **no image/hero element in `.rb-mc` at all** (grep confirms every `hero` hit belongs to the unrelated Wardrobe Hero Rack). The "large blank area" on the top row is the **band-lane `padding-top` reservation** on `.rb-mw` (`11546–11548`: `padTop = lanes ? 4 + lanes*18 : 0`). Week 1 opens with a band → `padTop` 22–40px; later band-free weeks → `padTop 0`. Cells are fixed `aspect-ratio:1.25` regardless, so the row-1 header gap reads as a reserved image slot but is padding. **Not an image slot, not a legacy branch, not unintended conditional rendering** — it's the band reservation, keyed on lane count as intended (arguably a visual-polish issue, not a defect).

---

## 6. Effort read — rendering vs data

**Pure rendering changes (data already present):**
- D-05 body-tap/select-day convergence (refactor to a shared `_rbSelectDay`).
- D-06 homepage label unification.
- D-02 title-field harmonization *(the field choice; `activity`/`occasion` both already on the row/blob)* — but the `_wkApplyDay` occasion-overwrite is a **product decision**, escalate before touching.
- D-04 Travel duplicate-count copy.
- D-07 calendar worn / past-empty distinction — `status` and `inMonth` are already in hand; distinguishing them is rendering-only.
- D-10 rail/calendar thumbnail alignment (`thumb_urls` already on the row).
- D-01 surfacing an evening marker on the Weekly strip (`evening_look` already in the blob).
- D-12 fossil `.tvm-day` CSS removal.

**Require data-layer work:**
- **D-03 `{n} yours` on rail/calendar** — needs a new denormalized column on `planned_days` (total/unowned count, populated in `_pdRowsWk/Tv/Dl`) *or* a blob join via `snLoad()`. `item_ids` today is owned-only with no denominator. This is the one finding that is unambiguously a data change, not a render tweak.
- **D-08 ghost-band supersession** — a data/logic change to `_pdFreshest`/`_mvBands` (source-level, not per-date, supersession for rescheduled plans). Confirm via reproduction first.
