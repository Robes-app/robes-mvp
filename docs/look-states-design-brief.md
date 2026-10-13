# Look states: design brief for mocks

2026-10-06 · for Claude Design · companion to `docs/look-states-brief.md` (published copy: https://claude.ai/artifact/MJoJEPHv79CnWpBjPusTZJ)

One entity, the look, in three states: **suggested** (Robes' offer, untouched), **draft** (hers, in progress), **saved** (kept). A key piece is not a state; it is the thing three suggestions were made around. The mocks should make those three states readable at tile size without a label, and make the Lookbook's two tabs feel like one room with a light on.

## 1 · Context

Robes is a wardrobe-first styling app. A user photographs her pieces, Robes composes looks from them, and she keeps the ones she will wear. Today the Lookbook mixes three things that look alike but behave differently: a **saved look** (hers, gathers wears), a **draft** (one unsaved look in progress, parked on the device) and a **key piece** (one of her pieces with three looks Robes proposed around it, stored as a separate kind of entry). User testing and a founder review with Felix found that the grid cannot tell them apart, that "Build this look" reads as a second job rather than a save, and that three looks made around one piece lose their link to it the moment one is saved.

The product recommendation is settled and written up in the companion doc (Look States Brief). This brief asks Claude Design for the **mocks** that make it real: the tile in its three registers, the Lookbook's two tabs, the look page in each state, and the piece page's rail. Design inside the live Robes system, not a new one. Where the brief leaves a choice open it says so and asks for both.

What success looks like: a tester glances at the grid and knows which looks are hers, which are still being worked on and which are Robes' offers, without reading a word, and finds the one action each state wants.

## 2 · The model

One entity, the look. Its state is set by who made the last move.

| State | Who made the last move | What it is | What it can do |
| --- | --- | --- | --- |
| **Suggested** | Robes, and she has not touched it | An offer. Made around one of her pieces (three at a time) or for a prompt | Save to lookbook · Edit (becomes a draft) · Not for you (dismiss) |
| **Draft** | Her, and she has not saved | A look in progress. Several can exist; they survive a reload and a change of device | Save · Discard · keep editing |
| **Saved** | Her, kept | The only state that gathers wears, tags, diary pins and trips | Edit look · Wear · Pin · Delete |

Transitions: suggested → draft on the first edit; suggested → saved on Save; draft → saved on Save; discard removes a draft or a suggestion. A saved look never goes backwards; editing it opens the existing editing frame (design 4d/5b), not a draft.

A **key piece** is a grouping, not a state: the piece Robes was asked to dress plus the three suggested looks it produced. The three stay side by side because they share the piece, and they stay linked to it after one is saved (the saved look still says "around your rust dress"). The piece tile itself never pretends to be a look.

Two things to hold onto while drawing: the three states must be legible at tile size with **no label**, the eyebrow being a confirmation rather than the signal; and each state has exactly **one** commitment action, which is the only ink fill on its screen.

## 3 · Design in the Robes system

Use the live tokens and registers. Nothing here is new; the mocks should sit beside the existing screens without a seam.

**Tokens.** Cream page (`--cream`, `--cream-100` wells, `--cream-400` dashed strokes), ink text (`--ink`, `--ink-soft`, `--ink-faint`), rose for eyebrows and the small warm accent (`--rose`), sage for Robes' voice and the suggested state (`--sage`, `--sage-bg`), mauve for trips only. Hairlines are 1px `--rule`, firmer `--rule-mid`. Radius 12px (`--rad`) on cards, 100px on pills. Type is Cormorant Garamond for titles and italic asides, Inter for everything else.

**Registers.**

- Eyebrow: 9px Inter, .18em tracking, caps, `--ink-faint` (or rose/sage when it carries meaning).
- Tile title: 17px serif on the phone, 22px on the web, one line with an ellipsis; tile meta 11px Inter `--ink-soft`.
- Pill: `.rb-pill`, 11px sentence case, hairline on white; the one commitment pill is an ink fill with white text.
- Selected state is warm, never black: `#F3EFE6` fill on a `#C9BCA6` stroke.
- Dashed means unfinished or an invitation (the draft tile, the add card, the empty slot). Solid hairline means a thing that exists.

**Rules that are not negotiable.**

1. One ink fill per screen, on the commitment (Save). Everything else is a hairline pill or a text link.
2. No chevrons on grid cards; the whole card is the tap. Chevrons live on list rows only.
3. No new colours, no new type sizes, no shadows heavier than the whisper the cards already carry.
4. The phone is a pushed view: a look page carries a single back pill in the nav band, no pager, and the dock is hidden while a look is open.
5. Months print as three letters (13 Aug), never Sept.

**Breakpoints.** Phone at 390px and web at 1280px, both for every frame. Phone grid is two columns, 12px gap, 3:4 image; web grid is three columns, 20px gap. Nav is 64px; the phone dock reads Home · Lookbook · Diary · Wardrobe.

**Files to reuse rather than redraw** (already in Annie's Claude Design project): `Lookbook_Mixed_Grid.dc.html` (the grid and its Refine drawer), `Look_Creation_Handoff.dc.html` §4–6 (the draft page, the saved look, the rack rows), `Look_Screen_Redline.dc.html` (the look page at 390), `Wardrobe_List.dc.html` (the piece card register the piece tile borrows), `Worn_Three_Ways_-_Native.dc.html` (the three-card pager the set view reuses), `Navigation_Architecture.dc.html` (bands, pills, the return band). The Diary's List | Month segmented control is the one to copy for Saved | Suggested.

## 4 · The frames to mock

Every frame at **390** and **1280** unless marked. Number them as below so the review can point at one.

| # | Frame | Must show |
| --- | --- | --- |
| F1 | Tile component sheet (web only) | The one tile anatomy in its three registers side by side, plus the edge states in §5 |
| F2 | Lookbook · Saved tab | Header with the Saved \| Suggested control, the In progress row (two drafts) leading, then the saved grid (six looks incl. one photo-only and one with no frame yet). Count line reads "42 looks · 2 in progress" |
| F3 | Lookbook · Saved tab, nothing in progress | Same page, no drafts row, no gap where it was |
| F4 | Lookbook · Suggested tab | Two set rows (a piece tile + its three suggestions, "See all"), the "Around: All pieces" picker, count line "12 suggested · around 4 pieces". No + and no Filter on this tab |
| F5 | Lookbook · Suggested tab, one set open | The set view: the piece's photograph and name at the top, three suggested tiles beneath. Phone: a scroll-snap pager with dots (reuse Worn Three Ways). Web: three side by side |
| F6 | Lookbook · Suggested tab, empty | The empty state: one line and the door "Robes suggests three" (opens the wardrobe sheet) |
| F7 | Lookbook · Saved tab, empty | Already exists (the composer). Confirm only; no new frame unless the header changes it |
| F8 | Look page · Suggested | Eyebrow "Suggested · around your rust dress", the look on her model, the rack rows read-only, the bar: Save to lookbook (ink) · Edit, the quiet "Not for you" under the rack |
| F9 | Look page · Draft | The existing draft page (design 4d) with the Save · Discard bar; show it once at 390 to confirm nothing changes. Add the "Started from Robes' suggestion" eyebrow variant when the draft came from a suggestion |
| F10 | Look page · Saved | Already exists (5a). Confirm only. Where the look came from a suggestion, the meta line gains "around your rust dress" |
| F11 | Piece page · "Robes suggested" rail | On the wardrobe piece page: a rail of the suggested looks made around this piece (same suggested tile), its heading, and the hairline door "Robes suggests three" when none exist yet |
| F12 | The Filter drawer and the sort menu on the Saved tab | The Refine drawer relabelled Filter, opened from the funnel icon with a count badge; the sort as a small menu off the ↕ icon (Last worn · Newest · Name) |
| F13 | Transitions (web only, one sheet) | Suggested tile → tapped → F8; Edit on F8 → F9; Save on F8 → the tile moving from the Suggested tab to the Saved tab with its "around" meta. Arrows and captions, not animation |

Frames F2, F4, F5 and F8 are the ones that decide the review; put the effort there.

## 5 · The tile: one anatomy, three registers

One component. The same slots in the same places; only the frame, the eyebrow and the meta line change. Image 3:4 (the model render, else her photograph, else the pieces' mosaic), then a pad holding eyebrow · title · meta. Hover on the web reveals the ✕ (saved and draft) exactly as today.

|  | Saved | Draft | Suggested |
| --- | --- | --- | --- |
| Frame | 1px `--rule`, white card | 1.5px **dashed** `--rule-mid` on a `--cream-100` well | 1px `--rule`, white card |
| Eyebrow | none | "Draft" in the eyebrow register | "Suggested" in `--sage` |
| Title | her name, or the date it was saved | her name, or "Untitled" in italic | Robes' name for it |
| Meta | "3 wears · 4 pieces · last 13 Aug" ("Not yet worn · 4 pieces") | "Not saved · started Tuesday" | "Around your rust dress" |
| Mark | none | none | the anchor piece's flat photograph, 36×44, bottom-left of the image, 1px white keyline, 6px radius |
| Tap | the saved look (5a) | the draft page (4d) | the suggested look page (F8) |

Notes for the designer.

- The dashed stroke is the draft's whole signal. It is the convention the add card and the empty slot already use for "not finished", so it costs nothing to learn. Do not add a badge, a ribbon or a tint.
- The suggested tile's mark is what says "this came from a piece" at a glance. It must read at 36×44 over a busy render: test it over a dark coat and a cream dress. If it does not read, propose a 44×56 and say so.
- A saved look that came from a suggestion keeps the "around your rust dress" meta after the wears line, but loses the mark. Saved is saved.
- The piece tile (F4, F5) is NOT this component. It is the wardrobe card: the product photograph on cream, no model, the piece's name, "Bottoms · Zara" eyebrow. Borrow it from `Wardrobe_List.dc.html` as is.

Edge states to include on F1: a saved look with no frame yet (the mosaic of pieces, the "Creating her frame…" chip); a photo-only saved look (her photograph, meta "Photograph · not yet filed"); a long name on the phone (one line, ellipsis); a suggested tile whose anchor piece has no photograph (the mark becomes the serif monogram of the piece's initial on cream); a draft with a model render and one without.

## 6 · The Lookbook header and tabs

The page loses its "Lookbook" title (the nav already says it) and gains one control row.

**The row, left to right.** The **Saved | Suggested** segmented control (copy the Diary's List | Month: a cream well, the active segment lifted to white, 24px tall buttons, no ink). Then, right-aligned: the sort as a ↕ icon that opens a small menu (Saved tab only), the Filter as a funnel icon with a 5px rose dot when a filter is on (Saved tab only), and the `+` as a 30px hairline circle (`.rb-circ`, Saved tab only; it opens the composer). On the Suggested tab the right side holds one thing: the **Around** picker, a hairline pill reading "Around: All pieces ▾" that opens a sheet of the pieces that have suggestions (the wardrobe sheet's register, with counts).

**The count line** sits under the control row in the eyebrow register: "42 looks · 2 in progress" on Saved (the "in progress" clause only when drafts exist), "12 suggested · around 4 pieces" on Suggested. It is the one place the numbers print.

**Saved tab.** If any drafts exist, the **In progress** row leads the grid: a small eyebrow "In progress", then the draft tiles in a horizontal rail on the phone (one and a half visible, so the scroll is obvious) and a single row on the web, with a hairline under it. Filters never touch this row. Below it the saved grid, newest first by default, with the "+ New look" add card closing it as today.

**Suggested tab.** Set rows, newest first. A set row is: the piece tile (the wardrobe card, 3:4, product photo on cream) leading, then the three suggested tiles, then "See all" as a text link at the row's right end on the web and a trailing half-tile on the phone. A set whose three have all been saved or dismissed leaves the tab. Tapping the piece tile opens the set view (F5); tapping a suggested tile opens that look (F8).

**The set view (F5).** A pushed view on the phone, the page itself on the web: the return band reads "‹ Suggested"; the title block is the piece (photograph 52×64 beside its name and "Bottoms · Zara"), then the three suggested tiles, a pager with dots on the phone (reuse the Worn Three Ways cards), three up on the web. One hairline pill under the three: "Robes suggests three more" (re-runs the suggestion for this piece). No Build button anywhere.

**Empty Suggested tab (F6).** One serif line, "Nothing suggested yet.", one Inter line, "Pick a piece and Robes dresses it three ways.", and the hairline door "Robes suggests three" which opens the wardrobe sheet (the picker from `Lookbook_Mixed_Grid`).

## 7 · The look page per state

One page, the one in `Look_Creation_Handoff` §5 and `Look_Screen_Redline`. The state changes the eyebrow, the bar and one quiet line. Nothing else moves.

|  | Suggested (F8) | Draft (F9) | Saved (F10) |
| --- | --- | --- | --- |
| Return band | ‹ Suggested (or ‹ the piece's name when opened from the piece page) | ‹ Lookbook | ‹ Lookbook (or the door it came through) |
| Eyebrow | "Suggested · around your rust dress" (sage) | "Draft look" (centred, as 4d) · variant "Draft · from Robes' suggestion" | "Saved look" |
| Title | Robes' name, plain text (not an input) | the name input (4d) | the name, pencil on tap in Editing |
| Canvas | the look on her model | as 4d | as 5a |
| Rack | the card rows, read-only (no ↻, no ♥, the › opens the piece); the anchor piece's row leads and carries a small "Your piece" word in its eyebrow | the editable rows (4d) | the reading rows (5a) |
| Bar | **Save to lookbook** (ink) · Edit (hairline) | Discard · **Save** (4d) | Edit look (hairline, pinned bar 5a) |
| Quiet line | "Not for you" as a text link under the rack; it removes the suggestion with a one-line undo toast | — | Delete this look at the foot |
| After Save | the saved look page (5a) with a toast "Saved to your lookbook" | as today | — |
| After Edit | the draft page (F9) with the rows live, the eyebrow reading "Draft · from Robes' suggestion" | — | Editing (5b) |

The bar follows the phone rules already built: fixed at the foot, padded for the home indicator, the dock hidden while the look is open, the sparkle 16px above it. Do not add a third button to any bar.

The old flow (Build this look → the composer in situ → Save) is retired. Edit is the only way into a draft from a suggestion, and Save is one tap from the suggestion itself.

## 8 · The piece page

The wardrobe piece page (the record, `Robes_Piece_IA`) already carries an "In N looks" rail of the saved looks a piece is in. It gains a second rail and loses a button.

- **"Robes suggested" rail** (F11): under "In N looks", the suggested tiles made around this piece, in the same tile register with the sage eyebrow but **without the anchor mark** (the piece is the page; the mark would repeat it). Tapping one opens F8 with the return band reading ‹ the piece's name. When the three have all been saved the rail disappears and the saved ones appear in "In N looks" as normal.
- **The door.** When no suggestions exist, the rail's place holds one hairline pill, "Robes suggests three", which runs the suggestion with no further ask. While it runs, three dashed 3:4 placeholders breathe in the rail (the composer's breathing block), each reading "Composing…" in the eyebrow register.
- **Gone.** The full-width ink "Style it three ways" at the foot and the "Style this piece ▾" menu. The piece page keeps its one ink for nothing; the record is the page. "Start a look with it" survives as a hairline pill beside the door (it opens the composer with the piece on the rack).

The prompt box's piece card (the + inside the field) keeps its two modes but their words change: **Start a look with it** · **Robes suggests three**. Show the card once at 390 with the new words; the anatomy is unchanged.

## 9 · Copy

Use these words as written. Robes speaks plainly, in sentence case, never "AI", never "generate", never "unlock". A label names what a thing is; a button names what happens.

| Where | Use | Retire |
| --- | --- | --- |
| Tab names | Saved · Suggested | All looks · Key pieces · Looks · Inspiration |
| Tile eyebrows | Draft · Suggested (saved has none) | Look · Key piece |
| Suggested meta | Around your rust dress | Styled three ways |
| Draft meta | Not saved · started Tuesday | Draft · not saved |
| Saved meta | 3 wears · 4 pieces · last 13 Aug · Not yet worn | — |
| Count line | 42 looks · 2 in progress · 12 suggested · around 4 pieces | N looks · N key pieces |
| Drafts row | In progress | Drafts |
| The commitment | Save to lookbook (from a suggestion) · Save (from a draft) | Build this look · Save this look |
| Into a draft | Edit | Build this look · Build a look |
| Dismiss | Not for you | Remove · Delete (on a suggestion) |
| Ask for three | Robes suggests three · Robes suggests three more | Style it three ways · Style a key piece · Style my … three ways |
| Start from a piece | Start a look with it | Build a look · Build it from this piece |
| The filter | Filter | Refine (on the Lookbook) |
| Sort options | Last worn · Newest · Name | Last worn ↓ / First worn ↑ |
| Look page eyebrows | Suggested · around your rust dress · Draft look · Draft · from Robes' suggestion · Saved look | Key piece · yours |
| Toasts | Saved to your lookbook · Put away · Undo | Filed under X |
| Empty Suggested | Nothing suggested yet. / Pick a piece and Robes dresses it three ways. | — |
| Set view door | Robes suggests three more | Try another |

The piece's name in "around your rust dress" is her own label for the piece, lowercased with an article, exactly as the rack's "was the camel wool shacket" line already does. A piece with no label prints its category: "around your dress".

## 10 · What not to design

- **The data model.** Statuses, migrations and backfills are in the companion brief and belong to the build. The mocks only need the three states to exist.
- **Home.** The home page's rows (Saved looks, Key pieces) are a separate decision and stay as they are for these mocks. Do not redraw home.
- **The composer or the editing frame.** Design 4d and 5b stand. F9 and F10 are confirmations, not redesigns.
- **The generation moment.** How three suggestions compose (the Worn Three Ways reveal, the loading states) is already built; the only new loading state is the three breathing placeholders in the piece page rail.
- **Onboarding.** The first piece's "Style it three ways" lands in the Suggested tab under this model, but the onboarding screens themselves do not change.
- **A new colour, type size, icon set or shadow.** Use what is in the system; if something seems missing, say so in the hand-back rather than inventing it.
- **Animation.** F13 is arrows and captions. Motion follows the existing transitions.

## 11 · Open decisions

These are Annie's calls. Where a choice changes a mock, draw both and label them A and B.

1. **Where drafts live.** A: the In progress row at the top of the Saved tab (this brief's default). B: a third segment, Saved | Drafts | Suggested, which keeps the Saved tab pure but adds a tab for a thing that is usually empty. Draw F2 both ways.
2. **The anchor mark.** A: the piece's photograph at 36×44 bottom-left (default). B: a sage dot and the piece's name only in the meta, no mark. Draw on F1.
3. **"Not for you" placement.** A: a quiet text link under the rack on F8 (default). B: a ✕ on the suggested tile's hover, like the saved tile's. Draw F8 and a tile hover on F1.
4. **The set row on the phone.** A: the piece tile leads and the three suggestions scroll past it (default). B: a stacked card, the piece's photograph as a header strip and the three tiles beneath, two up. Draw F4 at 390 both ways.
5. **Suggestions made without asking.** Not in these mocks. If Robes ever composes three around a newly filed piece on its own, the Suggested tab is where they land, so F4 and F6 cover it.

Not open: the three states, the one-ink rule, the dashed draft, Saved | Suggested as the two tabs, Edit replacing Build this look.

## 12 · Hand-back checklist

Return one `.dc.html` with the frames numbered F1–F13 at 390 and 1280, plus a short redline page. Before handing back, check:

- [ ] One tile component with three registers; no second tile drawn for suggestions or drafts.
- [ ] The three states are tellable at tile size with the eyebrows covered.
- [ ] Every screen has exactly one ink fill, and it is the Save.
- [ ] No chevrons on grid cards; no new colours, sizes, icons or shadows.
- [ ] The segmented control, pills, circles, eyebrows and hairlines match the live app's measurements (the files in §3).
- [ ] The anchor mark reads over a dark render and a cream one.
- [ ] The phone look pages carry only the back pill in the nav band, no pager, no dock.
- [ ] Both breakpoints for every frame; both options for every open decision in §11.
- [ ] Every word on the frames comes from the copy table in §9, or is called out as new.
- [ ] A redline page listing anything that had to deviate from the system and why.

Questions go to Annie, and the companion Look States Brief carries the reasoning behind every rule here.
