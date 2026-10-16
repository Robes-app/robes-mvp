# Robes Platform — Data Model Spec

Status: **normative**. The target schema is `reference/legacy-data-model.md` **§6 (Proposed target schema)** with the amendments below. Where this file and §6 disagree, this file wins. The legacy→target mapping for data migration is §6.10 of the reference (amended in §5 below) and is executed per `migration.md`.

Read first: `reference/legacy-data-model.md` §5 (security findings) — every one of those is closed by the rules in §1.

---

## 1. Rules (apply to every migration)

> **Superseded in part by ADR-019 (API-only data access).** Tables live in schema `app` with no RLS and no client grants; the API/workers use role `robes_app`; ownership is enforced by `@robes/db` repositories. Rules 2, 3, 5 (RLS/grants parts) and 7 (per-table RLS pgTAP) are replaced by `platform/CLAUDE.md` "Data access and security". Rules 1, 4, 6, 8 still apply (with `app.` instead of `public.`), and pgTAP now tests constraints, triggers and composite FKs.

1. **Migrations only** via Supabase CLI in `platform/supabase/migrations/` (timestamped). No SQL editor changes in staging/production — ever. Seeds in `platform/supabase/seed.sql` (dev) and reference-data migrations (all envs).
2. **Three ownership classes** per table, declared in a header comment of the migration that creates it: `-- ownership: user-writable | server-owned | reference`.
   - user-writable: RLS own-row with `(select auth.uid())`, `TO authenticated`, UPDATE has USING + WITH CHECK, **column-level grants** exposing only editable columns; no DELETE policy (soft delete via `deleted_at`).
   - server-owned: at most own-row SELECT; writes only by service role (API server-only module or workers) or narrow `security definer` RPCs.
   - reference: SELECT for `authenticated`; no DML grants.
3. `revoke all on all tables in schema public from anon;` and `alter default privileges in schema public revoke all on tables from anon;` in the baseline. The only anon surface is `public.get_share(token)` and `public.join_waitlist(...)` is **not** exposed (waitlist goes through the API).
4. Every user-content table has `id uuid default gen_random_uuid()`, `user_id uuid not null references auth.users on delete cascade`, `created_at`, `updated_at` (trigger `private.touch_updated_at`), `deleted_at`; index `(user_id, updated_at)` for delta sync; `unique (id, user_id)` so children use composite FKs.
5. Internal functions live in schema `private` (not exposed by PostgREST), `security definer` functions `set search_path = ''` and use fully-qualified names; `revoke execute ... from public, anon` then grant explicitly.
6. Enums are `text` + `check` (legacy ADR-002 convention).
7. **pgTAP test per table** in `platform/supabase/tests/`: RLS enabled; user A cannot select/update/insert user B rows; column grants enforced; anon has no access. A meta-test asserts every `public` table has RLS and an ownership comment.
8. Generated types: `supabase gen types typescript --local > packages/db/src/database.types.ts` runs in CI; drift fails the build.

## 2. Amendments to reference §6

| # | Change | Reason |
|---|---|---|
| A1 | `assets.provider check ('s3')` (legacy imports use `'cloudinary_legacy'` until re-hosted); add `bucket_key text`, `status check ('pending','ready','failed','deleted')`, `width`, `height`, `bytes`, `content_type`, `blurhash text`, `renditions jsonb` (widths/formats present), `has_cutout bool` | S3 + CloudFront media (ADR-005, `infrastructure.md` §5) |
| A2 | New `generation_cache` (server-owned, no client access): `key text PK` (sha256 of feature, model, prompt_version, normalized inputs), `output jsonb`, `asset_ids uuid[]`, `hits int`, `created_at`, `expires_at` | Dedupe (cost lever 6) |
| A3 | New `platform_budget` (server-owned): `day date`, `model_family text`, `cost_micros bigint`, `limit_micros bigint`, PK `(day, model_family)`; `private.record_spend()` | Global breaker SEC-03 |
| A4 | New `feature_flags` (reference): `key text PK`, `enabled bool`, `rollout jsonb`, `updated_at`; read by API with 30 s cache | Kill switches + gradual rollout |
| A5 | New `push_tokens` (user-writable insert/delete own): `id`, `user_id`, `expo_token text unique`, `platform check ('ios','android')`, `app_version`, `created_at`, `last_seen_at`, `revoked_at` | Native push for job completion + daily look |
| A6 | New `user_ui_state` (user-writable): `user_id PK`, `dismissed jsonb` (prompt keys → timestamp), `last_visit_at`, `seen_features text[]`, `updated_at` | Moves legacy localStorage-only state server-side for multi-device parity (`reference/legacy-features.md` storage inventory) |
| A7 | New `consents` (server-owned, own select): `user_id`, `kind check ('analytics','replay','marketing_email','photo_analysis')`, `granted bool`, `source`, `created_at` — append-only | GDPR SEC-84, DPIA |
| A8 | `generation_jobs`: add `stage text` (`queued`→`text`→`images`→`done`), `priority smallint`, `lease_until timestamptz`, `trace_id text`, `cost_micros bigint`, `model_map jsonb`; add `kind` values as features are ported; Realtime publication includes `generation_jobs` and `generation_assets` | Staged results, outbox lease, tracing, unit economics |
| A9 | `generation_assets`: add `on_demand bool` and `status 'deferred'` | Lazy image generation (cost lever 2) |
| A10 | `shares.snapshot` images reference copies under `shared/{token}/` (public, immutable) — never private keys | Private media stays signed |
| A11 | `lookbook_items` renamed **`artifacts`** in code and DB (`type` values as reference §6.5); keep a `lookbook` view only if migration tooling needs it | Clearer name; "Lookbook" remains the user-facing noun per naming map |
| A12 | `profiles.locale`, `profiles.timezone` (IANA), `profiles.currency char(3)`, `profiles.home_city` + `home_lat/lon` (user-writable, coarse) | Server-side daily batch at local 04:00, weather, i18n readiness |
| A13 | `account_deletion_requests` + `data_export_requests` (server-owned) with worker processing | SEC-80, SEC-81 |

Everything else in reference §6 (profiles column grants, `style_profiles`, `private.admin_users`, `audit_log`, wardrobe/wishlist/tags/inbox, looks/look_pieces/wears/`wardrobe_item_stats` view, planned_days with real FKs and `sync_planned_days` RPC, entitlements/usage_counters/`consume_quota`, `generation_calls` partitioned with 30-day payload retention, waitlist/feedback/events/notifications/email_suppressions, retention jobs, RLS templates) is adopted as written.

## 3. Migration files for the baseline (M1)

Create in this order (each with pgTAP tests):

1. `…_baseline_roles_and_schemas.sql` — schemas `private`, revoke anon defaults, `private.touch_updated_at`, extensions (`pgcrypto`, `citext`, `pg_cron`; **not** `vector` until needed).
2. `…_identity.sql` — `profiles` (+ signup trigger `private.handle_new_user`, column grants), `style_profiles`, `avatars`, `private.admin_users`, `private.is_admin()`, `audit_log`, `user_ui_state`, `consents`, `push_tokens`.
3. `…_reference_data.sql` — `wardrobe_taxonomy`, `wardrobe_tag_defaults`, `wear_seed_labels`, `plans`, `feature_flags` (+ seed rows generated from `packages/core` taxonomy).
4. `…_assets.sql` — `assets`, `account_deletion_requests`, `data_export_requests`.
5. `…_wardrobe.sql` — `wardrobe_items`, `wishlist_items`, `tags`, `tag_pieces`, `private.apply_tag_defaults` trigger, `inbox_addresses`, `wardrobe_inbox`, `decide_inbox` RPC.
6. `…_looks.sql` — `looks`, `look_pieces`, `set_look_pieces` RPC, `wears`, `wardrobe_item_stats` view, `tag_looks`.
7. `…_generation.sql` — `generation_jobs`, `generation_assets`, `generation_calls` (partitioned), `generation_cache`, `platform_budget`, `entitlements`, `usage_counters`, `private.consume_quota`, `private.record_spend`, Realtime publication.
8. `…_artifacts_and_sharing.sql` — `artifacts`, `planned_days`, `sync_planned_days`, `shares`, `create_share`, `revoke_share`, `get_share` (anon).
9. `…_growth.sql` — `waitlist`, `feedback`, `events` (partitioned), `notifications`, `email_suppressions`.
10. `…_retention_jobs.sql` — `pg_cron` schedules calling `private.purge_*` functions.

## 4. Access from code

- `packages/db` exports: generated `Database` type; `createUserClient(jwt)` (RLS applies) for API reads/writes on user-writable tables; `createServiceClient()` in a file that imports `server-only` and is lint-banned outside `platform/app/src/server/**` and `platform/workers/**`.
- Clients (web + native) may use supabase-js directly **only** for: own-row reads of user-writable tables, Realtime subscriptions, and auth. All writes with business rules (artifacts, sharing, look composition, planned days, deletion, uploads, quota'd actions) go through `/api/v1`. This keeps native and web behaviour identical and versionable.

## 5. Amendments to the legacy→target mapping (reference §6.10)

- Image URLs: every legacy Cloudinary URL becomes an `assets` row with `provider='cloudinary_legacy'`; a `rehost` maintenance job downloads each to S3, produces renditions, flips `provider='s3'`. Cutover does not wait for rehosting; the media loader handles both providers until done, then Cloudinary is cancelled.
- Legacy `share_id` values are kept as `shares.token` with `legacy_token = true` so `/board/<id>` keeps working; they are 40-bit, so they are **rate-limited and expire 180 days after cutover** unless the owner re-shares (which mints a 128-bit token).
- Legacy localStorage-only data (lookbook entries never synced, visit timing) is not migrated; the lookbook cloud copy is authoritative. Communicate this in the migration email.
- `profiles.is_admin = true` → `private.admin_users` only after manual review (the column was user-writable; treat as untrusted).
- `generation_log.user_id` is unverified legacy data: import only aggregates.
