# SeasonsView
The Seasons picker, opened from Details › Seasons, in the same subview shell as TagsView.

Provide `value` (`Season[]`), `onChange(next)` and `onBack`. "Year Round" is the empty list. In DraftLook, pass `sheet: 'seasons'`, `onSeasonsChange` and `onSheetClose`.

- Five 48px rows in a `white` `rad` list: Year Round (no icon), then Spring, Summer, Autumn and Winter, each with its 18px season glyph at a 1.4 stroke in `ink`.
- Labels are Cormorant 15px `ink`, and a 15px check shows on each picked row. Seasons multi-select. Picking Year Round clears the others.
- Back writes nothing extra; the Details row updates from `value`. The row shows the season names, or only their glyphs once more than two are picked.

**On iOS** it stands on **DetentSheet**: iOS's own sheet, opening at two thirds of the screen and pulled up to full, under the system grabber, with **SheetHead** on top (16–17 Nov). Elsewhere it keeps the shell above.

- A piece's Seasons uses the same list: Year round first, then the four seasons with their glyphs (17 Nov).
