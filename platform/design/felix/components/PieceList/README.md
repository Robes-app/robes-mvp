# PieceList
The garments in a look: a `white` list with a 44×55 photo, an uppercase category · brand line and the piece name in Cormorant.

Provide `items` `[{img, category, brand?, name, meta?}]` and `mode`: `view` (default — meta + chevron) or `edit` (swap and remove discs, plus `onAdd` for the dashed + row). Handlers: `onSwap(i)`, `onRemove(i)`, `onAdd`.

- Brand follows the category in `rose`; the name is `piece-name` and truncates with an ellipsis.
- Rows divide with a 0.5px `rule`; the list has a 0.5px `rule-mid` border and `rad` corners.
- Photos are cut-out or close-cropped garment shots on a `cream-200` well — never lifestyle images.
