# Robes Platform — Design System Spec

Status: **normative** for tokens and the token pipeline; component list is the build target for milestone M2 (see `plans/`).

Inputs:
- `reference/brand-and-design.md` — extracted brand voice, palette, type, components, accessibility gaps (read §1 voice + naming map before writing any copy).
- `reference/tokens.draft.json` — consolidated token values found in the legacy product (`status: proposed` marks values that don't exist yet, e.g. dark mode).
- `reference/stack-versions.md` §Token-sharing approach — why Tailwind v4 + Uniwind and how the pipeline works.
- `../design/felix/` — the Felix Design System (tokens, component guidelines, icons, imagery), exported from its claude.ai artifact; see `../design/README.md`.
- Legacy canon: `public/css/tokens.css` and `public/specimen.html` on branch `platform` (= beta). The brand line is **"Warm, not cold. Restrained, not minimal."**

---

## 1. Goals

1. **One source of truth** for colour, type, spacing, radius, shadow and motion, typed in TypeScript, consumed identically by web (Tailwind v4) and native (Uniwind on Tailwind v4). `bg-surface text-ink rounded-card` means the same thing on both.
2. **Semantic first.** Components use semantic tokens (`surface`, `ink`, `ink-muted`, `hairline`, `accent-inspire`, `accent-plan`, `danger`), never raw brand values, so light/dark and future re-brands are a token change.
3. **Accessible by construction.** Every text/background pair used by a component is contrast-tested in CI (WCAG 2.2 AA: 4.5:1 body, 3:1 large text and UI boundaries/focus).
4. **Brand rules encoded, not remembered.** Copy rules and "one filled button per screen" become lint rules, component APIs and Storybook docs rather than paragraphs in CLAUDE.md.

## 2. Packages

```
platform/packages/
  tokens/        source tokens.ts → generated theme.css, web.css, native.css, tokens.js(+d.ts)
  ui/            web React components (Tailwind v4, Radix primitives where behaviour is complex)
  ui-native/     React Native components (Uniwind classNames, same names/props as ui/ where sensible)
  copy/          product vocabulary, error messages, empty states, microcopy (typed dictionary; i18n-ready)
  icons/         SVG source icons → React (web) + react-native-svg components, one set
```

`ui` and `ui-native` export the **same component names and prop contracts** for primitives (Button, Text, Heading, Pill, Card, Sheet, Field, Toast, Skeleton, Image). Composite, platform-specific screens live in the apps.

## 3. Token pipeline

Follow `reference/stack-versions.md` §Token-sharing approach exactly. Summary:

1. `packages/tokens/src/tokens.ts` — primitives (`palette`, `space`, `radius`, `font`, `size`, `leading`, `tracking`, `shadow`, `motion`, `z`, `breakpoint`) + semantic maps `light` and `dark` (`Record<SemanticColor, PaletteRef>`), validated with zod.
2. `pnpm --filter @robes/tokens build` generates:
   - `dist/theme.css` — Tailwind v4 `@theme` block with primitives and semantic indirections (`--color-surface: var(--surface)`).
   - `dist/web.css` — `:root` light values, `@media (prefers-color-scheme: dark) :root:not([data-theme=light])`, `[data-theme=dark]`.
   - `dist/native.css` — Uniwind `@layer theme { :root { @variant light {…} @variant dark {…} } }`.
   - `dist/tokens.js` + `.d.ts` — raw values for navigation themes, status bar, charts, `expo-image` placeholders, email templates.
   - `dist/contrast-report.json` — computed contrast for every declared pair (see §6).
3. Web `app/src/app/globals.css` imports `tailwindcss`, `@robes/tokens/theme.css`, `@robes/tokens/web.css`, and `@source "../../../packages/ui"`.
4. Native `mobile/global.css` imports `tailwindcss`, `uniwind`, `@robes/tokens/theme.css`, `@robes/tokens/native.css`, `@source "../packages/ui-native"`.
5. Only utilities both engines support go in `theme.css`; web-only extras (layered shadows, backdrop blur) go in `web-extras.css`.
6. Emails (React Email) import `tokens.js` for inline styles — fixes the legacy email using Cormorant Garamond and the failing `#A89880` footer colour.

## 4. Token values (seed)

Seed `tokens.ts` from `reference/tokens.draft.json`. Canonical values (all contrast-verified; the M0 plan's `tokens.ts` is the source of truth once it exists):

| Role | Light | Dark (proposed) | Notes |
|---|---|---|---|
| `bg` (page) | cream `#FAF8F5` | ink `#202021` | |
| `surface` | cream-100 `#F5F0E8` (panels, cards) | `#2A2A2B` | Pure white `#FFFFFF` stays a palette value for photo mats only |
| `surface-sunk` | cream-200 `#EFE9DC` | `#252526` | Tracks, placeholders, tags, unselected Month days |
| `surface-raised` | white `#FFFFFF` | `#2A2A2B` | Beta's white cards: cards, fields, the prompt box, a selected chip or segment (2026-10-25) |
| `rule-mid` | ink @ 12% | cream @ 16% | Edge of a labelled control (pill, + button, segment, prompt box, selected day) — the label is the cue, so it needn't reach 3:1 |
| `ink` | `#202021` | cream `#FAF8F5` | |
| `ink-muted` | `#6E6A64` | `#B9B3A8` | 5.07:1 on bg light; 7.81:1 dark |
| `ink-faint` | `#74664A` (darkened from legacy `#7E6F50`, which fails 4.5:1 on cream-100) | `#A89E8C` | ≥4.64:1 on every light surface |
| `hairline` | ink @ 7.5% | cream @ 10% | Decorative separators only |
| `border-control` | ink @ 50% | cream @ 40% | **New**: form fields need ≥3:1 boundary (legacy ~1.3:1) |
| `accent-inspire` (rose) | `#8E7077` | `#B8969D` | Large text / icons / fills only; never body text (4.18:1) |
| `accent-plan` (sage) | `#7E7C5A` | `#A9A67E` | Same rule (4.03:1) |
| `accent-decor` (mauve) | `#D4C8C4` | `#D4C8C4` | Decorative only |
| `success` | `#3F6B4C` (darkened from legacy `#4A7C59`, 4.29:1 on cream-100) | `#7FB08E` | |
| `danger` | `#B5483A` (Felix, 2026-11-06; was `#8B3A30`) | `#E08A7E` | 5.0:1 on bg, 4.7:1 on surface; white label on it 5.3:1 |
| `focus-ring` | ink | cream | 1.5px, offset 2px (Felix, 2026-11-06), visible everywhere |

**Typography**
- Display/serif: **Cormorant** (not Cormorant Garamond), weights 300 and 400, italic 300 and 400. Minimum size 17px, except Felix's `piece-name` at 15px in 400 (D6, 2026-11-06).
- Sans/UI: **Inter**, weights 300, 400 and 500 (Felix). Ban 600 and 700.
- Both SIL OFL, self-hosted: web via `next/font/local` from `app/src/app/fonts/` (the variable Latin woff2 files of `design/felix/fonts/`; a build never fetches Google Fonts); native via `@expo-google-fonts/*`, bundled in the app.
- Type scale: Felix's twelve styles are `typeScale` in `tokens.ts` (`display` 48, `greeting` 32, `title` 24, `heading` 22, `day-number` 20, `italic-aside` 17 italic, `piece-name` 15; `body` 13/1.65, `meta` 11, `eyebrow` 10/500/0.24em, `label` 9/500/0.22em, `category` 8.5/500/0.18em). Web uses the `type-<name>` utilities, native `typeStyle()` or `Text variant`. Eyebrows are `ink-soft` (`ink-muted`), a sheet's the rose for small text (`accent-warm`). Supersedes the 2026-10-25 eyebrow (12px, 400, `ink-faint`).

**Shape**: Felix's radii (`radius` in `tokens.ts`): `xs` thumbnails, `crisp` worn rows, `tile` look tiles, `sm` day cells, `thumb` model cards, `soft` lists, cards and inputs, `card` larger cards and dialogs, `sheet` sheets, `dock` the dock, `pill` every pill. Edges are Felix's fine 0.5px `rule-mid` on cards, lists, outline buttons and unselected pills. No ad-hoc radii.

**Motion**: Felix's: colour and opacity 0.15–0.2s; sheets slide up in 0.3s on `cubic-bezier(.2,0,.2,1)`; dialogs fade in over 0.2s. Respect `prefers-reduced-motion` / `AccessibilityInfo.isReduceMotionEnabled`.

**Felix Design System (2026-11-06).** `platform/design/felix` is the design reference and its token values are adopted in `tokens.ts`, under the names its components use (`warm-line`, `warm-past`, `warm-dash`, `alert`, `backdrop`, `backdrop-strong`, `scrim`, the `veil` family, `nav-glass`, `dock-glass`, `dock-line`, the rose and sage washes; radii `xs`, `tile`, `thumb`, `dock`; shadows `disc`, `sheet`, `modal`, `dialog`; `blur`). Where a Felix value misses the accessibility floor, the floor wins: `ink-faint` stays `#74664A`, small rose text stays `accent-warm`, and `warm-past` is darkened to `#968973` (3:1 on cream). The draft tokens of 2026-11-05 were renamed to Felix's: `glass` → `veil`, `hairline-strong` → `rule-mid`, `border-warm` → `warm-line`, `scrim` (0.28) → `backdrop`; `scrim` is now Felix's dark disc (0.55). Felix has no dark theme: the dark values for its tokens are proposed.

**Colour rules (2026-10-25).** Rose marks *now* and *Robes' hand* — today's label and dot, today's rule in Diary, Draft, the why-this-look mark, Robes' own labels, a wishlisted piece — one or two per screen. Small rose text (under 24px) is `accent-warm`; dots, rules and icons `accent-inspire`. Mauve (`accent-decor`) is a surface only (trip bands, a pinned day's ring, the day-scope chip), never text.

## 5. Component inventory (build targets)

Primitives (both `ui` and `ui-native`, same props):

| Component | Notes / encoded rules |
|---|---|
| `Text`, `Heading`, `Eyebrow` | `Text variant` takes a Felix type style; Heading enforces Cormorant ≥17px; Eyebrow is Felix's `eyebrow` |
| `Button` | Felix's variants `primary` (filled ink, 48 — **max one per screen**, dev-mode warning if two mount, D3), `outline` (white on `rule-mid`, 40), `chip` (`surface-sunk`, 28), plus `quiet` (text); every one keeps a 44 hit area; `loading` never says "Generating" |
| `IconButton` | 44×44 min hit area |
| `Pill` / `Chip` | Felix's pills, 32 (md) and 28 (sm). **Selected is warm, never black**: the `selected` fill (#F3EFE6) on a 1px `selected-line` (#C9BCA6), ink text and a check (D1/D2, 2026-11-06) — any selected control uses these two tokens, never an ink fill or ink outline. Unselected: white on 0.5px `rule-mid`, ink label |
| `Card` (`PieceCard`, `LookCard`, `RackCard` variants) | aspect ratios from reference §5; blur placeholder; skeleton twin |
| `Image` | wraps `next/image` loader / `expo-image` with our CDN loader, `sizes`, blurhash/thumbhash placeholder |
| `Sheet` / `Dialog` / `AlertDialog` | Felix's Sheet (rose eyebrow, one question, `rows`; floating 8 from the edges); `AlertDialog` the centred confirm for what can't be undone; focus trap; no confirm dialogs for reversible actions — use `Toast` with Undo |
| `Field`, `TextArea`, `Select`, `SegmentedControl`, `Tabs` | visible 3:1 borders; error text uses `danger` + icon; `Tabs` is Felix's underline rail (Pieces · Details), in place of a segmented track inside a look (D6) |
| `Toast` | supports action (Undo) |
| `Skeleton` | shape-matched to final layout |
| `Progress` (generation) | staged: "Styling your pieces" → per-image fill; copy from `packages/copy` |
| `EmptyState` | title, body, one action; copy from `packages/copy` |
| `Avatar`, `TabBar` (native), `NavRail`/`TopBar` (web) | IA per `SPEC.md` §UX |

**Counts**: never show a count as a fraction (`4 / 15`, `4 of 15`) — a denominator reads as a limit. Print the bare count ("4 pieces filed") or the distance ("Two more pieces and…").

## 6. Quality gates

- **Contrast CI**: `packages/tokens/test/contrast.test.ts` asserts every pair declared in `tokens.ts` `pairs` list meets its target in both modes. Adding a new text/bg combination requires declaring it.
- **Visual regression**: Storybook (web `@storybook/nextjs-vite`) + Chromatic or Playwright screenshots for primitives in light/dark.
- **Copy lint**: `packages/copy/test/banned.test.ts` scans `app/`, `mobile/`, `packages/ui*` for banned terms from reference §1 (e.g. "Generating", "Holiday", "Calendar" as a product noun, lock language) and fails CI.
- **Accessibility**: `@axe-core/playwright` on key routes; native: `accessibilityLabel` required by a custom lint rule on `IconButton`/`Pressable`.
- **No raw colours**: Biome/grit rule bans hex literals and arbitrary Tailwind values (`bg-[#…]`) outside `packages/tokens`.

## 7. Open decisions (flag to founder)

1. Dark mode is proposed, not existing. Ship light-only at M2 with dark tokens defined and tested, enable when designed? **Default: ship light-first, dark behind a setting in M5.**
2. Radius families: confirm the soft (native/sheets) vs crisp (editorial) split.
