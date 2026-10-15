# M2 Design System & App Shell Implementation Plan

> **For Claude:** task-level plan (files, behaviour, required tests); execute TDD per task. Wave tasks touch disjoint folders and may run in parallel worktrees.

**Goal:** Shared UI primitives on both platforms, the new IA shell (Today · Wardrobe · Looks · Plan + Create + You), two-screen onboarding and the You area, so feature milestones only build feature screens.

**Inputs:** `roadmap.md` → M2; `design-system.md` (normative); `reference/brand-and-design.md` §1 (voice, naming); `reference/ux-opportunities.md` §3 (IA), §4 (budgets), §5 UX-11/12/13/15/22/23/25/26/27; `mobile.md` §2–3. Already done in M1: `@robes/tokens`, `@robes/copy` (+ voice test), web + native auth, `/api/v1/me`.

## Wave 0 — `@robes/icons` · main
One SVG source set (`src/icons.ts`: name → viewBox + paths, 24px, 1.5 stroke, `currentColor`) → `@robes/icons/web` (React `<Icon>`) and `@robes/icons/native` (react-native-svg). Tests: every icon renders on both, names are a closed union, no fills that ignore `currentColor`.

## Wave 1 (parallel)
### Task 1 — `@robes/ui` (web) · agent
Primitives per `design-system.md` §5 with the encoded rules: Text/Heading (Cormorant ≥17px)/Eyebrow, Button (`primary|secondary|quiet`, dev warning when two primaries mount — UX-26, `loading` copy from `@robes/copy`), IconButton (44px, required `label`), Pill/Chip (selected = outline + ink, never black fill), Card + skeleton twins, Image (media loader + blurhash placeholder, fixed aspect frames, no CLS), Sheet/Dialog (Radix, focus trap), Field/TextArea/Select/SegmentedControl (3:1 borders, error = danger + icon), Toast with action (Undo), Skeleton, Progress (staged), EmptyState, Avatar. Storybook (`@storybook/nextjs-vite`) light/dark; axe checks in Vitest (`vitest-axe`/`@axe-core`) for every primitive; Biome rule banning hex literals and `[#…]` arbitrary colours outside `packages/tokens`; Tailwind `@source` for the package in the app.
### Task 2 — `@robes/ui-native` · agent
Same names and prop contracts on Uniwind: Text/Heading/Eyebrow, Button (+ haptic on primary via `expo-haptics`), IconButton (44pt, required `accessibilityLabel`), Pill, Card, Image (`expo-image` + blurhash), Sheet (bottom sheet via Expo-Go-compatible libs only — ADR-018), Field, SegmentedControl, Toast with Undo, Skeleton, Progress, EmptyState, Avatar. Dynamic Type caps from tokens; reduce-motion respected. jest-expo + RNTL tests (a11y labels, one-primary warning, disabled/loading states).
### Task 3 — `@robes/api-client` · agent
Typed client generated from `@robes/contracts` route definitions (method, path, input, output) — contracts gain a `routes` map so server routes and the client share one source. Fetch adapter (web: same-origin cookies; native: Better Auth cookie + `x-robes-app-version`), automatic `Idempotency-Key` on creating POSTs, error mapping to `ErrorBody` codes, TanStack Query hooks + key factory, `useUndoableMutation` (optimistic update, soft delete, 6 s undo toast hook — UX-13/15). Tests: contract round-trip, idempotency key reuse on retry, optimistic rollback.

## Wave 2 (after wave 1)
### Task 4 — Web shell · main
Signed-in layout: top nav ≥1024 (Today · Wardrobe · Looks · Plan, Create button, avatar → You), bottom tab bar <768, ⌘K command bar (routes + Create actions), Create sheet (the IA §3.2 options; unbuilt ones route to placeholders), route placeholders with skeletons for `/wardrobe`, `/wardrobe/inbox`, `/wardrobe/wishlist`, `/looks`, `/looks/ideas`, `/plan`, `/you/*`. Playwright: nav parity and every route reachable; axe on each P0 route; Lighthouse CI budgets (UX-24).
### Task 5 — Native shell · main
Expo Router `(tabs)` Today · Wardrobe · [+] · Looks · Plan with the same names/order, Create modal stack, You stack behind the avatar, deep-link scheme `robes://` + universal-link placeholder, auth screens moved under `(auth)`. Maestro flow: tabs + Create + You reachable.
### Task 6 — Onboarding (both) · main
≤2 screens after auth (UX-22): name (prefilled from the auth provider) → first piece (photo/text) which starts the fake job and lands on its streaming result (the real styling job replaces it in M4).
### Task 7 — You area (both) · main
Account (name, email read-only), Notifications prefs (stored), Privacy & consent (from M1 Task 6), Legal, Sign out (resets analytics), Delete account entry (confirm + `POST /me/deletion`, job wired in M6).

## Exit gates
Storybook + contrast + copy lint + axe green; IA identical on web and native (UX-11/12); onboarding ≤2 screens (UX-22); Lighthouse/bundle budgets wired in CI (UX-24); Maestro + Playwright shell flows green.
