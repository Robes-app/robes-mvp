# Style memory — Robes as the editor who remembers (build brief)

**Date**: 2026-09-30 · **Branch**: `beta` · **Status**: brief, nothing built
**Source**: Xue, *My AI Stylist* (Substack, 30 Apr 2026) — "How I built an AI that edits my wardrobe and style in real time"
**Companion briefs**: `docs/four-session-funnel-brief.md` (the funnel this rides), `docs/look-entity-brief.md` (the wear data this reads)

## What the article actually describes

Strip the tooling and Xue's method is a loop, not a feature. Six moves, in order, each depending on the one before:

| # | Xue's move | What it is, in one line | The thing that makes it work |
|---|---|---|---|
| 1 | **Feed it evidence** | Favourite vs least-favourite outfits, most-worn per category, the whole wardrobe, what she returned | Evidence is *behaviour* (worn, returned, kept) — not aspiration |
| 2 | **Read the diagnosis** | Patterns across the evidence through eight lenses (line, proportion, silhouette, colour, texture, movement, tension, vibe) | The uncomfortable finding: what she wears most is what she claims not to like |
| 3 | **Write the brief** | A personal style document — what works, hard exclusions — "specific enough to be useful, honest enough to be uncomfortable" | **She edits it.** The first draft is 60% there; the document is hers |
| 4 | **Build the memory** | The brief lives in a persistent project so every later question is answered *against it* without re-explaining | Consulted automatically, applied consistently — "institutional memory" |
| 5 | **The pause** | Every wishlist item is evaluated against the brief before purchase: duplicate? real gap or a habit? rank the list, flag redundancies | An editor with nothing to sell introduces a beat between wanting and buying |
| 6 | **Critique** | An outfit photo, a category ("here are my blazers"), a packing list — pressure-tested against the brief | Precise, not nice: "a lazy scoop neck, competing focal points" |

Two smaller mechanics matter as much as the six: the **handover document** (when the conversation runs long, summarise decisions + items reviewed + open questions and start fresh from that — memory consolidation), and the warning that runs under the whole piece: **"AI is only as good as what you give it… without your input it defaults to the norm."** A vague brief produces a vague stylist, louder.

Read for Robes, the article says one thing: **the product is the memory, not the generation.** Every screenshot of hers is the model remembering a decision she made and holding her to it. That is the exact gap between "one prompt, dressed for anything" and a stylist she comes back to.

## Where Robes stands against it — an audit of the code

Read before building. Two findings shape everything below.

**Finding 1 — there is ONE seam, and every generation already passes through it.** `styleDnaPromptBlock(styleDna, wardrobeCount, styleIcons)` in `style_dna.js` renders the profile's `style_dna` jsonb into every stylist prompt: `/api/style`, `/api/daily`, `/api/travel`, `/api/travel/looks`, `/api/alternates`, `/api/lookbuild/note`, `/api/moodboard`, the onboarding prefire. The client sends `styleDna: window.__robes_profile.style_dna` on every call. **Anything written into `style_dna` reaches every look Robes composes with no per-endpoint wiring.** The block already carries a `user_overrides` slot (`loved_colors`, `rejected_colors`, `measurements`) documented as "user corrections outrank the photo-derived profile" — with **no UI that writes it**. Xue's brief has a landing slot that has been waiting since the DNA engine shipped.

**Finding 2 — Robes collects Xue's evidence and reads none of it.** Written, never read by a prompt:

| Evidence | Where it lands today | Reaches a prompt? |
|---|---|---|
| 👍/👎 + her note on a look (kp ways, the composer, the day, the trip) | `feedback` (Supabase) + Airtable | **No** — nothing on the server reads `feedback` |
| Swaps (she rejected Robes' piece for hers) | `events.piece_swapped {surface, item}` | **No** — and the event does not record what was rejected |
| Wears (`wears.piece_ids` snapshots, `times_worn`) | `wears`, `wardrobe_items.times_worn` | Only `worn N×` on the closet line — never *which looks*, never *what she has never worn* |
| Piece notes, "Irreplaceable", fit confidence, Wear it for | `wardrobe_items.notes / sentiment / fit_confidence / occasions` | **No** — the closet payload sends id/label/category/colour/brand/image/times_worn/hero/season only |
| Style type, icons, model | `style_dna.style_archetypes(_soft)`, `style_icons`, `avatar_id` | Yes (since 2026-09-25) |
| Budget, splurge categories | `profiles.budget / splurge_categories` | **No** — `server.js` never reads `budget` |
| The wishlist | `wishlist_items` | **No** — capture only, no evaluation, never named to a generation |
| Returns / gave away | — | Not captured (`wardrobe_items` delete is silent) |

**Where the prompt lives today.** Generation: the home box (`_cbSubmit` → `_ikSubmit` → `/api/daily` | travel intake), the Diary's Robes sheet (`_mvRs`: five chips + one line → `__dlSubmit(brief, {anchorDate})`), the Inspiration modal (`/api/style`), the travel intake. Refinement on a made look: flick, Swap, Anchor, Restyle this day, Try another, Build from mine only — **verbs, never words.** A look on screen cannot be told "warmer", "less polite", "not the loafers again". `__dlRestyle` re-posts the *original* prompt with anchors; `_lkDraftSrc.again` re-runs the same generator unchanged.

**Two things the article does that Robes should NOT copy.** (1) Xue's stylist is "ruthless" because she chose that register for herself. Robes is direct and never flattering, but it never moralises and never makes her feel judged for a purchase — *wear more, buy less* is the ethos, never the sermon. The verdict copy below is honest without being cruel. (2) Xue front-loads the evidence in one sitting. Robes' onboarding deliberately does not (the 2026-09-25 split moved every taste question out). So the brief here is **drafted by Robes from behaviour and confirmed by her**, never a questionnaire.

## Annie's three ideas, mapped

| Idea | The article's move | What it becomes here |
|---|---|---|
| Collect better style notes | 1 → 3, the brief | **Slice A · In her words** — a fourth Style notes chapter: the brief, drafted from evidence, edited by her, injected first |
| Feedback woven into her history for future output | 4, the memory; the handover doc | **Slice B · The memory** — every verdict, swap and wear becomes a line Robes reads next time; Robes periodically proposes folding what it noticed into the brief |
| Robes creates and refines via prompt everywhere | 4, applied "in every conversation" | **Slice C · Robes on every surface** — one ask sheet, on the look, the day, the trip, the piece and the wishlist; words refine what is on screen |
| *(the article's remaining moves, needed for the loop to close)* | 5, the pause; 6, critique | **Slice D · The pause** (wishlist evaluation), **Slice E · The read** (outfit + category critique), **Slice F · The case, pressure-tested** (packing) |

**Governing rules for every slice** (standing conventions, restated so a build cannot drift):

- Her words outrank everything. In the prompt block the brief renders **first** and says so; a photo-derived rule yields to a line she wrote.
- Robes drafts, she confirms. Nothing enters the brief or the memory as a fact about her without her seeing it — the declarative-never-presumptuous rule applied to memory. Behaviour (a swap, a wear) is recorded as behaviour ("swapped out the loafers, 3 Sep"), never as a conclusion ("you don't like loafers") until she agrees.
- "AI" never appears. No assistant persona. Robes is the one who remembers.
- A verdict is honest and short. It names the piece and the reason; it never names her. No guilt, no "you already own too many".
- Wardrobe-first: every read names what she owns before naming a gap.
- One ink fill per screen; every new door is a `.rb-pill` hairline or a text door. The ask sheet's CTA is the one ink inside the sheet only.
- Nothing is written until she saves (rule 04): a refine lands in the standing draft/composer paths, never in a row.
- `var` for any state read before its declaration; strip-and-retry on PGRST204; insert-only tables via `_rbCapturePost`; never `capture` on a picker.
- **Security, non-negotiable**: the generation endpoints take `userId` from the request body **unverified** (it exists for `generation_log` attribution). A server-side read of *her* memory or feedback keyed on that id would let any caller read any user's notes. The memory therefore rides the same road as `styleDna` — **compiled on the client from her own profile row, sent in the body** — until the API verifies JWTs. Do not "just read `feedback` with the service key".
- Every slice ships with its harness green and a dated CLAUDE.md delta.

---

## Delivery order

| # | Slice | Article move | Schema? | Size | Depends on |
|---|---|---|---|---|---|
| 1 | **A · In her words** — the brief chapter + its prompt block | 3, 4 | none (`style_dna.brief`) | M | — |
| 2 | **B · The memory** — verdicts/swaps/wears → `style_dna.memory`; the fold-in proposal | 4, handover | none (`style_dna.memory`; `piece_swapped` meta grows) | M | A |
| 3 | **C · Robes on every surface** — the ask sheet + `refine` on the generators | 4 | none | L | A (words are read against the brief) |
| 4 | **D · The pause** — wishlist evaluation and ranking | 5 | none (`wishlist_items.item_dna.read`) | M | A, B |
| 5 | **E · The read** — outfit critique on her photograph; the category audit | 6, 2 | none (`looks.note`, a `wardrobe_reads` cache in `style_dna`) | M | A, B |
| 6 | **F · The case, pressure-tested** — packing against the brief | 6 | none | S | A, C |

A and B are the foundation; C is the one Annie will feel most; D is the article's most-shared screenshot and the one that most distinguishes Robes from every affiliate-fed styling app. E and F are the same endpoint pattern applied twice more.

---

## Slice A · In her words — the brief

**What it is.** A fourth Style notes chapter, **04 · In your words**, holding the personal style document: what works, what never does, and the rules she has learned. It reads as prose she owns, edits like the piece page's note, and is injected at the top of every stylist prompt.

**Data.** `profiles.style_dna.brief` (jsonb, merged like the archetype write — no migration):

```json
{
  "loves":   ["A defined waist", "An open neckline", "One thing that disrupts the line"],
  "avoids":  ["Anything that reads polite", "Crew necks on their own", "Limp fabric"],
  "rules":   ["No more button-ups — six is plenty", "Loafers only with a cropped trouser"],
  "notes":   "I dress well when the structure is already there…",
  "colours": { "loved": ["burgundy"], "rejected": ["camel"] },
  "source":  "drafted",            // 'drafted' | 'edited' — 'edited' once she has touched a line
  "updated_at": "2026-09-30T…"
}
```

`colours.loved/rejected` write straight into the existing `user_overrides.loved_colors / rejected_colors` slots (finally giving them a door). Cap: 8 lines per list, 160 chars per line, `notes` ≤ 600 chars.

**Robes drafts it — `POST /api/stylenotes/brief`.** Flash, thinking 0, ~900 tokens, schema-bound. Inputs (all client-compiled, the standing pattern): the DNA fragments, archetypes + icons, the closet with **the fields the closet line currently drops** (`notes`, `sentiment`, `fit_confidence`, `occasions`, `silhouette_fit` from `item_dna`), the wear ledger (most-worn ten, never-worn ten, each with its category and fit words), the memory (slice B, once it exists), the last twenty feedback notes she typed (from the memory), and her swaps. The prompt is Xue's step 2 verbatim in spirit — *find the patterns; what works, what fails, why* — through her eight lenses, then step 3: return `loves / avoids / rules / notes` **written in the second person as observations she can accept or strike**, each line traced to evidence (`"because": "your three most-worn tops all have an open neckline"`). Never a line without evidence; with under five pieces and no wears the endpoint returns the archetype/icon read alone and says so.

**The chapter (`stylenotes.html`, the `ch*` module).** Opens from the summary row "In your words · Not yet / 6 lines / Edited 12 Sep". Empty state: "Robes has read your wardrobe. Here is what it noticed." followed by the drafted lines, each a card with **Keep · Strike · Edit** (the deck's three-verdict register, `.snc-react`), then "Add a line of your own" (one underlined input per list). Keep files the line; Strike drops it *and* records the strike in the memory (a struck observation is itself evidence). Once anything is kept the chapter is a document: three ruled lists + the notes paragraph, every line editable in place (`__lkTitleEdit`'s inline-input pattern), a quiet **"Read my wardrobe again"** pill that re-drafts and shows only *new* lines (diffed against what stands — never overwriting an edited line). Filing is immediate, like the model (`mvFile`); the "✓ Filed · updates as you change it" line, never a Keep button.

**The door.** Registered in `_rbNotesDoorWants`'s "any chapter holds an answer" test so the notes door on first-run home retires on it too; the summary row's forward line "Create a look →" is unchanged. The next line (`_rbNextLine`) gains a rule between `robes` and the diary rules: **`brief`** (≥5 photographed pieces, ≥3 wears or ≥3 feedback rows, no brief) → "Robes has noticed a few things about how you dress. *Read them* →" (text door → `/stylenotes?chapter=brief`).

**The prompt block.** `styleDnaPromptBlock` renders the brief **before** STYLE TYPE and STYLE ICONS:

```
HER STYLE BRIEF — in her own words. These lines outrank every rule below; a look that
breaks one is wrong however well it photographs.
Works: a defined waist · an open neckline · one thing that disrupts the line.
Never: anything that reads polite · crew necks on their own · limp fabric.
Rules: no more button-ups (six is plenty) · loafers only with a cropped trouser.
```

`rules` also reach the wishlist and the shop-proposal paths: `/api/alternates` and `/api/daily`'s aspirational pieces must not propose a piece a rule excludes (the block says so once; `normStylePieces`/`weeklyNormaliseItem`-style post-filters are not needed — the model reads the line).

**Harness.** `stylenotes_model_harness` gains a section: the empty chapter drafts from a stubbed endpoint, Keep/Strike/Edit write the expected jsonb (own-row PATCH shape pinned), a struck line lands in memory, an edited line survives a re-draft, the door retires. A `node --check` unit on `styleDnaPromptBlock` pins the block order (brief first) and the empty case.

**Copy (Style notes register — warm, low-effort, never asks her to rank herself).** Chapter eyebrow "In your words". Intro: "What Robes has noticed, for you to keep or strike." Keep / Strike / Edit. Empty-with-nothing-to-read: "Nothing to read yet. A few pieces and a few worn days and Robes will have something to say." **Rejected**: "Tell Robes about your style" (a questionnaire); "Your style DNA" (already the engine's name, and it is hers, not a code); "Robes knows you now" (presumptuous).

---

## Slice B · The memory

**What it is.** Xue's "institutional memory": every decision she makes on a look becomes a line Robes reads next time, and Robes periodically proposes folding what it keeps noticing into the brief. Three writers, one reader, one consolidation.

**Data.** `profiles.style_dna.memory` — a capped ledger on the profile so it rides `styleDna` for free (the security rule above is why it is not read server-side from `feedback`):

```json
{ "entries": [
  { "t": "2026-09-28", "k": "verdict", "v": 0, "on": "Harbour Dinner", "surface": "kp",
    "text": "too safe — I wanted the shoulder to do something" },
  { "t": "2026-09-27", "k": "swap", "out": "Tan leather loafers", "in": "Black pointed flats",
    "cat": "Shoes", "surface": "daily" },
  { "t": "2026-09-26", "k": "wear",  "look": "The Thursday one", "pieces": 4 },
  { "t": "2026-09-25", "k": "strike", "text": "Robes said: you avoid colour — no, I avoid *pastels*" }
], "v": 1 }
```

Cap 60 entries, newest first, ≤ 200 chars of text each; `_rbMemoryPush(entry)` merge-PATCHes `style_dna` the way `_rbNotifyPatch` merges `notification_prefs` (a jsonb PATCH replaces the column — always merge over the profile's copy). `var`, the TDZ rule.

**Writers.**
1. **Verdicts** — `__rbFbSubmit` (the hairline line on kp ways, the composer, the day, the trip) pushes `{k:'verdict', v, on, surface, text}` beside the existing `feedback` + Airtable writes. A rating with no words still lands (the way's title says which look).
2. **Swaps** — every `piece_swapped` site pushes `{k:'swap', out, in, cat, surface}`; the event's `metadata` grows the same three fields (`out`, `in`, `cat`) so the admin can see rejections. A flick is not a swap (browsing); a swap applied is.
3. **Wears** — `_lkAddWear` pushes `{k:'wear', look, pieces}`; a wear undone removes it.
4. **Strikes** — slice A's Strike pushes `{k:'strike', text}`.

**Reader.** `styleDnaPromptBlock` renders, after the brief and before STYLE TYPE:

```
WHAT SHE HAS TOLD ROBES RECENTLY (newest first — read the pattern, never repeat a rejected move):
- 28 Sep · rated "Harbour Dinner" not quite: "too safe — I wanted the shoulder to do something"
- 27 Sep · swapped out tan leather loafers for her black pointed flats (daily look)
- 26 Sep · wore "The Thursday one"
- 25 Sep · struck a line Robes drafted: she avoids pastels, not colour
```

Twelve lines at most, verdicts and strikes first, then swaps, then wears; a swap of the same category three times renders once as "has swapped out loafers three times". The block ends: *A piece she has swapped out twice is not proposed again unless she names it.* (Cost: ~300 tokens per generation — the only budget lever is the line cap.)

**Consolidation — the handover document.** Every 20 new entries (or on "Read my wardrobe again"), `POST /api/stylenotes/brief` receives the memory and returns **proposed additions only**, each traced ("swapped out loafers three times → 'Loafers only with a cropped trouser'?"), landed in the chapter as Keep/Strike cards and toasted from home once: "Robes noticed something about how you dress · *Read it* →". Nothing folds into the brief without Keep. Consolidated entries are marked `folded: true` and stop rendering in the prompt block — the brief now carries them, shorter.

**What the memory does NOT do.** It never infers taste server-side, never scores her, never renders on home as a feed. The only surfaces that show it are the brief chapter's proposals and the admin user detail (a **Memory** list beside Feedback, from `style_dna.memory`, collapsed past 8).

**Harness.** `looks_harness` gains: a verdict on the composer writes the memory entry and the `feedback` row; a swap on the daily rack writes `{out, in, cat}` to memory and to the event; a wear + undo leaves the ledger clean; the cap holds at 60. The prompt-block unit pins the rendering, the twelve-line cap and the three-swap fold.

**Copy.** The feedback line's sent state gains nothing (it already reads "Noted — filed for next time." which is now literally true). Consolidation toast as above. **Rejected**: "Robes is learning your taste" (the concierge band already owns "Robes is learning" for the piece count); any line that quotes her verdict back at her on a look page.

---

## Slice C · Robes on every surface — the ask sheet

**What it is.** One component, **the ask sheet**, opened from every surface that holds a look, a day, a trip, a piece or a wishlist item: a few chips that fit the surface, one underlined line, one ink CTA. The words refine *what is on screen* against the brief and the memory. The Diary's Robes sheet (`_mvRs`, 2026-09-29) is the exact pattern and becomes the first consumer of the shared component rather than a second copy.

**The component.** `_rbAsk(cfg)` → `#rb-ask` (`.rb-ask-wrap`, z-955; a bottom sheet with a grab bar ≤767px, a centred dialog on the web — the `_kpSheetOpen` shell): eyebrow (the surface's name for the thing — "Harbour Dinner", "Wednesday 7 Oct", "Lahinch"), a serif line, chips (`cfg.chips`, single-select), the input (`cfg.placeholder`), the CTA (`cfg.cta`), and under it one quiet line naming the constraint that holds: "Anchored pieces stay." / "Your pinned days stay." Escape, scrim, × close. Events `ask_opened {surface}`, `ask_sent {surface, chip, typed}`.

**Doors and what each sends.**

| Surface | Door | Chips | Sends |
|---|---|---|---|
| Composer draft (a prompted look, a kp way built in situ, a Robes build) | **"Adjust with words"** text door in `.rb-lk-saverow` beside Try another | Warmer · Softer · Sharper · More me · Less polite · Swap the shoes | `POST /api/daily` with `refine`, the standing prompt, `locked` = anchored + owned, the current composition as context, `savedId` as ever → `_lkDraftFromDaily` (nothing written) |
| Saved look page (reading) | "Adjust with words" beside Edit & resave | as above | new **`POST /api/look/refine`** → the look opens EDITING with the proposal as a draft (the `_lkDraft` path) and the change bar: Discard · Save as a new look · Update |
| Day page / day console | "↻ Restyle this day" **takes words** (the sheet opens; empty send = today's restyle) | Work · Dinner · Rain · Warmer · Less effort | `__dlRestyle` gains `refine` |
| Trip look page | "Adjust with words" on the look head | Warmer · Cooler · Dressier · Fewer pieces · Not the loafers | `/api/travel/looks` with `refine` + the look's occasion, held to the capsule |
| Key piece result | the card's sheet gains "Style it another way →" | Dressier · Easier · Colder day · For the evening | `/api/style` with `refine` + the way's title, re-writing ONE way (a new `way_index` param; the other two untouched) |
| Piece page | "Style this piece ▾" gains **"Ask Robes about it"** | Is it a duplicate? · What's missing around it? · When do I wear it? | slice E's `/api/wardrobe/read` on one piece |
| Wishlist card / piece page (wishlist door) | **"Robes' read"** (slice D) | — | slice D |
| Home prompt | unchanged — the generator | — | — |

**`refine` on the generators.** One block, shared (`refineBlock(text, current)` in `server.js`), appended after the anchored block on `/api/daily`, `/api/travel/looks`, `/api/style`:

```
THE LOOK AS IT STANDS: [the current pieces, owned ones marked, anchored ones marked KEEP].
HER ADJUSTMENT, IN HER WORDS: "warmer, and not the loafers again".
Change only what the adjustment asks for. Every KEEP piece stays exactly as it is.
An owned piece stays unless the adjustment names it or makes it impossible.
Read the adjustment against her brief and her recent verdicts above — "more me" means the brief.
```

`refine` ≤ 240 chars, trimmed server-side. **`POST /api/look/refine`** (new, flash, thinking 0, ~1400 tokens) takes a saved look's pieces (owned + proposals), the closet, the brief/memory via `styleDna`, and `refine`; returns the daily shape's `pieces` + a fresh `stylist_summary` — composition only, no image job (the composer's canvas re-renders her model; the still-life job is `/api/lookbuild/images` as ever). Rate 20/min.

**Chips are surface-scoped and never say a fact only she has.** "Rain" on the day page renders only when the forecast the day reads says so; "Not the loafers" only when the look holds loafers (`_dlSlot` reads the shoe row). A chip is a suggestion, never a claim.

**Where it lands.** Always the standing draft path: a refined composer draft repaints in place (`_lkDraftFromDaily` with `{again}` re-pointed at the refine so Try another re-runs the *refined* ask); a refined saved look opens editing; a refined day lands where Restyle lands; a refined trip look repaints its console. Nothing is written until she saves — rule 04 is what makes "adjust with words" safe to offer everywhere.

**Harness.** `looks_harness` (composer + saved look: the door, the sheet's anatomy, one ink inside, the POST body carries `refine` + `locked`, anchored pieces survive, the draft/change bar), `diary_harness` (the day's restyle takes words; empty send = the old restyle byte for byte), `travel_console_smoke` (the trip look's ask held to the capsule), `inspiration_smoke` (one way re-written, two untouched). The Diary's `_mvRs` pins move onto the shared component unchanged.

**Copy (transactional register: plain, short).** Door: "Adjust with words". Sheet line: "What would you change?" Placeholder: "Warmer, sharper, not the loafers…". CTA: "Adjust →" (day: "Restyle Wednesday →"). Constraint line: "Anchored pieces stay." **Rejected**: "Chat with Robes" (a persona); "Refine with AI"; "Tell Robes what's wrong" (it may be right — she wants a variation).

**As built (2026-09-30).** Built as specified with three deliberate deviations, each recorded in CLAUDE.md's slice C delta: (1) `locked` on `/api/daily` stays = the ANCHORED pieces alone — the refine block itself says an owned piece stays unless the adjustment names it, and sending owned pieces as locked would make "swap the shoes" impossible on shoes she owns; the current composition rides as `current` (owned marked "hers", anchored marked KEEP). (2) The piece page's "Ask Robes about it" and the wishlist's "Robes' read" are NOT built here — they are slices E and D's endpoints and land with them. (3) The trip look's ask is `held: true` server-side (`new_item_needed` always false) and the refined look never touches the trip blob until Save — a Robes-styled trip look rebuilds its DRAFT from the refined formula, an imported saved look lands it on the edit draft and Update re-points the trip formula through `_lkTripRelink`.

---

## Slice D · The pause — the wishlist, evaluated

**What it is.** Xue's most-shared screenshot: a saved piece, read against the brief and the wardrobe before it is bought. Robes already has the capture (photo · link · receipt · Robes suggests) and the "I bought this" door; this adds the beat between them.

**`POST /api/wishlist/read`** (flash, thinking 0, ~700 tokens, schema-bound, rate 20/min). Inputs: the piece (label, category + L2/L3, colour, brand, price, `item_dna`, image URL — the same `readPieceImage` vision pass reads the photograph when the text is thin), **the closet in the same category and its neighbours** (label, colour, `silhouette_fit`, `times_worn`, `sentiment`, `notes`), the brief + memory via `styleDna`, and the wishlist's other rows in the category. Returns:

```json
{ "verdict": "pass" | "wait" | "duplicate" | "gap",
  "line":    "You own three blazers with this shoulder — the one you reach for is the sharpest. This one is softer.",
  "closest": [{ "id": "…", "label": "Black wool blazer", "why": "same drop shoulder, worn 11×" }],
  "gap":     "A structured jacket in a colour is the space this doesn't fill.",
  "brief":   ["Loafers only with a cropped trouser"]      // the brief lines it touches, if any
}
```

`line` ≤ 240 chars, `closest` ≤ 3 (resolved to real wardrobe ids by the server against the payload, never invented), `brief` only lines that exist. Cached on the row: `wishlist_items.item_dna.read = {…, at}` via the own-row PATCH (no migration), re-read on demand.

**Where it renders.** The wishlist card carries a quiet second line under the price — the verdict word and the first clause ("Duplicate · three blazers with this shoulder"); the wishlist door on the piece page carries **"Robes' read"** as a held card between the note and **I bought this**: the line, the closest pieces as 34×44 thumbs opening their piece pages, the gap line, and the brief lines it touches. Read runs at save for a link or receipt (the analyse already ran; this is one more flash call), on open for older rows, and on "Read it again". Empty wardrobe or no brief → the read is the category line alone: "Nothing in your wardrobe to read it against yet."

**Rank the list.** The wishlist masthead gains a hairline **"Robes' order"** pill (only at ≥4 rows): `POST /api/wishlist/rank` returns the rows ordered with one clause each ("closes a gap" / "a third of the same" / "the brief says no") and **one line naming the category she keeps circling** ("Four saved tops, none worn-shaped — the piece that's actually missing is one sharp jacket."). Renders as a sort mode (`Robes' order ↓` beside the existing sort), never reorders her list on its own.

**Register (the hardest copy in this brief).** The read is a stylist's honesty, not a purchase gate and not a lecture. It names the pieces she owns and what she does with them; it never counts against her, never says "already", never uses "need". **Rejected lines**: "You already own too many blazers." · "Do you really need this?" · "Buy this — it fills a gap" (Robes has nothing to sell) · "Great find!" (the sycophancy Xue left ChatGPT over). **Kept**: "Three blazers with this shoulder; the sharpest is the one you wear." · "Nothing in your wardrobe does this." · "The brief says no to a fourth button-up — your call."

**Instrumentation.** `wishlist_read {verdict}`, `wishlist_read_opened`, `wishlist_ranked {n}`; and — the number the article is about — `wishlist_bought {verdict}` vs `wishlist_removed {verdict}` on the row's read (the pause working = "duplicate" rows removed more than bought).

**Harness.** `addflow_harness`: the read POST body (closet subset, no other user's data), the card's second line, the piece page card with the closest thumbs resolving to real ids, the cache PATCH shape, the rank sort mode, the empty-wardrobe line. Server smoke: a returned `closest` id not in the payload is dropped.

---

## Slice E · The read — outfit critique and the category audit

**What it is.** Xue's step 6 on two of Robes' existing surfaces: a saved look's own photograph (she already uploads one — `photo_url`, "Kept as the record of this look"), and a category on the wardrobe grid ("here are my blazers").

**Outfit read — `POST /api/look/read`.** Inputs: her photograph (a data URL through `_rbDownscale`, the existing upload path), the look's pieces, the brief + memory. The prompt is Xue's eight lenses verbatim in spirit (line · proportion · silhouette · colour · texture · movement · tension · vibe), returning `{ "read": "…", "adjust": ["…"], "lens": "proportion" }` — one paragraph ≤ 90 words naming what works and the one thing to change, up to three adjustments as row notes in the `ROW_NOTE_RULE` register ("Belted at the natural waist, not the hip."). Identity rules as the tryon endpoint (her own photo; nothing about her body — the "never body type" rule holds; the read is about the clothes on the frame). Renders under the You view of the look's card as **"Robes' read"** (`.rb-lk-read`, a held card), with **"Adjust with words"** (slice C) pre-filled from the first adjustment. `looks` has no jsonb column and `note` stays hers, so the read is cached in `style_dna.reads[lookId]` (capped at 30, oldest dropped) until a column earns itself. Runs on "Read this photograph" only, never automatically (a photograph she took is hers; a critique is asked for).

**Category audit — `POST /api/wardrobe/read {category}`.** Inputs: every piece in the category (label, colour, `silhouette_fit`, `times_worn`, `sentiment`, `notes`, price), the brief + memory, the wishlist rows in the category. Returns `{ "read": "…", "missing": "…", "repeat": "…", "reach": [ids], "rest": [ids] }` — what the category does well, the one structural gap (Xue: "one sculptural piece in a jewel tone"), what she keeps buying (three of the same), the pieces she reaches for and the ones that rest. Door: the wardrobe grid's trail row, when a category tab is active and holds ≥4 pieces, carries a hairline **"Robes' read"** pill → a bottom sheet / dialog with the read, `reach` and `rest` as two thumb rows opening piece pages, and the gap line ending "Save it to your wishlist →" (`__wlOpenAdd` with the gap as the note — the wishlist's Robes-suggests source, already built). Cached per category in `style_dna.reads` with the piece-count it was read at; re-read when the count changes by 2.

**Both feed the memory** (slice B, `k:'read'`) and both are evidence for the next brief draft (slice A's "Read my wardrobe again").

**Harness.** `looks_harness` (the read door only with a photograph, the POST carries the pieces + a data URL, the card, the pre-filled ask), `addflow_harness` (the trail pill at ≥4, the sheet, `reach`/`rest` resolving to real ids, the wishlist door carrying the gap).

**Copy.** "Robes' read" everywhere (one name for the verdict, three surfaces). Outfit: "Read this photograph". Category: "Robes' read on your blazers". **Rejected**: "Critique my outfit" (she is not on trial); "Rate this look" (the thumbs already exist and mean something else); "Wardrobe gaps" as a section title (gap-first is the affiliate register — the read leads with what she reaches for).

---

## Slice F · The case, pressure-tested

**What it is.** Xue's packing move: the case against the trip, with the aspirational pieces named. Travel already computes the 1:3 rule server-side (`travelUnderusedItems` — pieces worn in fewer than three looks — used only for a corrective regeneration). This surfaces it to her, in words, with the brief.

**`POST /api/travel/read`** (flash, thinking 0, ~700 tokens): the capsule with each piece's look count, the looks with their occasions, the plans, the weather line, the brief + memory. Returns `{ "read": "…", "cut": [{ci, why}], "missing": "…", "just_in_case": [ci] }` — the case in one paragraph, up to three pieces to leave behind ("the silk dress packs for an evening this trip doesn't have"), the one thing the plans want that the case lacks, and the just-in-case pieces named as such (never removed — she decides). Door: the capsule bar gains a hairline **"Pressure-test the case"** beside "+ Add pieces"; the read renders as a held card above Keep / Worth adding, each `cut` row with an **Unpack** pill (`__tvPackToggle`) and each `just_in_case` a quiet tag on its capsule card ("Just in case"). Re-runs on demand; stale after any pack/unpack.

**Harness.** `travel_console_smoke`: the pill, the POST body (capsule with look counts), the card, Unpack through the standing toggle, the tag, stale on change.

**Copy.** "Pressure-test the case". Card eyebrow "Robes' read". "Leave behind" never "cut". **Rejected**: "Your fantasy self" (Xue's phrase — hers, and it names her).

---

## Instrumentation the loop is measured on

| Question | Events |
|---|---|
| Does the brief get written, and by whom? | `brief_drafted {lines}`, `brief_line {verb: keep\|strike\|edit\|add, list}`, `brief_source` = drafted → edited |
| Does the memory change what she keeps? | `feedback_given` rating over time per user with vs without a brief; `piece_swapped` count per look, per user, before/after slice B |
| Do words get used, and where? | `ask_opened {surface}`, `ask_sent {surface, chip, typed}` — typed vs chip is the honest read, as it was for the prompt pills |
| Does the pause work? | `wishlist_read {verdict}` → `wishlist_bought` / `wishlist_removed` by verdict |
| Do the reads get asked for? | `look_read`, `wardrobe_read {category}`, `travel_read`, and `ask_sent` pre-filled from a read |

All through `_rbTrack` (both planes). The admin user detail gains Memory (B) and Reads (D/E/F counts) beside Feedback.

---

## What this deliberately does not build

- **A chat.** There is no thread, no transcript, no persona. Every ask is one line against one thing on screen, answered by a change to that thing. The article's "conversation" is a limitation of its tools, not a feature to copy.
- **A questionnaire in onboarding.** The 2026-09-25 split stands. The brief is drafted from behaviour and confirmed, not asked for up front.
- **Server-side reads of her feedback keyed on a body `userId`.** See the security rule. When the API verifies JWTs, the memory can move server-side; until then it rides the profile.
- **Returns / gave-away tracking** (Xue's sixth evidence source). A "Let it go" verb on the piece page with a one-word reason (didn't fit · didn't wear · didn't love) would be evidence of the best kind — it is one slice on its own, after these six, and the piece page's delete is where it lives.
- **Hard exclusion enforcement in code.** A brief rule is a prompt line, not a filter. If the model breaks one, that is a verdict she gives (slice B) and the memory carries it; a post-filter that silently removes pieces would hide the miss from her and from the admin.

## Cost

Slices A/B add ~300–500 tokens of prompt to every generation (the brief + twelve memory lines); D/E/F are flash calls at ~700 tokens, on demand, cached. No image calls anywhere in this brief. No migration anywhere in this brief — every new field is jsonb on `profiles.style_dna` or `wishlist_items.item_dna`, degrading to nothing when absent.
