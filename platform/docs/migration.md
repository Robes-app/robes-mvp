# Robes Platform — Migration & Cutover Plan

Status: **normative**. How legacy (Railway + Supabase `Robes_p0` + Cloudinary + Airtable) is replaced by the platform without disrupting current development or beta users.

## 1. Strategy: build beside, then cut over

- Legacy keeps running and shipping (`main` → www, `beta` → beta.byrobes.com) until the platform reaches the parity checklist (`reference/legacy-features.md` Parity checklist) and the P0 UX requirements.
- The platform runs on **new** Supabase projects, AWS accounts, Vercel project and domains (`app.`, `staging.`, `media.`). Nothing in the platform writes to `Robes_p0`, Cloudinary or Airtable, except the one-way ETL reads during migration rehearsals.
- Beta testers are invited to the platform (staging then production) as soon as M4 is usable; legacy beta stays available as a fallback until cutover.

## 2. Before migration (fix legacy exposure now)

The platform takes months. These legacy fixes are tiny and should ship on `beta`/`main` immediately (tracked as plan `plans/2026-09-24-p0-legacy-hotfixes.md`):
1. Verify and revoke `profiles.is_admin` self-escalation (column grant + move flag).
2. Drop anon share policy → RPC.
3. Validate `/api/look/:id` id format; body limits; async error wrapper; trust proxy; JWT check on paid routes.
4. Budget alerts on Gemini/Cloudinary.

## 3. Rehearsal (repeatable, scripted)

`platform/scripts/migrate/` (TypeScript, run from a trusted machine or a one-off Lambda):

1. `introspect.ts` — `supabase db pull` against `Robes_p0` (read-only role) → record which legacy migrations actually exist (12, 16–23 may not have run).
2. `extract.ts` — `pg_dump --data-only` of legacy public schema into a `legacy` schema on the **staging** project; Airtable `Contacts` + `Feedback` exported via API to JSON → staging tables.
3. `transform.sql` — the mapping in `reference/legacy-data-model.md` §6.10 amended by `data-model.md` §5, as `insert … select` from `legacy.*` into the target tables inside one transaction per domain.
4. `assert.ts` — per-user row counts per domain, orphan report, JSON-shape census per artifact type validated against `packages/contracts` schemas, share-token continuity check, sample visual diff of 20 random users' wardrobes.
5. `rehost.ts` — enqueue `maintenance` jobs to copy Cloudinary assets to S3 and build renditions (idempotent; resumable).
6. Auth users: Supabase auth migration into the new project (preserves user ids + password hashes; OAuth identities re-link by email on first sign-in). Re-register Google OAuth client redirect URIs for the new project; add Apple.

Rehearse on staging until `assert.ts` is clean twice in a row.

## 4. Cutover (production), target end of M6

T-7 d: email beta users (what changes, same login, lookbook preserved, localStorage-only drafts not migrated).
T-0:
1. Put legacy into read-only mode (feature flag in legacy server: 503 on write routes; banner).
2. Final `extract` → `transform` → `assert` into production.
3. Start `rehost` (runs in background; loader serves `cloudinary_legacy` until done).
4. DNS: `www.byrobes.com` and `beta.byrobes.com` → Vercel (beta redirects to `app.`). Legacy paths: `/look/:id` → share lookup by legacy id (Airtable-backed looks imported into `shares` with `legacy_token`), `/board/:id` → `/share/:id`, `/dashboard` → `/today`, etc. (redirect map generated from `reference/legacy-features.md` route map).
5. Rotate: legacy Supabase publishable + service keys, Gemini key, Cloudinary keys, Airtable token.
6. Smoke tests + watch dashboards for 48 h.

T+30 d: when `rehost` is complete and no `cloudinary_legacy` assets remain → cancel Cloudinary; archive Airtable base (export kept in S3 backups bucket); pause `Robes_p0` (keep a final dump 90 days); delete Railway services; remove legacy code from the repo (`public/`, `server.js`, etc.) in one PR.

## 5. Rollback

Until step 4 (DNS), rollback = remove read-only flag on legacy. After DNS, rollback = point DNS back and re-enable legacy writes; data written on the platform in between is exported by `scripts/migrate/reverse-delta.ts` (profiles, wardrobe items, looks, artifacts created after T-0) — written and tested in rehearsal.
