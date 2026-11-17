# Sheet
The glass action sheet that the `ink` plus buttons open. Lookbook's plus (2b) opens **New look**: Create · Photo · From pieces. Wardrobe's plus (3b) opens **Add pieces**: Paste URL · Photo · From receipt.

**Props**
- `title`.
- `actions`: `[{key, icon, label, count, onClick}]`, two or three of them.
- `active`: the key of the chosen action. It rings that tile and dims the rest.
- `onClose`.
- `header`: replaces the title, e.g. with a URL field once Paste URL is chosen.
- `headerAction`: fills the right-hand slot, e.g. a go button.
- `children`: content that expands below the tiles, such as the receipt inbox.

**Placement.** On the screen's bottom edge, edge to edge, over a 0.32 `ink` backdrop; its last row sits above the home indicator. Tapping the backdrop or ×, or a swipe down on the header, closes it. It slides up over 0.26s on `cubic-bezier(.4,0,.7,1)`, in and out alike. (Until 12 Nov it was inset 8px; that read as detached.)

**Surface**
- `sheet-glass` with `blur-sheet` and saturate 180%.
- Top corners on `rad-dock` (24px); the bottom is the screen's.
- A white inner highlight and a 0.5px edge over the top and sides. No drop shadow.
- On iOS 26 the surface is the system's Liquid Glass; with Reduce Transparency on, or where glass is missing, it is solid `cream` so the screen never reads through its controls. See **LiquidGlass**.

**Header** — the one sheet header, **SheetHead**, shared by every sheet since 16 Nov.
- A 40px frosted-white × disc on the left, and the title centred.
- The title is Inter 600, 15px. This is the one place a sheet title is set in sans, because it labels a system menu rather than asking her a question.
- An empty 40px slot on the right keeps the title centred.

**Tiles**
- An equal-width grid with a 10px gap. Each tile is 64px tall with 18px corners, `rgba(255,255,255,.72)` and a soft shadow.
- Each holds a 17px glyph over an 8px tracked uppercase label in `ink-soft`.
- `count` adds a 19px `ink` badge, ringed in `cream`, to the top-right corner. Use it for From receipt's inbox, e.g. 13 waiting.
- The chosen tile turns white with a 1px `ink` ring; the others drop to 55%.

The older `question` and `rows` props still work: they map onto `title` and `actions`.
