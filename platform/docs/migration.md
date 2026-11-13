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
| `pnpm migrate:extract [-- --only=a@x.com,b@y.com]` | Copies `LEGACY_DATABASE_URL` (default: the fixture) into the target's `legacy` schema (with `--only`, those people and nobody else, §4a; a person whose email already has a platform account is re-keyed to it): only the catalogued columns (`src/catalog.ts`; never auth password hashes), one repeatable-read cursor per table. Columns or tables a real legacy database lacks (migrations 12–23 may not have run) are created empty, so transform always sees one shape; the report lists them. |
| `pnpm migrate:transform` | `legacy.*` → `app.*`, one transaction per domain (identity, wardrobe, looks, artifacts, plan, comms). Ids are kept; rows legacy had no uuid for (assets, artifacts) get name-based RFC v3 ids, so everything is `insert … on conflict do nothing` and a second run inserts nothing. |
| `pnpm migrate:assert` | The gate; exits 1 on any failure: per-user expected vs actual rows per domain (with transform's drop rules applied to the legacy side), orphans, a census of every migrated artifact against the shapes the app reads (`@robes/contracts`), and share-token continuity. Warnings list legacy admins for manual review and pieces whose `times_worn` exceeds their recorded wears. |
| `pnpm migrate:rehost -- --dry-run` | Lists each `cloudinary_legacy` asset and its target `uploads/{userId}/{assetId}/original` key. |
| `pnpm migrate:rehost -- --apply --bucket=<media bucket>` | Copies each one (admin AWS creds in env): fetches it from `res.cloudinary.com` only (20 MB cap, 30 s timeout), PUTs it to its upload key, then flips the row to `provider='s3'`; the S3 event (`RenditionFn`) renders it and marks it ready. Re-runnable: failures stay `cloudinary_legacy` for the next run. |
| `pnpm migrate:reverse-delta -- --since=<ISO> [--out=f.json]` | Rollback export (§5): profiles updated and pieces, looks and artifacts created on the platform since cutover. |
| `pnpm migrate:rehearse` | Fixture (unless `LEGACY_DATABASE_URL` is set) → fresh target → extract → transform → assert. |

The tests (`scripts/migrate/test`, part of `pnpm db:test`) rehearse the fixture end to end, re-run transform, simulate a legacy database missing later migrations, and prove assert fails on lost or corrupted data.

**Mapping decisions** (reference §6.10 as amended by `data-model.md` §5):
- **Auth (ADR-020):** there is no Supabase auth migration. `auth.users` becomes `app.users` (id, lower-cased email, name from the profile, `email_verified` from `email_confirmed_at`). Sign-in is passwordless, so no hashes move; Google/Apple identities re-link by email on first sign-in (`accountLinking`). Two legacy accounts with one email (case-insensitively) can't both exist: the later one is dropped and assert fails on it, for a human to merge.
- **Profiles:** values are held to the target's checks (names ≤60, handles must match the pattern after stripping `@`, arrays ≤20). Notification prefs map `looks_ready/morning/nudges/receipts` → `looksReady/morningCue/nudges/receipts`, and `prefs.timezone` becomes `profiles.timezone` when it's a real zone. Style DNA splits into `style_profiles`. The digital twin and brief (legacy Settings + style memory, all on `style_dna`) map as: `brands` → `profiles.style_brands`, `investment` (or a level-shaped `annual_spend`, else the old `budget` tier) → `investment_level`, `facts` → `height_cm`/`size_uk`/`shoe_uk`/`age_band` (out-of-range values and any weight are dropped), `brief.notes`/`read_at` → `style_profiles.brief_notes`/`brief_read_at`, `brief.colours` merged into `user_overrides`, `brief.loves/avoids/rules` (kept), `pending` and `struck` → `style_brief_lines`, and `memory.entries` (verdict, swap, strike, ask) → `style_memory`; memory wears are not copied because `app.wears` already holds them. `is_admin` is **not** carried (warning only). `inbox_address` is not carried (re-minted later).
- **Images:** every http(s) Cloudinary URL becomes an `assets` row (`provider='cloudinary_legacy'`, `status='pending'`, headshots/full-length `sensitive`); `data:` URLs are dropped.
- **The twin (legacy migration 26):** `style_dna.facts` bust (bra band + cup unless `bust_mode` is `cm`, else the tape) and waist copy into `profiles.bust_band/bust_cup/bust_cm/waist_cm`; anything outside the target's ranges is left unset (counted in a warning). An http `twin_url` becomes a sensitive `generated` asset that `avatars.twin_asset_id` points at, with `twin_key` null so the platform redraws its own key on her first visit (legacy keys hash different inputs); a twin with no filed model files the catalog default for her presence. A missing twin fails the gate.
- **Wardrobe/wishlist:** unknown categories → `Other`; L2/L3 kept only where the target taxonomy has them; duplicate hero positions keep the oldest; season band from the stored band, else from `seasons[]` (the legacy migration-17 rule). Tags come from legacy tags plus `occasions`/`looks.tags`, matched by slug; links keep their legacy `source`. `times_worn` is not carried (derived from wears).
- **Looks:** pieces and wears only where owners match; unknown `source`/`role` values fall back to defaults (`robes`/`robes-build` → `generated`, `daily` → `today`, so "Composed by Robes" holds). Looks are carried in every state (legacy migration 25 → `looks.status`): only saved ones take tags, renders and days. A suggestion keeps its anchor piece when it is hers; its photograph (Robes' frame) becomes the look's frame, as does a saved look's whose source is `robes` or that carries proposals. `styling` notes (migration 24) carry by her piece ids. Legacy `set_id`/`set_index` aren't platform set records, so carried suggestions leave the deck and ↻ (counted in a warning). Legacy-shaped `proposals` are read as rack proposals at display.
- **Lookbook → artifacts:** a key piece whose three ways parse becomes a **saved idea** (shows in Looks › Ideas); otherwise it's kept as a `key_piece` archive. Daily looks are reshaped to the stored daily shape (canonical steps, ≤2 items, only her own pieces matched, valid palette). Travel edits, moodboards and weekly plans are unwrapped and archived. `look` stubs are dropped. Base64 and client job ids are scrubbed. Legacy lookbook rows were saved, so `saved_at = created_at` and nothing expires.
- **Shares:** a public row's `share_id` stays the token (`legacy_token = true`, expiring 180 days after migration) with a whitelisted snapshot.
- **Plan:** `look` rows resolve to looks, others through the lookbook's `legacy_id`; weekly rows and orphans are dropped.
- **Comms:** the notification ledger copies (keeps idempotency; `receipt_held` → `receipt`). Held inbox rows copy whole; decided ones keep only their outcome.
- **Not migrated:** `events`, `generation_log`, `prompt_history`, `feedback`, `avatar_cells`, the Airtable exports. They are extracted, so they can be added as domains later.

**Needs the real legacy database to verify:** which of migrations 12–23 actually ran and the real JSON heterogeneity (run extract and read its missing-column report, then assert's census); duplicate emails; volumes (extract batches through a cursor, transform is set-based except artifacts, which loop per row); Cloudinary URL shapes. **Not built yet:** the Airtable export. (The legacy redirect map is `app/src/lib/legacy-redirects.ts`; legacy artifact shares render at `/share/[token]`.)

**Material (legacy migration 29):** lands in `app.wardrobe_items.material` / `app.wishlist_items.material` (the same 40 ids as `@robes/core/material`); an unknown value is dropped.

**Building the fixture from a checkout without the legacy SQL** (`main`): `ROBES_LEGACY_SQL_DIR=<a checkout of beta>/supabase pnpm migrate:rehearse`.

Rehearse against a copy of legacy on staging until `migrate:assert` is clean twice in a row.

## 4. Cutover (production), target end of M6

T-7 d: email beta users (what changes, same email but a 6-digit code instead of a password, Google unchanged, lookbook preserved, localStorage-only drafts not migrated).
Test copy first (any day before T-0): with the legacy app still live, run `extract` → `transform` → `assert` into production, then `rehost --apply --bucket=robes-prod-media-259887029472` so their photos show, and test on the app domain with the founders' own accounts. Before it, disable production's `notify-tick` and `daily-look-batch` schedules (EventBridge Scheduler) so migrated users get no email or overnight looks early; a `cdk deploy` of Prod-Schedules re-enables them. Keep the app domain private until T-0.

T-0:
1. Put legacy into read-only mode (feature flag in legacy server: 503 on write routes; banner).
2. **No wipe (owner's rule, 12 Nov 2026: Robes never deletes her data).** The plan here was `migrate:reset` on production before the final copy; production has held real TestFlight accounts since November, so `migrate:reset` now refuses `--target=production`. The copy is additive: run the final `extract` → `transform` → `assert` into production as it stands. The copy can name people (`migrate:extract -- --only=a@x.com,b@y.com`) and adds to an account she already has (§4a). Re-enable the two paused schedules. Production's schema `app` lives inside the legacy Supabase project (Robes_p0), so source and target are the same database; the tool refuses any non-local target unless the command carries `--target=production` **and** `ROBES_MIGRATE_PRODUCTION` names its exact `user@host` (and `migrate:reset` there needs `--confirm-wipe=<user@host>`; `--target=staging` with `ROBES_MIGRATE_STAGING` runs the same commands on staging for rehearsal). Exact commands: `runbooks/production-release.md`. Keep the `legacy` copy schema and every legacy table for at least a week after T-0 (the rollback window): nothing in `Robes_p0` is dropped or truncated until then.
3. `pnpm migrate:rehost -- --target=production --apply --bucket=robes-prod-media-259887029472` (same `ROBES_MIGRATE_PRODUCTION`); re-run until `failed` is empty. The app shows no image for a `cloudinary_legacy` asset, so finish this before DNS.
4. DNS: `app.byrobes.com` public; `www.byrobes.com` → Vercel. `beta.byrobes.com` stays on Railway, untouched, as the rollback target; it is pointed at Vercel (redirecting to `app.`) only once the dust has settled (T+30 d). Legacy paths, which take over then: `/look/:id` → share lookup by legacy id (Airtable-backed looks imported into `shares` with `legacy_token`), `/board/:id` → `/share/:id`, `/dashboard` → `/today`, etc. (redirect map generated from `reference/legacy-features.md` route map).
5. Rotate: legacy Supabase publishable + service keys, Gemini key, Cloudinary keys, Airtable token.
6. Smoke tests + watch dashboards for 48 h.

T+30 d: point `beta.byrobes.com` at Vercel (`robes-prod`, 307 → `app.`). When `rehost` is complete and no `cloudinary_legacy` assets remain → cancel Cloudinary; archive Airtable base (export kept in S3 backups bucket); pause `Robes_p0` (keep a final dump 90 days); delete Railway services; remove legacy code from the repo (`public/`, `server.js`, etc.) in one PR.

## 4a. Bringing named beta people across before cutover (12 Nov 2026)

For a handful of beta testers who should find their wardrobe in the new app now. It is a **one-way copy at one moment**: beta is only read and keeps working as it was, and nothing added on either side afterwards reaches the other.

- **Named people only.** `pnpm migrate:extract -- --only=a@x.com,b@y.com` copies those legacy accounts and what they own, and nobody else's rows. An address legacy does not know stops the run before anything is copied.
- **An account she already has.** If her email already has a platform account (she signed in on TestFlight first), extract re-keys her rows in the `legacy` copy to that account and reports it as `merged`. Transform then adds her pieces, wishlist, looks, wears, days, lookbook, brief lines and memory to it.
- **Nothing she has is overwritten.** Only an account the run creates is filled from her legacy profile and Style DNA. An account that already existed keeps its profile, style profile, twin and Hero Rack places; legacy fills only what is empty there (a twin where she has none, a palette where hers is empty). A second run adds what is new on beta and changes nothing.
- **Not carried, as in §3:** prompt history, feedback, usage events, and anything that lived only in her browser.

Order: the census (who is on beta, who already has a platform account), then the whole run on **staging** with the same `--only` list, sign in there as each person and look, then production.

```bash
# Census, read-only (legacy and production share Robes_p0):
PGOPTIONS='-c default_transaction_read_only=on' psql "$LEGACY_DATABASE_URL" -f scripts/migrate/census.sql

export LEGACY_DATABASE_URL='<Robes_p0 admin URL>'           # read with SELECT only
export TARGET_DATABASE_URL='<staging admin URL>'            # then production's migration role
export ROBES_MIGRATE_STAGING='<user@host of TARGET_DATABASE_URL>'
pnpm migrate:extract -- --target=staging --only=a@x.com,b@y.com
pnpm migrate:transform -- --target=staging --quiet-arrival   # new accounts arrive with notifications off
pnpm migrate:assert -- --target=staging                     # exits 1 on any failure
pnpm migrate:rehost -- --target=staging --dry-run
pnpm migrate:rehost -- --target=staging --apply --bucket=<staging media bucket>
```

Before the production run: confirm point-in-time recovery is on. Beta goes on emailing these people, so run transform with `--quiet-arrival`: the accounts it creates start with every platform notification off, hers to switch on under You › Notifications. An account she already had keeps its own settings.

## 5. Rollback

Until step 4 (DNS), rollback = remove read-only flag on legacy. After DNS, rollback = re-enable legacy writes and send users back to `beta.byrobes.com` (still on Railway; point `www` back if needed); data written on the platform in between is exported by `scripts/migrate/reverse-delta.ts` (profiles, wardrobe items, looks, artifacts created after T-0) — written and tested in rehearsal.
