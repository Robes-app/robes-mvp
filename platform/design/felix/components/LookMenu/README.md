# LookMenu
On iOS, a saved look in the Lookbook opens with a tap. A long press peeks at the look and shows iOS's own menu: **Schedule look** · **Delete look**.

On iOS, use `SavedLookCard` with `look`, `onPress`, `onDiary` (Schedule) and `onDelete`.

- The card has no × and no calendar at rest (Front Door 2b; Annie, 15 Nov). Schedule and Delete live in the menu, and Schedule is also on the look itself.
- Delete look is the menu's destructive item, drawn by iOS in its red with the trash glyph. Deleting still leaves an Undo toast, which stands above the tab bar.
- iOS draws the peek preview and the menu: blur, scale and haptic. Felix only supplies the card and the two words.
- Android and web keep the card's 32px × disc on the photo for now.
