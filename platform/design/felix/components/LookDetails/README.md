# LookDetails
The Details tab of a look: Tags, Seasons, Worn and Caption as one drill-down card. It sits under the Pieces / Details **Tabs** on a saved look (3e) and inside **DraftLook**.

Provide `tags`, `seasons`, `worn` (a summary such as "5 times · last 27 Oct") and `caption`, plus `onTags`, `onSeasons` and `onWorn`. Each of those opens its subview (**TagsView**, **SeasonsView**, **WornView**). For the caption, `onCaption` starts editing, `captionEditing` shows the inline field, and `onCaptionChange` and `onCaptionSave` handle what she types.

- The card is `white` with a 0.5px `rule-mid` border and `rad` corners. Rows are 48px, divided by 0.5px `rule` lines, with 0 12px 0 16px padding.
- Each row has a 9px tracked uppercase label in `ink-soft` on the left, an 11px summary on the right, and a 14px `ink-faint` chevron. The summary is `ink-soft`, or `ink-faint` when empty: "None", "Year Round", "Not worn yet". Worn is always `ink-faint`.
- Seasons show their 12px glyph and name, and only the glyphs once more than two are picked.
- Caption ends in a 32px pencil disc instead of a chevron. While editing, the row becomes an inline field: right-aligned 11px `ink` text on a 0.5px `warm-line` underline, with "Add a caption" in Cormorant italic `ink-faint` as the placeholder and a 32px clear × dimmed to 35% when empty. Enter or blur saves. No focus ring; the underline is the field.
- On a saved look it is followed by the full-width "Schedule look" **Button** in a footer over a `rule`.
