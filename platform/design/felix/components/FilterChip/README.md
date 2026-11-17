# FilterChip
A 28px outline pill that narrows a collection. Used in the `CollectionBar` rows on Lookbook and Wardrobe.

Provide `label`, `onClick`, and optionally:
- `count`: shown at 60% opacity after the label.
- `icon`: 13px, leading. Optional.
- `selected`, `disabled`.

**States**
- Rest: transparent with a 1px `warm-line` inset ring and `ink-faint` text.
- Selected: the pale `cream-200` fill on a 1px `token-line` (umber) ring, `ink` label, no check — the umber edge carries the state. Only one category chip is selected at a time. The Filter sheet's options take the same selected look; at rest they are `white` on the 0.5px `rule-mid` edge.
- Empty: a `rule` ring at 45% opacity, not clickable. A category with nothing in it stays visible (e.g. "Evening 0") so the set doesn't jump.

This is not the `Button` chip. That one is a `cream-200` context pill that opens something; this one filters.
- `ink` on `cream-200` measures 13.5:1; the umber ring 6.4:1 against the fill.
- On iOS every chip tap answers with a selection haptic.
- (Before 15 Nov the selected chip was a solid `rose` fill with white text; that is retired.)
