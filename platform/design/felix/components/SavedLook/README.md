# SavedLook
The full-bleed photo at the top of a saved look, with a back chevron top-left, an adjust-image disc bottom-left and the image-stack badge bottom-right.

Provide `image` (or `images`: the current photo first, then the next one, which shows in the stack), `count` (more than one image shows the number on the badge; otherwise it shows +), and the handlers `onBack`, `onAdjust` and `onImages`. Pass `null` for a handler to hide that control. `adjustLabel` overrides the "Adjust model image" tooltip, and `alt` describes the photo.

- The photo sits at 1056:1323 (about 4:5), edge to edge, cropped with object-fit cover on a `cream-100` well. Bleed it past the page gutter (`margin: 0 -20px` inside a 20px-padded screen).
- Back: a 36px `veil-soft` glass disc, 12px from the left and 10px from the top, with a 20px `ink` chevron. Put it in the 56px header zone above the photo; no other header chrome.
- Adjust: a 24px `veil-soft` disc 20px from the left and 25px from the bottom, holding the 13px `describe` spark. It opens the Adjust Model Image sheet.
- Image stack: three fanned cards (a dashed `veil-paper` back card, the next photo at 4°, the current photo in front), 20px from the right and 18px from the bottom. Its `ink` badge shows + to add a photo, or the image count.
- The small controls keep a 44px hit area through an invisible padding ring. Don't enlarge the glyphs.
- Follow it with **Tabs** (Pieces · Details) and a **PieceList**, then a `primary` **Button** in the footer.