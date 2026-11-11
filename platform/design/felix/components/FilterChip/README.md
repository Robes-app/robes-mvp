# FilterChip
A 28px outline pill that narrows a collection. Used in the `CollectionBar` rows on Lookbook and Wardrobe.

Provide `label`, `onClick`, and optionally:
- `count`: shown at 60% opacity after the label.
- `icon`: 13px, leading. Optional.
- `selected`, `disabled`.

**States**
- Rest: transparent with a 1px `warm-line` inset ring and `ink-faint` text.
- Selected: `rose` fill with white text. Only one category chip is selected at a time.
- Empty: a `rule` ring at 45% opacity, not clickable. A category with nothing in it stays visible (e.g. "Evening 0") so the set doesn't jump.

This is not the `Button` chip. That one is a `cream-200` context pill that opens something; this one filters.
- White on `rose` measures 4.9:1.
