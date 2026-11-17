# SheetHead
The one sheet header (audit P2, 16 Nov), used on every sheet: the × at the left, the title centred, and the action at the right as a word.

Provide `title`, `onClose`, and optionally `action` `{label, hint, onPress, disabled}` and `leading`, which replaces the × with a drill's back chevron. A drill's back never closes the sheet.

- 40px row. The × is a 36px `cream-200` disc with a 14px `ink-soft` glyph, inside a 44pt target.
- Title: Inter 600 at 15px, `ink`, one line, centred. A sheet title is set in sans because it labels a system surface; questions in sheets stay in Cormorant.
- Action: Inter 400 at 13px, `ink` while it can act, `ink-faint` while it can't ("Clear" with nothing picked). VoiceOver reads `hint` after the word.
- With no action, a 36px spacer keeps the title centred.
- A swipe down on the header closes a Felix **Sheet**. On **DetentSheet**, iOS handles the drag.
- It replaces the old grab bar, Cormorant question and right-hand × on any sheet with a `done`.
