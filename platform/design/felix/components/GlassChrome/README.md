# GlassChrome
On iOS, the Lookbook, Wardrobe and Diary chrome is one glass pane: the bar, the tabs, the search row and the pinned filter row float over the list, and the list scrolls beneath them.

On a tab screen, pass `glass`. Pin the filter row (or the Diary's "The next 30 days" line) with `TabSticky`. Spread `useTabScroll()` on the list so it starts under the pane. Use `useTabTop()` to place loading, empty and error states below it.

- The pane is **LiquidGlass** with `fallback: 'solid'`. It is Liquid Glass on iOS 26, and solid `cream` with Reduce Transparency on or where there's no glass. Its height is measured, so the list's top padding always matches.
- Order: TopNav title → segments (Saved · Suggested, or Owned · Wishlist · Shop; List · Month on Diary) → the search row → the pinned row.
- The search row is a 40px `white` pill with the grid | list toggle beside it, where the screen has both. It replaces the "36 pieces" count line. The count moves into the list and scrolls with it.
- The pinned row pads 12px on top and 10px below, with `space-5` at the sides.
- Android keeps the bar above the list, unpinned. On web, the twin is **CollectionBar** with `band-glass`.
