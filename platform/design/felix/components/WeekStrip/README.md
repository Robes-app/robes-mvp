# WeekStrip
Seven tappable day cells under the greeting — the diary at a glance.

Provide `days`: an array of `{w, n, today?, future?, worn?, looks?}` (weekday abbreviation, date number, flags, count of planned looks), plus `selected` (index) and `onSelect(index)`.

- Today reads "Today" and sits in a `warm-100` cell with a 1px `warm-line` border and `rad-sm` corners.
- Past days are `ink-faint`; today and the days ahead are `ink`.
- Marks under the date: a solid `ink-soft` dot for a worn look, an outlined dot per planned look (overlapping by 2px).
- Swipes by whole weeks with scroll-snap; never show a partial week.
