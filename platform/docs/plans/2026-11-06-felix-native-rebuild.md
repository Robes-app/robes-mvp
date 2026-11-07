# The Felix rebuild: web and native on the Felix Design System

Status: decisions recorded 2026-11-06 (Annie); D12–D15 added later that day from the plan doc *Felix rebuild — PRs 5 to 8 and beyond*. PRs 1–7 merged (#78–#84). The review of PRs 5–7 (D17–D23) shipped as one PR, #85, merged 6 Nov. PR 8 is next; the sequence stops after it (D15). Calls made while building that Annie has not ruled on are under **Open calls** at the foot.

Sources:
- `platform/design/felix`: the design system (brand book, tokens, 26 component specs with previews). Felix is the source of truth for visual values from 2026-11-06.
- `platform/design/reference`: frames 3a (Home, day one), 3k (Home with a look) and 3e (a saved look). Screens with no frame work to the Felix component previews.

## Decisions (Annie, 2026-11-06)

| # | Decision |
|---|---|
| D1 | Felix's token values are adopted. Where Felix misses the accessibility floor the floor wins: `ink-faint` #74664A, small rose text `accent-warm`, `warm-past` darkened to 3:1. |
| D2 | Selection is the warm fill with the warm edge (`selected` / `selected-line`, Felix `warm-100` / `warm-line`). This supersedes "cards and selections sit on white" (root CLAUDE.md principle 3). |
| D3 | The one-filled-button ceiling stays (UX-26): ink where it makes sense, never more than one per screen. No change to the Button guard. |
| D4 | Tab labels are Felix's: Home · Lookbook · Diary · Wardrobe (already true). Native keeps the system tab bar (`expo-router/native-tabs`). |
| D5 | Web and native move together, native leads: every screen lands on both in the same PR, built native-first. |
| D6 | Felix wins over the earlier redlines on visual details: top bar 64 tall with a hairline always on glass; a 7px rose bell dot; the avatar a 30px `sage-mid` disc with an Inter 500 initial; eyebrows 10/500/0.24em; the floating sheet 8px from the edges with a 0.5px `rule-mid` border; Pieces · Details as underline Tabs (no segmented track); Cormorant floor 15px (piece names), 17px elsewhere. Supersedes the 2026-11-04 iOS navigation redline's top bar, bell and avatar rows, the 2026-11-05 floating-panel inset, and the 2026-10-25 eyebrow. |
| D7 | Home is rebuilt as 3a/3k: Capture · Describe · Pick (day one) and Swap · Edit (with a look) are ActionDiscs on the photo; the photo is content width with pager dots; the day-one band is replaced by her model photo with the ModelStack. The dashed Add look tile and the Log sheet's rows go. |
| D8 | A saved look is 3e: tags, seasons, worn and caption live in the Details tab (LookDetails → TagsView, SeasonsView, WornView). The You · Model switch is replaced by the ImageManager (the image-stack badge): a look holds any number of images, not two. |

## The PRs

| PR | Scope (web + native unless noted) | Status |
|---|---|---|
| 1 | Tokens and icons from Felix; reference frames | #78 open |
| 2 | Primitives: the type scale (Text, Heading, Eyebrow, Label, Category, Meta; Cormorant floor 15 for piece names); Button `outline` and `chip`, Felix label (10/500/0.22em), padding 0 28; Tabs (new); Avatar `sage-mid` disc; 0.5px `rule-mid` edges on Card, Pill and lists; Sheet floating inset 8 with border, `cream-400` handle, Felix motion, `rows`; AlertDialog (native new, web from Dialog); Icon `stroke` prop; focus ring 1.5px. Update the docs and code comments D6 supersedes. | #79 open (stacked on #78) |
| 3 | TopNav (TabScreen, Bell, app-shell): 64 tall, glass, hairline, rose dot, avatar disc. Dock labels 9.5/500/0.04em; web active bar and dock glass. (The dock's unread dot waits for something to drive it.) | in review |
| 4 | Home 3a/3k: WeekStrip deltas (current cell gets fill and edge, date 400, planned ring), content-width photo with pager dots, ActionDisc, ModelStack + ModelPicker, the caption under the discs. Pick opens `LookPicker` and Capture its capture flow (the one-drawer rules in platform/CLAUDE.md hold). A day with looks ends on the model page, so another look can still be added. | in review |
| 5 | Look images (data): any number of images per look (D13) and the four seasons (D12). Migration (`look_images`, `seasons`), repository with cross-user test, routes (`looks.images.add` / `.remove` / `.cover`), `docs/data-inventory.md`, the export, `docs/api-security.md` checklist. `photo_asset_id`, `record_image` and the bands keep being written for the old code and Expo Go on staging. No screen changes. | #82 merged |
| 6 | Saved look 3e: SavedLook (edge-to-edge photo, back, adjust, image stack), Tabs, PieceList, LookDetails, TagsView, SeasonsView (four seasons, D12), WornView (its "+ Add a date" opens `DiarySheet`; the × deletes the wear), ImageManager (D13), the `primary` Schedule look (opens `DiarySheet`); Delete as a `danger` reveal inside Editing (D9). Her own tags on a look (`tag_looks`, `Look.tags`, `UpdateLookInput.tags`) land here for TagsView. | #83 merged |
| 7 | The draft: DraftLook's anatomy on `DraftPage`, presented as a drawer over whatever started it (D14); AdjustSheet and DescribeSheet are two doors into the one thread, drawing only on Send or Generate; WardrobePicker; `AlertDialog` for Discard and the drafts-full prompt; no Worn row on a draft. | #84 merged |
| 8 | Wardrobe piece (one photo; the regenerate icon replaces it — no image stack), NotificationsSheet (Done closes; the `overnight` kind takes the `looks` icon; no dock dot), SettingsView (Account keeps every row it has today). | after 7. The sequence stops here (D15) |

## Decisions (Annie, 2026-11-06, continued)

| # | Decision |
|---|---|
| D9 | Delete on a saved look moves into the look's edit mode (Felix keeps `danger` to a destructive reveal). |
| D10 | The `Robes model` tag (5 Nov) is replaced by the ModelPicker control at the top left of the photo (ModelStack). Once she has made her digital twin, it is not shown. |
| D11 | The week strip's worn mark is `warm-past`. |
| D12 | Seasons are the four seasons, multi-select, Year Round the empty set: `seasons text[]` on `app.looks` and `app.wardrobe_items`, backfilled from the band. The band (`climate_band` / `season_band`) keeps being written from `seasons` so every older reader sees what it saw. ADR-002's three bands become a derived value. |
| D13 | A look's image stack is Robes' picture (the frame, else the render) plus her photographs (`app.look_images`). Robes' picture can only be redrawn, never removed; her photographs come and go down to none. The front card is the cover: position 0, and `record_image` is written to match (`photo` when a photograph leads, `model` otherwise). |
| D14 | The draft is one component (`DraftPage`) presented as a drawer over whatever started it: Home, the Lookbook, a piece, a saved look's Edit; a new door later is one line. Native presents it as a form sheet; web keeps the route for deep links and intercepts it from the app's screens. AdjustSheet and DescribeSheet both feed the one thread (`useAdjust`) and draw only on Send or Generate. A draft's Details tab has no Worn row. |
| D16 | The name is the Caption (Annie, 6 Nov, on PR 6's open call): Details › Caption edits the look's name, its hierarchy reduced to that row. No name field between the photo and the tabs, and no facts line under it ("4 pieces · Not worn yet · pinned for …"). On the saved look and in the draft drawer alike. |
| D15 | The sequence stops after PR 8. The Lookbook grid, the Diary, the Wardrobe grid and inbox, You's pages, onboarding and sign-in keep Felix's tokens and primitives with their old layouts until the next design round. Dark mode is ignored for now (no dark theme in Felix). Only Expo Go on staging runs native, so the compatibility window for old columns is the deploy's few minutes, not weeks. |

## Decisions from the PR 5–7 review (Annie, 2026-11-06, evening)

Annie walked 3a, 3k and 3e (the *Front Door design frames* canvas, amended that evening) against what PRs 5–7 shipped. **3e is the source of truth for a saved look.** These supersede D13's "never removed", D14's "a saved look's Edit" door and PR 7's first open call.

| # | Decision |
|---|---|
| D17 | **A saved look is edited in place (3e).** Pieces are editable by default: swap and × discs on each row, the dashed + row to add. Under the pieces sits the prompt card, "Describe other changes…", quietly. Once anything changes, a small **Update look ↻** pill appears under it; Schedule look stays the footer's ink button. Leaving with changes not applied asks *Discard your changes?* (Discard · Keep editing). The Edit chip goes. The draft drawer is for drafts only. |
| D18 | **Home's Edit and the image stack open the Edit Look drawer over Home with 3e inside** (one component, a page from the Lookbook, a drawer from Home). Tapping the look on Home opens the 3e page. In the drawer **Update look ↻** is the one accept (pieces, photos, cover, adjustments; redraws when pieces changed) and she stays to see it; the header ✓ is dimmed while anything is unapplied, then closes; × with changes asks *Discard your changes?* |
| D19 | **The image stack (amends D13).** Home's stack (3k, bottom-right of the look) opens the drawer in image mode with *Add a photo* in focus. A picked photo uploads at once and loads into the current frame, in focus. Every card carries its × top-right except the last one left: a look always keeps one image. **Robes' picture can be removed: removing hides it**, and the next redraw (pieces changed, or an adjustment) brings a fresh one back **as the cover**. Otherwise a redraw never takes the cover: the card she chose stays in front (Annie, 6 Nov). Image mode's ✓ returns to the photo showing the card in front. |
| D20 | **Image changes wait for acceptance**, like pieces: the upload is immediate so the photo shows, but adding it, hiding cards and the front card are held until Update look. The card in front then becomes the cover. Discard drops them, and a photo uploaded but never accepted is deleted. |
| D21 | **Adjust model image changes the picture, never the pieces** (reverses the Q7 answer). The adjust disc opens only the AdjustSheet ("e.g. sleeves rolled up…"), over the look. Send redraws Robes' picture at once with her note and nothing else; the adjusted picture is applied as it lands, and Discard (a separate flow) does not undo it (Annie, 6 Nov). The note stays with the look, so every later redraw keeps it. Her photographs are never altered; the redrawn picture leads only if Robes' picture was the cover or hidden (D19). |
| D22 | **Home has no prompt box (3a).** Describe opens the Draft Look drawer for the selected day, at rest (no keyboard): her model, Pieces · Details, the add slot, the prompt card with the day's chip, Generate. Nothing is created until Generate or a first piece; closing an untouched drawer leaves nothing. Describe stays hidden on past days. |
| D23 | **A pinned look becomes worn when its day passes.** Once a day ends in her timezone, every saved look pinned to it is filed as a wear (pieces as they stood), by a daily job. Her override is the × on that day's card (removes wear and pin) or the × on a date in WornView; an override is final. Applies to days that pass after this ships; pins already in the past are left as they are. |

### Review PRs (each web + native) — shipped together as #85, merged 2026-11-06

| PR | Scope |
|---|---|
| 9 | **3e in place (D17, D18).** The saved look's body becomes one component that edits in place: PieceList in edit mode, the prompt card, the Update look pill, the Discard dialog on leave, the AdjustSheet from the adjust disc (sheet only). Home's Edit opens it as the Edit Look drawer (× · EDIT LOOK · ✓, Update look footer). The draft drawer drops its `edit` mode. |
| 10 | **Image mode (D19, D20).** ImageManager holds its changes until Update look; opens on Add a photo from Home's stack (`?images=add`); a new photo lands in focus; the front card is the cover; Robes' picture can be hidden (`looks.robes_hidden`; a redraw brings it back as the cover, otherwise her chosen cover stays); the last card has no ×; un-accepted uploads are deleted (`DELETE /uploads/:id` and the hourly `stale-uploads` sweep). Home's look gains the stack. Fixes the photo that never showed until saved (the upload wrote only the `looks.get` cache). |
| 11 | **Adjust model image (D21).** A look-level picture note (`looks.picture_note`) the render and frame jobs read; the AdjustSheet's Send writes it and redraws without `looks.ask`. |
| 12 | **Describe on Home (D22).** The prompt box leaves Home; Describe opens a new draft drawer for the day with no look row until Generate or a first piece. |
| 13 | **Past pins worn (D23).** The hourly `pins-worn` task files wears for saved looks pinned to a day that has ended in the user's timezone, from 9 Nov, skipping overridden days and a trip's looks. |

Smaller calls from the same pass (Annie, 6 Nov): WornView's "+ Add a date" opens `DiarySheet` and a wear's note is written once when filed; the wardrobe piece keeps one photo, replaced through the regenerate icon; "Wear it for" on a piece reads its `wear_for` tags (no tag limit — the ten is the Hero Rack's, which the star keeps); NotificationsSheet's Done only closes; Home's pager already swipes through a day's looks (3k), so no 3f.

## Open calls

Calls made while building, each worth Annie's eye; a ruling becomes a decision above or a one-line fix.

**PR 6 (#83, the saved look)**
- ~~The name stays on the screen between the photo and the tabs.~~ Ruled: the name is the Caption (D16), landed in PR 7.
- ~~Edit look is a `chip` above the piece list.~~ Ruled: 3e edits in place, no Edit chip (D17).
- TagsView's swipe-to-delete is left out: deleting a tag removes it from every piece and look that wears it, which needs its own confirm. Toggle and add are in.

**PR 7 (the draft drawer)**
- ~~The drawer takes a saved look too~~ Ruled: a saved look edits in place (D17) and Home's Edit opens 3e as a drawer (D18). Was: Edit look and the adjust disc on 3e open it in `edit` mode (Felix's "Edit look" title, "Describe other changes…", Regenerate), and the saved look's in-place Editing from PR 6 goes. Delete stays in that edit mode as the danger reveal (D9). Felix's "Save your changes" choice (Update · Save as new) waits: Save as new needs the variants route on a drawn rack, so Done updates in place.
- The three sheets share the one thread: the prompt card's chip (Felix's Generate, in Robes' words *Style it* — Robes never generates) and AdjustSheet's Send both go through the look prompt and then draw; DescribeSheet is the door behind "Dress it again" and re-writes the look from her sentence (`looks.restyle`), so it shows only on a look Robes made. With nothing typed and the picture behind, the chip reads *Update the model · N*.
- Felix's WardrobePicker is the draft's `PiecePicker`: home's wardrobe flyout (3k) and it draw the one `WardrobeGrid`; the picker is a subview with Add N pieces · Swap it in, the flyout a sheet with Include.
- Closing a draft asks Discard · Keep editing, and a quiet third way, *Keep for later*, which Felix does not draw: without it a draft Robes made for a day could not be left for the Lookbook's In progress row.
- The draft's name is its Caption too (D16): a draft keeps the name Robes offered until she writes one in Details, and Save keeps it.
- The context chip (place · weather · range) is read from the day a draft is for, and is passive; "Leave the weather out" and the add-location chip wait for a place picker in the drawer.
- "Start from a photo" stays as a quiet link under the add slot on a new, empty draft (not on Felix's frame; the Lookbook has no other door to the photo flow).


**Review PRs 9–13 (built 6 Nov evening on `felix/review-fixes`)**
- ~~Discard after Adjust model image.~~ Ruled (Annie, 6 Nov): Discard is a separate flow and does not undo an adjusted picture; it is applied as it lands.
- ~~Any redraw that lands leads the look.~~ Ruled (Annie, 6 Nov): keep her cover as chosen; only a hidden Robes' picture comes back as the cover.
- ~~Home's hanger and the balance question.~~ Ruled (Annie, 6 Nov): Describe is as designed (3a), the Draft look drawer with its add slot; no "build around a piece".
- ~~Trip pins filed as worn.~~ Ruled (Annie, 6 Nov): a trip's looks are never filed (trips are hidden). The rule starts Monday 9 Nov (`PASSED_PINS_FROM`) regardless of the ship date.
- A saved look whose picture is stale on the server opens with Update look showing (stale counts as pending).
- Un-accepted look photos: `DELETE /uploads/:id` hides one at once and the hourly sweep removes its files (the API has no S3 delete) — fine (Annie, 6 Nov).

## Redline of 7 Nov (staging + iOS against 3a, 3k, 3e)

Fixed on `felix/redline-fixes` (web + native; pieces and the greeting are parked):
- **Week strip:** today keeps the warm fill wherever the selection goes; the day picked takes only the warm edge; past days recede to `warm-past` (weekday and date).
- **Home (native):** the scroll pads 120 under the content, so the discs' labels, the caption and the pager clear the tab bar. Web already pads 128 in the shell.
- **Adjust model image on the saved look:** the floating sheet sits over the Schedule look bar (web: a fixed layer above it; native: drawn after it).
- **Delete this look:** an ink-soft link on a hairline underline; the confirm's Delete is a new `danger` Button variant (the primary's pill in `danger`, white label, counted as the screen's one fill) with a quiet Cancel.
- **Sheet close:** every Sheet's × is Felix's 36 `cream-200` disc (`CloseDisc`, 44 hit area) on both platforms; the web Drawer uses the same component.
- **Add a photo (native):** the chooser is the 3k sheet: eyebrow, question, the icon rows, the close disc.
- **Put in the diary:** the web calendar drops `lining-nums` for Cormorant's own figures; the native sheet no longer adds padding of its own under the last row (it pushed "I wore this today" past the sheet's height).

Open from the redline:
- **Native dock's 24 × 2 active bar** is not built: the tab bar is the system's own (`expo-router/native-tabs`, D4) and is never hand-drawn. iOS draws its own selection; the bar would mean a custom tab bar again.
- **Year round** shows no glyph in the Seasons row: the icon set has the four seasons only.
