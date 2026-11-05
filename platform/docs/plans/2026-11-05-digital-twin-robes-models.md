# Digital twin · Robes models: implementation plan

Status: plan, 2026-11-05 (Annie + Claude). Not started. Owner: Annie.
Web (staging.byrobes.com) and native (Expo) land together (CLAUDE.md). Platform only; the legacy
beta app is untouched.

**Sources.** The Claude Design canvas *First-time experience*
(`claude.ai/code/artifact/6ddc9052-6923-4bff-8139-8e815402f3a7`), flow row "Digital twin · Robes
model flow": 0a Home · Your twin tile, 3a Look · Robes model tag, 3b Tag tapped, 2c Selfie, 3c Your
digital twin · on a Robes model, 3d Your digital twin · ready, 3e/3f Colouring. The "in production"
row is screenshots of today, for reference. Annie's answers to the twelve questions of 5 Nov are
in §6; the design is the spec and §1 transcribes it so nothing is built from memory.

---

## 0. The short version

- **Five Robes models, not three**, for women and for men: the three today, plus an older woman and
  a larger woman (their male twins likewise). Non-binary rides the women's set, as it does today.
  Drawn by Gemini once ever, as the three are now.
- **Picking a Robes model is remembered as a pick** (`profiles.model_preset`), never as skin and
  hair picks. Today a pick is indistinguishable from a hand-built model; after this it isn't.
- **Create your digital twin opens the selfie camera at once.** Every door to it is one hook: the
  home tile, the model page's "Add a selfie" row, the look tag's Capture Selfie, and the retake on
  the twin's hero. The selfie reads her colouring; the twin draws from it; her line comes later.
- **"Robes model" is the tag**, the words `Generic model` wear now, on every look whose picture
  stands on a Robes model (read from the look's render or frame key, never from her account).
  Tapping it opens a sheet: Capture Selfie · Adjust Robes Model.
- **Colouring and Body shape are the twin's.** On a Robes model the page shows the lineup and
  "Add a selfie" only; the doors appear once she has a twin.
- **Her twin joins the lineup.** Once drawn, it is the first tile and the chosen one; choosing a
  Robes model again stands her looks on it and keeps her selfie and twin on file. No
  "Use a Robes model instead" button: the lineup is that.
- **Colouring loses the close-up card** (the selfie is captured a screen earlier). Retake lives
  bottom-right on the twin's hero.
- **"Another model" goes** from the home band.

---

## 1. The design, transcribed

Tokens are the platform's (`@robes/tokens`); Robes copy (`@robes/copy`), never literals.

### 1.1 Home · Choose your model (0a; supersedes plan 2026-11-02 §1.3 for this row)
Row of 104×132 tiles, `rad` 12: dashed "Create your digital twin" (camera icon) → **opens the
camera** (no page in between); then **five** Robes model portraits. Chosen = 1.5px ink edge and the
check bottom-left (as built today); unchosen = 1px band hairline. A portrait still to be drawn shows
the person icon. **No "+ Another model" tile.** The ×, the dialog and the persisted dismissal stay
as built.

### 1.2 Selfie (2c)
Native: the system camera, front-facing, through `expo-image-picker` (`cameraType: front`); the
screen's own words ("Your selfie" · "Face the light.") are not built — the picker is the system's.
Web: `<input type="file" accept=… capture="user">`, which opens the front camera on a phone and the
file picker on a laptop (accepted, §6 Q6). Permission refused on native → the photo library.

### 1.3 Look · Robes model tag (3a) and the tag sheet (3b)
A small quiet chip `Robes model` on the look's picture (the home OOTD card in the design; every
surface that shows a look's picture on a Robes model — look page, deck, draft, Lookbook tile,
Diary). It sits where `GenericModelBadge` sits today (top-right pill, 44pt hit area) and reads the
same on the Lookbook/Diary tiles through `LookTile`'s on-photograph slot. Tap → bottom `Sheet`
(never a modal): eyebrow `Robes model`, title *See every look* **on you.**, two rows:
**Capture Selfie ›** (camera icon) → the camera (§1.2); **Adjust Robes Model ›** (person icon) →
`/you/model`. Closing changes nothing.

### 1.4 Your digital twin · on a Robes model (3c)
Hero: the chosen Robes model's portrait, eyebrow `Robes model`. Under it one row, the screen's one
ink commitment: camera icon · **Add a selfie** · *Create your digital twin.* → the camera. Then the
**lineup**: the five portraits, chosen = 1.5px ink edge; a tap re-stands her looks on that one.
Below, dimmed and not tappable (decided §6 Q9): the two doors **Colouring** *Skin, hair and
season.* and **Body shape** *Set your line by hand.* — present so she sees what the twin unlocks,
disabled until she has one. No status line.

### 1.5 Your digital twin · ready (3d)
Hero: her twin, caption her colour words (`Peach · ash blonde hair`), **retake** as a 32pt circle
bottom-right on the hero (camera icon; → the camera). Group `Read from your photograph and facts`:
**Colouring** `Neutral · Low, blended` · value `Clear Winter`; **Body shape** `167 cm · UK 12` (or
*Set your line by hand.*). Then the **lineup** with **her twin as the first tile, chosen**, and the
five Robes models after it. Tapping a Robes model stands her looks on it (her selfie and twin stay
on file); tapping her twin stands them on her again. The italic status line stays as built.

### 1.6 Colouring (3e, 3f)
Sections: **Your season** — the chosen season row (warm fill, ink check), its nine-swatch palette,
`{axes} — {summary}`, *Full colour notes* (the sheet); the two nearest seasons; **Another season**
expands to the rest (3f), then reads *Fewer seasons*. **Skin and hair** — *Read from your selfie.
Change by hand.*; swatch rows titled `Skin · Peach`, `Hair · Ash blonde`. **No close-up card, no
retake, no Choose photo.** Swatch names are the catalog's (`you.model.skinNames/hairNames`); the
design's names are illustrative.
With no colour read on file (a legacy hand-built twin): *Add a selfie and Robes reads your season.*
with one quiet **Add a selfie** button → the camera.

### 1.7 Body shape
Unchanged (redline 3c, 27 Oct). Reachable only with a twin.

---

## 2. Model and data

### 2.1 Robes models (`packages/core/src/avatar/presets.ts`)
```ts
export const ROBES_MODELS = [
  { n: 1, skin: 4, hair: 1, age: 35, sizeUk: 10 },  // today's generic 0
  { n: 2, skin: 1, hair: 0, age: 35, sizeUk: 10 },  // today's generic 1
  { n: 3, skin: 7, hair: 3, age: 35, sizeUk: 10 },  // today's generic 2
  { n: 4, skin: 5, hair: 4, age: 62, sizeUk: 12 },  // older
  { n: 5, skin: 3, hair: 1, age: 35, sizeUk: 18 },  // larger
] as const;
export type PresetId = `${'w' | 'm'}${1 | 2 | 3 | 4 | 5}`;   // 'w4'
export const PRESET_STYLE = 'v1';
export const presetKey = (id: PresetId) => `preset:${id}@${PRESET_STYLE}`;
export function presetSpec(id: PresetId): TwinSpec   // gender, age, sizeUk, skin, hair, stops 0, hasFace false
export function presetIds(wearer: 'woman' | 'man'): PresetId[]
```
Skin and hair indexes for 4 and 5 are a first pass; Annie picks them from the swatches before the
portraits are drawn (one draw each, so decide first). A Robes model is **drawn by the twin prompt
with no face** (`buildTwinPrompt(presetSpec(id))`): age and size are already words there, so the
older and larger models need no new prompt. Portraits live in `app.avatar_cells` under
`presetKey(id)`, drawn once for everyone (the claim), never charged to her quota. The three legacy
generic cells (`w-s4-h1-nt@v2` …) stay in the table for installed phone builds; nothing new reads
them. `genericCellIds`/`genericCellId` are retired once every caller moves (§3).

### 2.2 Her pick: `profiles.model_preset`
Migration `pnpm db:new model_preset`:
```sql
alter table app.profiles
  add column model_preset text check (model_preset ~ '^[wm][1-5]$');
```
Null = never picked (she stands on `w1`/`m1`, as today's index 0). Set by `me.model.update
{ preset }`; **picking a preset no longer writes skin or hair picks** and clears any that a Robes
model pick wrote (`avatar_prefs - 'skin' - 'hair'` when the row has no close-up and no twin — a
hand-built legacy model keeps its picks). `docs/data-inventory.md` `app.profiles` row gains
`model_preset` (which Robes model she chose; not personal, listed for completeness). Old code and
phone builds never read the column, so the migration is safe under skew (runbook).

### 2.3 The stand (what a look is drawn on)
Resolved in one place, `standOf(row)` in `app/src/server/model.ts`, and mirrored for the worker in
`@robes/core/avatar` as a pure function over `TwinSource`:
1. **her twin** when `twin_asset_id` is set, its key is current **and** `model_preset` is null or
   `'twin'` — see below;
2. else **her filed catalog cell** (legacy hand-built, `avatars.avatar_id`, only when
   `model_preset` is null);
3. else the **Robes model** `model_preset ?? first of her wearer`.

Choosing a Robes model while she has a twin (§1.5) sets `model_preset = 'w3'`; choosing her twin
again sets it **null** (her twin is the default once it exists). So no `'twin'` value is stored; the
regex above stands.

Keys: a render on a preset is `${presetKey(id)}:${rack}`; on a twin `twin:${key}:${rack}`; on a
cell `${cellKey}:${rack}` (unchanged). The frame key likewise. `look-render.ts` and
`look-frame.ts` resolve a `preset:` prefix to the portrait in `avatar_cells` exactly as they
resolve a cell key today.

### 2.4 The look's tag
`onRobesModel: boolean` on the look contract (list and detail), computed in the looks repository
from the key the picture was drawn with: true when the frame key or render key starts with
`preset:` or is a legacy generic cell key. Never from her account. A look with no picture is false.
Older phone builds don't read the field (zod strips nothing on the client; the field is additive).

### 2.5 Contract (`packages/contracts/src/me.ts`)
`Model` gains `preset: PresetId | null` and `robesModels: { id, imageUrl, status }[]` (five, her
wearer); `stand` gains `on: 'twin' | 'cell' | 'preset'`. `generics` keeps being sent, grown to the
five preset portraits in the same `{id, imageUrl}` shape, for installed phone builds whose band
still reads it; retire it one release later. `UpdateModelInput` gains `preset: PresetId | null`.
`me.model.update` with `skin`/`hair`/`adj` while she stands on a Robes model and has no twin is
answered `conflict` (Q9: the Robes model is not hers to adjust).

### 2.6 The selfie → twin sequence
`useSelfie()` (web `app/src/lib/use-selfie.ts`, native `mobile/src/features/you/use-selfie.ts`):
1. open the camera (§1.2); cancel → nothing;
2. `uploadPhoto(kind: 'headshot')` → `me.style.analyse { kind: 'colour', assetId }` (exists);
3. navigate to `/you/model` at once; the hero shows the ghost figure and the `Drawing your model…`
   chip while the read runs;
4. when the analyse job finishes (`useAnalyse` already invalidates `me.model.get`), **call
   `me.model.twin`** — today the twin draws only on mount, which lands before the close-up is on
   file. `useDrawTwin` gains a `'when-read'` mode or the page calls it from the job's completion;
5. the twin lands; `model_preset` is cleared so her twin stands (§2.3).
Consent: the terms accepted at onboarding cover photo analysis (§6 Q5); no sheet.

---

## 3. Where it lands (web ↔ native twins)

| Surface | Web | Native |
|---|---|---|
| Robes models, keys, stand | `packages/core/src/avatar/presets.ts` (+ test), `twin.ts` `standOf` | shared |
| Migration, repo, inventory | `db/migrations/*_model_preset.sql`, `packages/db/src/repos/model.ts` (`savePreset`), `packages/db/test/schema`, `docs/data-inventory.md` | — |
| Contracts | `packages/contracts/src/me.ts`, `looks.ts` (`onRobesModel`) | shared |
| Server | `app/src/server/model.ts` (`standOf`, `ensureRobesModels` replaces `ensureGenericCells`, `updateModel` preset + conflict), `app/src/server/looks.ts` or the looks repo for `onRobesModel` | — |
| Jobs | `packages/jobs/src/handlers/avatar-cell.ts` (`preset` target → `buildTwinPrompt(presetSpec)`), `look-render.ts`, `look-frame.ts` (`preset:` keys) + tests | — |
| Copy | `packages/copy/src/lookbook.ts` (`genericModel` → `Robes model`, sheet rows), `index.ts` `twin.twinPage` (`addSelfie`, `addSelfieSub`, `retake`, `robesModel`, `fewerSeasons`) | shared |
| Home band | `app/src/components/home/day-one-band.tsx` | `mobile/src/features/home/DayOneBand.tsx` |
| Selfie hook | `app/src/lib/use-selfie.ts` | `mobile/src/features/you/use-selfie.ts` |
| Model page | `app/src/app/(app)/you/model/model-view.tsx`, `twin-parts.tsx` (`Lineup`, `Retake`) | `mobile/src/features/you/Model.tsx`, `twin.tsx` |
| Colouring | `…/you/model/colouring/colouring-view.tsx` | `mobile/src/features/you/Colouring.tsx` |
| Tag + sheet | `app/src/components/looks/robes-model-badge.tsx` (renames `generic-model-badge.tsx`), `look-tile.tsx` callers | `mobile/src/features/looks/RobesModelBadge.tsx` |
| Tests | `app/src/server/model.test.ts`, `app/e2e/model.spec.ts`, `home.spec.ts` | `mobile/__tests__/day-one-band.test.tsx`, `model.test.tsx`, `looks.test.tsx` |

---

## 4. Passes (each a PR into `beta`; web + native in the same pass)

**P0 · Robes models exist (S).** `presets.ts` + test; migration + repo + schema test + inventory;
`avatar-cell` job draws a preset through the twin prompt (test: the spec carries age 62 / size 18;
no face); `ensureRobesModels`. `Model` gains `preset`, `robesModels`, `stand.on`; `generics` grows
to five. Nothing visible changes yet except five tiles on the band.

> **Built 2026-11-05**, with P1's pick and stand folded in, because the band's tap had to keep
> working: with the pick stored as a pick, a tap that did nothing to the stand until P1 would have
> been a regression. What landed, and where it departs from §2:
> - A Robes model is a **catalog cell in its own grammar** (`w-r4@v1`, `m-r2@v1`,
>   `packages/core/src/avatar/robes-models.ts`), not a `preset:` key: the `avatar_cells` id check,
>   the media key and the job input all validate one regex (`CATALOG_KEY`), so storage, delivery
>   and caching are the cells' unchanged. `catalogKey(cellId)` picks the style for either grammar.
> - `profiles.model_preset` is a **smallint 1–5** (migration `20261105140000_robes_models.sql`),
>   so the pick follows her wearer; the id is built from it. Never chosen = null = the first.
> - **Hair gains silver** (swatch 5, `#B5AFA8`, "Silver", prompt word "soft silver grey"); every
>   bound on the hair index moved with it (contract, stored picks, cell grammar, DB check).
> - **Models 4 and 5**, chosen 5 Nov: 4 = skin 6 (peach), silver hair, 62, UK 12; 5 = skin 2
>   (chestnut), espresso hair, 35, UK 18, bust and hips one stop fuller. Men mirror them. Portraits
>   draw on first need, once each.
> - `standOf` (core) is the one rule for what a look stands on; the web stand, `renderOnModel`,
>   `look-render` and `look-frame` all read it. `me.model.update { preset }` saves the pick and
>   draws the five; a hand pick (skin, hair, line, frame, a scale) clears the pick so her own model
>   stands again; a twin drawn anew clears it too (the selfie wins). The P1 `conflict` rule is not
>   built: the doors close in P2 with the model page.
> - `generics` is still served (the three legacy cells, no longer drawn) for installed phone
>   builds; `genericCellId` and `ensureGenericCells` are gone, `genericCellIds` stays for that.
> - Not run here: the schema tests (`pnpm db:test`, needs Postgres) and the e2e (`home.spec.ts`
>   updated for five tiles and the stored pick). Everything else green: lint, typecheck, core,
>   contracts, media, copy, jobs, app and the native band tests.

**P1 · The pick and the stand (M).** Folded into P0 (above) but for the `conflict` on adjusting a
Robes model, which lands with P2's model page, where the doors close.

**P2 · The selfie (M).** `useSelfie` web + native; the band's twin tile, the model page's "Add a
selfie" row and hero retake, Colouring's fallback button all call it; the twin draws when the read
lands (§2.6 step 4). Model page states 3c and 3d with the lineup (her twin first when drawn).
Colouring loses the close-up card, gains *Fewer seasons*. e2e: `model.spec.ts` "she builds her
model" becomes "she takes a selfie, her colouring reads, her twin draws, a look renders on her";
a second case picks a Robes model and checks Colouring is closed to her.

> **P2 built 2026-11-05.** One selfie hook on each platform (`app/src/lib/use-selfie.tsx`,
> `mobile/src/features/you/use-selfie.ts`): the front camera (native: `expo-image-picker` with
> `cameraType: front`, the library when the camera is refused; web: `capture="user"`), the upload
> as her close-up, the colour read started, and Your digital twin at once with the read's job in
> the address (`?read=<jobId>` / the `read` param). On that page `useSelfieRead` follows the job
> and, when it lands, asks for the twin and cleans the address — the fix for §2.6 step 4. Behind it:
> the band's twin tile, the model page's "Add a selfie" row, the retake bottom-right on the hero,
> and Colouring's fallback button. The model page has its two states: on a Robes model (3c) the
> portrait under a `Robes model` eyebrow, Add a selfie, the lineup of five, the doors dimmed and
> closed; on her own (3d) the twin, the retake, the doors, and the lineup with her first. The
> server's `conflict` on shaping a Robes model (the rule P1 left) landed here. Colouring lost its
> close-up card and gained *Fewer seasons*. Not run here: the e2e (`model.spec.ts` rewritten for the
> closed doors and the facts-drawn twin; `home.spec.ts` for the camera tile). Lint, typecheck and
> the unit suites (web server, copy, contracts, native model/colouring/band) are green.

**P3 · The tag (S).** `onRobesModel` on looks; `RobesModelBadge` + sheet (Capture Selfie · Adjust
Robes Model) replaces `GenericModelBadge` on the look page, deck and draft, and reaches the
Lookbook and Diary tiles through `LookTile`'s on-photograph slot. Copy retired: `Generic model`,
`genericModelLabel`, `deck.twin.*` (its body still asks for two photos). Tests: a look rendered on
`preset:w2…` carries the tag, one on `twin:…` does not; the sheet's rows route.

> **P3 built 2026-11-05.** A frame's key names its rack, not its model, so the look row gained
> `stood_on` (`twin` · `cell` · `robes`; migration `20261105160000_look_stood_on.sql`), written when
> a frame lands (`modelReference` now says what its image is) and when a render lands (from the
> render key, `stoodOnOf`). `Look.onRobesModel` reads it while Robes' picture is the one shown; a
> render from before the column reads its key, a frame from before says nothing (no tag).
> `RobesModelBadge` (web `components/looks/robes-model-badge.tsx`, native
> `features/looks/RobesModelBadge.tsx`) replaces `GenericModelBadge` on the look page, the deck and
> the draft page — a quiet chip that pulls up a `Sheet` with Capture Selfie (the camera) and Adjust
> Robes Model (her model page); on an empty draft it follows the stand she is about to be dressed
> on. **Later the same day (Annie):** the tag is the saved look's, on its hero (`LookHero`, both
> platforms), where it opens the sheet — and on no tile (the Lookbook grid, home's card, the
> Diary), which stand in for the look rather than show it. A backfill migration
> (`20261105180000_look_stood_on_backfill.sql`) records a best reading for pictures from before
> the column, so looks already on staging wear it.
> Copy: `Generic model` and its drawer retired. Not run here: the schema test and the e2e. Lint,
> typecheck and the unit suites (core, jobs, contracts, copy, web server, native looks) are green.

**P4 · Tidy (S).** Retire `genericCellIds`/`genericCellId`, `ensureGenericCells` and the
`GenericModelBadge` files; history entry; `docs/plans/README.md` row ticked.

> **P4 built 2026-11-05.** `genericCellId`, `ensureGenericCells` and both `GenericModelBadge`
> files went with P0 and P3. The close-up card's hooks (`useAnalyse` on web and native) had no
> caller left and went, with the copy nobody read any more (`choosePhoto`, `retake`, `noPerson`,
> the colour read's own lines, `closeUpCard`, `closeUpHelp`). **Kept on purpose:** `generics` and
> `genericCellIds` — the three legacy cells still served to phone builds installed before the
> Robes models (§2.5, one release); retire both together once no installed build reads them.
> Status: this row in `docs/plans/README.md` is the record (the platform keeps no separate
> history; `docs/legacy-app-history.md` is the legacy app's).

---

## 4a. Redlines applied (2026-11-05, Annie's `digital-twin-redlines.md`)

Built the same day, web and native together: R1–R11 bar R12, R15–R18, R19–R21, plus the library
as a way in beside the camera. Left as they stand on Annie's word: **R12** (Colouring and Body
shape stay the twin's, closed on a Robes model, the server still refusing), **R13/R14** (the lineup
stays on her twin's screen with her first; no switch-back link), **R23** (the × stays on Choose your
model), **R24** (the tab bar; native's is the system's own). **R22** was already done.

- Draft tokens, marked draft in `@robes/tokens` for the design-system overhaul to ratify:
  `glass` (cream50 at 0.94; ink800 in the dark), `hairline-strong` (ink at 0.12), `border-warm`
  (the warm line, by the designs' name), `radius-sm` (8px), `shadow-float` (+ `shadowNative.float`
  for RN style props), and the smallest caps line `app-caps` (web `@utility`; native `appCaps`).
  The icon set gained `refresh`.
- **R1/R2**: `SettingsPage bare` (web) and `StackScreen bare` (native): no header, the picture
  under the safe area, a 44 glass back disc 14 from the top-left (web with the 22px blur; native's
  glass is near-opaque and takes no blur — `expo-blur` is not in the app).
- **R3–R5**: the hero at 520, full width, cover, 50% 30% on a Robes model and centred on her twin,
  no fade. Full-length portraits at 4:5 lose a little at the sides, never head or feet (R4).
- **R6/R7**: every Settings card and row on both platforms (one component family): 12 radius on the
  0.5 `hairline-strong`, rows ≥ 62 at 12/16, Cormorant 18 over Inter 12, the chevron in `ink-muted`,
  eyebrows at `app-caps`.
- **R8–R11**: the tag bottom-left on glass with its dot; Add a selfie as the dashed warm row 12
  under the picture; one card with the lineup (16 padding, hairline below) over the closed doors;
  56×70 tiles on `radius-sm`, 6 apart, five in a row, the chosen one on 1.5 ink with the 18 tick.
- **R15–R18**: the redraw control at 44 on glass with `shadow-float`, 14 from the bottom-right,
  labelled "Retake selfie to update your twin"; the caption Cormorant italic 300 at 20, 18 from
  the left and bottom; the footer status line gone (and its copy); the facts eyebrow at R7.
- **R19–R21**: the band's tick as R11 on both platforms (the first ticked until she chooses); one
  order and one selection (`model_preset`) on the band and the lineup; the twin tile straight to the
  selfie.
- **The library**: web drops `capture="user"`, so a phone's own chooser offers camera or library;
  native's `useSelfie` opens a two-row sheet (Take a selfie · Choose from your photos) and the
  caller renders `chooser`.
- Not run here: the e2e and screenshots against the canvas frames (no database in this
  environment); lint, typecheck and every unit suite are green.

## 5. Things that will bite

- **Portraits cost a draw each, once ever**: ten new (five women, five men) under `preset:`.
  Decide 4's and 5's swatches before P0 ships to staging; a change bumps `PRESET_STYLE` and
  redraws all ten.
- **The twin draws before the close-up lands** today (mount-only). §2.6 step 4 is the fix; without
  it the first twin after a selfie has no face until her next visit.
- **A Robes-model pick today wrote skin/hair picks.** Accounts on staging that picked one carry
  `skinSet`/`hairSet`; P1's clear runs only on the next pick. Acceptable on staging; a one-off
  backfill is not worth a migration.
- **`twinOnFile` / day-one `modelAsked`** keep today's rule: a close-up on file answers the ask, a
  Robes model keeps it ticked. Unchanged.
- **`home.diary` flag.** The band exists only on the diary home, which is what staging shows
  Annie today (her 5 Nov screenshot: the band above the strip, a look in today's slot). The modular
  home is unchanged and goes with the flag.
- **The design's swatch names** (Peach, Porcelain, Ash blonde…) are not the catalog's; the catalog's
  stay. Decide separately if the names should change (copy-only).
- **Men's lineup**: the twin prompt already speaks for a man (`His figure…`); check the first five
  male portraits by eye before the flag… there is no flag here: the portraits appear for every man
  on staging as they are drawn.

---

## 6. Decisions (Annie, 2026-11-05)

| # | Question | Answer |
|---|---|---|
| 1 | Robes models: data and portraits | Gemini-drawn catalog cells; the three today plus an older woman and a larger woman |
| 2 | Men | Five men too; non-binary rides the women's set for now |
| 3 | Tag: look or account | The look's picture (render/frame key); nothing re-renders on its own |
| 4 | Where the tag shows | Everywhere `Generic model` shows, renamed; one chip |
| 5 | Consent before the camera | The onboarding terms cover it; no sheet |
| 6 | Camera per platform | Native front camera via the picker; web `capture="user"`; asymmetry accepted |
| 7 | Selfie after a Robes-model pick | The selfie wins; the pick clears |
| 8 | Between selfie and twin | Land on Your digital twin at once; ghost figure + drawing chip; Body shape door empty |
| 9 | Adjusting a Robes model | Not allowed: Colouring and Body shape are the twin's |
| 10 | Retake | Bottom-right on the twin's hero |
| 11 | "Use a Robes model instead" | Her twin joins the lineup; choosing a Robes model keeps her selfie and twin |
| 12 | Scope | Platform only: staging web + Expo; the diary home |

Open for Annie before P0: the skin and hair swatches of models 4 and 5 (§2.1).
