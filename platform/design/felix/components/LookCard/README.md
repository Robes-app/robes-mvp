# LookCard
A Lookbook grid tile. Lay them out two across with a 12px row gap and a 10px column gap.

Provide:
- `image`, `name` and `occasion`.
- `worn`: shows a 12px calendar glyph with the count, then " · ".
- `isNew`: prefixes "New · " for an unworn suggestion.
- `wishlist` / `shop`: small trailing glyphs marking that the look uses wishlist or shop pieces.
- `onOpen`: tapping the card opens the look's `SavedLook` detail.
- For Suggested looks, pass `suggested`, `saved` and `onSave`. This adds a white outline bookmark on the photo's bottom-right corner; it fills when saved.

**Anatomy**
- White card, `rad-row`, `shadow-card`, with 6px padding (10px at the bottom).
- 4:5 photo with `rad-xs` corners.
- Name: Cormorant 400, 15px, ellipsised.
- Meta: Inter 11px in `ink-faint`.
