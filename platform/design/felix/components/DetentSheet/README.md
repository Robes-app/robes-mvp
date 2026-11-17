# DetentSheet
iOS's own sheet with two heights: it opens at two thirds of the screen and pulls up to full, under the system grabber, spring and dimming, with Felix's content inside.

Provide `open`, `onClose`, `title`, and `children`. Optional:
- `done` `{label, onPress, disabled}`: the word at the right of the header ("Done").
- `leading`: a drill's back chevron in place of the ×.
- `eyebrow` and `media`: a small-caps line and a thumbnail under the header, when the sheet is about something ("Add to your diary" beside the look).
- `scroll`: the body scrolls inside the sheet. Leave it off for a body that scrolls itself, such as a grid list.
- `footer`: held above the home indicator, for example the 48px `ink` "Add 2 Pieces" pill.
- `onClosed`: fires once the sheet has fully gone.

**Use it for long sheets:** the LookPicker, PiecePicker, WardrobePicker, a piece's fields, Seasons, Worn, In looks and the Diary sheet. Short sheets (one question, two or three rows) keep **Sheet**.

- The detents are 66% and `large`. At half height only a sliver of the grid showed, so the open height is two thirds.
- The ground is `cream`, so iOS's own white never shows. Content pads `space-5` at the sides and 20px on top.
- The header is **SheetHead**. The eyebrow is 12px Inter in `rose-deep`, tracked 0.22em, 12px under the header.
- Open nothing over it until `onClosed` fires. iOS refuses to present a screen over a sheet that is still leaving.
- Off iOS it renders the shared **Sheet** at 92% height with the same props.
