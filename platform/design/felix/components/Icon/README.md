# Icon
Outline line icons on a 24px grid, drawn with a 1.5px stroke, round caps and round joins, colored by `currentColor`.

Provide `name` (one of: home, lookbook, diary, wardrobe, capture, describe, edit, bell, close, check, chevron, back, plus, cloud, sun, rain), optional `size` (px, default 20) and `stroke` (default 1.5; the nav bell uses 1.2, sheet rows 1.4). Give `label` only when the icon stands alone and means something; otherwise it is hidden from assistive tech.

- Dock icons 20px, disc icons 19px, sheet-row icons 17px, inline weather 12–14px, piece-row actions 11–13px.
- Color comes from the parent: `ink` when active, `ink-soft` at rest.
- `describe` is the only glyph with a filled part (the small spark). Don't add fills to the others.
- Weather glyphs (cloud, sun, rain) sit inline after the temperature, never on their own.
