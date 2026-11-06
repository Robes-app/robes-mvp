# DescribeSheet
"Describe changes" is the floating sheet for regenerating a look from a sentence, keeping or dropping the pieces already in it.

Provide `pieces` (`[{name, img}]`), `onSend(text)` and `onClose`. `expanded` with `onExpand` and `onCollapse` switches the pieces count chip to one chip per piece; `onRemovePiece(i)` drops one. Use `value` and `onChange` to control the field. `canSend` defaults to having text. In DraftLook, pass `sheet: 'describe'`, `describeExpanded`, `onDescribeExpand`, `onDescribeCollapse`, `onDescribeRemovePiece`, `onDescribeSend` and `onSheetClose`.

- It uses the same floating shell as AdjustSheet: 8px from the drawer's edges, `rad-lg` corners, `shadow-sheet`, and a header with the 9px tracked title and a 36px `cream-200` close disc.
- The card is `white` with `rad-lg` corners and 10px 6px 6px padding. Its chip row comes first. The count chip is 28px with the hanger icon, the count, and a 20px toggle (‹ shows the pieces, › hides them). It's `warm-100` with a `warm-line` border while there are pieces.
- Piece chips are 28px `warm-100` pills, each with a 20px round photo, the name, and × "Remove from prompt".
- The input row is 48px with Cormorant italic 300 at 17px and the placeholder "e.g: more casual…". Send is a 40px `cream-200` circle with "→", dimmed to 40% until there is something to send.
