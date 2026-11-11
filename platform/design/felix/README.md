Felix is the design system behind **Robes**, a personal styling app: what to wear today, the week ahead, the lookbook and the wardrobe. It reads like a quiet fashion editorial — warm cream paper, ink type, one serif voice, photography doing the talking. Build every screen from these tokens and components; if a value isn't here, it isn't Robes.

## Principles

- **The look leads.** Photography is the hero of every screen. Chrome stays cream, hairline and small so the outfit carries the colour.
- **One serif voice, one quiet sans.** Cormorant speaks (greetings, names, questions); Inter labels (tiny, tracked, uppercase). Never swap their jobs.
- **Black is reserved.** `ink` fills the primary commit ("Schedule look", "New look") and the small plus disc that adds to a collection. Everything else is cream, white or outline. Never two ink pills in view.
- **Borders, not boxes.** Divide with 0.5–1px `rule` / `rule-mid` hairlines. Shadows appear only on things that float over photography or the page (`shadow-disc`, `shadow-sheet`).
- **Soft-rounded, never bubbly.** Pills for actions, `rad`–`rad-lg` for surfaces, circles for icon controls.

## Content fundamentals

- **Voice:** a calm personal stylist. Warm, brief, a little editorial. Second person, addressing her by first name: "Good morning, Annie."
- **Headlines pair a statement with a softer italic aside** in `ink-soft`: "The Today card. *It always holds the door.*" / "One OOTD. *Alerts in profile.*"
- **Questions in sheets** are short and human: "What did you wear?", "What are you dressing for today?", "Nothing saved yet."
- **Casing:** sentence case in copy. Labels, eyebrows, tabs, buttons and dock items are uppercase via their style (`label`, `eyebrow`, `dock-label`) — write them in sentence case in code.
- **Verbs on actions, one word where possible:** Capture · Describe · Pick · Swap · Edit · Schedule look.
- **Context lines** use middle dots: "Monday · Dublin · 11°C", "Tops · Adidas".
- **Names a look by its day or occasion:** "The Thursday one", "Set from 'Friday in Paris'".
- No emoji in UI copy, no exclamation marks, no filler stats.

## Colour

- Page ground is always `cream`. Raised lists and cards are `white` with a 0.5px `rule-mid` border.
- Text: `ink` for primary, `ink-soft` for secondary and uppercase labels, `ink-faint` for meta and nav links. All three pass 4.5:1 on `cream` and `white`.
- `cream-200` is the control colour — action discs, chips, small circular buttons. `cream-100` for quieter wells; `cream-300`/`cream-400` for handles, dashed edges and photo backs.
- The week strip's today cell is `warm-100` with a `warm-line` border; past worn marks are `warm-past`.
- Accents are earthy and small: `rose` for eyebrows, brand names, the nav alert dot and the selected filter chip (white text on `rose`); `sage` and `sage-mid` for the avatar and ownership; `mauve`, `rose-bg`, `sage-bg` as washes. `rose` is #856970 (darkened from the source's #8e7077): 4.7:1 on `cream`, with white on it at 4.9:1.
- `danger` only on a destructive reveal (swipe to delete); `alert` only for an unread dot. Neither is ever body text.
- Drawers dim the screen with `backdrop`, and dialogs over a drawer with `backdrop-strong`. Glass: `nav-glass` + `blur-nav` for the top bar, `dock-glass` + `blur-dock` + `dock-line` for the dock, `veil`, `veil-soft` and `scrim` for discs placed on photos. Action sheets are `sheet-glass` + `blur-sheet`. The Lookbook and Wardrobe header band is `band-glass` + `blur-band`, running up under a transparent nav.

## Type

- **Cormorant** (serif, 300–500, roman + italic) for anything she reads as content: `display` (48), `greeting` (32), `title` (24), `heading` (22), `day-number` (20), `italic-aside` (17 italic), `piece-name` (15), `wordmark`.
- Display weights stay 300–400. Floor serifs at 15px — weight 300 gets fragile below ~17px, so small serif text is 400.
- **Inter** (sans, 300–500) for interface: `body` (13/1.65), `meta` (11), and the tracked uppercase family — `eyebrow` (10, 0.24em), `dock-label` (9.5, 0.04em), `label` (9, 0.22em; 0.16em under discs), `category` (8.5, 0.18em).
- Headlines cap at 620px measure; single-input controls at 760px.

## Spacing and layout

- Mobile frame is 390px wide; content pads `space-5` (20px) at the sides and 24px on top, with ~120px at the bottom for the dock.
- Desktop shell is 1440px max, padded by `shell-gutter` (80 → 64 → 40 → 24px at 1200 / 1024 / 768).
- `nav-h` (64px) at every breakpoint. Every tap target is at least `tap` (44px) — enlarge the hit area, not the glyph.
- Grids: looks are two across with 12px rows and 10px columns, inside a 6px white card. Pieces are three across with 16px rows and 10px columns, flush on `shadow-card`.
- Rhythm: `space-3` inside rows, `space-4` between a heading and its content, `space-6` between sections, `space-7` between desktop columns.

## Shape, depth and motion

- Radii: `rad-sm` day cells, `rad` lists and cards, `rad-lg` sheets, `rad-dock` the dock, `rad-pill` every button and chip, circles for icon controls, `rad-tile` look tiles.
- Shadows: `shadow-disc` on action discs over a photo, `shadow-float` on small white discs, `shadow-card` on grid tiles and the empty-state disc, `shadow-sheet` on floating sheets, `shadow-modal` on dialogs. Nothing else casts a shadow.
- Motion is short and eased: 0.15–0.2s colour/opacity on hover and select; sheets slide up in 0.3s on `cubic-bezier(.2,0,.2,1)`; standard ease is `cubic-bezier(0.4,0,0.2,1)`.
- Focus: buttons and tappable rows get a solid 1.5px `ink` outline with a 2px offset (15:1 on cream). Text fields get no ring; the caret marks focus.

## Imagery

- Full-length, single-subject outfit photos, 4:5, soft natural light, neutral or real settings — see the **Imagery** assets. Photos run edge to edge inside their card.
- Garments in lists are close-cropped product shots — see **Pieces**.
- Controls on photos are circular: `veil` discs (cream glass) or `scrim` discs (dark glass with a white glyph), 36–44px, inset 12–16px from the corner.

## Iconography

- One outline set, 24px grid, 1.5px stroke, round caps and joins, coloured by `currentColor` — use the `Icon` component (SVG copies under **Icons**).
- Sizes: 20px dock, 19px discs, 17px sheet rows and nav bell (1.2 stroke), 11–14px inline.
- Weather is three small glyphs (cloud, sun, rain) that ride inline after the temperature.
- No emoji in the interface, no filled icon set, no illustration.

## Components

- **Three tabs:** Home, Lookbook and Wardrobe, with Diary in the dock. **TopNav** + **Dock** frame every mobile screen. The nav carries a centred serif title naming the tab, and the dock can carry a wardrobe count badge. Desktop drops the dock and lights a link in the nav.
- **Home:**
  - The greeting ("Good morning, Annie.") is the **TopNav** title. After five seconds it fades to the ROBES wordmark, and a tap brings it back.
  - Below the nav: weather meta line → **WeekStrip** → the look photo with **ActionDisc**s on its bottom edge → caption → **PageDots** when today has more than one look.
- **Lookbook:** a `glass` **TopNav** ("Lookbook") → **CollectionBar**.
  - The bar holds Saved · Suggested, a plus disc, and one row of category **FilterChip**s.
  - Below it, a two-across grid of **LookCard**s. Tapping one opens **SavedLook**.
- **Wardrobe:** a `glass` **TopNav** ("Your wardrobe") → **CollectionBar** (Owned · Wishlist · Shop with category chips) → a three-across grid of **PieceTile**s. Tapping one opens **WardrobePiece**: the photo, then Piece · Colour · Wearing tabs of editable rows.
- **Empty tabs:** an empty Lookbook or Wardrobe shows an **EmptyState**, which names what's missing and offers one ink pill.
- Building a look: **DraftLook**, the 3a Draft Look drawer. It has close · Draft look · done, the photo, Pieces / Details, an add slot, a prompt card and a Generate chip, and confirms before discarding. Once saved, it opens as a look's detail. Its sub-sheets are **ImageManager** (the photo stack), **AdjustSheet** (the sparkle), **DescribeSheet** (Regenerate), **WardrobePicker** (the add-pieces slot), and **TagsView**, **SeasonsView** and **WornView** (the Details rows).
- Choosing the model: **ModelStack** on the home photo opens **ModelPicker** ("Your model").
- Alerts: **AlertDialog** is the centred confirm ("Discard this draft?", "Save your changes") used before anything that can't be undone. The **TopNav** bell (with its `rose` dot) opens **NotificationsSheet**, and the avatar opens **SettingsView** (Style profile · Account).
- A look's detail: **SavedLook** (photo + back, adjust and image-stack controls) → **Tabs** (Pieces · Details) → **PieceList** (Included pieces: list or grid, edit, swipe to swap or remove) or **LookDetails** → a full-width **Button** `primary` in a footer over a `rule`.
- A wardrobe piece: **WardrobePiece**. The piece name is the nav title, then the photo, then Piece · Colour · Wearing. An owned piece ends with an outline "Delete piece"; a shop piece ends with an ink "Add to wardrobe".
- The `ink` plus buttons open a glass **Sheet** of two or three tiles: "New look" (Describe · Photo · From pieces) on Lookbook, "Add pieces" (Paste URL · Photo · From receipt, with an inbox count) on Wardrobe.
- The **Wordmark** is typeset — there is no drawn logo file.
