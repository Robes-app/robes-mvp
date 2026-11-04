# iOS navigation redline — top bar and tab bar (2026-11-04)

Source: Annie's "Robes iOS navigation redline" (four boards: overview on iPhone 16, top navigation @2x, tab bar @2x, iOS build notes). It supersedes the Native parity handoff's dock (2026-10-25) for the sparkle and the tab bar's drawing. Built on web and native in one pass.

## What changed

| Element | Before | Now |
|---|---|---|
| Home tab icon | Sun (`today`) | House (`home`, `@robes/icons`): roof apex y 4, walls 4–20, door 6 wide |
| Create sparkle beside the bar | Phone web and native | Gone. Dressing starts from home's composer. Desktop web keeps its Create button and ⌘K |
| Native tab bar | Hand-drawn floating pill (`TabBar.tsx`, `expo-glass-effect`) | The system's own (`expo-router/native-tabs`): Liquid Glass, VoiceOver "tab, 1 of 4", Large Content Viewer, classic 49pt bar on iOS 18 |
| Tab items | 20 icon, 9px labels, sunk pill | 24 icon, Inter 500 10/12, ink on a `surface` pill, the rest `ink-muted` |
| Minimise on scroll | None | Lookbook and Wardrobe only: down collapses to the current tab, up or a tap restores |
| Phone web dock | Pill plus sparkle, 14 margins | One capsule 16 in from each side, 64 tall, 4 inset, 24 above the screen edge, lighter glass and softer shadow |
| Top bar | 20 margins, hairline always | 44 tall, 16 margins; no hairline at the scroll edge, a hairline once scrolled |
| Bell | 18 glyph, rose dot, "Notifications" | 20 glyph, 6pt ink dot in a 1.5 ring, "Notifications, 2 new" (the count is in the label, never colour alone), light haptic as the sheet opens |
| Avatar | Filled 32 disc, sans initials, 32 hit area on web | `tone="ring"`: no fill, `border-control` ring, one Cormorant italic initial nudged 1pt down, inside a 44 hit area; label "Your profile and settings" |
| Wordmark (native) | Header labelled with the tab's name | Header labelled "Robes" |

Files: `mobile/src/app/(tabs)/_layout.tsx`, `mobile/src/components/TabScreen.tsx` (+ `useTabScroll`), `mobile/src/components/Bell.tsx`, `app/src/components/shell/app-shell.tsx`, `app/src/components/shell/bell.tsx`, `packages/ui*/…/avatar`, `packages/icons` (+ `scripts/gen-tab-images.ts`, `mobile/assets/tabs`). Deleted: `mobile/src/components/TabBar.tsx`, `mobile/src/app/create.tsx` (no door led there once the sparkle went; every Create door has a home: Add pieces in Wardrobe, New look in Lookbook, Style a piece on a piece, trips from home's composer).

## Where the build differs from the redline, and why

1. **The native top bar is drawn in React Native, not the SwiftUI navigation toolbar.** Tab roots aren't inside a native stack, and moving them would change every tab's route structure. It matches the redline's measures, states and labels; the system's scroll-edge blur is not there (the bar stays `bg` with a hairline). Moving it to the native header is a follow-up that needs a device to check.
2. **Tab labels carry no +0.08em tracking on native.** The system tab bar's label style takes font, size and colour only. Titles are capitals for display; VoiceOver reads the sentence-case name from the accessibility label.
3. **Tab icons are template PNGs (@1x/@2x/@3x), not PDFs in an asset catalogue.** The app is Expo with generated native projects, so it never hand-edits an asset catalogue. `pnpm --filter @robes/icons gen:tab-images` regenerates them; `mobile/__tests__/tab-icons.test.ts` fails if they drift from `@robes/icons`.
4. **Colours come from `@robes/tokens`**, not named colour sets: the values match the redline's table.
5. **All four tabs mount at launch** under the system tab bar (they mounted on first visit before). Nothing in them acts on mount; their reads start together.
6. **Desktop web keeps Create.** The redline covers the phone; the desktop bar's Create button and ⌘K stand.

## Check on a device (CI can't)

- iOS 26: the capsule, selected pill and minimise on Lookbook/Wardrobe; the last row of each tab clears the bar (each list takes the tab screen's bottom inset through `useTabScroll`).
- iOS 18: the classic bar draws with the same icons and colours.
- Android: content sits above the bar, not under it.
- Inter Medium reaches the tab labels (the system falls back to its own face if the font name doesn't resolve).

## Tests

`mobile/__tests__/shell.test.tsx` (four tabs, labels, titles, test IDs, no Create, minimise only on the grids), `bell.test.tsx` (the counted label), `tab-icons.test.ts`, `form-sheet.test.tsx`; Maestro `shell.yaml`, `looks-plan.yaml` (New look from the Lookbook); web `app/e2e/shell.spec.ts` (capsule geometry, avatar hit area, hairline once scrolled, minimise and restore).
