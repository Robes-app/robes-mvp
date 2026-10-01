# The look prompt — one box on every look, and the draft it edits (build brief)

**Date**: 2026-10-01 · **Branch**: `beta` · **Status**: phases 1 and 2 built (2026-10-01); phase 3 pending
**Supersedes**: slice C of `docs/style-memory-brief.md` as built on 2026-09-30 (the ask sheet). Slices A and B stand; D, E and F are unchanged.
**Sources**: the beta feedback corpus (Sinead's and Liberty's 👎 notes, 14–28 Sep), `Look_Prompt_Spec.dc.html` (1 Oct) and `Home.dc.html` (1 Oct) from Annie's Claude Design project.

## What the test users are telling us

Sinead's and Liberty's 👎 notes are not feedback. They are instructions to a stylist, typed into the only words field a look had. Sorted, they are five kinds:

| Kind | Her words, verbatim | How many |
|---|---|---|
| **A clear swap** | "Do not give me silver shoes with leather blazer again" · "I would've either gone all black, or else changed the blazer" · "Bag isn't working" | 5 |
| **How it's worn** | "Tuck the jumper in" · "Show the boots under the jeans, not over" · "Always put a sock matching the trousers … barefoot only with long trousers" | 3 |
| **A standing rule** | "Remember that I don't like grey" · "Can you build friction and texture into everything you suggest to me in future?" · "One thing to draw your eye to, not two" | 4 |
| **A context correction** | "Too warm for the day" · "White trousers are not a good choice for travelling" · "Too dressy, shoes not comfortable for lots of walking" · "Not casual" (×4) | 10 |
| **A diagnosis question** | "Are you not showing more colour cos I haven't uploaded enough colour?" | 1 |

Liberty sent the context correction eight times in fifteen minutes. Each restyle ignored the last one, because her words never reached the prompt (slice B now carries them) and because every attempt was a fresh unsaved generation that died on navigation. She wanted to iterate on ONE look and had nowhere to hold it.

The ask sheet (slice C, 30 Sep) answers none of these well: its chips are words nobody used (Warmer · Softer · Sharper · More me · Less polite); every send regenerates the whole look through the generator, so a two-word swap costs a full regen plus image jobs; and she cannot see what changed. The Look Prompt Spec reads the corpus correctly — its seven-intent order IS the corpus sorted — and this brief adopts it, with the adjustments below.

## Two things that change

1. **The draft is an entity.** A draft is a look Robes composed or she started that she has not yet saved. There is one at a time, it survives navigation, and it is the thing the box edits. Today "draft" is three unrelated ephemeral states (the composer's build state, a saved look's edit draft `_lkDraft`, the trip look's transient `_lkTripDraft`), and the first of them dies the moment she leaves the page unless the model trip parked it.
2. **The box replaces the sheet.** One component on every look, titled by the look's own name, no chips, one field; Robes answers in sentences; each Enter changes the look behind; "put it back" reverses; a rule is filed; opened off a look it makes a new one. One endpoint returns an EDIT, never a new look.

**Governing rules** (the style-memory brief's, restated, plus three of this brief's own):

- Nothing is written until she saves (rule 04). A draft is held, never a row; the box's edits land on the draft; Save is the surface's own Save.
- One ink fill per screen. Save (or Update) stays the one ink; the send is ink only while the field holds text.
- Robes in the third person, never "I", never "AI". Pieces named as she would ("the grey merino"), never role names in the box. Lead with "Done." on an applied change. No exclamation marks.
- Every sent line is a verdict: it lands in the memory (slice B, `k:'ask'`) with the look it was about.
- A vague ask never changes the look. Robes writes its wording into her field; Enter applies exactly what the draft names. Never a black box.
- **The thread is not a chat.** It is scoped to one look and one open, dropped on close, never persisted, never shown anywhere else. The style-memory brief's "no chat" rule holds: there is no transcript, no persona, no surface that lists what she said.
- `var` for state read before its declaration; strip-and-retry on PGRST204; the harness green and a dated CLAUDE.md delta per phase.

---

## Phase 1 · The draft

**What it is.** One standing draft per user: the look on the composer (a prompted look, a kp way built in situ, a Robes build, a hand-built look, or a look opened from Home/Diary in the box's new-look mode) held across navigation until she saves it or lets it go.

**Why one, local.** Persisting drafts as `looks` rows with a status column would fill the Lookbook with Robes' unsaved attempts (Liberty would have fifteen), and the wears, Diary and trip code all assume a `looks` row is real. One standing draft is enough precisely because the box turns fifteen regenerations into fifteen edits on one draft. The two multi-draft cases already persist elsewhere: a key piece's three ways (`lookbook_items`) and a Robes-styled trip look (the trip blob).

**Data.** `localStorage rb_lk_draft__<uid>` (per user — the `__anon` lesson), generalising the model-trip park (`rb_lk_draft` in sessionStorage, `__lkDraftRestore`). The same shape, plus the box's two fields:

```json
{ "v": 2, "at": "2026-10-01T…", "home": false, "kp": null,
  "rows": [...], "seq": 7, "name": "Harbour Dinner", "tags": null, "roles": {}, "photo": null,
  "shop": [...], "shopImgs": [...], "note": "...", "palette": [...],
  "day": "2026-10-03", "src": { "kind": "daily", "eyebrow": "", "prompt": "a chic outfit for a date night" },
  "was":    { "3": { "id": "w-12", "name": "White wide-leg trouser" } },
  "styled": { "0": "tucked at the front" } }
```

`was` is keyed by rack row and holds the original piece per changed row — it drives "Just changed · was the white wide-leg trouser" and put-back. `styled` is the how-it's-worn note per row. Both are dropped at Save (`styled` persists onto the saved look in phase 2 once migration 24 runs). `src` carries enough to re-run Try another after a reload (the prompt and its options), where today `_lkDraftSrc.again` is a closure that cannot survive one.

**Writes.** `_lkDraftPark()` writes on every composer mutation (debounced 400ms) and on `pagehide`; `_lkDraftDrop()` on Save, Discard and the let-it-go confirm. The existing `rb_lk_draft` sessionStorage park and `rb_model_return` keep working — the model trip is one more navigation the draft now survives on its own.

**Surfaces.** Exactly two, both quiet:
- The home next line gains **`draft`**, first in the order (a thing she started outranks a thing Robes noticed): "*{name}* is waiting, unsaved." · **Open it** → restores the draft on the composer (`__lkDraftRestore(d, 'lookbook')`).
- The Lookbook grid leads with a dashed **Draft** tile (the add-card register, never a look card): the mosaic of the draft's owned pieces, the name, "Draft · not saved" → the same restore. The composer's own masthead meta reads **"Draft · not saved yet"**.

**Let it go.** Starting a NEW generation or a new hand-built look while a draft stands asks once — `_rbConfirmDelete('Let the draft go?', {sub: '{name} isn't saved. A new look replaces it.', yes: 'Let it go'})` — the kp builder's Back confirm. A reopen of the SAME draft never asks. The composer's Discard (new; a quiet text door beside Try another) drops it with the same confirm.

**Save** is unchanged: `__lkSave` → `_lkCreate` → the row; `_lkDraftDrop()` after. A draft with a `day` saves to the day as ever; the Home design's Save → date sheet is phase 3's.

**Harness.** `looks_harness`: a prompted draft survives a reload and a navigation to the wardrobe; the next line's `draft` rule and its door; the Lookbook's draft tile; the let-it-go confirm on a new generation and its cancel; Discard; Save drops the park; `was`/`styled` round-trip; the model trip still restores. `ftue_harness`: the `draft` rule leads the next line and yields when nothing is parked.

---

## Phase 2 · The box

**The component.** `_rbLookPrompt(cfg)` → `#rb-lp` (the `_rbAsk` shell's position and z-index: a bottom sheet with a grab bar ≤767px, a centred dialog on the web; scrim, × and Escape close). Anatomy per the spec's section A: the look's name (serif 24) and one meta line; the opener ("What would you change?" / "What's it for?"); the thread (Robes' sentences in serif, her turns right-aligned on a warm left rule, no labels); the reading state (three rose dots, then "reading it against the look"); a 1–3 row textarea (border warm when Robes has written into it); a 36px send, hairline until text; one helper line. No chips, no thumbnails, no role labels, no scope headings, no Keep button. Enter sends, Shift+Enter is a new line. Max 240 characters.

**One door name everywhere.** A pill-shaped field reading **"Change this look…"** under the look on the composer (under Save), the saved look page (under the card), the day page and day console (replacing ↻ Restyle this day), the trip look page, and the key-piece way sheet. Off a look (phase 3): **"A new look for…"**. The Diary's "Robes styles one" sheet (`__mvRobes`) folds into the new-look mode with the date as the meta line — one component, its five chips retired.

**One endpoint, not five.** `POST /api/look/ask` (flash, thinking 0, ~900 tokens, schema-bound, 30/min). Body:

```json
{ "mode": "look", "surface": "composer|saved|day|trip|way",
  "name": "Harbour Dinner",
  "rack":   [{ "i": 0, "name": "Cream silk shirt", "category": "Tops", "owned": true, "id": "w-3", "keep": false }, …],
  "was":    { "3": "White wide-leg trouser" },
  "styled": { "0": "tucked at the front" },
  "thread": [{ "who": "her", "text": "too dressy for walking" }, { "who": "robes", "text": "…" }],
  "text":   "put the grey merino back",
  "pool":   { "kind": "wardrobe|capsule", "items": [{ "id": "w-12", "label": "…", "category": "…", "color": "…" }] },
  "context": { "date": "2026-10-07", "weather": "rain, 12°C", "occasion": "Office, then dinner", "trip": "Lahinch" },
  "styleDna": {…}, "styleIcons": [...], "gender": "woman", "userId": "…", "genId": "…" }
```

Returns `{ "intent": "swap|back|rule|styled|clarify|draft", "reply": "Done. The dark straight jean is on the look. Say if you want anything back.", "swaps": [{ "i": 3, "to": { "id": "w-12" } | { "name": "Dark straight jean", "brand": "…", "retailer_hint": "…", "price_point": "…", "category": "Bottoms" } }], "back": [3], "styled": { "0": "tucked at the front" }, "draft": "Change the wide-leg trouser for the dark straight jean, and the grey merino for the camel cardigan", "rule": "No grey" }`.

The prompt carries the spec's intent order verbatim (new look is the client's — mode `new` never reaches this endpoint): put back → standing rule → how it's worn → clear swap → two readings → vague. A swap target is an owned piece from the pool when one fits, else a proposal with brand/retailer/price (the aspirational register `/api/daily` already uses) — **except on a trip, where the pool is the capsule alone and a missing piece is the nothing-matched state** ("There's no raincoat in the case. The nearest is the waxed jacket from day three. Change it for that?" as a draft; the look untouched). A context correction answers against `context` — the day's weather and the trip's occasion ride in the body, which is why Liberty's "too warm for the day" can be answered and not just echoed. A rule is returned as `rule` and filed by the CLIENT to `style_dna.brief.rules` with `source: 'typed'` (slice A's data; her own words need no confirm), shown as one quiet line under the thread ("Filed to your style notes."). Every turn is logged through the wrapped generateContent as ever.

**Where edits land.** On the draft (phase 1): `swaps` rewrite the rack row (an owned piece lands as a piece, a proposal as a `_lkShop` row with the still-life job as ever), `was[i]` is set the first time a row changes, `back` restores from `was`, `styled` merges. Changed rows read **"Just changed · was {old}"** in rose (the day console's `.dl-localrow` chip, generalised). On a saved look the same edits land on `_lkDraft` and the page opens EDITING on the first change with the change bar (Discard · Save as a new look · Update); on a trip look, on the trip draft / edit draft exactly as slice C landed them; on a kp way, the way's pieces are rewritten and the entry patched. The canvas re-renders her model on the settled draft through `_lkmSync`'s debounce as it does now — a `styled` note joins the render key, so a tuck re-renders once.

**`styled` on the render and on the row.** The render manifest (`/api/avatar/render`) gains a per-piece styling clause ("the knit, tucked at the front"); the daily anchor shot and `/api/style` frames take the same line. A saved look needs the notes or Save loses the tuck: **migration 24** — `looks.styling jsonb` (`{ [piece_id]: note }`), strip-and-retry on PGRST204 in `_lkPatchCloud`/`_lkPushCloud`, drafts-only until it runs.

**Retired with this phase.** `_rbAsk` and its five doors ("Adjust with words" ×3, "Style it another way", the day's ask-restyle), `refine`/`current`/`held`/`wayIndex` on `/api/daily`, `/api/style`, `/api/travel/looks`, and `POST /api/look/refine` (kept mounted one release, unreached). The thumbs stay — a rating is a signal words are not — and their note field stays for now; the box takes the words and the data says whether the note empties.

**Events.** `look_prompt_opened {surface, mode, look_id}` · `look_prompt_sent {surface, intent, chars, from_draft}` · `look_prompt_applied {surface, slots: [{i, from, to}]}` · `look_prompt_reversed {surface, slots}` · `look_prompt_rule_filed {rule_text}` · `look_prompt_closed {surface, turns, applied_count, saved}`.

**Harness.** `looks_harness`: the field under Save; the box's anatomy (name + meta, no chips, no role labels, one ink = Save); a clear swap through a stubbed endpoint updates the rack and the "Just changed" chip; a vague reply writes the draft into the field with the warm border and changes nothing; sending the draft unedited applies its swaps; put-back one row and all rows; a rule filed to the brief and the quiet line; the saved look opening editing on the first change; the thread dropped on close with the draft kept. `diary_harness`: the day page's field replaces Restyle; an empty field with a plain Enter does nothing. `travel_console_smoke`: the trip's pool is the capsule; nothing-matched leaves the look untouched. `inspiration_smoke`: one way re-written, two untouched. `notify_smoke`: the mount pin.

**Copy** (the spec's section G, UK spelling): door.look "Change this look…" · door.new "A new look for…" · opener.look "What would you change?" · opener.new "What's it for?" · placeholder.look "Restyle it, or swap the red shoes for black…" · placeholder.after "Anything else, or put something back…" · helper.look "Changes land on the look as you go. Ask for anything back." · helper.drafted "Robes wrote this from your words. Edit it, or press Enter." · reading.look "reading it against the look" · piece.changed "Just changed · was {old}" · done.none "Nothing has changed yet, so there's nothing to put back." **Rejected**: Adjust with words · Chat with Robes · Generating… · any chip.

---

## Phase 3 · Home, one door (flagged)

The Home design removes the prompt card and the three pills and docks **"A new look for…"** above the menu; a look filed for today leads the page. The direction stands; the surface is the most-tested in the app (the FTUE harness's three postures, the Diary intake flag, the typewriter), so it ships the way the Diary intake did — **behind a per-device flag** (`?prompt=box`, localStorage), default on once the harness is green.

- **Routing is the classifier's**: her words go to `/api/intent` as today. Travel opens the travel intake as the modal path (`__tvOpen` prefilled from the classifier's destination/dates/vibe) — the unfurl's host disappears with the card. A day ask lands a composer draft with the day attached (`__dlSubmit(brief, {anchorDate})`). A photo from + goes to the piece track as now. Unclear → Robes asks in the thread ("A day, a trip, or a piece?"), never a dead end.
- **Today's look leads** when the Diary holds one for today (the rail's data, `_pdSlots`): the card under the greeting, the weather line inside it, the field reading "Change today's look…" and opening titled with the look; "1 more today · Thursday ›" past the first.
- **The web has no dock**: the field sits in flow where the card was, under the greeting; ≤767px it docks 12px above the menu, rides the keyboard (`visualViewport`), and the menu slides away while the box is open (the spec's section E).
- **Save, then the date**: Save files the look first, then the existing Put-in-the-Diary sheet rises with the day her words named preselected; closing it leaves the look dated nothing. A draft opened from a Diary date skips the sheet.
- The `+` keeps its five rows. `_cbSetIntent` scaffolds, the three pills and the typewriter hold stand down under the flag; `?diary=off` still kills the intake.

**Harness.** `ftue_harness`: both flag states at every posture; the field's one slot; today's look leading; the classifier's three routes; Save → the date sheet with the named day. `nav_chrome_smoke`: the docked field and the menu never show together.

---

## Decisions taken (1 Oct)

1. One standing LOCAL draft, not persisted rows.
2. One `/api/look/ask` endpoint replacing the five refine paths.
3. `styled` persists through migration 24; drafts-only until it runs.
4. The Diary's chip sheet folds into the box's new-look mode.
5. Phase 3 behind a flag; phases 1 and 2 straight.
6. The thumbs and their note stay for now.

## What this deliberately does not build

- A persisted thread or any surface that lists what she said. The memory (slice B) holds each line as a verdict; the brief (slice A) holds the rules she filed; nothing holds the conversation.
- Multiple drafts. One, replaced on confirm.
- The spec's five fixed slots (canvas · anchor · layer · shoe · bag) as the rack's model — a look holds one to twelve pieces plus proposals, so the rack stays the ordered rows and `was` is keyed by row.
- Garment extraction from a photograph, the wishlist read, the outfit read — slices D/E, unchanged.

## Cost

A send is one flash call at ~900 tokens and no image job (the ask sheet's regen was ~4800 tokens plus up to eight stills). The canvas re-render on a settled draft is the standing one-image-per-composition lever. Migration 24 is the one schema change; everything else is jsonb on the profile or client state.
