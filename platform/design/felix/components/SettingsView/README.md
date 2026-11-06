# SettingsView
The profile behind the nav avatar. It is rebuilt on the system's own patterns rather than copying the older Settings mock: the subview header, **Tabs** for Style profile / Account, and the **LookDetails** drill list.

Provide `tab` (`style` or `account`), `onTab`, `onRow(label)`, `onSignOut` and `onBack`. `rows` overrides either list with strings or `{label, value, muted}`. Style profile defaults to Your digital twin, Style DNA and Observations; Account defaults to Details and Notifications, followed by Sign out. Use `value` for a short summary on the right, such as "2 new" on Notifications. Pass `null` for `onSignOut` to hide Sign out.

- **Header:** the subview shell shared with TagsView and WornView. 56px over a 0.5px `rule`, with a 20px `ink` back chevron, the 9px tracked uppercase title centred, and a 36px spacer. It replaces the older "←" and the 19px serif title.
- **Switch:** the standard underline **Tabs** (9px tracked labels; the selected tab is `ink` with a 1.5px underline). It replaces the older pill toggle.
- **Rows:** one `white` card with a 0.5px `rule-mid` border and `rad` corners. Rows are 48px with a 9px tracked uppercase label, an 11px summary on the right and a 14px `ink-faint` chevron, divided by `rule` lines. It replaces the older separate 52px cards with 18px serif labels and "›".
- **Sign out:** a full-width 44px outline **Button**, 24px below the list on the Account tab only. It's an action, not a destination, so it has no chevron.
