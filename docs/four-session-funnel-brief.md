# Four-session funnel — build brief for Claude Code

**Date**: 2026-09-17 · **Branch**: `beta` · **Status**: brief, nothing built
**Visuals**: `docs/four-session-funnel-brief.html` renders this brief with a wireframe set under every slice (dashed rose = what the slice adds) — read it alongside the text; a build session validates against those frames.
**Companion**: the review this brief implements — https://claude.ai/artifact/6PERswqbBrmbboNLYBTQmn — and the 19 Aug first-session audit (`docs/beta-ftue-ux-audit-2026-08-19.md`).

## What this is

The funnel roadmap names four sessions:

| Session | Roadmap | Target end state |
|---|---|---|
| 1 · The Spark | Onboard → one piece → three ways → build a look | 1 piece filed, 1 key piece saved, 1 look saved, one sentence read that names what comes next |
| 2 · Personalization | Build the model → three staples → swap them into the look | A model on file, ≥4 pieces, the Session-1 look hers and rendered on her |
| 3 · The Quick Batch | Category prompt → five pieces → Robes builds from hers | ≥5 photographed pieces, one look Robes assembled without a prompt |
| 4 · The Habit Loop | Four looks → dress the week ahead → wore it | ≥4 looks, ≥3 days ahead dressed or named, one wear logged |

The review found that Session 1 is built, Sessions 2–4 are mostly built but undoored, and nothing in the product causes session two to begin. This brief specifies the missing components as **seven slices**, each sized for one Claude Code session, each riding an existing surface wherever one serves. A slice = code + harness + a CLAUDE.md delta at the top of the file (the standing convention).

**Governing rules for every slice** (all standing conventions — restated so a build session cannot drift):

- Nothing is ever locked and copy never says lock/unlock. A threshold is a capability appearing.
- One ink fill per screen — the prompt's Style me on home, Save on a composer. Every new control here is a `.rb-pill` hairline or a text door.
- "AI" never appears in consumer copy. No assistant persona. Declarative, never presumptuous: Robes never asserts her plans, her body, her weather. Wardrobe-first: name what she owns before naming a gap.
- `_lkHomeSync` is the ONE place that decides home's modules; `_rbFtueOrder` sequences them. New home modules register there, never elsewhere.
- Any state a function reads is `var`, declared above its earliest caller (the TDZ trap).
- A new DB column degrades: strip-and-retry on PGRST204 naming it, feature stands down quietly until the migration runs.
- Insert-only tables are written with `Prefer: return=minimal` (`_rbCapturePost`).
- Harnesses reload `dashboard-personalize.js` on every boot — never edit while one runs; `travel_console_smoke` and `diary_harness` share port 4327.
- Never `capture` on a file picker input.
- Every slice ships with its harness green and a dated CLAUDE.md entry at the top.

**Stack note**: this repo is vanilla HTML + Express + Supabase + Gemini on Railway (per `CLAUDE.md`), not the Next.js/Anthropic stack the `solution-architect` skill describes. Follow the repo.

---

## Delivery order

| # | Slice | Session it serves | Schema? | Size | Depends on |
|---|---|---|---|---|---|
| 1 | The derived "next" line + the Filed card's forward line + retire the START HERE band + instrumentation | all | no | S | — |
| 2 | The model door on home + landing on the look dressed | 2 | no | S–M | 1 (the next line points at it) |
| 3 | Robes builds from yours at five + the ladder retune | 3 | no | M | 1 |
| 4 | Gap-led batch: the add flow takes a brief | 2–3 | no | M | 1 |
| 5 | Plan the week walk + the four-looks arrival | 4 | no | M | 1 |
| 6 | The re-engagement channel (email, sequence, morning cue) | all | **migration 22** | L | 1 (events), 2–5 (deep-link targets) |
| 7 | Onboarding re-sequence | 1 | no | S | founder call first |

Slices 2–5 are independent of each other and can run in parallel sessions. Slice 6 is mostly server-side and can start any time after 1; its deep links land better once 2–5 exist. Slice 7 waits on a founder decision (see Open decisions).

---

## Slice 1 · The derived "next" line, the Filed card's forward line, instrumentation

**Why**: home knows what she has (the mode machine) but never says what she should do next. The roadmap made visible without a new surface.

### 1.1 `_rbNextLine()` → the masthead echo

- **Where**: `dashboard-personalize.js`, home module, near `_lkHomeSync`. The echo today is the static `_RB_FTU_ECHO` ("What are we dressing for today?") written into `.dash-echo` (line ~14479) and flipped to "Your first piece is filed." in `zero` mode.
- **Reads** (all already in scope): `_waItems` (count, count with `_pdHttp(image_url)`), `_lkLooks` (count, proposals outstanding = looks whose `proposals` array holds any row not `saved`/owned), `_lkModel` (`undefined` = not asked, `null` = none, object = on file), planned days ahead (the rail cache `_pdRail`'s slots for today → +6: any `moment`), `_rbConciergeDone()`.
- **Returns** `{ key, text, doorLabel, door }` or `null`. First matching rule wins:

| key | Condition | text | door |
|---|---|---|---|
| `styled` | `zero` mode with the styled card present | (leave the mode's own echo) | — |
| `model` | `_lkModel === null` and `_lkLooks.length ≥ 1` | "Build your model and she'll wear *{first look name}*." | "Build your model" → slice 2's `__rbModelGo('home')` |
| `finish` | a look has ≥2 unowned proposals and pieces-with-photos < 5 | "*{look}* borrows {n} pieces. Photograph yours and it's all yours." | "Photograph them" → slice 4's `__rbFillOpen(lookId)` (until slice 4 lands: `__lkCardOpen(id,'home')`) |
| `five` | pieces-with-photos < 5 and `_lkLooks.length ≥ 1` | "{n} more piece{s} and Robes builds a look from yours alone." | "Add pieces" → `_wtrkOpenAdd()` |
| `robes` | pieces-with-photos ≥ 5 and no look with `source:'robes-build'` | "Five pieces filed. Robes can build from yours now." | "Let Robes build one" → slice 3's door (until then: `__lkNew()`) |
| `week` | no moment on any of the next 7 days | "Nothing planned this week. Name a day and Robes dresses it." | "Open the diary" → `__rbDiaryOpen()` |
| `wear` | a moment today, not yet worn | "Today is dressed. Tap the day when you've worn it." | "Open today" → `__rbDayOpen(todayISO, {from:'home'})` |
| — | nothing matches | static `_RB_FTU_ECHO` | — |

- **Render**: `.dash-echo` gets `text` (serif-italic span for the look name, `_waEsc` everything) followed by one inline text door `<button type="button" class="rb-echo-door">{doorLabel} →</button>` (ink-faint, underline on hover, `.rb-pill` is too heavy here — the greeting line is prose). Never a filled button: Style me stays the one ink fill.
- **When it runs**: called from `_lkHomeSync` (which already runs after `_waSyncCounts`, `_lkLoad`, the rail's paint and every save/delete), plus once from `_lkModelEnsure`'s deferred callback (the model id lands late). Idempotent — repaint only when `key` changes.
- **Stand-down**: hidden with the rest of the masthead while a result overlay is open (nothing to do — the echo is under the overlay). In `zero` mode the styled card's echo wins.
- **Telemetry**: `_rbTrack('next_line_shown', {rule})` on a key change; `_rbTrack('next_line_tapped', {rule})` on the door.

### 1.2 The Filed card's forward line

- **Where it lands**: the **key-piece page** (`#kp-result-page` — the "{piece}, worn three ways" three-up, reached from Inspiration's card or the styled card's See the full looks). Not the homepage, not the Inspiration index. Specifically the Filed card that replaces the in-situ composer once she saves a built way: `_kpBuildSaved(l)` (~line 7291 CSS, the `.kp-build-filed` card), which currently prints name · "is in your Lookbook" · the wishlist line when proposals travelled.
- **Add one `.sub` line after the wishlist line**, derived:
  - no model, proposals ≥1: "Build your model and she'll wear it. Photograph the {n} pieces that aren't yours yet and it's all yours."
  - no model, no proposals: "Build your model and she'll wear it."
  - model, proposals ≥1: "{n} of these aren't yours yet — photograph yours and Robes swaps them in."
  - model, no proposals: nothing.
- No new CTA on the card (Open the look stays the one door). The line plants Session 2; slice 2's home door and slice 6's email do the pulling. `inspiration_smoke` pins the line's presence per state (the smoke already renders the Filed state).

### 1.3 Retire the START HERE guide band (Annie, 18 Sep)

- **Why**: on the first landing the kp page carries three ink fills — the band's BUILD A LOOK ↓ (which only scrolls to card 01), card 01's own BUILD THIS LOOK (filled by `kp-guide-on .kp-build-first`), and the NO MODEL YET band's BUILD YOUR MODEL. The page's rule is one commitment. Since the 16 Sep three-up (image-led cards, each with "See it piece by piece — what's yours, what would finish it." under the title) the page explains itself; the band's sentence and its Home dashboard link duplicate the cards and the `‹ Inspiration` return band.
- **Remove**: `#kp-guide-band` and its render branch in `__kpRenderResult` (`kpGuide = !kpDaily && !_kpGuideDone()`, ~6915), `__kpGuideClose` / `__kpGuideBuild` / `__kpGuideHome`, the band's CSS (~6900–6906), and the `rb_kp_guide_done__<uid>` flag (`_kpGuideDone` / `_kpGuideDismiss` — nothing else reads it; leave the stale localStorage keys alone).
- **Keep, re-homed**: card 01 filled while nothing is built. Today that treatment rides `#kp-result-page.kp-guide-on .kp-build-first`; make it the default — `.kp-build-first` is ink whenever `_kpBuiltLookId(i)` resolves for no way and the page is the style track (never dress-me), and drops to the outline the moment any way is built. No class toggle, no flag.
- **Demote the model band's button on a first-session account** (`_kpModelBandSync`, ~7467): when `_waItems.length ≤ 1` and no model, `.rb-lkm-build` renders as a `.rb-pill` hairline instead of the ink fill, so card 01 is the page's one ink. From the second piece on, the band keeps its fill (she has seen the three-up before; the model is now the ask). This is the same state slice 2.4 keys its "Next time, build your model" copy on — do 2.4's copy here too if slice 2 has not shipped first.
- **Harness**: `ftue_harness`'s guide-band block and `inspiration_smoke`'s band pins are rewritten to assert the band is absent, card 01 is the one ink fill on a fresh account, and the model band's button is a hairline at ≤1 piece.

### 1.4 Instrumentation (PostHog + the `events` table)

| Event | Where | Props |
|---|---|---|
| `model_filed` | `stylenotes.html` `mvFile()` — the page has `__rbPH` but no `_rbTrack`; capture via `window.__rbPH(p => p.capture(...))` AND insert into `events` via a small local `_rbCapturePost` twin (own-insert RLS, `return=minimal`) | `{by: 'photo'|'hand', gender}` |
| `wardrobe_added` (existing) | `WA.submit` | add `batch_n` (`_waBatchTotal || 1`), `batch_i` (`_waBatchDone + 1`), `source: 'app'` |
| `wardrobe_added` | `onboarding.html` `catalogue()` after the insert | `{source: 'onboarding'}` via `__rbPH` (the page has no `_rbTrack`) |
| `next_line_shown` / `next_line_tapped` | 1.1 | `{rule}` |
| `robes_build_opened` | slice 3 | `{door: 'composer'|'home'|'next', pics}` |
| `week_walk_started` / `week_walk_step` / `week_walk_done` | slice 5 | `{days, filled, named}` |
| `lookbook_four` | slice 5 | — |
| `email_optin` | slice 6 client | `{kind}` |
| `email_sent` (server, service key) | slice 6 | `{kind, ref}` |

**PostHog funnels to define after this lands** (four insights, one per session, person = Supabase uid):
1. `wardrobe_added{source:onboarding}` → `look_generated{track:key-piece}` → `kp_build_look` → `look_created` (same day)
2. any event ≥12h after signup → `model_filed` → `piece_swapped{surface:look}`
3. `wardrobe_added{batch_n≥2}` → pieces with photos ≥5 (person prop, set in `_waSyncCounts` via `__rbPHUser`) → `robes_build_opened`
4. `look_pinned` or `diary_day_named` → `look_created` ×4 → `wear_confirmed`

**Acceptance**: `ftue_harness` gains a section booting at each rule's state and asserting the echo text + door label + that no filled button was added to the masthead; `inspiration_smoke` pins 1.2's four variants on the kp page's Filed card, the absence of the guide band, and one ink fill on the fresh three-up; a throwaway PostHog stub smoke asserts the new events fire with the props above.

---

## Slice 2 · The model door on home + landing on the look, dressed

**Why**: the model is Session 2's headline act and has no door on the home she returns to. The only home introduction (`_rbSilPrompt`) is gated at 15 pieces and points at colour/silhouette.

### 2.1 `#rb-model-door` — a slim band on home

- **Condition**: `_lkModel === null` (asked, none on file — never `undefined`) AND `_lkLooks.length ≥ 1` AND the styled card is not the hero. Retires the moment `_lkModel` resolves to an object (the `_lkModelEnsure` deferred callback re-syncs).
- **Placement**: registered in `_lkHomeSync`, sequenced by `_rbFtueOrder` directly after the prompt + rail and before the concierge band (in `look` mode: after `#rb-firstlook`). Full-bleed like the concierge band (`--rb-bleed`), but white on a hairline, not the tint — one tinted band per screen is the standing rule.
- **Anatomy** (the kp band's register, `.kp-model-band` CSS at ~7298 is the reference): the dashed figure glyph · eyebrow "Your model" · serif "Build her once, she'll wear *every look you keep.*" (pronoun via `_lkModelPro()`) · sub "Thirty seconds by hand, or two photographs." · one `.rb-pill` **Build your model** · a quiet ✕.
- **✕**: per-user localStorage `rb_model_door_off__<uid>` holding a timestamp; the band returns after 7 days while the condition still holds (a dismiss is "not now", not "never").
- **Door**: `window.__rbModelGo(from)` — new, beside `__lkBuildModel`. Unlike `__lkBuildModel` it parks no draft: sets `sessionStorage.rb_model_return = 'home'` and navigates to `/stylenotes`. `stylenotes.html` already reads `rb_model_return` to label its back pill (line ~1300); add the `'home'` case → pill reads "‹ Home", CTA reads "Build a look" as today.
- **Telemetry**: `_rbTrack('model_door_shown')` once per session, `model_door_tapped`, `model_door_dismissed`.

### 2.2 The model page lands on the Session-1 look, dressed

- **Where**: `stylenotes.html`'s `#mv-build` click (line ~1309) and the dashboard boot's `rb_model_build` handler (`dashboard-personalize.js` ~169).
- **Rule**: when the model is filed (`st.model.kept`) and the return is `'home'` or unset, write `sessionStorage.rb_model_open_look = '1'` alongside `rb_model_build`. The boot handler, after `_lkLoad` lands: pick the newest saved look with ≥1 piece or proposal and no `render_url`; if one exists open it — `__lkOpen(id, {from:{label:'Home', go: () => __rbNavGo('home')}})` — instead of revealing the prompt. `_avRenderKick` already fires on a look-detail open, so the page shows "Creating her frame…" and repaints when the photograph lands.
- **Verify** `_avRenderKick`'s piece floor: the composer renders 1–12 owned+proposed pieces; if the kick still requires ≥2 *owned* pieces, lower it to the render endpoint's own rule (1–12, proposals ride with stills) so a one-piece Session-1 look renders. Harness-pin it.
- **No candidate look** (every look already rendered, or none): fall through to today's behaviour (reveal + focus the prompt).

### 2.3 The by-hand path leads when nothing is read

- **Where**: `stylenotes.html` page head note (today "Two photographs. One model.").
- When no photograph has been read and no model is filed: note reads "Shape her by hand in thirty seconds. Add photographs whenever you like." and the "Or shape her by hand" rows stand open (they already do). Once anything is read, today's line returns. **Founder copy decision** — the current line is the designed one.

### 2.4 Session-1 planting (small, optional)

- On the kp page's NO MODEL YET band (`_kpModelBandSync`) when `_waItems.length ≤ 1` and no model: the button reads "Next time, build your model" and, on tap, sets `localStorage.rb_model_intent__<uid> = 1` + toasts "Noted — the door's on your home page." instead of leaving. 2.1's band then leads with "You said next time." as its eyebrow when the flag is set. Skip this if it reads as friction in review; the band and the email carry Session 2 without it.

**Acceptance**: `ftue_harness` — the band renders only at `null` model + ≥1 look, sits before the concierge band, retires on a model id, returns after the 7-day dismiss window; `stylenotes_model_harness` — `rb_model_return='home'` labels the pill, filing writes `rb_model_open_look`; `looks_harness` — the boot with `rb_model_open_look` opens the newest unrendered look with `‹ Home` and a kick in flight.

---

## Slice 3 · Robes builds from yours at five + the ladder retune

**Why**: the Session-3 "Auto-Look Generator" is `__lkRobesBuild` (line ~14100): a deterministic pick of her photographed pieces, gaps proposed via `/api/alternates` with stills, a note via `/api/lookbuild/note`, nothing saved until she does. It lost its door on 3 Sep at zero pieces. The roadmap wants it as the arrival at five.

### 3.1 The door, gated on photographed pieces

- **Constant**: `_LK_ROBES_AT = 5`, read from `_MS_UNLOCKS` (key `robes`, below) so there is one ladder.
- **Condition**: `_waItems.filter(w => _pdHttp(w.image_url)).length ≥ _LK_ROBES_AT` (the same filter `_lkBuildCandidates` applies — Robes never hangs a piece she hasn't photographed).
- **Where it renders**:
  - the composer footer (`_lkNewHtml`, the retired `.rb-lk-robesdoor` slot — CSS survives) as a `.rb-pill`: with a model "Robes dresses her from what you've filed", without "Robes builds one from what you've filed" → `window.__lkRobesBuild({door:'composer'})`;
  - the home BUILD YOUR OWN row head (`#rb-ftu-rows`, the `build` row) as the same pill beside the arrow, opening the row and running the build;
  - slice 1's `robes` next line.
- Below the threshold nothing renders anywhere — the 3 Sep call ("the prompt is where Robes builds, with more to go on") still holds at zero.
- `__lkRobesBuild` gains `opts.door` for telemetry (`robes_build_opened {door, pics}`); the existing `look_robes_door` event is superseded — remove it.
- A look saved from a build carries `source: 'robes-build'` (today `__lkSave` writes `source:'robes'` for a frame; check the two do not collide — a build that also carries a frame should read `robes-build`).

### 3.2 The ladder: 5 / 10 / 15

- `_MS_UNLOCKS` (line ~751) becomes:
  `[{at:5, key:'robes', label:'Robes builds', cap:'Builds from yours', pos:25}, {at:10, key:'travel', label:'Travel edit', cap:'Packs your trips', pos:50}, {at:15, key:'styleNotes', label:'Style notes', cap:'Knows your taste', pos:78}]`
- Grep every `_msUnlocked(` and `_MS_UNLOCKS[0]` consumer (`_rbGateConcierge`, `_msHeadline`, `_rbFtueOrder`'s `n < _MS_UNLOCKS[0].at` branch at ~918, `_rbSilPrompt` reads the last entry) and confirm each still means what it did. The `daily` key goes: the daily track never gated, and nothing should read it.
- The learning-meter rules survive unchanged: no denominator, no lock language, the track never fills to 100% (15 → 78%).
- The below-15 add toast (`WA.submit`) gains one variant at exactly 5 photographed pieces: "Five pieces filed. Robes can build a look from yours now."

### 3.3 The concierge meter's retirement

- `_rbConciergeDone()` retires the band (and the meter inside it) after one daily + one travel edit. Decide one owner of progression: recommended — the band retires on `_rbConciergeDone() || pics ≥ 15`, and the meter (`#rb-svc-learn`) stops rendering once `pics ≥ 15` even while the band stands. Founder decision; default to the recommendation.

**Acceptance**: `looks_harness` — `boot({pics:4})` renders no door anywhere; `boot({pics:5})` renders the composer pill and the row pill, the tap runs the owned build (the 04b path), Save writes `source:'robes-build'`; `ftue_harness` — the meter's ticks read 5/10/15 at the new `pos` values, the fill interpolates through them, the 5-piece toast fires once.

---

## Slice 4 · Gap-led batch: the add flow takes a brief

**Why**: "upload 3 staples" and "upload 5 items" are numbers without reasons. Her saved looks already know exactly which categories she borrows (each proposal row carries `chip`/`cats` and a role). Ask for those.

### 4.1 `WA.open({ brief })`

- **Shape**: `brief = { lookId, cats: ['Outerwear','Shoes','Bags'], names: ['a jacket','shoes','a bag'] }` derived by `_rbLookGaps(look)` from `look.proposals` rows not `saved`/owned (category from `cats[0]`, the name from the proposal's `chip` or `_dlSlot(it).l` lowercased with an article).
- **Step 1** (`_showStep1`, ~1772): when a brief is set, the dropzone header line reads "Looking for: a jacket · shoes · a bag" as `.rb-pill` chips above "Drop in as many as you like"; the h reads "Make *{look name}* yours." Nothing else changes — batch, camera, library inputs all as today.
- **After each filed piece** (`WA.submit`'s success tail, before `_waBatchAdvance`): if `_waForm.brief` and the new row's legacy `category` matches an open proposal's category on the look → swap it in through the saved-look path (`__lkPropSwapApply`'s internals: proposal off the rack, piece into `look_pieces` with the proposal's role, `_lkPatch`), toast "{label} is in *{look}* now.", and strike the chip. A piece matching no open proposal files normally.
- **Doors**:
  - the saved look page's rack head, when ≥1 proposal is open: a `.rb-pill` **Photograph yours** (beside Edit & resave) → `window.__rbFillOpen(lookId)` → `WA.open({brief})`;
  - slice 1's `finish` next line;
  - the deep link `/lookbook?open=<id>&fill=1` (the boot already resolves `?d=` and `/piece/:id`; add this one) — slice 6's `borrowing` email lands here.
- `_waForm.brief` clears on `WA.close` like the batch queue.

### 4.2 The five-piece ask, gap-led

- `_rbGapCategories(n)`: the top `n` categories by count across every open proposal in `_lkLooks`, as plain names ("shoes", "a coat").
- The learning-meter caption (`#rb-svc-learn`'s one line, today "Every piece you file replaces a borrowed one in the looks below.") reads, when gaps exist and pics < 5: "Your looks keep borrowing {shoes and a coat}. Five photos and Robes stops borrowing." Otherwise today's line. Tapping the filed row's CTA (`_wtrkOpenAdd`) with gaps present opens `WA.open({brief})` for the newest look with gaps.
- The O7 first-look row's cap (~14698) gets the same treatment when the look has proposals.

**Acceptance**: `addflow_harness` — step 1 with a brief shows the chips and the look name, a filed piece in a briefed category lands on the look (the harness seeds a look with proposals) and strikes its chip, an unbriefed category files normally, `WA.close` clears the brief; `looks_harness` — the rack-head pill renders only with open proposals and opens the add modal briefed; `ftue_harness` — the meter caption reads the gap sentence at pics < 5 with proposals seeded.

---

## Slice 5 · Plan the week walk + the four-looks arrival

**Why**: the Diary, the rail and the picker are the planner. What Session 4 lacks is a way to dress seven days in one gesture, and a named moment at four looks.

### 5.1 `__rbWeekPlan()` — the walk

- **Door**: the rail head (`#rb-rail`, ~23468) gains a `.rb-pill` **Plan the week** beside "Open the diary →". Renders only when at least one of the next seven days is empty. Also the Diary list head's action cluster (`_dyHeadHtml`, list mode) as the same pill.
- **Walk**: `dates` = the next seven local ISO dates from tomorrow (today included when it is empty). Open `__mvWear(dates[0], { walk: { i: 0, dates } })`.
- **Picker in walk mode** (`_mvPkPaint`, state on `_mvPk.walk`): the eyebrow reads "Add a look · {date} · day 1 of 7"; the head keeps the day's name field (the walk's cheapest act is naming — `_pdDayName` writes a `day` row and the diary's invitation becomes a named card); the two doors and the Your-looks grid as today; footer gains **Skip this day** and **Done for now**. A pick (`__mvWearPick`), a name commit, or Skip advances to `dates[i+1]` in place (no close/reopen flicker — repaint the same modal); the last day closes and toasts "{n} days dressed, {m} named." The rail repaints (`_rbRailRepaint`).
- **"Robes styles one" in the walk** closes the picker and scopes the prompt as today — that is a generation, it cannot run in the background, and the draft needs her name and Save. The walk ends there deliberately; the toast reads "The walk stops here — Robes is dressing {weekday}. Plan the rest from the rail." (Honest over clever.)
- Escape / scrim tap ends the walk quietly.
- **Telemetry**: `week_walk_started`, `week_walk_step {action: pick|name|skip|robes}`, `week_walk_done {days, filled, named}`.

### 5.2 Four looks — say it once

- In `_lkPaint`'s masthead (`ALL LOOKS · N looks`), the first time `streamN` reaches 4 for this user (localStorage `rb_lk_four__<uid>`), the count line reads "4 looks · sort and Refine are yours now" for that paint only, and `lookbook_four` fires. Sort/Refine already come live at `streamN >= 4` (~11381); nothing else changes.

**Acceptance**: `diary_harness` — the pill renders with empty days ahead and not with a full week; a walk over seven days with two picks, one name, four skips ends on the toast and leaves two pins + one `day` row; Robes-styles-one ends the walk with the honest toast; `looks_harness` — the fourth save prints the arrival line once.

---

## Slice 6 · The re-engagement channel

**Why**: verified across server and every page — no product email, no push, no service worker, no A2HS nudge, no time-aware home state. A four-session funnel with one session of pull. This is the one genuine build in the brief.

### 6.1 Provider and plumbing (server)

- **Resend** (`resend` is already an optional dependency in `package.json` and unused in `server.js`). Env: `RESEND_API_KEY`, `EMAIL_FROM` (`Robes <hello@byrobes.com>` — verify the domain in Resend: SPF + DKIM records on byrobes.com, both Railway services share the key). Absent key → every send is a silent no-op and `/api/health` reports `email: false` (the `generation_log` pattern).
- `sendMail({to, subject, html, text, kind, ref, userId})` in `server.js`: idempotency first (6.2), then Resend, then an `email_sent` row into `events` via the service key. Every mail carries `List-Unsubscribe` + a footer link to `/api/notify/unsub?t=<token>` (HMAC of uid + kind, secret `NOTIFY_SECRET`) that flips the relevant pref off and lands on a one-line page "Done — Robes won't email you about this." (no login needed).
- **Scheduler**: the server is one Railway instance; an in-process `setInterval` every 10 minutes running `notifyTick()` is enough at beta scale (the file already runs three intervals). Every rule is a service-key REST query for candidates + the idempotent insert; a crash mid-tick is harmless because sends are recorded before they happen. If Railway ever runs two instances, move the tick to Railway's cron — the tick is already a pure function.

### 6.2 Migration 22 — `supabase/notifications_migration.sql`

- `profiles.notification_prefs jsonb not null default '{}'` — shape `{looks_ready: bool, nudges: bool, morning: bool, morning_hour: 7, timezone: 'Europe/Dublin'}`. Missing keys read as `looks_ready: true` (transactional — she asked for the looks), `nudges: null` (not asked yet), `morning: false` (opt-in only).
- `notifications (id, user_id, kind text, ref text, sent_at timestamptz default now(), unique(user_id, kind, ref))` — the idempotency ledger; service-key writes only, own-read + admin-read RLS.
- **Timezone**: the dashboard boot writes `Intl.DateTimeFormat().resolvedOptions().timeZone` into `notification_prefs.timezone` once when empty (a merge PATCH; strip-and-retry on PGRST204 → the whole slice stands down client-side until the migration runs).
- Update `/privacy` (a "Emails from Robes" section: what is sent, when, how to stop) — the PostHog precedent.

### 6.3 The Session-1 ask (client)

- **Where**: the styled card's loading state (`_rbOnboardHandoff`, the three pulsing tiles) — the frames take 30–90s and she may leave. Under the tiles, one line + one text door: "Robes is composing your three looks. **Email me when they're ready →**" — the tap PATCHes `notification_prefs.looks_ready = true, nudges = true` (one consent covers the sequence; the copy under the door says so: "and the odd note when your wardrobe's ready for more"), swaps to "✓ Robes will email you.", fires `email_optin {kind:'looks_ready'}`. If the frames land before she taps, the line retires with the loading state.
- **Account details modal**: a **Emails** section — three switches (When my looks are ready / Notes from Robes / A morning line on days I've planned, with an hour select 6–10) writing `notification_prefs`. The morning switch is where `morning: true` is set — nowhere else.

### 6.4 The sequence — state-keyed, one rule per session

Every rule: a candidate query, an earliest-send offset from signup (`profiles.created_at`), a hard cap of one mail per user per calendar day, never the same `kind` twice, `nudges === true` required for every kind but `looks_ready`.

| kind | Condition (service-key query) | Earliest | Subject | Body | CTA → deep link |
|---|---|---|---|---|---|
| `looks_ready` | the user's newest `key-piece` lookbook row has 3 http `generatedImages`; `looks_ready !== false`; no `looks_ready` row for that item id (`ref`) | on the tick after they land | "Your three looks are ready." | "{Piece}, worn three ways. Pick one and Robes builds it around what's yours." + the three frames | "See the looks" → `/inspiration` (the kp entry opens from there; or `/inspiration?open=<id>`, add the param) |
| `look_waiting` | ≥1 `looks` row, `profiles.avatar_id` null, no `model_filed` event | +24h | "She'd wear it." | "*{Look}* is in your Lookbook. Build your model once and she wears every look you keep." + the look's mosaic or frame | "Build your model" → `/stylenotes?from=email` (sets `rb_model_return='home'` on land) |
| `borrowing` | a `looks` row with ≥2 open proposals; pieces with photos < 5 | +72h | "Robes is borrowing {three} things." | "*{Look}* borrows {a jacket, trousers and shoes}. Photograph yours and the look is entirely yours." | "Photograph them" → `/lookbook?open=<id>&fill=1` (slice 4) |
| `five` | pieces with photos ≥ 5, no `robes_build_opened` event | +24h after the 5th | "Robes can build from yours now." | "Five pieces filed. Open the composer and let Robes build one from what you own." | "Let Robes build one" → `/lookbook?new=1&robes=1` (slice 3 door armed on land) |
| `week_empty` | no `planned_days` row in the next 7 days; ≥1 look | +7d, then at most every 14d (`ref` = the ISO week) | "Nothing planned this week." | "Name a day and Robes dresses it. The diary keeps the week." | "Open the diary" → `/diary` |

Templates: one shared HTML shell (cream ground, Cormorant heading via a web-safe serif fallback, one image at most, one ink CTA, the footer). Plain-text alternative always. No tracking pixels — `email_sent` and the deep link's `?from=email` param (captured as a PostHog prop on land) are the measurement.

### 6.5 The morning cue

- **Rule**: for each user with `morning === true`, once per local date at `morning_hour` (the tick compares against `timezone`), when `planned_days` holds a row for that date. `ref` = the ISO date. Skipped silently when the day is empty — the cue only ever repeats what she wrote.
- **Subject**: "{Weekday} · {day title}" (the `day` row's activity, else the pinned look's name). **Body**: the look's name and its frame (`looks.render_url` → `photo_url` → the pieces' first photo), the weather line only if a forecast was filed with the look (never fetched fresh — Robes never asserts her weather in mail). One CTA "Open the day" → `/dashboard?d=YYYY-MM-DD` (exists). Under it, quietly: "Wore it? The day page takes it."
- **Not in this slice**: a one-tap "Wore it" from the mail (needs a tokenised write route — phase 2), web push (needs a service worker, VAPID keys, and an installed PWA on iOS — phase 2, only if email opt-in reads high and morning open rates read low).

### 6.6 Admin

- `/admin` user detail gains an **Emails** list (kind · sent_at · ref) from `notifications`, and the Generation-health-style 7-day aggregate per kind. Admin-read RLS on `notifications` is in the migration.

**Acceptance**: `node --check server.js`; a throwaway server smoke with a stubbed Resend + stubbed Supabase REST that runs `notifyTick()` against fixtures for each rule and asserts one send per candidate, no second send on a re-tick, the daily cap, the `nudges` gate, and the morning cue firing at the right local hour across two timezones; `ftue_harness` — the ask renders under the loading tiles and retires when frames land; the account modal writes the prefs shape; the unsub route flips the pref with a valid token and 400s on a bad one.

---

## Slice 7 · Onboarding re-sequence (founder call first)

**Why**: the spark sits five screens deep (splash → intro → name → Style → piece). The August audit's 1.1 (three dark screens) is still open; the Style step (1 Sep) added a taste question before any value.

### 7.1 Fold the name into the intro

- `onboarding.html`: when `first_name` resolves (profile row, else auth metadata — the boot already does this at ~1319), `renderIntro`'s CTA reads "Let's go, {Name}" with a quiet "Not {Name}?" link → `renderName`. The name stage is skipped otherwise. `STEPS` unchanged.

### 7.2 Where Style lives — two options, pick one

**Option A (recommended) — piece first, Style while the looks compose.** `STEPS = ['keypiece', 'style']`. The piece step is unchanged and `prefireStyle()` still fires the moment the piece files. The Style step then reads "While Robes composes your three looks — where does your style sit?" and fills the 30–90s imagery wait with the archetype cards (icons stay behind the hairline). Skip discipline as today. Cost: the very first three ways are steered by DNA and the piece only, not by icons (the prefire runs before the step); every generation after is steered. The wait becomes a screen with a job.

**Option B — Style moves to the model page.** `STEPS = ['keypiece']`; the archetype grid + icons field mount on `/stylenotes` above "Or shape her by hand", writing the same `style_dna.style_archetypes` / `style_icons`. Onboarding is name → piece → dashboard. Cost: the first three ways and everything until Session 2 run without archetypes or icons; Session 2 gets heavier.

Either way: the intro's promise line (August 1.2, "Robes builds your style notes") is re-worded to the real payoff — "One piece. Three ways to wear it." — and the CUT ledger row falls back to "—" when no silhouette lands (August 1.4).

**Acceptance**: `onboarding_harness` rewritten for the chosen order (both breakpoints, skip discipline on every step, the name-skip with and without a known name, the prefire still firing on the piece).

---

## Copy sheet

All strings in one place, in the Robes register (no "AI", declarative, warm; loading and empty states may delight). A build session takes these verbatim unless the founder edits them here first.

| Surface | String |
|---|---|
| Next line · model | Build your model and she'll wear *{look}*. — **Build your model →** |
| Next line · finish | *{look}* borrows {n} pieces. Photograph yours and it's all yours. — **Photograph them →** |
| Next line · five | {n} more piece{s} and Robes builds a look from yours alone. — **Add pieces →** |
| Next line · robes | Five pieces filed. Robes can build from yours now. — **Let Robes build one →** |
| Next line · week | Nothing planned this week. Name a day and Robes dresses it. — **Open the diary →** |
| Next line · wear | Today is dressed. Tap the day when you've worn it. — **Open today →** |
| Filed card · no model, gaps | Build your model and she'll wear it. Photograph the {n} pieces that aren't yours yet and it's all yours. |
| Filed card · model, gaps | {n} of these aren't yours yet — photograph yours and Robes swaps them in. |
| Model door | YOUR MODEL · Build her once, she'll wear *every look you keep.* · Thirty seconds by hand, or two photographs. · **Build your model** |
| Model page · nothing read | Shape her by hand in thirty seconds. Add photographs whenever you like. |
| kp band · first session | **Next time, build your model** → toast "Noted — the door's on your home page." |
| Composer door · model | Robes dresses her from what you've filed |
| Composer door · no model | Robes builds one from what you've filed |
| Toast · fifth photographed piece | Five pieces filed. Robes can build a look from yours now. |
| Ladder caps | Builds from yours · Packs your trips · Knows your taste |
| Meter caption · gaps | Your looks keep borrowing {shoes and a coat}. Five photos and Robes stops borrowing. |
| Add step 1 · briefed | Make *{look}* yours. · Looking for: {a jacket · shoes · a bag} |
| Toast · piece swapped in | {Piece} is in *{look}* now. |
| Rack head pill | Photograph yours |
| Rail head pill | Plan the week |
| Walk eyebrow | Add a look · {date} · day {i} of 7 |
| Walk footer | Skip this day · Done for now |
| Walk done toast | {n} days dressed, {m} named. |
| Walk · Robes styles one | The walk stops here — Robes is dressing {weekday}. Plan the rest from the rail. |
| Lookbook · four | 4 looks · sort and Refine are yours now |
| Styled card ask | Robes is composing your three looks. **Email me when they're ready →** · and the odd note when your wardrobe's ready for more → ✓ Robes will email you. |
| Account · Emails | When my looks are ready · Notes from Robes · A morning line on days I've planned (at {7}) |
| Mail · looks_ready | Your three looks are ready. / {Piece}, worn three ways. Pick one and Robes builds it around what's yours. / See the looks |
| Mail · look_waiting | She'd wear it. / *{Look}* is in your Lookbook. Build your model once and she wears every look you keep. / Build your model |
| Mail · borrowing | Robes is borrowing {three} things. / *{Look}* borrows {a jacket, trousers and shoes}. Photograph yours and the look is entirely yours. / Photograph them |
| Mail · five | Robes can build from yours now. / Five pieces filed. Open the composer and let Robes build one from what you own. / Let Robes build one |
| Mail · week_empty | Nothing planned this week. / Name a day and Robes dresses it. The diary keeps the week. / Open the diary |
| Mail · morning | {Weekday} · {day title} / *{Look}* / Open the day · Wore it? The day page takes it. |
| Unsub page | Done — Robes won't email you about this. |
| Intro promise | One piece. Three ways to wear it. |
| Style step (Option A) | While Robes composes your three looks — where does your style sit? |

Voice checks applied: every mail repeats only what she gave Robes (her piece, her look, her day name); no line names a gap before naming what she owns; no scarcity, no "you need"; the morning cue never fetches weather it can't stand over.

---

## Open decisions (before a session starts)

1. **Slice 7's order** — Option A (Style fills the imagery wait) or B (Style moves to the model page). A is recommended; both undo the 1 Sep archetype-first placement, which was a deliberate design.
2. **The model door's form** — the slim white band (specified) versus a fourth concierge card. The band is recommended: the band's grid is three cards and its retire condition is unrelated to the model.
3. **Progression's owner** (3.3) — the meter retires at 15 pieces regardless of the band. Default to yes.
4. **Consent scope** (6.3) — one tap on the styled card covers the looks-ready mail AND the four nudges (stated in the sub-line), the morning cue is a separate opt-in in Account details. Confirm this reading of GDPR is acceptable for the beta; the privacy page is updated either way.
5. **`EMAIL_FROM` and the Resend domain** — `hello@byrobes.com` needs SPF/DKIM on the domain before slice 6 can send from beta.
6. **The model page's head line** (2.3) — keep "Two photographs. One model." or lead by hand when nothing is read.
7. **The START HERE band** (1.3) — retired in slice 1 as recommended on 18 Sep; strike 1.3 if it should stay.

---

## Not in this brief

- Web push / a service worker / A2HS (phase 2 of slice 6, gated on email metrics).
- One-tap "Wore it" from the morning mail (needs a tokenised write route).
- A weekly batch engine — deleted by ADR-001; the walk in slice 5 is the planner.
- Any change to the kp three-up, the composer's canvas, the Diary's anatomy, the piece page, or the travel edit.
- Sub-5 category taxonomy UI for "upload 5 items" — slice 4's brief uses the categories the looks already store.
