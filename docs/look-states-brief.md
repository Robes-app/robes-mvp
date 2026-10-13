# Look states — key piece · suggested · draft · saved

**Recommendation brief · 2026-10-06 · from the Annie × Felix review (notes 25:35 → 1:18)**

One sentence: **a look is one entity with three states, drawn by one tile; a key piece is not a fourth kind of look, it is the piece a set of suggested looks was styled around.** Everything below follows from that.

---

## 1 · What Felix saw, what Annie wanted, what we keep

| # | Issue raised (timestamp) | Who | What it tells us |
|---|---|---|---|
| 1 | Key piece tiles sit on the avatar, so "everything looks like a look to me at a glance" (27:34–30:52) | Felix | The thumbnail must say *piece* without being read. An avatar is the look register; a piece needs the piece register. |
| 2 | "Four tiles, the key piece top-left" (31:45) | Annie | Right instinct: show the piece itself. Wrong place: inside the look tile it is still one more avatar-adjacent cell. Show it as the piece's own photograph, leading the set. |
| 3 | One-draft rule vs several drafts (32:35–36:59) | both | Several drafts is simpler for her (interrupted twice in a day is normal). But drafts then need a home and a register that says *a look, unfinished* — not a one-off tile that looks like nothing else on the grid. |
| 4 | "Refine" → "Filter"; three identical pills do three different jobs (37:56, 58:59–1:01) | Felix | Sort and filter are standard affordances; New look is a creation door. Give them their conventional shapes. |
| 5 | The repeated "Lookbook" title; where the count lives (39:44–41:39) | Felix | Drop the title (the tab already says it). The count belongs on the masthead line, like the Diary. |
| 6 | Sort and filter only apply to saved looks; key pieces carry no wears, no tags (38:55, 42:33) | Annie | A mixed grid makes half the controls lie. Separate what the controls can act on from what they cannot. |
| 7 | Data: suggested, draft and saved "are all just looks … distinguished by a flag" (1:01–1:05) | Felix | Agreed and adopted. The flag is a `status`, not a type. |
| 8 | Three looks from one piece must stay side by side (1:04) | Annie | A grouping, not an entity. Store the group key; present the group where it matters. |
| 9 | "Build this look → draft → save" feels like work; "why can't I just see the suggestions" (47:57–57:53) | Felix | A suggested look is already a look. Open it, save it as is, or edit it. No build step. |
| 10 | Suggested vs draft is "fuzzy, overlaps strongly" (1:17:55) | Felix | Define them by *who is driving*: a draft is hers in progress; a suggestion is Robes' offer she hasn't chosen yet. |
| 11 | The dazzle (one piece, three ways) must survive, as presentation (1:18–1:19) | both | Keep it on the piece page and in onboarding. It never needs its own data kind. |
| 12 | Lookbook as Saved \| Suggested tabs, like the Diary's List \| Month, `+` on Saved (1:10) | Annie | Adopted as the top-level split. |
| 13 | Write out and rank the user intents first (1:12–1:15) | Felix | Out of this brief's scope, but §7 lists the decisions that exercise should settle. |

---

## 2 · The model

### 2.1 One entity, three states

```
                 she edits it
  SUGGESTED ──────────────────▶ DRAFT ──────▶ SAVED
  (Robes' offer,     she saves as is         she saves
   untouched)   ──────────────────────────────▶
```

| State | Definition (one line, user-facing) | Who made the last move | Counts as hers? | Can be worn / pinned? |
|---|---|---|---|---|
| **Suggested** | A look Robes put together that you haven't chosen yet. | Robes | No | No |
| **Draft** | A look you started and haven't saved. | Her | In progress | No |
| **Saved** | A look you kept. | Her | Yes | Yes |

Rules:
- **Saved never goes back.** Editing a saved look is an in-session edit (the Editing frame as today), not a state change. "Save as a new look" mints a new saved row.
- **A suggested look becomes a draft the moment she changes anything on it.** Opening it, flicking through it, reading it: still suggested. Swapping a piece: draft.
- **Save works from either state**, as-is from suggested (no edit required) or from draft.
- **Discard deletes.** A draft or suggestion she lets go is a row deleted, not a row flagged.
- **Only saved looks gather wears, take tags, pin to a day, pack on a trip.** Rule 04's spirit holds: nothing counts as a kept look until she keeps it. The row may exist earlier; the *standing* does not.

Why "who is driving" and not "how finished": Felix's fuzziness came from defining both states by completeness. A suggestion is complete (background, pieces, frame) and a draft may be complete too. The clean split is authorship of the last move.

### 2.2 The key piece is a grouping, not a state

A key piece styled three ways = **three suggested looks that share an anchor piece and a set id**. The piece itself lives where pieces live (`wardrobe_items`). The "three ways" page is a *view over the set*, reachable from the piece and from the Suggested tab. Nothing about it is a fourth kind of look.

This is what makes Annie's side-by-side requirement and Felix's "it's just a look with a flag" the same answer.

### 2.3 Where each state lives

| Surface | Suggested | Draft | Saved |
|---|---|---|---|
| Lookbook · **Saved** tab | — | leads the tab as an **In progress** row (dashed tiles) | the grid |
| Lookbook · **Suggested** tab | grouped by anchor piece, each group one row | — | — |
| Piece page | "Styled three ways" rail (the set for this piece) | — | "In N looks" rail (as today) |
| Home | — | the box's draft row + next line, as today | Today's look + the saved-looks row (removal deferred, per the meeting) |
| Diary / day page / trip | — | — | the only state that pins |
| Onboarding "Your piece, styled" card | the first set, as presentation | — | — |

---

## 3 · The tile: one anatomy, three registers

Felix's test: **you should not have to read anything to know what it is.** So the state is carried by *shape and material*, with the eyebrow as confirmation, never as the only cue.

| | Frame | Border | Eyebrow | Meta line | Corner mark |
|---|---|---|---|---|---|
| **Saved** | render → her photograph → piece mosaic (today's ladder) | 1px `--rule`, white card | none (the default state needs no label) | "3 wears · 4 pieces · last 13 Aug" / "Not yet worn" | — |
| **Draft** | the same ladder, full strength | **1.5px dashed `--rule-mid`** on `--cream-100` (the app's one "unfinished" convention: the add card, the guide, the empty door) | **Draft** | "Not saved · started Tuesday" | — |
| **Suggested** | the generated frame | 1px `--rule`, white card | **Suggested** in `--sage` (Robes-authored, the sage the Robes credit already uses) | "Around your rust dress" | **the anchor piece's own photograph**, 36×44 on a white hairline, bottom-left of the frame |

Three things this buys:
1. **A draft is unmistakably a look** (same frame, same name, same card) **and unmistakably unfinished** (the dash). Felix's "purposefully more like normal look tiles but with a clearly distinguishing difference" (35:48).
2. **A suggestion carries the piece as a piece** — a flat product photograph in the corner, not a fourth avatar. That is the glanceable cue Felix asked for and the "show the key piece" Annie asked for, without putting a piece on a model.
3. **Nothing exists once.** Drafts can be several and all look the same; suggestions can be many and all look the same. The grid has three registers, not three anatomies.

### 3.1 The set row (Suggested tab)

```
┌─────────┐  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  rust   │  │  SUGGESTED  │ │  SUGGESTED  │ │  SUGGESTED  │
│  dress  │  │  [frame]    │ │  [frame]    │ │  [frame]    │
│ (photo, │  │   ▫ piece   │ │   ▫ piece   │ │   ▫ piece   │
│  cream) │  │ Garden party│ │ City dinner │ │ Off duty    │
└─────────┘  └─────────────┘ └─────────────┘ └─────────────┘
 Your rust dress · three ways                      See all ›
```

- The row leads with **the piece tile in the wardrobe register** (the grid card from `/wardrobe`: product photo on cream, serif name, no avatar). This is Annie's "fourth tile", moved out of the look and into the piece's own register. Tap → the piece page.
- The three looks are ordinary suggested tiles. Tap → the look page, in the suggested state.
- On the phone the row scrolls horizontally (the kp pager already does this). "See all" opens the set view: the three side by side, the piece's photograph as the header (today's `#kp-result-page`, re-registered as a view over the set rather than a builder).

### 3.2 The look page in each state

Same page, one bar:

| State | Eyebrow | Bar (fixed, phone) | Secondary |
|---|---|---|---|
| Suggested | **Suggested · around your rust dress** | **Save to lookbook** (the one ink) · Edit | "Not for you ·" quiet text (deletes the suggestion; feeds the memory ledger as a verdict) |
| Draft | **Draft** | **Save** (ink) · Discard | — |
| Saved | **Saved look** | Edit look (hairline; today's pinned bar) | Delete at the foot, as today |

**"Build this look" is gone.** A suggestion opens as the look it already is. Tapping Edit flips it to draft and opens today's Editing frame. Tapping Save keeps it as is. This is Felix's "here's a look if you want it, it's finished this way, or you can change things" (47:57).

---

## 4 · The Lookbook header

```
  Saved  |  Suggested                              ⊕
  42 looks · 2 in progress                    ↕  ⚲ 2
```

- **Segmented control** Saved | Suggested — the Diary's List | Month, byte for byte. Replaces the Show filter inside Refine (Looks / Key pieces / Both).
- **`+`** (the `.rb-circ` circle) on the Saved tab only → the new-look box, as today. On Suggested the slot is empty (suggestions are made from a piece, not from `+`).
- **Sort** is an icon (↕) opening a two-item menu, Last worn / First worn. **Filter** is an icon (funnel) with the active count as a badge, labelled "Filter" in its drawer. Both live on the count line, right-aligned, small — the conventional shapes Felix asked for, visibly different from the creation door.
- **The "Lookbook" title is removed.** The count line is the masthead: "42 looks · 2 in progress" on Saved; "12 suggested · around 4 pieces" on Suggested.
- **Filter and sort act on the Saved tab only.** On Suggested the one control that makes sense is **Around: All pieces ▾** — a piece picker that narrows the rows to one anchor (Felix's "show me only the suggestions that include…"). Season / Wear / Vibe do not apply to suggestions and do not render there. The drafts row is not filtered (it is a working shelf, not a collection); the count line's filtered number counts saved looks alone.

---

## 5 · Data

### 5.1 Today

| Thing | Where it lives | Shape |
|---|---|---|
| Saved look | `looks` (+ `look_pieces`, `wears`, `proposals`, `styling`, `render_url`) | the entity; `source` is provenance only |
| Draft | `localStorage rb_lk_draft__<uid>` — ONE per user, never a row | the composer snapshot |
| Key piece, styled | `lookbook_items` type `key-piece`, `kpData {ways[3] {title, pieces[]…}, generatedImages[3], photoUrl, builtLooks{way→lookId}}` | a jsonb blob; the three ways are not looks until "Build this look" writes one |
| Legacy daily looks | `lookbook_items` type `daily-look` | already off the Lookbook |

Three stores for what Felix correctly called one structure. The one-draft rule exists *because* a draft is a localStorage key. The build step exists *because* a way is not a row until it is built.

### 5.2 Proposed — migration 25

```sql
alter table public.looks
  add column if not exists status text not null default 'saved'
    check (status in ('suggested','draft','saved')),
  add column if not exists anchor_piece_id uuid references public.wardrobe_items(id) on delete set null,
  add column if not exists set_id uuid,          -- the "three ways" group
  add column if not exists set_index smallint;   -- 0..2 inside the set
create index if not exists idx_looks_status on public.looks (user_id, status);
create index if not exists idx_looks_set on public.looks (user_id, set_id) where set_id is not null;
```

- **`status` is the state; `source` stays provenance** ('robes', 'robes-build', 'manual', 'daily', 'travel', 'variant', 'wear'). Do not overload one with the other.
- **A suggested look is written at generation time** as a `looks` row: owned pieces → `look_pieces` (with roles), unowned → `proposals` (migration 19 already holds the shop shape), the generated frame → `photo_url` with `source:'robes'` (exactly what `__lkSave` writes for a kp build today), `anchor_piece_id` + `set_id` + `set_index`. This is `_lkDraftFromDaily` + `__lkSave` run automatically, with `status:'suggested'`. The `/api/style` call does not change.
- **A draft is a row with `status:'draft'`.** Several per user. Cross-device. The park, `_lkDraftLetGo` ("Let the draft go?"), `_lkDraftTileSync` and the one-draft rule go. The composer's existing debounce (`_lkDraftParkSoon`, 400ms) becomes a PATCH instead of a localStorage write.
- **Transitions are one UPDATE**: `status: 'draft'` on first edit of a suggestion; `status: 'saved'` on Save (plus `name_provisional` as today). Discard is DELETE.
- **The gates move from "does a row exist" to "is status saved"**: `__lkAccrue` (wears), `_lkPin` (Diary), `_tvImportLookInto` (trip), Refine/sort, the home saved-looks row, `_lkHomeZero`, the FTU postures. One predicate, `l.status === 'saved'`, replaces today's implicit "it is in `_lkLooks`".
- **Key pieces migrate**: a one-off script in the `backfill_planned_days.mjs` pattern turns each `lookbook_items` `key-piece` row into N suggested `looks` rows (`set_id` = a fresh uuid, `anchor_piece_id` resolved from the kp's wardrobe row where one exists), then archives the item (`type → 'key-piece-archived'`, the blob kept). Ways with no `pieces[]` (styled before 2026-09-28) become photo-only suggestions. A way already built (`builtLooks[i]`) is skipped — its look exists.
- **Degrade until it runs**: the client strips `status` / `anchor_piece_id` / `set_id` on PGRST204 the way `_lkPropCol` does, and falls back to today's behaviour (one localStorage draft, kp blobs). Shippable in two steps.

### 5.3 What this does to cost

Nothing today: suggestions are still generated when she asks (the piece card's mode, onboarding). Felix's "generate them in the background" (49:07) is a **separate cost decision** — Annie named the Gemini spend as a problem in the same call. If it is ever done, write the suggested rows text-first (pieces + proposals, mosaic as the frame) and render the frame on first open, the same lazy rule `_avRenderKick` already uses on a saved look.

---

## 6 · Language

| Today | Proposed | Why |
|---|---|---|
| Key piece (as a kind of look) | **Key piece** stays for the *piece* ("Style a key piece", onboarding) — never as a tile kind | A piece is a piece. |
| "Key piece · Styled three ways" tile | **Suggested** tile, "Around your {piece}" | The tile says what it is (a look) and where it came from (the piece). |
| Build this look | **Edit** / **Save to lookbook** | A suggestion is already a look. |
| Style it three ways (piece card mode) | **Robes suggests three** | Says who does the work. |
| Build a look (piece card mode) | **Start a look with it** | A draft is hers to start. |
| Draft · not saved | **Draft** (eyebrow) · "Not saved · started Tuesday" (meta) | Shorter, dated. |
| Refine | **Filter** | Agreed in the call. |
| Show: Looks / Key pieces / Both | the **Saved \| Suggested** tabs | A tab, not a filter. |
| Let the draft go? | gone | Several drafts need no gate. |

All copy to pass through the Robes voice check before build.

---

## 7 · Decisions for Annie

1. **Drafts in the Saved tab (recommended) or a third tab?** Recommended: the In-progress row leads Saved. A draft is hers; a third tab for a transient thing adds navigation for the two-drafts case. Revisit if drafts routinely exceed five.
2. **Migrate old key-piece entries or let them age out?** Recommended: migrate — a tester with twelve key pieces should not see two tile languages for a release.
3. **Background suggestions on every piece add?** Not now (cost). The piece page's rail should read "Robes suggests three ›" as a door until it is cheap enough to pre-fill.
4. **Does a prompted day look ("an outfit for Friday") land as draft or suggested?** Recommended: **draft** — she asked for one look and is working toward saving it. Suggested is for *options she has not chosen among* (three ways, any future background set).
5. **Home sections** (saved looks + key pieces off home) stay deferred as agreed; nothing here depends on it. The intents exercise Felix set should settle it.

---

## 8 · Build order

| Step | Scope | Migration? | Harnesses |
|---|---|---|---|
| **A · Register** | the three tile registers; Saved \| Suggested tabs replacing Show; Refine → Filter with icon affordances; the Lookbook title off; the set row with the piece lead tile; "Around: piece" on Suggested. Key pieces still read from `kpData.ways[]` client-side; drafts still localStorage | no | `looks_harness`, `inspiration_smoke`, `nav_chrome_smoke` |
| **B · Status** | migration 25; suggestions written as rows at generation; drafts as rows, several; gates on `status`; the kp backfill script; "Build this look" removed; Save-as-is from suggested | yes | `looks_harness`, `inspiration_smoke`, `ftue_harness`, `diary_harness`, `piece_page_smoke` |
| **C · Piece page** | the "Styled three ways" rail on the piece page reads the set; the kp result page becomes the set view | no | `piece_page_smoke`, `inspiration_smoke` |

A ships on its own and answers every visual point from the call. B is what makes Felix's data model true rather than approximated.
