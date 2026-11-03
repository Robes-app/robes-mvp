# Home → the OOTD diary: implementation plan

Status: plan, 2026-11-02 (Annie + Claude). Not started. Owner: Annie.
Supersedes the FTUE and Today directions listed in §6. Web and native land together (CLAUDE.md).

**Sources.** The PRD "Robes Onboarding / Today Plan" (four items: Day one · OOTD home as a 2-week
diary · prompt box tags · notifications bell) and the Claude Design artifact *Front Door design
frames* (`claude.ai/code/artifact/a9e01771-a44e-4b20-9863-0c3f342cff63`). The artifact renders two
frames, **3a "Day one"** and **3k "One OOTD, alerts in profile"**; frames 3b–3j are still in the file
but filtered out of the render, so 3k is the chosen direction and 3a its first-run state. Reference
captures of every state are in `assets/2026-11-02-home-ootd/` (taken from the artifact at 390pt).
The design is the spec: §1 transcribes it so nothing is built from memory.

---

## 0. The short version

- Home becomes a **diary strip + one selected day**. The strip pages in weeks (today centred); the
  day below shows its OOTD as one hero card, with an "Add look" tile, and the prompt box under it
  for today and days ahead. Past days log a wear instead and have no prompt box.
- **Looks reach a day two ways only**: *Pick Look* (the drawer of saved looks) or *Capture Look*
  (a photo). A prompt still makes a look through a job and the deck; it lands on the day when she
  saves it (product invariant: nothing is written to a day until saved).
- The **prompt box** carries a passive day chip, a per-day place chip with that place's weather
  (removable), and a hanger that opens a multi-select wardrobe flyout; chosen pieces sit as tokens.
- **Notifications** move behind a bell (receipts to review · unlogged days in the last 7). Home
  carries no alerts, no step cards, no saved/suggested rows.
- **Day one** keeps the 5-step onboarding and adds a band at the top of home: *Choose your model*
  (placeholders) and *Add your first pieces* (Tops · Bottoms · Shoes · Anything), each dismissable.
- Ships behind a client flag `home.diary`; old home deleted once the flag is on for everyone.

Sixteen places where the current IA or data model would break are in §3. Seven decisions for Annie
are in §7, each with the default I will build to unless told otherwise.

---

## 1. The design, transcribed (build this; nothing else)

Tokens are the platform's (`@robes/tokens`). Two literal colours in the design are **not** tokens
and must become ones: the warm selection pair `#F3EFE6` fill / `#C9BCA6` edge (already the
selected-card rule in root CLAUDE.md), and the past-day ink `#A0927A` / `#B9AD95`.

### 1.1 Chrome
- **Header (mobile)** 64px: wordmark left; right, a **bell** 36×36 (17px outline, rose 7px dot with a
  1.5px cream ring when there is anything to see) then the avatar 30px (`sage-mid`, initial) which
  opens Settings (= You). **Desktop**: wordmark · Lookbook · Diary · Wardrobe; right, a weather pill
  (icon · weekday · city · temp) and the avatar.
- **Dock**: Home · Lookbook · Diary · Wardrobe, active = ink with a 24×2 bar above. (Native is
  already this order; the label changes from "Today" to "Home".)

### 1.2 Masthead
- `Good morning, {firstName}.` serif 300 32px; `Good evening` from 20:00.
- Today line, 10px sans uppercase tracked `.2em` ink-faint: `MONDAY · DUBLIN · 11°C ☁`. **Today
  only**; it never follows the selected day. Tapping the place is not in 3k (it was in 3i) — not built.

### 1.3 Day-one band (3a only; sits between the masthead and the strip)
Full-bleed `cream-200`, hairline top and bottom, collapses with a height/opacity transition.
- **Choose your model** — person icon, eyebrow 10px uppercase `.26em`, × at right. A row of
  104×132 tiles, `rad` 12: dashed `cream-100` "Create your digital twin" (camera icon), then
  full-length model placeholders (selected = `#C9BCA6` edge + 20px sage check bottom-left), then a
  dashed "+ Another model".
- **Add your first pieces** — hanger icon, ×. Tiles 104×132 dashed: image icon, label 13px (**Tops ·
  Bottoms · Shoes · Anything**), "or <u>browse files</u>" 10.5px. Tap = camera/file for that
  category.
- × on either shows a centred dialog (cream card, serif 20 message, ink pill **Okay**): "You can
  select another model in your profile at any time." / "You can add pieces in your Wardrobe at any
  time." Okay collapses that section; the band disappears when both are gone. Dismissal persists.

### 1.4 The strip
- A horizontal **pager** of 7-day pages, scroll-snap, today's page centred so **today−3 … today+3**
  show; swipe for the week before and after (the design pages 3 weeks = today−10 … today+10; the
  PRD says 6 back and 6 ahead — decision D1).
- Cell 43px: weekday 9px uppercase `.1em` (**TODAY** for today); number serif 20px; a 5px marks row,
  one mark per look: **planned = ring** (hairline `ink-soft`, fill = cell background), **worn =
  filled dot** (`ink-soft`; `#A0927A` on past days). Past numerals `#A0927A`, past weekday
  `#B9AD95`. Today's cell always `#F3EFE6`; the selected cell gets a 1px `#C9BCA6` edge.
- Tap a day → the slot and the prompt box re-render for it (selection is client state; `?day=` on web).

### 1.5 The slot (the selected day)
A horizontal scroller (padding 0 44px, snap centre) holding at most two things:
1. **The OOTD card** when the day has looks — white, 1px `rule`, 6px radius. Image 4/5
   (`object-position 50% 20%`). Over it: **×** top-right (28px, `rgba(250,248,245,.5)`) *removes the
   look from the day*; **lookbook icon** bottom-left (36px round, cream) *changes the look* via the
   drawer (single-select, current look preselected); **+N stack** bottom-right when the day holds
   more looks (58px 4/5 thumbs, rotated 3°/−4°/6°) → opens the Day page. Title row: name in 10px
   sans uppercase `.16em` + › → opens the look. No eyebrow, no tag.
2. **Add look tile** — dashed `cream-400`, white; 4/5 `cream-100` top with a 52px + circle; footer
   "ADD LOOK" in `#B9AD95`. Full width on an empty day. → **Log sheet**.
Past days: a worn look renders exactly as the OOTD card (× deletes the wear); no prompt box.

### 1.6 Log sheet (from Add look)
Bottom sheet, grabber, eyebrow rose `{WEEKDAY} {N}`, serif 24 question: past **What did you wear?** ·
today **What are you wearing?** · ahead **What will you wear?** Two 56px rows with 40px round icon:
**Pick Look ›** (lookbook icon) → the drawer in multi-select; **Capture Look ›** (camera) → the
photo flow (`capture=environment`, camera roll allowed).

### 1.7 The drawer (Pick Look · change a look)
Tall sheet (top 72px). Eyebrow 9px uppercase `TODAY · MON 2 NOV` / `TUESDAY · TUE 3 NOV`; title =
the same question; row **YOUR LOOKS** (rose) with **Last worn ↓** (sort pill) and **Refine** (warm
when open or active, `· n` count). Refine card: search "Search by name or piece", **SEASON** chips
(Spring/Summer · Autumn/Winter · Year-round), **WEAR IT FOR** chips (Everyday · Work · Evening ·
Occasion · Travel · Active · Lounge · Weekend casual); empty: "No looks match. <u>Clear refine</u>".
Grid 2-col, cards padded 6px, `rad` 12: image 4/5 with a 22px tick dot top-right; title serif 16;
line 8.5px uppercase: **Scheduled** (already on the day) · **Adding** (ticked) · else meta
(`2 wears` · `Saved Sunday` · `Not worn yet`). Selected card = warm fill + `#C9BCA6` edge.
Footer CTA (48px pill): idle hairline muted **Tap looks to add or take off today**; ready = ink:
- from the lookbook icon (single-select): **Wear this look today** / **Wear this look on Tuesday** /
  **Wore this on Sunday** / **Clear today** when she unticks the current one;
- from Pick Look (multi-select): **Schedule Looks** / **Schedule 1 Look** (past days file wears).

### 1.8 Prompt box (today and ahead)
0.5px `rule-mid`, `rad-lg`, cream, padding 10/6/6.
- Row 1 chips (28px, 11px): **Day chip** — passive and muted (`rgba(32,32,33,.04)` fill, `.08`
  edge, `.38` text, calendar icon): `Today` / `Tue 3`; follows the selected day. **Place chip** —
  warm, pin icon, `Dublin · ☁ 9–13°` (that day's range at that place); its × ("Leave the weather
  out") animates the chip down to a white hairline **Weather** chip, tap restores. Tapping the place
  opens the **place popover**. Right: **hanger** 28px (white hairline; warm when open or carrying
  pieces, then `n` and a × "Remove all pieces").
- Row 2: **piece tokens** — warm pill, 20px round thumb, name, ×.
- Row 3: input, serif italic 300 17px, placeholder **Plan an outfit for today** / **Plan an outfit
  for Tuesday**; a 40px round → appears when there is text or pieces.
- **Place popover** (web: a card under the chips; native: a sheet): search pill "Type a city" with ×;
  italic line **For today only** / **For Tuesday 3 only**; eyebrow **HOME AND RECENT** (or
  **CITIES** while typing): rows `City · Country`, **HOME** tag on her home, `☁ 9–13°` right; current
  row warm; Enter picks the first; "No match for “x”. Try another spelling."

### 1.9 Wardrobe flyout (hanger)
Tall sheet. Eyebrow rose **ADD FROM YOUR WARDROBE**, title serif 24 **Build today around** / **Build
Tuesday around**, **Cancel**. Search pill "Search your wardrobe". Category chips with counts
(`All 6` · `Tops 1` …; ✓ prefix when on; warm when on). Grid 3-col: first tile dashed **PHOTOGRAPH
ONE** with italic "Adds straight in" under it; pieces 3/4 with a 20px tick dot, warm edge when
picked, name serif 14. Footer: idle hairline **Tap pieces to add them** → ink **Include 2 Pieces** /
**Include 1 Piece**; with pieces already applied and none ticked, **Clear pieces**.

### 1.10 Day page (from the +N stack)
Full page. `‹ Home` pill. Eyebrow rose `WEDNESDAY 4 NOVEMBER`; italic serif 26 **Name the day** (the
name field, her words verbatim); line `Dublin · Showers · 11–15°`; row **LOOKS FOR THE DAY** + `2
looks`. 2-col cards (3px radius): **★** on the OOTD (warm, `#C9BCA6` edge, eyebrow rose **THE
OOTD**), **☆ Make this the OOTD** on the others (eyebrow **LOOK 2**), title serif 16, × "Take off
the day"; last, a dashed **+ ADD A LOOK** → the drawer (multi).

### 1.11 Look page (from the card title)
`‹ Wed 4 Nov` pill, eyebrow **SAVED LOOK**, title serif 28, meta `4 pieces · 3 wears · last worn 13
Oct`, the image, footer **Edit look**. This is the existing look page with that back pill and meta.

### 1.12 Notifications sheet (bell)
Bottom sheet: **Notifications** serif 26 + ×. Cards (white, 1px `rule`, `rad` 12, 12px padding):
32px icon tile (`cream-200`; receipt or calendar glyph), text serif 16 (`2 receipts to review` ·
`Log Wednesday’s wear`), eyebrow 9px **WARDROBE** / **DIARY**, ›; a separate 36px round × dismisses.
Empty: **Nothing new.**

### 1.13 Settings (avatar)
Back arrow, **Settings**, segmented **Style profile | Account**, rows serif 18 with ›: Your digital
twin · Style DNA · Observations / Details · Notifications · Sign out. Not in the PRD; see §5.

---

## 2. Where it lands (web ↔ native twins)

| Design piece | Web (`app/src/…`) | Native (`mobile/src/…`) | Today |
|---|---|---|---|
| Home | `components/home/home-view.tsx` | `features/home/HomeView.tsx` | rewrite |
| Strip pager | `components/home/diary-strip.tsx` | `features/home/DiaryStrip.tsx` | new; replaces `home-week.tsx` / `Week` |
| Slot: OOTD card + Add look | `components/home/day-slot.tsx` | `features/home/DaySlot.tsx` | new; composes `LookTile` (`onImage` for ×/lookbook/stack, `corner` unused) |
| Log sheet | `components/home/log-sheet.tsx` | `features/home/LogSheet.tsx` | new, on `Sheet` |
| Drawer | `components/plan/look-picker.tsx` | `features/plan/LookPicker.tsx` | restyle + single/multi modes, Refine, Last worn, CTA copy |
| Prompt box | `components/home/home-box.tsx` | `features/home/HomeBox.tsx` | rewrite (chips, tokens, hanger) |
| Place popover / sheet | `components/home/place-popover.tsx` | `features/home/PlaceSheet.tsx` | new |
| Wardrobe flyout | `components/wardrobe/wardrobe-picker.tsx` | `features/wardrobe/WardrobePicker.tsx` | new multi-select; `SwapSheet` stays single-select for swaps but adopts this anatomy (§5) |
| Day page | `app/(app)/plan/[date]/day-view.tsx` | `features/plan/DayView.tsx` | restyle (★, weather line, "Name the day") |
| Look page back pill + meta | `app/(app)/look/[id]/look-view.tsx` | `features/looks/LookView` | small |
| Bell + sheet | `components/shell/notifications.tsx` in `app-shell.tsx` | `components/Bell.tsx` in `TabScreen.tsx` | new |
| Day-one band | `components/home/day-one-band.tsx` | `features/home/DayOneBand.tsx` | new; replaces `home-steps.tsx` / `HomeSteps.tsx` |
| Icons | `packages/icons`: add `bell`, `pin`, `receipt`, `hanger`, `stack` | same file | |
| Copy | `packages/copy/src/home.ts` (new `diary`, `door`, `drawer`, `flyout`, `bell`, `dayOne` blocks) | shared | |

Server and contracts (one PR, first):
- `Today` gains `diary: DiaryDay[]` — `{date, name, place:{city,country,lat,lon}|null, weather:
  TodayWeather|null, entries: [{entry: PlanEntry, worn, position}]}` for the strip's window.
  `week` (7, forward) stays so installed builds keep parsing; delete it with the old home (§4 P4).
- `planned_days.position int not null default 0` + `plan.ootd` `PUT /plan/days/:date/ootd {entryId}`
  (moves that entry to 0). The OOTD = position 0, then slot, then created_at (`repos.plan.range`).
- `day_places(user_id, day_date, city, country, lat, lon)` + `plan.place` `PUT /plan/days/:date/place`
  (`null` clears) and `places.search` `GET /places?q=` (Open-Meteo geocoding; we already use their
  reverse geocode in `server/location.ts`). Rate-limited, public-safe, no PII logged.
- `today.weather` input gains `lat/lon` (optional; defaults to home) and the server returns the
  **day's range for past days inside the window too** (Open-Meteo `past_days` ≤ 92) — today it
  returns null before today (`server/weather.ts:29`).
- `PromptLookInput` gains `pieceIds: uuid[] ≤ 8` and `place: {city,lat,lon}?`; `style-piece`
  handler builds around the pieces (same contract as `TodayGenerateInput.lockedPieceIds`) and uses
  the given place's forecast in `dayContext`. Prompt module versioned (`v6`) with an eval.
- `notifications.list` `GET /me/notifications` → `{items: [{key, kind: receipts|diary, text, line,
  href, date?}]}` computed per request from `inbox.piecesWaiting` and the last 7 days without a wear
  (and without a planned entry marked worn); `notifications.dismiss` `POST /me/notifications/dismiss
  {key}` writes `notification_dismissals(user_id, key, dismissed_at)`. A nudge key is the date, so
  it never comes back once dismissed; the receipts key is the inbox count snapshot.
- `profiles.model_preset text null` + `me.model.update {preset}`; `packages/core/model/presets.ts`
  with the placeholder stands (D4).
- Flag `home.diary` (seed migration; `CLIENT_FLAGS`; `Features.homeDiary.default(false)`).
- `docs/data-inventory.md` rows for `day_places`, `notification_dismissals`, `model_preset`.

---

## 3. Where the current IA breaks (flagged before building)

| # | Break | What the design needs | Fix |
|---|---|---|---|
| B1 | `Today.week` is `.length(7)`, today first, forward only (`contracts/today.ts:85-93`); clients parse strictly, so changing it breaks installed phones | 21 (or 13) days with every entry, past included | Add `diary`; leave `week` until P4 |
| B2 | Home is the modular O1–O4 / G1 / H1–H4 machine (`core/home/index.ts`, `resolveHome`, `me.home.later` snooze, `HomeSteps`, `StepMap`) | A strip and a day; no steps, no alerts, no saved/suggested rows | Retire O2/O3/O4, G1, H1, H4 and the snooze route; O1 (Style DNA) stays in onboarding; `resolveHome` reduced to the band's two dismissals |
| B3 | Weather is home-only, null for past days and >15 days ahead (`server/weather.ts`); location is her profile home (`me.location`) | A place **per day**, with that place's range on past days too | `day_places`, `places.search`, weather by lat/lon with `past_days` |
| B4 | The prompt anchors on **one** piece (`GenerateLookInput.anchor.pieceId`); `PromptLookInput` has no pieces; `SwapSheet` is single-select | "Include 2 pieces" | `pieceIds` on `looks.prompt` + a multi-select picker |
| B5 | A prompt makes a job → deck → Save; the design's day chip implies the look belongs to the day | Invariant: nothing reaches a day until saved | Keep: send `date` (already `dateHint`), Save pins it; the deck's Save offers the day. No change to the invariant |
| B6 | Past day = immutable wear (`diaryPick`, `repos/looks.wear`); × on a past day | "Retrospectively add a look that was worn"; × removes | × = `looks.unwear` (deletes the wear and its plan rows — already so); the drawer on a past day files wears, never pins |
| B7 | No ordering on `planned_days`; the OOTD is "first by slot then created_at" | ★ "Make this the OOTD" | `position` column + `plan.ootd` |
| B8 | Rule: `DiarySheet` is the only place a day is picked | The strip picks the day, then the drawer picks looks for it (`LookPicker` already does this on the day page) | Rule amended in `platform/CLAUDE.md`: "a day is picked on the strip, the Diary or in `DiarySheet`; the drawer is `LookPicker`"; the prompt's day chip stays passive so it is not a second date field |
| B9 | No in-app notification model (`app.notifications` is a send ledger), no bell, no badge | Bell with receipts + unlogged-day nudges, dismissable | Computed list + dismissals table (§2) |
| B10 | "Change a look" = unpin old + pin new in one gesture; no route does both | Lookbook icon → single-select drawer | Client does `plan.unpin` + `plan.pin` (or `unwear` + `wear`) with undo toast; no new route |
| B11 | Web header is Today · Wardrobe · Lookbook · Diary; native tab label "Today" | Home · Lookbook · Diary · Wardrobe; desktop nav Lookbook · Diary · Wardrobe + weather pill | `lib/nav.ts`, `TabBar`, copy `nav.today → nav.home`; routes unchanged |
| B12 | `/plan/[date]` has LOOK n eyebrows, a dashed "add another", no ★, weather only from today on | The Day page as in §1.10 | Restyle; weather via B3 |
| B13 | Onboarding is 5 steps with no model or pieces step; `CompleteOnboardingInput` is `.strict()`; e2e helper walks the 5 steps | Day-one band on home, not in onboarding | No onboarding change; band dismissals persist in `profiles` (`model_asked_at`, `pieces_asked_at`) — not the 24h snooze |
| B14 | Tests pin the old home: `e2e/today.spec.ts:12` (`week` = 7), `e2e/home.spec.ts:112-172` (stages), `mobile/__tests__/home.test.tsx` (`week-day-*`), `core/home/home.test.ts` | — | Rewrite in P1/P3; never loosened to pass |
| B15 | Flags are global on/off (`rollout` unused) | A staged rollout | Global `home.diary` is enough for testers; per-user rollout is a separate task |
| B16 | PRD window (6 back · 6 ahead = 13) ≠ design strip (3 pages of 7 = 21) | one window | D1 |

Not a break but worth saying: the Diary tab (`/plan`) stays forward-only 30 days + Month; the
home strip is the only surface that shows the past week. §5 proposes aligning it later.

---

## 4. Phases (each a PR into `beta`, each green on `pnpm verify` + e2e; commit per task)

**P0 · Contracts, data and server (S–M, no UI).** `diary` on `Today`; `position` + `plan.ootd`;
`day_places` + `plan.place` + `places.search`; weather by lat/lon with past days; `pieceIds` +
`place` on `looks.prompt` and the handler + prompt v6 + eval; `notifications.list/dismiss`;
`model_preset`; flag seed; data inventory; DB + route tests; `docs/api.md`.

**P1 · The diary home, behind the flag (M–L).** Strip pager, slot (OOTD card, Add look), Log sheet,
drawer restyle with single/multi modes, Day page restyle, look page back pill + meta, bell + sheet
in both shells, nav labels. Web and native in the same PR. New tests: strip window and marks
(core), slot states (past worn / today planned / ahead empty / stack), drawer CTA copy per day,
bell list and dismiss (e2e + native), `?day=` deep link.

**P2 · The prompt box (M).** Day chip (passive), place chip + weather + × collapse, place popover
and sheet, hanger + wardrobe flyout + tokens, send with `pieceIds` and `place` and `date`. Tests:
chip states, flyout search/category counts/CTA copy, prompt input shape.

**P3 · Day one (S–M).** Band with model placeholders and piece tiles, dialogs, persisted
dismissals; delete `HomeSteps`/`StepMap`/H1/H4 rendering and `me.home.later` from the clients (route
kept until P4); rewrite the pinned tests (B14); docs: `ux-opportunities.md` §3.2, `CLAUDE.md` rule
B8, STATUS.

**P4 · Flip and delete (S).** Flag on; remove `week`, `resolveHome` modules, `home.later` route and
table, old components; route-manifest test updated.

Order of work inside a phase: contract → server + tests → web → native → e2e. Native keyboard
handling on the prompt box (N2 in the parity plan) is part of P2.

---

## 5. Other places that would benefit from this UI language (not in this pass)

1. **Diary tab (`/plan`)** — the same week pager + day slot above the List|Month toggle, so the
   Diary and Home are one anatomy; the Day page is already shared.
2. **Lookbook** — the Refine card (search · Season · Wear it for) and "Last worn ↓" replace the
   current filter sheet; the saved tile's calendar button opens the Log sheet question
   ("What will you wear?") rather than the month calendar for the common case.
3. **Wardrobe** — the flyout's search pill + category chips with counts become the Wardrobe
   header; "Photograph one · Adds straight in" becomes the grid's first tile; the multi-select
   picker serves Composer swaps (single mode), trip packing and "Build it around" everywhere.
4. **Look page** — the `‹ Wed 4 Nov` back pill when opened from a day, and the one-line meta
   `4 pieces · 3 wears · last worn 13 Oct`.
5. **You** — the design's Settings (Style profile | Account segmented control, serif rows) is a
   cleaner `/you`; the bell's "Nudges" matches the existing notification preference.
6. **Shared primitives** — promote three patterns into `@robes/ui` / `ui-native`: the warm selected
   chip/card (`#F3EFE6` / `#C9BCA6`) as the one selection style; the passive muted chip; the tall
   sheet (top 72px, eyebrow/title/Cancel, idle-hairline → ink footer CTA) used by the drawer and
   flyout. Composer's `SwapSheet`, the trip packer and `PieceFieldSheet` should adopt it.
7. **Desktop web** — the header weather pill from the design's desktop nav.

---

## 6. FTUE and Today directions this overrides

- The modular home (O1–O4 step cards, G1 step map, "Later" snooze, H1 alerts, H4 saved/suggested
  rows) from the 2026-10 home work; `ux-opportunities.md` §3.2 "the week strip (next 7 days)".
- Parity plan F8 ("O4 Build the look opens an empty draft") — O4 is gone; the empty day's Add look
  and the prompt box are the first-look doors.
- Receipts strip and "Robes noticed" on home — receipts go to the bell; observations stay under
  You › Observations (the bell carries no observations in 3k).
- The overnight look card on home (M5 task 3) — no place in 3k; see D2.
- Unchanged: the 5-step onboarding (name · identity · styles · brands · colours) and UX-22.

---

## 7. Decisions for Annie (defaults I will build to)

| # | Question | Default |
|---|---|---|
| D1 | Strip window: design's 3 pages of 7 (today−10…+10) or the PRD's 13 days (−6…+6)? | The design: pages of 7 with today centred; data window ±10 |
| D2 | The overnight look: where does it live now? | A bell item "Robes dressed you for Tuesday" → the daily look; it is not planned until she saves |
| D3 | Capture Look on a past day: creates a look from the photo (named by the date) and files the wear? | Yes, via the existing photo-read → look flow, then `looks.wear` |
| D4 | Model placeholders: how many, which? | Three generic stands drawn from presets (fair/medium/deep colouring, same line); "Create your digital twin" → `/you/model` |
| D5 | The bell on day one (the design shows none on 3a) | Always show the bell; the dot only with items |
| D6 | Dock label "Home" vs the current "Today" | "Home", both platforms, as drawn |
| D7 | Settings page (§1.13) now or later? | Later (§5.5); the avatar keeps opening `/you` |

Answer any of these by editing the Default column; silence means the default.

**Answered 2026-11-02 (Annie):** D1 the design · D2 ok · D3 yes · D4 three generic models (the
catalog's `GENERIC_CELLS`) · D5 default · D6 Home · D7 no change.

---

## 8. Build notes (2026-11-02, branch `feat/home-ootd-diary`)

Where the build departs from §1, and why:

- **Past-day inks.** The design's `#A0927A` / `#B9AD95` fail the 4.5:1 text rule on cream, so past
  numerals and weekdays use `ink-faint` (80% of it failed too, CI run 83); the past still recedes.
- **A Robes model picked keeps the ask**, ticked, until × (the design's tick has to be seen);
  only her own close-up on file retires it unasked. The pieces ask retires with her first photo.
- **The day chip** is sunk (`surface-sunk`, hairline) in `ink-faint`: the design's 40% ink fails
  4.5:1, and `ink-muted` on `surface-sunk` is 4.4 (CI run 84). The month view's day number reads
  in ink on a trip band for the same reason.
- **The generation tray** stays at the foot of home (the design never shows a running job); it is
  the way back to a deck that is still composing.
- **Capture Look on web** opens the file picker from the sheet (one tap, a user gesture) and hands
  the file to `/looks/new/photo?day=` through `lib/pending-photo.ts`; native opens the camera on
  that route directly.
- **The bell on day one** shows always (D5), its dot only with items.
- **Day one's dismissals** persist through the bell's dismissal store (`user_ui_state.dismissed`,
  keys `dayone:model` and `dayone:pieces`), not a new column; `Home.state.dayOne` reads them.
- **Recent places** in the popover are kept for the session only; home and the day's place come
  from the diary read.
- **Web e2e** for the diary home lands with P4 (the flag is global across the e2e database, so a
  spec that flips it would collide with the specs that pin the modular home).
- **P4 keeps the server's old shape.** `Today.week`, `Today.home` and `POST /me/home/later` stay
  so installed phone builds keep parsing and working until a store build ships; only the clients'
  modular home is deleted. `home.diary` is retired: signed-in `/` and the home tab always render the
  diary, and the client flag is gone from `Features`.
- **Native clock-bound tests.** Two pre-existing tests (`plan.test.tsx` "the switcher and + sit
  pinned…", `trips.test.tsx` "the plan switches to a month…") read the real clock and look for
  "October 2026"; they fail from 1 November regardless of this work.
