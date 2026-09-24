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
- **The API is the only path to app data (ADR-019).** See "Data access and security" below — read it before touching `supabase/`, `packages/db` or a route.
- No `dangerouslySetInnerHTML`, no third-party script CDNs, no raw colours (use tokens), no hard-coded user-facing strings (use `@robes/copy`).
- No PII or prompts in logs. Provider/model errors never reach users.
- Model IDs only via the registry in `packages/ai`; prompts are versioned modules with evals.

## Data access and security (ADR-019) — read before changing data code

Supabase is used for **Auth** (and Realtime transport) only. Postgres is treated as a private database behind the API: no RLS on app data, no client-side queries. That is only safe while every rule below holds — each one exists because breaking it exposes every user's data.

**Database**
1. **App tables live in schema `app`, never `public`.** Supabase auto-publishes `public` through PostgREST to anyone holding the publishable key (it ships in every web and mobile bundle). A table in `public` without RLS is world-readable. `000_meta.test.sql` fails if any table appears in `public`.
2. **Client roles get nothing.** `anon` and `authenticated` have no privileges on `app`, `private` or `public` tables and cannot execute any of our functions. Never `grant ... to anon/authenticated`. Never add `app` to PostgREST's exposed schemas in `supabase/config.toml` or the dashboard.
3. **The API and workers connect as `robes_app`** (`DATABASE_URL`), a login role with CRUD on `app` only. It cannot read `auth.users`; use the Supabase Admin API (service role) for auth-user operations. Never connect the app as `postgres` or with the service-role key for data queries.
4. **Functions default to no EXECUTE for PUBLIC.** Postgres grants EXECUTE on new functions to PUBLIC globally, and a per-schema revoke silently does nothing. The baseline revokes it globally; every function grant is explicit. `security definer` functions must `set search_path = ''` and use fully-qualified names.
5. **Integrity lives in the database, ownership in code.** Every child table carries `user_id` and uses composite FKs (`(x_id, user_id) references parent (id, user_id)`) so a bug can never link one user's rows to another's; pgTAP tests prove it. Keep check constraints, triggers (`private.track_updates` on every table with `updated_at`) and generated reference data (`@robes/core` → `pnpm --filter @robes/core gen:sql`, drift-tested).
6. **Migrations only via the Supabase CLI** (`supabase/migrations`), never the dashboard SQL editor. New table checklist: schema `app`, `user_id` + composite FKs, `created_at`/`updated_at`/`deleted_at`, `track_updates`, a pgTAP test for its constraints/triggers, and repository functions (below).

**Code**
7. **All user-data queries go through `@robes/db` repositories whose first argument is the verified `userId`**, and every query filters on it (`where user_id = $userId`). Route handlers never build SQL or call Kysely directly. A missing row for this user is `not_found` (404), never `forbidden` — don't reveal that another user's id exists. Every repository has a cross-user test (user B's id → not found / no rows changed).
8. **Admin checks read `app.admin_users` with `role = 'admin'`** — `support`/`analyst` are not admins. Admin routes use `auth: 'admin'` and write `app.audit_log`.
9. **Never return a DB row as-is.** `route()` parses every response with the `output` schema (zod strips undeclared fields), in every environment. Don't loosen outputs with `.passthrough()`/`z.any()`.
10. **Realtime is the one Supabase-side rule.** Job progress goes over private Broadcast channels named `user:<uid>`; the only policy is on `realtime.messages` allowing a user to receive their own topic. The server sends with the service role. Never use `postgres_changes` on app tables (it needs RLS we don't have).

**API wrapper (`packages/api`) — hardening that review found missing; don't regress it**
11. Request bodies are streamed with a byte counter (32 KB cap). Don't call `req.json()`/`req.text()` yourself — a chunked request without `content-length` would bypass the cap.
12. Failed authentication is rate-limited per IP (`AUTH_FAILURE_LIMIT`) *before* returning 401; per-user limits never see bad-token floods.
13. JWTs must carry `exp` and `sub` (uuid); anonymous sessions (`is_anonymous`) are rejected; issuer and audience are checked against JWKS. Never decode a JWT without verifying it.
14. Client IP comes from `x-vercel-forwarded-for` → `x-forwarded-for` → `x-real-ip` via `app/src/server/client-ip.ts` only.
15. GET/HEAD/DELETE inputs come from the query string: values are strings (use `z.coerce`), repeated keys arrive as arrays. Route params are validated with the optional `params` schema.
16. The route-manifest test covers every `route.ts` under `app/src/app` and every HTTP method, and sends no token and a forged token. Keep it passing; don't narrow its glob.

**Web surface**
17. Pages render dynamically (root layout awaits `connection()`) so Next can stamp the per-request CSP nonce; a static page's scripts are blocked by `'strict-dynamic'`. The e2e suite fails on any CSP violation — add new third-party origins to `server/security-headers.ts` deliberately.
18. `proxy.ts` fails closed if required env is missing; don't add silent fallbacks to localhost/defaults in production code paths.

**Secrets**
19. Nothing secret in the repo (gitleaks runs in CI on each change's commits). Publishable/anon keys are not secrets but still come from env. The legacy app has keys in its git history; they are being rotated and scrubbed after merge — never copy values from legacy files.

## Toolchain
Node 24 · pnpm 11.27.1 · Turborepo · TypeScript 6.0.3 · Biome · zod 4 · Vitest · Playwright · Next.js 16.3 (React 19.3) · Tailwind 4.3 · Expo SDK 57 (RN 0.86, React 19.2.3) · Uniwind 1.12 · Supabase CLI · AWS CDK v2. Versions and rationale: `docs/reference/stack-versions.md`. Shared packages declare React as a **peer** dependency.

Common commands (from `platform/`): `pnpm bootstrap` · `pnpm verify` (lint + typecheck + test + db:test) · `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm db:start` · `pnpm db:reset` · `pnpm db:test` · `pnpm dev:web` · `pnpm dev:mobile` (Expo; ADR 018) · `pnpm --filter @robes/app test:e2e`. Recipes (new package / route / table): `README.md`.

## Product rules to respect
Naming, voice and copy rules: `docs/reference/brand-and-design.md` §1. IA: Today · Wardrobe · Looks · Plan + Create + You (`docs/reference/ux-opportunities.md` §3). P0 UX acceptance criteria UX-01…29: `docs/reference/ux-opportunities.md` §5. One filled (ink) button per screen; no lock language; titles offered, never applied; Wears are immutable.

## Conventions
Match surrounding code; single quotes; 2-space indent; no comments unless the why is non-obvious. Tests live next to code (`*.test.ts`) except e2e (`app/e2e`, `mobile/e2e`) and pgTAP (`supabase/tests`).
