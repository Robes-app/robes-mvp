# TagsView
The Tags picker, a full-height subview that slides in over the drawer from Details › Tags.

Provide `tags` (`[{t, on}]`), `onToggle(i)`, `onDelete(i)`, `onAdd(text)` and `onBack`. `swiped` opens a row's delete action, for previews. In DraftLook, pass `sheet: 'tags'`, `tagOptions`, `onTagToggle`, `onTagDelete`, `onTagAdd` and `onSheetClose`.

- It shares the subview shell with SeasonsView and WornView. The header is 56px over a 0.5px `rule`: a back chevron (20px, `ink`), the 9px tracked title centred, and a 36px spacer. It slides in from the right over 0.28s on `cubic-bezier(.2,0,.2,1)`, and the body pads 20px.
- The list is `white` with a 0.5px `rule-mid` border and `rad` corners. Rows are 48px, with the tag in Cormorant 15px and a 15px check that shows only when the tag is picked.
- Swipe a row left to reveal Delete: `danger` with 12px `white` text. On a keyboard, press Delete.
- Footer: over a `rule`, a 44px `white` pill with the tag glyph, "Add a tag" in Inter 300 14px, and a 32px `cream-200` check disc dimmed until there is text.
