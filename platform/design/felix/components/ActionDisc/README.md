# ActionDisc
A 56px round `cream-200` button with an uppercase label beneath — the way into a look (Capture · Create · Pick) or onto it (Swap · Edit). The `primary` variant is the home screen's ink Create disc.

Provide `icon` (an Icon name), `label` (one word), and `onClick`. Wrap a set in `.fx-discs` for the 28px gap (the home screen row).

- Two or three in a row, centered, overlapping the bottom edge of the look photo by half their height.
- `shadow-disc` lifts them off the image; icons are `ink-soft` at 19px.
- One-word labels, uppercase via the component — write them in sentence case in code.
- Not for primary commits; use Button `primary` for those.

## Primary — the Create disc
Pass `primary` (icon defaults to `describe`, the sparkle) for the home screen's Create action: Capture · Create · Pick.

- 66px `ink` face, `cream` glyph at 23px with a 1.4 stroke, `shadow-disc-primary`. The slot is 80px wide and sits 10px higher than its neighbours, so the row reads with Create raised in the middle.
- Label in `ink` at weight 600 (Inter SemiBold) rather than `ink-soft` 500; same 9px tracked uppercase.
- One per row, always centred between two cream discs. It counts as the screen's one ink action — don't pair it with an ink pill in view.
- It doesn't darken on hover (it's already ink); focus gets the usual 1.5px `ink` ring with a 2px offset.
