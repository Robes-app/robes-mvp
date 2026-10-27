# Stack versions & compatibility — verified 2026-09-24

All versions below come from `npm view <pkg> version` / `dist-tags` / `peerDependencies` / `engines` run on 2026-09-24, unless a URL is cited. Re-run before pinning; this is a snapshot.

## Versions

| Package | Current stable | Notes |
|---|---|---|
| **Node.js** | **24.21.0 (Krypton, Active LTS)** | 22.23.3 (Jod) is Maintenance LTS; 26.10.0 is Current and not LTS yet (Node 26 goes LTS in Oct 2026). Use 24. Source: https://nodejs.org/dist/index.json |
| pnpm | 12.6.0 | 12.0.0 shipped 2026-08-26 (Rust rewrite, keeps pnpm 11 formats and commands). Known Turbo issue: `turbo gen` fails with `ERR_PNPM_IGNORED_BUILDS`, fixed by `pnpm approve-builds` (vercel/turborepo#14096). Fall back to `pnpm@11` (latest-11 tag) if CI breaks. https://www.infoq.com/news/2026/09/pnpm-12-rust/ |
| turbo | 2.11.3 | Turborepo 2.x is the current major (2.11.0 on 2026-09-18). |
| typescript | 7.0.2 (6.0.3 on the 6.x line) | TS 7 is the native (Go) compiler, released July 2026. Next, Expo and Vitest don't declare a TS peer. Pin **6.0.3** until every tool (Storybook, typed ESLint, CDK's jsii-free TS path) is confirmed on 7. |
| next | 16.3.6 | Peer `react ^18.2 \|\| ^19`, engines `node >=20.9`. In Next 16, `middleware.ts` became `proxy.ts` and Turbopack is the default bundler. App Router uses the React canary vendored inside Next, so the app-level `react` pin only affects the Pages Router and tooling. |
| react / react-dom (web) | 19.3.0 | Fine for Next 16. |
| react / react-dom (native) | **19.3.0 (pinned by Expo SDK 58)** | Same minor as web since the SDK 58 upgrade (2026-10-24). |
| expo | 58.0.17 (SDK 58) | SDK 58 released 2026-09-29; adopted 2026-10-24 when the App Store Expo Go moved to 58 (iOS offers no older Expo Go). Pins `react-native 0.88.0`, `react 19.3.0`, `react-native-web ~0.21.4`, `react-native-reanimated 4.7.1`, `react-native-worklets 0.13.0`, `react-native-gesture-handler ~3.3.0`, `react-native-screens ~4.30.0`, `react-native-safe-area-context ~5.10.1` (from `expo/bundledNativeModules.json`). 58.0.19 was under pnpm's release-age window on the day, so 58.0.17 rather than release-age exclusions. https://expo.dev/changelog/sdk-58 |
| react-native | **0.88.0** (SDK 58) | RN 0.88 types: refs use `TextInputInstance` / `ScrollViewInstance`, and FlatList slots take `undefined`, not `null`. |
| expo-router | 58.0.25 | Versioned with the SDK. Always install with `pnpm exec expo install`. `renderRouter` (testing-library) is async from 58. |
| expo-secure-store | 58.0.2 | Versioned with the SDK. |
| expo-image | 58.0.16 | Versioned with the SDK. |
| tailwindcss / @tailwindcss/postcss | 4.3.3 | v4 is stable (4.0 shipped 2025-01-21) and uses CSS-first `@theme` config. v3 remains only as the `v3-lts` tag (3.4.19). |
| nativewind | 4.2.7 stable (**Tailwind v3 only**); 5.0.0-rc.0 (Tailwind v4) | v5 RC (2026-09-13) peers are `tailwindcss >4.1.11` and `react-native-css 3.1.0-rc.0`. It targets Expo SDK 57 and needs exact engine pins. A ~2-week bake is planned before promotion to `latest`. Known issue: Android animation cancellation (Reanimated #10507). https://github.com/nativewind/nativewind/discussions/1818 |
| **uniwind** | **1.12.0** | Stable, Tailwind v4 native, MIT (free tier). Peers `tailwindcss >=4`, `react >=19`, `react-native >=0.81`. A paid Pro tier adds a C++ engine (zero re-renders, Reanimated className animations) and requires a dev build. https://docs.uniwind.dev/pro-version.md |
| react-native-unistyles | 3.3.0 | Peers `react-native >=0.76`, nitro-modules, reanimated, edge-to-edge. Uses TS `StyleSheet.create` themes, not Tailwind classNames. |
| @supabase/supabase-js | 2.117.1 | engines `node >=22`. v3 is on the `next` tag (3.0.0-next.29, pre-release); don't adopt it yet. |
| @supabase/ssr | 0.12.7 | Still the recommended SSR package (cookie sessions) for the Next App Router. Peer `@supabase/supabase-js ^2.114.0`. Still 0.x, so pin exact. https://supabase.com/docs/guides/auth/server-side/creating-a-client |
| supabase (CLI) | 2.117.0 | Install as a devDependency (`pnpm add -D supabase`). |
| pgTAP | 1.3.4 | Latest GitHub release (2025-10-04). Bundled as a Postgres extension in Supabase and run with `supabase test db`. https://github.com/theory/pgtap/releases |
| zod | 4.6.5 | v4 is stable. |
| @tanstack/react-query | 5.103.2 | Peer `react ^18 \|\| ^19`. v5 works on both web and native. |
| aws-cdk-lib | 2.270.0 | Pair with `constructs 10.8.1`. The CLI (`aws-cdk`) is versioned separately at 2.1143.0. |
| AWS Lambda Node runtime | **`nodejs24.x`** | nodejs24.x is deprecated 2028-04-30 and nodejs22.x on 2027-04-30. `nodejs26.x` is public preview only (GA targeted Nov 2026). https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html |
| @google/genai | 2.24.0 | 2.x major. The current prod app (`server.js`) uses an older import, so check for API changes when porting. |
| vitest | 5.0.1 | Peers `vite ^6.4 \|\| ^7 \|\| ^8` (vite 8.3.0 is current), engines `node ^22.12 \|\| ^24 \|\| >=26`. The V4 tag is 4.1.11. |
| @playwright/test | 1.63.0 | Also an optional peer of `next`. |
| Maestro CLI | 2.10.0 (cli-2.10.0, 2026-08-31) | Expo's recommended mobile e2e tool, with first-party EAS Workflows support. https://docs.expo.dev/eas/workflows/examples/e2e-tests/ |
| detox | 20.51.4 | Alternative to Maestro, gray-box. It is tightly coupled to RN and Xcode versions. |
| @sentry/nextjs | 11.0.0 | New major. Peer `next ^14 \|\| ^15 \|\| ^16`. engines `node >=20.19 <22 \|\| >=22.12`. The `v10` tag is 10.75.3. |
| @sentry/react-native | 8.27.0 latest; **Expo SDK 57 bundles `~7.11.0`** | Peers `expo >=49`, `react-native >=0.65`. `npx expo install` will choose 7.11. Moving to 8.x means overriding expo-doctor, so test 8.x on a dev build first. |
| posthog-js | 1.434.12 | |
| posthog-react-native | 4.77.0 | Optional peers include expo-application, expo-device, expo-localization, expo-file-system, and `posthog-react-native-session-replay` for replay. |
| @upstash/redis | 1.39.0 | Works over HTTP, so it runs on edge, serverless and Lambda. |
| @upstash/ratelimit | 2.2.0 | |
| Cloudflare Turnstile | `@marsidev/react-turnstile` 1.6.1 | There is no official npm SDK. Load the widget script client-side and verify tokens server-side with `POST https://challenges.cloudflare.com/turnstile/v0/siteverify`. |
| jose | 6.2.12 | Use it for JWKS verification outside supabase-js (Lambda workers). |
| react-native-purchases (RevenueCat) | 10.10.2 | Peer `react-native >=0.73`. Needs a dev build; it won't run in Expo Go. |
| storybook | 10.6.0 | Web: `@storybook/nextjs-vite` 10.6.0. |
| @storybook/react-native | 10.6.0 | Peers pin **`react-native-reanimated 4.5.1`** (matches SDK 57) and **`react-native-safe-area-context 5.8.0`**, while SDK 57 ships ~5.7.0. That's a minor peer mismatch, so expect a warning or use an override. |
| @biomejs/biome | 2.5.14 | |
| eslint / prettier | 10.11.0 / 3.9.9 | `eslint-config-next` is at 16.3.6. |
| react-native-css | 3.0.7 (3.1.0-rc.0 for NativeWind v5) | Only needed with NativeWind v5. |

## Recommended choices & compatibility matrix

**Runtime baseline:** Node **24 LTS** everywhere: `.nvmrc`, `engines`, the Vercel project setting, and Lambda `nodejs24.x`. Set `packageManager: "pnpm@12.6.0"` (or `pnpm@11` if the Turbo/pnpm 12 issues bite). Vitest 5, RN 0.86 tooling and supabase-js all require Node ≥22, so 24 covers everything.

| Layer | Pick | Pinned to | Why |
|---|---|---|---|
| Web | Next 16.3.x + React 19.3 | Node 24, Tailwind 4.3 | Current major. `proxy.ts` replaces middleware. |
| Native | **Expo SDK 58** | RN 0.88.0, React **19.3.0**, Reanimated 4.7.1 | Use `pnpm exec expo install` for every native dependency; never pin a React Native or React version the SDK doesn't bundle. |
| React split | Allow different React minors per app | pnpm catalog or per-app pins | Shared packages (`ui-tokens`, `schemas`, `api-client`) declare `react` as a **peerDependency `^19.2`** and never as a dependency, to avoid duplicate-React errors in Metro. |
| Native styling | **Uniwind 1.12** (free/MIT) | Tailwind 4.3 | Stable today on Tailwind v4, with the same `@theme` CSS vocabulary as web. NativeWind 4.x is stuck on Tailwind v3, and NativeWind 5 is still RC. Revisit NativeWind 5 once it hits `latest` (API-compatible className model, easy swap). Unistyles is excellent but not className/Tailwind-based, so it can't share the web's utility vocabulary. |
| Auth (web) | `@supabase/ssr` 0.12.x + supabase-js 2.117 | exact pin on ssr | In `proxy.ts`/server code use **`supabase.auth.getClaims()`**. Never trust `getSession()` server-side. Use `getUser()` only when you need a fresh user record from the Auth server. |
| Auth (JWT) | **Asymmetric signing keys (JWKS)** | | The legacy shared JWT secret is deprecated but kept for backward compatibility. `getClaims()` verifies the signature locally against `https://<ref>.supabase.co/auth/v1/.well-known/jwks.json` (edge-cached 10 min) instead of a network round-trip. In Lambda workers without supabase-js, use `jose.createRemoteJWKSet(new URL(jwksUrl))` + `jwtVerify` (check `iss` = `https://<ref>.supabase.co/auth/v1` and `aud` = `authenticated`). Enable/rotate keys in Dashboard → JWT Keys. https://supabase.com/docs/guides/auth/signing-keys |
| Auth (native) | supabase-js with `expo-secure-store` storage adapter | | SecureStore values have a ~2KB size limit, so chunk the session or use the LargeSecureStore (AES key in SecureStore, ciphertext in AsyncStorage) pattern from Supabase's Expo guide. |
| Vercel functions | Pro + Fluid compute | | Default **300s**, max **800s** (GA). **1800s (30 min) is in beta**, set per function via `export const maxDuration = 1800`, and only on nodejs20/22/24. Long AI image jobs belong on SQS+Lambda anyway. https://vercel.com/docs/functions/configuring-functions/duration |
| Workers | CDK 2.270 → SQS + Lambda `nodejs24.x` (arm64) | | Lambda max is 15 min. Set the SQS visibility timeout to at least 6x the function timeout (AWS guidance). |
| Unit tests | Vitest 5 + vite 8 | Node ≥22.12 | Vitest is for web and shared packages. For RN components, jest-expo is still the path of least resistance, so use Vitest only for pure TS packages on the native side. |
| E2E | Playwright 1.63 (web), **Maestro 2.10 (mobile)** | | Maestro is Expo's documented EAS Workflows path. Use Detox only if you need gray-box sync. |
| Observability | @sentry/nextjs 11, @sentry/react-native (7.11 via expo install) | | Sentry RN 8.x is newer than Expo's bundled pin, so upgrade deliberately. |
| Lint/format | **Biome 2.5** + `eslint-config-next` only if the Next-specific rules are wanted | | Biome is one fast tool across the monorepo. Keep ESLint scoped to `apps/web` only if you need `@next/next` rules or React Compiler lint. |
| TypeScript | 6.0.3 (evaluate 7.x later) | | Maximizes tool compatibility. |
| Storybook | 10.6 (`@storybook/nextjs-vite` + `@storybook/react-native`) | | The RN Storybook safe-area peer is 5.8.0 vs Expo's 5.7.x, a harmless peer warning. |

## Token-sharing approach (recommendation)

**Goal:** one TypeScript source of truth for tokens, consumed by Tailwind v4 on web and Uniwind on native through the *same* generated `@theme` CSS, so `bg-surface text-ink rounded-card` means the same thing on both.

1. **`packages/tokens/src/tokens.ts`** is the source. It exports plain objects (`color`, `radius`, `spacing`, `font`, `shadow`) plus per-mode semantic maps (`light`, `dark`), validated with zod at build time.
2. **`packages/tokens/scripts/build.ts`** (a Turbo task, `outputs: ["dist/**"]`) generates:
   - `dist/theme.css`: a Tailwind v4 `@theme { --color-brand-500: …; --radius-card: …; --font-display: …; }` block for **static primitives**. Semantic tokens are declared once in `@theme` as `--color-surface: var(--surface);` so they resolve at runtime.
   - `dist/web.css`: mode values on web as `:root { --surface: …; }` and `@media (prefers-color-scheme: dark) { :root { --surface: … } }` / `[data-theme="dark"] { … }`.
   - `dist/native.css`: mode values in Uniwind's syntax, `@layer theme { :root { @variant light { --surface: … } @variant dark { --surface: … } } }`. This is where the two platforms' theming syntax differs, so it stays a small generated per-platform file.
   - `dist/tokens.js` + `.d.ts`: the raw values for places that need JS values rather than classNames, such as React Navigation theme, `expo-status-bar`, charts, `expo-image` placeholders and Sentry/PostHog UI.
3. **Web** `apps/web/app/globals.css`: `@import "tailwindcss"; @import "@robes/tokens/theme.css"; @import "@robes/tokens/web.css"; @source "../../packages/ui";`
4. **Native** `apps/mobile/global.css`: `@import "tailwindcss"; @import "uniwind"; @import "@robes/tokens/theme.css"; @import "@robes/tokens/native.css"; @source "../../packages/ui-native";`, with `withUniwindConfig(metroConfig, { cssEntryFile: "./global.css" })` in `metro.config.js`. Uniwind's monorepo guide uses `@source` for workspace packages: https://docs.uniwind.dev/monorepos.md
5. Only generate utilities both engines support (colors, spacing, radius, font family/size, opacity). Keep web-only tokens (e.g. complex shadows, `backdrop-*`) in a `web-extras` `@theme` block so native never sees classes it can't render.
6. **Swap path:** NativeWind 5 also consumes Tailwind v4 `@theme` CSS, so if it goes stable and the team prefers it, only `native.css`'s mode wrapper and the Metro config change. `tokens.ts` and `theme.css` stay as they are.

Why not Unistyles: it would consume `tokens.js` fine, but components would use `StyleSheet.create(theme => …)` rather than classNames. The web and native UI layers would then diverge in vocabulary, which defeats the point of Tailwind-style tokens.

## Sources
- npm registry queries (`npm view … version|dist-tags|peerDependencies|engines|time`), 2026-09-24
- `expo@57.0.24` tarball → `bundledNativeModules.json`
- https://nodejs.org/dist/index.json
- https://expo.dev/changelog/sdk-57
- https://github.com/nativewind/nativewind/discussions/1818 · https://www.nativewind.dev/v5
- https://docs.uniwind.dev/ (introduction, pro-version, monorepos, theming/custom-themes)
- https://supabase.com/docs/guides/auth/signing-keys · https://supabase.com/docs/guides/auth/server-side/creating-a-client
- https://vercel.com/docs/functions/configuring-functions/duration
- https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- https://docs.expo.dev/eas/workflows/examples/e2e-tests/
- https://www.infoq.com/news/2026/09/pnpm-12-rust/ · https://github.com/vercel/turborepo/issues/14096
- `gh release view --repo mobile-dev-inc/maestro` (cli-2.10.0) · `gh release list --repo theory/pgtap` (v1.3.4)
