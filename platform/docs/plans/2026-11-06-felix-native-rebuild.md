# The Felix rebuild: web and native on the Felix Design System

Status: decisions recorded 2026-11-06 (Annie); D12–D15 added later that day from the plan doc *Felix rebuild — PRs 5 to 8 and beyond*. PRs 1–6 merged (#78–#83). PR 7 in progress on `felix/draft-drawer`. The sequence stops after PR 8 (D15). Calls made while building that Annie has not ruled on are under **Open calls** at the foot.

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
| 7 | The draft: DraftLook's anatomy on `DraftPage`, presented as a drawer over whatever started it (D14); AdjustSheet and DescribeSheet are two doors into the one thread, drawing only on Send or Generate; WardrobePicker; `AlertDialog` for Discard and the drafts-full prompt; no Worn row on a draft. | `felix/draft-drawer` |
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
| D15 | The sequence stops after PR 8. The Lookbook grid, the Diary, the Wardrobe grid and inbox, You's pages, onboarding and sign-in keep Felix's tokens and primitives with their old layouts until the next design round. Dark mode is ignored for now (no dark theme in Felix). Only Expo Go on staging runs native, so the compatibility window for old columns is the deploy's few minutes, not weeks. |

Smaller calls from the same pass (Annie, 6 Nov): WornView's "+ Add a date" opens `DiarySheet` and a wear's note is written once when filed; the wardrobe piece keeps one photo, replaced through the regenerate icon; "Wear it for" on a piece reads its `wear_for` tags (no tag limit — the ten is the Hero Rack's, which the star keeps); NotificationsSheet's Done only closes; Home's pager already swipes through a day's looks (3k), so no 3f.

## Open calls

Calls made while building, each worth Annie's eye; a ruling becomes a decision above or a one-line fix.

**PR 6 (#83, the saved look)**
- The name stays on the screen (Cormorant, with the pencil) between the photo and the tabs. Frame 3e shows no name, but a look is named and the Lookbook shows it. Say if it should move into Details.
- Edit look is a `chip` above the piece list; Felix draws no explicit edit control on 3e.
- TagsView's swipe-to-delete is left out: deleting a tag removes it from every piece and look that wears it, which needs its own confirm. Toggle and add are in.

**PR 7 (the draft drawer)**
- The drawer takes a saved look too (D14's "a saved look's Edit"): Edit look and the adjust disc on 3e open it in `edit` mode (Felix's "Edit look" title, "Describe other changes…", Regenerate), and the saved look's in-place Editing from PR 6 goes. Delete stays in that edit mode as the danger reveal (D9). Felix's "Save your changes" choice (Update · Save as new) waits: Save as new needs the variants route on a drawn rack, so Done updates in place.
- The three sheets share the one thread: the prompt card's chip (Felix's Generate, in Robes' words *Style it* — Robes never generates) and AdjustSheet's Send both go through the look prompt and then draw; DescribeSheet is the door behind "Dress it again" and re-writes the look from her sentence (`looks.restyle`), so it shows only on a look Robes made. With nothing typed and the picture behind, the chip reads *Update the model · N*.
- Felix's WardrobePicker is the draft's `PiecePicker`: home's wardrobe flyout (3k) and it draw the one `WardrobeGrid`; the picker is a subview with Add N pieces · Swap it in, the flyout a sheet with Include.
- Closing a draft asks Discard · Keep editing, and a quiet third way, *Keep for later*, which Felix does not draw: without it a draft Robes made for a day could not be left for the Lookbook's In progress row.
- The context chip (place · weather · range) is read from the day a draft is for, and is passive; "Leave the weather out" and the add-location chip wait for a place picker in the drawer.
- "Start from a photo" stays as a quiet link under the add slot on a new, empty draft (not on Felix's frame; the Lookbook has no other door to the photo flow).

