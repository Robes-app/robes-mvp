# Prompt → one draft look: implementation plan

Status: plan, 2026-11-03 (Annie + Claude). **Not started — Annie reviews §2 and §8 first.**
Owner: Annie. Web and native land together (CLAUDE.md). Follows `2026-11-02-home-ootd-diary.md`
(built; its §8 build notes stand).

**Sources.** The Claude Design artifact *Front Door design frames* — frame **3b "Prompt to draft
look"** (the prompt box, the draft tile in the slot, and the draft look screen it opens) and frame
**3k "Wed 4"** (two looks on a day, reviewed in §7 against staging). §1 transcribes 3b from the
artifact's source so nothing is built from memory. Annie's brief (3 Nov): the prompt box makes
**one draft look**, not three suggestions; she amends it **through the prompt** on home and on the
draft page, the same way on both; **a draft is one thing** whether it came from a prompt or from
manual creation; the rack row's **text block and wardrobe icon** are carried across the platform.

---

## 0. The short version

- **Her words make one draft.** The prompt box sends as today, but the job writes **one look in
  status `draft`** (source `generated`), dated for the day the chip names. It appears **in the
  day's slot as the draft tile** (dressing → draft → saved), never on the deck. Three suggestions
  and the keep-or-pass deck are retired for the prompt door (§2, D1).
- **One draft page.** The draft look page (3b's screen) replaces both today's `WorkingLook` for a
  Robes draft and the hand-built `Composer`: the same eyebrow, title, mix line, picture,
  description, rack, "Adjust this look…" pill and Discard | Save, whichever way the draft began.
- **Adjusting is a thread, in place.** Her words go to the existing look prompt (`looks.ask`): the
  rack changes at once, the row reads warm, the picture goes **stale** with a pending count; the
  model is re-drawn only when she asks (**Update the model · N**) or when she saves. The same thread
  shows in the prompt box on home and in the card on the draft page.
- **Dress it again** asks what's not right, then re-dresses the whole look from the same brief in
  place (no second draft). Save pins the look to the day (the one act); after that the page reads
  **In your Lookbook**, and further changes save as **Update look**.
- **The rack row** everywhere: `CATEGORY · BRAND` with the brand in rose, the serif name, the role
  line; a **hanger** (the wardrobe icon) on every row that can be swapped from her wardrobe, the
  heart only on a piece to find. The look's **text block** is the mix line (`The look · 3 yours,
  2 to find` · `Composed by Robes`) above the picture and the description under it.
- **3k "Wed 4" review (§7):** the design frame shows **each look as its own card** in the slot's
  scroller (OOTD first, then the others, then Add look). Staging fans the others into a +N stack on
  the OOTD's corner and shows one card. Recommendation: match the frame.

Eight decisions for Annie in §8, each with the default I will build to unless told otherwise.

---

## 1. The design, transcribed (3b)

Frame 3b = 3k's chrome, strip and slot (plan 2026-11-02 §1) with the draft flow on top. Tokens are
the platform's; the warm pair `#F3EFE6` / `#C9BCA6` is already `selected` / `selected-line`. One
colour in 3b is new: the to-find row's dashed edge `#D9CBB7` (→ a `selected-line` at 80% or a new
`dashed-find` token; D8).

### 1.1 The prompt box, before and while a draft is live
- At rest: exactly §1.8 of the 2026-11-02 plan (day chip · place chip · hanger · tokens · input,
  placeholder **Plan an outfit for today** / **for Tuesday**).
- Sending: her words, the day chip's date, the place and the pieces go as today
  (`looks.prompt`). The box does **not** navigate away: the slot's Add look tile becomes the
  **draft tile** (§1.2) and the box becomes the **thread**.
- **The thread** (inside the box, above the input, max-height 260px, scrolls to the newest line,
  hairline below): her line right-aligned in the sans (`me`), Robes' line in the serif 17 italic
  (`robes`), and a **work line** with the breathing sparkle while a job runs. Lines in 3b:
  - first send → her words, then *Here's a first look: your peach camisole and camel shacket over
    black tailored trousers. Two pieces to find.* (Robes' own sentence from the job).
  - while generating → work line **Dressing it…** (first) / **Dressing it again…** (re-dress).
  - an adjustment → her words, work line **Reading your change…** (≈1s), then *Updated the rack
    with your black slingback heels, in place of the flats.* / *Updated the rack with your tweed
    wool jacket as the warmer layer.* / *Updated the rack: the trousers are worn untucked over the
    boots.* (the ask's `reply`).
  - Dress it again → her line **Dress it again**, Robes *What's not right with this one? Tell me,
    and I'll dress it again.*; her answer; Robes *Thanks, that helps. Here it is, dressed again.*
  - Update the model → her line **Update the model**, Robes *Done. The model now wears your
    changes.*; Save while stale → Robes *Saved, with the model updated.*
  - ↻ on the tile → Robes *Here's another take, same brief.*
- **The options row** (under the thread, 26px pills, 11px sans), only when the draft is ready and
  no question is open: **↻ Dress it again** (hairline; becomes **ink "Update the model · N"** while
  changes are pending) · **✎ Adjust** (toggles the input open; warm while open) · **View draft ›**.
- **While live** the chips lock (muted fill, no ×, no caret, pointer-events none; the place
  popover closes) and the **input row collapses** (height 0) unless Adjust is open or a question
  is waiting. Placeholders: **Adjust this look…** while live; **What's not right with it…** after
  Dress it again. Enter sends.
- The draft belongs to the day it was asked for (`dDay`): tapping another day shows that day's
  own slot and box; coming back shows the thread and tile again.

### 1.2 The draft tile (in the slot, where Add look stood)
White, 0.5px `rule-mid`, radius 6, full width in the scroller, snap centre. The Add look tile is
hidden while a draft is on the day (`addTile: false`).
- **Generating:** the model photograph (the previous version while re-dressing; the bare model
  `model-clean.jpg` on the first) at 55% under the **scan line** (`ScanLine`), a read line in 9px
  uppercase with the sparkle — `Today · Dublin · 11°` — then the revolving lines (serif 19 italic):
  first draft *Reading your words… · Checking Dublin: 9–13° and overcast… · Pulling pieces from your
  wardrobe… · Finding the two to find… · Dressing it on your model…*; re-dress *Reading your change…
  · Swapping the pieces… · Keeping the rest as it was… · Dressing it on your model… · Lighting the
  photo…*; a progress bar; **Usually under a minute**. Under the image a strip **THE RACK** with the
  rack's thumbs (34×42) landing one by one (dashed warm edge on a piece to find). Bar: **Dressing…**
  in `#B9AD95` (→ `ink-faint`), no chevron.
- **Ready:** the draft's picture; bar **DRAFT LOOK ›** (10px uppercase, `cream-100` bar, 45px);
  tapping the image or the bar opens the draft page. While changes are pending the picture reads
  stale (`grayscale(.75)`, 82%) with the count badge.
- **Saved:** badge top-left **✓ Saved to Lookbook** (sage, 9px uppercase on white 92%); bar = the
  look's name ›. The tile is now the day's OOTD card (the look is pinned on Save) — it renders as
  `LookTile` `variant="ootd"` from then on.

### 1.3 The draft look page (from View draft, the tile, or `/look/:id` of any draft)
Full page, pushed view. Back pill **‹ Today** (or the day's word). Centred:
- Eyebrow rose 9px: **DRAFT LOOK** → after Save **IN YOUR LOOKBOOK** → changed since **IN YOUR
  LOOKBOOK · CHANGED**.
- Title serif 30 (the name; tap to write over it — `InlineTitleField`, as today).
- **The text block, row 1:** `THE LOOK · 3 YOURS, 2 TO FIND` left, **COMPOSED BY ROBES** right
  (9px uppercase `ink-soft`). On a hand-built draft the right side is empty and the left reads
  `THE LOOK · 4 PIECES`.
- **Picture:** `cream-200` mat, 0.5px `rule-mid`, radius 10; the image 84% wide, 2:3, centred
  (the look's frame on her model). Generating: scan + lines as the tile. Stale: grayscale 75% /
  82%, the pending badge.
- **The text block, row 2:** the description, serif 17 italic `ink-soft`: *A peach silk camisole
  under a camel shacket, anchored by high-waisted black trousers for an overcast day.* (= the
  look's `note`; a hand-built draft has none until she or Robes writes one).
- **Tags line** (hairline above): *Untagged — season, agenda, vibe* italic left, **+ TAGS** right →
  the existing look metadata editor (season band · wear-it-for).
- **The rack:** rows 12px radius, white hairline; **changed = warm fill, `#C9BCA6` edge, an 8px
  ink dot on the left edge**. Row: thumb 58×70 radius 6 (dashed `#D9CBB7` edge on a piece to
  find) · `CATEGORY` + **brand in rose** (8.5px uppercase `.18em`) · name serif 18 · role line
  8.5px uppercase (`CANVAS` · `ANCHOR` · `EXCLAMATION · €180` — the price joins the role on a
  piece to find) · **♡ Save to wishlist** (only on a piece to find) · **hanger "Swap from your
  wardrobe"** (every row) · **›** (opens the piece; a proposal opens nothing). Last: dashed
  **+ Add a piece** (64px).
- **The floating pill** (above the footer, white, shadow): sparkle · *Adjust this look…* · the
  pending count badge (ink) · a 36px → in `cream-200`. Tap → **the card**: white, radius, × top
  right, the **thread** (same lines as the box), the options row (here only **Dress it again** /
  **Update the model · N**), and the input (sparkle · *Anything else, or put something back…* /
  *What's not right with it…* · →, 45% until there is text).
- **Footer:** **Discard** (quiet; **Remove** once saved) · **Save** (ink pill; **Update look** once
  saved and changed; **Saved** at rest after Save; **Dressing…** / **Saving…** while a job runs,
  disabled). Save while stale re-draws first, then saves (one tap).

### 1.4 Adjusting through the prompt — the same on both surfaces
1. She sends words. The rack is edited at once from the ask's result (swap · back · styled ·
   add); the changed rows read warm with the dot; the picture goes **stale** and the pending
   count (number of changes since the last draw) shows on the tile, the pill and the options row.
2. The model is **not** re-drawn by itself. **Update the model · N** draws it (one image call);
   Save draws then saves.
3. **Dress it again** = a new version of the whole look from the same brief **in place** (same
   look id): first it asks *What's not right with this one?*; her answer goes with the brief; the
   picture and rack are replaced; the thread keeps every line. ↻ on the tile skips the question
   (*Here's another take, same brief.*). While changes are pending, the button is **Update the
   model · N** instead (a re-dress would lose them).
4. Discard before Save deletes the draft and empties the thread; the slot goes back to Add look.
   Discard (**Remove**) after Save with changes pending puts the look back to how it was saved.
5. A rule in her words (*never heels on a Tuesday*) waits under Robes noticed, as today.

### 1.5 The piece card, carried across the platform
The rack row of 3b is `cardLines` + `RackRowCard` (CLAUDE.md: "a piece is `cardLines` →
`CardRow`/`CardTile`"), so the change lands once:
- `cardLines`: the eyebrow's **brand in rose** (`accent-warm`), category stays `ink-faint`.
- `RackRowCard`: the **hanger** (`wardrobe` icon) for *Swap from your wardrobe* in place of the
  `swap` arrows, on every row with `onSwap`; the heart only on a proposal; the price on the role
  line; the dashed thumb on a proposal; the changed state as 3b draws it (warm + dot).
- Everywhere a rack renders: the draft page, the saved look (editing), the suggested look (swap in
  place, until D1 retires it), Today's daily look, the trip packer, the share page's rack (read
  only: no hanger). The wardrobe list (`CardRow`) takes the eyebrow change only — it has no swap.
- Native: `PieceCard.tsx` and `RackRow.tsx` are the twins; the `wardrobe` icon is in
  `@robes/icons` for both.

---

## 2. Where today's build departs (what this changes, and why it is a deviation)

| # | Today (staging) | 3b | Change |
|---|---|---|---|
| C1 | `looks.prompt` → `key_piece` job, mode `prompt`, **three ways** minted as `suggested` looks in a set; the deck (`/looks/style/:jobId`) keeps or passes them | one draft, in the slot | The job takes `ways: 1` for the prompt door and mints the look as **`draft`** (source `generated`, `setId` kept for the frame and re-dress). No deck for prompts. |
| C2 | Suggested looks wait in Lookbook › Suggested; Keep leaves them there until Save | no suggested state in 3b | Suggested stays for the **piece door** (HomeBox "+ piece", piece page "Style it three ways") this pass; D1 decides whether that door follows. |
| C3 | The box navigates to the deck (`router.push('/looks/style/:jobId?from=home')`); the home tray lists the job | the draft dresses in the day's slot; the box holds the thread | Home reads the day's draft and its job from `Today.diary[].draft` (§4) and renders the tile + thread; the tray no longer lists prompt jobs (it keeps trips, style colour, daily). |
| C4 | Two draft pages: `Composer` (hand-built, hotspots on the model) and `WorkingLook` (Robes' draft: rack + `LookPromptBox` + Save) | one draft page | `DraftPage` (web `components/looks/draft-page.tsx`, native `features/looks/DraftPage.tsx`) replaces both for `status = draft`; hotspots are retired (D4: the `+ Top · + Bottom · + Shoes` canvas was the composer's door; 3b dresses from the rack and the pill). |
| C5 | A hand-built draft auto-dresses on her model after a 500ms settle (`useDress`); a Robes draft re-frames after every ask (`useLookEditor.reframe`) | the picture goes stale; **Update the model · N** / Save draws | Both drafts stop drawing by themselves; one `pending` count per draft (client state, the diff of the rack since the last draw: `frameKey`/`compositionKey` ≠ the drawn key). |
| C6 | `LookPromptBox` is a folding field under the rack (no options row, no stale state) | the pill → card with thread, options, input; the same thread in the home box | `AdjustThread` (web/native) used by both the box and the card; `LookPromptBox` retired on drafts (stays on saved looks until D6). |
| C7 | `looks.restyle` only for `suggested` looks in a set, no words | Dress it again, with her answer | `looks.restyle` accepts a `draft` with a `setId` and an optional `note` (her answer, ≤300); mode `restyle` rewrites in place. |
| C8 | Save = `looks.save`; the DiarySheet then asks for a day | Save pins to the day the chip named, in one act | `SaveLookInput.date?` (from the diary home only): save + pin in one transaction; the DiarySheet still opens from the Lookbook's Save. |
| C9 | The slot's "+N stack" and the deck's `?from=home` back | §7 | separate review |

The invariant holds: nothing reaches a day until she saves; a draft on a day is the **draft tile**,
not a `planned_days` row.

---

## 3. Where it lands (web ↔ native twins)

| Design piece | Web (`app/src/…`) | Native (`mobile/src/…`) | Today |
|---|---|---|---|
| Draft tile in the slot | `components/home/draft-tile.tsx` (in `day-slot.tsx`) | `features/home/DraftTile.tsx` (in `DaySlot.tsx`) | new; composes `LookTile` once saved |
| Thread + options row | `components/looks/adjust-thread.tsx` | `features/looks/AdjustThread.tsx` | new; replaces `LookPromptBox` on drafts |
| Prompt box live state | `components/home/prompt-box.tsx` | `features/home/PromptBox.tsx` | extend (locked chips, collapsed input, thread) |
| Draft page | `components/looks/draft-page.tsx`, used by `app/(app)/look/[id]/look-view.tsx` | `features/looks/DraftPage.tsx`, used by `LookScreen.tsx` | new; retires `composer.tsx` + `WorkingLook` for drafts (`WorkingLook` stays for `suggested`) |
| Rack row + piece card | `components/looks/rack-row.tsx`, `components/wardrobe/piece-card.tsx` | `features/looks/RackRow.tsx`, `features/wardrobe/PieceCard.tsx` | restyle |
| Tags line | `components/looks/look-hero.tsx`'s season · wear-it-for editor, reached from the line | existing | small |
| Scan / lines | `components/looks/scan-line.tsx` | `features/looks/ScanLine.tsx` | reuse; add the two line sets to copy |
| Copy | `packages/copy/src/lookbook.ts` (new `draft` block: thread lines, options, placeholders, badges, bar labels) | shared | |
| Icons | `packages/icons`: add `redo` (↻); `pencil` (✎), `heart`, `wardrobe` exist | same | |
| Prompt | `packages/ai/src/prompts/style-piece/v7.ts` (one way; `description` sentence; `reply` line) + eval | — | |

---

## 4. Server and contracts (P0, first)

- **`PromptLookInput`** unchanged. `promptLook` starts the `key_piece` job with `{ mode: 'prompt',
  ways: 1, draft: true }`. The handler (`style-piece.ts`): `WAYS` becomes `input.ways ?? 3`; with
  `draft: true` the set is created and the one look is minted through `suggested.mintSet` with
  **status `draft`** (`mintSet` takes a `status`), `source: 'generated'`, `name_provisional: true`,
  `note` = the description sentence, `dateHint` = the day. The hero frame is drawn in the job as
  today. Job output gains `lookId`.
- **Prompt v7** (`style-piece`): one way; a `description` (one sentence, ≤160 chars, her pieces
  named, the weather's reason) and a `reply` (Robes' first line for the thread: *Here's a first
  look: …*). Eval: the pieces named in `description` are on the rack; `reply` ≤ 2 sentences.
- **`Today.diary[]` gains `draft`:** `{ look: Look, jobId: uuid | null } | null` — the newest
  unsaved look with `status = draft`, `source = generated` and `date_hint = date` (the column
  from the 2026-10-15 look-states migration; add a partial index on `(user_id, date_hint)
  where status = 'draft'`). `jobId` is the running/last `key_piece` job for it. Old phones
  ignore the field (zod strips).
- **`looks.restyle`:** input `{ note?: string ≤300 }`; allowed for `status in (suggested, draft)`
  with a `setId`; the handler's `restyle` branch passes `note` into the ask as *what's not right*;
  the rewrite keeps the look id, replaces pieces/proposals/note/name-if-provisional, claims a new
  frame. Quota as today (text + image).
- **`looks.ask`:** unchanged contract. The client no longer re-frames after an answer (C5).
- **`looks.frame` / `looks.renderOnModel`:** unchanged; they are "Update the model". `Look` gains
  `drawnKey: string | null` (the `frameKey`/`compositionKey` the current picture was drawn for) so
  the clients can compute `pending` without guessing; today's `render_key` column already holds it.
- **`SaveLookInput.date?`** (`wornOn`): `saveLook` saves and, in the same transaction, pins to
  that date at position = last (`repos.plan.pin`). Returns the look; the client refreshes the
  diary. Only the diary home sends it.
- **Tray:** `Today.tray` filters out `key_piece` jobs whose set is a draft (they live in the slot).
- **Analytics (catalogue):** `draft_adjusted {surface: home|draft, intent, pending}`,
  `draft_redressed {surface, asked: boolean}`, `draft_model_updated {surface, pending}`,
  `draft_saved {surface, pending_at_save, pinned: boolean}`; `prompt_submitted.scope` unchanged.
- **Data inventory:** no new personal data (no new column); nothing to add.
- **Docs:** `docs/api.md`, and the repo-root briefs `../docs/look-states-brief.md` (one draft
  from the prompt; suggested stays for the piece door) and `../docs/look-prompt-brief.md` (the
  thread and the pending state).

---

## 5. Phases (each a PR into `beta`, green on `pnpm verify` + e2e; commit per task)

**P0 · Contracts, job and server (M).** `ways`/`draft` on the job and v7 + eval; the
`date_hint` index; `diary[].draft`; `restyle` with `note` for drafts; `SaveLookInput.date`;
`drawnKey`; tray filter; route tests (route-manifest, cross-user on the new query); DB test for
the draft-by-day query.

**P1 · The piece card and the text block (S).** `cardLines` brand in rose; `RackRowCard` hanger,
heart-on-proposal, price on the role line, dashed thumb, changed state; native twins; the look
page's text block (mix line + Composed by Robes above, description below) on the saved look and
`WorkingLook`. Snapshot/unit tests on both platforms. Ships on its own: no behaviour change.

**P2 · The draft page (M–L).** `DraftPage` (web + native) for every `status = draft`: §1.3 in
full, `AdjustThread` with the options row and the pending state, Dress it again (with the
question), Update the model, Save (date-aware), Discard/Remove, the saved → changed eyebrows.
`look-view.tsx` / `LookScreen.tsx` route drafts to it; `composer.tsx` / `Composer.tsx` deleted
(`/looks/new` opens an empty `DraftPage` whose rack starts at **+ Add a piece**; the photo door
stays). Tests: `composer.test.tsx` → `draft-page.test.tsx` (native), `looks-ui.spec.ts` draft
cases rewritten, pending-count unit test in `@robes/core/looks`.

**P3 · The prompt box and the draft tile (M).** `diary[].draft` → `DraftTile` in the slot (three
states), the box's thread/options/locked chips/collapsed input, send → tile (no navigation), ↻ on
the tile, View draft → `DraftPage` with `‹ Today`; the deck no longer reached from the box (the
piece door keeps it). Tests: `prompt-box.test.tsx` + `diary-home.test.tsx` (native),
`home.spec.ts` (web e2e: send → tile → adjust → save → OOTD card), `jobs.spec.ts` for `ways: 1`.

**P4 · Tidy (S).** Delete `LookPromptBox` if D6 retires it on saved looks too; copy and docs;
`STATUS.md`; a dated entry in the legacy history is **not** needed (platform only).

Order inside a phase: contract → server + tests → web → native → e2e. P1 can ship before P0.

---

## 6. Other places that would take this language (not in this pass)

1. **The piece door** (HomeBox "+ piece", piece page "Style it three ways"): one draft around the
   piece, the thread, Dress it again — the deck and `suggested` retire entirely (D1).
2. **The saved look page**: the pill → card thread in place of the folding `LookPromptBox`, with
   **Update look** (D6).
3. **Today's daily look and the trip packer**: the stale picture + Update the model pattern
   instead of drawing after every change.
4. **The Lookbook's In progress row**: the draft tile's three states as the card.

---

## 7. Review: multiple looks on a day — 3k "Wed 4" against staging

**What the design frame shows** (`assets/2026-11-02-home-ootd/3k-wed-two-looks.png`, and the
artifact's `one: true` branch, which renders every look as its own card): Wed 4 selected, **two
rings** under the 4; the slot is a horizontal scroller — **the OOTD as a full card** (× top right,
lookbook icon bottom left, title row `SATURDAY, UNDONE ›`), then **the second look as its own full
card** peeking at the right edge (its own lookbook icon and title `DIN…`), then Add look. There is
**no +N stack on the OOTD's corner** in the rendered frame. The artifact's *note* on 3k describes a
"+1 stack" and an "Open Saturday" pill; its code sets both to null for this frame, so the note is
older than the render. The Day page (★ The OOTD · Look 2 · × · + Add a look) is reached from the
**date line** ("Open the day") and from the Diary, not from the card.

**What staging does** (your two captures; `day-slot.tsx` / `DaySlot.tsx`): one OOTD card with the
other looks fanned into a **58px rotated stack** at bottom right that opens the Day page; the second
look is never a card; the Add look tile follows. The first capture (scrolled) shows the stack thumb
cut off at the card's edge under the × — on a 440pt frame the stack reads as a stray thumbnail.

**Differences, in order of weight:**
1. **The second look is hidden** behind a 58px thumb; the design shows it as a card she can open,
   change or take off directly.
2. **The stack's rotation and overlap** (3°/−4°/6°, −30px) have no counterpart in the frame.
3. **The door into the day** is the stack on staging; in the frame it is the date line / Diary.
   Staging's cards open the look (`/look/:id?day=`), as the frame does.
4. The strip's **two rings** match.

**Recommendation (default for D7):** match the frame. `DaySlot` renders every entry as an `ootd`
`LookTile` card in the scroller — the OOTD first (position 0), then the others in order, then
Add look — each with its own ×, lookbook icon and title row; delete `Stack`. Keep a door into the
Day page: a tap on the selected day's cell again, or the masthead's day line (3k's "Open the
day"), opens `/plan/:date` — one line of copy, no new component. The draft tile (§1.2) takes the
slot **after the day's looks and before Add look** when a draft is live. This is a small change
(both twins, one test each) and can ride with P3.

---

## 8. Decisions for Annie (defaults I will build to)

| # | Question | Default |
|---|---|---|
| D1 | Does the **piece door** (HomeBox "+ piece", "Style it three ways") also become one draft now, retiring the deck and `suggested` for good? | **Not this pass.** The prompt door becomes one draft (3b); the piece door keeps the deck until a design for it exists. `suggested` stays in the model. |
| D2 | **Dress it again**: a new version **in place** (same look id, thread kept) or a second draft beside the first? | In place, as 3b draws it (`dV` increments, one tile). |
| D3 | Who draws the model: by itself after a change (today's debounce) or only **Update the model · N** and Save? | Only on ask / Save, both for prompt and hand-built drafts (one behaviour, one image spend). |
| D4 | The hand-built draft's **hotspots** (`+ Top · + Bottom · + Shoes` on the figure) — keep on the one draft page? | Retire; the rack's **+ Add a piece** and the hanger are the doors, as 3b. The empty draft shows the bare model and the dashed row. |
| D5 | Save from home: pin to the day the chip named **in the same act**, or open the DiarySheet as the Lookbook does? | Same act (`SaveLookInput.date`), tile → OOTD card; the sheet stays for the Lookbook. |
| D6 | The **saved look's** prompt: the pill → card thread now, or keep `LookPromptBox` until a saved-look design exists? | Keep `LookPromptBox` on saved looks this pass; P4 revisits. |
| D7 | Multiple looks on a day (§7): match the frame (one card per look, no stack) or keep the stack? | Match the frame. |
| D8 | The to-find row's dashed `#D9CBB7`: new token or `selected-line`? | `selected-line` (it is the same warm family; one fewer token). |
