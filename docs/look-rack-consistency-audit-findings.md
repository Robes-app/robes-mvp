# Look / Rack consistency audit — findings report

**Brief:** Audit Brief — The Look / The Rack component consistency (22 July 2026)
**Pass type:** Diagnostic only. No code was modified in this pass.
**Surfaces:** Daily Look · Weekly Planner · Travel Edit
**Files audited:** `public/js/dashboard-personalize.js` (all rendering + client data-shaping), `server.js` (schemas, prompts, normalisers), `public/dashboard.html` (shared chrome/tokens).

All line references are to the `claude/component-inventory-read-only-mjpif9` branch head (cut from `beta`, 2026-07-22).

---

## Section A — Component inventory

**Headline:** there are no per-surface component files. Both panels render through one shared template, `_rbConsole()`, in a single file. Every surface is a **variant of the shared base** (a thin adapter supplying config + item props). **No independent copies** of either panel exist. The pre-unification forked renderers were replaced by the shared console on 2026-07-12 (the code marks itself "audit P1 — one canonical template", `dashboard-personalize.js:3705`).

### A.1 Shared base (all three surfaces)

| Component | Location | Role |
|---|---|---|
| `_rbConsole(cfg, items)` | `public/js/dashboard-personalize.js:3944` | Canonical template — returns `{lookHtml, rackHtml}` |
| `_rbcTile(it, wide, cfg)` | `dashboard-personalize.js:3894` | Look composition tile (first tile wide; slot label, owned tick / Add chip, hover flick arrows, `the {piece}` caption) |
| `_rbcRow(it, cfg)` | `dashboard-personalize.js:3906` | Rack row (slot eyebrow, name, `subHtml` provenance, optional `noteHtml`, carousel cluster, Anchor/Swap/`thirdHtml`, × remove) |
| `_rbcReadBlock(opts)` | `dashboard-personalize.js:3827` | "The read" verdict block — unit string + metric passed in per surface |
| `_RBC_CSS` / `_rbcEnsureCss()` | `dashboard-personalize.js:3716` / `:3817` | The one `.rbc-*` stylesheet for both panels |
| `_rbDayStrip(days, sel)` | `dashboard-personalize.js:3979` | Shared calendar strip (Weekly + Travel) |
| `_rbSwapModal(item, cfg)` | `dashboard-personalize.js:4576` | One swap modal for all three racks |
| `__rbcAddMenu(applyName)` | `dashboard-personalize.js:3997` | "+ Add a piece" three-door chooser |
| `_rbcInitSwipe()` | `dashboard-personalize.js:3844` | Swipe-to-remove on rack rows |
| `_rbFeedbackBlock` / `_rbFeedbackArm` | `dashboard-personalize.js:4095` | Shared feedback module (surface chrome, §3.3.5) |
| Option/carousel helpers `_dlSlot` `_dlShort` `_dlFabric` `_dlAltered` `_dlOptions` `_dlOptIndex` `_dlApplyOption` | `dashboard-personalize.js:3640–3703` | Shared data-shaping consumed by all three adapters despite the `_dl` prefix |

### A.2 Per-surface adapters

| Surface | Panel(s) | Location | Classification |
|---|---|---|---|
| Daily | Look + Rack | `__dlRenderResult` `:4366–4571`; frames `:4423`, quote `:4442`, fabrics `:4455`, item props `:4463`, `_rbConsole` call `:4481` | Variant of shared base |
| Daily | chrome/CSS | `_DL_CSS` `:4263` (console grid `360px | minmax(0,1fr)`, gap 34 `:4279`); `.dlm-payoff` footer `:4527` | Surface chrome |
| Weekly | Look + Rack | `_wkPaintConsole` `:4938–5014`; frames `:4959`, item props `:4973`, `_rbConsole` call `:4991`; strip `_wkPaintStrip` `:4913` | Variant of shared base |
| Weekly | chrome/CSS | Shell `__wkRenderResult` `:5286` (inline styles); 2-rule `#wk-style` `:5300–5306` (grid `360px | 1fr`, gap 18); footer = shared `.rb-sfoot` (`dashboard.html`) | Surface chrome — thinnest |
| Travel | Look + Rack | `_tvPaintConsole` `:6262–6371`; frames `_tvFrame` `:6187`, item props `:6314` (adds `isNew` `showAddTag` `rowClass` `wearsHtml` `noteHtml` `thirdHtml`), read `:6341`, `_rbConsole` call `:6352` (only caller passing `occHtml`, `rackTitleHtml`, `noprint`) | Variant of shared base — widest config surface |
| Travel | chrome/CSS | `_TV_CSS` `:6004` (console grid `360px | minmax(0,1fr)`, gap 34 `:6049`); shell `__tvRenderResult` `:6511`; `.tvm-payoff` footer | Surface chrome |

### A.3 Data-shaping layer (`server.js`)

| Surface | Schema + normaliser | Lines |
|---|---|---|
| Daily | `DAILY_SCHEMA`; alternates sanitiser; wardrobe-state directive | :565, :725, :646 |
| Weekly | `WEEKLY_SCHEMA`; `weeklyNormaliseItem` (blanks retailer/price on owned); `WEEKLY_DAY_SCHEMA` | :806, :883, :1034 |
| Travel | `TRAVEL_SCHEMA`; capsule sanitiser; `TRAVEL_DAY_SCHEMA`; `TRAVEL_OUTFITS_SCHEMA` | :1134, :1337, :1654, :1784 |

Inventory facts that drive Section B: **no currency/price formatter exists anywhere** — the rendered string is whatever the model returns under prompt guidance; and **provenance-line assembly is per-adapter inline code**, not shared — only Weekly dedupes `retailer_hint === brand` (`:4975`).

Scope note: legacy saved dress-me looks (pre-`/api/daily`) reopen through `__kpRenderResult` — a separate non-console renderer, reachable only from old lookbook rows.

---

## Section B — Findings

Class key: **L** = LEGACY · **I** = INTENTIONAL-LOOKING (expanded in Section C) · **B** = STATE-OR-LOGIC BUG (expanded in Section D). File = `public/js/dashboard-personalize.js` unless prefixed `server.js`.

| ID | Surface(s) | Component | Observed | Canonical per §3 | Class | Evidence |
|---|---|---|---|---|---|---|
| F1 | All | Look footer, ownership count | Daily + Weekly: `N of M from your wardrobe`; Travel: `N of M already yours` | §3.2.8 one string | **L** | :4486, :4996, :6358 |
| F2 | All | The Read | Daily + Weekly identical (`in your wardrobe`, ownership metric). Travel: `in the case` AND a different **metric** — packed count, not owned count. Hypothesised three-way split is **refuted**: it is two-way, and the real divergence is the metric | §3.2.9 one label/denominator/pattern | **I** | :4487–4492, :4997–5002, :6341–6349 |
| F3 | Weekly vs D/T | Provenance price | `EUR550`-style rendering on Weekly vs `€145` on Daily/Travel. Cause found: no formatter exists on any surface; Daily and Travel prompts carry a `€` example (`"€89"`, `"€145"`), Weekly's `WEEKLY_ITEM_RULES` says only "realistic EUR price_point" with no symbol example | §3.2.7 one currency format | **B** | server.js:676, :900, :1443; render sites :4477, :4975, :6333 |
| F4 | Daily, Travel | Provenance line | `COS · COS · €145` duplication: Daily and Travel join `brand` + `retailer_hint` unconditionally; the model frequently sets retailer = brand (prompt examples name "COS", "Arket" — brands that are their own retailer). Weekly alone dedupes (`retailer_hint !== brand` guard) | §3.2.7 one field ordering, no duplication | **B** (output) + **L** (only one surface has the guard) | :4477, :6333 vs :4975 |
| F5 | All | Provenance field order | **Refuted:** brand → retailer · price is the same order on all three surfaces; the observed Weekly difference is only F4's dedupe | — | — | :4477, :4975–4987, :6333 |
| F6 | All | Stylist note | Weekly (`d.note`) and Travel (`s.how`) wrap in curly quotes; Daily prefers unquoted `stylist_summary` prose, falling back to a *synthesised* quoted line. Also three different **content sources** feed the same visual slot | §3.2.3 one treatment, no quotation marks | **L** (quote marks) + **I** (content source) | :4483 + :4400, :4993, :6355 |
| F7 | Daily | Stylist note copy | Internal vocabulary (`The Anchor`, `The Canvas`, `The Texture`) is **prompt-instructed** into user-facing copy — the `/api/daily` field rule explicitly says to "reference the steps by name". This contradicts the client's own no-jargon stance (comment at :4397). No sanitisation pass exists, so generation artifacts (e.g. "composed of art use") pass straight through | §3.2.3 | **B** (prompt-origin — report and stop per §9) | server.js:673; passthrough :4400 |
| F8 | All | Fabric chips | Duplicates render (`linen, linen, leather, leather`): `_dlFabric` maps each item independently; none of the three builders dedupe. Uniform across surfaces — a shared-component defect, not drift | §3.2.4 | **L** | :3658, :4455, :4969, :6309 |
| F9 | All | Look panel width | **Largely refuted:** all three use a fixed 360px Look column inside the same `--shell` wrapper (30/25/20% screenshot claim does not match current code; likely pre-unification captures). Residual divergence: Weekly gap 18 vs 34, and Weekly's `1fr` (not `minmax(0,1fr)`) rack track — the documented grid-blowout trap | §3.2.5 one proportion | **L** (+ latent bug, D7) | :4279, :5304, :6049 |
| F10 | Weekly | Palette swatches | Rendered twice: masthead pill row + Look footer. Daily/Travel render once (Look footer) | §3.2.4 one metadata block | **L** | :5313 + :5327 vs :4995 |
| F11 | All | Rack header | Three treatments: Travel serif `<h2>` slot title (`rackTitleHtml`), Weekly folds occasion into the eyebrow (`The rack · Monday · {occasion}`), Daily plain (`The rack · {weekday}`). Underlying data differs: only Travel has per-look titles; Daily has `occasion_label` but does not use it here | §3.2.10 | **I** | :6361, :5003, :4493 |
| F12 | Travel only | Rack row 3rd action | `+ Add` exists only on Travel; verified packing-scoped: `__tvAddOwn` sets `it.added = true` only — never writes wardrobe or wishlist. Daily/Weekly offer no path to act on a suggested piece beyond swapping it away | §3.3.2 permits Travel's extra action; the *absence of any* acquisition path on D/W is the question | **I** (pre-flagged by brief) | :6335–6337, :7028–7032 |
| F13 | Travel | 3rd-action slot weight | Same slot renders a borderless text `Pack` checkbox for owned/added pieces vs a **filled ink** `+ Add` pill for unowned — different visual weights in one slot | §3.2.12 | **I** | `_TV_CSS` :6127 vs :6119; :6335–6337 |
| F14 | All | Rack header actions | Travel 3 buttons (Restyle / The real plan / Pack this look, all `.rbc-hbtn`); Weekly 2 in reversed order with The real plan as an underlined text link (`.rbc-hlink`); Daily 1 (Restyle). Same action, different weight and position across surfaces | §3.2.12 | **L** (weight/order) + structural (presence — see Q4) | :6362, :5004, :4494; CSS :3756 vs :3758 |
| F15 | All (shared tile) | Tile state marker | One position (top-right, 7px), two forms: owned → white circle tick, unowned+unadded → amber `Add` text chip. Only Travel sets `showAddTag`, so Daily/Weekly unowned tiles carry **no marker at all** | §3.3.4 one marker, one position, different values — form varies (icon vs chip) and D/W drop the unowned value | **L** | :3894–3899, :3729–3730; :6327 |
| F16 | Travel/Weekly | Thumbnail badges | **Refuted:** `× N looks` (reuse) is bottom-**left** (`.vlooks`), `i / n` (carousel) is bottom-**right** (`.vcount`) — fixed distinct positions in shared CSS; they co-exist on Travel rows without collision | §3.2.11 | — | :3768, :3769, :3917, :6330 |
| F17 | All | Carousel presence | **State-driven, not a bug:** cluster renders only when >1 option; dots ≤8 options, numeric counter >8. Daily rows systematically have ≥3 options (schema forces exactly 2 AI alternates); Weekly/Travel deliberately generate **no AI alternates** — their carousels exist only when owned same-category pieces do | §3.2.10 | **I** (alternates asymmetry) | :3906–3910, :3670–3683; server.js:677; comments :4934–4937, :6373–6376 |
| F18 | Travel only | Per-row styling note | `noteHtml` (formula note, italic serif) renders only on Travel. Daily and Weekly items carry a required `description` in the data shape that is never rendered in the row | §3.2.10 row anatomy includes styling note | **I** | :6334 vs :4463–4478, :4973–4988; schemas server.js:606, :836 |
| F19 | Weekly | Worth-adding eyebrow | Weekly unowned rows show brand + price only — no `Worth adding` tag. The flag is **derivable from the data shape** (`wardrobe_match: null`); it is simply unrendered. Travel renders it | §3.3.4 | **L** | :4985–4987 vs :6333 |
| F20 | Weekly (+Daily) | Occasion casing | Confirmed: **no normalisation step exists anywhere.** `LAOISE WORK WEEK` = the model echoing user text into `week_label` under a prompt rule demanding ALL CAPS; the rack eyebrow additionally applies CSS `text-transform: uppercase` to raw `occasion`. Daily's `occasion_label` is likewise prompt-mandated ALL CAPS | §3.2 (copy hygiene) | **B** (prompt+CSS origin) | server.js:945, :671; :5003 + CSS :3753; render :5325 |
| F21 | All (shared tile) | Nomenclature captions | The shared tile renders `the {piece}` captions (`.tlab`) on **all three** surfaces — uniform, but §3.2.2 defines the canonical state as *absence* of captions. No divergence; the shared component itself is contra-canonical | §3.2.2 | **I** (needs a product read on whether §3.2.2 means "absent" or "uniform") | :3902, :3728 |
| F22 | Weekly | `transition_tip` | Generated and schema-**required** on every weekly day (and re-required by `WEEKLY_DAY_SCHEMA`), never rendered anywhere — paid-for tokens with no surface. Matches CLAUDE.md's "tip strip is retired" note but the field remains mandatory | — (efficiency/coherence) | **L** | server.js:949, :1042, :1005; no render site |

---

## Section C — Escalations (INTENTIONAL-LOOKING, expanded)

**C-F2 · The Read measures different things on Travel.**
Solving for: on Travel the actionable question is "is this look packed?", not "do I own it?" — the score counts `packed` flags and the verdict routes to pack/add actions. Converging to an ownership metric would cost Travel its packing telemetry at the exact moment of packing intent. Question to answer: is The Read *one component with one metric*, or *one visual pattern over a per-surface metric*? If the latter, §3.2.9 should be amended to fix only label grammar and pattern, not the denominator.

**C-F6 · Stylist-note content source.**
Solving for: each surface quotes its best available register — Daily has a 2–3-sentence generated summary; Weekly has a one-line per-day routing note; Travel has the slot's `how` line. Converging the *treatment* (quotes, type, length) is cheap; converging the *source* means changing what the generation returns per day (schema work). Question: is the canonical note a day-scoped one-liner (Weekly/Travel shape) or summary prose (Daily shape)?

**C-F11 · Rack header title.**
Solving for: Travel's serif day title is real data (per-slot look titles exist only in `TRAVEL_SCHEMA`); Weekly's eyebrow-occasion is the only place the day's plan is visible inside the console; Daily assumes the masthead already said it. Converging requires deciding whether Daily/Weekly should *generate* look titles (schema change) or Travel should demote its title. Question: does the canonical rack header carry a title at all?

**C-F12 · `+ Add` scope (brief pre-flagged).**
Solving for: Travel's `+ Add` means "add to the pack" — verified it never touches `wardrobe_items` or `wishlist_items` (ownership capture stays on the swap modal's Snap-mine path). Daily/Weekly have no acquisition affordance for suggested pieces even though `wishlist_items` exists and has a save pipeline. Converging by copying the button would import packing semantics that don't exist off-Travel; a wardrobe/wishlist-scoped `+ Add` is a new feature, not a convergence. Question: should a suggested piece be saveable to wishlist from Daily/Weekly racks? (Evidence says the plumbing exists: `wishlist_items` + `__wlOpenAdd`.)

**C-F13 · Pack checkbox vs filled `+ Add` in one slot.**
Solving for: the filled ink `+ Add` is the conversion moment for an unowned piece (the affiliate/acquisition hook per CLAUDE.md's travel section); the quiet checkbox is a low-stakes toggle for pieces already hers. The weight difference appears to encode intent hierarchy, not drift. Converging weights would flatten a deliberate funnel emphasis. Question: is §3.2.12 meant to apply across *states* of one slot, or only across *surfaces* for the same state?

**C-F17 · AI alternates are Daily-only.**
Solving for: cost and honesty — Weekly's 12k-token response already strains the budget, and travel comments call owned-only flicks "instant + truthful". Two AI alternates per item on Weekly (up to 84 items across 14 days) would be a large schema/token change. Converging the *presence* of a carousel is impossible without it; converging its *behaviour when options exist* is already done (shared helpers). Question: is carousel parity worth the weekly/travel token cost, or is "options = owned pieces only" the accepted off-Daily contract?

**C-F18 · Per-row styling notes Travel-only.**
Solving for: density — Travel's note is a per-look styling instruction (`how it's worn in this look`), while Daily/Weekly `description` is product copy; the earlier density pass explicitly stripped reason/bridge lines from travel edit cards. Rendering Daily/Weekly descriptions would lengthen every row on the two most-used surfaces. Question: does the canonical row anatomy's "styling note" mean look-contextual notes (then Daily/Weekly lack the *data*) or item descriptions (then it's a one-line render change)?

**C-F21 · Tile captions exist everywhere but §3.2.2 says they shouldn't.**
The shared tile is uniform, so there is no cross-surface divergence to fix — but if §3.2.2 genuinely defines captions as absent, this is a one-line shared-component change with product sign-off. Question: confirm the canonical intent (the brief lists absence as fixed, yet all live surfaces render captions).

**C-Weather · Header reads `Dublin · 19°C` over a Lahinch trip.**
Not a scoping bug in the code's own terms: the nav pill is the *home/current-city* strip (`_rbWeather` → `window.__rbCtx`, geolocated), deliberately separate from trip weather (`fetchTripWeather`, rendered in the travel masthead pill). The nav (z-50) intentionally floats above every result overlay (z-40), so both show at once. Solving for: persistent ambient context vs trip context. Converging (hiding or re-scoping the nav pill on travel) is cheap CSS/JS but changes global chrome behaviour on every overlay. Question: should global chrome yield to surface context on destination-scoped screens?

---

## Section D — Bugs (STATE-OR-LOGIC)

**D1 · Weekly look can render with no bottom garment.**
*Repro:* generate a weekly plan; inspect any day whose items list is top/shoes/bag/accessory (the brief's Monday case).
*Cause:* category coverage is enforced **only in prose** — prompt rule 3 ("one complete outfit of 4–6 items: top + bottom (or dress), footwear…", `server.js:940`). No validator checks slot coverage; there is no corrective regeneration pass (Travel has `unaccounted()` + the 1:3 corrective re-call; Weekly has nothing). Additionally `items.slice(0, 6)` (`server.js:1008`) silently drops overflow items — if the model lists a bottom seventh, it is cut without any coverage re-check. Either mechanism produces the observed look.

**D2 · Weekly week-summary describes looks that aren't rendered.**
*Repro:* generate a week, then restyle any day (or flick/swap/remove a piece); the masthead `stylist_summary` still names the original anchor pieces.
*Cause:* `stylist_summary` is written once at `/api/weekly` (`server.js:1018`) and never touched again. Every mutation path — `_wkApplyDay` (`:5163–5186`), `__wkFlip` (`:5016`), `__wkSwapApply` (`:5063`), `__wkRemove` (`:5041`) — rewrites `days` but not the summary; `WEEKLY_DAY_SCHEMA` (`server.js:1034–1043`) has no summary field, so a day restyle *cannot* return a fresh one (the client even sends `weekSummary` context *to* the endpoint, `:5145–5155`, but nothing flows back). A first-render mismatch (summary vs day 1 before any edits) would instead be single-response model drift — no cross-check exists in either place.

**D3 · Weekly letter-placeholder thumbnails ("E", "S") — refuted as a failure, confirmed as a design consequence.**
Not a missing asset or failed fetch: Weekly deliberately has **no imagery pipeline** ("no imagery — owned pieces render their wardrobe photos"). `wkFrame` (`:4959–4966`) renders a serif monogram whenever `wardrobe_match.image_url` is absent — which is every unowned suggested piece, and any *owned* piece whose wardrobe row lacks a photo. The code behaves as designed; the design reads as broken next to Daily/Travel stills. If the loafers/tote in the screenshot were suggested pieces, the monogram is the intended render.

**D4 · Currency drift is a prompt defect with no safety net** (= F3). The Weekly prompt omits the `€` symbol example the other two carry, and no layer — server normaliser or client renderer — formats or validates `price_point`. Per §9 this is reported, not fixed.

**D5 · `COS · COS` provenance duplication** (= F4). *Repro:* any Daily/Travel unowned item whose brand is a direct retailer. *Cause:* Daily `:4477` and Travel `:6333` concatenate `brand` + `retailer_hint` with no equality guard; Weekly's guard (`:4975`) shows the intended output. Server never dedupes either (`server.js:725`, `:1337`).

**D6 · Daily stylist note leaks framework vocabulary by instruction** (= F7). *Cause:* `server.js:673` explicitly instructs the summary to "reference the steps by name (The Anchor, The Canvas, The Texture)". The "composed of art use" fragment cannot be reproduced from code — consistent with a generation artifact passing through the zero-sanitisation path (`:4400` escapes HTML only). Prompt-origin; report and stop.

**D7 · Latent: Weekly's console grid uses `1fr`, not `minmax(0,1fr)`** (`:5304`). CLAUDE.md's own layout spec documents this exact trap ("plain `1fr` = `minmax(auto,1fr)` — a card's min-content width silently widens its whole column"). A long unbroken item name can widen the Weekly rack column where Daily/Travel are immune (`:4279`, `:6049`). No user report yet; flagged as latent.

---

## Section E — Convergence cost (per §3.2 fixed property)

| § | Property | Shared-component change | Per-surface unpicking | Data-shape change? |
|---|---|---|---|---|
| 1 | Composition grid / scale | **Done** — `_rbcTile`/`.rbc-board` are already the single implementation | None | No |
| 2 | Tile captions | One line in `_rbcTile` + CSS, *if* §3.2.2 means "absent" (see C-F21) | None | No |
| 3 | Stylist note treatment | Quote-mark + type convergence: trivial, three call sites feed one shared `.rbc-quote` | Choose the source per surface | **Yes, if the source converges** — Weekly/Travel have no summary-grade note per day; Daily has no day note. Sequenced separately |
| 4 | Metadata block order | **Done** in the shared panel (fabrics → palette → ownership) | Weekly: remove the masthead palette duplicate (F10) — one line | No. Fabric dedupe (F8) is one shared function |
| 5 | Look panel width | Already 360px everywhere | Weekly: gap 18→34 + `minmax(0,1fr)` (F9/D7) — two CSS tokens | No |
| 6 | One primary Look-footer action | **Structural gap:** the Look *component* has no footer action slot at all — primary actions live in per-surface page payoff bars (`.dlm-payoff` 3 actions / `.rb-sfoot` / `.tvm-payoff`). Converging means either adding a footer slot to `_rbConsole` or ruling payoff bars out of Look scope | Rework of three payoff bars if in scope | No |
| 7 | Currency / price / brand-retailer | A shared provenance builder (promote Weekly's dedupe into `_rbConsole`-adjacent code) fixes F4/F5 client-side; a display-side price normaliser could mask F3 | Three `subHtml` call sites collapse into one | **Prompt change** for the true F3 fix (out of scope per §9). Client normalisation is presentation-only |
| 8 | Ownership-count string | One template string in `_rbConsole` if `yoursHtml` moves from cfg into the shared template | Three one-line call sites | No |
| 9 | The Read | Label/pattern already shared (`_rbcReadBlock`) | Unit strings: two call-site edits | **Travel's metric** (packed vs owned) is a product decision, not a code edit (C-F2) |
| 10 | Rack row anatomy | **Done** structurally (`_rbcRow`) | Styling note: render Daily/Weekly `description` (data already present — one line each) *if* C-F18 resolves that way; Worth-adding tag on Weekly (F19) — one line | Only if C-F18 demands look-contextual notes for D/W (schema work) |
| 11 | Badge meaning/position | Positions already fixed and distinct in shared CSS (F16 refuted) | Optionally document the corner registry (slot TL, count BR, reuse BL, marker TR) | No |
| 12 | Action weight | `.rbc-hbtn`/`.rbc-hlink`/`.rbc-act` are shared classes — convergence is choosing which class each call site uses | Weekly real-plan link→button (F14): one attribute. Travel packbox/+Add weights (F13): blocked on C-F13 | No |

**Items requiring sequencing as data-shape work (different order of cost):** stylist-note source unification (§3.2.3), Travel Read metric (§3.2.9), look-contextual row notes for Daily/Weekly (§3.2.10), carousel/alternates parity (F17 — schema + token budget), weekly summary regeneration on day restyle (D2 — `WEEKLY_DAY_SCHEMA` field addition), and every prompt-origin copy defect (F3, F7, F20 — §9 forbids touching prompts in any convergence pass grouped with presentation work).

---

## §7 Open product questions — evidence recorded, no resolutions proposed

**Q1 · Weekly's unit.** Genuinely week-scoped in the code: the generation itself (`/api/weekly` is one call routing pieces *across* days — "deliberately re-wear key pieces across the week styled differently", `server.js:939`), the week-level `week_label` / `stylist_summary` / single 3-colour `palette` (`:945–950`), the day strip, and day-restyle continuity (the client compiles a `weekSummary` of every *other* day and the endpoint injects it as "THE WEEK SO FAR … never repeat an identical outfit", `:5145–5148`, `server.js:1082`). Everything inside the Look/Rack pair is day-scoped — the console renders exactly one day and is structurally the Daily console behind a date picker.

**Q2 · New-to-buy weighting.** No numeric ratio exists anywhere. The ratio is set qualitatively by the three-tier wardrobe-state directives, near-identical across surfaces (empty = all aspirational / 1–14 = "owned ALWAYS beats hypothetical" / ≥15 = closet-first): Daily `server.js:646–650`, Weekly `:873–877`, Travel `:1403–1405`. Travel adds the only hard caps: every shortlisted piece kept, ≤3 worth-adding beyond moodboard picks. Measurement instrumentation already exists — `logAI` records `owned` + `items` per generation (Daily `:732`, Weekly `:1012`, Travel `:1575`) and flows into `generation_log`; the actual produced ratios are a query against that table, not a code read.

**Q3 · `+ Add` scope.** Travel's `+ Add` is packing-specific: `__tvAddOwn` sets `it.added = true` and re-renders — no wardrobe or wishlist write (`:7028–7032`). Ownership capture is deliberately elsewhere (swap modal Snap-mine / pack-toggle own-modal). Daily/Weekly have no acquisition affordance, though `wishlist_items` and its add pipeline exist and are unused by any rack.

**Q4 · `The real plan`.** Weekly: `__wkEditDay` modal → `/api/weekly/day` — re-dresses one day for the entered activity, holds anchors, stores `user_activity` (`:5212`, `:5257–5266`). Travel: `__tvEditDay` → `/api/travel/day` — same pattern against the packed capsule, may propose one `new_item` (`:6362`; `server.js:1730`). Daily has no equivalent: its brief is already "the real plan", and its restyle re-poses the same brief. The label marks "correct the itinerary Robes assumed" — a concept only multi-day surfaces have.
