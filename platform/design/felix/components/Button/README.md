# Button
Pill buttons with tracked uppercase labels. Three variants from the designs.

Provide `children` (sentence case — the component uppercases), `variant`, `onClick`, optional `icon` (trailing, 11px), `block` for full width, `disabled`.

- **primary** — `ink` fill, `cream` text, 48px tall. The one commit per screen ("Schedule look", "Save look"), usually full-width in a footer over a 0.5px `rule`.
- **outline** — `white` with a 0.5px `rule-mid` ring, 40px. The secondary choice beside a primary.
- **chip** — 28px `cream-200` pill, `ink-soft` text. Context that can be tapped to change (the prompt that set a look).
- Black is reserved for the single primary action; never two primaries in view.
