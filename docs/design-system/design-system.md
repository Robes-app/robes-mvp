# Robes Design System — designer hand-off reference

Extracted from the live beta build (beta.byrobes.com, branch `beta`) on 2026-08-25.
Everything here is measured from shipping code, not aspiration. Sources of truth in the repo:

- **`/public/css/tokens.css`** — the token file every page links first. If this document and that file ever disagree, tokens.css wins.
- **`/public/specimen.html`** (live at `beta.byrobes.com/specimen`, unlinked + noindex) — the brand guidelines page that renders the tokens live. Open it next to Figma while building styles.
- **`docs/design-system/tokens.json`** — the same tokens in Tokens Studio format for direct Figma import.

---

## 1 · Brand foundation

**"Warm, not cold. Restrained, not minimal."** Jacquemus meets Bottega — editorial luxury in product form. Robes is a stylist's hand, never a tech product's.

- The word **"AI" never appears** anywhere the user reads. Robes *reads, files, composes, dresses* — verbs of hands, not processors. ("Generating…" is equally banned.)
- The interface is quiet so the *clothes* are the colour. UI chrome is warm neutrals; the three accents whisper; garment imagery and swatches carry the vibrancy.
- The user is "she" throughout product thinking. Her words always outrank a rewrite.

## 2 · Colour

### Neutrals (do all the work)

| Token | Value | Use |
|---|---|---|
| `--cream` | `#FAF8F5` | The ground everything sits on |
| `--cream-100` | `#F5F0E8` | Panel fills, chips, recessed wells |
| `--cream-200` | `#EFE9DC` | Image placeholders |
| `--cream-300` | `#E7E0CF` | Opaque borders (landing surfaces) |
| `--cream-400` | `#D8CFC0` | Dashed invites, deep tint, disabled fills |
| `--ink` | `#202021` | Primary text, filled CTAs, dark panels |
| `--ink-soft` | `#6E6A64` | Secondary text |
| `--ink-faint` | `#7E6F50` | Eyebrows, meta, hints — the *warm* tertiary |
| `--rule` | `rgba(32,32,33,0.075)` | Hairlines (quiet) |
| `--rule-mid` | `rgba(32,32,33,0.12)` | Hairlines (firmer — card borders, controls) |

### Accents (never body text)

| Token | Value | Semantic |
|---|---|---|
| `--mauve` | `#D4C8C4` | Trips, pinned days, day-scope. Decorative only |
| `--rose` | `#8E7077` | Brand accent — large labels/icons only |
| `--sage` | `#7E7C5A` | Weeks, worn-state, progress — large labels/icons only |
| `--rose-bg` / `--rose-mid` | rgba washes | Trip bands + tints |
| `--sage-bg` / `--sage-mid` | rgba washes | Week bands + tints |

### Special surfaces (hardcoded by design, not in tokens.css)

| Value | Use |
|---|---|
| `#F2EEE7` | The tinted full-bleed band (Styling Concierge, guide bands). **Exactly one band per screen** |
| `#E1DACB` | The on-tint hairline — cream-300 disappears against the band tint |
| `#F3EFE6` fill + `#C9BCA6` border + small ink ✓ | The selected state, app-wide — **never a heavy black fill** |
| `#202021` (occasionally `#1C1C1B`) | Dark stylist panels ("The Look" moodboard panel, dark onboarding screens) — the only dark surfaces |

### Contrast law (WCAG 2.2 AA, measured on cream)

| Colour | Ratio | May carry text? |
|---|---|---|
| `--ink` | 15.4:1 | Yes — any size |
| `--ink-soft` | 5.1:1 | Yes — body and smaller |
| `--ink-faint` | 4.6:1 | Yes — the smallest text tier lives here |
| `--rose` / `--sage` | 4.2 / 4.0:1 | Large labels + icons only (≥19px bold / 24px) |
| `--mauve` + all tints | <2:1 | Never — surfaces and ornament only |

## 3 · Typography

Two families, loaded from Google Fonts:

```
https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Inter:wght@300;400;500&display=swap
```

- **Cormorant** (the plain display cut — ratified over Cormorant Garamond by founder decision, 27 Jul 2026). Display only, weights 300–400. **Floor ~17px** — weight 300 gets fragile below that. *Italic Cormorant is the brand's accent voice* — the second line of a headline, a hint, an aside.
- **Inter** 300/400/500 for body and UI. **Floor 9px**, and anything below ~10px must be uppercase + letter-spaced.

### The scale (as shipped)

| Style | Spec | Notes |
|---|---|---|
| Masthead | Cormorant 300 · 52px · lh 1.1 | Italic second line in `--ink-faint` ("Your piece, *worn three ways.*") |
| Section head | Cormorant 300 · 30–32px · lh 1.15 | |
| Card title | Cormorant 300/400 · 22–23px · lh 1.2 | 2-line clamp |
| Serif floor | Cormorant 300 italic · 17px | Hints, whispers, stat lines ("6 looks · 4 travel edits") |
| Wordmark | Cormorant 400 · 17px · .34em tracking · uppercase | ROBES |
| Body | Inter 300 · 13–14px · lh 1.7 | `--ink-soft` |
| UI labels | Inter 400/500 · 11–12.5px | Buttons, menu items, meta |
| Eyebrow | Inter 500 · 10px · .2em · uppercase · `--ink-faint` | Above every section and card. (The R1 home register runs 400 / .24em) |
| Small-caps CTA | Inter 500–600 · 9–11px · .14–.2em · uppercase | The house CTA voice — earns its place by being small, never loud |

The workhorse UI sizes in the shipped CSS cluster at **9 / 9.5 / 10 / 10.5 / 11 / 11.5 / 12 / 12.5 / 13 / 13.5 / 14px** — small type, generously spaced.

## 4 · Structure & space

| Token | Value |
|---|---|
| `--shell` | 1440px max content width, centred. Nav bar bleeds full-width; its content aligns to the shell |
| `--nav-h` | 64px sticky nav |
| `--s6` gutter | 80 → 64 → 40 → 24px at 1200 / 1024 / 768 breakpoints |
| `--rad-sm / --rad / --rad-card / --rad-lg` | 8 / 12 / 14 / 18px |
| Pills | Always `border-radius: 100px` |
| `--ease` | `cubic-bezier(0.4, 0, 0.2, 1)` — everything moves on this curve |

### Breakpoints

- **<768px** — the mobile shell: glass dock nav (3 tabs), single columns, bottom sheets, FABs. Result-page action rows clear the dock.
- **768–1023px** — tablet band, deliberately **desktop-shaped** (portrait iPad never collapses to the phone shell). `--s6` = 40px.
- **1024–1199px** — `--s6` = 64px. **≥1200px** — `--s6` = 80px.

### Reading measures

Prompt box 760px · masthead 620px · long-form prose ≤720px · travel summary 900px.

### Grid rhythms

Wardrobe grid 5/4/3/2 columns (gap 16) · Lookbook grid 3/3/2/1 (gap 20) · capsule grids 6/4/4/3 (gap 16). All tracks are `minmax(0,1fr)` — a cell never widens its column.

### Z-index ladder (for prototyping stacked screens)

Result overlays 40 → Lookbook/Inspiration pages 45 → mobile dock 48 → nav 50 → pack bar 60 → rename/share sheets 200 → wardrobe modal 300 → adjust sheet 400 → styling modals 950 → form pickers 990 → Coming Soon 1000.

## 5 · Component language

A small set of moves, repeated with discipline.

### Two card registers (both live — know which you're in)

1. **Token register** (app chrome, panels, modals): white on cream, 0.5px hairline (`--rule-mid`), token radii (8–18px), shadows only on floating elements.
2. **R1 refinement register** (2026-08: home, Lookbook, concierge band): white cards on **1px `--rule`** at a sharper **3–4px radius**, generous photography windows (160–260px, `object-position` pulled toward heads), serif 22px titles, quiet 11–12px meta. Section headers follow the **R1 rule: eyebrow left, its one action right, a hairline under the pair.**

### Buttons

| Tier | Anatomy | Rule |
|---|---|---|
| Primary | Ink fill `#202021`, cream text, 100px pill, small-caps 9–11px tracked | **A black fill means the one real commitment on the screen — exactly one per screen** (Style Me, Save this look, Start packing). Everything else demotes |
| Secondary | White/transparent, 0.5px `--rule-mid` hairline, 100px pill, 11–12.5px | |
| Tertiary | Underlined text link, `--ink-faint` → `--ink` on hover | Text CTAs (10px tracked + 15px arrow) close card footers |
| Ghost/dashed | 1.5px dashed `--cream-400`, transparent | Dashed = an invitation, or not-yours-yet |
| Disabled | `--cream-400` fill, stays rendered | A withheld button renders visibly disabled with an on-screen reason — it never disappears (a missing button reads as broken) |

One deliberate outlier: the ghost "Catalogue what you're wearing now" CTA at **2px radius** — the only non-pill button in the app.

### Selected / active states

Warm cream fill `#F3EFE6` + `#C9BCA6` border + a small ink dot or ✓ — never heavy black fills. **An ink border means *selected*** (anchored piece, active day) — never use ink borders on notice panels; notices are hairline + cream.

### Chips & tags

- Season chips: sage tint. Wear-it-for chips: rose tint. Both axes keep their tints everywhere (form + filters).
- Provenance/meta chips: small-caps eyebrows on card frames (slot labels, "LOOK", "DAY 3").
- The interpunct **·** separates meta fragments ("12 pieces · 7 looks · 31 Jul – 4 Aug").

### The tinted band

`#F2EEE7` with `#E1DACB` hairlines, full-bleed within the shell (negative gutters), 1px `--rule` top/bottom. Exactly **one band per screen**. Content inside stays on the page grid. Nothing filled/dark inside the band — text CTAs only; the prompt keeps the page's one dark button.

### The prompt box (concierge)

White card, `--rad-card`, 0.5px `--rule-mid`; focus ring = rose-tinted border + soft rose glow. Holds the page's single filled CTA (STYLE ME). Attachment chips render inside; a typewriter placeholder demos prompts. Max width 760px.

### Day cards (the diary spine — home rail, trip strip, month view)

Text-led calendar cells, **no imagery**: eyebrow (relative label + short date, e.g. "TODAY · THU 23"), serif activity title (her words verbatim, 2-line reserve), quiet evening line, membership chip (dot-coded: cream = daily, sage = week, mauve = trip), up to 3 colour swatch dots from the day's owned pieces (never placeholder dots). States: past (dimmed) / today (ink ring) / future (outlined) / free ("Left free." — italic, dashed) / pinned (mauve ring) / empty (dashed invitation). Min-height 172–176px desktop, 158px mobile.

### The console (Look panel + Rack — every generated result)

- **Left, "The Look"**: the one dark surface — ink stylist panel with a 2-col tile board (first tile wide), mood quote, palette dots, "N of M from your wardrobe".
- **Right, "The Rack"**: white product rows — 3:4 image cell with slot label (Top / Bottom / Shoes / Bag — plain words, never jargon), serif name, one provenance line ("✓ In your wardrobe · Worn 5×" **or** "Brand · Retailer · €price" — never both), flick arrows + dots, actions (Anchor / Swap / Save). Role strips (The Canvas / The Anchor / The Texture / The Exclamation Point) head groups as hairline captions.
- Mobile: one column, single-line rows (slot · status above the name), 56px thumbs, 44px controls, share as a 34px circle badge.

### Modals & sheets

Desktop: centred dialog, max-width ~480px, radius 18–20px, cream/white, z-950. Mobile ≤767px: bottom sheets sized with `dvh` + `env(safe-area-inset-bottom)`, grab bar + title + ✕ header; pickers become bottom sheets where desktop uses anchored popovers. **Never native OS dropdowns** for styled choices — custom pickers everywhere.

### Imagery rules

3:4 portrait is the default frame. Mosaic look-tiles adapt to live cell count (1 fills, 2 split, 3 give the first a 2-row span, 4+ quartet) — **no empty half, ever**. A frame self-hides on error; a missing frame settles to a **serif monogram tile** (first letter on cream) — "an empty card reads as broken; a monogram reads as pending." Generated imagery is full-body, head-to-toe, never cropping face/hands/feet, warm-grey studio.

### Symbols

Typographic only — ✦ ☾ ✓ ↺ ‹ → · ⊕ ✎. Platform emoji never ship in chrome (the weather glyph is the one earned exception). Glyph buttons (like the strip's quiet ⊕) are SVG, never text characters.

## 6 · Interaction & product laws

These are enforced conventions, not suggestions — several are pinned by regression harnesses:

1. **One dark fill per screen.** The single black pill marks the screen's one commitment.
2. **Nothing is ever locked.** Features never gate on progress; copy never says lock/unlock. Progress buys *quality*, not access.
3. **No denominators.** Piece counts render bare ("7 pieces filed"), never "7 / 15" — a denominator reads as a cap. Progress meters never fill to 100%.
4. **Hover reveals actions, never information.** Metadata prints; verbs (✕, Wear, star) may hover-reveal on desktop and stay visible on touch.
5. **Dashed = invitation.** Empty slots, add doors, not-yours-yet.
6. **Her words render verbatim** (never sentence-cased or rewritten); a Robes-authored title is a **name, not a sentence** — 2–4 words, Title Case, no trailing stop.
7. **Empty states are one door.** A headline, one line, one primary action — never three competing CTAs. Examples render dimmed/badged ("ROBES EXAMPLE · not yours") and inert.
8. **Every route lands on the home prompt** (structured intakes — travel brief, key-piece modal — are the deliberate exceptions).
9. **Selected ≠ notice.** Ink border only ever means selected/active.
10. **Deletes always confirm** ("Delete this look?" modal) — never on a bare tap. Wear-logging is the inverse: a tap IS the wear, with a quiet inline undo, no dialog.
11. **Save is a commitment moment.** Generated looks are kept only when she keeps them; naming gates saving (she names what she builds; Robes offers names for what it builds — "Robes' name for it. Yours to change.").
12. **Exactly one band per screen**; exactly one vibe per look; one filled CTA per card family.

## 7 · Voice & register

- **Never "AI", never "generating".** Robes reads, files, composes, dresses.
- **Errors own the failure warmly**: "Robes couldn't finish those looks — please try again in a moment." Never raw server text.
- **Banned constructions**: *effortlessly · elevated · versatile · perfect for · ensuring · "X yet Y"* — and **no exclamation marks, anywhere**.
- **The italic is the wink**: the serif's italic second line carries the charm ("worn three ways." · "dressed for anything.") so the sans stays plain and working.
- **Honesty over promise**: below 15 pieces, copy says looks are woven from what she owns plus editorial fills — never claims closet-only styling it can't deliver. Her decisions are named as hers: "Left free.", never "Nothing yet."
- Sentence case for generated labels (occasion labels etc.); ALL-CAPS only in the small tracked eyebrow tier.

## 8 · Accessibility floor

- Text ≥4.5:1 on its surface; accents demoted to large-label duty.
- Type floors: 9px UI (uppercase + tracked only) · ~17px serif.
- Touch targets 44px minimum — small controls get invisible `::after` hit areas.
- Global `:focus-visible`: 2px ink outline, 2px offset. One focus indicator per control (containers use `:focus-within`).
- Zoom never locked; inputs 16px on mobile so iOS focus-zoom has no reason to fire.
- Decorative animation behind `prefers-reduced-motion`.

## 9 · The garment palette (product data, not UI)

The editorial tri-tier swatch system used for wardrobe filing, colour filters, and swatch dots — 21 swatches (full hex values in `tokens.json` → `garment-palette`):

- **Foundations (6)**: White, Cream, Navy, Charcoal, Black, Espresso
- **Dimension Builders (7)**: Camel, Taupe, Olive, Aubergine, Forest, Bordeaux, Blush
- **Exclamation Points (8)**: Ochre, Magenta, Cobalt, Emerald, Vermillion, Acid, Multi (conic gradient), Print (diagonal stripe)

White renders with an inset cream-400 edge; unknown colour names get a quiet cream disc.

## 10 · Assets & code pointers

| What | Where |
|---|---|
| Design tokens (canonical) | `public/css/tokens.css` |
| Live brand guidelines | `public/specimen.html` → beta.byrobes.com/specimen |
| Fonts | Google Fonts (Cormorant + Inter, weights above); self-hosted woff2 copies in `public/dashboard-assets/` |
| App icons / wordmark | `public/images/robes-icon-{64,192,512}.png`, `public/apple-touch-icon.png` |
| Card photography | `public/images/looks/look1/2/3.jpg` |
| Main app styles | `public/dashboard.html` (inline `<style>`), injected component CSS in `public/js/dashboard-personalize.js` (`_RBC_CSS` console, `#rb-dc-style` day cards, etc.) |
| Garment palette source | `_ALL_SWATCHES` in `public/js/dashboard-personalize.js` |
