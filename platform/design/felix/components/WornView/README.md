# WornView
The Worn log, the dates a look was worn, opened from Details › Worn. It uses the same subview shell.

Provide `dates` (`[{date, note}]`, newest first), `onRemove(i)`, `onAdd` and `onBack`. In DraftLook, pass `sheet: 'worn'`, `wornDates`, `onWornRemove`, `onWornAdd` and `onSheetClose`.

- The title counts: "Worn · 5 times", "Worn · 1 time", or just "Worn".
- Each date is its own 54px row, 8px apart, on `cream` with a 0.5px `rule-mid` border and `rad-row` corners. The row has the date (Inter 13px `ink`), the note in Cormorant italic 300 15px `ink-soft` (default "Worn as saved"), and a 17px × to remove it.
- When empty, it shows "Not worn yet" centred in Cormorant italic 17px `ink-soft`.
- Footer: "+ Add a date", a 48px pill with a 1px `ink-line` border and 14px `ink` text.
