# PieceList
"Included pieces" in a look (frame 2b, a look opened from the Lookbook). It has a small header with a grid/list toggle and an edit button, then the pieces as separate white rows or as a three-across grid, then a compact add button.

**Props**
- `items`: `[{img, category, name, brand, worn, price, wishlist, shop}]`.
- `view` (`list` | `grid`) and `onView`.
- `editing` and `onEditToggle`.
- `onOpen(i)`, `onSwap(i)`, `onRemove(i)`, `onAdd`.
- `swiped`: the index of a row with its swipe actions revealed.
- `title` defaults to "Included pieces". Pass `null` to drop the header, as **DraftLook** does.

**Header**
- The title is Cormorant 16px in `ink-faint`.
- On the right is the `cream-200` grid/list toggle (the same one as **CollectionBar**), then a 28px pencil disc. While editing, the disc fills `ink-faint` with a white glyph.

**List**
- Each piece is its own white row on `shadow-card`, with 3px corners and a 3px gap between rows.
- A 52px-wide photo runs the full height of the row on the left.
- Then the category in `category` style, the name in Cormorant 15px and the brand in 11px `ink-faint`.
- On the right: worn count (calendar glyph) or price (with a heart or bag glyph for wishlist and shop pieces), then a chevron.
- Swiping a row left reveals 72px Swap (`cream-300`) and Remove (`danger`) actions.
- In edit mode, the chevron becomes two 30px `cream-200` squares: Swap (hanger) and Remove (×).

**Grid**
- Three across, with 16px rows and 10px columns. Tiles are 3:4 with 3px corners, then the category, name (14px) and meta below.
- In edit mode, a 28px Swap | Remove bar sits along the bottom of each photo.

**Add.** A 30px `cream-200` square showing plus and hanger glyphs. In list view it sits centred below the rows; in grid view it takes the next cell.

There is no card border around the list. Each row lifts on its own.
