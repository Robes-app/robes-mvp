# WardrobePicker
The wardrobe picker, a full-height subview opened from the add-pieces slot. It has search, category pills, a three-up grid of pieces and an "Add Pieces" button.

Provide `items` (`[{img, name, cat, on}]`), `onToggle(i)`, `onConfirm` and `onBack`. `category` and `onCategory` filter by category (All, Tops, Knitwear, Bottoms, Outerwear, Shoes, Bags). `query` and `onQuery` search by name. `onPhotograph` is for the add tile. `ctaLabel` overrides the button text. In DraftLook, pass `sheet: 'wardrobe'`, `wardrobe`, `wardrobeCategory`, `onWardrobeCategory`, `wardrobeQuery`, `onWardrobeQuery`, `onWardrobeToggle`, `onPhotograph`, `onWardrobeConfirm` and `onSheetClose`.

- The top bar sits 10px from the top: a back chevron and a 40px `white` search pill with a 13px search glyph and "Search your wardrobe" in Inter 300 at 14px.
- Category pills sit 12px below and scroll sideways. Each is 32px with 12px `ink` text and its count in `ink-faint`. The selected pill is `warm-100` with a `warm-line` border and a leading ✓ (All never shows the ✓).
- The grid has three columns with gaps of 12px down and 10px across. The first tile is a dashed `cream-400` "Photograph one" card on `cream-100`, captioned "Adds straight in" in Cormorant italic 13px.
- Pieces are 3:4 photos with `rad-sm` corners and a 1px `rule` border, with the name under each in Cormorant 14px. Each photo has a 20px tick disc 6px from its top-right corner: frosted white when not picked, `warm-100` with a `warm-line` border and ✓ when picked.
- The footer button is a 48px `ink` pill that reads "Add Pieces", or "Add 1 Piece" / "Add 2 Pieces" once pieces are picked. It sits at 35% opacity until something is picked.
