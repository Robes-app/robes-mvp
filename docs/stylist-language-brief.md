# The stylist's language — Liberty's glossary in the prompt, a weekly feed, one look per ask (build brief)

**Date**: 2026-10-22 · **Branch**: `beta` · **Status**: brief, nothing built
**Sources**: Liberty's *Fashion Language Glossary & Context* (22 Oct), her four archetype grids (women ×2, men, non-binary), Annie's call that one prompt should return ONE look refined through the box
**Companion briefs**: `docs/style-memory-brief.md` (the memory every prompt reads), `docs/look-prompt-brief.md` (the box and `/api/look/ask`), `docs/front-door-brief.md`

## What Liberty's material says, in one paragraph

The glossary is not a dictionary. It is a **reading protocol**: identify the intention, the occasion and the dress code; translate colloquialisms into visual characteristics; cross-reference with her Style DNA and wardrobe; combine references into ONE cohesive outfit (dominant aesthetic + the second reference as an accent); let her explicit words and hard nos beat the convention; ask only when the ambiguity materially changes the outfit. Every term carries the same four fields — **meaning · visual characteristics · AI instruction · avoid** — and a priority hierarchy sits above all of it: explicit instruction › occasion, dress code, cultural and practical requirements › established personal preferences › the requested aesthetic or trend › general convention. The trend terms map onto Robes' own archetypes (Blokecore → Off-duty, Office siren → Classic, Mob wife → Eclectic, Clean girl → Minimal…) and Liberty wants to refresh them weekly.

## Where the prompt stands today — an audit before the plan

Read `server.js` `/api/style` (line 611) and `style_dna.js` `styleDnaPromptBlock` against the glossary. Three findings.

**Finding 1 — the hierarchy already exists, and it is nearly Liberty's.** The shared block renders, in order: HER HARD NOS → HER STYLE BRIEF → the memory → STYLE TYPE / ICONS / BRANDS / INVESTMENT / THE FACTS → STYLE DNA (guidance, not law) → HER COLOURS; `/api/style` then adds the formula, the sanity check, the wardrobe, where the pieces come from, and what was already shown. Liberty's hierarchy differs in ONE row: she puts **the occasion and dress code** second, and Robes has **no occasion layer at all** — "Her words" go to the model raw and formality is left to its judgement. That is the gap every dress-code entry in the glossary is written to close.

**Finding 2 — the archetype catalog is not one catalog.** The app's ten (`settings.html` `ARCHETYPES`: Minimal, Bohemian, Classic, Romantic, Sculptural, Utility, Heritage, Eclectic, Off-duty, Avant-garde) and Liberty's grids disagree in two places: she has **Modern** (Zara, Phoebe Philo, Auralee / Our Legacy, Celine) and no Romantic; the trend map names **Off Duty** and **Avant Guard**, which her women's grids do not draw. Her men's grid is eight registers with eight brand trios; the non-binary grid is a different vocabulary altogether (Androgynous Minimalist, Gender-Fluid, Tomboy-Leaning, Soft Masc/Femme, Punk/Alt, Bold Maximalist, Utility, Modern). And the `BRAND_SEED` / `ICON_SEED` maps live in the settings page, so **an archetype's houses reach a prompt only through the brands she happened to tick** — the model never reads "Minimal means The Row, COS, Lemaire" for a man or a woman who skipped the brand wall.

**Finding 3 — the deck's keep and pass reach nothing.** `deck_kept` / `deck_done` are analytics events only; the memory (`MEMORY_KINDS`: verdict, swap, wear, strike, ask) never sees them, and ALREADY SHOWN reads the last four sets regardless of what she kept. The signals that DO reach the next prompt are the ones the box writes: a swap (`k:'swap'`), a line she typed (`k:'ask'`), a rule, a wear. Annie's instinct is right on the data as well as the UX: the box is already the learning surface; the deck never was.

---

## Part 1 · The prompt, restructured on the glossary

### 1.1 One module, one seam — `stylist_language.js`

The `style_dna.js` / `wardrobe_taxonomy.js` precedent: a root ES module that holds the vocabulary as **data**, exports a resolver and a renderer, and is injected through the one seam every generation already passes (`styleDnaPromptBlock` and the `/api/style` system prompt). No per-endpoint prose.

```
GLOSSARY = [{
  term: 'smart casual', kind: 'dress_code',          // dress_code | aesthetic | trend | styling_verb | cultural
  aliases: ['casual friday', 'jeans and a nice top', 'casual date night', 'after-work drinks'],
  meaning, visual, instruction, avoid,              // Liberty's four fields, verbatim
  archetype: null,                                  // trends carry one: 'Off-duty', 'Classic'…
  contexts: { 'creative workplace': '…', 'client lunch': '…' },   // where she wrote them
  since: '2026-10-22', status: 'enduring'            // enduring | emerging | peaking | fading | retired
}, …]
```

`readAsk(prompt, thread)` — **deterministic, zero tokens**: alias and term matching over her words (word-boundary, the `\bweek\b` lesson), returning `{dressCode, aesthetics[], modifiers[], cultural[], trends[]}`. `stylistLanguageBlock(read, opts)` renders ONLY the matched entries — instruction + avoid, never the whole glossary (it is ~6,000 words; the whole thing in every prompt would double the cost of a call the 13 Oct pass just cut by a third). Nothing matched → no block, the prompt is what it is today.

### 1.2 The hierarchy, said once, in Liberty's order

Replace the implicit ordering with ONE explicit numbered block at the top of every stylist prompt, so primacy and the text agree:

```
HOW TO READ THIS BRIEF — in this order, the first that applies decides:
1. HER HARD NOS — absolute. (unchanged: she confirmed them)
2. HER WORDS TODAY — what she asked for by name, she gets; a modifier ("a bit edgy") is an accent on the dominant ask, never a second outfit.
3. THE OCCASION — the dress code and any practical or cultural requirement she stated. [the resolved entry's instruction + avoid render HERE]
4. HER STYLE BRIEF — what she has told Robes works, confirmed by her.
5. THE AESTHETIC OR TREND she named. [resolved entries render HERE, with their archetype]
6. HER STYLE TYPE, ICONS, HOUSES. 7. STYLE DNA — guidance. 8. General convention — last, and only to fill what nothing above decides.
```

One deliberate reconciliation, flagged for Liberty: her hierarchy puts explicit instruction FIRST and preferences third; Robes puts hard nos first because she confirmed them in Settings and "I don't wear double denim" said in a look's box is deliberately NOT a rule (13 Oct). The order above keeps both: a hard no is a confirmed instruction, so it outranks today's words; everything else follows Liberty.

### 1.3 The three glossary rules the prompt does not yet carry

- **Combined requests** (her "quiet luxury meets streetwear" section): "Identify the dominant aesthetic and use the secondary reference as an accent or modifier. Do not apply every feature of both." The resolver returns the first aesthetic as dominant and the rest as modifiers; the block says so in those words.
- **Dress-code contexts**: "smart casual" alone is under-specified; with "creative office" / "client lunch" / "weekend" in the ask the resolver picks the context line. This is the `_rbAskDateFrom` pattern applied to place and company.
- **The clarify rule** (her rule 8): "ask only when the ambiguity materially affects the outfit — otherwise make a reasonable interpretation and proceed." Today the box never questions her except WHERE THE PIECES COME FROM. Recommendation: allow AT MOST ONE question per new ask, asked the way the balance question is — one line and chips with the default first ("Smart casual — or dressier?" · *Smart casual* · *Dressier* · *Or say it*), decided by the resolver (two dress codes matched, or a date-night ask with no mood word — Liberty's own "infer understated, romantic, confident, playful, glamorous or fashion-forward"). The model is never the one deciding to ask on a new look; `/api/look/ask`'s `clarify` intent already covers an edit.

### 1.4 Hard nos meet the glossary

Liberty's worked examples ("elevated casual, blazers are a hard no → a refined cardigan or overshirt, never the blazer"; "bohemian, but no florals → texture and layering, never the print") are exactly the case where a glossary entry's *visual characteristics* name the thing her hard no excludes. The renderer should say it generically once: "Where a term's usual pieces meet one of her hard nos, the hard no wins and the term is served by its OTHER characteristics." Testable (§1.7).

### 1.5 One archetype registry, per gender, with houses — from Liberty's street-style boards (27 Oct)

Liberty's 24 boards (Drive, `Street Style Images for …`, 25 Oct) supersede the runway grids as the registry's source: three decks of eight, each board an archetype name, a line of descriptor words in her voice, and eight generated street frames of the same models on the same streets. They read as generated, not photographed, so they can ship as the onboarding tiles as they stand. **Across the three decks the registers are the app's ten with Modern and Off-duty in and Romantic out** — decision 1 answers itself.

Move `ARCHETYPES`, `BRAND_SEED`, `ICON_SEED` out of `settings.html` into the module (the page imports the list through the `GET /api/wardrobe/taxonomy` pattern) and make it the boards':

| Register | Women | Men | Non-binary expression |
|---|---|---|---|
| Minimal | **board owed** (grid: Auralee, The Row) | board | Androgynous Minimalist — COS, Lemaire, Studio Nicholson |
| Modern | board | board | Modern (no houses on the board) |
| Sculptural | board | board | — |
| Eclectic | board | board (tame — see below) | Bold Maximalist (no houses on the board) |
| Bohemian | board | board | — |
| Utility | **board owed** (grid: Carhartt WIP) | board | Workwear (no houses on the board) |
| Classic | board | **board owed** (grid: Ralph Lauren, Cucinelli, Zegna) | Soft Masc — The Row, Lemaire, Aimé Leon Dore |
| Heritage | board | board | — |
| Avant-garde | board | **board owed** | Punk — Vetements, Martine Rose, Comme des Garçons |
| Off-duty | board | board | Tomboy-Leaning — Dickies, Levi's, Margaret Howell |
| Gender-Fluid | — | — | its own card — Telfar, Collina Strada, Marni; a styling posture ("mixed codes, playful proportion"), not a register — the prompt reads it as a modifier on whatever register the pieces imply |

**The descriptor lines are the registry's `visual` field, verbatim**: e.g. women's Sculptural "artful silhouettes · architectural layers · structured volumes · refined drama · timeless elegance"; men's Utility "functional style · refined utility · modern workwear · transeasonal layers · practical elegance · everyday versatility"; non-binary Soft Masc "relaxed tailoring · refined masculinity · feminine influences · layering & texture · modern classics · everyday wear". All 24 lines are transcribed in the session notes of 27 Oct and go into the module as data.

**Houses**: the women's boards and three non-binary boards (Bold Maximalist, Workwear, Modern) carry none; the runway grids carry a trio per cell. Until Liberty confirms a trio per cell, the grids' trios stand for women and men and the boards' for non-binary. Two non-binary trios moved between the grid and the board (Punk: Westwood / Dr. Martens / Rick Owens → Vetements / Martine Rose / CdG; Soft Masc: Our Legacy / Sandy Liang / Dries → The Row / Lemaire / Aimé Leon Dore) — the board wins, being newer.

Then the prompt can say, for a man placed Minimal who ticked no houses: "STYLE TYPE — Minimal (The Row, COS, Lemaire are its houses; clean lines, understated luxury, refined proportions)". The trend entries carry their archetype so "office siren" steers Classic without her ever having chosen it.

**Owed and open** (§4): four boards before onboarding can ship (women's Minimal and Utility, men's Classic and Avant-garde — the grids cover all four, the street boards do not exist yet); the men's Eclectic board reads as cream-and-khaki relaxed tailoring, closer to men's Modern than to the women's leopard-and-patchwork Eclectic — either the register means something different for men and the glossary should say so, or the board needs the women's register; one house trio per cell; whether Gender-Fluid stays a deck card; the non-binary deck implies a `gender_identity` value the enum lacks.

### 1.6 Where it lands — the endpoints

The block rides `styleDnaPromptBlock`'s call sites by passing `read` in `opts`, so every surface inherits it: `/api/style`, `/api/daily`, `/api/look/ask`, `/api/look/refine`, `/api/travel/looks`, `/api/alternates`, `/api/lookbuild/note`. The resolver runs server-side on `prompt` / `text` / `refine`. `/api/intent`'s `vibe` field (the one thing the classifier still extracts) is superseded by the resolver's read, at zero tokens. `logAI` logs `read: ['smart casual', 'quiet luxury']` beside `balance`, so the admin trail shows which entries fired on each call — Liberty's review surface (§2.4).

### 1.7 How it is tested

- `scripts/stylist_language_test.mjs` (the `style_dna_block_test` precedent): the resolver on forty asks Liberty writes with the expected read; the block's order; a hard no removing a term's usual piece.
- **A golden set the live model is held to**: twenty of Liberty's asks with a checkable expectation on `pieces[]` — "business casual → no jeans", "elevated casual + blazer hard no → no blazer", "date night → never assumes heels", "St Patrick's Day → green somewhere". Run against beta weekly (the keys live on Railway), read in `/admin`. This is the only honest test of "aligned with her recommendations": the prompt text is not the proof, the pieces are.

---

## Part 2 · Liberty's weekly feed — a format the prompt can read

The LLM does not learn; it reads. "Gets smarter each week" means **fresher rows in the context**, nothing else — so the format has to be rows, not prose, and every row has to carry the four fields the prompt renders.

### 2.1 The format: one table, one row per term

An Airtable table **Stylist language** (Airtable is already in the stack and connected) with these columns, the glossary document converted into its first ~45 rows by me, Liberty adding from there:

| Column | Rule |
|---|---|
| `term` | one term per row, lower case |
| `kind` | dress_code · aesthetic · trend · styling_verb · cultural · season_note |
| `aliases` | the customer language, comma-separated ("casual Friday, jeans and a nice top") |
| `meaning` · `visual` · `instruction` · `avoid` | her four fields. **`instruction` is imperative, `avoid` is mandatory** — the avoid line is what stops the generic read |
| `archetype` | one of the registry (trends only) |
| `gender_scope` | all · women · men · non-binary |
| `status` | enduring · emerging · peaking · fading · retired — **retire, never delete** ("preserve historical meanings") |
| `week_of` | the Monday she wrote or last changed it |
| `sources` | links, optional |
| `example_pieces` · `example_houses` | optional, for the visual grounding row |

Plus one `season_note` row per month: what is current in colour, silhouette and proportion right now — the row "make it more current" and "fashion-forward" read.

### 2.2 The weekly ritual, fifteen minutes

Monday: Liberty opens the table, adds or edits up to ten rows (new trend, a term whose meaning moved, a status flip from peaking to fading, this month's season note), each stamped `week_of`. Nothing else is required of her. A term she is unsure about is `emerging`; the prompt renders emerging terms with "treat as a current reference, not a settled definition" (her TREND FRESHNESS rule).

### 2.3 How it reaches the prompt — a reviewed commit, not a live read

`scripts/pull_stylist_language.mjs` pulls the table into `data/stylist_language.json` (the `gen_archetype_tiles.mjs` / manifest precedent). The pull is run and the JSON committed — so every week's change is a diff Annie can read, the harness pins the file, and a bad row cannot reach beta without a push. Two reasons not to read Airtable at request time: a request must never wait on a third party, and a prompt that changes under a running harness is undebuggable. Cadence: the pull runs in the Monday session, or on a scheduled task that opens a PR.

Rendering: the prompt carries only the rows the resolver matched (§1.1) plus, when the ask touches trend language or "current / cooler / fashion-forward", a dated block: "THIS WEEK, PER ROBES' STYLIST (week of 20 Oct): …" with the matched trend rows and the season note.

### 2.4 The loop that closes it — Liberty reads what fired

`/admin`'s generation trail gains two columns: `read` (which entries fired) and her verdicts beside them. Liberty's weekly fifteen minutes starts there: ten generations from the week, what the prompt read, what came back, and a one-line correction per miss becomes a row (a sharper `avoid`, a new alias, a context line). That is the whole "smarter" mechanism — the stylist edits the glossary against the evidence, the way the Observations card lets the user edit her brief.

### 2.5 The images

Liberty's 24 street-style boards (27 Oct) are the visual grounding: generated frames, eight per archetype, consistent models and streets — shippable as the onboarding deck's tiles and as `example_pieces` references as they stand, which retires the `gen_archetype_tiles.mjs` plan for the ten registers. Her four runway grids stay as reference for the brand trios and for the four boards still owed (§4). The glossary's per-TERM imagery (a board per dress code or trend) is a later ask of the same shape: one board, eight frames, a descriptor line.

---

## Part 3 · One prompt, one look

### 3.1 What changes

| Today | Proposed |
|---|---|
| `/api/style` → three ways → the keep-or-pass deck → Suggested | `/api/style` → **one look** → opens straight on its page (the suggested look, F8) with the box docked reading **"Change the look…"** |
| Variety = three registers at once ("one easier, one sharper, one unexpected") | Variety = her words. The box's every verb is already built: swap, how it's worn, put back, a rule, a draft, clarify (`/api/look/ask`). Add one intent, **"another"** ("show me something else", "not this"), which re-runs the ask with this look under ALREADY SHOWN and her thread as the adjustment — the second look is a second answer, never the first again |
| Keep / pass → events, nothing learns | Every change in the box lands on the memory (it already does: swap, ask, rule) and **Save is the verdict** — a kept look with no change is a clean positive; a look saved after three swaps says what was wrong in its swaps; a look let go is a `k:'verdict', v:0` with her last line as the note |
| Three frames, serial, ~2 minutes on the overlay | One frame, ~35 seconds; a change re-draws through frame mode (already built — the frame holds the scene, only the garments change) |

The key piece's "three ways" goes the same way for consistency (Annie's one-experience rule): one look around the piece, "another" for the next — unless Liberty argues the piece page is where three registers earn their place. Decision in §4.

### 3.2 The build, in order

1. `STYLE_SCHEMA` takes `ways` of exactly one on a `one: true` body; the THREE WAYS block becomes ONE LOOK ("the one answer to this ask — the register her words and the occasion decide"); `wantsNew` keeps its clauses. The text budget drops to ~1,400 tokens.
2. `_lkSuggLand` mints one row and opens `__lkSuggOpen` directly — F8 with ‹ Home, the box docked in `look` mode, placeholder "Change the look…". The deck (`_lkDeckOpen`) retires behind `var _RB_ONE_LOOK = true` (the `_RB_TRIP_HIDDEN` pattern) so nothing is deleted on day one.
3. `/api/look/ask` gains intent 7, `another`, routed client-side to `_cbStyleSubmit` with `recent` = this look + the thread's lines as `balanceNote`-style words.
4. Memory: `k:'verdict'` on Save (v:1) and on Remove from the page (v:0, her last line), the deck's events retired.
5. Harness: `inspiration_smoke`'s landing sections rewritten to the one look + box; `looks_harness` deck section behind the flag; the clarify chip pinned once.

### 3.3 What it costs and what it risks

Cheaper per ask by two-thirds in frames and text; dearer per *session* if she asks "another" three times — the same tokens, spent one at a time, which is the right shape (she pays for what she looks at). The risk is the first look landing flat with no comparison beside it: the glossary read (§1) is what makes the one look right first time, so Part 1 ships before Part 3, not after.

---

## 4 · Decisions before building

1. ~~**Romantic**~~ — settled by the boards (27 Oct): the ten registers are the app's ten with Modern and Off-duty in, Romantic out.
2. **Non-binary**: the deck implies a `gender_identity` value the enum lacks (woman · man · unspecified). Add `non-binary`, or treat `unspecified` as that deck? And every generation's `genderDirective` needs the third branch written — today `unspecified` means "model's judgement, gender-neutral when nothing points".
3. **Hard nos vs her words today**: the order in §1.2 (hard nos first). Liberty's document puts explicit instruction first.
4. **The clarify question**: at most one per new ask, resolver-decided, chips with the default first — or never (the standing "the box never questions her" rule, 1 Oct).
5. **Where the feed lives**: Airtable (recommended, connected) or a sheet.
6. **The key piece**: one look or three around a piece.
7. **The four boards owed**: women's Minimal and Utility, men's Classic and Avant-garde — Liberty, before onboarding is built.
8. **Men's Eclectic**: a different register for men (say so in the glossary) or a board redrawn to the women's register.
9. **One house trio per cell**: the women's boards and three non-binary boards carry none; confirm the grid trios or supply new ones.
10. **Gender-Fluid**: a deck card that maps to no register — keep it as a modifier, or fold it.

## 5 · Sequencing

| Slice | What | Depends on | Size |
|---|---|---|---|
| A | `stylist_language.js`: the glossary as data, the resolver, the hierarchy block, the test | nothing | one session |
| B | The archetype registry out of `settings.html`, per gender, houses + descriptor lines in the prompt, the boards as the deck's tiles | decisions 2, 7, 8, 9, 10 and design's onboarding deck | one session |
| C | The Airtable table + the pull script + JSON + admin `read` column; Liberty's first Monday | A | one session + onboarding Liberty |
| D | One look per ask, "another", Save as the verdict, the deck behind a flag | A (so the one look lands right); decisions 4, 6 | two sessions, the harnesses included |
| E | The golden set against the live model, weekly | A, C | half a session, then Liberty's ritual |
