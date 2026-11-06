# AdjustSheet
"Adjust Model Image" is a floating sheet for describing a change to the model render, such as "sleeves rolled up". It opens from the sparkle on the photo.

Provide `onSend(text)` and `onClose`. Use `value` and `onChange` to control the field, and `sending` while it renders. `title` and `placeholder` override "Adjust Model Image" and "e.g: sleeves rolled up…". In DraftLook, pass `sheet: 'adjust'`, `onAdjustSend` and `onSheetClose`; `generating` drives the sending state.

- It floats 8px from the drawer's sides and bottom: `cream`, a 0.5px `rule-mid` border, `rad-lg` corners, `shadow-sheet`, 10px 20px 26px padding, sliding up over 0.3s.
- Header: 40px tall, the 9px tracked title in `ink-soft`, and a 36px `cream-200` close disc.
- The field sits 16px below: `white`, `rad-lg`, 52px tall, with Cormorant italic 300 at 17px. Send is a 56px-wide `cream-200` cell flush right, holding "→" and dimmed to 40% until there is text. While sending, it shows the refresh glyph spinning backwards, and the photo pulses behind.
