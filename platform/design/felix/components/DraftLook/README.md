# DraftLook
The 3a Draft Look drawer: the sheet a look is built in before it is saved. Its header has close, "Draft look" and done; under that are the model photo, the Pieces / Details tabs, a dashed add-pieces slot, a prompt card and a Generate chip.

**What you provide**
- `image` is the model or current render. `images` and `count` feed the stack badge.
- `pieces` is a `Piece[]`, shown as an edit-mode **PieceList** above the add slot.
- `context` `{place, weather, range}` sets the place · weather chip. Pass `null` with `onAddContext` to show the white add-location chip instead.
- `details` `{tags, seasons, worn, caption}` fills the Details tab. You can pass your own `children` in its place.
- `mode`: `draft` (the default) or `edit`. Edit changes the title to "Edit look", the placeholder to "Describe other changes…", the chip to "Regenerate" with a refresh icon, and the confirm copy.
- `tab` is Pieces or Details. `prompt` controls the text input.
- `canSave` turns the done button on. `canGenerate` defaults to having text, a piece or a context chip.
- `generating` pulses the photo, spins the adjust glyph, dims done and locks the panel.
- `confirm` shows the discard dialog.
- Handlers: `onClose`, `onDone`, `onAdjust`, `onImages`, `onTab`, `onAddPiece`, `onSwap`, `onRemove`, `onRemoveContext`, `onAddContext`, `onPromptChange`, `onGenerate(text)`, `onTags`, `onSeasons`, `onWorn`, `onCaption`, `onConfirmDiscard`, `onKeepEditing`.

**How it opens**
- It is a drawer: absolute, `top: 24px`, over a `backdrop` (32,32,33 at 0.28) that fades in over 0.25s. It has `rad-lg` top corners and slides up in 0.32s on `cubic-bezier(.2,0,.2,1)`. Size its parent to the phone.

**Header**
- 56px tall, with 0 12px padding and a 0.5px `rule` underneath.
- Close is a 36px `cream-200` disc with an `ink-soft` 14px ×. It asks before discarding.
- The title is 9px, 500 weight, 0.22em tracking, uppercase, `ink-soft`.
- Done is a 36px `ink` disc with a 15px `cream` check (stroke 2). Its tooltip is "Save and schedule for this day". It sits at 35% opacity while the look is still a draft that hasn't been generated, while generating, or in edit mode with nothing changed.

**Photo**
- Full-bleed at 1056:1323 on `cream-100`.
- The 24px `veil-soft` adjust disc sits bottom-left (20px from the left, 25px from the bottom).
- The image stack sits bottom-right (20px from the right, 18px from the bottom). It shows + or the image count.

**Tabs**
- Pieces · Details, 6px below the photo. The panel sits 12px below the tabs.

**Pieces tab**
- The add slot is 55px tall, with a 1px dashed `warm-line` border and `rad` corners. It holds a 32px `cream-200` disc: the 15px wardrobe icon when empty, a 13px + once pieces exist. With pieces, the list takes the top corners and the slot hangs underneath with no top border.
- The prompt card is `white`, with a 0.5px `rule-mid` border, `rad` corners, 0 6px padding and a 12px top margin.
- The context chip is a 28px pill in `warm-100` with a 1px `warm-line` border and 11px `ink` text: pin · place · weather glyph · range, plus ×. "Leave the weather out" turns it into a white add chip with a pin and +.
- The input row is 52px tall, Cormorant italic 300 at 17px, with "Describe Look…" as the placeholder.
- Generate is the `chip` Button with a trailing 11px check, centred 12px under the card with 28px of bottom padding. It sits at 40% opacity until there is something to generate from.

**Details tab** (a **LookDetails**; `captionEditing`, `onCaptionChange` and `onCaptionSave` drive the inline caption)
- A `white` card with 48px rows: Tags, Seasons, Worn and Caption.
- Each row has a 9px tracked label on the left and an 11px summary on the right, then a 14px `ink-faint` chevron. Caption gets a pencil instead of the chevron.
- An empty summary is `ink-faint`: "None", "Year Round", "Not worn yet". Seasons show their glyphs, and only the glyphs once more than two are picked.

**Discard confirm** (an **AlertDialog**; `choose` shows the "Save your changes" variant with `onUpdate`, `onSaveNew` and `onChooseCancel`)
- A `cream` card centred over `backdrop-strong`, with `rad-card` corners and `shadow-dialog`.
- "Discard this draft?" in 22px Cormorant, with "The look won't be saved or scheduled." under it in 12px `ink-soft`.
- Discard is a 44px `ink` pill and Keep editing is a 44px outline pill.

**Sub-sheets**
- Pass `managing` to swap the photo for **ImageManager**.
- `sheet` opens one of: `'adjust'` (**AdjustSheet**) or `'describe'` (**DescribeSheet**), which float over the body, or `'wardrobe'`, `'tags'`, `'seasons'` and `'worn'` (**WardrobePicker**, **TagsView**, **SeasonsView** and **WornView**), which slide in over the whole drawer. Close any of them with `onSheetClose`.
- Text fields have no focus ring. The field's own card and the caret show where she is typing, as in the reference. Buttons keep the 1.5px `ink` focus ring for keyboard use.
