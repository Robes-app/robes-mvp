# Robes Platform — Claude Code Guide

**Current milestone: M1 (M0 complete 2026-09-24).** Plans index: `docs/plans/README.md`.

This folder is the rebuild of Robes as a secure, scalable platform: Next.js web (`app/`), Expo app (`mobile/`), Lambda workers (`workers/`), AWS CDK (`infra/`), Postgres migrations (`db/`), local services (`docker-compose.yml`) and shared packages (`packages/*`). The legacy app at the repo root (`server.js`, `public/`, root `supabase/*.sql`) keeps running in production and is **reference only** — never import from it, never edit it from platform work (legacy fixes follow `docs/plans/2026-09-24-p0-legacy-hotfixes.md` on their own branch).

## Start of every session
1. Read `docs/SPEC.md` (§0 reading order, §4 decisions, §8 milestones, §9 open decisions).
2. Open the plan for the current milestone. If only a brief exists in `docs/plans/roadmap.md`, expand it with `superpowers:writing-plans` into `docs/plans/<date>-m<N>-<name>.md` first.
3. Execute with `superpowers:executing-plans` (or `subagent-driven-development` for independent tasks). Commit after each task.

## Non-negotiable rules (see `docs/security.md`)
- Every API route is built with `route()` from `@robes/api`, declares `auth`, a zod `input` and `output`, and `rateLimit`/`quota` if it spends money. Public routes must be in the route-manifest allow-list **and** `docs/api.md` §3.
- Identity comes only from the verified JWT (`user.id`). Never read a user id, wardrobe, style DNA or entitlement from a request body — load it from the database.
- Anything slower than ~3 s or that calls a paid model is a job (`generation_jobs` + queue). No in-process state (Maps, timers) in the web tier.
- **The API is the only path to app data (ADR-019/020).** See "Data access and security" below — read it before touching `db/`, `packages/db`, `packages/auth` or a route.
- No `dangerouslySetInnerHTML`, no third-party script CDNs, no raw colours (use tokens), no hard-coded user-facing strings (use `@robes/copy`).
- No PII or prompts in logs. Provider/model errors never reach users.
- Model IDs only via the registry in `packages/ai`; prompts are versioned modules with evals.

## Data access and security (ADR-019/020) — read before changing data code

Postgres is a private database behind the API: no RLS, no client-side queries, no Supabase. Auth is Better Auth (`packages/auth`) running in the Next app. That model is only safe while every rule below holds — each exists because breaking it exposes every user's data or account.

**Database**
1. **App tables live in schema `app`.** Nothing but dbmate's `schema_migrations` lives in `public`. If the DB host ever auto-exposes a schema over HTTP (Supabase PostgREST, Neon Data API), it must be switched off — `meta.test.ts` guards `public`.
2. **PUBLIC gets nothing.** No table or function privileges for PUBLIC in `app`/`private`. Postgres grants EXECUTE on new functions to PUBLIC globally, and a per-schema revoke silently does nothing; the baseline revokes it globally, so every function grant is explicit. `security definer` functions must `set search_path = ''` and use fully-qualified names.
3. **The API and workers connect as `robes_app`** (`DATABASE_URL`), a login role with CRUD on `app` only. Migrations run as the admin role (`DATABASE_ADMIN_URL`, CI/deploy only). Never run the app as a superuser.
4. **Integrity lives in the database, ownership in code.** Every child table carries `user_id` and uses composite FKs (`(x_id, user_id) references parent (id, user_id)`) so a bug can never link one user's rows to another's. Keep check constraints, `private.track_updates` on every table with `updated_at`, and generated reference data (`@robes/core` → `pnpm --filter @robes/core gen:sql`, drift-tested).
5. **Migrations only via dbmate** (`pnpm db:new <name>`, files in `db/migrations`, forward-only — fix mistakes with a new migration, never edit an applied one). New table checklist: schema `app`, `user_id` + composite FKs, `created_at`/`updated_at`/`deleted_at`, `track_updates`, schema tests in `packages/db/test/schema`, and repository functions (below). Then `pnpm db:types`.

**Code**
6. **All user-data queries go through `@robes/db` repositories whose first argument is a `UserId`** — a branded type only `verifiedUserId()` in the auth layer mints. Every query filters on it. Route handlers never build SQL or import Kysely. A missing row for this user is `not_found` (404), never `forbidden`. Every repository has a cross-user test. Worker-only operations live in `createSystemRepositories` and are never imported by routes.
7. **Admin = `app.admin_users.role = 'admin'`** (`support`/`analyst` are not admins). Admin routes use `auth: 'admin'` and write `app.audit_log`.
8. **Never return a DB row as-is.** `route()` parses every response with the `output` schema (zod strips undeclared fields) in every environment. Don't loosen outputs with `.passthrough()`/`z.any()`.
9. **Job progress is SSE from `/api/v1/jobs/:id/events`**, scoped by the session user like any other route. Don't add a client-side subscription to the database.
9a. **User photos are private by default** and only ever delivered through signed URLs/cookies (`@robes/media/delivery`). Never make a bucket or prefix public except `shared/` (share snapshots) and `catalog/` (brand assets, no user data).

**Auth (Better Auth, `packages/auth`)**
10. Sessions are server-side rows (`app.sessions`); web uses httpOnly secure cookies, native uses the Expo plugin (SecureStore). Never store tokens in `localStorage`/AsyncStorage.
11. Sign-in is passwordless email OTP, Apple and Google. OTPs are stored hashed, expire in 10 minutes and allow 3 attempts; Better Auth's rate limiter uses the database store (never memory in deployed envs).
12. `trustedOrigins` and OAuth redirect URLs are exact — no wildcards in production. `BETTER_AUTH_SECRET` is ≥32 random bytes per environment; rotating it logs everyone out (runbooks/key-rotation.md).
13. Account deletion goes through the deletion job (SEC-80), which deletes the `app.users` row last (everything cascades from it).

**API wrapper (`packages/api`) — hardening that review found missing; don't regress it**
15. Request bodies are streamed with a byte counter (32 KB cap). Don't call `req.json()`/`req.text()` yourself — a chunked request without `content-length` would bypass the cap.
16. Failed authentication is rate-limited per IP (`AUTH_FAILURE_LIMIT`) *before* returning 401; per-user limits never see bad-token floods.
14. Identity comes from the Better Auth session resolved server-side for each request (cookie or Expo header). Never decode or trust a token client-side, and never accept a user id from the body.
17. Client IP comes from `x-vercel-forwarded-for` → `x-forwarded-for` → `x-real-ip` via `app/src/server/client-ip.ts` only.
18. GET/HEAD/DELETE inputs come from the query string: values are strings (use `z.coerce`), repeated keys arrive as arrays. Route params are validated with the optional `params` schema.
19. The route-manifest test covers every `route.ts` under `app/src/app` and every HTTP method, and sends no token and a forged token. Keep it passing; don't narrow its glob.

**Web surface**
20. Pages render dynamically (root layout awaits `connection()`) so Next can stamp the per-request CSP nonce; a static page's scripts are blocked by `'strict-dynamic'`. The e2e suite fails on any CSP violation — add new third-party origins to `server/security-headers.ts` deliberately.
21. `proxy.ts` fails closed if required env is missing; don't add silent fallbacks to localhost/defaults in production code paths.

**Secrets**
22. Nothing secret in the repo (gitleaks runs in CI on each change's commits). Publishable/anon keys are not secrets but still come from env. The legacy app has keys in its git history; they are being rotated and scrubbed after merge — never copy values from legacy files.

## Toolchain
Node 24 · pnpm 11.27.1 · Turborepo · TypeScript 6.0.3 · Biome · zod 4 · Vitest · Playwright · Next.js 16.3 (React 19.3) · Tailwind 4.3 · Expo SDK 57 (RN 0.86, React 19.2.3) · Uniwind 1.12 · Postgres 17 (Docker) · Kysely · dbmate · Better Auth · AWS CDK v2. Versions and rationale: `docs/reference/stack-versions.md`. Shared packages declare React as a **peer** dependency.

Common commands (from `platform/`): `pnpm bootstrap` · `pnpm verify` (lint + typecheck + test + db:test) · `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm services:up` · `pnpm db:reset` · `pnpm db:migrate` · `pnpm db:new <name>` · `pnpm db:types` · `pnpm db:test` · `pnpm dev:web` · `pnpm dev:mobile` (Expo; ADR 018) · `pnpm --filter @robes/app test:e2e`. Recipes (new package / route / table): `README.md`.

## Product rules to respect
Naming, voice and copy rules: `docs/reference/brand-and-design.md` §1. IA: Today · Wardrobe · Looks · Plan + Create + You (`docs/reference/ux-opportunities.md` §3). P0 UX acceptance criteria UX-01…29: `docs/reference/ux-opportunities.md` §5. One filled (ink) button per screen; no lock language; titles offered, never applied; Wears are immutable.

## Conventions
Match surrounding code; single quotes; 2-space indent; no comments unless the why is non-obvious. Tests live next to code (`*.test.ts`) except e2e (`app/e2e`, `mobile/e2e`) and DB tests (`packages/db/test`, need `pnpm services:up`).
