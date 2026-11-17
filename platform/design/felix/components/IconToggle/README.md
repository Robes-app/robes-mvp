# IconToggle
The look prompt's source toggles (redline 14 Nov): a 28px disc with one glyph that switches a source on or off, for example Wardrobe or Shop. Web and iOS share it.

Provide `icon`, `checked`, `onChange(next)`, and `labelOn` / `labelOff` (what a reader hears in each state, since a glyph alone says nothing: "Shop is on: looks can add wishlist and new pieces"). Optional: `faded` and `disabled`.

- **On:** a `cream-200` fill on a 1px `token-line` ring, with a 15px `ink` glyph.
- **Off:** clear, on a 1px `warm-line` ring, with an `ink-faint` glyph.
- **Faded** (for example, Wardrobe when the wardrobe is empty): drawn at 45% but still tappable, so the tap can explain why.
- The disc sits in a 44pt target, using negative margins so a row of toggles keeps its 28px rhythm.
- Screen readers hear it as a switch.
