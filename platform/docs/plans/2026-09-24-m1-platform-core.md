# M1 Platform Core Implementation Plan

> **For Claude:** execute with `superpowers:executing-plans` / `subagent-driven-development`. Tasks in the same wave touch disjoint folders and may run in parallel worktrees.

**Goal:** Everything later features need: full baseline schema with pgTAP, `packages/db`, `route()` quotas/flags/idempotency/app-version/admin, web auth, the durable job system (inline transport locally, SQS/Lambda in AWS), direct uploads with renditions and signed delivery, observability with consent, CDK stacks, deploy workflows and runbooks.

**Source brief:** `roadmap.md` → M1. Normative inputs: `data-model.md` §1–4, `legacy-data-model.md` §6, `api.md` §1–4, `infrastructure.md` §1–10, `security.md`.

**Granularity note:** this plan is task-level (files, behaviour, required tests) rather than code-level. Each task is TDD: write the listed tests first, watch them fail, implement, commit.

**Local-first rule:** every task must run end to end on a laptop with `pnpm db:start` + `docker compose up` (MinIO) and no cloud accounts. Cloud-only pieces (SQS, Lambda, CloudFront, Upstash, Sentry, PostHog, Resend) sit behind adapters with local implementations selected by env.

---

## Wave 1 (parallel)

### Task 1 — Baseline schema (DM §3 files 1–10) · owner: main
- Migrations in DM §3 order (`20260924000100` baseline and `…0200` identity already exist; extend identity, then add reference_data, assets, wardrobe, looks, generation, artifacts_and_sharing, growth, retention_jobs).
- Every table: ownership comment, RLS, `(select auth.uid())` policies `TO authenticated`, composite FKs `(x_id, user_id)`, `unique (id, user_id)`, touch trigger, `deleted_at`, `(user_id, updated_at)` index, column grants for user-writable tables, anon denied.
- RPCs in `private` unless DM names them public: `consume_quota`, `record_spend`, `set_look_pieces`, `sync_planned_days`, `create_share`/`revoke_share`, `get_share` (anon), `decide_inbox`, `mint_inbox_address`, `complete_onboarding`, `request_account_deletion`, `apply_tag_defaults` trigger, `tag_slug`.
- Realtime publication: `generation_jobs`, `generation_assets`.
- **Tests:** one pgTAP file per migration: RLS on, cross-user select/update/insert denied, server-owned columns not writable, anon denied, each RPC's happy path + ownership violation. Meta tests (000) stay green.

### Task 2 — `packages/db` · owner: main
- `database.types.ts` generated (`pnpm db:types`), `createUserClient(accessToken)`, `createServiceClient()` in `src/server.ts` importing `server-only`.
- Biome `noRestrictedImports` bans `@robes/db/server` outside `app/src/server/**` and `workers/**`.
- CI: `pnpm db:types && git diff --exit-code` drift check.
- **Tests:** unit test that `createUserClient` sends the bearer; lint fixture proving the ban.

### Task 3 — CDK app, deploy workflows, runbooks · owner: subagent (worktree `m1-infra`)
- `platform/infra`: stacks per `infrastructure.md` §4.1 with per-stage config; workers bundled from `platform/workers` by path (placeholder handlers until Task 7 lands).
- Assertion tests (`aws-cdk-lib/assertions`): buckets block public access + SSE + versioning; every queue has a DLQ with maxReceiveCount 3 and visibility ≥ 6× function timeout; no IAM `*` actions/resources; Lambdas arm64 + nodejs24.x; log retention 14 d; RETAIN + termination protection in production; fetchFn has no S3/Secrets permissions.
- `.github/workflows/platform-deploy-staging.yml`, `platform-deploy-prod.yml` (OIDC, environment protection), `cdk diff` PR comment job, `pnpm audit --prod`, `renovate.json`.
- `docs/runbooks/`: environments, key-rotation, restore-pitr, kill-switch, budget-breach, recreate-environment.

## Wave 2 (parallel, after Task 1–2)

### Task 4 — `route()` extensions · owner: main
- `isAdmin` via service client on `private.admin_users` (role admin) — exposed as `private.is_admin_user(uuid)` RPC to service role only.
- `quota: { metric, cost }` → `consume_quota` atomically with job insert (job helper in Task 7 calls it; routes without jobs call it directly); `429 quota_exceeded` + `resetAt`.
- `flag: 'key'` → `feature_flags` with a 30 s TTL cache keyed per flag (explicitly allowed: cache holds no user data); `503 disabled`.
- `Idempotency-Key` → idempotency store (Upstash; memory in dev) replaying the original response for 24 h.
- `X-Robes-App-Version` → `426 upgrade_required` below `MIN_APP_VERSION`.
- **Tests:** one unit test per option with fakes; integration test against local Supabase for quota.

### Task 5 — Web auth · owner: subagent (worktree `m1-auth`)
- `@supabase/ssr` client helpers in `app/src/server/supabase.ts`; `proxy.ts` refreshes the session with `getClaims()`; `route()` accepts cookie sessions as well as bearer tokens.
- Pages `app/src/app/auth/{sign-in,sign-up,check-email,callback,forgot,reset}`; Google + Apple buttons (configured via env, hidden when unset); sign out; guards (signed-in `/` → Today placeholder, protected routes → sign-in); onboarding gate via `POST /api/v1/me/onboarding/complete`.
- `GET /api/v1/me`, `PATCH /api/v1/me`.
- **Tests:** Playwright e2e: sign up → Mailpit confirm link → onboarding → signed in → sign out → sign in; forgot/reset. Integration test: seeded user token calls an `auth: 'user'` route via JWKS.

### Task 6 — Observability & consent · owner: main
- `packages/logger` (pino + redaction list, SEC-83) with a test that emails/prompts never appear; `packages/analytics` typed event catalogue; Sentry wiring (web/API/workers/mobile) enabled only when DSN set; PostHog EU behind consent banner (`consents` table via `POST /me/consents`); replay masked.

### Task 7 — Job system · owner: subagent (worktree `m1-jobs`)
- `packages/jobs`: `createJob()` (quota + insert in one RPC `private.create_job`), `enqueue()` with transports `inline` (dev: runs the worker handler in-process after the response via `after()`), `sqs`; lease/idempotent claim; stage writes; outbox sweeper function.
- `workers/`: handler registry keyed by `kind`, `fake` provider producing staged text then images; SQS event adapter with partial batch response.
- `GET /api/v1/jobs/:id`, `POST /api/v1/jobs/:id/cancel`; web `useJob()` hook subscribing to Realtime row changes.
- **Tests:** unit (claim/lease/idempotency), integration (create → inline worker → stages → succeeded), Playwright (button starts a fake job, UI shows stages without polling).

### Task 8 — Uploads & media · owner: subagent (worktree `m1-media`)
- `docker-compose.yml` MinIO (`platform/docker-compose.yml`), bucket bootstrap.
- `packages/media`: key layout, presign PUT, URL builder (signed URLs; CloudFront signer in AWS, MinIO presigned GET locally), rendition spec.
- `workers/rendition`: sharp pipeline (magic bytes, EXIF strip, rotate, HEIC→JPEG, 2048 master, 320/640/1080/1600 avif+webp, blurhash) → `assets.status='ready'`.
- `POST /api/v1/uploads`, `GET /api/v1/assets/:id`, `POST /api/v1/media/session`; CSP `img-src` += media origin.
- **Tests:** unit for key layout/URL signing; rendition test on fixture images (JPEG with EXIF GPS → stripped; HEIC); integration upload → ready → URLs load, 403/expired without signature.

## Exit gates (local)
`pnpm verify` + e2e green; fake job completes and streams to the browser; upload → renditions → signed delivery works; every SEC item in the brief's Inputs has a passing test. Cloud exit gates (staging deploy) wait on accounts — see `docs/runbooks/environments.md`.
