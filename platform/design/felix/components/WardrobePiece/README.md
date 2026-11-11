# WardrobePiece
The page for one piece, opened from a **PieceTile** on the Wardrobe tab (frame 3b). It has a titled nav, the photo full-bleed, then three tabs: Piece · Colour · Wearing. Each tab is one white card of rows.

**Props**
- `image`, plus `images` and `count` for the stack badge.
- `name`.
- `piece`: `{category, brand, shop, size, price, notes}`.
- `colour`: `{colour: {name, hex}, additional: [], print: {name, swatch}, material: []}`.
- `wearing`: `{worn: '5 times · last 27 Oct', looks: 3, seasons: [], occasions: []}`.
- `tab` (`Piece` | `Colour` | `Wearing`) and `onTab`.
- `shop`: true for a Shop or Wishlist piece that she doesn't own yet.
- Handlers: `onBack`, `onAdjust`, `onImages`, `onField(label)` (every row), `onDelete`, `onAddToWardrobe`.

**Nav.** A **TopNav** with the back chevron and the piece name as its centred serif title. There is no avatar.

**Photo.** 3:4, edge to edge, cropped to cover, on `shadow-card`. The **SavedLook** controls sit on it: the sparkle disc bottom-left (adjust piece image) and the image stack with its `ink` badge bottom-right.

**Tabs.** **Tabs** with Piece · Colour · Wearing, 6px below the photo.

**Rows.** One white card (`rad`, 0.5px `rule-mid`). Rows are 48px tall and split by `rule` hairlines.
- The label is 9px tracked uppercase in `ink-faint`.
- The value is 13px Inter in `ink-faint`, right-aligned.
- Text fields (Name, Price, Notes) end in a pencil and edit in place; pickers end in a chevron.
- An empty value reads "Add" at weight 500.

**What each tab holds**
- **Piece:** Name, Category, Brand (Shop for a shop piece), Size, Price, Notes. Notes show below their label in Cormorant italic 300, 16px.
- **Colour:**
  - Colour: a 16px round swatch plus the name.
  - Additional colours.
  - Print: a 16px square swatch plus the name.
  - Material.
- **Wearing:** Worn ("5 times · last 27 Oct", or "New" at 60%), In looks (a count, or "None"), Seasons (glyphs, or "Year Round"), Wear it for.

**Footer**
- An owned piece ends with an outline "Delete piece" pill (44px, white, `ink-faint` label).
- A shop piece has no delete. Instead, its one `ink` commit "Add to wardrobe" sits in a footer over a `rule`.
