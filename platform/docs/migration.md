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

Built as `@robes/migrate` (`platform/scripts/migrate/`, TypeScript run with tsx). Every command writes only to **local** databases (the same guard as `db:reset`); the legacy source is read with `SELECT` only.

| Command (from `platform/`) | Does |
|---|---|
| `pnpm migrate:fixture` | Builds `robes_legacy_fixture` locally from the legacy `supabase/*.sql` (order per `reference/legacy-data-model.md` §1, Supabase `auth`/roles stubbed, pgvector skipped) and seeds deterministic rows: 3 people, pieces with taxonomy/season/occasion data, wishlist, looks with pieces/tags/wears, every lookbook type, planned days, a public share, notifications, inbox rows, style DNA — plus the defects the reference records (cross-owner look pieces and wears, orphan plan days, empty `look` stubs, bad handles/categories/hero positions, base64 images). |
| `pnpm migrate:target` | Recreates `robes_migrate` from `db/migrations`. |
| `pnpm migrate:extract` | Copies `LEGACY_DATABASE_URL` (default: the fixture) into the target's `legacy` schema: only the catalogued columns (`src/catalog.ts`; never auth password hashes), one repeatable-read cursor per table. Columns or tables a real legacy database lacks (migrations 12–23 may not have run) are created empty, so transform always sees one shape; the report lists them. |
| `pnpm migrate:transform` | `legacy.*` → `app.*`, one transaction per domain (identity, wardrobe, looks, artifacts, plan, comms). Ids are kept; rows legacy had no uuid for (assets, artifacts) get name-based RFC v3 ids, so everything is `insert … on conflict do nothing` and a second run inserts nothing. |
| `pnpm migrate:assert` | The gate; exits 1 on any failure: per-user expected vs actual rows per domain (with transform's drop rules applied to the legacy side), orphans, a census of every migrated artifact against the shapes the app reads (`@robes/contracts`), and share-token continuity. Warnings list legacy admins for manual review and pieces whose `times_worn` exceeds their recorded wears. |
| `pnpm migrate:rehost -- --dry-run` | Lists each `cloudinary_legacy` asset and its target `uploads/{userId}/{assetId}/original` key. |
| `pnpm migrate:reverse-delta -- --since=<ISO> [--out=f.json]` | Rollback export (§5): profiles updated and pieces, looks and artifacts created on the platform since cutover. |
| `pnpm migrate:rehearse` | Fixture (unless `LEGACY_DATABASE_URL` is set) → fresh target → extract → transform → assert. |

The tests (`scripts/migrate/test`, part of `pnpm db:test`) rehearse the fixture end to end, re-run transform, simulate a legacy database missing later migrations, and prove assert fails on lost or corrupted data.

**Mapping decisions** (reference §6.10 as amended by `data-model.md` §5):
- **Auth (ADR-020):** there is no Supabase auth migration. `auth.users` becomes `app.users` (id, lower-cased email, name from the profile, `email_verified` from `email_confirmed_at`). Sign-in is passwordless, so no hashes move; Google/Apple identities re-link by email on first sign-in (`accountLinking`). Two legacy accounts with one email (case-insensitively) can't both exist: the later one is dropped and assert fails on it, for a human to merge.
- **Profiles:** values are held to the target's checks (names ≤60, handles must match the pattern after stripping `@`, arrays ≤20). Notification prefs map `looks_ready/morning/nudges/receipts` → `looksReady/morningCue/nudges/receipts`, and `prefs.timezone` becomes `profiles.timezone` when it's a real zone. Style DNA splits into `style_profiles`. The digital twin and brief (legacy Settings + style memory, all on `style_dna`) map as: `brands` → `profiles.style_brands`, `investment` (or a level-shaped `annual_spend`, else the old `budget` tier) → `investment_level`, `facts` → `height_cm`/`size_uk`/`shoe_uk`/`age_band` (out-of-range values and any weight are dropped), `brief.notes`/`read_at` → `style_profiles.brief_notes`/`brief_read_at`, `brief.colours` merged into `user_overrides`, `brief.loves/avoids/rules` (kept), `pending` and `struck` → `style_brief_lines`, and `memory.entries` (verdict, swap, strike, ask) → `style_memory`; memory wears are not copied because `app.wears` already holds them. `is_admin` is **not** carried (warning only). `inbox_address` is not carried (re-minted later).
- **Images:** every http(s) Cloudinary URL becomes an `assets` row (`provider='cloudinary_legacy'`, `status='pending'`, headshots/full-length `sensitive`); `data:` URLs are dropped.
- **Wardrobe/wishlist:** unknown categories → `Other`; L2/L3 kept only where the target taxonomy has them; duplicate hero positions keep the oldest; season band from the stored band, else from `seasons[]` (the legacy migration-17 rule). Tags come from legacy tags plus `occasions`/`looks.tags`, matched by slug; links keep their legacy `source`. `times_worn` is not carried (derived from wears).
- **Looks:** pieces and wears only where owners match; unknown `source`/`role` values fall back to defaults (`robes`/`robes-build` → `generated`, `daily` → `today`, so "Composed by Robes" holds). Looks are carried in every state (legacy migration 25 → `looks.status`): only saved ones take tags, renders and days. A suggestion keeps its anchor piece when it is hers; its photograph (Robes' frame) becomes the look's frame, as does a saved look's whose source is `robes` or that carries proposals. `styling` notes (migration 24) carry by her piece ids. Legacy `set_id`/`set_index` aren't platform set records, so carried suggestions leave the deck and ↻ (counted in a warning). Legacy-shaped `proposals` are read as rack proposals at display.
- **Lookbook → artifacts:** a key piece whose three ways parse becomes a **saved idea** (shows in Looks › Ideas); otherwise it's kept as a `key_piece` archive. Daily looks are reshaped to the stored daily shape (canonical steps, ≤2 items, only her own pieces matched, valid palette). Travel edits, moodboards and weekly plans are unwrapped and archived. `look` stubs are dropped. Base64 and client job ids are scrubbed. Legacy lookbook rows were saved, so `saved_at = created_at` and nothing expires.
- **Shares:** a public row's `share_id` stays the token (`legacy_token = true`, expiring 180 days after migration) with a whitelisted snapshot.
- **Plan:** `look` rows resolve to looks, others through the lookbook's `legacy_id`; weekly rows and orphans are dropped.
- **Comms:** the notification ledger copies (keeps idempotency; `receipt_held` → `receipt`). Held inbox rows copy whole; decided ones keep only their outcome.
- **Not migrated:** `events`, `generation_log`, `prompt_history`, `feedback`, `avatar_cells`, the Airtable exports. They are extracted, so they can be added as domains later.

**Needs the real legacy database to verify:** which of migrations 12–23 actually ran and the real JSON heterogeneity (run extract and read its missing-column report, then assert's census); duplicate emails; volumes (extract batches through a cursor, transform is set-based except artifacts, which loop per row); Cloudinary URL shapes. **Not built yet:** the real rehost copy (a maintenance task that PUTs each legacy image to its upload key so `RenditionFn` builds renditions, then flips `provider` to `s3`), the Airtable export, the legacy redirect map, and a public renderer for legacy artifact shares (`/share/[token]` currently renders look snapshots only).

Rehearse against a copy of legacy on staging until `migrate:assert` is clean twice in a row.

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
