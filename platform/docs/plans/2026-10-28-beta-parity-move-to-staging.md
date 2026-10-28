# Beta → staging parity: every gap, and the plan to move today

Status: audit complete 2026-10-28 (Annie + Claude). Owner: Annie. Supersedes §A of
[`2026-10-23-cutover-readiness.md`](2026-10-23-cutover-readiness.md) (its §A list is now partly
stale — see §9); §0 (media pipeline) and §B–F of that plan still stand.

**Goal.** `beta.byrobes.com` (legacy, source of truth for UX) is retired and testers move to
`staging.byrobes.com` (the platform: Next web + Expo native). Every flow a tester knows from beta
must work the same, read the same and look the same — on web and on the phone.

**How this was audited.** Five parallel read-only code audits of the current `beta` head
(staging serves commit `3771d8b` or later — the 27 Oct parity pass is live): the look lifecycle,
look/piece metadata, the visual system, native coverage, and every other flow. Plus a local
Playwright walk of the platform web app at 390pt (sign-in → wardrobe → composer → draft → swap →
save → diary → wear → Lookbook → You) against the offline fake AI. **No live browser pass on
beta/staging was possible this session** — items marked *live* in §8 are the ones to confirm by
hand before testers move.

One deliberate divergence is accepted and not listed: staging shows the look's picture card at
the top of the look screen, consistent with the piece page.

---

## 1. What is true now (the short version)

- The **shape of every flow is on both clients**. Yesterday's parity pass closed more than the
  docs say: the diary sheet is beta's month calendar on web *and* native; the digital-twin screens
  are at the 27 Oct redline; the Lookbook card calendar is built; native analytics has a consumer.
  `origin/claude/native-beta-parity` holds nothing that isn't already on `beta`.
- **Vocabularies match byte-for-byte**: taxonomy (64 groups / 14 sheet L1 / 55 L2), 13 colour
  families + 74 shades + 13 prints, 7 material families / 40 materials, 3 season bands, 7
  wear-for seeds, months by table in `@robes/core/calendar`.
- **Five blockers** stand between a tester and a day that feels like beta (§2).
- The visual drift is mostly **token-level** and fixable in one pass (§4): dark mode leaks on
  dark-mode phones, control borders are 4× heavier than beta, sheets/pills/eyebrows are one step
  off. Fonts are the same families and weights.
- The native app needs **keyboard handling on the look prompt** and a real build for push; the
  rest is small.
- The **media pipeline on staging** (cutover plan §0) was dead on 23 Oct; nothing in this audit
  can say whether it is fixed. It is the first *live* check in §8.

---

## 2. Blockers — fix before any tester moves

| ID | Where | Beta | Staging | Clients | Effort | Fix lands |
|---|---|---|---|---|---|---|
| **L1** | Save an unnamed look | Saves as today's date (`Wednesday 28 Oct`), `name_provisional` kept — product invariant | Keeps Robes' offer `“{piece}, styled”` / `A new look`; e2e pins the wrong behaviour (`e2e/looks-saved-ui.spec.ts:40`) | server → both | S | `repos.looks.save` (`packages/db/src/repos/looks.ts:542-556`): when `nameProvisional && !name && !setId` → `name = longDate(today)` from `@robes/core/calendar` (month table). Fix the e2e. |
| **L2** | Edit a saved look → Update | Her model/frame re-draws when the rack changes | Rack change never asks `looks.renderOnModel`; `renderAssetId` stays → **the picture shows the old pieces**, and a wear then snapshots a rack the picture contradicts | both | M | `useLookEditor.update` → call `looks.renderOnModel` for non-frame looks (`app/src/lib/look-editor.ts:45-47`, `mobile/src/features/looks/look-editor.ts:38-40`); or clear `renderAssetId/renderKey` server-side on piece change and poll. `LookHero.dressIfNeeded` must run when `model === null` *or* stale. |
| **L3** | You · Model on a saved look | Every saved look renders on her twin **or the generic model**; the You · Model switch stands whenever her photo exists | `canDress` requires `me.filed === true` (`look-hero.tsx:49-53`, `LookHero.tsx:56-60`) → a look without a twin never gets a Model side, so her photograph has nothing to sit beside | both | S | Drop the `filed` condition (keep `cell.status==='ready'`); call `dressIfNeeded` on mount when `model === null && !frame && pieces.length`. |
| **D1** | Every short date | Month printed by table | `Intl month:'short'` → **"Sept"** in `app/src/lib/dates.ts:14`, `mobile/src/features/plan/plan.ts:31`, `packages/core/src/looks/index.ts:438` (confirmed: en-GB prints `Sept`) | both | S | Build from `MONTHS_SHORT` / `dayMonth` in `@robes/core/calendar`; delete the three `Intl` sites. |
| **Y1** | Morning email for migrated users | Off unless she switched it on | `morningCue` defaults **true** (`packages/contracts/src/me.ts:9`) and the migration copies the key only when it is an explicit boolean → every tester who never touched the toggle gets the 7am mail | server | S | Default `morningCue:false`, and write `false` in `scripts/migrate/src/sql.ts:129-132` when the legacy key is absent. |
| **N2** | Native: typing in the look prompt / sheets | — | `LookScreen`, `Composer`, `LookDetail` are plain `ScrollView`s with no keyboard avoidance; `ui-native/Sheet` (RN `Modal`) has none → the keyboard likely covers the Ask box, `PieceFieldSheet`, `SwapSheet` search. *Needs a device check — treat as a blocker until proved otherwise.* | native | S–M | `automaticallyAdjustKeyboardInsets` + `KeyboardAvoidingView` on the three look screens; `KeyboardAvoidingView` inside `packages/ui-native/src/Sheet.tsx`. |
| **§0** | Media pipeline on staging | — | Uploads stayed `pending` forever on 23 Oct (RenditionFn not firing). Unknown today. | ops | — | Cutover plan §0 steps; then *live* check §8.1. Nothing photo-driven can be judged until it passes. |

---

## 3. Must — a tester would notice (parity and invariants)

### 3a. The look lifecycle (L) and the look/piece metadata (M)

| ID | Surface | Beta | Staging | Clients | Effort | Fix lands |
|---|---|---|---|---|---|---|
| L4 | Where her photograph can be added | Composer canvas (`Add your photograph`), the saved look, the diary day card | Saved look only | both | M | Camera door on `ModelCanvas` using `uploadPhoto(…,'look_photo')` + `looks.photo` (route already accepts a draft); `LookTile onImage` camera on the day card (`day-view.tsx`, `DayView.tsx`). |
| L5 | Swap while editing a saved look | One tap swaps at once, 6 s Undo | Two-step: pick, then `Swap in {name}` | both | S | Pass `instant` to the saved look's `SwapSheet` (`look-page.tsx:137`, `LookDetail.tsx:226-235`); add the Undo toast. |
| L6 | Saved look: which days it is on | Meta line `pinned for {day}` + a `Pinned for … · Open the day →` strip | Toast only; the page never says | both | M | Add `pinnedOn: string[]` to the `Look` contract (`toLooks` ← `plannedDays`) and print it in `savedMeta` on both clients. |
| L7 | Diary sheet: `Already in the diary · Open the day` | Opens the day | **Native just closes** (`DiarySheet.tsx:79-85`); web does a full reload | native (web polish) | S | `router.push('/day/${day}')`; web `router.push`. |
| M1 | Rack row eyebrow | Sheet L1 everywhere ("KNITWEAR · COS" on the look and in the wardrobe) | Rack uses legacy L1 (`piece.category`) → the same jumper reads "TOPS · COS" on the look and "KNITWEAR · COS" in the wardrobe | both | S | Build rows with `pieceEyebrow` (`core/wardrobe/index.ts:18`) in `lib/look-editor.ts:92,106` and `features/looks/look-editor.ts:97,111`. |
| M3 / W1 | Change photo on a piece | Pill bottom-right of the photograph | Missing; no route | both | S–M | `wardrobe.photo` in `packages/contracts/src/routes.ts` + handler (api-security checklist) + the pill on `piece-detail.tsx:82` / `PieceDetail.tsx:79`, reusing the look-hero upload door. |
| M6 | Season labels | "Spring/Summer" | Piece rows + Wardrobe filter "Spring/Summer" but Lookbook filter + look tags "Spring / Summer" | both | S | `lookbook.refine.seasons` → reference `wardrobe.filter.seasons`. |
| F1 | Share a look | "Share this look" on the panel → `/board/:id` | Removed on purpose on 24 Oct (`5c6cb0f`); API + `/share/[token]` still live | both | S | **Annie's call** (§6). If yes: restore `share-look.tsx` from `git show 5c6cb0f^`; native `_shareKey` plumbing is still there. |

### 3b. Visual system (V) — the ones that read as "a different app"

| ID | What | Beta | Staging | Clients | Effort | Fix lands |
|---|---|---|---|---|---|---|
| V1 | **Dark mode leaks** | None | `packages/tokens/dist/web.css` applies dark tokens under `prefers-color-scheme: dark`; `mobile/app.json` `userInterfaceStyle: "automatic"` → a dark-mode phone gets an ink-black Robes | both | S | `data-theme="light"` on `<html>` in `app/src/app/layout.tsx` (web.css honours it); `userInterfaceStyle: "light"` in `app.json`. |
| V2 | Control edge | Hairline `.12` (at most `.28` emphasised) | `border-control` = ink @ **.50** on every field, secondary button, empty-state dash, native sheet handle | both | S | One token in `packages/tokens/src/tokens.ts` — **decision** (§6): it was set for the 3:1 boundary rule. |
| V3 | Bottom sheet | 18px top radius, cream, no shadow, handle 36×4 in `#D8CFC0` | 12px radius; web adds border + `shadow-xl`; handle 7.5% (web) vs 50% (native) | both | S | `radius.sheet: 18px` token → `ui/src/dialog.tsx` Sheet + `ui-native/src/Sheet.tsx`; handle `bg-rule-mid` on both; drop the web shadow/border. |
| V4 | Toast | Ink pill, 2.8 s | Native is a 12px box; durations 4 s web / 6 s native | both | S | `rounded-pill` in `ui-native/src/Toast.tsx`; one duration (3–4 s), 6 s only with Undo. |
| V5 | Pills / segmented control | Pill 32px, 12px label; segmented 36px on cream-100 with a 1px rule | Pill 44 (web) / 36 (native), 14px label, selected border 1 vs 1.5; segmented 44 on cream-200, no border | both | M | `ui/src/pill.tsx` + `ui-native/src/Pill.tsx` (36 visual, `text-xs`, 44 hit, `borderWidth` 1); `segmented-control` both → `h-9`, `bg-surface` + `border-hairline`. |

### 3c. Native (N)

| ID | What | Detail | Effort | Fix lands |
|---|---|---|---|---|
| N1 | Download my data | Web `you/privacy` has `DownloadData`; native `Privacy.tsx` has consents only | S | Twin in `mobile/src/features/you/Privacy.tsx` via `me.exports.request`. |
| N3 | Push never registers in Expo Go | `lib/push.ts` needs `extra.eas.projectId` (none) and Expo Go has no remote push | S code / M ops | `eas init` + a dev/TestFlight build (`docs/runbooks/mobile-test-builds.md`). Until then testers get email only — say so. |
| N8 | Product events | `AnalyticsSetup` is mounted but **no component fires an event** on either client; beta fires dozens (`camera_opened`, `swap_drawer_opened`, …). Admin funnel empty on day one | M | Decide the catalogue in `packages/analytics`; call sites in `Camera.tsx`, `SwapSheet.tsx`, `look-editor.ts` + web twins. Architecture decision, both clients. |

---

## 4. Should — polish a side-by-side tester notices

Grouped by the file it lands in so a pass clears a group. S unless marked.

**Visual tokens (`packages/tokens/src/tokens.ts`, one PR)** — V6 type scale one step large
(eyebrow 12/400 vs 10/500; body 16 vs 14; page title 36 vs 31; look title 20/300 vs 22/400 — M,
and `design-system.md` ratified Eyebrow 12/400 on 25 Oct, so confirm first) · V7 wordmark three
different sizes (17/400 beta, 20/300 web, 18/400 native) · V8 dock white-glass → cream + shadow,
active indicator style · V9 `ink-faint` #7E6F50 → #74664A (contrast-driven) · V10 accent washes
(`rose-bg`, `sage-bg`, `rose-mid`, `sage-mid`) missing · V11 disabled primary (cream-200 fill vs
ink 30%) · V12 radius steps (cards 14, sheets 18, inputs 8 missing; M) · V13 skeleton radius
web≠native · V14 empty state edge/radius · V15 success hex · V16 secondary button label case
(sentence on beta, caps on platform) · V17 web content width 1024 vs 1440 (desktop only) · V18
Inter 600 loaded web-only · V19 Settings header hairline tone three ways.

**Look page / composer (`look-page.tsx`, `look-view.tsx`, `composer.tsx` + native twins)** — M2
`RackRowCard` hand-rolls a second piece anatomy (export `cardLines` and compose; M) · M4 one held
white card around panel + rack, "The look" head, rose "Composed by Robes" (M) · M5 `Not yours
yet.` wishlist panel, pin strips, `Where it lives` while editing, lineage foot (M) · M8 deck card
hand-rolled, native name not in display serif (M) · M9 piece-page style door diverges (web inline
HomeBox + "Start a look", native routes to `/looks/style`) · M10 wear-record date lacks the
weekday (`Tue 8 Sep`) · M11 web `Delete this look` red, native rose · M13 look image 4:5
everywhere vs beta 3:4 in the Lookbook grid and day card (confirm against the redline) · M15
key-piece tile missing from the Lookbook grid (M) · M16 piece wears uncapped (beta 3 + "View all")
· M18 empty rack door copy (`rack.addWorn` exists in copy) · L8 no ✦ prompt on the empty draft
(L) · L9 diary-sheet dots use `lastWornOn` only (= L3 in the diary list) · L10 composer swap has no
Undo · L11 swap chips lack counts · L12 discard has no confirm (copy exists unused) · L13 chip
says `Dressing her…` on the generic model · L14 wear record lacks `€N a wear` · L15 native
piece→composer only works for pieces in the first page of 40 · L16 rack not sorted
Canvas→Anchor→Texture→Exclamation; sheet `All` unordered · L17 rack head doesn't say `N yours, M
to find` · L18 no "N pieces aren't yours yet" dialog on save · L19 saved rack rows lack wear
counts · L20–22 busy-frame, save and update toasts/copy.

**Home (`home-view.tsx` / `HomeView.tsx`)** — F6 native has no running-jobs tray · F7 native
week card shows "Dress Monday" on a past empty day · F8 O4 "Build the look" opens an empty draft
instead of Robes building from hers (M) · F9 native `weekdayLong` via `toLocaleDateString` ·
F10 O1 done rule ignores `confirmed_at` · F11 web O3 "Snap several" lands on the add sheet, not
the photo step.

**Diary / Lookbook (`plan-*`, `lookbook.tsx` + twins)** — D2 list row "· Worn" suffix · D3
desktop month past card ✓ Worn / "Wore it?" (S–M) · D4 List|Month toggle not persisted · D5 back
from a far day lands on List not Month · D6 31 vs 30 rows · D7 stale empty copy "choose Wear on a
day" · D8 picker Vibe chips + closed chips row (M) · D9 weekday heads hard-coded (web array,
native single letters) · D10 desktop empty-ahead cell "Name the day" inline · L1 Sort/Filter
rendered disabled under four looks (beta hides) · L2 "+ New look · Built on the rack" tail card ·
L5 empty Saved is an EmptyState, beta's is the composer as root (decision) · L6 Filter Vibe empty
legend (hide until vibe tags exist) · L7 Suggested empty copy · L8 native count row collapses on
empty Suggested · L9 sort menu order · L10 nothing said after "I wore this today" · M7 Suggested
eyebrow rose vs beta sage (decision) · M12 saved tile shows the first wear-for tag, beta a vibe
pill (M, needs vibe vocabulary).

**Wardrobe (`wardrobe-header`, `piece-grid`, repos)** — W2 no-photo thumb is a camera door (after
W1) · W3 remove asks first on beta, platform Undo only (decision, UX-13) · W4 in-season heroes
lead the grid (server sort) · W5 filter multi-select + "Filter · N" badge (M, contract) · W6
category cascade L2 › L3 + crumbs (M) · W7 "Added from · Receipts" (S–M) · W8 native layout not
persisted · W9 multi-piece Review "Already mine" (M) · W11 Robes-builds door at `pics > 0` vs
beta's five photographed (verify) · M14 inbox rows hand-rolled (compose `CardRow`) · M17 swap tile
selected: beta 2px ink, platform warm (platform is the newer rule — leave, note in history).

**You (`features/you`, `settings/*`)** — Y2 morning hour 6–10 (M) · Y3 change email (M) · Y4
delete: web stays signed in, native signs out, copy true of neither · Y5 "sometimes" style types
not carried (decision) · Y6 native prints swatch missing · Y7 native Pieces-you-love text-only ·
Y8 brief capped at 50 lines (invariant says no cap — decision) · Y9 noticed card drag + stamps (M)
· Y10 twin opened from a look returns to `/you` not the draft · Y11 colour notes depth (M) · Y12
observations copy · Y13 native twin caption not in display serif (live) · Y14 replay consent
withdrawal (verify) · Y17 = N1.

**Share / auth** — F2 migrated legacy shares are text-only (needs the Cloudinary→S3 rehost, M) ·
F3 recipient CTA → `/` → sign-in (needs Decision 4 of the cutover plan) · F4 one line on sign-in
for migrated password users ("Robes emails you a code now") · F5 native sign-in has no Google
button when web does.

**Native shell (N / D)** — N4 no universal links (`ios.associatedDomains`, AASA) → email CTAs open
the browser; Must at cutover · N5 no `+not-found` route (bad deep link shows Expo's dev screen) ·
N6 `links.ts` lacks `/plan/:date → /day/:date` and `/looks/ideas` · N9 Sign in with Apple
(blocker for App Store, not TestFlight) · D1 Create is a modal stack screen, Add pieces a
formSheet — make them the same · D2 sheet has no bottom safe-area inset · D3 `/wardrobe/wishlist`
deep link has no native rule · D7 `expo-glass-effect` in Expo Go on iOS 26 (live).

**Copy sweep** — delete unused `${done} of ${total} images ready` (`copy/index.ts:680`); admin
`newest ${shown} of ${total}` and `tokensIn / tokensOut` (admin-only, low) ; `Step ${step} of
${of}` / `Piece ${n} of ${of}` / `Look ${n} of ${total}` are positions, not counts — acceptable,
but check against principle 4 ; locale-formatted weekday/month at `HomeView.tsx:45`,
`observations-view.tsx:16`, `Observations.tsx:24` → `@robes/core/calendar`. No "AI", "engine",
"lock", "unlock" anywhere on the platform.

---

## 5. Deliberate, and better than beta — not gaps

A wear files the look on its day with Worn ✓ (beta's retro wear never reached the Diary);
"I wore this today" hides once logged; the You/Model record persists; a wear can be taken off the
record; the pin/wear gate is server-side; remove-with-undo instead of a confirm (UX-13); the
"recent" sets for the balance answer are loaded server-side; the size stepper; the Create sheet
offers Wardrobe | Wishlist once; drafts are server rows (browser-kept beta drafts are **not**
migrated — testers must save them first, already in the cutover copy). Hidden on beta and
correctly absent on staging: moodboards, the weekly track; the trip is behind `features.trips`
(confirm the flag is off for staging testers — *live*). "Save as new" and the old swap drawer
have no callers on beta either.

---

## 6. Decisions — made by Annie, 2026-10-28

| # | Question | Decision | Consequence |
|---|---|---|---|
| 1 | Share a look (F1) | **Stay without it.** | F1, F2, F3 drop off the list; `shares.*` API and `/share/[token]` stay for migrated links only. |
| 2 | Control edge (V2) | **Keep the 3:1 boundary rule** (`border-control` ink @ .50). | V2 closed as-is; V14 (empty state) keeps the edge weight, fixes radius only. Record in `design-system.md`. |
| 3 | Type scale (V6) | **Keep the platform scale** (eyebrow 12/400, body 16, title 36). | V6 and V9 closed as-is. |
| 4 | Suggested eyebrow (M7) | **Rose.** | M7 closed; the 27 Oct redline stands. |
| 5 | Lookbook grid aspect (M13) | **3:4** in the Lookbook grid and the day card (beta); 4:5 on the look page. | M13 → pass 3 (`LookImage`/`LookPhoto` aspect per surface). |
| 6 | Rejected colours outside HER HARD NOS | **TBD.** | Platform behaviour (soft avoid) stands until decided. |
| 7 | Remove a piece | **Undo only** (platform, UX-13). | W3 closed; note in the legacy history that beta's ask-first is superseded. |
| 8 | Brief cap (Y8) | **50 lines.** | Y8 closed; the invariant line in root `CLAUDE.md` ("no cap") is updated to 50 when the history entry is written. |
| 9 | Camera Single \| Several (W10) | **Platform**: every shot is read and counted; no mode. | W10 closed; cutover plan §A text corrected (§9). |
| 10 | "Sometimes" style types (Y5) | **Drop** `style_archetypes_soft` — a new product update replaces it here. | Y5 closed; delete unused `copy.sometimes`; migration keeps "not carried". |
| 11 | Product events on day one (N8) | **Yes.** | N8 → pass 6 as its own PR (catalogue in `packages/analytics`, call sites on both clients). |

---

## 7. The plan — today, in passes

Each pass is one branch → PR into `beta`, web and native in the same commit, `pnpm verify` green,
the e2e specs it touches updated, a `shortcut:` comment on anything deferred. Order chosen so the
blockers ship first and the token pass doesn't conflict with component work.

| Pass | Scope | IDs | Est. | Files (web → native twin) |
|---|---|---|---|---|
| **0 · Live checks** (Annie, 30 min, no code) | Media pipeline; dark-mode phone; Google env; trips flag; native keyboard | §8.1–8.5 | 0.5 h | — |
| **1 · Blockers** ✅ 2026-10-28 (`fix/parity-pass-1-blockers`) | Unnamed save = today's date; model re-render after edit; You · Model without a twin; "Sept"; morning-cue default; native keyboard | L1 L2 L3 D1 Y1 N2 | 3–4 h | `packages/db/src/repos/looks.ts`, `app/src/lib/look-editor.ts` ↔ `mobile/src/features/looks/look-editor.ts`, `look-hero.tsx` ↔ `LookHero.tsx`, `app/src/lib/dates.ts`, `mobile/src/features/plan/plan.ts`, `packages/core/src/looks/index.ts`, `packages/contracts/src/me.ts`, `scripts/migrate/src/sql.ts`, `LookScreen/Composer/LookDetail.tsx`, `packages/ui-native/src/Sheet.tsx`; e2e `looks-saved-ui.spec.ts` |
| **2 · Visual tokens** ✅ 2026-10-28 (`fix/parity-pass-2-visual`) | Light only; control edge (per decision 2); sheet radius + handle; toast; pill/segmented; radius steps; washes; disabled; wordmark; dock | V1–V5, V7 V8 V10–V12 V14 V15 (V6/V9 per decision) | 3 h | `packages/tokens/src/tokens.ts`, `app/src/app/layout.tsx`, `mobile/app.json`, `packages/ui/src/{dialog,pill,segmented-control,toast,button-styles,wordmark,empty-state}.tsx` ↔ `packages/ui-native/src/{Sheet,Pill,SegmentedControl,Toast,Button,Text}.tsx`, `app-shell.tsx` ↔ `TabBar.tsx` |
| **3 · Look page + metadata** ✅ 2026-10-28 (`fix/parity-pass-3-look-page`) | Rack eyebrow = sheet L1; instant swap + Undo; pinned-for; her photo in composer + day card; Change photo; season label; held card; rack anatomy composed; wear-record weekday; toasts | M1 L5 L6 L4 M3/W1 M6 M4 M2 M10 M11 L10 L19 L21 L22 | 4–5 h | `look-page.tsx` `look-view.tsx` `composer.tsx` `rack-row.tsx` `wear-record.tsx` `piece-detail.tsx` ↔ `LookDetail.tsx` `Composer.tsx` `RackRow.tsx` `WearRecord.tsx` `PieceDetail.tsx`; `packages/contracts/src/{looks,routes}.ts` (+ api-security checklist for `wardrobe.photo`); `packages/copy/src/lookbook.ts` |
| **4 · Diary · Lookbook · Home · Wardrobe · You (S items)** ✅ 2026-10-28 (`fix/parity-pass-4`) | Open the day from the sheet; worn dots from `looks.wears`; "· Worn" rows; persisted toggles; copy; native tray/past-day/weekday; sort/filter hidden under four; native prints/pieces swatches; sign-in line; Download data on native | L7 L9/L3 D2 D4 D7 D9 L1 L7 L9 L10 F6 F7 F9 F10 W4 W8 Y6 Y7 Y4 F4 N1 | 3–4 h | `diary-sheet.tsx` ↔ `DiarySheet.tsx`, `plan-list/plan-view/plan-month.tsx` ↔ `PlanView/PlanMonth.tsx`, `lookbook.tsx` ↔ `LooksView.tsx`, `home-view.tsx` ↔ `HomeView.tsx`, `db/repos/wardrobe.ts`, `features/you/{Palette,StyleDna,Privacy}.tsx`, `(auth)/sign-in.tsx`, `packages/copy/src/index.ts` |
| **5 · Native shell** ✅ 2026-10-28 (`fix/parity-pass-5`) | `+not-found`; `links.ts` rules; Create as formSheet; sheet bottom inset; Google button; associated domains + AASA (config) | N5 N6 D1 D2 D3 F5 N4 | 1.5 h | `mobile/src/app/{+not-found,_layout}.tsx`, `mobile/src/lib/links.ts` (+ test), `packages/ui-native/src/Sheet.tsx`, `mobile/app.json`, web AASA route |
| **6 · Product events** (decision 11) | Events catalogue + call sites on both clients | N8 | M | `packages/analytics`, `Camera.tsx`, `SwapSheet.tsx`, `look-editor.ts` + web twins |
| **7 · Docs** | Correct the stale lines (§9); history entry; `STATUS.md` | — | 0.5 h | `docs/plans/2026-10-23-cutover-readiness.md`, `docs/STATUS.md`, `docs/legacy-app-history.md` |

**Pass 1 notes (done).** L1: the rule lives server-side (`saveLook`, `lookDateName` in
`@robes/core/calendar`), applies to `source='manual'` drafts with no `setId`, in her profile's
timezone. L2: `useRedress` on both clients after Update (the render is keyed by model + rack, so an
unchanged rack costs nothing). L3: the Model side gates on `me.model.stand` (twin → filed cell →
generic), and an undrawn saved look starts its render once on open, as beta did. D1:
`weekdayDayMonth` replaces the three `Intl` sites. Y1: `morningCue` defaults off in the contract,
which every read goes through, so migrated users need no SQL change. N2: iOS keyboard insets on
the three look scroll views and a `KeyboardAvoidingView` in `ui-native` `Sheet` — **still needs
the device check in §8.5**. Known, unrelated: `packages/db/test/repos/exports.test.ts` fails
locally on clean `beta` too (the Postgres container's clock runs ~1 s ahead of the host).

**Pass 2 notes (done).** V1 light only (web `data-theme="light"`, native `userInterfaceStyle`
+ `Uniwind.setTheme('light')`). V3 sheet: `rounded-t-sheet` (18), handle `rule-mid` on both, web
shadow and border dropped. V4 native toast is an ink pill; 4 s, 6 s with an action, as web. V5 pills
36/32 at 12px with 44 hit areas, native selected edge 1; segmented 36 on `surface` + hairline. V7
wordmark `size="header"` (Cormorant 400 / 17 / .34em) and `size="hero"`, both clients. V12 radius
steps `input` 8 · `card` 14 · `sheet` 18 — fields, home and Settings cards, You title cards. V13/V14
skeleton and empty state at 12 (empty-state edge keeps 3:1, decision 2). V18 Inter 600 dropped on
web. V19 Settings header hairline on both. **Kept on purpose:** V11 (30% ink disabled primary is
the 26 Oct "one primary button spec" redline, newer than beta); V15 success hex (contrast-driven,
like decision 2). **Left for Annie's eye:** V8 dock (the 25 Oct native parity handoff agreed its
shape; beta's is white glass, no shadow, an ink bar for the active tab), V10 accent washes (no
consumer yet — add with the first surface that uses one), V16 secondary buttons in caps vs beta's
sentence case, V17 web content width 1024 vs beta 1440 (desktop only).

**Pass 3 notes (done).** M1: the rack eyebrow comes from `pieceEyebrow` via an optional
`categoryL2` on the rack row (the stored `category` still drives slots and the swap preset). M2:
`RackRowCard` composes the piece card's lines (`cardLines` web, `Eyebrow`/`Name`/`Status` native).
M6: one `SEASON_LABELS` ("Spring/Summer") in `packages/copy/src/seasons.ts`. M13: `aspect` on
`LookImage`/`LookTile`/`LookPhoto`; 3:4 in the Lookbook grid and the day card (+ its skeletons),
4:5 on the look page; in-progress draft tiles stay 4:5. L4: one upload door, `useHerPhoto`, on the
composer canvas, the day card and the look hero; `isHandBuiltDraft` now keys on `model`, not
`image`. L5/L10: `editor.swap` lands at once behind one 6 s Undo on every surface — a draft writes
the rack back; a saved look being edited goes back to how it stood unless she changed it since.
L6: `Look.pinnedOn` (`looks.pinnedDays`, from yesterday on) → "pinned for Wednesday 28 Oct" in the
saved meta. M10: wear rows use `weekdayDayMonth`. M11: "Delete this look" is danger on both (Annie,
28 Oct — not beta's rose). L19: saved rack rows carry wear counts. L21/L22: "{name} saved to your
Lookbook ✓", "Saved to your lookbook" from a suggestion, "Updated". M3/W1: `wardrobe.photo`
(`POST /wardrobe/items/:id/photo`, asset and piece both hers, cross-user tested) behind a "Change
photo" pill; no re-read, so her fields stand. **Deferred:** W2 (camera door on a photo-less thumb —
the `usePiecePhoto` hooks are ready); the empty composer before its first piece has no photo door
(`shortcut:`); M4 held card stays on the week's list.

**Pass 4 notes (done).** Diary: L7 "Open the day" routes on both; L9 the sheet's worn days come
from `looks.wears` (`diaryMarks` in `@robes/core/calendar`); D2 "· Worn" rows; D4 List|Month kept
per viewer (web localStorage, native `lib/prefs` on SecureStore — the app's one per-viewer store,
also the wardrobe layout W8); D7 beta's empty copy; D9 `WEEKDAYS_SHORT` heads (native now Mon…Sun).
Lookbook: L1 Sort/Filter hidden under four (a hidden filter no longer applies); L9 Last worn ·
Newest · Name; L7 beta's empty Suggested line; L10 a wear dated today toasts "Worn today ✓".
Home: F6 native "In the studio" tray (`trayKind`/`trayState` shared); F7 past empty day "Nothing
filed"; F9 calendar weekday; F10 `profiles.style_confirmed_at` (migration, carried from legacy
`style_dna.confirmed_at`) — set for migrated users only, the platform has no style walk yet.
Wardrobe: W4 in-season heroes lead the first page (`seasonBandOn`, her timezone). You: Y4 delete
signs out on both, copy true; Y6 native print swatches; Y7 native loved-piece photos; N1 native
Download data; F4 "Used a password? Robes emails you a code now." Also: Review has one header
(title + ×; no eyebrow, back pill or second Cancel), and staging workers deploy on a `beta` merge
once `STAGING_AUTO_DEPLOY` is set (environments.md §5) — until then, deploy workers from a laptop
after any `packages/jobs`/`packages/ai`/`workers` merge. Photo reads (28 Oct) were still the old
worker for this reason.

**Pass 4b notes (done, 28 Oct — Annie's staging walk).** Web pushed pages carry the back pill in
the top bar in place of the wordmark (`backFor` in `app/src/lib/nav.ts`: the shell reads it from
the URL — a new pushed page adds its row there, never its own `BackLink`; native `StackScreen`
already did this). One `InlineTitleField` (web `@robes/ui`, native `@robes/ui-native`) names a day,
renames a look and names a draft — the title becomes the field, underline only (a global
`:focus-visible` outline outside any CSS layer had boxed every quiet field; moving it into
`@layer base` is open). Weather follows her: asked once on first visit, then her device location
silently each session (≤ every 3 h) → `POST /me/location` (rounded ~1 km, Nominatim name) → her
profile (data inventory updated; `Permissions-Policy` now `geolocation=(self)`, and
`camera=(self)` — `camera=()` had blocked the in-page camera). The twin draws at 2K (legacy
parity; the face survives a full-length frame) and the colour read is `deliberate` (medium thinking,
full-detail photo). A draft's canvas dresses only on a ready render, and a failed draw says
"Couldn't dress her · Try again" on the canvas and the saved look. **Worker-side** (twin, colour
read, model dressing, photo reads): live only after a staging worker deploy
(`docs/runbooks/staging-deploy-handoff.md`). Native location needs a new dev/TestFlight build for
the iOS string; Expo Go works.

**Pass 5 notes (done).** N5: `+not-found` on native and a web `not-found.tsx` twin ("Robes
couldn’t find that." · Back to Today). N6/D3: `mobile/src/lib/links.ts` maps every web URL the
mail, push and share senders carry (test walks `app/src/app/**/page.tsx` so a new web page without a
native screen fails); only `tab`/`to`/`pieceId` survive the query. D1: Create and Add pieces share
`FORM_SHEET` (formSheet, detents 0.72/1) and one header (`FormSheetScreen`). D2: `ui-native` Sheet
pads 24 + the home-indicator inset (dropped while the keyboard lifts it). F5: native shows Apple then
Google when `GET /api/v1/public/auth-providers` says they're on (browser auth session via the Expo
plugin). N4: `/.well-known/apple-app-site-association` and `/assetlinks.json` from the web app, an
explicit include list in `@robes/core/app-links` (every native screen; never `/api`, `/auth`,
`/share`, `/legal`, `/unsubscribe`, `/waitlist`, `/admin`, `/dev`), per-build domains in
`mobile/app.config.ts`. **Outside code** (environments.md §6/§12): Vercel `APPLE_TEAM_ID`,
`APPLE_APP_BUNDLE_ID`, `ANDROID_APP_PACKAGE`, `ANDROID_CERT_SHA256` per stage; Associated Domains on
the App IDs; `AUTH_TRUSTED_ORIGINS` carries the build's scheme; a new EAS build per stage. N9 (native
Sign in with Apple, App Store blocker) stays open.

Passes 1 → 2 → 3 are the move-today bar. 4 and 5 are the same day if hands allow; nothing in
them stops a tester. The M/L items left in §4 (held card M4/M5, deck card M8, key-piece tile M15,
O4 Robes-build F8, filter multi-select W5, cascade W6, Review "Already mine" W9, morning hour Y2,
change email Y3, legacy share images F2, push build N3) go on the week's list, not today's.

**Parallelism.** Passes 1, 2 and 5 touch disjoint files and can run as three worktrees at once;
pass 3 waits for pass 1 (same look files); pass 4 waits for pass 2 (tokens).

**Verification per pass.** `pnpm verify`; `pnpm --filter @robes/app test:e2e -- looks-ui
looks-saved-ui plan-ui wardrobe-ui you-ui` (whichever the pass touched); the native jest suite;
then the §8 walk on staging once deployed. Re-shoot the 390pt walk
(`scratchpad/shoot-platform.mjs` from this session can be moved into `app/e2e/` as a visual
spec) and compare against beta by eye.

---

## 8. Live checklist on staging (phone + desktop) before testers move

1. **Photo in → piece out** (§0): add a piece from a photo; `GET /api/v1/assets/:id` leaves
   `pending` within ~10 s; the piece reads and files. Then a look from a photo end to end.
2. **Dark-mode phone**: open staging with the phone in dark mode — must stay cream (V1).
3. **Sign-in**: Google button present when the env is set (web); code arrives for a non-verified
   email (SES production access, cutover §B/§D).
4. **Trips**: Create sheet shows no "Plan a trip" (flag off).
5. **Native keyboard**: tap the Ask box on a look, and the name field in the piece sheet — the
   field stays above the keyboard (N2).
6. **The critical flow, on web and phone**: new look → model → + three pieces → swap one → Save
   (leave the name blank → today's date) → sheet → × → saved page shows the three pieces on the
   model → Edit look → swap → Update → picture updates → add your photograph → You · Model → Put
   in the diary → day shows Worn ✓ / the look card.
7. **Metadata**: the same piece reads the same eyebrow on the look, in the wardrobe, in the swap
   sheet; the Lookbook tile, day card and look page carry the same name/meta.
8. **Dates**: any September wear/pin reads "Sep", never "Sept".
9. **A migrated test user** (cutover §E): wardrobe, looks, diary, shares, photos.
10. **Native twin caption** serif/fade on a device (Y13); liquid-glass dock degrades in Expo Go (D7).

---

## 9. Stale lines to correct in older docs

- `2026-10-23-cutover-readiness.md` §A: "diary sheet is 14 day pills" → closed (both clients);
  "digital twin screens not at redline" → closed after `20f7dda`; "createNativeAnalytics has no
  consumer" → mounted (`AnalyticsSetup`), but no events fire (N8); the camera "Single | Several"
  description → both clients read every shot (W10, decision 9).
- `docs/STATUS.md:113` "Lookbook card calendar — not built" → built both clients.
- `packages/core/src/calendar` `diaryDays`/`DIARY_DAYS` → dead code once confirmed unused.
- `material_model.cjs:2` header says "43 materials" → 40.
