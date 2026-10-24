# Robes Platform — Security Requirements

Status: **normative**. Every requirement here is a merge gate. Each requirement has an ID (`SEC-nn`), the legacy finding it closes, how it is enforced by design, and the automated test that proves it. A PR that touches the area must keep the test green; a PR that adds a new route, table, or external call must satisfy the relevant requirements before review.

Source findings: the production readiness review (2026-09-24, https://claude.ai/artifact/74NsRLx4k3wsPyYGJsw3RZ) and `docs/reference/legacy-*.md`. Legacy line numbers refer to branch `origin/beta` @ `2aef362`.

---

## 1. Threat model (short)

| Asset | Threat | Primary control |
|---|---|---|
| AI/compute budget (Gemini, Cloudinary) | Denial of wallet from anonymous or scripted callers | SEC-01, SEC-02, SEC-03, SEC-04 |
| User data (profile, wardrobe, photos, looks, travel dates, emails) | Cross-user reads, privilege escalation, public listing | SEC-10..SEC-16 |
| Face / body photos | Third-party likeness editing, public URLs, retention | SEC-20..SEC-23 |
| Service availability | Crash-by-input, memory exhaustion, long requests | SEC-30..SEC-34 |
| Internal network | SSRF from URL readers | SEC-40, SEC-41 |
| Accounts / sessions | XSS token theft, supply chain, clickjacking | SEC-50..SEC-55 |
| CRM / email reputation | Contact overwrite, list bombing | SEC-60, SEC-61 |
| Secrets & environments | Beta abuse spending prod budget, debug flags in prod | SEC-70..SEC-74 |
| Compliance (GDPR, app stores) | No deletion, unbounded logs, no consent | SEC-80..SEC-85 |

Trust boundaries: **client (web/native) → API (Next.js route handlers on Vercel) → workers (Lambda) → third parties**. Postgres is reached by clients only through RLS with a user JWT, by the API with a user-scoped client (RLS applies) or the service role for server-owned writes, and by workers with the service role. The service role key never reaches any client or any code path that runs in the browser.

---

## 2. Requirements

### Identity, quotas and cost (closes C2, H5)

**SEC-01 — Every non-public API route requires a verified user.**
- Enforced by: `packages/api` `route()` wrapper; default is `auth: 'user'`. Public routes must opt out explicitly with `auth: 'public'` and are listed in `docs/api.md#public-routes`.
- Verification: the Better Auth session (httpOnly cookie on web, SecureStore token on native) is resolved server-side on every request — never trust `userId` from the body/query. `user.id` is the only source of identity. (Originally specified as Supabase JWT/JWKS; superseded by ADR-020.)
- Test: `packages/api/test/auth.test.ts` enumerates the route manifest and asserts every non-public route returns `401` without a token and with an expired/forged token.

**SEC-02 — Per-user, per-feature quotas enforced before any paid call.**
- Enforced by: `quota` option on `route()` (e.g. `quota: { feature: 'looks.generate', cost: 1 }`) checked against `usage_counters` (Postgres) inside the same transaction that inserts the `generation_jobs` row. Plans/limits in `plan_limits` table; defaults in `packages/core/src/quotas.ts`.
- Test: integration test hits the limit and asserts `429 { code: 'quota_exceeded', resetAt }` and that no job row/queue message is created.

**SEC-03 — Global spend circuit breaker.**
- Daily budget per model family stored in `platform_budget`; workers increment actual cost from `usageMetadata` + image count. When ≥100% the API rejects new paid jobs with `503 { code: 'capacity' }` and a feature flag `kill.<feature>` can disable any feature instantly.
- Also: Google Cloud budget alerts at 50/80/100% and per-key quota caps; Cloudinary usage alerts; AWS Budgets. (See `infrastructure.md` §Cost controls.)
- Test: unit test of breaker; runbook check in launch checklist.

**SEC-04 — Rate limiting is per identity, per route, in a shared store.**
- Upstash Redis sliding window keyed `rl:{route}:{userId|ip}`; IP derived only from the platform-provided header (`x-vercel-forwarded-for` / `request.ip`), never raw `X-Forwarded-For`.
- Anonymous public routes (waitlist, share view, try-it-free if kept) additionally require Cloudflare Turnstile.
- Test: limiter unit tests with a fake store; e2e check that the 11th call/minute returns 429.

**SEC-05 — Generation calls are cancellable and time-boxed.** Every Gemini call passes an `AbortSignal` with a per-step budget; Lambda timeouts bound total work; no fire-and-forget promises in request handlers.

### Data access and RLS (closes C1, H1, A2, A3 findings)

> **ADR-019 changes the enforcement of SEC-10..15** from Postgres RLS to the API: client roles have no database access at all, and ownership is enforced by `@robes/db` repositories with cross-user tests. The intent of each requirement stands. Tests: `packages/db/test/schema/meta.test.ts` (no client access, no public tables) + repository cross-user tests. The SEC-10..15 bodies below keep their original RLS wording for the record. Rules: `platform/CLAUDE.md` "Data access and security".

**SEC-10 — Ownership model: user-writable vs server-owned tables.**
- User-writable columns are granted explicitly with column-level `GRANT UPDATE (...)`; everything else is server-owned and written only by the API (service role) or workers.
- Server-owned examples: `style_dna`, `colour_analysis`, `silhouette_analysis`, `wardrobe_items_count`, `onboarded_at`, `plan`, any counters, anything used for quotas, analytics or routing.
- Test: pgTAP `supabase/tests/rls_profiles.test.sql` asserts `authenticated` cannot update server-owned columns.

**SEC-11 — Admin is not a column users can reach.** `admin_users(user_id pk)` table, no grants to `anon`/`authenticated`; `is_admin()` is `security definer`, `set search_path = ''`, reads only that table. Admin routes require `auth: 'admin'`.
- Test: pgTAP asserts a normal user cannot insert into `admin_users` nor read any other user's rows; API test asserts admin routes 403 for non-admins.

**SEC-12 — No anon table grants.** `anon` has no `SELECT` on any table. Public share content is served by `security definer` RPCs (`get_shared_board(share_id text)`) returning a whitelisted projection, or by the API reading with the service role and projecting through a zod schema.
- Test: pgTAP asserts `anon` has zero table privileges in `public`.

**SEC-13 — Server-minted identifiers.** All primary keys are `uuid` (v7 preferred via `gen_random_uuid()` or app-generated UUIDv7); share ids are ≥128-bit random, url-safe, minted server-side. No `Date.now()` ids, no client-chosen share slugs.

**SEC-14 — RLS on every table, tested.** Every table in `public` has RLS enabled and policies written with `(select auth.uid())`. CI runs `supabase db lint` and the Supabase security advisors; failures block merge.
- Test: pgTAP meta-test iterates `pg_tables` and asserts `rowsecurity = true`.

**SEC-15 — Security definer hygiene.** All `security definer` functions `set search_path = ''`, use fully-qualified names, `revoke execute ... from public`, and grant only to the roles that need them.

**SEC-16 — Server loads context; never trusts client-supplied context.** Generation routes accept only ids/intents (e.g. `pieceIds`, `prompt`, `occasion`); the worker loads wardrobe, profile, style DNA and entitlements from the database by `user_id`. (Legacy trusted `wardrobeItems`, `styleDna`, `wardrobeCount`, `userId` from the body.)

### Photos and likeness (closes H6, part of H8)

**SEC-20 — Uploads are direct, signed, constrained.** API issues a short-lived Cloudinary signature bound to `folder=users/{userId}/{kind}`, `allowed_formats`, `max_file_size`, `resource_type=image`. Server never proxies raw base64 bodies. The upload result is registered via API, which verifies the asset belongs to the caller's folder before storing the public id.

**SEC-21 — Personal photos are private.** Headshots, full-length and avatar sources use Cloudinary `type=authenticated` (or `private`) delivery; clients get signed, expiring URLs from the API. Wardrobe/piece images may be public-by-obscurity only if the user opts to share; default private.

**SEC-22 — Try-on / avatar only edit the account holder's own photo.** The worker loads the source photo from the user's profile by id; request bodies cannot supply image data or third-party URLs for likeness edits. Style options are validated against enums from `packages/core` (`style_dna` catalogs).
- As built (M6): her model is a catalog portrait chosen by picks (presence, skin, hair, figure, nudges) — no one's photo is edited. `PATCH /me/model` accepts only catalog enums; `POST /looks/:id/render` renders only her own look on her own filed model (the worker loads both by the job owner's id). The shared `avatar_cells` catalog holds no user data.
- As built (twin, 2026-10-23): once she gives a close-up, a fact or a slider, her model is **one private twin per account** (`app.avatars.twin_asset_id`, a generated asset under her own prefix, delivered only signed). `POST /me/model/twin` takes no body: the job (`avatar_cell`, `target: 'twin'`) reads her close-up, facts and sliders by the job owner's id and lands only on her row (composite FK to her assets). Her close-up is sent to the image model as a reference for the twin and for each render on it.

**SEC-23 — Moderation.** Image prompts are built from server templates + validated fields (never raw model output to the image model). Generated images and user uploads that become public (shares) pass a moderation check; share pages have a report action.

### Robustness (closes C3, H4, F-8)

**SEC-30 — Validate every input.** Every route declares a zod `input` schema with explicit string/array caps; unknown keys stripped. Model outputs are parsed with zod before use or storage.
- Test: contract tests fuzz each route with type-confused bodies (`fast-check`) and assert `400`, never `500`.

**SEC-31 — No unhandled rejections.** Route wrapper catches and maps errors; a global error boundary reports to PostHog error tracking; clients get `{ code, message }` with generic text. No raw upstream error messages.

**SEC-32 — Body limits.** Default JSON limit 32 KB; no route accepts binary in JSON.

**SEC-33 — No in-process state.** No module-level Maps/caches that hold user data or job state; jobs in Postgres + SQS; rate limits in Redis. Web tier is stateless.

**SEC-34 — Long work is async.** Any operation that can exceed 3 s runs as a job (`202 { jobId }`); request handlers do no model calls except explicitly marked fast paths (<3 s p95, e.g. intent classification) with a hard 5 s timeout.

### Outbound requests (closes H3, M4, F-12)

**SEC-40 — URL fetching happens only in the isolated fetcher.** A dedicated Lambda outside any VPC, no IAM permissions beyond writing its result, performs: scheme allowlist (https, http→https), DNS resolution with private/loopback/link-local/CGNAT/multicast/IPv4-mapped-IPv6 rejection on the resolved address, connection pinned to the vetted IP, `redirect: 'manual'` with re-validation per hop (max 3), byte cap (2 MB streamed), 8 s timeout, content-type allowlist.
- As built: `packages/jobs/src/link` (`checkUrl`, `safeFetch`, `isBlockedAddress`) runs in `fetchFn` (no DB, secrets or bucket), which returns only parsed product metadata via jobs-interactive; the API refuses link imports when deployed without `FETCH_QUEUE_URL`. https only (http is refused, not upgraded); IP literals are judged before connecting because Node skips `lookup` for them. Test: the SEC-40 table in `packages/jobs/src/link/sec40.test.ts`. Dev-only `ALLOW_PRIVATE_FETCH` permits http and private addresses for e2e fixtures.
- Test: unit tests with a table of bypass payloads (redirect to 169.254.169.254, `*.nip.io`, `[::ffff:127.0.0.1]`, decimal IP, userinfo tricks).

**SEC-41 — Third parties never fetch attacker URLs on our behalf.** Only our own Cloudinary cloud URLs are accepted anywhere a URL is stored or forwarded (feedback attachments, share images).

### Browser and app surface (closes B4, B5, M2, L1)

**SEC-50 — Strict CSP with nonces.** Next.js middleware sets `Content-Security-Policy` with per-request nonce, `script-src 'self' 'nonce-…' 'strict-dynamic'`, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, `img-src` for self, data:, blob:, res.cloudinary.com; `connect-src` for Supabase, PostHog (EU). No inline event handlers. Plus HSTS (preload), `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `X-Content-Type-Options`.
- Test: Playwright asserts headers on `/`, `/app`, `/share/[token]`.

**SEC-51 — No raw HTML sinks.** `dangerouslySetInnerHTML` is banned by lint (allowlist only for JSON-LD via a helper that escapes `<`). Markdown/LLM text renders as text components.

**SEC-52 — Sessions.** Web: `@supabase/ssr` cookie-based session (httpOnly where supported by the flow), refreshed in middleware. Native: `expo-secure-store` adapter. No tokens in `localStorage` on web.

**SEC-53 — No third-party script CDNs.** All JS is bundled; exceptions (Turnstile) are allowlisted in CSP with exact origins.

**SEC-54 — Clickjacking and framing.** `frame-ancestors 'none'` everywhere; no `postMessage` listeners without origin checks.

**SEC-55 — Auth hardening.** Password policy enforced server-side in Supabase Auth (min 10, leaked-password protection on), email confirmation on, rate limits on auth endpoints, Sign in with Apple + Google, redirect URLs allowlisted exactly (no wildcards in production), invite gate hook while beta is closed.

### CRM and email (closes M3, F-11)

**SEC-60 — Waitlist is Postgres-first with double opt-in.** `waitlist_signups` table, Turnstile, per-IP limit, confirmation email; no unauthenticated update of existing contacts. CRM sync is one-way, outbound, from a worker.

**SEC-61 — Email sending.** Resend with a verified domain, DKIM/SPF/DMARC; one-click unsubscribe (RFC 8058) with HMAC-signed, expiring, single-purpose tokens; per-user preference table; idempotency ledger unique on `(user_id, kind, period)`.

### Secrets and environments (closes H7)

**SEC-70 — Three isolated environments.** `dev` (local Supabase + test keys), `staging`, `production`: separate Supabase projects, Gemini keys/projects, Cloudinary clouds (or at least separate sub-accounts/folders + keys), Resend domains, PostHog projects, AWS accounts (or at minimum separate stacks with separate IAM roles).

**SEC-71 — Env validated at boot.** `packages/config` parses env with zod per app; the app refuses to start on missing/invalid values or on debug flags in production (`ALLOW_PRIVATE_FETCH`, `NOTIFY_DEBUG` equivalents do not exist in production builds at all).

**SEC-72 — Secrets live in the platform stores.** Vercel encrypted env (web/API), AWS Secrets Manager (workers), EAS secrets (mobile build-time, public values only), Supabase Vault for DB-side secrets. Nothing secret in the repo; `gitleaks` in CI and pre-commit.

**SEC-73 — Least privilege IAM.** One role per Lambda; access only to its queue, its secrets and outbound network. GitHub Actions deploy via OIDC, no long-lived AWS keys.
- ADR-021 exception: the Vercel API uses scoped IAM user keys (`robes-<stage>-api`, CDK-managed, stored only in Secrets Manager and Vercel sensitive env) instead of OIDC; rotated every 90 days with zero downtime and monitored by an AccessDenied → alerts rule (`runbooks/key-rotation.md`).

**SEC-74 — Supply chain.** Lockfile committed, `pnpm audit --prod` and Dependabot/Renovate; exact versions for runtime deps; `engines` pinned to Node LTS; SBOM generated in CI.

### Privacy and compliance (closes H8)

**SEC-80 — Self-serve account deletion** (web + native, App Store 5.1.1(v)): API endpoint enqueues a deletion job that removes auth user, all rows (FK `on delete cascade` from `profiles`), Cloudinary assets under `users/{id}/`, PostHog person, Resend contact; sends confirmation; completes within 30 days (target: minutes).

**SEC-81 — Data export** (GDPR Art. 20): JSON export of profile, wardrobe, looks, lookbook, plus image URLs, delivered by signed link.
- As built: `POST/GET /api/v1/me/exports`; maintenanceFn's `data-export` task (5 min; inline in dev) writes one JSON file to `exports/{userId}/` (lifecycle 7 days, deleted with the account). Images are listed by asset id and key, not URLs. The API user may only GET `exports/*` to presign a ≤1 h download with `Content-Disposition: attachment`. Tests: DB (cross-user, claim/retry), processor, IAM, e2e (only her data in the file).

**SEC-82 — Retention.** `generation_log` prompts/responses retained 30 days (then aggregated metrics only); raw request logs 14 days; soft-deleted rows purged after 30 days; inbound receipt emails purged after processing + 7 days.

**SEC-83 — No PII in logs.** Structured logger with a redaction list (email, name, handle, prompt text, URLs of user photos); prompts go only to `generation_log` (access-controlled), never stdout.

**SEC-84 — Consent.** Analytics and session replay load only after consent (web banner; native ATT prompt not required for first-party analytics without tracking, but consent screen for replay). Replay masks all inputs and images by default.

**SEC-85 — Policies.** Privacy notice, terms, DPIA for photo analysis/AI edits, sub-processor list (Supabase, Vercel, AWS, Google, Cloudinary, Resend, PostHog), app-store privacy labels generated from a single data inventory (`docs/data-inventory.md`, maintained with the schema).

---

## 3. Legacy finding → requirement map

| Legacy finding (review) | Requirement(s) |
|---|---|
| C1 `profiles.is_admin` user-writable | SEC-10, SEC-11 |
| C2 no auth on paid endpoints / trusts `userId` | SEC-01..SEC-04, SEC-16 |
| C3 crash on malformed input | SEC-30, SEC-31 |
| H1 anon policy exposes all shared rows | SEC-12, SEC-13 |
| H2 Airtable formula injection | Airtable removed as datastore; SEC-30 (id validation) |
| H3 SSRF in read-url | SEC-40 |
| H4 `/api/look` memory/content spoofing | SEC-32, SEC-33, SEC-16 (server-generated share content only) |
| H5 broken rate limiter | SEC-04 |
| H6 try-on edits any photo | SEC-22, SEC-21 |
| H7 shared environments | SEC-70..SEC-72 |
| H8 GDPR gaps | SEC-80..SEC-85 |
| XSS sinks, tokens in localStorage | SEC-51, SEC-52, SEC-50 |
| Unpinned CDN supabase-js, no headers | SEC-53, SEC-50 |
| Prompt injection → image model | SEC-23, SEC-16 |
| Airtable fetches arbitrary URLs | SEC-41 |
| npm advisories, Node 18 | SEC-74 |
| Error leakage, health endpoint detail | SEC-31; `/api/health` returns `{ok}` only |
| Session never refreshed (signup-flow) | SEC-52 |
| Lookbook sync resurrects deletes | Data model: server-authoritative + soft delete (see `data-model.md`) |

## 4. Security review checklist

The current checklist, kept in step with the code, is in [`api-security.md`](api-security.md) → "Before you merge". It replaces the original RLS/pgTAP list (ADR-019/020 moved enforcement from Postgres RLS to `UserId`-scoped repositories with cross-user tests).
