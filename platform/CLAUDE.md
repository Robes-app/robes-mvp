# Robes Platform — Claude Code Guide

**Current milestone: M1 (M0 complete 2026-09-24).** Plans index: `docs/plans/README.md`.

This folder is the rebuild of Robes as a secure, scalable platform: Next.js web (`app/`), Expo app (`mobile/`), Lambda workers (`workers/`), AWS CDK (`infra/`), Supabase migrations (`supabase/`) and shared packages (`packages/*`). The legacy app at the repo root (`server.js`, `public/`, root `supabase/*.sql`) keeps running in production and is **reference only** — never import from it, never edit it from platform work (legacy fixes follow `docs/plans/2026-09-24-p0-legacy-hotfixes.md` on their own branch).

## Start of every session
1. Read `docs/SPEC.md` (§0 reading order, §4 decisions, §8 milestones, §9 open decisions).
2. Open the plan for the current milestone. If only a brief exists in `docs/plans/roadmap.md`, expand it with `superpowers:writing-plans` into `docs/plans/<date>-m<N>-<name>.md` first.
3. Execute with `superpowers:executing-plans` (or `subagent-driven-development` for independent tasks). Commit after each task.

## Non-negotiable rules (see `docs/security.md`)
- Every API route is built with `route()` from `@robes/api`, declares `auth`, a zod `input` and `output`, and `rateLimit`/`quota` if it spends money. Public routes must be in the route-manifest allow-list **and** `docs/api.md` §3.
- Identity comes only from the verified JWT (`user.id`). Never read a user id, wardrobe, style DNA or entitlement from a request body — load it from the database.
- Anything slower than ~3 s or that calls a paid model is a job (`generation_jobs` + queue). No in-process state (Maps, timers) in the web tier.
- Every table: RLS on, `(select auth.uid())` policies, ownership comment, column grants for user-writable tables, pgTAP test. No anon table access. Migrations only via the Supabase CLI — never the SQL editor.
- The service-role client is only importable from `app/src/server/**` and `workers/**`.
- No `dangerouslySetInnerHTML`, no third-party script CDNs, no raw colours (use tokens), no hard-coded user-facing strings (use `@robes/copy`).
- No PII or prompts in logs. Provider/model errors never reach users.
- Model IDs only via the registry in `packages/ai`; prompts are versioned modules with evals.

## Toolchain
Node 24 · pnpm 11.27.1 · Turborepo · TypeScript 6.0.3 · Biome · zod 4 · Vitest · Playwright · Next.js 16.3 (React 19.3) · Tailwind 4.3 · Expo SDK 57 (RN 0.86, React 19.2.3) · Uniwind 1.12 · Supabase CLI · AWS CDK v2. Versions and rationale: `docs/reference/stack-versions.md`. Shared packages declare React as a **peer** dependency.

Common commands (from `platform/`): `pnpm bootstrap` · `pnpm verify` (lint + typecheck + test + db:test) · `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm db:start` · `pnpm db:reset` · `pnpm db:test` · `pnpm dev:web` · `pnpm dev:mobile` (Expo; ADR 018) · `pnpm --filter @robes/app test:e2e`. Recipes (new package / route / table): `README.md`.

## Product rules to respect
Naming, voice and copy rules: `docs/reference/brand-and-design.md` §1. IA: Today · Wardrobe · Looks · Plan + Create + You (`docs/reference/ux-opportunities.md` §3). P0 UX acceptance criteria UX-01…29: `docs/reference/ux-opportunities.md` §5. One filled (ink) button per screen; no lock language; titles offered, never applied; Wears are immutable.

## Conventions
Match surrounding code; single quotes; 2-space indent; no comments unless the why is non-obvious. Tests live next to code (`*.test.ts`) except e2e (`app/e2e`, `mobile/e2e`) and pgTAP (`supabase/tests`).
