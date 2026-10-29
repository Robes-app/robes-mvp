# The stylist's language — Liberty's glossary in the prompt, a weekly feed, one look per ask (build brief)

**Date**: 2026-10-22, updated 2026-10-28 (Landscape-Aware Styling) · **Branch**: `beta` · **Status**: slice P built 2026-10-29 on beta and the platform (history 2026-10-29); the rest is brief
**Sources**: Liberty's *Fashion Language Glossary & Context* (22 Oct), her four archetype grids (women ×2, men, non-binary), her 24 street-style boards (25 Oct), her *Landscape-Aware Styling* (28 Oct), Annie's call that one prompt should return ONE look refined through the box
**Companion briefs**: `docs/style-memory-brief.md` (the memory every prompt reads), `docs/look-prompt-brief.md` (the box and `/api/look/ask`), `docs/front-door-brief.md`

## What Liberty's material says, in one paragraph

The glossary is not a dictionary. It is a **reading protocol**: identify the intention, the occasion and the dress code; translate colloquialisms into visual characteristics; cross-reference with her Style DNA and wardrobe; combine references into ONE cohesive outfit (dominant aesthetic + the second reference as an accent); let her explicit words and hard nos beat the convention; ask only when the ambiguity materially changes the outfit. Every term carries the same four fields — **meaning · visual characteristics · AI instruction · avoid** — and a priority hierarchy sits above all of it: explicit instruction › occasion, dress code, cultural and practical requirements › established personal preferences › the requested aesthetic or trend › general convention. The trend terms map onto Robes' own archetypes (Blokecore → Off-duty, Office siren → Classic, Mob wife → Eclectic, Clean girl → Minimal…) and Liberty wants to refresh them weekly.

**Landscape-Aware Styling (28 Oct)** adds the place. Its first line is the rule: **"Landscape is a styling consideration, not a standalone style archetype."** The place decides the practical things (fabric, footwear, layers, outerwear) for her weather, terrain and activity. Her style decides everything else. A country weekend is not tweed and a coast is not stripes unless her style already is. The document has three parts. Eight principles come first, then six categories with what to consider (countryside, city, seaside, mountain and outdoor, village, resort). Next is a seven-step build order and a clarify rule ("walking a coastal path vs lunch at a seaside restaurant"). Last is a **recognition table**: ten settings (city, country, coast, mountains, outdoors, village, resort, desert, tropics, lakeside and riverside), each with the client phrases Robes should recognise, contextual variations and a recognition note saying what to distinguish. Ten global rules close it. One phrase can map to several contexts ("weekend away" names no landscape). Several landscapes can coexist ("a city by the sea"). A named destination refines the context without setting a dress code. Weather, climate and terrain are practical inputs used when known, never assumed.

## Where the prompt stands today — an audit before the plan

Read `server.js` `/api/style` (line 611) and `style_dna.js` `styleDnaPromptBlock` against the glossary, and (28 Oct) against the landscape document. Six findings.

**Finding 1 — the hierarchy already exists, and it is nearly Liberty's.** The shared block renders, in order: HER HARD NOS → HER STYLE BRIEF → the memory → STYLE TYPE / ICONS / BRANDS / INVESTMENT / THE FACTS → STYLE DNA (guidance, not law) → HER COLOURS; `/api/style` then adds the formula, the sanity check, the wardrobe, where the pieces come from, and what was already shown. Liberty's hierarchy differs in ONE row: she puts **the occasion and dress code** second, and Robes has **no occasion layer at all** — "Her words" go to the model raw and formality is left to its judgement. That is the gap every dress-code entry in the glossary is written to close.

**Finding 2 — the archetype catalog is not one catalog.** The app's ten (`settings.html` `ARCHETYPES`: Minimal, Bohemian, Classic, Romantic, Sculptural, Utility, Heritage, Eclectic, Off-duty, Avant-garde) and Liberty's grids disagree in two places: she has **Modern** (Zara, Phoebe Philo, Auralee / Our Legacy, Celine) and no Romantic; the trend map names **Off Duty** and **Avant Guard**, which her women's grids do not draw. Her men's grid is eight registers with eight brand trios; the non-binary grid is a different vocabulary altogether (Androgynous Minimalist, Gender-Fluid, Tomboy-Leaning, Soft Masc/Femme, Punk/Alt, Bold Maximalist, Utility, Modern). And the `BRAND_SEED` / `ICON_SEED` maps live in the settings page, so **an archetype's houses reach a prompt only through the brands she happened to tick** — the model never reads "Minimal means The Row, COS, Lemaire" for a man or a woman who skipped the brand wall.

**Finding 3 — the deck's keep and pass reach nothing.** `deck_kept` / `deck_done` are analytics events only; the memory (`MEMORY_KINDS`: verdict, swap, wear, strike, ask) never sees them, and ALREADY SHOWN reads the last four sets regardless of what she kept. The signals that DO reach the next prompt are the ones the box writes: a swap (`k:'swap'`), a line she typed (`k:'ask'`), a rule, a wear. Annie's instinct is right on the data as well as the UX: the box is already the learning surface; the deck never was.

**Finding 4 — the place she names is overruled by the place she is in (live, 28 Oct).** The trip is hidden, so every ask goes to `/api/style` in daily mode (`_rbHbRoute`, dashboard-personalize ~35851). The client sends `context.city` from her geolocated weather pill (`window.__rbCtx`, ~31117). The server then writes `Real-time context: London · October | 8°C – 13°C | Rain. Dress the user for exactly this weather and place.` (server.js ~720). So "a weekend in the Alps" or "a beach day in Mallorca" typed in London is dressed for London rain, told twice that London is *the place*. Her words carry the destination, but the rtLine contradicts it and wins on specificity. The server already has the fix: `fetchTripWeather(destination, dateFrom, dateTo)` (~2362) geocodes a place and returns the live forecast inside 16 days, or the seasonal average outside it. Only the parked trip calls it. Liberty's global rule 9 ("weather, climate and terrain as practical inputs when known, rather than unsupported assumptions") is broken here by wrong data, not by missing data.

**Finding 5 — three prompts already read a place as an aesthetic.** `/api/travel` (hidden) asks the model to name a "Location Vibe (e.g. Refined Mediterranean Minimalism)" and renders it as a tag on the trip page (`data.location_vibe`). `/api/intent`'s `vibe` example is "refined Mediterranean". `/api/moodboard` (hidden) asks for a destination atmosphere ("sun-bleached cobblestone"). Each one turns a landscape label into a style, which is the opposite of Liberty's rule 8 ("never treat a landscape label as an instruction to adopt a stereotypical aesthetic"). Only `/api/intent` is still reachable, and only with `?trip=on`; its example goes now. The travel and moodboard prompts join their relaunch checklists (the trip's is in the history's 2026-10-10 entry).

**Finding 6 — the formula already names the place's job, in one word.** THE FORMULA's Anchor is "the hero piece for the weather and agenda", and THE SCENE names "the setting". There is no line saying the place is practical and never stylistic, and no setting distinctions (a coastal walk vs a seaside lunch). Left alone, the model takes the place's cliché and passes it off as context.

---

## Part 1 · The prompt, restructured on the glossary

### 1.1 One module, one seam — `stylist_language.js`

The `style_dna.js` / `wardrobe_taxonomy.js` precedent: a root ES module that holds the vocabulary as **data**, exports a resolver and a renderer, and is injected through the one seam every generation already passes (`styleDnaPromptBlock` and the `/api/style` system prompt). No per-endpoint prose.

```
GLOSSARY = [{
  term: 'smart casual', kind: 'dress_code',          // dress_code | aesthetic | trend | styling_verb | cultural | landscape | season
  aliases: ['casual friday', 'jeans and a nice top', 'casual date night', 'after-work drinks'],
  meaning, visual, instruction, avoid,              // Liberty's four fields, verbatim
  archetype: null,                                  // trends carry one: 'Off-duty', 'Classic'…
  contexts: { 'creative workplace': '…', 'client lunch': '…' },   // where she wrote them
  since: '2026-10-22', status: 'enduring'            // enduring | emerging | peaking | fading | retired
}, …]
```

`readAsk(prompt, thread)` — **deterministic, zero tokens**: alias and term matching over her words (word-boundary, the `\bweek\b` lesson), returning `{dressCode, aesthetics[], modifiers[], cultural[], trends[], landscapes[], activity, destination}` (the place fields are in §1.6). `stylistLanguageBlock(read, opts)` renders ONLY the matched entries — instruction + avoid, never the whole glossary (it is ~6,000 words; the whole thing in every prompt would double the cost of a call the 13 Oct pass just cut by a third). Nothing matched → no block, the prompt is what it is today.

### 1.2 The hierarchy, said once, in Liberty's order

Replace the implicit ordering with ONE explicit numbered block at the top of every stylist prompt, so primacy and the text agree:

```
HOW TO READ THIS BRIEF — in this order, the first that applies decides:
1. HER HARD NOS — absolute. (unchanged: she confirmed them)
2. HER WORDS TODAY — what she asked for by name, she gets; a modifier ("a bit edgy") is an accent on the dominant ask, never a second outfit.
3. THE OCCASION AND THE PLACE — the dress code; the landscape, what she does there, its weather and terrain; any practical or cultural requirement. The place decides fabric, weight, footwear, layers and outerwear, and never the aesthetic. [the resolved dress-code and landscape entries render HERE — §1.6]
4. HER STYLE BRIEF — what she has told Robes works, confirmed by her.
5. THE AESTHETIC OR TREND she named. [resolved entries render HERE, with their archetype]
6. HER STYLE TYPE, ICONS, HOUSES. 7. STYLE DNA — guidance. 8. General convention — last, and only to fill what nothing above decides.
```

One deliberate reconciliation, flagged for Liberty: her hierarchy puts explicit instruction FIRST and preferences third; Robes puts hard nos first because she confirmed them in Settings and "I don't wear double denim" said in a look's box is deliberately NOT a rule (13 Oct). The order above keeps both: a hard no is a confirmed instruction, so it outranks today's words; everything else follows Liberty.

A second reconciliation, from the landscape document: its principle 8 ranks her explicit preferences over convention "**except where safety or essential practical considerations apply**". That is a row above HER WORDS TODAY that only fires on terrain. In the order above, heels on a coastal path she asked for by name get heels. The proposal in §4b (L1): her named piece stays, everything around it is built for the terrain, and the panel note says the trade-off in one line. On a technical activity only (skiing, a hike, a mountain trail), the safe piece replaces hers and the note says why.

### 1.3 The three glossary rules the prompt does not yet carry

- **Combined requests** (her "quiet luxury meets streetwear" section): "Identify the dominant aesthetic and use the secondary reference as an accent or modifier. Do not apply every feature of both." The resolver returns the first aesthetic as dominant and the rest as modifiers; the block says so in those words.
- **Dress-code contexts**: "smart casual" alone is under-specified; with "creative office" / "client lunch" / "weekend" in the ask the resolver picks the context line. This is the `_rbAskDateFrom` pattern applied to place and company.
- **The clarify rule** (her rule 8): "ask only when the ambiguity materially affects the outfit — otherwise make a reasonable interpretation and proceed." Today the box never questions her except WHERE THE PIECES COME FROM. Recommendation: allow AT MOST ONE question per new ask, asked the way the balance question is — one line and chips with the default first ("Smart casual — or dressier?" · *Smart casual* · *Dressier* · *Or say it*), decided by the resolver (two dress codes matched, or a date-night ask with no mood word — Liberty's own "infer understated, romantic, confident, playful, glamorous or fashion-forward"). The model is never the one deciding to ask on a new look; `/api/look/ask`'s `clarify` intent already covers an edit.

The landscape document makes the same rule twice ("ask a concise clarifying question" when the setting or activity "materially affects the outfit"; global rule 4, "one short clarifying question"), and gives the canonical case: **a coastal path or a seaside lunch**. That adds two resolver triggers. **(a)** A landscape matched with no activity, where the landscape is marked `splits` (coast, mountains, outdoors, lakeside, resort, country). Example: "A coast walk — or lunch by the sea?" · *Walk* · *Lunch* · *Or say it*. **(b)** A trip phrase with no landscape ("a weekend away", "going away"). Example: "Where to?" · *City* · *Country* · *Coast* · *Or say it*, where a named place answers it in her words. Still at most one question per ask: when a dress-code ambiguity and a place ambiguity both fire, the place asks, since it changes more pieces (footwear and outerwear). Liberty supplies the chips per landscape (§4b, L6). How the questions share one stop with the pieces question, which stops repeating, is in `docs/clarify-questions-brief.md`.

### 1.4 Hard nos meet the glossary

Liberty's worked examples ("elevated casual, blazers are a hard no → a refined cardigan or overshirt, never the blazer"; "bohemian, but no florals → texture and layering, never the print") are exactly the case where a glossary entry's *visual characteristics* name the thing her hard no excludes. The renderer should say it generically once: "Where a term's usual pieces meet one of her hard nos, the hard no wins and the term is served by its OTHER characteristics." The same holds for a landscape: "a muddy dog walk, trainers are a hard no → boots, never the trainer". Testable (§1.8).

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

**Agreed 29 Oct (Annie with Liberty)**: women, men and non-binary keep ONE consistent set of archetypes — the same registers for all three, not a separate non-binary vocabulary. Liberty's non-binary set landed in Drive the same day (`Lib Style Archetypes`, image1–8.png); Drive reads no text from them, so they are transcribed by hand before slice B. That settles most of decision 10 (Gender-Fluid is not its own register) and the shape of decision 2.

**Owed and open** (§4): four boards before onboarding can ship (women's Minimal and Utility, men's Classic and Avant-garde — the grids cover all four, the street boards do not exist yet); the men's Eclectic board reads as cream-and-khaki relaxed tailoring, closer to men's Modern than to the women's leopard-and-patchwork Eclectic — either the register means something different for men and the glossary should say so, or the board needs the women's register; one house trio per cell; whether Gender-Fluid stays a deck card; the non-binary deck implies a `gender_identity` value the enum lacks.

### 1.6 The place — Liberty's landscapes (28 Oct)

**The rule the whole section serves**: the place is an input to the **occasion** row (§1.2, row 3), never to the **aesthetic** row. The place's entries carry what it asks of the clothes (weather, terrain, activity, what to distinguish) and no visual field at all. That is deliberate: a landscape row with a `visual` field is the stereotype Liberty's rule 8 forbids.

**The data**: one glossary row per landscape, ten rows in all. Fields come from her document, verbatim where she wrote them:

```
{ term: 'coast', kind: 'landscape',
  aliases: ['by the sea', 'seaside', 'seaside town', 'a beach holiday', 'on the waterfront', …],   // her "client language"
  contexts: { 'coastal walking': '…', 'beach-to-bar': '…', 'coastal town dressing': '…', … },     // her "contextual variations" — the line per context is owed (L5)
  consider: 'wind, sun, salt air, temperature changes, breathable fabrics, the intended activity', // her categories section
  distinguish: 'a British seaside town · a Mediterranean resort · a beach club · a coastal walk · a day on the sand', // her recognition note
  avoid: '…',                                        // mandatory in the feed (§2.1); she wrote one for country only (L4)
  splits: ['A coast walk', 'Lunch by the sea'],      // the clarify chips, default first (L6)
  destinations: [],                                  // named places that imply it: Marrakech → desert, Bali → tropics
  since: '2026-10-28', status: 'enduring' }
```

Where her two sections disagree, the recognition table (ten settings) wins, being the later and fuller one. The categories section's "Mountain and outdoor" splits into **mountains** and **outdoors**. **Desert**, **tropics** and **lakeside & riverside** have recognition notes but no consider line; I draft those three from the notes and she confirms them (L3).

**The resolver** (zero tokens, §1.1) adds three fields to its read, plus a rule for weak phrases:
- `landscapes[]`: every landscape matched, at most two rendered. "A city by the sea" is city + coast, per her global rule 6. Aliases she listed under two settings stay under both: the Cotswolds (country, village), après-ski (mountains, resort), a beach resort (coast, resort), lakeside (outdoors, lakeside), a countryside walk (country, outdoors). A match on two is the "multiple attributes coexist" case, not a conflict (L8).
- `activity`: a matched context ("a muddy dog walk", "après-ski", "a lakeside lunch") or a plain activity word (walk, hike, ski, swim, boat, lunch, dinner, pool). The activity is what the clarify rule needs (§1.3) and what most changes the footwear.
- `destination`: a place she wrote. It comes from the module's list (every place in her document, plus the ones she adds), or from a guarded capture of a capitalised name after *in / to / at / around* that the geocoder confirms. **Never inferred.** This is the same non-negotiable as `/api/intent`'s rule 1 ("'Somewhere warm' is NOT a destination"). A destination always sets the weather. It sets a landscape only through the module's `destinations` list: "a weekend in Lyon" gets Lyon's weather and the constant line below, never a guessed landscape.
- **Weak aliases** match only when nothing stronger names the place: "going into town" (city or small town, her own note), "out of town", "outside", "holiday". "A weekend away" matches no landscape; it is a clarify trigger (§1.3 b).

**The block**: it renders at row 3 only when a landscape or destination matched. It is about sixty words, and its slots are filled from the row and the read:

```
THE PLACE — the coast · coastal walking · Cornwall, Saturday: 9–14°C, showers (forecast there).
The place decides fabric, weight, footwear, layers and outerwear; her style decides the rest — dress HER (Minimal) for it, never a costume of it.
Consider: wind, sun, salt air, temperature changes, breathable fabrics.
Distinguish: a British seaside town is not a Mediterranean resort, a beach club or a day on the sand.
Never: [the row's avoid].
```

**One constant line** goes in every stylist prompt, matched or not, appended to THE SANITY CHECK. It is Liberty's success criterion in ~30 words: "A place she names is a practical input, never a style. The look reads as hers, adapted to where she is going, never a generic outfit made from the place's name." This is the one landscape rule worth the tokens on every call. Without it, an unmatched "a weekend in Lyon" still gets the cliché.

**The weather follows the place she names** (Finding 4). Server-side in `/api/style` and `/api/daily`, four rungs, the first that applies decides:
1. Where `read.destination` is set, `fetchTripWeather(destination, date, date)` runs. It already exists and already falls back to the seasonal average past the 16-day horizon. The date is the ask's own (`context.date`, from `_rbAskDateFrom`) or today. It runs under a 2.5s cap (`fetchJson` takes `ms`; the trip's 6s is too long for a box ask), and a miss drops to the next rung.
   - A forecast → `She is dressing for Cornwall, Saturday 1 November. Forecast there: 9°C – 14°C, showers.` Her home city is not mentioned.
2. A destination but no forecast → `She is dressing for Cornwall in November — dress for its climate then, not for where she is now.`
3. A landscape matched with no destination ("a weekend by the sea") → her city's forecast is kept but demoted: `Where she is now: London, 8°C – 13°C, rain. Her words put the look somewhere else; use this only as a guide to the season.`
4. Nothing matched → today's line, unchanged ("Dress the user for exactly this weather and place").

The ask needs no client change; it keeps sending `context`. `logAI` gains `place: {landscapes, activity, destination, wx: 'there'|'season'|'home'}` beside `read`, so the admin trail shows which weather a look was dressed for.

**What a look remembers**: the place a look was made for is filed on it, as `data.place` on the saved look (inside the jsonb, so no column and no migration). An edit in the box then keeps the coast: `/api/look/ask`'s `context` gains `place`, beside `day` / `weather` / `occasion` / `trip`, so "make it warmer" means warmer *there*. A `setting` facet in `look_tags` (for "my coast looks") is a later decision, not this slice (§4a, decision 12).

**The fashion calendar**: her note on *resort* is a collision the resolver has to settle. "Resort" is a holiday, and it is also a season (Spring/Summer, Autumn/Winter, Resort, Cruise, Pre-Fall). Six `season` rows carry the calendar terms. The resolver reads *resort* as the season only next to *collection*, *season*, a year ("resort 27") or a shopping verb, and as the holiday otherwise. Each season row maps onto ADR-002's three climate bands, so "something from the resort collection" tilts `look_tags.climate` (L7).

**Not rendered: her seven-step build order** (archetype → landscape → occasion → climate → garments → aesthetic → check). It is a reasoning order, and THE FORMULA already is Robes' build order. Rendering both would give the model two procedures. Her steps 2–4 are in THE PLACE block, and step 7 is the success-criterion line above.

### 1.7 Where it lands — the endpoints

The block rides `styleDnaPromptBlock`'s call sites by passing `read` in `opts`, so every surface inherits it: `/api/style`, `/api/daily`, `/api/look/ask`, `/api/look/refine`, `/api/travel/looks`, `/api/alternates`, `/api/lookbuild/note`. The resolver runs server-side on `prompt` / `text` / `refine`. `/api/intent`'s `vibe` field (the one thing the classifier still extracts) is superseded by the resolver's read, at zero tokens. `logAI` logs `read: ['smart casual', 'quiet luxury']` beside `balance`, so the admin trail shows which entries fired on each call — Liberty's review surface (§2.4).

### 1.8 How it is tested

- `scripts/stylist_language_test.mjs` (the `style_dna_block_test` precedent): the resolver on forty asks Liberty writes with the expected read; the block's order; a hard no removing a term's usual piece.
- **A golden set the live model is held to**: twenty of Liberty's asks with a checkable expectation on `pieces[]` — "business casual → no jeans", "elevated casual + blazer hard no → no blazer", "date night → never assumes heels", "St Patrick's Day → green somewhere". Run against beta weekly (the keys live on Railway), read in `/admin`. This is the only honest test of "aligned with her recommendations": the prompt text is not the proof, the pieces are.
- **The place, in the same two layers.** Resolver cases (deterministic): "a weekend in the Cotswolds" → country + village; "a city by the sea" → city + coast; "a weekend away" → no landscape, clarify (b); "the resort collection" → season, not landscape; "dinner at Sketch" → no destination (a capitalised name that is a restaurant, not a place, must never geocode into a landscape); "going into town" alone → weak city. The weather rungs, with the geocoder stubbed: a named place + a date in range → *forecast there*; out of range → *season*; a landscape with no place → home demoted; nothing → today's line, byte-identical. Golden-set additions for Liberty to sharpen (L10): "a muddy dog walk" → no heels, no suede, a boot or a grippy flat; "a coastal path in October" → a wind layer and flat footwear; "a ski day" → technical outerwear; "dinner at the mountain restaurant" → no ski wear; "a country weekend" for a Minimal profile → no tweed, no wax jacket, no gilet she doesn't own; "a tropical holiday" → nothing assumes swimwear; "Marrakech in December" → an evening layer. The landscape doc's test is "the look is recognisably hers". Liberty reads that one by eye in the weekly admin pass (§2.4), since no assertion on `pieces[]` can check it.

### 1.9 Every prompt edit this brief makes, in one list

Line numbers are `server.js` on `231a8a7`. "Slice" is §5's.

| # | Prompt | Today | Change | Slice |
|---|---|---|---|---|
| 1 | `/api/style` rtLine (~720) | `Real-time context: {her city}… Dress the user for exactly this weather and place.` on every ask | The four rungs of §1.6: forecast *there* · season *there* · home demoted · unchanged | **P** |
| 2 | `/api/daily` rtLine (~1274) | `REAL-TIME CONTEXT… This is the atmospheric reality` (her city) | Same four rungs, same helper | **P** |
| 3 | `/api/style` THE FORMULA | Anchor = "the hero piece for the weather and agenda" | "…for the weather, the place and what she does there" | **P** |
| 4 | `/api/style` SANITY CHECK | no place rule | + the success-criterion line (§1.6) — on every call | **P** |
| 5 | `/api/style` THE SCENE | "the occasion, the setting, the mood" | "the setting is the place she named, as it is in that season — never its postcard" (the scene also drives the frame) | **P** |
| 6 | `/api/look/ask` ctx (~1818) | day · weather · occasion · trip | + `place: "the coast · coastal walking"` from the look's `data.place` | **P** |
| 7 | every stylist prompt | implicit order | the HOW TO READ THIS BRIEF block (§1.2), row 3 now OCCASION AND THE PLACE | A |
| 8 | `styleDnaPromptBlock` (`opts.read`) | — | matched glossary entries at rows 3 and 5; THE PLACE block at row 3 | A |
| 9 | `/api/style` STYLE_SCHEMA + THREE WAYS | three ways | ONE LOOK (§3.2) | D |
| 10 | `/api/intent` (~2170) | `vibe` example "refined Mediterranean" | Drop the example now (it teaches place-as-aesthetic); the field itself retires to the resolver (§1.7) | A |
| 11 | `/api/travel` (~2559) | "the Location Vibe (… 'Refined Mediterranean Minimalism')", shown as a trip tag | **Relaunch checklist**: `location_read`, the practical read of the place ("hot days, cold evenings, cobbles"), plus THE PLACE block on `dest` | trip relaunch |
| 12 | `/api/travel/looks` (~2886) | MICRO-CLIMATE only | **Relaunch checklist**: THE PLACE block on `dest` | trip relaunch |
| 13 | `/api/moodboard` (~4471) | "destination, climate, occasion, and aesthetic must all reflect it" | **Relaunch checklist** (`_RB_MB_HIDDEN`): the place reflects climate and setting, never the aesthetic | moodboards relaunch |
| 14 | `logAI` | `balance` | + `read`, + `place` with its weather rung | A, P |

---

## Part 2 · Liberty's weekly feed — a format the prompt can read

The LLM does not learn; it reads. "Gets smarter each week" means **fresher rows in the context**, nothing else — so the format has to be rows, not prose, and every row has to carry the four fields the prompt renders.

### 2.1 The format: one table, one row per term

An Airtable table **Stylist language** (Airtable is already in the stack and connected) with these columns, the glossary document converted into its first ~45 rows by me, Liberty adding from there:

| Column | Rule |
|---|---|
| `term` | one term per row, lower case |
| `kind` | dress_code · aesthetic · trend · styling_verb · cultural · season_note · **landscape** · **season** (the fashion calendar, §1.6) |
| `aliases` | the customer language, comma-separated ("casual Friday, jeans and a nice top") |
| `meaning` · `visual` · `instruction` · `avoid` | her four fields. **`instruction` is imperative, `avoid` is mandatory** — the avoid line is what stops the generic read |
| `archetype` | one of the registry (trends only) |
| `gender_scope` | all · women · men · non-binary |
| `status` | enduring · emerging · peaking · fading · retired — **retire, never delete** ("preserve historical meanings") |
| `week_of` | the Monday she wrote or last changed it |
| `sources` | links, optional |
| `example_pieces` · `example_houses` | optional, for the visual grounding row |
| `consider` · `distinguish` · `splits` · `destinations` | **landscape rows only**, in place of `meaning` and `visual`, which a landscape leaves empty on purpose (§1.6). `contexts` carries her variations as `context: one line`, one per line |

Liberty's landscape document converts into ten `landscape` rows and six `season` rows on day one. Her client phrases become `aliases`, her variations `contexts`, her categories lines `consider` and her recognition notes `distinguish`. What it leaves empty is listed in §4b.

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

### 4a · Annie

1. ~~**Romantic**~~ — settled by the boards (27 Oct): the ten registers are the app's ten with Modern and Off-duty in, Romantic out.
2. **Non-binary**: the deck implies a `gender_identity` value the enum lacks (woman · man · unspecified). Add `non-binary`, or treat `unspecified` as that deck? And every generation's `genderDirective` needs the third branch written — today `unspecified` means "model's judgement, gender-neutral when nothing points".
3. **Hard nos vs her words today**: the order in §1.2 (hard nos first). Liberty's document puts explicit instruction first.
4. **The clarify question**: at most one per new ask, resolver-decided, chips with the default first — or never (the standing "the box never questions her" rule, 1 Oct). *28 Oct*: the landscape document asks for exactly this, twice (§1.3). Superseded by `docs/clarify-questions-brief.md`: one stop per ask with up to two rows, the pieces question asked once and then kept as a chip, and everything else assumed and shown on the look.
5. **Where the feed lives**: Airtable (recommended, connected) or a sheet.
6. **The key piece**: one look or three around a piece.
7. **The four boards owed**: women's Minimal and Utility, men's Classic and Avant-garde — Liberty, before onboarding is built.
8. **Men's Eclectic**: a different register for men (say so in the glossary) or a board redrawn to the women's register.
9. **One house trio per cell**: the women's boards and three non-binary boards carry none; confirm the grid trios or supply new ones.
10. **Gender-Fluid**: a deck card that maps to no register — keep it as a modifier, or fold it.
11. ~~**Ship the weather fix first**~~ — **built 2026-10-29** on beta (`server.js`, `landscapes.js`, `scripts/landscape_test.mjs`) and the platform (`@robes/core/landscape`, style-piece v5, daily v4), so staging and native carry it once the workers deploy. Not yet: the place filed on a saved look for `/api/look/ask` (§1.9 row 6). (Slice P, Finding 4.) It is a live bug: a named place is dressed for her home forecast. It needs nothing from Liberty, using only the destination capture and the four weather rungs, with a stub landscape list taken from her client phrases as they stand. Recommendation: yes, ahead of A.
12. **A `setting` facet on looks** (`look_tags.setting`: city · country · coast…, inside `data`, so no migration) for "my coast looks" in the Lookbook. It is later, after P has filed `data.place` on enough looks to show whether she searches by place.

### 4b · Questions for Liberty — Landscape-Aware Styling (28 Oct)

Each has a recommendation, so a one-word reply settles it. Anything marked *owed* is writing only she can do; I can draft first drafts for her to correct.

- **L1 · Practical vs her words.** Your principle 8 lets safety and essential practicality override her explicit preference. Robes' rule is that what she asks for by name, she gets. *Proposal*: her named piece stays and everything around it is built for the terrain, with one line in the note ("Heels for the harbour — the rest is built for the wind"). On a technical activity only (skiing, a hike, a mountain trail), the safe piece replaces hers and the note says why. Is that the line, and is that the right list of technical activities?
- **L2 · Heels.** Your city line says heels are appropriate where she hasn't said the day is active. The glossary's golden set says date night never *assumes* heels. *Proposal*: heels are allowed in the city and at night, never the default, and only when her style and wardrobe already carry them. Agree?
- **L3 · Consider lines owed.** Your categories section covers six settings, and the recognition table covers ten. Outdoors (split from mountains), desert, tropics and lakeside & riverside have a recognition note but no consider line. I'll draft them from your notes for you to correct. Also: is "Mountain and outdoor" really two landscapes now?
- **L4 · An avoid line per landscape — owed.** The feed makes `avoid` mandatory: it is the line that stops the cliché. You wrote one for country ("not traditional or heritage clothing"). The other nine need theirs. Drafts to react to: coast, not nautical stripes and navy by default; mountains, no ski wear off the slopes; tropics, not every tropic is a beach; desert, not safari khaki; resort, not a kaftan by default; city, not head-to-toe black by default; village, not a costume of the country it's in.
- **L5 · Contextual variations — aliases, or contexts with their own instruction?** "A muddy dog walk" and "a country house weekend" share a landscape and almost no pieces. *Proposal*: each variation gets one instruction line of about ten words. Activities come first (muddy dog walk, coastal walking, après-ski, beach-to-bar, boating outfit), and the moods ("country casual") can stay aliases.
- **L6 · The clarify chips, two per landscape.** Your example is coast: *A coast walk* · *Lunch by the sea*. Same for mountains, outdoors, lakeside, resort and country, default first. Plus the chips for "a weekend away" with no place (proposed: *City* · *Country* · *Coast*).
- **L7 · Resort, the season.** When does "resort" mean the collection? *Proposal*: only next to *collection*, *season*, a year or a shopping verb. And how do the six calendar terms map onto Robes' three climate bands (spring/summer · autumn/winter · year-round)? *Proposal*: SS and Resort/Cruise → spring/summer; AW/FW → autumn/winter; Pre-Fall → year-round.
- **L8 · Phrases listed under two settings.** The Cotswolds is under country and village; après-ski under mountains and resort; a beach resort under coast and resort; lakeside under outdoors and lakeside; a countryside walk under country and outdoors. *Proposal*: they stay under both, per your rule 6, and both render. Or does each phrase have one home?
- **L9 · Cultural norms.** Your desert note names cultural norms, and your list names Marrakech and Dubai. Should Robes add a covering line (shoulders, knees) for a named place, and when: always, or only for a named activity (the medina, a mosque visit)? *Proposal*: only in your words, as a `cultural` row you write per place, never the model's own judgement.
- **L10 · Ten landscape asks for the golden set — owed.** Ten asks in her words, each with a checkable "never" or "always" on the pieces (my seven starters are in §1.8). They are what proves the place is read right, week on week.
- **L11 · Boards for landscapes?** The archetype boards show one register on one street. If landscapes ever get imagery, *proposal*: the same register in two places (Minimal in the city, Minimal on the coast), never a "coast look". This keeps landscape-as-styling visible in the pictures as well as in the prompt. Not needed for anything above; a yes or no is enough.

## 5 · Sequencing

| Slice | What | Depends on | Size |
|---|---|---|---|
| **P** | **The place, first** (decision 11): destination capture + the four weather rungs in `/api/style` and `/api/daily`; the success-criterion line; the Anchor and SCENE edits; `data.place` on the look and `place` in `/api/look/ask`'s context; `logAI.place`. §1.9 rows 1–6 | nothing (the landscape list ships as a stub, from her client phrases) | one session, `inspiration_smoke` + a resolver test |
| A | `stylist_language.js`: the glossary as data (Liberty's landscapes included, as the stub becomes the module), the resolver, the hierarchy block, THE PLACE block, the test | P's capture moves in | one session |
| B | The archetype registry out of `settings.html`, per gender, houses + descriptor lines in the prompt, the boards as the deck's tiles | decisions 2, 7, 8, 9, 10 and design's onboarding deck | one session |
| C | The Airtable table + the pull script + JSON + admin `read` column; Liberty's first Monday | A | one session + onboarding Liberty |
| D | One look per ask, "another", Save as the verdict, the deck behind a flag | A (so the one look lands right); decisions 4, 6 | two sessions, the harnesses included |
| E | The golden set against the live model, weekly | A, C | half a session, then Liberty's ritual |
