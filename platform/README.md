# Robes Platform

The next-generation Robes: a secure, scalable platform with a Next.js web app and an Expo (iOS/Android) app sharing one API, one design system and one data model. It is built here, beside the legacy app, which keeps serving www.byrobes.com and beta.byrobes.com until cutover. Nothing in `platform/` imports from or edits the legacy app.

**Start here:** `docs/SPEC.md` → `docs/plans/README.md` → the current milestone plan. Agents: read `CLAUDE.md` in this folder.

## Layout

| Folder | What |
|---|---|
| `app/` | Next.js 16 web app + `/api/v1` route handlers (Vercel) |
| `mobile/` | Expo SDK 57 app (EAS), Expo Router in `src/app` |
| `supabase/` | Migrations, pgTAP tests, local config |
| `packages/config` | Validated environment (`parseEnv`, `appServerEnv`) |
| `packages/tokens` | Design tokens → generated Tailwind v4 (web) and Uniwind (native) CSS, with a WCAG contrast gate |
| `packages/contracts` | zod schemas shared by server and clients (error body, health) |
| `packages/api` | `route()` wrapper: auth (Supabase JWT via JWKS), validation, body limits, rate limits, safe errors |
| `packages/jobs` | Job runtime: transports (inline/SQS), `runJob()` lease + handler registry, outbox sweep |
| `workers/` | Lambda handlers (`src/handlers/*.ts`, one per queue) wrapping `@robes/jobs` |
| `infra/` | AWS CDK app (`@robes/infra`): stages `Staging`/`Production` from `infra/config/*.ts`, one file per stack in `src/stacks/`, assertion tests in `test/`. Runbooks: `docs/runbooks/` |
| `docs/` | Spec, requirements, reference and plans |

Internal packages are "just-in-time" TypeScript: `exports` point at `src/*.ts` and are compiled by the consumer (Next, Metro, Vitest). The exception is `@robes/tokens`, which has a build step that writes `dist/*.css`.

## Getting started

Prerequisites: Node 24 (`.nvmrc`), Docker running (for local Supabase). For mobile: Expo Go on a phone, or an iOS simulator (Xcode) / Android emulator. Mobile runs entirely through Expo (see `mobile/README.md`).

```bash
cd platform
corepack enable            # provides the pinned pnpm (11.27.1)
pnpm bootstrap             # install, build tokens, create app/.env.local
pnpm db:start              # local Supabase on :54321 (API), :54322 (DB), :54323 (Studio)
pnpm dev:web               # http://localhost:3000 (next picks another port if it's taken)
pnpm dev:mobile            # expo start → press i (iOS sim) / a (Android) / scan QR in Expo Go
```

Check it's working: `http://localhost:3000` shows the Robes headline on cream, and `http://localhost:3000/api/v1/health` returns `{"ok":true}`. On the simulator, toggle dark mode (Cmd+Shift+A) to see the ink theme.

## Everyday commands (from `platform/`)

| Command | Does |
|---|---|
| `pnpm verify` | Everything CI's checks job runs locally except the build: lint, typecheck, unit tests, pgTAP |
| `pnpm lint` / `pnpm format` | Biome check / fix |
| `pnpm typecheck` | `tsc` across every package (Turbo) |
| `pnpm test` | Vitest (packages, app) + Jest (mobile) |
| `pnpm --filter @robes/app test:e2e` | Builds the app and runs Playwright against `next start` on :3100 (`E2E_PORT` to change) |
| `pnpm maintenance` | Runs the maintenance worker once locally: retention + outbox sweep (swept jobs run in-process) |
| `pnpm dev:ios` / `pnpm dev:android` | Expo straight to a simulator/emulator |
| `pnpm --filter @robes/mobile expo:doctor` | Expo SDK/dependency health check |
| `pnpm db:reset` | Recreate the local DB from `supabase/migrations` |
| `pnpm db:test` | pgTAP tests in `supabase/tests/database` |
| `pnpm --filter @robes/tokens build` | Regenerate token CSS after editing `packages/tokens/src/tokens.ts` |
| `pnpm --filter @robes/infra test` | CDK assertion tests (both stages, stub handlers, no AWS needed) |
| `pnpm --filter @robes/infra synth` | `cdk synth` of both stages with stub worker handlers, offline |
| `cd infra && pnpm exec cdk diff -c stage=staging` | Diff against the staging account (needs AWS credentials; see `docs/runbooks/environments.md`) |

## How the pieces fit

**Tokens.** `packages/tokens/src/tokens.ts` is the only place colours, fonts and radii are defined. `tokens.test.ts` fails if any declared foreground/background pair drops below its WCAG ratio, in light or dark mode. Fix the palette, never the threshold. The build writes `theme.css` (a Tailwind `@theme` shared by both platforms) plus `web.css` and `native.css` (per-platform light/dark values), so `bg-surface text-ink` means the same thing on web and native.

**API routes.** Every handler under `app/src/app/api/v1/**/route.ts` is built with `route()` from `app/src/server/route.ts`:

```ts
export const POST = route({
  auth: 'user',                       // 'public' | 'user' | 'admin'
  input: CreateThingInput,            // zod, from @robes/contracts
  output: Thing,
  rateLimit: { key: 'things.create', limit: 20, windowSeconds: 60 },
  handler: async ({ input, user }) => createThing(user.id, input),
});
```

The identity comes from the verified JWT (`user.id`), never from the body. `route-manifest.test.ts` fails if any route skips `route()`, or is public without being allow-listed there and in `docs/api.md` §3.

**Jobs.** Anything slow or paid is a job. The route calls `startJob()` (`app/src/server/jobs.ts`): quota and the `generation_jobs` insert commit together (idempotent on `Idempotency-Key`), then the job id is sent to SQS (`JOBS_INTERACTIVE_QUEUE_URL`) or, in dev, run in-process after the response via `after()`; the route returns `202 { jobId }` even if sending fails, because the maintenance worker's sweep re-sends stale jobs. `runJob()` claims the row with a lease (duplicate deliveries are no-ops), runs the handler for its `kind` with a time budget and cancellation signal, writes stages (`text`, `images`) onto the row, and finishes it with a short error code, never provider text. Clients follow `GET /api/v1/jobs/:id/events` (SSE): a full snapshot on connect and on every change, so a refresh or reconnect resumes (`useJob()` in `app/src/lib/use-job.ts`). Try it at `/dev/jobs` in dev.

**Security headers.** `app/src/proxy.ts` sets a per-request nonce CSP (built by `server/security-headers.ts`), and `next.config.ts` adds the static headers. The root layout awaits `connection()`, so every page renders dynamically and Next can stamp the nonce. A statically prerendered page would have its scripts blocked. The e2e suite asserts that no page logs a CSP violation.

**Database.** Schema changes are migrations only (`pnpm supabase migration new <name>`), never the Studio SQL editor. Every public table has RLS enabled, `(select auth.uid())` policies, an `ownership:` table comment, column-level grants for user-writable tables and a pgTAP test. `000_meta.test.sql` enforces the first three for every table automatically.

## Recipes

- **New shared package:** copy `packages/contracts` (package.json with `exports: ./src/index.ts`, a one-line `tsconfig.json` extending `../../tsconfig.base.json`, `test`/`typecheck` scripts). Use `catalog:` for shared dependency versions (`pnpm-workspace.yaml`). If the app imports it, add it to `transpilePackages` in `app/next.config.ts`. React-using packages declare `react` as a **peer** dependency, because web and native run different React minors.
- **New API route:** add the schemas to `@robes/contracts`, create `route.ts` with `route()`, and write a unit test for the handler logic. The manifest test picks the route up automatically.
- **New table:** `pnpm supabase migration new <name>`, write the table plus RLS, grants and ownership comment, add `supabase/tests/database/NNN_<name>.test.sql`, then `pnpm db:reset && pnpm db:test`.
- **Native dependency:** `cd mobile && pnpm exec expo install <pkg>` (picks the SDK-compatible version), then `pnpm expo:doctor`. Prefer packages that run in Expo Go (ADR 018).

## Troubleshooting

- **`ERR_PNPM_IGNORED_BUILDS`**: pnpm 11 only runs install scripts for packages listed under `allowBuilds` in `pnpm-workspace.yaml`.
- **Freshly published package refused**: pnpm's `minimumReleaseAge` supply-chain policy. Wait it out, or add a reviewed exact version to `minimumReleaseAgeExclude`.
- **Mobile `className` type errors**: `mobile/src/uniwind-types.d.ts` is generated by Metro. Run `pnpm dev:mobile` once after adding themes.
- **Styles missing on web**: rebuild tokens (`pnpm --filter @robes/tokens build`). `pnpm dev`/`build` do this automatically through Turbo's `^build`.
- **Port clashes**: Supabase uses 54321–54329, Playwright uses 3100 (override with `E2E_PORT`), and Expo's Metro uses 8081. When 8081 is busy, `expo start` offers another port; pass `--port <n>` in non-interactive runs.

## CI

`.github/workflows/platform-ci.yml` runs on PRs touching `platform/**`. It has four jobs: checks (lint, typecheck, unit, expo-doctor, build), database (Supabase + `db lint` + pgTAP), e2e (Playwright) and secrets (gitleaks over the change's commits). A `cdk-diff` job runs the infra assertion tests and an offline `cdk synth`; the checks job also runs `pnpm audit --prod --audit-level high`. Deploys: `platform-deploy-staging.yml` (push to `platform`) and `platform-deploy-prod.yml` (manual, `production` environment approval), both via GitHub OIDC; setup in `docs/runbooks/environments.md`.
