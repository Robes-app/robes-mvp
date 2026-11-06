# TopNav
The 64px top bar: wordmark left, account right, on `nav-glass` with a 16px backdrop blur and a 0.5px `rule` bottom border.

Provide `variant` (`mobile` default, or `desktop`), `initial` for the avatar, and handlers `onProfile`, `onBell`, `onNavigate`. Mobile takes `bell` and `alert` (shows the `rose` dot). Desktop takes `links` (default Lookbook · Diary · Wardrobe), `current`, and `weather` `{day, place, temp, icon}`.

- Mobile pads `space-6`; desktop pads `shell-gutter` (80px, stepping down to 24px under 768px).
- Location is carried by the lit link (desktop) or the dock (mobile) — no breadcrumbs.
- Sticky at the top; it never scrolls away.
