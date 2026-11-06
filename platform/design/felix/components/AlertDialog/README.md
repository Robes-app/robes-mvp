# AlertDialog
The centred confirm used before anything that can't be undone or needs a choice: "Discard this draft?", "Discard your changes?" and "Save your changes". It covers the drawer or screen it belongs to.

Provide `title`, `message` and `actions` (`[{label, variant, onClick}]`), plus `onDismiss` for a tap outside the card. `variant` is `primary` (the `ink` pill), `outline` (the `white` pill) or `text` (a quiet 12px link). DraftLook uses it through `confirm` (discard) and `choose` (save choice: `onUpdate`, `onSaveNew`, `onChooseCancel`).

- The scrim is `backdrop-strong` (35% `ink`) over the drawer, fading in over 0.2s, with 32px side padding.
- The card is `cream` with `rad-card` corners, `shadow-dialog`, 22px 20px 16px padding and centred text.
- The title is Cormorant 22px `ink`, phrased as a question or a plain statement: "Discard this draft?", "Save your changes". The message is one sentence in 12px/1.5 `ink-soft`, 8px below, saying what happens: "The look won't be saved or scheduled."
- Actions stack 8px apart, 18px below. The first is a 44px `ink` pill (the consequence, verb first: Discard, Update). The second is a 44px `white` outline pill (the safe way back: Keep editing, Save as new Look). An optional third is a 36px text "Cancel". Labels are 10px with 0.2em tracking, uppercase.
- One dialog at a time, with at most three actions. Don't use it for news or reminders; those go in **NotificationsSheet**.
