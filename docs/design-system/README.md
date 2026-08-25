# Robes design system — hand-off package

Everything a designer needs to set up the Robes design language in **Figma** or **Claude Design**, extracted from the live beta build (2026-08-25).

## What's in the package

| File | What it is |
|---|---|
| [`design-system.md`](./design-system.md) | The full written reference — colour, type scale, structure, component language, the interaction laws, voice, accessibility, and where everything lives in code |
| [`tokens.json`](./tokens.json) | The design tokens in **Tokens Studio for Figma** format — colours, type styles, radii, spacing, plus the 21-swatch garment palette |
| Live guidelines | **beta.byrobes.com/specimen** — the brand-guidelines page rendering the real tokens live (unlinked, noindex). Open it beside Figma while building styles |

## Setting up Figma

1. **Fonts** — enable [Cormorant](https://fonts.google.com/specimen/Cormorant) (300/400/500 + italics; the plain "Cormorant" cut, **not** Cormorant Garamond) and [Inter](https://fonts.google.com/specimen/Inter) (300/400/500). Both are Google Fonts, available natively in Figma.
2. **Tokens** — install the *Tokens Studio for Figma* plugin → Tools → Load from file → `tokens.json`. This creates the colour styles, type styles, radii and spacing variables. (Without the plugin: transcribe the tables in `design-system.md` §2–4 — there are only ~20 colours, 9 type styles and 5 radii.)
3. **Frames** — desktop artboards at 1440 wide (the shell) with the stepped gutter (80px), mobile at 390 wide (24px gutters). Tablet 768–1023 stays desktop-shaped.
4. **Reference screens** — the live beta is the component library: home (concierge band, day rail, prompt box), Wardrobe grid, Lookbook cards, a Daily Look console, the Travel Edit. `design-system.md` §5 describes each pattern's anatomy.

## Setting up Claude Design

Give Claude Design the two files in this folder as project context (or paste `design-system.md` wholesale). The critical instructions to carry over:

- Use the exact token values from `tokens.json`, never approximations.
- Cormorant 300–400 display (≥17px), Inter body/UI (≥9px, tracked-uppercase below 10px).
- One black-filled pill per screen; selected states are warm cream + `#C9BCA6` border + ✓, never black fills; dashed = invitation.
- Never the word "AI", never exclamation marks, no lock/unlock language, no "n / 15" denominators.

## The five rules that define the look (if you read nothing else)

1. **Warm, not cold. Restrained, not minimal.** Cream ground, hairline rules, small tracked type, generous space. The clothes are the colour; the UI whispers.
2. **Cormorant italic is the charm** — the second line of every masthead ("Your piece, *worn three ways.*"). The sans stays plain and working.
3. **A black fill = the one commitment on the screen.** Everything else is hairline pills, text links, or dashed invitations.
4. **Nothing is locked, nothing is counted against a cap.** Progress buys quality, not access.
5. **Robes speaks as a stylist** — reads, files, composes, dresses. Never "AI", never "generating", no exclamation marks.
