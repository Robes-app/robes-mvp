# ImageManager
The look's photos as a swipeable strip of cards, opened from the image-stack badge. It replaces the photo inside DraftLook or SavedLook until Done.

Provide `images` (urls), `onRemove(i)`, `onAddPhoto` and `onDone`. `removable` defaults to more than one image, because the last photo can't be removed. In DraftLook, pass `managing` with `onRemoveImage`, `onAddPhoto` and `onManageDone`.

- It keeps the photo's 1056:1323 frame on `cream-100`. Cards are full width inside 40px side padding, 10px apart, snap to centre, and have `rad-tile` corners and a soft drop shadow.
- It zooms in from 1.26× to 1× over 0.26s when it opens, and reverses when Done is tapped.
- Remove: a 28px `veil-mid` disc 10px from the card's top-right corner, with a 12px × in `ink-mute`. A removed card collapses its width over 0.34s.
- The last card is always "Add a photo": a dashed `cream-400` border on `cream`, holding a 56px `white` disc with the 22px camera and a 9px tracked label.
- Done: a 44px `scrim` glass disc 16px from the bottom-right, with an 18px `white` check.
