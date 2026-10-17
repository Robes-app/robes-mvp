# The front door · first run and the core loop

**Date**: 2026-10-17 · **Branch**: `beta` · **Status**: plan for design and engineering, from the Annie × Felix session of 16 Oct; the five decisions in §7 taken by Annie on 17 Oct; **Phase 0 built and on `beta` (17 Oct)** — see the as-built note under §5
**Source**: the 16 Oct transcript (Gemini notes, 1h44) · the live code on `beta` at `0359f8a` · **Published copy**: https://claude.ai/artifact/JCZ8fBNy3qpA12MANHUY3M
**Companion briefs**: `docs/look-states-brief.md` (one look, three states), `docs/digital-twin-brief.md` (Style DNA + the model), `docs/four-session-funnel-brief.md` (the four sessions), `docs/beta-ftue-ux-audit-2026-08-19.md`

One sentence: **the home is the onboarding.** A new account opens on four visual doors, one for each place she might be standing, every door ends on the same three looks, and the loop's next verb (swap, save, wear) is on the screen where she needs it, never behind Edit.

---

## 1 · What the meeting settled

Pulled from the transcript, not the summary. Timestamps are the Gemini headings.

| # | Thread (when) | What was said | Who | Status in the build |
|---|---|---|---|---|
| 1 | The core loop (03:35) | Onboard → add a piece → generate a look → schedule it → repeat. Everything should bring her back to that. | Annie | The loop exists end to end. Its verbs are not connected on screen (§2). |
| 2 | The fork failed (06:00, 48:28) | "Where do you want to start?" lost people: "you lose your grounding of what is this app". | Annie | Reverted 11 Oct. Home now carries a resolver-driven card (O1–O4) plus a list. |
| 3 | Why the fork failed (48:28) | A linear choice makes her worry about the path she didn't take; she can't see past it, can't come back, isn't in control. | Felix | The diagnosis the new design must answer: options on the home, not a gate. |
| 4 | As little onboarding as possible (08:45, 20:40) | Fewer steps, fewer questions, let people use it the way they want, no dictated order. Bubbles and tours mean the designer failed. | Felix | Onboarding is splash → name → piece → Composing → the deck. Short already. |
| 5 | The wow (13:04) | The wow is not the read of the piece. It is **the piece styled three ways on a model**. Keep it. | Annie, Felix agreed | Built: `/api/style` → the keep-or-pass deck. Broken on the day by a credit outage, not by code. |
| 6 | Meet her where she is (11:03, 34:02, 44:00) | Bus, sofa, toilet, in front of the wardrobe. The piece ask only serves the one who can photograph a piece now. The selfie in the mirror, the shoes on her feet, tapping brands: every entry point equally available and obvious. | Felix | The entry points exist as code. They are not presented as peers (§2). |
| 7 | The home must be visual (28:19, 31:52) | Lose the text, make it visual. Dashed slots that say what goes in and why. Concept, not content: a faded mass of looks, never a catalogue of looks she'd hate. | Felix, Annie (Alta) | The home cards are prose on white. |
| 8 | Break Style DNA apart (31:38, 33:55) | "Style DNA" means nothing to her; "add your brands" does. Three small buttons under one header beat one button with an explainer. | Felix | The walk is four cards behind one door. |
| 9 | Swap must be the obvious next move (15:09, 43:07) | On the three ways she should think "I own white sneakers" and swap them in, photographing them on the spot. Today it is Edit → Swap → Photograph, and nobody finds it. | Annie | The swap sheet with "Photograph one · swaps straight in" exists. It is reachable only from the draft composer. |
| 10 | Nobody knows looks can be scheduled (19:28) | "I had no idea how to schedule a look." | Tester, via Annie | The diary door is a 38px circle on the saved look's image. Suggested looks cannot be scheduled. The week strip hides until activation. |
| 11 | Feedback on waits (36:46) | Tell her what is coming while it generates; a better loading state on the three ways. | Felix, Annie | While the frames compose, the deck's card falls back to the piece (or her words) with a line of text under it, which reads as the result failing to load, not as a look being made. The fix is the scanner: a line sweeping the piece or the look up and down, with *Generating a look* evolving underneath (Annie, 17 Oct). The onboarding piece page already draws that scan line. |
| 12 | The generic model (17:24) | Three ways on three models of different backgrounds, badged "Generic model · build your twin". | Annie | One generic cell (`w-s4-h1-nt`) on the composer; a prompt-described model on the frames. |
| 13 | A persistent "n of 5 set up" (59:27) | A gamified element across domains (pieces, brands, twin), not just pieces. Never pressure, always "more in, more out". | Felix | The pieces ladder was built and removed. The G1 list is text. |
| 14 | Observations (1:03:36 → 1:12:39) | Transparency into what Robes thinks, structured correction. "Keep / Not me" reads as a double negative. **For MVP only save statements from direct feedback**; never infer from absent data (a never-worn cap). Drop "Robes" from the name. | Felix, Annie agreed | Settings' Robes observations drafts lines from the wardrobe read. The verbs are Keep / Not me. |
| 15 | The prompt as front door (30:48 → 1:25:01) | Annie: a prompt ("Saturday night") returns a visual to correct from. Felix: an empty text box is a chatbot; it needs a leap of faith, the output is unanchored, and she won't give it ten chances. Structure first, the prompt later. | Both | The box leads home for every account. Not settled on the call; settled below (§3.4). |
| 16 | Imagery for style types, logos for brands (1:35:34) | "What does Bohemian look like?" | Annie | `scripts/gen_archetype_tiles.mjs` exists; the manifest was never committed. |
| 17 | The premium pool (01:30) | Icons and brands read high-end only; the M&S shopper feels unwelcome. | Brand workshop, via Annie | The pools are the prototype's fifty plus Liberty's list. |
| 18 | Paste a link (09:51) | Keeps erroring in onboarding; take it out there. | Annie | `#kp-linkopen` on the piece page. |
| 19 | The outfit photo (12:04) | Her sister photographed what she was wearing; the single read took two pieces and "bugged out". | Annie | The multi-piece read exists in the add flow and the composer, not in onboarding. |
| 20 | Process (1:42:04) | Design first, send Felix an HTML, build in small chunks, check in before building. Never deploy a complex onboarding again. | Both | This brief's phasing. |
| 21 | The mobile app (1:37:26) | TestFlight imminent (`platform/`). | Annie | Anything built on `beta` is ported through the platform sync passes. |

Out of scope, noted: men and positioning (the workshop's question), prompt and styling quality (odd shoes, New Balance as a top), brand logos.

---

## 2 · The audit: the loop exists, its doors don't connect

Every step of Annie's loop is built. The friction is discovery: the verb for the next step lives one or two screens away from where she decides to take it.

| Loop step | Where it lives today | How she gets there | The friction |
|---|---|---|---|
| Add a piece | Onboarding piece page (photo or link); the add flow (`WA.open`, four ways); the home O3 card; the composer's hotspots and slot sheet; the swap sheet's "Photograph one". | Onboarding step 2; home's O3 card; the wardrobe `+`. | Onboarding takes ONE piece from ONE photo. An outfit photo fails. The multi-piece read (`_rbReadPieces`) is two doors away. |
| Generate a look | `/api/style` → the deck (three ways, keep or pass) → F8 the suggested look. | Onboarding's Composing; the piece page ✦; the home box with a piece attached; the prompt. | Works. The deck's first run teaches the swipe. The overlay before it says nothing about what is coming. |
| Make it hers (swap) | The wardrobe sheet in swap mode (`__cbWardrobePick` with `swap`): her pieces by category, "Photograph one · swaps straight in", one tap, Undo. | F8 → **Edit** → the draft composer → ↻ on a row. Or the saved look → Edit look → ↻. | Three taps and a mode change to do the one thing the deck invites. On F8 the rack is read-only by design (look-states brief). |
| Save | F8's bar: Edit · Save to lookbook. | One tap. | Fine. After Save the page reopens as a saved look. The diary is offered only when the ask named a day. |
| Schedule (wear) | The diary sheet (`__lkDiaryOpen`): a month, any day, "I wore this today". Doors: the circle on the saved look's image, the calendar circle on the Lookbook card, the day page's "Choose from your looks", the dated box. | Save, then find the circle. | Invisible. No verb says "wear". A suggested look cannot be scheduled. The week strip (H3) renders only once activated (five photographed pieces AND an own look). |
| Log the wear | The diary sheet's "I wore this today"; the day card after 19:00 "Wore it? Tap to log". | After scheduling. | Fine once she has scheduled. |
| Repeat | The home box; the piece page ✦; home's Suggested row. | Home. | The home for a new account is a card with prose and a list of the other three cards. |

What else is built and hidden:

- **The wishlist**: ♡ on every proposal row, the wishlist tab under Wardrobe, "I bought this" → the wardrobe. Nothing on the deck or F8 names it.
- **The piece page's ✦**: a piece styled three ways with photos as references. Reached from the wardrobe grid only.
- **Observations**: Settings → Robes observations, and one "Robes noticed" line on home after three saved looks. Keep / Not me.
- **The model badge**: "● Generic model ›" on the draft canvas opens the twin drawer. Not on the deck; the deck carries a text line.
- **Events**: `onboarding_step`, `home_render {stage}`, `look_generated`, `deck_done {kept}`, `look_saved_from_suggested`, `look_pinned`, `wear_confirmed`, `wardrobe_added`, `piece_swapped` all fire today. The funnel can be read in PostHog now; nothing new is needed to see the drop-offs.

---

## 3 · The model

### 3.1 One loop, said once

```
  a piece or a photo  ──▶  three ways on a model  ──▶  swap in yours  ──▶  save  ──▶  wear it on a day
        ▲                                                                                   │
        └──────────────────────────  the next piece, the next ask  ◀────────────────────────┘
```

Every door on the home ends at "three ways on a model". Every look carries the next verb on its own screen. That is the whole design.

### 3.2 Four doors, one for each place she is standing

The home for a fresh account is **the start board**: four visual tiles of equal weight. Each names a thing she can do right now and what she gets for it, in one line. No step numbers, no explainer, no "Style DNA".

| Door | Where she is | The tile (image + two lines) | Where it goes | What exists |
|---|---|---|---|---|
| **Photograph a piece** | In front of the wardrobe, or wearing it | A single garment on cream · *Styled three ways, on a model.* | The existing piece page (the ledger read, Composing) → the deck. | All of it. Route the home door to `/onboarding?step=piece` with ‹ Home until the add flow's filed screen grows "Style it three ways →". |
| **Snap what you're wearing** | On the sofa, at the mirror | A mirror selfie, faded · *Robes files each piece, then dresses today.* | The multi-piece read → "Robes sees three pieces" confirm → filed → one look for today from them. | The read (`/api/wardrobe/pieces`, `_showPieces`), the composer's start-from-photo (`_lkReadStart`). The handover to "a look for today" is new. |
| **Tap what feels like you** | On the bus, on the toilet; no camera, no effort | Four small frames of styles · *Brands, icons, the styles. Two minutes.* | The walk, card one an **image** deck (very me / not me), then brands, then icons. Ends on "Dress me for today →". | The walk (`/settings?walk=1`), the deck gesture, `/api/style` dress-me at zero pieces. The imagery and the closing door are new. |
| **Build your digital twin** | Alone, in good light | Two dashed 4:5 slots · *Two photographs. Every look, on you.* | The twin page; filing lands on the newest look, dressed. | All of it (`/settings?page=twin`, `rb_model_open_look`). |

Below the board: the prompt box, unchanged, with its standing placeholder. It is on the screen, it is not the first thing (§3.4).

A door is never a gate. She comes back to the board, the tile she used reads done, the other three stand. There is no order and nothing hidden behind a choice. This is the difference from the fork: the fork was a screen she passed through once; the board is the home.

### 3.3 The board shrinks into the meter

As tiles complete they fold into **one slim row at the top of home**: four marks, "Getting to know you", a tap on an undone mark reopens its door. It is Felix's persistent "n of 5" without a number (the standing rule: never a denominator, never lock language). Once all four are done the row goes, the home is the activated home (box, week strip, saved and suggested rows). The resolver already models this (`_rbHomeResolve`: `done.O1–O4`, `activated`); the board and the meter are its new renderers.

### 3.4 The prompt box: on the home, not the front door

Settled from the two positions on the call. Annie wants a visual starting point to correct from; Felix wants structure before free text. The board gives both: every door ends on three looks she can correct (swap, pass, "not me"), and none of them asks her to type into nothing. The box stays on the home from the first second, below the board, and leads the home once the board has folded. It is never the only thing on a fresh screen.

### 3.5 Rules the design must pass

Felix's principles from the call, as checks a mock can be held to.

1. **Every option is visible, equal, and reversible.** No fork, no step a tile hides behind, no path she can't come back from.
2. **Image first, six words at most.** A tile is a picture that says what goes there, a verb, and what she gets. If it needs a paragraph it is two tiles.
3. **Concept, not content.** Example imagery is faded, abstract, plural. Never a specific look she could mistake for a suggestion.
4. **Each step says it got more personal.** Three ways → on your pieces → on your model. The copy names the gain, never the task.
5. **The next verb is on the screen where she decides.** Swap on the three ways. Wear on the save. Photograph inside the swap. No Edit mode to reach a first move.
6. **Feedback on every wait.** What is being made, from what, on whom. Never a spinner alone.
7. **Robes states what it thinks and she corrects it in one tap.** Statements come from what she did, never from what she didn't do.
8. **No tours, no bubbles, no tooltips.** If a thing needs explaining, the design failed.
9. **Never a denominator, never a lock.** More in, more out, said once.

---

## 4 · The design brief (Annie in Claude Design → Felix on the HTML → build)

### 4.1 Frames to mock, 390 and 1280

1. **Home · fresh.** Masthead, the board (four tiles, 2×2 at 390, one row at 1280), the box beneath. Nothing else.
2. **Home · one door done.** The board with the piece tile folded into the meter row at the top, three tiles standing, Suggested row below the box with the three looks.
3. **Home · two and three done.** The meter growing, the board shrinking, the week strip appearing the moment one look is saved.
4. **Home · activated.** The meter gone. The standing home.
5. **The deck end state.** "Two kept." → thumbnails → **Save one, and pick a day to wear it** (the save and the wear in one breath).
6. **The suggested look (F8) with the swap on the rack.** Each proposal row: ↻ and *Have one like it? Photograph it*. Her rows: ↻ alone. The bar: Save to lookbook, and Discard once anything changed. No Edit.
7. **After Save.** The existing diary sheet opens itself over the saved look: the month, any day one tap, *I wore this today*. Nothing new to design; the frame shows the sheet arriving on Save.
8. **The three ways, loading: the scanner.** The piece (or her words) on the card with a rose line sweeping it top to bottom and back, the way the onboarding piece page reads a photograph. Under it one evolving line: *Generating a look* → *Choosing the shoes* → *Finding a layer* → *Setting the colour*, then *On a Robes model for now.* Three dots fill as frames land. The card never reads as the piece at rest.
9. **The style deck with imagery.** One type per card, two stills, very me / sometimes / not me.
10. **Observations.** Eyebrow *Observations*. Each line with its evidence and two verbs: *That's right* · *Not quite*.

### 4.2 Copy, provisional

Robes voice: declarative, warm, no "AI", no lock language, no denominators. Every line below is an offer she can decline.

| Where | Line |
|---|---|
| Board, piece tile | **Photograph a piece** · Styled three ways, on a model. |
| Board, outfit tile | **Snap what you're wearing** · Robes files each piece, then dresses today. |
| Board, taste tile | **Tap what feels like you** · Brands, icons, the styles. Two minutes. |
| Board, twin tile | **Build your digital twin** · Two photographs. Every look, on you. |
| Meter row | Getting to know you · four marks, the undone ones dashed |
| Deck, loading | Generating a look · Choosing the shoes · Finding a layer · Setting the colour, over the scan line, then *On a Robes model for now.* |
| Deck, done | Two kept. **Save one, and pick a day to wear it.** |
| F8, a proposal row | ↻ · *Have one like it? Photograph it* |
| After Save | The calendar opens. Its own copy stands; the toast reads **Saved to your lookbook**. |
| Week strip, first look | Dress today · a dashed card, the saved look one tap away |
| Observations, verbs | That's right · Not quite |
| Generic model badge | Generic model · make it you › |

### 4.3 What each tap leads to (Felix's "think through every path")

- **Photograph a piece** → the ledger read → Composing → the deck → tap a card → F8 → swap or save → the calendar → home with the meter and the Suggested row.
- **Snap what you're wearing** → "Robes sees three pieces" → confirm each (Yes · Skip · Already mine) → filed → *A look for today from these?* → the deck with one way, or the composer on the pieces → save → the calendar.
- **Tap what feels like you** → the image deck (ten cards, swipe) → brands (a wall that includes the high street) → icons → *Dress me for today →* → the deck (three ways on a Robes model, from her DNA and the weather) → F8.
- **Build your digital twin** → two photographs → the model files itself → *Build a look* lands on the newest look dressed, or on the board if there is none.
- **A done tile** → its page (the wardrobe, the Lookbook's Suggested tab, Style DNA, the twin).
- **The box**, any time → three ways from her words, as today.

---

## 5 · The engineering plan

Four phases, each shippable alone, each covered by the harness that already pins the surface. Phase 0 needs no design and can ship this week. Phase 1 waits for Felix's yes on the mock.

### Phase 0 · Connect the loop that exists (engineering now)

| # | Change | Where | Test |
|---|---|---|---|
| 0.1 | **Swap on the suggested look without Edit.** F8's proposal rows get ↻ (and her rows ↻) opening `__cbWardrobePick` in swap mode on the piece's category, Photograph one first. The first change flips the row to `draft` under the hood (`_lkSuggToDraft` + the apply) and the page stays put; the bar reads Discard · Save. | `_lkDetailHtml` (the `readOnly: true` branch ~17724), `__lkDPropSwap` / `__lkDSwapApply`, `__lkSuggEdit`. | `looks_harness`: the F8 section gains swap-without-Edit, Undo, status flip, Save. |
| 0.2 | **Save opens the calendar.** `__lkSuggSave` and `__lkSave` open the existing diary sheet every time, as it is: the month, any day one tap, *I wore this today*. No new chip row (Annie, 17 Oct). Closing the sheet is the "not yet"; a dated ask preselects its day as now. | `__lkSuggSave` (~16759), `__lkSave` (~22724), `__lkDiaryOpen` (~19656). | `looks_harness`, `inspiration_smoke`: Save → the sheet; Not yet writes nothing. |
| 0.3 | **The week strip from the first saved look.** H3 gates on any saved look, not on activation; a fresh account with one look sees Dress today and the look. | `_rbHomeResolve` (modules), `_rbRail`. | `home_harness`: stage 2 with one look renders the strip. |
| 0.4 | **Three generic models on the three ways.** With no twin, `/api/style` shoots each way on a different catalog cell spanning the skin range, the same three cells for every account (via `avatarCellEnsure`, cached once ever), so the frames, the composer's generic cell and the badge agree. The deck's text line becomes the badge. | `server.js` `/api/style` image loop + `avatarRefForUser`; `_lkDeckHtml` model line (~15305). | `inspiration_smoke` pins three distinct `avatarId`s on the frames; eyeball the first live set. |
| 0.5 | **The scanner while a look generates.** Everywhere a look is being made (the overlay before the deck, the deck's dressing card, a suggested card whose frame is still coming) the piece or the look is scanned: a line sweeping it top to bottom and back, with one evolving line beneath, *Generating a look* → the dressing lines → *On a Robes model for now*. The card never falls back to the piece or the prompt at rest. A frame that fails says so on its card and offers *Try the frames again*, never a blank. | The onboarding scan line (`.kp-scan`) and the add flow's reveal, lifted into one shared loading primitive; `_cbStyleSubmit`'s overlay (~2057), `_lkDeckDressHtml`, `_lkSuggFrame`, the Suggested tile's busy chip. | `inspiration_smoke`: the scanner on the overlay and the dressing card, never the bare piece. |
| 0.6 | **Observations.** Eyebrow and card read *Observations*. Verbs *That's right* · *Not quite* on Settings and the home line. **MVP source rule**: pending lines come only from direct feedback (thumbs, a swap pattern, a typed or struck rule); the wardrobe-read draft (`obsEnsure` → `/api/stylenotes/brief`) is paused behind a flag (decided, §7). | `settings.html` (`obsEnsure`, `sp-notice`), `_rbTwinNoticed`, `_rbHomeAlerts`. | `settings_harness`, `home_harness`. |
| 0.7 | **The outfit photo in onboarding.** The piece page runs `/api/wardrobe/pieces` first; more than one piece → *Robes sees three pieces. Which one first?* with the crops as tiles; the pick files and styles, the rest file quietly on landing (`rb_onboard_rest`). No more bug-out. | `onboarding.html` `catalogue()`, `_rbOnboardHandoff`. | `onboarding_harness`: a two-piece stub → the pick → one `/api/style`. |
| 0.8 | **Paste a link leaves onboarding.** The door stays in the add flow. | `onboarding.html` `#kp-linkopen`, `#kp-linkform`. | `onboarding_harness`: the link section becomes an absence pin. |
| 0.9 | **Style type imagery.** Run `railway run node scripts/gen_archetype_tiles.mjs`, commit `public/images/archetypes/manifest.json`. The settings deck already covers each tile with its frame. | Ops + one commit. | Eyeball the deck. |
| 0.10 | **The pool includes the high street.** Brands gain the ten names the workshop missed (M&S, Zara, COS, Arket, & Other Stories, Uniqlo, Mango, H&M, Dunnes, Penneys — decided); icons follow Liberty's list when it lands. Ranking stays by her picks (`wallRanked`), never by price. | `settings.html` `BRAND_POOL` / `ICON_POOL` / `BRAND_SEED`. | `settings_harness` (the Brands pins use The Row; unchanged). |

**Phase 0 as built (17 Oct)** — every row above shipped except 0.9, which is one ops step (`railway run node scripts/gen_archetype_tiles.mjs`, then commit the manifest; the keys live on Railway). Deviations from the table, each deliberate: **0.1** the swap never flips the row to `draft` — a swap on a suggested look commits onto the suggested row itself (`_lkCommitPieces`, status unchanged, the bar still Edit · Save to lookbook) behind the wardrobe's six-second Undo, so Edit stays the one door to the draft; **0.2** the sheet opens after EVERY save, suggested and composer alike, on the look's own page (the old "Save lands on the grid" is gone); **0.4** `/api/style` shoots the three ways on `w-s4-h1-nt` / `w-s1-h0-nt` / `w-s7-h3-nt` (`m-…` on a man's profile) only when no twin resolves, the badge reads "● Generic model ›" on the deck's top card and on the frame of every suggested look page and opens the twin drawer, the deck's text line is gone; **0.5** one scanner primitive (`_rbScanHtml` / `_rbScanFrameHtml`, the rose line sweeping the piece or the frame, `_RB_SCAN_LINES` evolving every 2.2s) on the overlay, the deck's dressing card, the suggested tile and the look page's frame slot — the failed-frame "Try the frames again" card is NOT built (a failed frame still falls to the mosaic); **0.6** the wardrobe-read draft sits behind `OBS_WARDROBE_READ = false` in `settings.html`; **0.7** the outfit photo lands on "Robes sees N pieces · Which one first?" tiles, the pick files and styles, the rest file quietly as `photo_multi` (untested against the live model from here — the first live multi-read on beta decides it). Harnesses: `home_harness` 58, `looks_harness` 494, `inspiration_smoke` 65, `nav_chrome_smoke` 72, `settings_harness` 499, `onboarding_harness` 236.

### Phase 1 · The start board and the meter (design → Felix → build)

| # | Change | Where | Test |
|---|---|---|---|
| 1.1 | **Onboarding = splash → name → home.** `finishToDashboard()` from the name's Continue; `renderKeyPiece` survives at `/onboarding?step=piece` with ‹ Home for the board's piece door. | `onboarding.html` (`STEPS`, `go`, the name's Continue). | `onboarding_harness` rewritten: name → home; `?step=piece` → the deck. |
| 1.2 | **A `fresh` stage in the resolver.** Nothing done → modules `[H0, BOARD, H2]`; any door done → `[H0, METER, H2, H4(+H3)]` with the board's remaining tiles under the meter; all done → the activated home. `resolveHome` stays a pure function (the platform port reads it). | `_rbHomeResolve`, `_rbHomeOrder`, `_lkHomeSync`. | `home_harness`: a new fresh section; the five stages re-pinned. |
| 1.3 | **The board.** Four tiles (`_rbHomeBoardHtml`), the imagery as faded stills from the archetype manifest and two app photographs, `start_door_tapped {door}`. Routes: piece → `/onboarding?step=piece`; outfit → `WA.open({way:'photo'})` (the multi read is already in it) until 3.1; taste → `/settings?walk=1`; twin → `/settings?page=twin`. | New renderer beside `_rbHomeO*Html`. | `home_harness`: anatomy at 390 and 1280, each route, no ink fill but one. |
| 1.4 | **The meter row.** Four marks, the undone ones dashed, a tap opens the door; replaces G1 on every stage; gone once activated. | Replaces `_rbHomeListHtml`. | `home_harness`. |
| 1.5 | **Retire O1–O4 as cards.** Their routes survive behind the tiles; `__rbHomeGo` is unchanged. | `_rbHomeCardPaint`. | `home_harness`. |

### Phase 2 · The loop's verbs on every look

| # | Change | Where |
|---|---|---|
| 2.1 | The deck end state: *Save one, and pick a day to wear it* → the first kept look's Save → the calendar opens. | `_lkDeckHtml` end branch (~15337). |
| 2.2 | The filed screen of the add flow grows **Style it three ways →** (→ `_cbStyleSubmit` with the piece), so a piece added anywhere ends on the deck. Then 1.3's piece door moves to the add flow and the onboarding piece page retires. | `_runStep3` / `_showFiled`. |
| 2.3 | Home's Suggested row cards carry Save; Saved cards keep the calendar. | `_rbRenderInspRow`, `_lkKpCard`. |
| 2.4 | The model badge on the deck card (generic only) → the twin drawer. | `_lkDeckCardHtml`, `__lkTwinBadge`. |

### Phase 3 · The context doors, in depth

| # | Change | Where |
|---|---|---|
| 3.1 | **Snap what you're wearing** as its own flow: the multi read → confirm → filed → *A look for today from these?* → the composer's start-from-photo on the filed pieces, or the deck with one way. | `_showPieces`, `_lkReadStart`, `__rbPromptLook`. |
| 3.2 | **The taste door ends on looks**: the walk's Done offers *Dress me for today →* → `__rbPromptLook` (dress-me, her DNA, the weather, a Robes model). | `settings.html` `walkDone`, the boot handler. |
| 3.3 | The style deck's cards carry the manifest stills (0.9) and "what does Bohemian look like" is answered on the card. | `settings.html` `cfgDeck`. |

### Phase 4 · The platform port

`platform/docs/STATUS.md` has `/today` with next-step rules and no proposals, alternates or swap in a daily draft. Port in this order: the resolver's `fresh` stage and the board as data (`resolveHome` is pure), the calendar on save, the generic cells on frames. The swap on a suggested look waits on proposals landing in the platform model. Nothing in Phases 0–3 should be designed in a way the native app cannot render: tiles, a row of marks, a sheet.

---

## 6 · Measurement

The events exist. Build the funnel in PostHog before Phase 1 ships, so the board is measured against today's home.

| Step | Event (exists unless marked) | Target, session one |
|---|---|---|
| Arrived | `onboarding_step {step:'name', outcome:'answered'}` | — |
| Chose a door | `start_door_tapped {door}` (new) | ≥ 80% tap a door before leaving |
| Got three ways | `look_generated` | ≥ 70% of door taps |
| Kept one | `deck_done {kept > 0}` | ≥ 60% of decks |
| Made it hers | `piece_swapped {surface:'suggested'}` (new surface value) | ≥ 25% of kept looks |
| Saved | `look_saved_from_suggested` | ≥ 40% of decks |
| Picked a day | `look_pinned` within the save's calendar (add `from:'save'`) | ≥ 50% of saves pick a day |
| Came back for a second piece | `wardrobe_added` within 7 days | ≥ 50% of saves |

Read weekly in `/admin` and PostHog. A step under its target is the next design session's subject; the number decides, not the next idea.

---

## 7 · Decisions, taken 17 Oct (Annie)

1. **Agreed.** The piece step leaves onboarding and becomes the board's lead tile (1.1). Onboarding is splash → name → home.
2. **Agreed.** The wardrobe-read observations pause for MVP behind a flag (0.6): statements from what she did, never from what she didn't. The read returns when logged wears are evidence.
3. **Agreed.** The box sits below the board for a fresh account (§3.4), leading once the board folds.
4. **The same three generic cells for everyone** (0.4), across the skin range; simpler to explain and cached once ever.
5. **The ten high-street names in 0.10** join the brand pool now; Liberty's icon list follows when it lands.

Out of this brief, flagged: men and positioning (the generic model and the defaults touch it; the decision is the workshop's), styling quality (odd shoes), brand logos.

---

## 8 · Not doing

- No fork, no step she passes through once. The board is the home.
- No tours, bubbles or coach marks.
- No pre-populated catalogue of looks (Annie on Alta). Example imagery is concept, faded, plural.
- No prompt-only front door. The box is on the home from the first second and leads it later.
- No inferred observations in MVP.
- No denominator, no lock language, anywhere.
- No new data shapes. The board and the meter render the resolver's existing state; swap-without-Edit is the look-states model's own transition (suggested → draft).

---

## 9 · Process

1. **This week**: Phase 0 ships on `beta` behind the harnesses; nothing in it changes the home's shape.
2. **Annie mocks frames 1–7 (§4.1) in Claude Design** and sends Felix the HTML. Fifteen minutes of his, not a call, unless the board itself is wrong.
3. **Felix's yes → Phase 1 builds** in one pass, harness-pinned, screenshots at 390 and 1280 against the mock.
4. **Phase 2 and 3** follow the funnel numbers (§6), smallest step first.
5. **The platform** picks up each phase from this document through its sync pass.
