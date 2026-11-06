# ModelPicker
"Your model" from frame 3a is a bottom sheet for choosing which body the looks are rendered on. It opens from the ModelStack badge on the home photo.

Provide `models` (`[{src, name, bs, bp}]`), `value` (the selected index), `onPick(i)`, `onOwn` and `onClose`. `bs` and `bp` set the background size and position that crop each photo to the face. The defaults suit a full-length 4:5 photo: `450% auto` at `50% 9%`.

- It's a bottom sheet over a `backdrop` that fades in over 0.25s. `cream`, `rad-lg` top corners, 12px top and 30px bottom padding, sliding up in 0.3s. Tapping the backdrop closes it.
- Header: 40px tall with 20px sides. The 9px tracked "Your model" title is in `ink-soft`, next to a 36px `cream-200` close disc.
- Cards sit in one sideways-scrolling row, 10px apart, with 20px padding at each end. Each card is 96 × 120 with `rad-thumb` corners, cropped to the face on `cream-200` with a hairline `rule-mid` ring.
- The selected card gets a 2px `ink` ring and a 20px `ink` disc with a `cream` check in its top-right corner. Picking a card applies it.
- The first card is "Use my likeness": a dashed `cream-400` card on `cream-100` with a 48px `white` disc holding the 22px camera. It uploads a photo of her own.
