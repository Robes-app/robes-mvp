# WardrobePiece
The page for a single garment in her wardrobe: the product photo, its category, name and brand, then Details and Looks tabs. It has no ink action of its own; styling starts from a look, not from here.

Provide `image` (`images` and `count` feed the stack badge), `category`, `name`, `brand`, and `details`: `{category: ['Dresses', 'Mini'], colour: {name, hex}, material, seasons, occasions, worn, note}`. Handlers: `onBack`, `onImages`, `onEdit`, `onFavourite` (with `favourite`), `onTab` (with `tab`), one per detail row (`onCategory`, `onColour`, `onMaterial`, `onSeasons`, `onOccasions`, `onWorn`, `onNote`), and `onLook(i)` with `looks` (`[{img, title}]`).

- **Photo:** the **SavedLook** frame (1056:1323) with the back disc and the image stack, but no sparkle, because a piece isn't a render. Product shots sit on `white` and are contained, not cropped.
- **Title block:** 20px padding. The category is the `eyebrow` style in `rose` ("DRESSES"). The name is Cormorant 24px `ink`, 10px below. The brand is Cormorant italic 300 17px `ink-soft` ("H&M"). Edit (pencil) and favourite (star) sit top-right as 18px `ink-soft` glyphs in 44px hit areas. A favourite star fills `ink`.
- **Tabs:** Details · Looks, 20px below, with the rail running edge to edge.
- **Details:** the drill-down card from **LookDetails** (48px rows, 9px tracked labels, 11px summaries, 14px `ink-faint` chevrons). The rows are Category ("Dresses · Mini"), Colour (a 13px swatch plus the name), Material, Seasons (glyphs plus names), Wear it for ("Evening · Party"), Worn (always `ink-faint`), and Note (with a pencil). Empty values read "None", "Year Round", "Anything" or "Not worn yet" in `ink-faint`.
- **Looks:** a two-column grid of the looks that use this piece. Each is a 4:5 tile with `rad-tile` corners and the title in Cormorant 15px. When there are none, it shows "Not in a look yet." in Cormorant italic.
- **No footer:** the page ends with the tab panel (32px bottom padding) and holds no `ink`-filled button. Don't add a "Style this piece" call to action here.
