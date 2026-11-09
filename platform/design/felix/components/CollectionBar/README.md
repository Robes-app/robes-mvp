# CollectionBar
The header band for the Lookbook and Wardrobe tabs. It sits directly under a `glass` TopNav, and its frosted `band-glass` (blur-band, saturate 180%) runs up behind the nav.

Provide:
- `segments`: `[{key, label, icon}]`.
  - Lookbook: Saved (`bookmark`) · Suggested (`sparkle`).
  - Wardrobe: Owned (`wardrobe`) · Wishlist (`heart`) · Shop (`bag`).
- `value` and `onChange(key)` for the segments.
- `onAdd` + `addLabel`: the 30px `ink` plus disc at the right ("New look", "Add pieces").
- `filters` (`[{label, count}]`), `filter` and `onFilter`: the category `FilterChip` row. It scrolls sideways and bleeds to the screen edge.
- `search` (`{placeholder, value, onChange}`), `view` (`grid` | `list`) and `onView`: a white pill search field plus the cream grid/list toggle. It sits below the chips and tucks away on scroll.
- `sticky`: pins the band to the top of its scroll container.

**Notes**
- Segments are 38px tall, using 9px Inter at 0.22em, uppercase. Rest is `ink-faint`; the active segment is `ink` with a 1.5px `ink` underline.
- The band is padded to bleed 20px past the content gutter, so place it inside the `space-5` page padding.
