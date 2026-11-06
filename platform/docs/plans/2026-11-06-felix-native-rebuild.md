# The Felix rebuild: web and native on the Felix Design System

Status: decisions recorded 2026-11-06 (Annie). PR 1 open (#78). This is a sequence of PRs, not one pass.

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
| 2 | Primitives: the type scale (Text, Heading, Eyebrow, Label, Category, Meta; Cormorant floor 15 for piece names); Button `outline` and `chip`, Felix label (10/500/0.22em), padding 0 28; Tabs (new); Avatar `sage-mid` disc; 0.5px `rule-mid` edges on Card, Pill and lists; Sheet floating inset 8 with border, `cream-400` handle, Felix motion, `rows`; AlertDialog (native new, web from Dialog); Icon `stroke` prop; focus ring 1.5px. Update the docs and code comments D6 supersedes. | next |
| 3 | TopNav (TabScreen, Bell, app-shell): 64 tall, glass, hairline, rose dot, avatar disc. Dock labels 9.5/500/0.04em; web active bar; the unread dot as the native tab badge. | |
| 4 | Home 3a/3k: WeekStrip deltas (current cell gets fill and edge, date 400, planned ring), content-width photo with pager dots, ActionDisc, ModelStack + ModelPicker, the caption under the discs. Pick opens `LookPicker` and Capture its capture flow (the one-drawer rules in platform/CLAUDE.md hold). | |
| 5 | Look images (data): any number of images per look. Migration, repository with cross-user test, routes, `docs/data-inventory.md`, `docs/api-security.md` checklist. Old builds keep reading the two images they know. | |
| 6 | Saved look 3e: SavedLook (edge-to-edge photo, back, adjust, image stack), Tabs, PieceList, LookDetails, TagsView, SeasonsView, WornView, ImageManager, the `primary` Schedule look (opens `DiarySheet`). | after 5 |
| 7 | The draft: DraftLook's anatomy on `DraftPage`, AdjustSheet, DescribeSheet, WardrobePicker (one draft page, one thread, the picture drawn only when she asks). | |
| 8 | Wardrobe piece, NotificationsSheet, SettingsView. | |

## Open questions

1. Where Delete lives on a saved look once the red Delete text goes (Felix keeps `danger` to a destructive reveal). Proposed: in the look's edit mode.
2. Where the `Robes model` tag (5 Nov) goes: Felix has no tag on a saved look. Proposed: the model is chosen through ModelStack → ModelPicker; the adjust disc opens AdjustSheet.
3. The worn mark on the week strip: Felix's CSS draws `ink-soft`, its README says `warm-past`. Proposed: `warm-past`.
