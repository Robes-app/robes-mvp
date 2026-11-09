# EmptyState
The first-run state for a collection tab, centred in the space between the `CollectionBar` and the dock.

Provide `icon` (`bookmark` for Lookbook, `wardrobe` for Wardrobe), `title`, `message`, `action` and `onAction`.

**Anatomy**
- A 64px white disc with `shadow-card`, holding a 24px `ink-faint` glyph at 1.3 stroke.
- Title in Cormorant 24px.
- One or two plain sentences of 12/1.55 Inter in `ink-soft`, capped at 260px.
- A 44px `ink` pill with a leading plus.

**Copy**
- Say what's missing in the title: "No saved looks yet", "Your wardrobe is empty".
- Say the ways in after that: "Add pieces from a photo, a product link or a receipt."
- The pill is the view's one ink commit.
