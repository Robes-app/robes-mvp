# TopNav
The 64px top bar on `nav-glass` with a 16px backdrop blur and a 0.5px `rule` bottom border. Each tab now names itself here: a centred Cormorant title replaces the wordmark.

Provide `variant` (`mobile` default, or `desktop`), `initial` for the avatar, and handlers `onProfile`, `onBell`, `onNavigate`.

**Mobile**
- `title`: a centred `heading`-sized line (Cormorant 300, 22px). Home uses the greeting ("Good morning, Annie."), Lookbook uses "Lookbook", and Wardrobe uses "Your wardrobe". With no title, the `Wordmark` sits on the left.
- `swapMark` (Home only): after `swapAfter` ms (default 5000) the greeting fades out (.45s) and the ROBES wordmark fades in. Tapping the centre swaps them back.
- `bell` + `alert`: the bell, with its `rose` dot.
- `glass`: transparent with no border. Use it when a `CollectionBar` band runs up underneath (Lookbook, Wardrobe).
- `onBack`: a 20px back chevron, top-left. `mark` shows the Cormorant "R" monogram there instead.
- `onAdd` + `addLabel`: a 30px `ink` plus disc before the avatar. `noProfile` hides the avatar.

The title is inset 66px from each side, or 96px when the bell shows, so it never collides with the controls. It ellipsises past that.

**Desktop** takes `links` (default Lookbook · Diary · Wardrobe), `current`, and `weather` `{day, place, temp, icon}`.

- Mobile pads `space-6`; desktop pads `shell-gutter`.
- Location is carried by the title (mobile) or the lit link (desktop). There are no breadcrumbs.
