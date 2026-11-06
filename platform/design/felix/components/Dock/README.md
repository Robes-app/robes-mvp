# Dock
The mobile bottom tab bar: Home · Lookbook · Diary · Wardrobe, a frosted pill floating 10px from the screen edges.

Provide `active` (`home` | `lookbook` | `diary` | `wardrobe`), `onSelect(key)`, and optional `dots` `{wardrobe: true}` for an unread `alert` dot.

- The active item turns `ink` and gets a 24×2px `ink` bar above its icon; the rest stay `ink-soft`.
- `dock-glass` fill, `blur-dock` backdrop blur, 1px `dock-line` border, `rad-dock` corners.
- Mobile only (<768px). Reserve ~120px of bottom padding in scrolling content so nothing hides behind it.
