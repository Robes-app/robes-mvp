# PieceTile
A Wardrobe grid tile. Lay them out three across with a 16px row gap and a 10px column gap.

Provide `image`, `name`, `worn` (calendar glyph plus count) or `meta` (text, e.g. a shop name), and `onOpen` (opens `WardrobePiece`).

On Wishlist and Shop, pass `onWish` and `wished`. This adds a white heart on the photo's bottom-right corner, filled when wished.

**Anatomy**
- 3:4 photo on `white`, with 3px corners and `shadow-card`. There is no border, so close-cropped product shots sit flush.
- Name: Cormorant 400, 14px, ellipsised.
- Meta: Inter 11px in `ink-faint`.
- No photo (a piece Robes suggested, or hers with none yet): the `wardrobe` (hanger) glyph in `warm-line` on `cream-200`, never a blank or a pulsing tile. A photo still being made keeps the shimmer skeleton. The same rule holds on the Rack's grid and rows, the pickers and the piece page.
