# Robes Platform — Design System Spec

Status: **normative** for tokens and the token pipeline; component list is the build target for milestone M2 (see `plans/`).

Inputs:
- `reference/brand-and-design.md` — extracted brand voice, palette, type, components, accessibility gaps (read §1 voice + naming map before writing any copy).
- `reference/tokens.draft.json` — consolidated token values found in the legacy product (`status: proposed` marks values that don't exist yet, e.g. dark mode).
- `reference/stack-versions.md` §Token-sharing approach — why Tailwind v4 + Uniwind and how the pipeline works.
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
| `surface-sunk` | cream-200 `#EFE9DC` | `#252526` | |
| `ink` | `#202021` | cream `#FAF8F5` | |
| `ink-muted` | `#6E6A64` | `#B9B3A8` | 5.07:1 on bg light; 7.81:1 dark |
| `ink-faint` | `#74664A` (darkened from legacy `#7E6F50`, which fails 4.5:1 on cream-100) | `#A89E8C` | ≥4.64:1 on every light surface |
| `hairline` | ink @ 7.5% | cream @ 10% | Decorative separators only |
| `border-control` | ink @ 50% | cream @ 40% | **New**: form fields need ≥3:1 boundary (legacy ~1.3:1) |
| `accent-inspire` (rose) | `#8E7077` | `#B8969D` | Large text / icons / fills only; never body text (4.18:1) |
| `accent-plan` (sage) | `#7E7C5A` | `#A9A67E` | Same rule (4.03:1) |
| `accent-decor` (mauve) | `#D4C8C4` | `#D4C8C4` | Decorative only |
| `success` | `#3F6B4C` (darkened from legacy `#4A7C59`, 4.29:1 on cream-100) | `#7FB08E` | |
| `danger` | `#8B3A30` | `#E08A7E` | |
| `focus-ring` | ink | cream | 2px, offset 2px, visible everywhere (legacy missing on several pages) |

**Typography**
- Display/serif: **Cormorant** (not Cormorant Garamond), weights 300 and 400, italic 400. Minimum size 17px (brand rule).
- Sans/UI: **Inter**, weights 300, 400, 500 **and 600** (legacy requests 600/700 but never loads them → faux bold). Ban 700.
- Both SIL OFL: self-host via `next/font/local` (web) and `expo-font` (native) from the same woff2/ttf files in `packages/tokens/fonts/` (subset Latin + Latin-ext).
- Type scale: take the de facto scale from reference §3 into `size`/`leading`/`tracking` tokens; eyebrow labels = Inter 500, 11–12px, uppercase, tracking ≈ 0.12–0.28em per reference.

**Shape**: keep both radius families deliberately (reference §4): `radius-soft` (8–18px, cards/sheets on native) and `radius-crisp` (2–6px, editorial cards/dialogs on web). Components pick one per the component spec; no ad-hoc radii.

**Motion**: durations/easings from reference; respect `prefers-reduced-motion` / `AccessibilityInfo.isReduceMotionEnabled`.

## 5. Component inventory (build targets)

Primitives (both `ui` and `ui-native`, same props):

| Component | Notes / encoded rules |
|---|---|
| `Text`, `Heading`, `Eyebrow` | Heading enforces Cormorant ≥17px; Eyebrow is uppercase tracking |
| `Button` | variants `primary` (filled ink — **max one per screen**, dev-mode warning if two mount), `secondary` (outline), `quiet` (text); `loading` state never says "Generating" |
| `IconButton` | 44×44 min hit area |
| `Pill` / `Chip` | selected state uses outline + ink text, **not** black fill (fixes legacy filter pill) |
| `Card` (`PieceCard`, `LookCard`, `RackCard` variants) | aspect ratios from reference §5; blur placeholder; skeleton twin |
| `Image` | wraps `next/image` loader / `expo-image` with our CDN loader, `sizes`, blurhash/thumbhash placeholder |
| `Sheet` / `Dialog` | native bottom sheet; web dialog (Radix); focus trap; no confirm dialogs for reversible actions — use `Toast` with Undo |
| `Field`, `TextArea`, `Select`, `SegmentedControl` | visible 3:1 borders; error text uses `danger` + icon |
| `Toast` | supports action (Undo) |
| `Skeleton` | shape-matched to final layout |
| `Progress` (generation) | staged: "Styling your pieces" → per-image fill; copy from `packages/copy` |
| `EmptyState` | title, body, one action; copy from `packages/copy` |
| `Avatar`, `TabBar` (native), `NavRail`/`TopBar` (web) | IA per `SPEC.md` §UX |

## 6. Quality gates

- **Contrast CI**: `packages/tokens/test/contrast.test.ts` asserts every pair declared in `tokens.ts` `pairs` list meets its target in both modes. Adding a new text/bg combination requires declaring it.
- **Visual regression**: Storybook (web `@storybook/nextjs-vite`) + Chromatic or Playwright screenshots for primitives in light/dark.
- **Copy lint**: `packages/copy/test/banned.test.ts` scans `app/`, `mobile/`, `packages/ui*` for banned terms from reference §1 (e.g. "Generating", "Holiday", "Calendar" as a product noun, lock language) and fails CI.
- **Accessibility**: `@axe-core/playwright` on key routes; native: `accessibilityLabel` required by a custom lint rule on `IconButton`/`Pressable`.
- **No raw colours**: Biome/grit rule bans hex literals and arbitrary Tailwind values (`bg-[#…]`) outside `packages/tokens`.

## 7. Open decisions (flag to founder)

1. Dark mode is proposed, not existing. Ship light-only at M2 with dark tokens defined and tested, enable when designed? **Default: ship light-first, dark behind a setting in M5.**
2. Radius families: confirm the soft (native/sheets) vs crisp (editorial) split.
