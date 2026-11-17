# iOS

The iPhone app is Felix's web app's twin: the same tokens, type, copy and rules. On iOS a few things are drawn by the system itself — its sheets, its glass, its menus and its feel. This section says where iOS takes over and how Felix sits on top. The components grouped **iOS** show each one.

## What iOS draws, and what stays Felix

- **iOS draws:** the sheet's detents, grabber, spring and dimming (**DetentSheet**); Liquid Glass (**LiquidGlass**, **GlassChrome**); the long-press peek and menu (**LookMenu**); the tab bar; haptics.
- **Felix draws:** everything inside those surfaces — **SheetHead**, rows, grids, type and colour. A system surface is painted `cream` wherever iOS would show its own white.
- **Off iOS:** each iOS component falls back to its Felix twin. **DetentSheet** becomes **Sheet**, **LiquidGlass** becomes the token veil, **LookMenu** becomes the card's ×, and **GlassChrome** becomes a plain bar above the list. The web keeps its own drawers.

## Sheets

- **Long sheets stand on iOS's own sheet (DetentSheet).** It opens at two thirds of the screen, so a whole grid row shows under the header, and pulls up to full. These are the LookPicker, PiecePicker, WardrobePicker, a piece's fields, Seasons, Worn, In looks and the Diary sheet.
- **Short sheets keep Felix's Sheet:** a question with two or three rows, New look, Add pieces, Filter, and the prompt drawer.
- **Every sheet has one header, SheetHead:** the × disc at the left, the title centred in Inter 600 at 15, and the action at the right as a word ("Done", "Clear all"). A drill swaps the × for a back chevron.
- **Sheets stand on the bottom edge,** edge to edge, with their last row above the home indicator. The tallest stops at 92% of the screen, clear of the Dynamic Island.
- **Nothing presents over a sheet that is still leaving.** Wait for the sheet to finish closing (`onClosed`) before opening the camera, the photo library or the next sheet. Worn's "Add a date" opens the Diary only after Worn has gone.
- **The keyboard lifts a sheet only on a real show,** from its first event, so a field that takes focus as its sheet opens is never hidden. A sheet never stands a keyboard's height up with no keyboard under it.

## Glass

- **Liquid Glass on iOS 26:** on the veil discs over photos (back, adjust, remove, retake), on the photo badges, on the glass action sheets, and on the Lookbook, Wardrobe and Diary chrome.
- **With Reduce Transparency on, or where glass is missing,** a disc falls back to its `veil` token. A sheet or pane that holds controls falls back to solid `cream`, so the screen behind never reads through them.
- **Never tint the glass.** Give it a shape, and keep `ink` glyphs on it.

## Gestures and feel

- **Swipe to act (SwipeRow).** Past 44pt, a row rests open at 88pt over its action; past 160pt, it acts. Tapping an open row closes it. The Wardrobe's pieces and wishes, and the bell's notifications, all use this one row. VoiceOver gets the same action from the row.
- **Long-press a saved look (LookMenu)** to peek at it, with the native menu: Schedule look · Delete look. Delete keeps its Undo toast. The card carries no × at rest.
- **Haptics:** a selection tick on every chip, a day or a choice changing (`haptic.selection`), and a success when a look is saved or filed to a day (`haptic.success`). Nothing else buzzes.
- **Edit mode on the Rack** rocks the cards (±0.35°, tiles ±1.1°). The rocking stays on under Reduce Motion because it is the only sign of the mode; every other motion stops.

## Layout on the phone

- **The tab bar is iOS's own** (Home · Lookbook · Diary · Wardrobe). Lists scroll beneath it and end clear of it.
- **Toasts lift above the tab bar** while their tab is in view. A screen pushed over the tabs keeps its toast at its own foot.
- **Settings and subviews** start below the header. A sheet measures its own window, not the tab's safe area, so it never gains the tab bar's height as empty glass.
- **Dynamic Type** scales text up to a cap: body ×2, labels ×1.6, controls ×1.5, headings ×1.4.
- **Every target is at least 44pt.** A 28pt toggle or a 22pt × disc keeps a 44pt hit area.
- **Screen recordings** follow her consent, and fields that hold her words or account details are never recorded. Those fields are wrapped in `Unrecorded`.

## Where it lives in code

| Component | Source |
| --- | --- |
| DetentSheet | `platform/mobile/src/components/DetentSheet.tsx` |
| SheetHead, Sheet | `platform/packages/ui-native/src/Sheet.tsx` |
| LiquidGlass | `platform/packages/ui-native/src/Glass.tsx` (`Glass`, `useNativeGlass`) |
| GlassChrome | `platform/mobile/src/components/TabScreen.tsx` (`glass`, `TabSticky`) |
| SwipeRow | `platform/mobile/src/components/SwipeRow.tsx` |
| LookMenu | `platform/mobile/src/features/looks/LookTiles.tsx` (`SavedLookCard`) |
| Haptics | `platform/packages/ui-native/src/haptics.ts` |
