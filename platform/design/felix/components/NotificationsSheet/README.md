# NotificationsSheet
"Notifications" is the bottom sheet behind the nav bell. It keeps alerts off the home screen: home holds the outfit, and anything that needs her attention waits here.

Provide `alerts` (`[{text, dest, icon, onOpen, onDismiss}]`), `onClose` and `onDone`. `icon` is `receipt` or `calendar`. `dest` names where the alert leads, for example "Wardrobe" or "Diary". `emptyText` overrides "Nothing new." Light the bell's `rose` dot on **TopNav** (`bell`, `alert`) whenever there are alerts.

- **The header uses the DraftLook drawer header:** a 36px `cream-200` close disc on the left (Cancel), the 9px tracked uppercase title centred in `ink-soft`, and a 36px `ink` done disc with a 15px `cream` check on the right. It is 40px tall with 8px below it.
- It's a bottom sheet over a `backdrop` that fades in over 0.25s, with `cream`, `rad-lg` top corners and 12px 20px 28px padding, sliding up in 0.3s. Tapping the backdrop closes it.
- Alerts stack 10px apart, starting 16px below the header. Each card is `white` with a 1px `rule` border and `rad` corners (the border warms to `cream-400` on hover), with 12px 14px 12px 12px padding. It holds a 32px `cream-200` `rad-sm` tile with a 14px icon, the alert in Cormorant 16px `ink`, the destination as a 9px tracked uppercase line in `ink-faint`, and a `›`.
- Dismiss sits beside each card: a 36px `cream` circle with a 0.5px `rule-mid` ring and an `ink-faint` ×.
- Write alerts as a short task: "2 receipts to review", "Log Wednesday's wear". No exclamation marks. When there are none, show "Nothing new." in 12px `ink-soft`.

For a question that must be answered before going on, use **AlertDialog** instead.
