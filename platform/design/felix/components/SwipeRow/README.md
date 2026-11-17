# SwipeRow
iOS's swipe-to-act on a row, the one row for every list that lets something go: the Wardrobe's pieces and wishes, and the bell's notifications.

Provide `children` (the row), `text` (the small-caps word under it: "Remove", "Dismiss"), `label` (what a reader hears: "Remove Lime green sweatshirt") and `onAct`. `className` rounds the clip to match the row's corners (default 3px).

- Past 44pt the row springs open and rests at 88pt over its action. Past 160pt it acts straight away and springs shut. A tap on an open row closes it.
- The action sits on `rose-deep`, with the word in 10px Inter 500, uppercase, tracked 2pt, on `cream`.
- A horizontal drag only starts after 8pt and only when it is more sideways than up or down, so the list still scrolls.
- VoiceOver gets the same action through the row's actions menu.
- On web, rows keep their own button. There is no swipe.
