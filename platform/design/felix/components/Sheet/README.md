# Sheet
A bottom sheet on `cream`: grab handle, `rose` eyebrow, a Cormorant question, then 56px choice rows.

Provide `eyebrow`, `question`, `rows` `[{icon, label, onClick}]`, optional `children` below, and `floating` for the inset variant (8px from the edges, all corners `rad-lg`, `shadow-sheet`).

- Slides up over 0.3s on `cubic-bezier(.2,0,.2,1)`; the backdrop is `scrim`.
- Ask one question; give two or three rows. Each row: a 40px `cream-100` icon disc, a sentence-case label, a `›`.
- Rows separate with 1px `rule`; the last one closes with a rule too.
