# Dock
The floating four-item tab bar at the bottom of every mobile screen: Home · Lookbook · Diary · Wardrobe. It sits on `dock-glass` with `blur-dock`, has a 1px `dock-line` border, and uses `rad-dock`.

Provide `active` (`home` | `lookbook` | `diary` | `wardrobe`) and `onSelect(key)`.
- `badges`: `{wardrobe: {count, tone, title}}`, or just a number. It draws a 17px count pill (600 9px Inter) ringed in `cream`.
  - The default tone is `ink`, as in "24 pieces in your wardrobe".
  - `tone: 'alert'` paints it `alert` red. Use it only for the empty-wardrobe nudge (count 0).
- `dots`: `{key: true}`. A 7px `alert` dot for unread, used when there is no count to show.
- The active item turns `ink` and lights a 24×2px `ink` bar above its icon. Labels use `dock-label`.
