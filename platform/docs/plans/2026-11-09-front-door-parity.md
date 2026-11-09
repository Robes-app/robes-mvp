# The Front Door, rev 3: bringing native and staging to parity

Status: plan, 2026-11-09 (Annie + Claude). Not started. Owner: Annie. Native leads, web lands in the same PR (platform/CLAUDE.md, Felix D5).

**Sources.** The PRD *Robes "Front Door" mobile: Home, Lookbook, Wardrobe* (rev 3, 9 Nov 2026) and the Claude Design canvas *Robes MVP — The front door · mobile* (`claude.ai/code/artifact/56398d74-fa24-4518-ba0d-1f26dd9a7d82`), rendered at 390 × 844 (captures in `assets/2026-11-09-front-door/`, one per PRD state and sheet) and walked screen by screen against `mobile/src` (the Expo app) and `app/src` (staging.byrobes.com). The PRD is the source of truth for behaviour, the canvas for the visuals. Where the PRD and an earlier decision in `2026-11-06-felix-native-rebuild.md` disagree, this plan says so in §2 and takes the PRD unless Annie rules otherwise.

**Shop.** Shop is not defined and is a fast follow. In this plan the Shop tab and the picker's SHOP tab render disabled, and the Shop toggle keeps today's behaviour: a prompt may propose pieces she doesn't own, and saving the look files those proposals to her wishlist (§2, ruling R1).

---

## 0. The short version

Most of the PRD's screens exist, built to Felix 3a/3k/3e. What is missing is mostly **one thing built three times and once more as a pattern**:

1. **The shared filter pattern (§2.5)** does not exist. Pick, Lookbook and Wardrobe each hand-roll their own refine. Build it once (`FilterRow` · `QuickChips` · `FilterSheet` · a facet-count helper) and re-point the three surfaces at it. Seasons move from the three bands to the four seasons plus Year Round, which the columns already hold (D12).
2. **The Shop toggle** replaces the balance question. Off = `balance: 'owned'`, on = `'mix'`. It sits beside the weather chip in the Draft Look and Look detail styling card. Saving a look with proposals writes them to the wishlist.
3. **The Lookbook and Wardrobe headers** become underline Tabs with icons and a trailing +, category chips gain counts, the wardrobe grid goes to three columns, the wishlist gets hearts and a detail page, the Shop tab appears disabled.
4. **The Draft Look's Rack card**, "The Rack" heading with grid/list, a sticky GENERATE, and the Add Pieces picker's OWNED / WISHLIST / SHOP tabs.
5. **Edit-pieces mode** (the pencil) on Look detail, rows that open Piece detail, the styling card on a saved look.
6. **Piece detail** as three tabs, a flat category picker, a confirmed Delete.
7. **Glass action sheets** (New Look · Add Pieces · Add your pieces), Add from Link, Receipts with Inbox · Added · Discarded.
8. **Shell**: centred wordmark and tab titles, the wardrobe count badge, Notifications ✓ dismisses all.

Nine PRs, each web + native, in §4. Backend work is small and listed per PR; the only new data is a `reason` on suggested looks, seasons and wear-it-for on wishes, and a receipt item's decided state.

---

## 1. What is already there (so nothing is rebuilt)

Checked in code on 9 Nov. File paths are `mobile/src/…` with the web twin in brackets.

| PRD | State | Where |
|---|---|---|
| §3 dock, top bar, bell, avatar | Built. System tab bar (D4), 64pt glass bar with hairline, bell with rose dot, 30pt avatar | `app/(tabs)/_layout.tsx`, `components/TabScreen.tsx`, `components/Bell.tsx` [`components/shell/app-shell.tsx`] |
| §4.1–4.3 Home: ambient line, week strip, hero pager, discs, caption, pager dots, × on a look, image stack, Describe hidden on past days | Built (Felix PR 4, review PRs 9–13) | `features/home/DiaryHome.tsx`, `DiaryStrip.tsx`, `DaySlot.tsx` [`components/home/*`] |
| §4.4 Your Model sheet | Built: dashed Use my likeness tile, five Robes models, 2px ink border + check, persists | `features/home/ModelPicker.tsx` [`components/home/model-picker.tsx`] |
| §4.5 Pick sheet: heading per day, eyebrow, 2-col grid with ticks, SCHEDULED / ADDING / wears / SAVED / NOT WORN YET, preselection, past days file wears | Built | `features/plan/LookPicker.tsx` [`app/(app)/plan/look-picker.tsx`] |
| §4.6 weather chip with × "Leave the weather out" and the place picker | Built; the restore chip reads "Weather" | `features/looks/DayContext.tsx`, `features/home/PlaceSheet.tsx` [`components/looks/day-context.tsx`] |
| §4.6 Details tab: Tags, Seasons, Worn, Caption | Built | `features/looks/LookDetails.tsx`, `TagsView`, `SeasonsView`, `WornView` |
| §4.6 Add Pieces picker (owned, category chips with counts, 3-col, ticks, sticky Add n pieces) | Built for owned pieces | `features/looks/PiecePicker.tsx`, `features/wardrobe/WardrobeGrid.tsx` |
| §4.7 Capture | Built | `features/photo-pieces/LookFromPhoto.tsx` |
| §4.8 / 4.9 Notifications and Settings | Built, per production | `components/Bell.tsx`, `features/you/Settings.tsx` |
| §6.1 / 6.2 one component for saved look and Edit Look drawer, Pieces · Details, Rack rows, Update look ↻, Discard dialog, Schedule look → DiarySheet (today selected, Q3) | Built (D17, D18) | `features/looks/DraftLook.tsx`, `RackRow.tsx`, `PieceList.tsx`, `DiarySheet.tsx` |
| §6.3 image carousel with Add a photo, × per card, ✓ | Built (D19, D20) | `features/looks/ImageManager.tsx` |
| §6.4 Adjust model image sheet | Built (D21); the disc shows on her own photo too | `features/looks/DraftSheets.tsx` |
| §7 wardrobe grid, wishlist list, piece page with every field, category drill, change photo, inbox, link import, forward-receipts address | Built with the 2026-10 layouts (D15) | `features/wardrobe/*` |

Seed data in PRD §9 is the prototype's. The live app starts empty (Q8); seed values are used only in tests.

---

## 2. Rulings this plan makes

Each is a place where the PRD, the code, or an earlier decision pull apart. The plan proceeds on the ruling in bold; a line from Annie flips it.

| # | Question | Ruling |
|---|---|---|
| R1 | **What does Shop on/off do without a Shop catalogue?** | **Off → `balance: 'owned'` (only her pieces). On → `balance: 'mix'` (her pieces first, new pieces where the look needs them). `'new'` is no longer offered.** Saving a look that carries proposals files each proposal to the wishlist (`wishlist.create` with name, brand, colour, retailer hint) and marks it `wishlisted`, as Annie asked on 9 Nov. Her existing wishlist pieces are read into the prompt when Shop is on, so a look can be built around something she wants. The `BalanceQuestion` chips go from HomeBox and StylePiece. |
| R2 | **Pencil edit-pieces mode (PRD §6.1/6.2) vs pieces editable at rest (D17).** | **PRD wins: the swap and × discs show only in edit-pieces mode; at rest each row ends in › and opens Piece detail.** D17's reason (nothing to discover) was weighed against rows that can't be tapped; the PRD chose the tap. |
| R3 | **Look detail from Home: sheet with × (PRD) or page (today).** | **Keep the page.** Home's tap on the look pushes `/look/:id` with a back disc; Edit opens the drawer as today. One less sheet over Home, and deep links keep working. |
| R4 | **Week strip window.** PRD: whole calendar weeks, previous · current · next. Today: today ±10 days, pages not aligned to weeks. | **Align pages to weeks (Monday start) and widen to three weeks, as the PRD.** `DIARY_BACK`/`DIARY_AHEAD` in `@robes/core/calendar` become "start of last week" to "end of next week". |
| R5 | **Model thumbnail on the hero.** PRD: always. D10: hidden once her twin exists. | **D10 holds.** The PRD's canvas has no twin; the thumbnail is the way to a model when she has none. |
| R6 | **Wear-it-for vocabulary (PRD Q5: one unified list).** Seeds today: Everyday, Work, Evening, Occasion, Travel, Active, Lounge. The PRD adds Weekend and has Weekend casual on pieces. | **One list for looks and pieces: Everyday · Work · Weekend · Evening · Occasion · Travel · Active · Lounge.** `weekend` joins `WEAR_SEEDS`; "Weekend casual" is not a seed (a tag she typed stays hers). Quick chips show the first five (All · Everyday · Work · Weekend · Evening · Active); the sheet shows all eight plus her own tags. |
| R7 | **A look's wear-it-for.** Today `lookWearFor()` derives it from tags every piece shares; `look.tags` is ignored. | **A look's own `wear_for` tags lead; the derived set fills in only when the look has none.** Same function, one more input. Suggested looks get their tags from the generation. |
| R8 | **Seasons in filters.** Three bands today; the PRD's five options. | **Filters read `seasons[]` (four seasons); Year Round is the empty set (D12).** "Year Round" or untagged matches any season filter; selecting Year Round returns untagged items. `climateBand` stops appearing in any filter input. |
| R9 | **Faceted counts.** None server-side. | **Looks count on the client** (the list is at most 60 and already loaded). **Pieces count on the server**: `wardrobe.summary` takes the same filter input as `wardrobe.list` and returns counts per category, season, wear-it-for, colour family and brand, each facet counted with the other facets applied. |
| R10 | **SHOP tabs.** | **Rendered, disabled** (45% opacity, no pointer, `accessibilityState.disabled`) in the Wardrobe header and the Add Pieces picker. No Shop route, no catalogue, no bag icon logic beyond "look has proposals". |
| R11 | **Dock badge.** PRD Q1: items in the wardrobe; red "0" when empty. Native's bar is the system's (D4). | **Native: `NativeTabs.Trigger.Badge` with `wardrobe.summary.total`; hidden at 0** (iOS draws a badge red and a "0" badge reads as an alert). **Web dock: the 18px disc, ink with the count; hidden at 0.** The red zero stays a prototype flourish unless Annie wants it. |
| R12 | **One filled button per screen (D3) vs the PRD's rose quick chips, an ink Filter button and an ink CTA on one sheet.** | **The Filter sheet's CTA is the screen's one fill; the active Filter button and rose chips are chips, not buttons, and don't count.** The Button guard stays as it is. |
| R13 | **Category picker on a piece.** PRD: a flat list of eight. Today: a three-level drill that sets L2/L3 too. | **Keep the drill** (it carries the taxonomy the analysis and tag defaults need); its first level shows the PRD's eight with Knitwear, and a ✓ on the current value. |
| R14 | **Delete a piece.** PRD: outline DELETE PIECE + a confirm dialog. Today: a quiet Remove with Undo (UX D13 "undo, not confirm"). | **PRD wins for the button and the dialog** (it removes the piece from looks too, which an undo toast under-sells); the Undo toast stays after Delete. |
| R15 | **Lookbook search (PRD Q6: hidden, pull to reveal).** | **Build it on both** as a collapsed search pill under the filter row that a pull reveals (native: `ScrollView` over-scroll; web: a pull on touch, always visible with a pointer). |
| R17 | **The filter sheet's picked option is an ink fill with a cream label (the canvas) vs "a selection is the warm fill, never black" (root CLAUDE.md principle 3, Felix D2).** | **The canvas wins inside the filter sheet** (`Pill tone="ink"`): it is the newest drawing and the warm fill reads too close to the white option pills in a wrap of eight. Everywhere else a selection stays warm. Flagged for Annie. |
| R16 | **Glass sheets on native.** No blur dependency today. | **Add `expo-blur`** (runs in Expo Go) for the three tile sheets and the Filter sheet; web uses `backdrop-filter`. One `GlassSheet` in `@robes/ui-native` / `@robes/ui`. |

---

## 3. Primitives first (PR 0)

Everything below composes these. One PR, `@robes/ui` and `@robes/ui-native`, with tests and stories.

| Primitive | Change |
|---|---|
| `Tabs` | Optional leading icon per tab (bookmark, sparkle, hanger, heart, bag), optional count ("INBOX 13"), optional `disabled` per tab, a `trailing` slot for the ink +. The "never icons" comment goes; the PRD's three headers have them. |
| `Chip` (from `Pill`) | `count` prop rendered lighter after the label ("Work 3"); `active` = `rose` fill, white label, count at 70%; `disabled` = 45% opacity, `rule` border, no press. `removable` keeps its ×. 28pt. |
| `FilterButton` | The sliders-icon pill: transparent with a `warm-line` border at rest; ink fill with cream label and count when active. |
| `Switch` (pill form) | The Shop toggle: 28pt pill with icon, label and a 30 × 18 track, 14 knob, 0.15s slide. On: `#F6EEF0` bg, rose border and track. Off: transparent, warm-line border, `#E4DCCD` track. Carries its aria-label. Web's settings `Switch` stays for settings rows. |
| `GlassSheet` | Floating sheet with blur and the warm gradient, radius 24, close disc at left, bold sans title centred, optional text action at right (Clear), content, optional CTA. Enter/exit per PRD §2.6 (0.26s, the exit plays on a clone / `AnimatePresence`). Native: `expo-blur`. |
| `TileSheet` | A `GlassSheet` with three icon tiles and an optional count badge on a tile; a tile can be `selected` (ink outline, the others fade). New Look · Add Pieces · Add your pieces. |
| `SwatchGrid` | The 5-column colour-family grid: 40pt quartered swatches (from `FamilyTile`), label 11, selected = 2px cream gap + 1.5px ink ring. Multi-select. |
| `SelectField` | The brand select: white field "All brands" with ⇅, expands inline to a list with ✓ on the current value; single-select, collapses on choice. |
| `ListGridToggle` | The small segmented grid/list control used on The Rack and the wardrobe. It is the one `SegmentedControl` use that stays; the guard test's caller list is updated as screens move to `Tabs`. |

Tokens already carry Felix's values; `#F6EEF0`, `#E4DCCD`, `#7A6A50` and `#6B5C43` from the PRD are added as named tokens (`shop-on-bg`, `switch-off-track`, `label-off`, `eyebrow-sheet`), never raw.

---

## 4. The PRs

Each PR: native first, the web twin in the same PR, a comment naming the twin, tests for new logic, `pnpm verify` green. API changes read `docs/api-security.md` and finish its checklist; new personal data lands in `docs/data-inventory.md`.

### PR 1 · The shared filter pattern, on the Pick sheet

**Core** (`packages/core/src/filters/`): `FilterState` (PRD §8), `matchesSeasons` (Year Round / untagged rule), `facetCounts(items, state, facet)` for looks, `applyLookFilters(looks, state)` (search over title and piece names, seasons, wear-it-for). `lookWearFor` takes the look's own tags first (R7). Weekend joins the filter vocabulary (`WEAR_FOR_ALL`, R6) rather than `WEAR_SEEDS`: the seed migration is already applied and forward-only, and a tag row is minted on first use anyway.

**Components** (`features/filters/` [`components/filters/`]): `FilterRow` (FilterButton · applied season chips with × · divider · quick chips), `QuickChips`, `FilterSheet` (sections of option pills with live faceted counts, Clear, CTA "SHOW n LOOKS" / "SHOW 1 LOOK" / "NO LOOKS MATCH"). Configured with facets, so the three surfaces pass different facet lists.

**Pick / Swap sheet** (`features/plan/LookPicker.tsx` [`plan/look-picker.tsx`]):
- Remove the "YOUR LOOKS" eyebrow, the Last worn sort pill, the Refine toggle and card.
- Filter row under the heading; search field (40pt white pill, "Search your looks") under it, live.
- Header ✓ Done replaces the footer CTA: grey until the selection changes, ink after; the day-specific copy moves to the ✓'s accessibility label.
- Swap opens the same multi-select sheet with the day's looks preselected (today `mode='change'` is single-replace); the look she swapped from is unticked when she picks another.
- Filtering never drops a selection made before it.
- Empty: "No looks match. **Clear filters**".

**Acceptance (PRD §10 4, 4a).** With the seed looks in a test: Filter › Autumn + Travel shows only "Wool under a trench"; Active shows a count of 0 and is disabled.

### PR 2 · Lookbook

`features/looks/LooksView.tsx` [`components/looks/lookbook.tsx`]:
- Header: `Tabs` SAVED (bookmark) · SUGGESTED (sparkle) with the trailing ink + → **New Look** `TileSheet` (DESCRIBE → draft drawer · PHOTO → file picker · FROM PIECES → draft drawer with the picker open). The segmented control, the count line and the sort pill go; order is newest saved first.
- Filter row on both sub-tabs, one filter state shared across them, counts following the active sub-tab; the `SORT_FROM` threshold goes. Filter sheet: SEASON, WEAR IT FOR (seeds + her tags + "+ Custom tag"), CTA.
- Hidden search pill revealed by a pull (R15).
- Saved card meta: calendar icon + `{wears} · {seasons}` or `New · {seasons}`; "Year Round" when empty; small bag icon when the look has proposals. `LookTile` gains the meta variant; `lookbook.meta.card` copy changes.
- Suggested card: the reason as the subtitle (see backend), bookmark disc on the image → `looks.save` (filled once saved; the look moves to Saved and the counts update). × and ↻ stay.
- Empty state: 64pt white disc with the bookmark, "No saved looks yet", the PRD body, ink pill **+ NEW LOOK** → New Look sheet. Filtered-empty: italic serif "No looks match".
- The header area carries the faint warm tint.

**Backend.** `looks.suggested.reason text` on `app.looks` written by the jobs that make suggestions (`daily`, `style-piece`, `key_piece`): "For 9–13° in Dublin", "Built from what you wear most", "Uses 3 pieces you own", "Works with your wishlist". The copy templates live in `@robes/copy`, the job writes the key and its arguments, not prose. `Look` output gains `reason`. `looks.list` output gains `hasProposals` for the bag icon (or the client reads `proposals.length`).

**Acceptance (§10 9).**

### PR 3 · Wardrobe

`features/wardrobe/WardrobeView.tsx`, `WardrobeHeader.tsx`, `WishlistView.tsx` [`components/wardrobe/piece-grid.tsx`, `wardrobe-header.tsx`, `wishlist.tsx`]:
- Top bar title "Your wardrobe" (serif, centred). Header: `Tabs` OWNED (hanger) · WISHLIST (heart) · SHOP (bag, disabled, R10) with the trailing + → **Add Pieces** `TileSheet` (PR 7; until then the current add route).
- Filter row: FilterButton with count, then **category quick chips** with counts (All · Tops · Knitwear · Bottoms · Outerwear · Shoes · Bags · Accessories, only those present), single-select, counts respecting the sheet filters. No applied-season chips in this row.
- Filter sheet, no counts on options: SEASON (multi), WEAR IT FOR (multi, the unified list), COLOUR `SwatchGrid` (multi), BRAND `SelectField` (single; a wish's retailer counts as its brand). CTA "SHOW n PIECES" / "NO PIECES MATCH", counted by the extended `wardrobe.summary` (R9). Filters apply live; the CTA closes.
- Grid: 3 columns, `CardTile` at 3:4 with the serif name truncated and meta (calendar + wears, "New", or price). The star (hero) action moves to the long-press menu and Piece detail. List view stays behind the toggle.
- Wishlist: the same tabs and filter row; tiles show price; a filled heart on the image removes the wish (`wishlist.delete`, undo toast); a tile opens Piece detail (PR 6) with **Shop** (retailer) in place of Brand; "Bought" stays as the detail page's action.
- Empty (Owned): white disc with hanger, "Your wardrobe is empty", the PRD body, ink pill **+ ADD PIECES**.
- Dock badge = `summary.total` (R11).

**Backend.** `ListPiecesInput`: `seasons[]`, `wearFor[]`, `colourFamilies[]` (multi), `brand`, `category`; `seasonBand` kept one release for installed builds, ignored when `seasons` is sent. `wardrobe.summary` takes the same input and returns faceted counts. Knitwear: `sheetCategoryOf` already maps knit L2s; the category quick chips and the picker read the sheet category, so no enum change. `WishlistItem` gains `seasons[]`, `wearFor[]`, `colourFamily` (migration; backfilled from colour where set) so the filter sheet applies on the Wishlist tab; `wishlist.list` takes the same filter input.

**Acceptance (§10 10, 4a).** Filter › Browns on the seed wardrobe shows Wool jacket, Leather tote, Check shacket.

### PR 4 · Draft Look: the Rack card, the styling card and the Shop toggle

`features/looks/DraftLook.tsx`, `PieceList.tsx`, `PiecePicker.tsx` [`components/looks/draft-look.tsx`, `piece-list.tsx`, `piece-picker.tsx`]:
- `NewDraft` shows Pieces · Details tabs from the start (Details rows act on the draft once it exists; before that they create it, as picking a piece does).
- **Rack card** replaces the 55pt dashed slot: dashed warm-line card with the hanger column; with pieces in the wardrobe: eyebrow YOUR WARDROBE, "Pick from your wardrobe", "Or let Robes style below", › → Add Pieces picker; empty wardrobe: "Add your pieces", "Photo, link or receipt", + → **Add your pieces** `TileSheet` (PASTE URL · PHOTO · FROM RECEIPT, the same component as PR 7). No "The Rack" heading until a piece is chosen; then the heading with the `ListGridToggle`, rows as `RackRowCard`, and the card moves below as the add slot.
- **Styling card** (white, radius 12, no heading), shared by the draft and the saved look (PR 5): context row with the weather chip (rose fill, white text, 📍 opens the place picker, × leaves the weather out; restored by an outline **"Add location & weather"** chip) and the **Shop toggle** at the right; then the prompt row (52pt, borderless, rotating italic placeholders starting "dinner date, smart casual…"). The "Style it" chip leaves the card.
- **Shop toggle** → `balance` (R1): off when she has wardrobe pieces, on when she has none; `looks.prompt` and `looks.ask` take `balance`; `LookAskInput` gains it. The `BalanceQuestion` chips go from `HomeBox` and `StylePiece`.
- **Sticky GENERATE ✓** primary button at the foot; generating state cycles the dressing lines over the image; the result lands with its pieces in The Rack; ✓ saves and pins it to the day.
- **Add Pieces picker**: `Tabs` OWNED · WISHLIST · SHOP (disabled) with the trailing ink + ("Add a new piece" → Add Pieces sheet); category chips with counts; 3-col grid with ticks; sticky ADD PIECES. WISHLIST lists her wishes; adding one puts it in The Rack as a proposal row (the look then carries a proposal and the bag icon).

**Backend.** `looks.ask` and `looks.prompt` accept `balance`; the style prompt reads her wishlist when `balance = 'mix'` (`packages/ai` style-piece v5: a "pieces she wants" block, no PII beyond the wish's label, brand, colour). `saveLook` files un-wishlisted proposals to the wishlist and marks them (R1), in one transaction, with a cross-user test. A rack can hold a wish: `look_pieces` gains `wishlist_item_id` (nullable, composite FK) or the wish is written as a proposal with `wishlistItemId`; this plan takes the proposal route (no new FK, the row already draws as "Not yours yet").

**Acceptance (§10 7).**

### PR 5 · Look detail and Edit Look

`features/looks/DraftLook.tsx` (saved and sheet presentations), `RackRow.tsx` [`draft-look.tsx`, `rack-row.tsx`]:
- "The Rack" heading with `ListGridToggle` (list default) and the **pencil**: edit-pieces mode swaps each row's › for the hanger (swap) and × (remove) squares, the pencil ink-filled while active (R2). At rest a row opens Piece detail (`onOpen`, today unused). Grid view shows the pieces as 3-col tiles.
- Below the list the small "+ hanger" add button → Add Pieces picker (PR 4).
- The **styling card** from PR 4 (weather chip + Shop toggle + refine prompt "more casual…"). Toggling Shop or typing counts as a change and enables **UPDATE LOOK ⟳** (drawer footer) / the Update look pill (page); Update redraws with the new `balance`.
- Edit Look drawer header: × (Discard, asks when dirty), eyebrow EDIT LOOK, ✓ saves (dimmed while anything is unapplied, as D18).
- Adjust model image disc only when the front image is Robes' picture (`record !== 'photo'`, PRD §6.4).
- Look detail from Lookbook keeps the back disc and SCHEDULE LOOK → `DiarySheet` with today selected.

**Acceptance (§10 8).**

### PR 6 · Piece detail

`features/wardrobe/PieceDetail.tsx`, `PieceRows.tsx`, `PieceFieldSheet.tsx` [`piece/[id]/piece-detail.tsx`, `piece-rows.tsx`, `piece-field-sheet.tsx`]:
- Header: ‹ back, serif name centred; ✓ when opened from Edit Look's picker.
- Large image with the regenerate/adjust disc and, once a piece can hold more than one photo, the image stack (not in this plan; one photo, per Felix PR 8).
- `Tabs` PIECE · COLOUR · WEARING over the existing `DrillList` rows: PIECE = Name (✎ inline, underlined field with clear ×), Category ›, Brand › (Shop › on a wish), Size (Add ›), Price (Add ✎), Notes (Add ✎). COLOUR = Colour, Additional colours, Print, Material. WEARING = Worn ›, In looks ›, Seasons › (four seasons, Year Round empty), Wear it for ›.
- Category picker: the drill's first level lists the eight with Knitwear and a ✓ on the current value (R13).
- "Style this piece" and "Start a look with it" stay above the tabs on an owned piece (they are not in the PRD's frame; drop them if Annie rules so).
- Owned pieces end with an outline **DELETE PIECE** → `AlertDialog` "Delete this piece?" / "It will be removed from your wardrobe and from any looks it's in." / ink DELETE (danger variant) · Cancel (R14).
- Wishes open the same page with Shop in place of Brand and **Bought** where DELETE PIECE sits.

**Backend.** The Wearing tab's Seasons row writes `seasons[]` (and the band for old readers, D12).

**Acceptance (§10 10).**

### PR 7 · Add Pieces and Receipts

`app/wardrobe/add.tsx`, `features/wardrobe/add/AddPiecesPanel.tsx`, `InboxView.tsx`, `LinkImport.tsx` [`components/wardrobe/add/add-flow.tsx`, `inbox.tsx`, `link-import.tsx`]:
- **Add Pieces** `TileSheet` over the Wardrobe (and over the draft as "Add your pieces"): PASTE URL · PHOTO (file picker / camera) · FROM RECEIPT with the unreviewed-items count badge. The Wardrobe/Wishlist destination control goes (a wish is added from the Wishlist tab's +). "Add without a photo" stays as a quiet link under the tiles.
- **Paste URL** → the sheet retitles "Add from Link", the tile selected, the others fade, a "Paste a link" field, ✓ once a URL is entered → `imports.link` and the existing review.
- **Receipts**: a tall `GlassSheet` "Receipts" with the three tiles (From Receipt selected), `Tabs` INBOX n · ADDED n · DISCARDED n, the FORWARD RECEIPTS TO card (address, copy, "Pieces will be extracted for your review."), items grouped by retailer with per-item × / ✓ and a group footer (order, sender, dates) with group × / ✓. Accept → Owned; discard → Discarded; counts and the badge update.

**Backend.** `inbox.decide` already takes `itemIndexes`; the receipt item needs a stored state (`inbox` | `added` | `discarded`) and a `wardrobe_item_id` once added, so ADDED and DISCARDED can be listed: `app.receipt_items` (or a `decisions jsonb` on the receipt) with a migration and `inbox.list` filtering by state. Data inventory entry.

**Acceptance (§10 11).**

### PR 8 · Shell and motion

- Top bar: wordmark centred on Home; serif titles "Lookbook" and "Your wardrobe" centred on their tabs; bell only when notifications exist.
- Notifications ✓ dismisses all (PRD Q2); the bell hides when empty.
- Week strip: weeks aligned, three weeks of data (R4); the pager resets to its first page on a day change (today `DaySlot` keeps `page`).
- Model change crossfades the hero (`Animated` opacity on native, a CSS transition on web).
- Sheet exit animation on every `Sheet`/`GlassSheet` (PRD §2.6), the scrim at 70%.
- Web dock badge; native `Badge` (R11).

### PR 9 · Follow-through

- Update `platform/CLAUDE.md` "Product rules": the filter pattern is one component (`FilterRow` · `FilterSheet`), the styling card is one component, Shop is `balance`, the pencil rule (R2), the wear-it-for list (R6).
- `docs/design-system.md`: the new primitives. `docs/api.md`: the changed inputs. `docs/plans/README.md`: this plan's row.
- Remove `BalanceQuestion`, `SwapSheet` (older), the Lookbook sort sheet, and the three private filter cards.

---

## 5. Order and dependencies

```
PR 0 primitives
 └─ PR 1 filter pattern + Pick ─┬─ PR 2 Lookbook
                                ├─ PR 3 Wardrobe (needs wardrobe.summary facets)
                                └─ PR 4 Draft Look + Shop toggle (needs balance on ask/prompt, saveLook → wishlist)
                                     └─ PR 5 Look detail / Edit Look (styling card from PR 4)
PR 6 Piece detail (independent after PR 0)
PR 7 Add Pieces + Receipts (independent after PR 0; PR 3's + points at it)
PR 8 Shell and motion (any time after PR 0)
PR 9 docs and removals (last)
```

PRs 2, 3 and 4 can run in parallel once PR 1 merges. Backend changes ship in the PR that first needs them, with the client degrade for installed builds (`seasonBand` and the band columns keep being written one release).

---

## 6. Acceptance criteria → PR

| PRD §10 | PR |
|---|---|
| 1 six states pixel-close at 390 × 844 | 2, 3, 4, 8 (Home); e2e screenshots against `platform/design/reference` + the canvas captures |
| 2 dock, Diary placeholder | Dock exists; Diary stays a real page (PRD Q4) |
| 3 week strip paging, markers, Describe hidden | exists; R4 in PR 8 |
| 4 Pick/Swap | 1 |
| 4a filtering, counts, sheet, Clear, search, Year Round rule, the two seed checks | 1, 2, 3 |
| 5 × on hero updates markers | exists |
| 6 Your Model persists | exists |
| 7 Draft Look: Rack card, heading, Shop toggle default and motion, weather chip, Generate, ✓ | 4 |
| 8 Look detail / Edit Look: toggle, pencil mode, row → piece, Update enables on change | 5 |
| 9 Lookbook | 2 |
| 10 Wardrobe, piece detail, category, delete | 3, 6 |
| 11 Add Pieces, Receipts | 7 |
| 12 Notifications, Settings | 8 (✓ dismisses all) |
| 13 sheet motion incl. exit | 0, 8 |

---

## 7. Questions before building

The grill. Each has the default the plan takes; a word from Annie changes it.

1. **R1, Shop on.** With Shop on, should Robes *prefer* her wishlist pieces before inventing new ones, or treat them as equals? Default: prefer the wishlist (she already wants them), invent only where the look still needs a piece.
2. **R1, saving.** Every proposal on a saved look goes to the wishlist, or only the ones she hasn't removed from The Rack? Default: only those still in The Rack at save.
3. **R2.** Pencil mode makes swap and remove two taps away. Is that the intent, or should the saved look stay editable at rest (D17) and only the Edit Look drawer from Home get the pencil? Default: pencil on both, as the PRD draws.
4. **R6.** "Weekend casual" exists on real pieces' tags today? If so, rename those tags to "Weekend" in a migration, or leave them as hers? Default: leave hers; new seed is "Weekend".
5. **R11.** A red "0" badge on an empty wardrobe reads as an alert on iOS. Keep it, or no badge until the first piece? Default: no badge at 0.
6. **R12.** The Filter sheet shows an ink CTA under an ink Filter button and rose chips. Fine as the PRD draws, or should the active Filter button be the warm fill? Default: as drawn.
7. **PR 2.** Suggested looks need a `reason`. Which four or five reasons matter for the MVP? Default: weather, "built from what you wear most", "uses n pieces you own", "works with your wishlist"; "For your 10am" waits for the calendar.
8. **PR 3.** The wardrobe grid at 3 columns drops the star (hero) from the tile. Hero pieces move to a long-press and the detail page. OK?
9. **PR 6.** "Style this piece" and "Start a look with it" are not in the PRD's piece frame. Keep them above the tabs, or move them into a ··· menu? Default: keep.
10. **PR 7.** The Wardrobe/Wishlist destination choice goes from Add Pieces; a wish is added from the Wishlist tab's +. OK?
11. **R4.** Three weeks of strip data, or keep today's ±10 days and only align the pages? Default: three weeks.
12. **Diary.** PRD Q4 keeps Diary in the dock; it stays the real Plan page, not a placeholder. Confirm nothing in Plan changes in this pass.

---

## 8. Out of scope here

Shop catalogue and the Shop tab's content; Capture's camera flow beyond today's; "Use my likeness" onboarding; Settings sub-pages; a Schedule look date picker beyond `DiarySheet`; real link extraction and receipt parsing changes; tablet and desktop layouts; dark mode (D15).
