# Digital Twin · Style DNA brief

**Date**: 2026-10-07 · **Branch**: `beta` · **Status**: plan + design brief, decisions taken 7 Oct, Settings prototype received 7 Oct (the design reference), the three open calls decided and the Settings surface built the same evening (`public/settings.html` at `/settings`, see the foot)
**Source**: Annie & Lib catch-up, 6 Oct 2026 (Gemini notes + transcript) · **Published copy**: https://claude.ai/code/artifact/44d8ac0e-c3c3-4aa9-9e08-ae950d9b2099
**Companion briefs**: `docs/style-memory-brief.md` (the brief and the memory), `docs/onboarding-split-review-2026-09-25.md` (the chapters), `docs/avatar-design-brief.md` (the model)

## What the meeting said

The 6 Oct catch-up with Liberty settled one direction: **less, not more**. Robes reads her dispassionately from photographs and behaviour; she confirms, corrects and adds hard limits. Everything below is pulled from the transcript, not the Gemini summary, because the summary flattens two of the calls.

| Thread | What was agreed | Who | Status in the build |
| --- | --- | --- | --- |
| Naming | "Style notes" becomes the action: **Create my digital twin**. "Taste & budget" becomes **Style DNA**. Names should say what you do there. | Both | Not done |
| Line notes | Drop the long Line notes read-out. Keep the full-length **photograph** (Liberty's 180: typed self-description is less accurate than a photo). The body can be a generic matrix; **the face and colouring are what must be right**. | Liberty, Annie agreed | Not done |
| Body adjust | Keep "adjust by hand", including traits testers asked for (a flat-chested tester felt uncatered for). | Annie | Partly: skin, hair, line, frame exist; no chest axis |
| Twin facts | Collect **height, clothing size (not weight), shoe size, age range**. Men's chest/suit size later. | Both | Not done; no columns exist |
| Brands | A **thumbnail wall** of current brands (the Daydream pattern): tap what you like, Robes suggests related ones, infinite. Never a blank text field. | Liberty | Not done; icons are a typed field plus a name pool |
| Icons | A separate wall of **up to 30 style icons, each tagged** (Kendall Jenner, designer fashion-forward; Hailey Bieber, clean-girl minimal; Gwyneth Paltrow, mature minimal). The tag is what Robes reads. Liberty will propose the list. | Liberty | Not done |
| Favourites | In Style DNA, ask **which 20 or so wardrobe pieces she loves**. Robes reads the pattern. The star in the wardrobe is not obvious enough. **But favourites must not become the only outfit**: Liberty was redressed in the same pieces every time. | Liberty | The hero star exists and is the cause of the repeat |
| Budget | Replace "Your range" and the optional yearly spend with **one mandatory "wardrobe investment level"**. Brands plus investment level answer range. | Both | Not done |
| Hard nos | Structured prompts plus free text: covered arms, hijab, no polo necks, metal allergy. | Liberty | Partly: "In your words" has free lines but no prompts |
| In your words | Make it **infinite**: "read my wardrobe again" as often as she likes, daily additions, Robes keeps rephrasing and asking. Annie: it should send her off to build looks and log outfits so it learns more. Allow review and edit over time. | Both | Partly: one draft, read-again exists, no loop back into the app |
| Wardrobe | Removal must be reachable without opening the editor. Native: swipe to remove. | Both | Done 4 Oct (swipe, list view) |
| Principle | "Simplify, clarify." Every screen self-explanatory. Prompts that keep inviting her to add more. Launch sooner, imperfect. | Liberty | The brief's standard |

Two things the summary got wrong: Liberty did **not** propose dropping the full-length photo (she reversed that overnight), and "wardrobe investment level" replaces **both** range and yearly spend, not only the spend.

## What exists today

The pieces of a digital twin are already built. They are spread across **two pages, five doors and four data shapes**, and were shipped in four separate passes (the model on 25 Aug and 1 Sep, the chapters on 25 Sep, the brief on 30 Sep). Nothing was ever designed as one object.

| Surface | Where it lives | What she does | Where it saves | Does Robes read it? |
| --- | --- | --- | --- | --- |
| Intro "Let Robes get to know you" | `/stylenotes?begin=1`, a sheet over the model page; the dashed card on first-run home | Begin or Later | nothing | n/a |
| 01 Style type | chapter sheet | Ten archetype cards, Not me / Sometimes / Very me | `style_dna.style_archetypes` and `_soft` | Yes, as a register line |
| 02 Icons & brands | chapter sheet | Search field, monogram grid of names, pills | `profiles.style_icons` | Yes |
| 03 Your model | the model page itself | Close-up and full-length photos, read into colour and line; skin, hair, line, frame by hand; presence | `avatar_id`, `avatar_prefs`, `style_dna.color_harmony`, `silhouette_proportions`, `gender_identity` | Yes: colour and silhouette rules, the render |
| 04 In your words | chapter sheet, `?chapter=brief` | Robes drafts lines from wardrobe and wears; Keep / Strike / Edit; lines of her own; Read again | `style_dna.brief` | Yes, first and said to outrank the rest |
| The memory | no surface of her own | Verdicts, swaps, wears land as a ledger | `style_dna.memory` | Yes, as recent lines |
| Taste & budget | `/stylenotes#taste`, a separate view | Icons again (typed), five price tiers, splurge categories, yearly spend | `style_icons`, `profiles.budget`, `splurge_categories`, `annual_spend` | **Icons only.** The server never reads budget, splurge or spend. |
| Hero star | the wardrobe grid | Star a piece | `wardrobe_items.hero_position` | Yes, as a priority directive |
| Account details | a modal on the dashboard | First and last name, mobile; a pointer to the model for presence | `profiles` | n/a |

The doors into all of this, today:

- First-run home: the dashed "Next · Style notes" card, until any chapter holds an answer. Then never again.
- The next line on home: build your model, read what Robes noticed, read the memory.
- The avatar menu on the dashboard and on the Style notes page: **Account details · Style notes · Taste & budget · In your words · Log out**. Three of the five rows are three doors into one thing.
- The summary sheet ("Annie, on paper") lists Style type, Icons & brands, Model, In your words. It does not list budget.

Everything a prompt reads goes through one seam, `styleDnaPromptBlock` in `style_dna.js`. It reads the brief, the memory, the type, the icons and the two photo reads, in that order. That seam is the asset: a new chapter that writes into the profile's `style_dna` reaches every generation with no per-endpoint wiring.

## Why it reads as disjointed

Seven seams a user hits, each traceable to a shipping decision rather than a design.

1. **Three names for one thing.** The menu says Style notes, Taste & budget and In your words. The sheet says "Let Robes get to know you". The page header says "Your model". The next line says "Build your model". None of them says what the thing is for. Liberty's point: a name should be the action.
2. **Icons are asked twice.** Chapter 02 and the Taste & budget view both edit `style_icons`, with different interfaces (a monogram grid with pills, versus a typed field with a "Popular among stylists" row). She can answer in one place and find a different answer in the other.
3. **Budget is asked and ignored.** Five price tiers, six splurge categories and a yearly spend are saved and never reach a prompt. Robes can still propose Chanel to someone who shops Zara. Liberty's investment level is the fix, and it has to be wired, not only renamed.
4. **The model page is two registers.** The chapters are a phone-first bottom sheet with three segments and Skip. The model page is a two-column desktop page with its own header, a flyout and a Build a look pill. Chapter 03 opens the page and swaps the chrome, so the sheet disappears and comes back.
5. **The reads are too long.** After a photograph the page prints Harmony, Line, two summaries, two drawers of notes, and the full colour and line chapters behind doors. Liberty: drop the line notes, keep the photograph, keep it punchy. The read is right; the print-out is the problem.
6. **Favourites repeat.** The hero star tells the engine (`heroDirective` in `server.js`) to prioritise a starred piece whenever it fits the occasion and season. With five stars that is a loop. The fix is in the prompt rule, and the star needs a home inside the twin so she knows what it does.
7. **In your words is a one-off.** It drafts once, lets her read again, and stops. It never asks a question, never points her at the thing that would teach it more, and nothing on home brings her back until twenty memory entries pile up. The hard nos Liberty wants (hijab, covered arms, metal allergy) have no prompt to land in; a line of her own is the only door.

Underneath all seven: **the twin has no home screen.** The summary sheet exists but is reachable only at the end of the chapter run, and the menu bypasses it. There is no one place that shows her what Robes knows and what it still wants.

## The Digital Twin model

One object, **Your digital twin**, with three chapters and a feed. Each chapter answers one question a personal shopper asks, and each writes into the profile's `style_dna`, so every look Robes composes reads all of it through the one seam that already exists.

| Chapter | The question it answers | What she gives | What Robes reads from it | Today |
| --- | --- | --- | --- | --- |
| **01 Your model** | Who am I dressing? | Close-up photo (colouring), full-length photo (line), skin and hair by hand, presence, **height, clothing size, shoe size, age range** | Colour rules, silhouette rules, the render; the facts as one line ("a size 12, 168cm, in her forties") | Model page; the four facts are new |
| **02 Style DNA** | What do I like? | Style type (keep), **a brand wall**, **a tagged icon wall**, **the pieces she loves** (the hero star, surfaced here), **wardrobe investment level** | Type and icon tags as the register, brands as the houses to shop, heroes as signature pieces, investment level as the ceiling on every proposal | Replaces Taste & budget; absorbs chapter 01 and 02 |
| **03 In your words** | What do I say? | Kept lines, hard nos from prompts, lines of her own, a question Robes asks each time | The brief, first and outranking | Exists; gains prompts and the loop |
| **What Robes has noticed** | What have I shown? | Nothing; it fills from wears, swaps, verdicts and reads | The memory, folded into the brief when she agrees | Exists as data; gets a surface |

Three rules hold it together:

- **One home.** A twin page shows the three chapters as rows with their state (Not yet · Read from your photographs · 4 lines kept), the feed beneath, and one invitation at the top for whatever Robes wants next. Every door in the app lands here or on one chapter of it, never on a view of its own.
- **Robes reads, she confirms.** Photographs and behaviour fill the twin. She reacts (Keep / Strike, Very me / Not me, a tap on a thumbnail). She types only for hard nos and lines of her own. No blank fields.
- **Nothing is asked twice, nothing is asked and ignored.** Icons live in 02 only. Budget becomes one mandatory investment level that the engine reads. Range and yearly spend are retired.

Data, by chapter (no migration needed, all jsonb on `style_dna` except where noted):

- `style_dna.facts = {height_cm, size, shoe, age_band}` and presence stays on `profiles.gender_identity`.
- `style_dna.brands = [name]` and `style_dna.icons = [{name, tag}]`; `profiles.style_icons` keeps the names for the surfaces that read it today.
- `style_dna.investment` is one of four levels; `profiles.budget`, `splurge_categories` and `annual_spend` stop being written.
- Heroes stay on `wardrobe_items.hero_position`. The engine rule changes: a hero is a **signature**, at most one per look, never on consecutive days (the memory already knows yesterday's wear).
- `style_dna.brief` gains `nos = [{text, prompt}]` and `asks = [{q, t}]`, the questions Robes has put to her.

How it fits: the three chapters and the feed all write one jsonb column on her profile row (brief · memory · type · icons · brands · facts · investment · colour and line reads); the feed folds into the brief only when she agrees; the one prompt block (`styleDnaPromptBlock`) reads it, her own words first, into every generation — daily, key piece, trip, the ask. Nothing new is needed on the server beyond new lines in that block.

## The plan

Five phases. The first is copy and wiring and can ship this week on the web; it is also what makes the design brief in the next section buildable, because the phone screens should inherit one object, not three pages. Phases 1 to 3 each rebuild one chapter on the web and in the phone mocks together. Phase 4 is the phone pass over the whole twin on the web; no iOS code yet.

| Phase | Ships | Supersedes | Size | Depends on |
| --- | --- | --- | --- | --- |
| **0 · One home** | The avatar menu collapses Style notes, Taste & budget and In your words into one row, **Your digital twin**. The summary sheet becomes the twin page at `/twin` (`/stylenotes` redirects), with the three chapter rows, their state, the feed and one invitation at the top. The first-run card and every next line land there. The hero rule in the engine changes to signature, one per look, not two days running. Taste & budget's icon section goes (02 owns icons). | The three menu rows; the `#taste` view's icon block; the summary as a chapter-run end | S | nothing |
| **1 · Style DNA** | Chapter 02 rebuilt: style type deck (as is), **brand wall** (thumbnail tiles, tap to keep, Robes suggests more from what she tapped, never a blank field), **icon wall** with one tag per icon (Liberty's list of up to 30), **the pieces you love** (her starred pieces as a row, star more from here, with one line saying what a star does), **wardrobe investment level** (four levels, mandatory, one tap). The engine reads investment as the ceiling on every proposed piece and the icon tags as the register. Tiers, splurge and yearly spend retire. | Taste & budget whole; chapter 01 and 02 as separate sheets | M | 0; Liberty's icon list and tags |
| **2 · Your model** | The page loses the printed reads: after a photograph it shows the model, one line each for colouring and line, and the **facts row** (height, size, shoe size, age range, presence) as a single edit. The full colour and line notes stay behind one door. Adjust by hand gains a chest axis if the avatar catalogue can carry it; if not, the brief says so and the line read absorbs it. | The two read drawers on the page; the stage facts | M | 0; a decision on the catalogue (decisions below) |
| **3 · In your words, living** | Hard nos as prompts (covered arms, hijab, no heels, no polo necks, metal allergy, free text), each saved as a rule. Every read ends with **one question** from Robes that she answers by tapping, and one pointer at what would teach it more ("log today's outfit", "star three pieces"). Read again is unlimited and never repeats a kept, edited or struck line. The feed shows what Robes noticed since her last visit and offers to fold it in. | The one-off draft; the twenty-entry fold threshold | M | 0; the memory (built) |
| **4 · The phone pass** | The mocks from the design brief built on the web app at 390: the twin as a tab-less sheet stack, the chapters as full-screen steps with the three-segment rule, the walls as grids, the model as a hero stage. The web at 1280 keeps the twin page and the model page as pages. | The web chapter sheet as the phone's version | L | 1, 2, 3 mocked |

Order matters for one reason: phase 0 is cheap and it is the thing every later phase lands into. Renaming without the home would still leave three doors; the home without the renames would still read as Style notes.

What each phase has to prove before it ships, in the standing harnesses: the chapters harness (`stylenotes_model_harness`) rewritten to the twin page and the new chapter 02; the FTUE harness for the doors on home; one new engine test that a Zara-level investment never proposes a luxury house and that a hero appears in at most one look of three.

## Design brief: the digital twin, native-feeling on the web

For Claude Design and the web build. Self-contained; it does not assume the codebase. A native-feeling design for the web app, phone first at 390 and the web at 1280; no React Native or iOS code is being built yet. The 1280 frames cover the two screens the web keeps as pages (the twin page and the model page).

### What this is

Robes dresses a woman from what she owns. To do that well it needs to know three things a personal shopper asks on the first visit: who it is dressing, what she likes, and what she will never wear. **Your digital twin** is the one place those three live. Robes fills most of it by reading her photographs and her wardrobe; she confirms, corrects and adds the limits only she knows. Every look Robes composes after that reads the twin first.

What success looks like: a tester opens the twin and knows in one glance what Robes knows about her, what it still wants, and where to tap. She never types into a blank field unless she chooses to. She never answers the same question twice. She comes back because Robes keeps asking one good question.

### The model to draw

One object with three chapters and a feed. Each chapter is a full-screen step in a sheet stack; the twin page is the hub they return to.

| Chapter | Question | She does | State shown on the hub row |
| --- | --- | --- | --- |
| 01 Your model | Who is Robes dressing? | Two photographs, a by-hand adjust, five facts | Not yet · Shaped by hand · Read from your photographs |
| 02 Style DNA | What does she like? | Reacts to a type deck, taps brands and icons on two walls, stars the pieces she loves, picks one investment level | Not yet · 4 of 5 answered · Complete |
| 03 In your words | What does she say? | Keeps or strikes what Robes noticed, taps hard nos, answers one question | Not yet · 6 lines kept |
| What Robes has noticed | What has she shown? | Reads, folds in or dismisses | a count of new lines |

Rules that are not negotiable, carried from the live system:

1. One ink fill per screen, on the one commitment. Everything else is a hairline pill or a text link.
2. Selected is warm, never black: `#F3EFE6` fill on a `#C9BCA6` stroke, with a small ink check.
3. Robes reads, she confirms. A chapter never opens on an empty form. The first thing on screen is something to react to.
4. Nothing is mandatory except the investment level, and that is one tap. Skip is on every chapter; a skip never survives an answer.
5. The words "AI" and "body type" never appear. Size, never weight. No "Prefer not to say" on the investment level.
6. Declarative, never presumptuous: Robes says what it read, not what she is. "Read from your photograph", not "You are an hourglass".

### Design in the Robes system

Use the live tokens. Cream page (`--cream`, `--cream-100` wells, `--cream-400` dashed strokes), ink text in three weights, rose for eyebrows, sage for Robes' voice, mauve only for trips. Hairlines 1px `--rule`. Radius 12px on cards, 100px on pills. Type is Cormorant for titles (serif, italic for the emphasis), Inter for everything else. Eyebrow 9px, .18em, caps. The chapter chrome is the live one: a close, the chapter name, Skip, and the three-segment rule beneath.

Files to reuse rather than redraw: `Onboarding_Flow.dc.html` 3a to 3g (the sheet stack, the type deck, the summary), `Your_Model__avatar_iteration.dc.html` (the stage and the adjust rows), `Wardrobe_List.dc.html` (the piece card the loved-pieces row borrows), `Lookbook_Mixed_Grid.dc.html` (the two-column grid the walls borrow).

### The frames to mock

Number them as below. Every frame at 390; F1 and F3 also at 1280.

*Updated 7 Oct, afternoon.* Annie's Settings prototype supersedes F1, F5, F7, F8, F10, F11 and F13 as drawn here. [The updated prototype (7 Oct)](#the-updated-prototype-7-oct) at the foot records it and the call on each.

**F1 · The twin page.** Eyebrow "Your digital twin", title "{Name}, *on paper.*", sub "Robes reads this every time it dresses you." Then one **invitation card** at the top, the only ink on the screen, naming the one thing Robes wants next ("Add a full-length photograph and Robes reads your line"). Then three chapter rows, each a card: number, name, state line, chevron. Then **What Robes has noticed** as a short feed (the three newest lines, "See all"). Foot: a text link "Create a look". Draw it in four states: nothing answered; model only; everything but the hard nos; complete (the invitation card becomes "Robes knows you. Log today's outfit and it learns more.").

**F2 · The intro sheet** (first run, over home). Eyebrow "Your digital twin", title "Let Robes *get to know you.*", one line, the three chapters as a numbered list, Begin (ink) and Later. As built today, with the new names.

**F3 · 01 Your model, empty.** The stage with the ghost figure. Two photo slots side by side, "Close-up" and "Full length", each with its one guide line. Beneath: "Or shape her by hand" rows (presence, skin, hair, line, frame) open by default. Then the **facts row**: five small fields in one hairline card (Height · Size · Shoes · Age · Presence), each tapping into F5. Skip at the top.

**F4 · 01 Your model, read.** The photographed model fills the stage. Under it two lines only: "Colouring · Soft Autumn, read from your close-up" and "Line · read from your full-length". One text door, "Full notes". The Adjust pill on the section rule. The facts row filled. No Harmony and Line facts on the stage, no printed summaries. This is the frame Liberty asked for: punchy.

**F5 · The facts sheet.** A bottom sheet with five rows. Height as a stepper in cm with a ft/in toggle. Size as a row of UK sizes 4 to 24 (EU in grey beneath). Shoes as a row of UK 2 to 9 with halves. Age as six chips: 18 to 24 · 25 to 34 · 35 to 44 · 45 to 54 · 55 to 64 · 65 and over. Presence as the three pills, Woman · Man · Prefer not to say, asked plainly and never inferred; it sets the model's catalogue and the pronouns everywhere. One line under the sheet title: "Size, never weight. Robes uses these to propose what fits." Done is the ink.

**F6 · 02 Style DNA, the type deck.** As built: one card at a time, Not me · Sometimes · Very me. Redraw only the chrome to match the new names.

**F7 · 02 The brand wall.** Title "Whose clothes *do you reach for?*" A two-column grid of brand tiles: a 3:4 tile with the house name in serif (no logos), tap to keep (warm state plus check). Kept brands collect as pills above the grid. Under the grid a row "More like these" that grows as she taps; this is Robes suggesting, so the row carries the sage eyebrow "Robes suggests". A search field at the top for a house not shown, never the first thing on screen. Draw: nothing kept; three kept with suggestions grown.

**F8 · 02 The icon wall.** Title "Whose style *runs close to yours?*" Same grid, each tile carrying a name and a one-line tag beneath (Hailey Bieber · Clean-girl minimal; Gwyneth Paltrow · Mature minimal; Kendall Jenner · Designer, fashion-forward). Up to 30 tiles, Liberty's list. Portraits are a licensing decision, so draw both: a serif monogram tile, and a photograph tile, and label the frame. The tag is the thing Robes reads; make it readable at tile size.

**F9 · 02 The pieces you love.** Title "The pieces *you reach for.*" Her starred pieces as the wardrobe's list rows (52 by 64 photograph, category eyebrow, name) with the star on, and under them a dashed row "Star more from your wardrobe". One line of copy that says what the star does: "Robes reads what they share. It never dresses you in the same one two days running." Draw: none starred (the row invites, with four of her unstarred pieces beneath it to tap); six starred.

**F10 · 02 Investment level.** Title "What your wardrobe *is built at.*" Four rows, one tap, mandatory. Each row: the level, three example houses in grey, a price band. Everyday (Zara, Arket, COS) · Considered (Sézane, Reformation, ba&sh) · Designer (Totême, Isabel Marant, Ganni) · Luxury (The Row, Loewe, Celine). One line: "Robes proposes inside it, whatever you admire." Continue is the ink and stays cream until a row is picked.

**F11 · 03 In your words, the read.** As built: Robes' cards with Keep · Strike · Edit, each traced to a piece or a wear. Tighten the cards to one line each. After the cards, **one question card** in sage: "One thing Robes isn't sure of. You own four pairs of wide-leg trousers and wear one. The others?" with two tap answers and "Skip". Then one pointer line: "Log today's outfit and Robes reads more." Read again as a hairline pill, never disabled.

**F12 · 03 Hard nos.** Title "Anything Robes *should never do?*" Chips in two rows: Covered arms · Covered legs · Head covered · No heels · No polo necks · No metal · Nothing sheer · No prints, plus "+ Your own" opening one line of text. A tapped chip becomes a rule line in her brief at once, with the quiet "Filed" mark. Draw with two chips on and one typed line.

**F13 · What Robes has noticed.** A list of the memory's lines since her last visit, newest first, each with "Keep" (folds into her brief) and "Not that". Empty state: "Nothing new. Wear something, swap something, and Robes will have noticed."

**F14 · The chapter row** as a component in its three states, and the invitation card in its four.

**F15 · The doors on home.** The first-run card ("Next · Your digital twin", "Let Robes *get to know you.*", Begin as a hairline pill) and the next line in its three variants (build your model; read what Robes noticed; one question waiting).

### Copy, in the register

| Where | Line |
| --- | --- |
| The object | Your digital twin |
| Menu row | Your digital twin |
| Chapter names | Your model · Style DNA · In your words |
| The feed | What Robes has noticed |
| Model, read | Read from your photographs |
| Model, by hand | Shaped by hand |
| Facts note | Size, never weight. |
| Investment note | Robes proposes inside it, whatever you admire. |
| Loved pieces note | Robes reads what they share. It never dresses you in the same one two days running. |
| Hard nos title | Anything Robes should never do? |
| Question card eyebrow | One thing Robes isn't sure of |
| Complete state | Robes knows you. Log today's outfit and it learns more. |

Transactional lines stay plain (Done, Skip, Keep, Strike). The delight register belongs to the empty states alone. Nothing says "AI", "profile", "questionnaire" or "body type".

### What not to draw

- A questionnaire. If a frame reads as a form with labels and fields, it is wrong; the facts sheet is the one exception and it is five taps.
- A choice between model figures. The model is read or shaped, never picked from a line-up.
- A fifth dock tab. The twin lives behind her avatar and on home's invitation; the dock stays Home · Lookbook · Diary · Wardrobe.
- Printed analysis. The colour and line reads exist behind one door; the page shows the model and two lines.
- Any copy that positions her wardrobe as insufficient. The twin is about what she owns and loves.

## Decisions taken

Annie settled every call on 7 Oct. The build runs on these.

| Call | Decision |
| --- | --- |
| The name | **Your digital twin** is the object; **Style DNA** is the taste chapter inside it. |
| Where it lives | Behind the avatar, with the invitation on home as the prompt nudge. No dock tab. |
| The chest axis on the model | A prompt-only nudge on the render first. The avatar catalogue is not extended. |
| Portraits on the icon wall | Monograms, with the tag doing the work. A photograph tile only for the houses. |
| Liberty's icon list | Thirty names with one tag each, from a fixed tag vocabulary. Liberty is sending the list. |
| Investment level and the memory | Yes: when the memory shows she buys above her stated level, one line in What Robes has noticed, never a lecture. |
| The data already saved | Tiers, splurge and spend map to an investment level once, pre-picked for her to confirm; the rest is dropped. It is all test data, so nothing is at risk. |
| `/stylenotes` | The twin page replaces it outright, with a redirect. The model page has no separate address. |
| The brand list | The brand list already in the app is the wall's starting set; Robes suggests from there. |
| Age range | Six standard bands, as drawn. |

Two notes that govern the whole plan:

- **Woman or man stays an asked question.** Presence is set on the model, never inferred from a photograph or a brief, and it decides the avatar catalogue, the size rows and the pronouns on every surface. Men's chest and suit sizes come later; the facts sheet is drawn for the woman's rows first.
- **This is a native-feeling design for the web app.** Every frame is built in the web app at 390 and 1280. No React Native or iOS code is being written yet; nothing in the plan depends on an app-store build.

## The updated prototype (7 Oct)

Annie's `Settings_Prototype.dc.html` arrived the same afternoon, with two screenshots of the empty state. It is the design reference from here: where it differs from the frames above, the prototype wins and the frame is marked superseded below. Everything in it is a web design at 390 and 1280.

**The IA is a Settings surface, not a page of its own.** Behind the avatar sits one screen with two tabs, **Style Profile | Account**. Style Profile holds three cards: **Your Digital Twin**, **Style DNA** and **Robes Observations**. Account holds **Profile**, **Notifications** and **Privacy & Terms**, a footer ("Need a hand? hello@byrobes.com", "Robes beta · 0.9.4") and Log out. A card slides its page in from the right; a row on a page lifts a bottom sheet titled with a Done; the dimmed page closes it. Every page carries a ‹ back to Settings. So F1's "twin page as hub with chapter rows" becomes the Style Profile tab, and the model lives on the Your Digital Twin page.

**Your Digital Twin page.** The render of her model fills the top, full bleed. Beneath it a card **Read from your photographs** with two rows, Colouring (Soft Autumn) and Body shape (read from the full-length, or "Softer, Fuller, set by hand"), opening the **Photographs** sheet: the two photographs as tiles with a replace icon and "Read 2 Sep"; Colouring as four swatch rows to pick from (Soft Autumn · Warm Autumn · Soft Summer · Deep Winter); Skin, eight dots; Hair, six dots; Body shape as The line (Softer / Straighter) and The frame (Fuller / Narrower). A second door, **Adjust by hand**, opens the same rows under "Robes read these from your photographs. Nudge anything that looks off." Then **The facts**, a card of five cells, Height · Size · Shoes · Age · Gender (168 · UK 10 · UK 5 · 45–54 · Woman; Prefer not to say prints "—"), opening the Facts sheet under "Size, never weight. Robes uses these to propose what fits.": Height as a stepper 140–210 cm with a ft/in toggle; Size UK 4–16 with the EU size beneath; Shoes UK 2–8 in halves; Age as six chips; Gender as Woman · Man · Prefer not to say.

**The empty state** (the two screenshots): a ghost figure where the render will be, "Your model starts the moment your first photograph reads.", two dashed slots Close-up and Full length each with Add photo and one guide line ("Soft daylight, facing a window. No filters." / "Head to toe, fitted clothes. A mirror is fine."), **Or shape her by hand** with its rows open, and the five facts cells each reading an italic "Add".

**Style DNA page.** Sub "What you love, and the lines you dress by." Two groups of rows. *Your taste*: **Style type** (sheet "Pick as many as feel like you": Minimal, Classic, Romantic, Bohemian, Edgy, Sporty, Preppy, Glamorous), **Brands** (sheet "Select 3+ brands you like. This informs your Style DNA.": a Search brands field, Your selections as pills, Popular among stylists as a pool of pills, "+ Add “x”" for a name not in the pool), **Icons** (the same sheet, "Search or type a name", Often chosen), **Pieces you love** ("6 pieces"), **Investment level** (sheet "How much you spend a year": Under €500 · Occasional picks / €500–1,500 · Regular wardrobe updates / €1,500–5,000 · Considered investment / €5,000+ · Fashion is a priority / Prefer not to say). *In your words*: **What works on you** ("3 lines"), **Hard nos** (sheet "Robes never proposes these, whatever the occasion": her lines with ✕, "+ Another no", and "Robes suggests · From what you've never kept" with Keep), **Your rules** ("2 lines"). When something new has been noticed the page adds a row, "Noticed and kept · Read from what you wear."

**Robes Observations page.** Sub "Read from what you wear. Keep a line and it joins your Style DNA." *Since your last visit*: each line with its evidence ("From eleven looks since August") and Keep / Not me; empty, "Nothing new. Robes keeps reading." Then *Kept before* ("Kept in March"). The prototype also draws an alert variant on the Style Profile tab: one "Robes noticed" card she swipes, Keep → or Not me ←, toasting "Kept. Filed under Style DNA."

**Account.** Profile rows Name ("How Robes addresses you"), Email ("Where sign-in links and receipts go"), Password ("At least eight characters", Update password) and Delete account in rose ("Your wardrobe, looks and digital twin are removed for good. This can't be undone." Delete my account / Keep my account). Notifications: Email "Your weekly edit and new looks." and Push "A morning look, before you dress." Privacy & Terms as two ↗ rows, "Last updated 1 September 2026".

### The brand wall

Annie's rule: **keep the existing brands and icons already selected, and introduce Liberty's new ones.** The pool is the union of three lists, deduped by name:

- the names the app already carries (the `ROBES_ICONS` pool and the per-type seeds in `ARCH_SEED`, from Chanel and The Row to Caroline de Maigret);
- the prototype's fifty-brand pool (The Row, Totême, Khaite, Loewe, Celine, Prada, Miu Miu, Bottega Veneta, Jil Sander, Lemaire, Max Mara, Chloé, Dôen, Sézane, Ganni, Acne Studios, Jacquemus, Alaïa, Maison Margiela, Dries Van Noten, Marni, Simone Rocha, Isabel Marant, Saint Laurent, Valentino, Gucci, Hermès, Chanel, Dior, Fendi, Victoria Beckham, Gabriela Hearst, Proenza Schouler, Staud, Reformation, COS, Arket, Me+Em, Joseph, Vince, Agolde, Ulla Johnson, Zimmermann, Nili Lotan, Loro Piana, Brunello Cucinelli, Comme des Garçons, Yohji Yamamoto, Paloma Wool, Courrèges) and its forty icons;
- **Liberty's additions**: Adidas, Nike, H&M, Arket, COS, Zara, Uniqlo, Louis Vuitton, Chanel, Dior, Gucci, Ralph Lauren, CAMILLA AND MARC, Carven, Chopova Lowena, Julie Kegels, Kallmeyer, LABRUM London, Matières Fécales.

Five of Liberty's names were already in a pool (Arket, COS, Chanel, Dior, Gucci). The fourteen new ones span the high street (Adidas, Nike, H&M, Zara, Uniqlo), the houses (Louis Vuitton, Ralph Lauren) and a younger designer set (CAMILLA AND MARC, Carven, Chopova Lowena, Julie Kegels, Kallmeyer, LABRUM London, Matières Fécales). That spread is the point: the wall must read at every investment level, not only the quiet-luxury register the current pool leans to. A brand she adds through "+ Add" joins her selections, never the shared pool. The pool shows the names she has not kept; a kept name moves to Your selections.

Landed the same day: the fourteen new names are appended to `ROBES_ICONS` in `public/stylenotes.html`, so the live Icons & brands chapter already offers them. The current pool is one mixed list; the split into Brands and Icons comes with phase 1.

### Where the prototype departs from the brief, and the call on each

| Frame | The brief said | The prototype draws | Call |
| --- | --- | --- | --- |
| F1 | A twin page as hub: invitation card, three chapter rows, the feed | Settings with Style Profile · Account; the twin, Style DNA and Observations as three cards; no invitation card | Prototype wins. The invitation moves to home's prompt nudge (decided) and the next line; the Style Profile cards show state instead. |
| F5 | Five facts, the fifth labelled Presence | Five facts, the fifth labelled Gender, the same three pills | The prototype's label wins on screen. The data stays `profiles.gender_identity`, asked and never inferred. |
| F6 | The ten archetypes as a deck | A sheet of eight types: Minimal, Classic, Romantic, Bohemian, Edgy, Sporty, Preppy, Glamorous | **Open.** The app's ten (Minimal, Bohemian, Classic, Romantic, Sculptural, Utility, Heritage, Eclectic, Off-duty, Avant-garde) are what every prompt reads today. Recommended: keep the ten as the vocabulary, draw them in the prototype's multi-select sheet, rename only if Liberty's eight test better. |
| F7 · F8 | Two tile walls (3:4 tiles, monograms, a tag on each icon) with Robes suggests beneath | Search + pool sheets with Your selections pills and Popular among stylists | Prototype wins for the sheet. Monograms and the icon's tag survive as the pill's content; "Popular among stylists" is where Robes suggests. |
| F10 | Four levels by house, mandatory, no Prefer not to say | Five rows by yearly spend, with Prefer not to say | **Open.** The rows are today's Taste & budget tiers, so the saved data maps one to one. Against them stands rule 5 (the one mandatory answer, no opt-out). Recommended: the prototype's five rows with Prefer not to say dropped. |
| F11 · F13 | What Robes has noticed as a feed on the twin page | Robes Observations as its own page, plus the swipe card on the tab | Prototype wins. Keep lands in Style DNA ("Filed under Style DNA"), which replaces the brief's "folds into her brief". |
| F15 | The doors on home | Not drawn | Stands as briefed. |

### What the build takes from it now

Phase 0 (one home) becomes the Settings surface: the avatar menu's rows collapse into Style Profile · Account and `/stylenotes` redirects there. Phase 1 (Style DNA) takes its data home exactly as the prototype groups it: `style_dna.style_archetypes`, `style_dna.brands`, `style_icons`, the hero pieces, `style_dna.investment`, and the brief's lines under In your words. Phase 2 (Your model) draws the twin page and its two sheets; the facts sheet's rows are the prototype's ranges (height 140–210 cm, UK 4–16, shoes UK 2–8). Nothing here changes the phase order.

### Built (7 Oct, evening)

Annie took the three recommendations and asked for the build. Shipped on `beta` as `public/settings.html` at `/settings` (`/stylenotes` redirects), with every Style notes engine underneath it:

- **F6 · decided**: the ten style types stay the vocabulary, drawn in the prototype's multi-select sheet.
- **F10 · decided**: the prototype's rows by yearly spend, Prefer not to say dropped — one mandatory answer, written to `annual_spend` and `style_dna.investment` together; an old tier maps once to its level.
- **F5 · decided**: the fifth fact reads Gender on screen; the data stays `profiles.gender_identity`.
- Style Profile | Account; the twin page with the Photographs, Adjust and Facts sheets; Style DNA with the type, brand, icon, pieces, investment and three word sheets; Robes observations with Keep / Not me and the swipe card on the tab; Account with name, email, password, delete, notifications and the legal rows.
- One honest deviation: the prototype's "Push · A morning look, before you dress" is labelled as the morning email — Robes sends no push.
- Verified by `scripts/settings_harness.mjs` (311 checks at 390 and 1280). The CLAUDE.md entry of the same date is the build record.

### Redlined (8 Oct)

Annie read the shipped build against the prototype and sent `Settings_Redlines.dc.html`: 37 redlines, each carrying one of four calls — Fix (11), Revert to prototype (13), Keep shipped (8), Merge (5). Shipped won on the model and the observation cards; the prototype won on headers, selection states and restraint. All 37 are built on `beta` the same day:

- **One header row on every screen** (G1): ← at the left, the page's title centred in Cormorant 22px, nothing right; one 12px sub line below. The eyebrow, the serif masthead, the inline ‹ Settings, the avatar menu and the weather pill are gone; so is the mobile dock (G3 — Settings is a stack pushed from the avatar, ← takes her home). Titles: Settings · Your Digital Twin · Style DNA · Robes Observations.
- **Restraint**: the landing cards print their title only (G4 · L5); selected is warm — #F3EFE6 on #C9BCA6 over cream-100 (G5); the Account rows print label and value, their helpers moved into the sheets (A1 · A2); the "new from Robes" door is gone from the landing and Style DNA (D4); Read again is gone — "Nothing new. Robes keeps reading." (O6).
- **The twin**: the caption alone on the stage (T1); Body shape prints the line and frame as set — "Softer line, narrower frame" — or nothing until set, never a shape's name (T4 · P5); the facts as one strip of five with hairline dividers under a section eyebrow, the sentence in the sheet (T5); Build a look as the one ink fill with the italic line under it, the ✓ Filed line gone (T6).
- **One "Your photographs" sheet** behind Colouring and Body shape, opened on the tapped section (P1); the title in Cormorant 300 with Done as a text link (P2); each slot prints its name and the read's date — "Read 2 Sep" (P3); Colouring is a four-row season picker — the read season, its two neighbours on the wheel, Another season — with the strip and Full colour notes → under the selected row only, a pick re-rendering the catalog through the new `POST /api/stylenotes/season` (P4); skin and hair sit under Colouring, the line and the frame under Body shape, a chosen pill carrying ✓ (P6 · P7); no scrollbar, no second border (P8).
- **Observations**: an observation is one sentence — the notes paragraph lands as its first sentence with the paragraph behind it, and a line is never sliced mid-word (L2); the source line names the evidence — "From 40 pieces and 11 looks" (L3 · O4); colours read as a lower-case sentence joined with "and" (O3); in the list Keep is a hairline pill and Not me a text link, the landing alert keeps its labelled pills (O5 · L4); Kept before carries "Kept in March" at the right (O7).
- Verified by `scripts/settings_harness.mjs` (391 checks at 390 and 1280) and screenshots of every screen at both widths. The CLAUDE.md entry of 8 Oct is the build record.
