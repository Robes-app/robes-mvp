# Legacy data model (Robes_p0), and the target schema

Status: reference document. The source is branch `platform` (live beta code) as of 2026-09-24.
Scope: every `supabase/*.sql` file (27), `supabase/functions/wardrobe-context/index.ts`, `docs/system-architecture.md`, `architecture-decisions.md`, and every REST/RPC call site in `server.js`, `inbox.js`, `notify.js`, `public/*.html` and `public/js/dashboard-personalize.js`.

> **Caveat: this is the declared schema, not the introspected one.** The legacy project has no migration ledger. Files were pasted into the SQL editor by hand. `CLAUDE.md:1110-1133` lists many of them as **NOT yet run on Robes_p0** (see §1). §2 describes the schema you get with every file applied. Before any data migration, run `supabase db pull` (or `pg_dump --schema-only`) against Robes_p0 and diff it against §2. Treat every "NOT yet run" object as possibly absent. Also expect an unused, pre-existing `public.looks` table of a different shape (`looks_migration.sql:16-35`).

Line citations are written `file:line` and are relative to the repo root.

---

## 1. Migration order

The canonical order comes from `CLAUDE.md:1110-1133`. Four files are not in that list, and their positions are inferred from their headers. They are marked *(inferred)* below.

| # | File | What it does | Run status (per CLAUDE.md) | Idempotent / re-runnable? |
|---|---|---|---|---|
| 1 | `schema.sql` | `profiles` (with the style-notes columns inline), `prompt_history`, `handle_new_user()` + `on_auth_user_created` trigger, `set_updated_at()` + `set_profiles_updated_at`, RLS + 5 policies | run | **No.** The tables use `if not exists` and the triggers drop first, but the `create policy` statements (`:89-109`) have no `drop policy if exists`, so a re-run fails with 42710. |
| 2 | `wardrobe_schema.sql` | `wardrobe_items` + the "Users own their wardrobe items" FOR ALL policy + a user_id index | run | **No.** `CREATE POLICY` has no drop (`:19-22`). |
| 3 | `item_dna_migration.sql` | `wardrobe_items.item_dna jsonb not null default '{}'` + a GIN index | run | Yes |
| 4 | `style_notes_migration.sql` | 8 scalar Style Notes columns on `profiles`. These are no-ops on a fresh project, because schema.sql already has them. | run | Yes |
| 5 | `style_notes_analysis_migration.sql` | `profiles.colour_analysis`, `silhouette_analysis` jsonb | run | Yes |
| 6 | `style_dna_migration.sql` | `create extension vector`; `profiles.style_dna jsonb` + GIN; `profiles.wardrobe_items_count` + the `sync_wardrobe_items_count()` trigger; backfill | run | Yes. The backfill recomputes the counts. |
| 7 | `onboarding_migration.sql` | `profiles.onboarded_at` + a backfill of `coalesce(created_at, now())` for every null row | run | **Not safe to re-run.** The backfill (`:9-11`) would mark every current un-onboarded user as onboarded. |
| 8 | `lookbook_migration.sql` | `lookbook_items` (composite PK `(user_id, id)`, client `Date.now()` id) + 4 own policies + an index | run | **No.** The policies have no drop (`:21-28`). |
| 9 | `share_migration.sql` | `lookbook_items.share_id`, `is_public`, a unique partial index, the **anon** select policy; `profiles.instagram_handle` | "verify it has been run" | Yes |
| 10 | `wardrobe_v2_migration.sql` | `wardrobe_items.hero_position`, `seasons[]`, `occasions[]`, `price`, `fit_confidence`, `sentiment` + the hero index; `wishlist_items` + RLS | shipped 2026-07-14 (run status not stated) | Yes |
| 11 | `admin_capture_migration.sql` | `profiles.is_admin`, `is_admin()`, `events`, `generation_log`, `feedback`, admin-read policies on 5 tables, the `admin_user_overview()` RPC | shipped 2026-07-21 | Yes. Every policy is dropped first, and the old RPC signature is dropped (`:140`). |
| 12 | `planned_days_migration.sql` | `planned_days` (one row per moment) + unique moment index + own-all/admin-read RLS | "NOT yet run" at `CLAUDE.md:838` (later sections imply it was run: **verify**) | Yes |
| 12a | `planned_days_backfill.sql` *(inferred: companion to 12, "after migration 12", `:1`)* | Rebuilds travel-edit blobs into `planned_days` rows. Skips daily looks. Does not emit weekly rows. | unknown | Yes. It upserts on the moment index (`:81-85`, `:112-114`). |
| 13 | `gender_identity_migration.sql` | `profiles.gender_identity text not null default 'woman'` + a check constraint | shipped 2026-07-28 | Yes. The constraint is guarded by a `pg_constraint` lookup. |
| 14 | `looks_migration.sql` | `looks`, `look_pieces`, `wears` + RLS, with a preflight guard against the stray `public.looks` | shipped 2026-07-30 | Yes |
| 15 | `wardrobe_taxonomy_migration.sql` | `wardrobe_items.category_l2/l3`, the `wardrobe_taxonomy` lookup (350 seed rows), a composite FK, a partial index | shipped 2026-07-31 | Yes. The seed is an upsert. |
| 16 | `look_roles_migration.sql` | `look_pieces.role text` | **NOT yet run** | Yes |
| 16a | `weekly_plan_sweep.sql` *(inferred: ADR-001 dated 2026-08-08, so it lands between 16 and 17; needs 12)* | Deletes `planned_days` rows where `source_type='weekly'` and flips `lookbook_items.type` from `weekly-plan` to `weekly-plan-archived` | optional ("client performs the same sweep lazily") | Yes (`:15`) |
| 17-pre | `season_tags_audit.sql` *(inferred: "run BEFORE migration 17")* | A read-only gate report on the 25% cross-band threshold | n/a | Yes (read-only) |
| 17 | `season_tags_migration.sql` | `wardrobe_items.season_band/season_source`, `looks.climate_band/climate_source`, `tags`/`tag_pieces`/`tag_looks`, `rb_tag_slug()`, backfills from `seasons`/`occasions`/`looks.tags` | **NOT yet run** | DDL yes. **The backfill is only safe before Session B.** `:119-130` recomputes `season_band` from `seasons` and overwrites `season_source`, which would clobber any `'user'` band set after the first run. |
| 18 | `tag_prefill_migration.sql` | `wardrobe_tag_defaults`, `wear_seed_labels`, `rb_piece_defaults()`, `rb_apply_tag_defaults()`, the AFTER INSERT trigger on `wardrobe_items`, a one-shot backfill | **NOT yet run** | Yes (per `:10-11`) |
| 18-post | `season_tags_verify.sql` *(inferred: "Run this AFTER" 17; its preflight needs 18)* | A read-only reconciliation report | n/a | Yes (read-only) |
| 19 | `look_proposals_migration.sql` | `looks.proposals jsonb` | **NOT yet run** | Yes |
| 20 | `avatar_migration.sql` | `profiles.avatar_id`, `avatar_prefs` | **NOT yet run** (`CLAUDE.md:390`) | Yes |
| 21 | `avatar_render_migration.sql` | `avatar_cells` + authenticated-read RLS; `looks.render_url/render_key` | **NOT yet run** (`CLAUDE.md:395`) | Yes |
| 22 | `notifications_migration.sql` | `profiles.notification_prefs`; the `notifications` ledger + own/admin read | **NOT yet run** | Yes |
| 23 | `wardrobe_inbox_migration.sql` | `wardrobe_items.size/currency(/price)`, `wishlist_items.size/currency/category_l2/l3`, `profiles.inbox_address` (partial unique), `wardrobe_inbox` | **NOT yet run** | Yes. `filed_to` was added to the `create table` in a later commit (897bf30). Any project that ran the first revision has no `filed_to`, and a re-run will not add it. |

Consequences for the new platform:
- There is no ledger, and some files are neither re-runnable nor safe to replay, so **do not replay these files** into the new project. Build the new schema from §6 as CLI migrations, and move the data with explicit ETL (§6.9).
- The legacy client degrades at runtime whenever a column is missing: it strips the column and retries on PGRST204 (`dashboard-personalize.js:3600-3640`, `:11371-11450`). The legacy data therefore has **heterogeneous shapes**. Rows written before a migration ran carry their values only in the localStorage cache on some device, never in the DB. Examples: look `role`, `proposals`, `render_url`, and the avatar.

---

## 2. Effective schema (all 23 migrations applied)

Conventions: *"public"* in a policy means the policy has no `TO` clause, so it applies to every role, `anon` included. Every policy is PERMISSIVE. `auth.uid()` is always called bare, never wrapped in `(select auth.uid())`. No table has a `DELETE` policy unless one is listed.

### 2.1 `public.profiles`
One row per auth user. `handle_new_user()` creates the row on signup.

| Column | Type | Default | Null | Constraints / source |
|---|---|---|---|---|
| id | uuid | | NOT NULL | PK, FK → `auth.users(id)` ON DELETE CASCADE (`schema.sql:9`) |
| first_name | text | | null | `schema.sql:10`; seeded from `raw_user_meta_data->>'first_name'` |
| last_name | text | | null | `schema.sql:11` |
| mobile | text | | null | `schema.sql:12` (PII) |
| style_icons | text[] | `'{}'` | null | `schema.sql:13` |
| budget | text | | null | `schema.sql:14` |
| wardrobe_description | text | | null | `schema.sql:15` |
| season | text | | null | colour season (12-value), `schema.sql:16` / `style_notes_migration.sql:6` |
| undertone | text | | null | `:17` / `:7` |
| contrast | text | | null | `:18` / `:8` |
| body_type | text | | null | `:19` / `:9` |
| splurge_categories | text[] | `'{}'` | null | `:20` / `:10` |
| annual_spend | text | | null | `:21` / `:11` |
| headshot_url | text | | null | Cloudinary URL of a face photo (`:22` / `:12`) |
| full_length_url | text | | null | Cloudinary URL of a full-body photo (`:23` / `:13`) |
| colour_analysis | jsonb | | null | `schema.sql:24` / `style_notes_analysis_migration.sql:7` (§3.2) |
| silhouette_analysis | jsonb | | null | `:25` / `:8` (§3.2) |
| created_at | timestamptz | now() | NOT NULL | `schema.sql:26` |
| updated_at | timestamptz | now() | NOT NULL | `schema.sql:27`, maintained by trigger |
| style_dna | jsonb | `'{}'` | NOT NULL | `style_dna_migration.sql:15` (§3.1) |
| wardrobe_items_count | int | 0 | NOT NULL | `style_dna_migration.sql:21`, maintained by trigger |
| onboarded_at | timestamptz | | null | `onboarding_migration.sql:7` |
| instagram_handle | text | | null | `share_migration.sql:23` |
| is_admin | boolean | false | NOT NULL | `admin_capture_migration.sql:23` |
| gender_identity | text | `'woman'` | NOT NULL | CHECK `profiles_gender_identity_check in ('woman','man','unspecified')` (`gender_identity_migration.sql:9-18`) |
| avatar_id | text | | null | `avatar_migration.sql:17` |
| avatar_prefs | jsonb | | null | `avatar_migration.sql:18` (§3.3) |
| notification_prefs | jsonb | `'{}'` | NOT NULL | `notifications_migration.sql:26` (§3.3) |
| inbox_address | text | | null | `wardrobe_inbox_migration.sql:42` |

- **Indexes:** PK; `idx_profiles_style_dna` GIN(style_dna) (`style_dna_migration.sql:17`), which nothing queries; `profiles_inbox_address_key` UNIQUE (inbox_address) WHERE not null (`wardrobe_inbox_migration.sql:43`).
- **RLS:** enabled (`schema.sql:85`).
- **Policies:**
  - `"profiles: own row select"`: public, SELECT, USING `auth.uid() = id` (`schema.sql:89-91`)
  - `"profiles: own row insert"`: public, INSERT, CHECK `auth.uid() = id` (`:93-95`)
  - `"profiles: own row update"`: public, UPDATE, USING/CHECK `auth.uid() = id`, **with no column restriction** (`:97-100`)
  - `profiles_admin_read`: public, SELECT, USING `public.is_admin()` (`admin_capture_migration.sql:120`)
- **Triggers:** `set_profiles_updated_at` BEFORE UPDATE → `set_updated_at()` (`schema.sql:65-68`). Rows are created by `on_auth_user_created` on `auth.users`.

### 2.2 `public.prompt_history`
| Column | Type | Default | Null | Notes |
|---|---|---|---|---|
| id | uuid | gen_random_uuid() | NOT NULL | PK |
| user_id | uuid | | NOT NULL | FK → `profiles(id)` ON DELETE CASCADE (`schema.sql:73`). Note that it references profiles, not auth.users. |
| prompt | text | | NOT NULL | |
| response | text | | NOT NULL | |
| tokens_used | integer | | null | |
| model | text | | null | |
| created_at | timestamptz | now() | NOT NULL | |

- **Index:** `prompt_history_user_id_idx (user_id, created_at desc)` (`schema.sql:81-82`).
- **RLS:** enabled.
- **Policies:** own select (`:103-105`); **own insert** CHECK `auth.uid() = user_id` (`:107-109`); `prompt_history_admin_read` (`admin_capture_migration.sql:128`). There are no update or delete policies.

### 2.3 `public.wardrobe_items`
| Column | Type | Default | Null | Source |
|---|---|---|---|---|
| id | uuid | gen_random_uuid() | NOT NULL | PK (`wardrobe_schema.sql:5`) |
| user_id | uuid | | NOT NULL | FK → auth.users ON DELETE CASCADE (`:6`) |
| label | text | | NOT NULL | `:7` |
| category | text | `'Other'` | NOT NULL | L1, no CHECK (`:8`) |
| color | text | | null | `:9` |
| brand | text | | null | `:10` |
| notes | text | | null | `:11` |
| image_url | text | | null | Cloudinary URL (`:12`) |
| times_worn | integer | 0 | NOT NULL | a client-maintained counter (`:13`) |
| created_at | timestamptz | now() | NOT NULL | `:14` |
| item_dna | jsonb | `'{}'` | NOT NULL | `item_dna_migration.sql:6` (§3.4) |
| hero_position | smallint | | null | 1..10 by comment only: **no CHECK and no uniqueness** (`wardrobe_v2_migration.sql:15`) |
| seasons | text[] | | null | `:18`; superseded by season_band (ADR-002) |
| occasions | text[] | | null | `:20`; superseded by tags (ADR-002) |
| price | numeric(10,2) | | null | `:22`, re-added idempotently in `wardrobe_inbox_migration.sql:32` |
| fit_confidence | text | | null | `:24`, no CHECK |
| sentiment | text | | null | `:27`, no CHECK |
| category_l2 | text | | null | `wardrobe_taxonomy_migration.sql:12` |
| category_l3 | text | | null | `:13` |
| season_band | text | `'year_round'` | NOT NULL | CHECK in (`spring_summer`,`autumn_winter`,`year_round`) (`season_tags_migration.sql:89-103`) |
| season_source | text | `'inferred'` | NOT NULL | CHECK in (`inferred`,`user`) (`:96-107`) |
| size | text | | null | `wardrobe_inbox_migration.sql:30` |
| currency | text | | null | `:31` |

- **Constraints:** `wardrobe_items_taxonomy_fkey` FOREIGN KEY (category_l2, category_l3) → `wardrobe_taxonomy(l2, l3)`, MATCH SIMPLE (`wardrobe_taxonomy_migration.sql:46-56`).
- **Indexes:** `wardrobe_items_user_id_idx (user_id)` (`wardrobe_schema.sql:24`); `idx_wardrobe_item_dna` GIN(item_dna) (`item_dna_migration.sql:9`); `idx_wardrobe_hero (user_id, hero_position) WHERE hero_position IS NOT NULL` (`wardrobe_v2_migration.sql:29-31`); `idx_wardrobe_items_category_l2 (category_l2) WHERE not null`, which is not user-scoped (`wardrobe_taxonomy_migration.sql:59-60`); `idx_wardrobe_season_band (user_id, season_band)` (`season_tags_migration.sql:132-133`).
- **RLS:** enabled.
- **Policies:** `"Users own their wardrobe items"`: public, ALL, USING/CHECK `auth.uid() = user_id` (`wardrobe_schema.sql:19-22`). `wardrobe_admin_read`: public, SELECT, `is_admin()` (`admin_capture_migration.sql:122`).
- **Triggers:** `wardrobe_items_count_sync` AFTER INSERT OR DELETE → `sync_wardrobe_items_count()` (`style_dna_migration.sql:40-43`); `trg_wardrobe_tag_defaults` AFTER INSERT → `rb_tag_defaults_trg()` (`tag_prefill_migration.sql:247-250`).
- **No `updated_at`** column or trigger.

### 2.4 `public.wishlist_items`
| Column | Type | Default | Null | Source |
|---|---|---|---|---|
| id | uuid | gen_random_uuid() | NOT NULL | PK (`wardrobe_v2_migration.sql:39`) |
| user_id | uuid | | NOT NULL | FK → auth.users CASCADE (`:40`) |
| label | text | | NOT NULL | |
| category | text | `'Other'` | NOT NULL | |
| color, brand, note, image_url | text | | null | |
| price | numeric(10,2) | | null | |
| source_type | text | `'photo'` | NOT NULL | `photo`/`screenshot`/`instagram`/`substack`/`url`/`robes` by comment, no CHECK (`:48-50`) |
| source_label | text | | null | |
| source_url | text | | null | |
| item_dna | jsonb | `'{}'` | NOT NULL | |
| created_at | timestamptz | NOW() | **null** | nullable, unlike every other table (`:56`) |
| size, currency, category_l2, category_l3 | text | | null | `wardrobe_inbox_migration.sql:37-40`; **no taxonomy FK**, unlike wardrobe_items |

- **Index:** `idx_wishlist_user (user_id)`.
- **RLS:** enabled.
- **Policies:** `"Users own their wishlist items"`: public, ALL, USING/CHECK `auth.uid() = user_id` (`:61-63`). `wishlist_admin_read` (`admin_capture_migration.sql:124`).

### 2.5 `public.lookbook_items`
| Column | Type | Default | Null | Source |
|---|---|---|---|---|
| id | bigint | | NOT NULL | **client `Date.now()`** (`lookbook_migration.sql:4-5,8`; minted at `dashboard-personalize.js:5991`) |
| user_id | uuid | | NOT NULL | FK → auth.users CASCADE |
| type | text | `'key-piece'` | NOT NULL | no CHECK. Values seen: `key-piece`, `look`, `daily-look`, `travel-edit`, `moodboard`, `weekly-plan`, `weekly-plan-archived` |
| title | text | `''` | NOT NULL | |
| subtitle | text | `''` | NOT NULL | |
| img | text | | null | thumbnail URL |
| data | jsonb | `'{}'` | NOT NULL | the authoritative render blob (§3.5) |
| created_at | timestamptz | now() | NOT NULL | |
| share_id | text | | null | `share_migration.sql:7`; client-minted, 5 random bytes as hex (`dashboard-personalize.js:22064`) |
| is_public | boolean | false | NOT NULL | `share_migration.sql:8` |

- **PK:** `(user_id, id)` (`lookbook_migration.sql:16`).
- **Indexes:** `idx_lookbook_user_created (user_id, created_at desc)` (`:30-31`); `idx_lookbook_share_id` UNIQUE (share_id) WHERE not null (`share_migration.sql:10-12`).
- **RLS:** enabled.
- **Policies:**
  - `lookbook_select_own`: SELECT, USING `auth.uid() = user_id` (`lookbook_migration.sql:21-22`)
  - `lookbook_insert_own`: INSERT CHECK (`:23-24`)
  - `lookbook_update_own`: UPDATE USING only, **no explicit WITH CHECK**. Postgres reuses the USING expression, so this is not exploitable (`:25-26`).
  - `lookbook_delete_own`: DELETE USING (`:27-28`)
  - `lookbook_select_shared`: **TO anon**, SELECT, USING `is_public = true`. This exposes whole rows and every public row (`share_migration.sql:16-18`).
  - `lookbook_admin_read` (`admin_capture_migration.sql:126`)
- **No `updated_at`.**

### 2.6 `public.events` (a client-written action log)
Columns (`admin_capture_migration.sql:38-45`):
- `id` uuid PK default gen_random_uuid()
- `user_id` uuid, nullable, FK → auth.users CASCADE
- `event_type` text not null
- `metadata` jsonb not null default `'{}'`
- `environment` text not null default `'production'`, derived from the client hostname
- `created_at` timestamptz not null default now()

Indexes: `events_user_idx(user_id)`, `events_env_idx(environment)`, `events_type_idx(event_type)`, `events_created_idx(created_at desc)`. RLS on.

Policies: `events_own_insert`, public INSERT, CHECK `auth.uid() = user_id` (`:53-54`); `events_admin_read`, public SELECT, `is_admin()` (`:56-57`). Users cannot read or delete their own events.

### 2.7 `public.generation_log` (the server-written LLM trail)
Columns (`admin_capture_migration.sql:65-78`):
- `id` uuid PK
- `user_id` uuid FK → auth.users **ON DELETE SET NULL**
- `endpoint` text not null
- `model` text
- `tokens_used` int
- `latency_ms` int
- `status` text not null: `ok`/`partial`/`timeout`/`error`, no CHECK
- `prompt` text: the FULL prompt
- `response` jsonb
- `detail` jsonb default `'{}'` (nullable)
- `environment` text not null default `'production'`
- `created_at` timestamptz not null default now()

Indexes: `genlog_user_idx`, `genlog_endpoint_idx`, `genlog_status_idx`, `genlog_env_idx`, `genlog_created_idx(created_at desc)`. RLS on. The only policy is `genlog_admin_read`, public SELECT, `is_admin()` (`:87-88`). Writes use the service role only.

### 2.8 `public.feedback`
Columns (`admin_capture_migration.sql:95-103`):
- `id` uuid PK
- `user_id` uuid FK → auth.users CASCADE (nullable)
- `lookbook_item_id` bigint: a soft reference, with no FK
- `track` text
- `rating` int CHECK in (0,1)
- `note` text
- `created_at` timestamptz not null default now()

Indexes: `feedback_user_idx`, `feedback_item_idx(lookbook_item_id)`, `feedback_created_idx(created_at desc)`. RLS on. Policies: `feedback_own_insert` (public INSERT CHECK `auth.uid() = user_id`) and `feedback_admin_read`.

### 2.9 `public.planned_days` (the Diary's date index over the lookbook blobs)
Columns (`planned_days_migration.sql:14-57`):
- `id` uuid PK
- `user_id` uuid not null FK → auth.users CASCADE
- `day_date` date not null
- `source_type` text not null: `daily`/`weekly`/`travel`/`look`, no CHECK
- `source_id` text not null, **no FK**. It holds either a lookbook bigint as text or a looks uuid.
- `day_index` int not null default 0
- `slot` text not null default `'day'` CHECK in (`day`,`evening`)
- `pinned` boolean not null default false
- `status` text not null default `'planned'`: `planned`/`free`/`worn`/`swapped`, no CHECK
- `activity` text
- `headline` text
- `thumb_urls` jsonb default `'[]'`
- `item_ids` jsonb default `'[]'`
- `anchor_item_ids` jsonb default `'[]'`: reserved
- `ootd_photo_url` text: reserved
- `worn_at` timestamptz: reserved
- `environment` text default `'beta'`
- `created_at` timestamptz default now(), nullable
- `updated_at` timestamptz default now(), nullable, client-set, with no trigger

Indexes: `planned_days_source_slot` UNIQUE `(user_id, source_id, day_index, slot)` (`:63-64`) and `planned_days_user_date (user_id, day_date)` (`:66-67`). RLS on.

Policies: `planned_days_own` TO authenticated, ALL, USING/CHECK `auth.uid() = user_id` (`:72-74`); `planned_days_admin_read` TO authenticated SELECT `is_admin()` (`:77-78`).

### 2.10 `public.looks`
Columns (`looks_migration.sql:42-62` + later migrations):
- `id` uuid PK default gen_random_uuid(). **In practice the client mints it** (`dashboard-personalize.js:11375`, `:11214-11218`).
- `user_id` uuid not null FK CASCADE
- `name` text not null
- `name_provisional` bool not null default true
- `tags` text[]: legacy flat tags, superseded by `tag_looks`
- `note` text
- `photo_url` text
- `source` text not null default `'wear'`: `wear`/`manual`/`variant`, no CHECK
- `origin_look_id` uuid: no FK, no index
- `created_at` timestamptz not null default now()
- `updated_at` timestamptz not null default now(). **Client-set only, with no trigger.**
- `proposals` jsonb (`look_proposals_migration.sql:15`)
- `render_url` text and `render_key` text (`avatar_render_migration.sql:32-34`)
- `climate_band` text not null default `'year_round'` CHECK in 3 bands (`season_tags_migration.sql:137-150`)
- `climate_source` text not null default `'derived'` CHECK in (`derived`,`user`) (`:143-154`)

Indexes: `idx_looks_user (user_id, created_at desc)`, `idx_looks_climate_band (user_id, climate_band)`. RLS on.

Policies: `looks_select_own`/`insert`/`update` (USING + CHECK)/`delete`, all public and `auth.uid() = user_id` (`:70-73`). **There is no admin-read policy.** The `/admin` panel cannot see looks, look_pieces or wears.

### 2.11 `public.look_pieces`
Columns: `look_id` uuid not null FK → looks CASCADE; `wardrobe_item_id` uuid not null FK → wardrobe_items CASCADE; `slot` text; `position` smallint; `role` text (`look_roles_migration.sql:16`). PK `(look_id, wardrobe_item_id)`. Index `idx_look_pieces_item (wardrobe_item_id)`. RLS on.

Policies (`looks_migration.sql:99-106`), all public:
- select/update/delete USING `exists(select 1 from looks l where l.id = look_id and l.user_id = auth.uid())`
- insert CHECK uses the same expression. **It never checks that `wardrobe_item_id` belongs to the caller.**
- update has no explicit CHECK, so it reuses USING

### 2.12 `public.wears` (immutable by design)
Columns (`looks_migration.sql:119-131`):
- `id` uuid PK. The client mints it (`dashboard-personalize.js:11613`).
- `look_id` uuid not null FK → looks CASCADE
- `user_id` uuid not null FK CASCADE
- `worn_on` date not null
- `piece_ids` uuid[] not null: a snapshot, with no FK
- `note` text
- `source` text: `looks`/`daily`/`weekly`/`travel`/`retro`
- `source_id` text
- `confirmed_at` timestamptz not null default now()

Indexes: `idx_wears_look (look_id, worn_on desc)`, `idx_wears_user (user_id, worn_on desc)`, `idx_wears_unique_day` UNIQUE `(user_id, look_id, worn_on)`. RLS on.

Policies: `wears_select_own`, `wears_insert_own` (CHECK `auth.uid() = user_id`, **with no check that look_id is the caller's**), and `wears_delete_own`. There is deliberately no update policy (`:142`).

### 2.13 `public.wardrobe_taxonomy` (reference data)
Columns: `l1`, `sheet_l1`, `l2`, `l3`, all text not null. PK `(l2, l3)`. 350 rows, generated from `wardrobe_taxonomy.js` (`wardrobe_taxonomy_migration.sql:19-41`). RLS on. The only policy is `taxonomy_read` TO authenticated SELECT `true` (`:29-38`). The client does not read this table: `/api/wardrobe/taxonomy` serves the same tree from the JS module (`server.js:2480-2487`).

### 2.14 `public.tags` / `public.tag_pieces` / `public.tag_looks` (ADR-002, migration 17)
**`tags`** (`season_tags_migration.sql:189-201`):
- `id` uuid PK
- `user_id` uuid not null FK CASCADE
- `kind` text not null, CHECK `tags_kind_check in ('wear_for','vibe')`
- `label` text not null
- `slug` text not null
- `is_seed` bool not null default false
- `created_at` timestamptz not null default now()

It has the UNIQUE index `idx_tags_user_kind_slug (user_id, kind, slug)`. RLS policies: select/insert/update(+CHECK)/delete, all `auth.uid() = user_id` (`:221-224`), plus a guarded `tags_admin_read` (`:293-308`).

**`tag_pieces`**: `wardrobe_item_id` uuid FK → wardrobe_items CASCADE; `tag_id` uuid FK → tags CASCADE; `source` text not null default `'user'` CHECK in (`inferred`,`user`); `created_at`. PK `(wardrobe_item_id, tag_id)`. Index `idx_tag_pieces_tag (tag_id)`. Policies apply an `exists(... wardrobe_items w where w.id = wardrobe_item_id and w.user_id = auth.uid())` check on all 4 commands (`:266-273`). **`tag_id` ownership is not checked.** There is also a guarded admin read.

**`tag_looks`**: the same shape with `look_id` FK → looks CASCADE (`:239-245`). Index `idx_tag_looks_tag`. Policies check parent-look ownership (`:280-287`) but not tag ownership. There is also a guarded admin read.

### 2.15 `public.wardrobe_tag_defaults` / `public.wear_seed_labels` (reference data, migration 18)
- **`wardrobe_tag_defaults`**: `sheet_l1` text not null, `l2` text (nullable), `season_band` text not null (no CHECK), `wear_slugs` text[] not null. There is **no PK**, only the UNIQUE expression index `idx_tag_defaults_key (sheet_l1, coalesce(l2,''))` (`tag_prefill_migration.sql:43-51`). RLS on. Policy `tag_defaults_read` TO authenticated SELECT `true`. About 71 seed rows (`:65-138`).
- **`wear_seed_labels`**: `slug` text PK, `label` text not null. 7 rows (`:142-154`). **RLS is NOT enabled.**

### 2.16 `public.avatar_cells` (a shared catalog, server-written)
Columns (`avatar_render_migration.sql:17-23`): `id` text PK (for example `w-s3-h1-hg`); `image_url` text not null; `descriptor` text; `status` text not null default `'ready'`; `created_at`. RLS on. Policy `avatar_cells_read` TO authenticated SELECT `true`. Writes use the service key.

### 2.17 `public.notifications` (the email idempotency ledger)
Columns (`notifications_migration.sql:28-35`):
- `id` uuid PK
- `user_id` uuid not null FK CASCADE
- `kind` text not null: `looks_ready`/`look_waiting`/`borrowing`/`five`/`week_empty`/`morning`, plus `receipt` via inbox
- `ref` text not null
- `sent_at` timestamptz not null default now()

It has UNIQUE `(user_id, kind, ref)` and the indexes `notifications_user_idx (user_id, sent_at desc)` and `notifications_kind_idx (kind, sent_at desc)`. RLS on. Policies: `notifications_own_read` and `notifications_admin_read`. Writes use the service key only.

### 2.18 `public.wardrobe_inbox` (forwarded receipts)
Columns (`wardrobe_inbox_migration.sql:45-60`):
- `id` uuid PK
- `user_id` uuid not null FK CASCADE
- `source` text not null default `'receipt'`
- `retailer`, `order_ref`, `subject`, `from_email`, `provider_id`: text
- `items` jsonb not null default `'[]'` (§3.8)
- `status` text not null default `'held'` CHECK in (`held`,`filed`,`dismissed`)
- `filed_ids` jsonb
- `filed_to` text
- `received_at` timestamptz not null default now()
- `decided_at` timestamptz

Index: `wardrobe_inbox_user_idx (user_id, status, received_at desc)`. RLS on.

Policies:
- `wardrobe_inbox_own_read`: SELECT `auth.uid() = user_id or public.is_admin()` (`:65-66`)
- `wardrobe_inbox_own_update`: UPDATE USING/CHECK own. This covers **all columns**, including the server-owned `items`, `from_email` and `provider_id`.
- `wardrobe_inbox_own_delete`
- no insert policy. The service key writes all rows.

### 2.19 Functions / RPCs
| Function | Signature / returns | Security | search_path | Grants | Notes |
|---|---|---|---|---|---|
| `handle_new_user()` | trigger | **DEFINER** | `public` | default (PUBLIC execute; returns trigger, so it cannot be called via RPC) | Inserts `profiles(id, first_name)` ON CONFLICT DO NOTHING (`schema.sql:33-47`) |
| `set_updated_at()` | trigger | invoker | not set | default | `schema.sql:55-63` |
| `sync_wardrobe_items_count()` | trigger | **DEFINER** | `public` | default | ±1 on `profiles.wardrobe_items_count` (`style_dna_migration.sql:23-38`) |
| `is_admin()` | `() returns boolean`, sql, STABLE | **DEFINER** | `public` | default: **PUBLIC/anon can execute** (returns false for anon) | `select coalesce((select is_admin from profiles where id = auth.uid()), false)` (`admin_capture_migration.sql:27-35`) |
| `admin_user_overview(p_limit int=50, p_offset int=0, p_search text=null, p_user uuid=null, p_sort text='created_at', p_dir text='desc')` | table(id, email, first_name, created_at, onboarded_at, last_sign_in_at, wardrobe_count, wishlist_count, lookbook_count, feedback_count, last_event_at, is_admin, total_count) | **DEFINER**, STABLE | `public` | REVOKE ALL from public, anon; GRANT EXECUTE to authenticated (`:216-217`) | Reads `auth.users`. Gated on `where public.is_admin()` (`:142-214`). |
| `rb_tag_slug(p_label text)` | text, sql, IMMUTABLE | invoker | not set | default | Slug contract shared with the client (`season_tags_migration.sql:65-83`) |
| `rb_piece_defaults(p_category text, p_l2 text)` | table(season_band text, wear_slugs text[]), sql, STABLE | invoker | not set | default | `tag_prefill_migration.sql:160-178` |
| `rb_apply_tag_defaults(p_item_id uuid)` | void, plpgsql | **DEFINER** | `public` | **default: PUBLIC/anon can execute** via `/rest/v1/rpc/rb_apply_tag_defaults` | Writes `wardrobe_items`, `tags` and `tag_pieces` for **any** item id (`:184-231`) |
| `rb_tag_defaults_trg()` | trigger | **DEFINER** | `public` | default | `:236-245` |

**Triggers:**
- `on_auth_user_created` AFTER INSERT on `auth.users` (`schema.sql:49-52`)
- `set_profiles_updated_at` (profiles)
- `wardrobe_items_count_sync` (wardrobe_items, AFTER INSERT/DELETE)
- `trg_wardrobe_tag_defaults` (wardrobe_items, AFTER INSERT)

**Extensions:** `vector` (`style_dna_migration.sql:12`). No column uses it. `gen_random_uuid()` is core (PG13+).

**Views:** none. **Storage buckets:** none. Every binary lives in Cloudinary (`server.js` `cloudinaryUpload`/`cloudinaryUploadFile`) and the DB stores only URLs.

**Outside Postgres:** Airtable `Contacts` (Email, Name, Instagram Handle, Joined At) and `Feedback` (Email, Prompt, Piece Link, Photo, Looks Output, Rating, User Feedback, Created At). They are written by `/api/waitlist`, `/api/instagram` and `/api/feedback` (`server.js:395-433`). There is also the in-memory `lookStore` (`/api/look`, `server.js:2159-2238`) and the in-memory `imageJobs` Map, which serves as the job store for background image generation.

---

## 3. JSONB payload shapes (derived from the writers)

These are **observed shapes, not enforced schemas**. Every key is optional in historic rows. Code has changed shape over time: for example `avatar_prefs.v` is 1 in the migration comment but the code writes 2.

### 3.1 `profiles.style_dna`
This is a merged document built from three writers:
- `stylenotes.html:1679` writes `color_harmony`
- `stylenotes.html:1693` writes `silhouette_proportions`
- `onboarding.html:825-826` writes `style_archetypes`

Each writer PATCHes the whole object, which is last-write-wins across tabs. `style_dna.js:586` also reads `user_overrides`.
```jsonc
{
  "color_harmony": {                      // style_dna.js:476-509 buildColorHarmony().dna
    "archetype_name": "Soft Autumn",      // 12-season name
    "verified_undertone": "Warm|Cool|Neutral-Warm|Neutral-Cool",
    "calculated_contrast": "Low|Medium|High|Extremely High",
    "refinement_needed": false,
    "classification": { "source": "holistic|primitive_mapping", "primitive_season": "...", "agreement": true, "reasoning": "..." },
    "extracted_values": { "skin_tone_hex": "#...", "hair_color_hex": "#...", "eye_color_hex": "#..." },   // biometric-derived
    "eighteen_shade_matrix": { "row_1_warm_mutes": ["#hex"...6], "row_2_earth_greens": [...], "row_3_deep_velvets": [...] },
    "functional_sub_palettes": { "best_neutrals": [name], "primary_stars": [name], "secondary_accents": [name], "avoid_list": [name] },
    "metals_rules": { "finish_type": "...", "approved_metals": [..], "prohibited_metals": [..] },
    "stylist_voice": "..."
  },
  "silhouette_proportions": {             // style_dna.js:531-551 buildSilhouette().dna
    "body_type": "Hourglass|Pear|Inverted Triangle|Apple|Rectangle",
    "fallback_applied": false,
    "classification": { "source": "holistic|ratio_thresholds", "ratio_body_type": "...", "agreement": true, "reasoning": "..." },
    "geometric_ratios": { "shoulder_to_waist": 1.2, "hip_to_waist": 1.3, "shoulder_to_hip": 0.95 },
    "visual_traits": ["..."],
    "architectural_rules": { "dress_silhouettes": [name], "necklines": [..], "styling_maxims": [..] }
  },
  "style_archetypes": ["..."],            // onboarding picks
  "user_overrides": { }                   // read by styleDnaPromptBlock (style_dna.js:586); no writer found
}
```

### 3.2 `profiles.colour_analysis` / `profiles.silhouette_analysis`
These hold the "render" half of the analyse response (`server.js:2703-2790`, `stylenotes.html:1674-1694`).
- **colour_analysis** (`style_dna.js:459-475`): `{season, undertone, contrast, summary, undertone_note, palette:[hex x18], neutrals:[{name,hex}], best_colours:[{name,hex}], avoid_colours:[{name,hex}], avoid_note, proof_best, proof_less, seen_on_you:[{lifts, flattens}], metals:[{name, hexes:[..]}], metals_note}`.
- **silhouette_analysis** (`style_dna.js:522-529`): `{body_type, summary, traits:[..], dress_silhouettes:[{name,note}], neckline_recommendations:[..], styling_tips:[..]}`.

Both are catalog-derived (deterministic from season/body_type), so they can be **regenerated** from `style_dna` rather than migrated verbatim. The same writes also set the scalar columns `season`, `undertone`, `contrast`, `body_type`, `headshot_url` and `full_length_url`.

### 3.3 `profiles.avatar_prefs`, `profiles.notification_prefs`
- `avatar_prefs` (`stylenotes.html:1271`): `{skin: int|null, hair: int|null, nudges: {line?, frame?}, kept: bool, gender: 'woman'|'man'|null, v: 2}`. `avatar_id` is derived from it, with the shape `'w-s3-h1-hg-ll'`.
- `notification_prefs` (`notifications_migration.sql:8-13`, `dashboard-personalize.js:712-730`): `{looks_ready: bool, nudges: bool|null, morning: bool, morning_hour: 6..10, timezone: IANA string}`. The client read-merges and PATCHes the whole object. `notify.js:152-156` writes it on unsubscribe.

### 3.4 `wardrobe_items.item_dna` / `wishlist_items.item_dna`
The canonical writer is `/api/wardrobe/analyse` (`server.js:2544-2560`), which the client edits before save (`dashboard-personalize.js:3346-3362`):
```jsonc
{
  "display": { "title": "...", "editorial_color_name": "...", "primary_color_hex": "#...", "brand_raw": "..." },
  "structural_dna": { "silhouette_fit": ["..."] },
  "formality": "casual|smart|formal|black_tie|''",
  "llm_styling_context": {},
  "ai_generated_notes": "..."           // the client overwrites it with the user's notes (:3351)
}
```
There are other writers:
- Travel adoption writes a minimal `{display:{title}, ai_generated_notes}` (`dashboard-personalize.js:21633`).
- Receipts carry the inbox item's `item_dna` (§3.8).
- Many rows are just `{}`.

### 3.5 `lookbook_items.data` (by `type`)
`_lbItemToRow` (`dashboard-personalize.js:5361-5365`) stores the whole client entry *minus* `id`, `type`, `title`, `subtitle`, `img`, `saved_at`, `share_id` and `is_public`. `data` is therefore `{<kpData|dlData|tvData|...>: {...}, ...any other client keys}`. Legacy bundle stubs can be `{}`.

| type | data shape | Writers |
|---|---|---|
| `key-piece` | `{kpData: {ways: [{eyebrow, title, outfit, details, accessories, tags[]}] (x3, STYLE_SCHEMA server.js:499-521), fallback: bool, photoUrl: url|null (the user's uploaded photo), generatedImages: [url|null] (x3), intent: 'style'|..., context: any|null, genId: string|null, builtLooks?: [...]}}` | `dashboard-personalize.js:7940-7946`, `:27464-27468`, `:22215-22221` (kpData without images), `:21945` (share rebuild) |
| `look` | `{}`. These are legacy "Wear this today" stubs that carry only title/subtitle/img (`:7331`, `:22287`). | legacy bundle |
| `daily-look` | `{dlData: {fallback, occasion_label, headline, stylist_summary, transition_tip, palette:[..3], look_tags:{climate, wear_for:[..], vibe:[..]}, steps:[{title, items:[{name, category, brand, description, how, wardrobe_index, retailer_hint, price_point, alternates:[{name,brand,retailer_hint,price_point}], wardrobe_match:{id,label,image_url,color}|null, image_index}]}], itemCount, generatedImages:[url|null], prompt, anchor_date:'YYYY-MM-DD', slot:'day'|'evening', worn?: bool, look_id?: uuid, context?, origin?}}` | response `server.js:1055-1066` (schema `:854-906`), saved at `dashboard-personalize.js:18218-18227` |
| `travel-edit` | `{tvData: {fallback, trip_label, headline, location_vibe, stylist_summary, suitcase_note, palette, capsule:[{name, tier, category, brand, description, reason, bridge, wardrobe_index, retailer_hint, price_point, wardrobe_match?:{id,label,image_url,color}, image_index?, packed?}], left_behind:[{wardrobe_index, reason}], looks:[{occasion, title, how, look_tags, formula:[{role, item_index, note}], pins?:[..]}], tripDays, plans:[..], destination, dateFrom, dateTo, dateLine, weather, imageCount, generatedImages:[url|null], days?:[{day_label, user_activity, rest, slots:[{title, formula:[{item_index}]}], worn?}], dayTitles?:[..], trip_day_plan?:[string|null], brief?}}` | response `server.js:1952-1971` (schema `:1486-1550`), saved at `dashboard-personalize.js:21166-21176`. The shape of `days`/`slots` is confirmed by `planned_days_backfill.sql:19-76`. |
| `moodboard` | the whole moodboard response minus job ids: `{title, location_context, aesthetic_tags:[..], editorial_direction, the_look:[{name, category, description, styling_note, retailer_hint, price_point}] (x8), image_prompts:{hero_looks[3], flat_lays[2], atmosphere[2]}, hero_image: url|null, grid_images:[{type, url}]}` | `server.js:3208-3240`, `:3326`; client `:21932-21936`, `:23050` |
| `weekly-plan` / `weekly-plan-archived` | `{wkData: {...}}`. The weekly track has been retired (ADR-001). These rows are archived only, and no surface renders them. | `weekly_plan_sweep.sql:19-21`, `dashboard-personalize.js:5402-5410` |

Data-migration notes:
- Every image in these blobs is a Cloudinary URL. Base64 is stripped before save (`:18217`, `:21165`).
- `wardrobe_match.id` values are wardrobe_items uuids, and they can dangle after the piece is deleted.
- Blobs embed PII: the user's `photoUrl`, typed prompts, trip destinations and dates, and weather.

### 3.6 `looks.proposals`
This is a snapshot of the composer's shop rows (`look_proposals_migration.sql:7-9`, `CLAUDE.md:533`): `[{role, chip, cats, opts:[{...candidate}], oi: int, img_oi?: int, saved: bool, image_url}]`.

### 3.7 `planned_days.thumb_urls`, `item_ids`, `anchor_item_ids`
- `thumb_urls`: a jsonb array of at most 3 http URLs.
- `item_ids`: a jsonb array of wardrobe_items uuid strings, containing owned pieces only (`dashboard-personalize.js` `_pdOwnedIds`; `planned_days_backfill.sql:71-76`).
- `anchor_item_ids`: always `[]`, reserved.

### 3.8 `wardrobe_inbox.items`, `filed_ids`
- `items` (`wardrobe_inbox_migration.sql:54`, `inbox.js:437-447`, `:483-494`): `[{label, category, category_l2, category_l3, color, brand, price, currency, size, image_url (re-hosted on Cloudinary), quantity, returned, item_dna, read_from?: 'photo'}]`.
- `filed_ids`: a jsonb array of the created wardrobe_items or wishlist_items uuids (`dashboard-personalize.js:3824`). `filed_to` says which table they are in.

### 3.9 `events.metadata`, `generation_log.response` / `detail`, `feedback`
- **`events.metadata`** is free-form per `event_type`. There are more than 100 client event types (`_rbTrack(...)`), for example `look_generated {track, item, fallback}`, `share_created {item, share_id}`, `wardrobe_added {label, category, source, batch_n, batch_i}` and `feedback_given {track, rating}`. There are also server events: `receipt_received {retailer, items, seen, inbox_id, order_ref}` (`inbox.js:503-506`) and `email_sent {kind, ref}` (`notify.js:196`). Events are mirrored to PostHog (`dashboard-personalize.js:679-690`).
- **`generation_log.response`** holds the parsed JSON of a text model's output, `{text}` when parsing fails, or `{has_image: bool}` for image models (`server.js:127-135`).
- **`generation_log.detail`** is `{input_images, gen_id?, user_prompt? (at most 400 chars), error?}`. Composition rows use `{stage:'composition', owned_count, item_count, gen_id}` (`server.js:1038-1050`, `:1940-1947`).
- **`feedback`** rows come from `dashboard-personalize.js:753-765`. `track` is one of `key-piece`/`daily`/`weekly`/`travel`/`moodboard`/`look`. `lookbook_item_id` holds the client `Date.now()` id.

---

## 4. Access map

Legend: **C-JWT** means the browser calls PostgREST directly with the user's JWT and the publishable key, so RLS applies. **S-svc** is the Express server using the service role, which bypasses RLS. **S-anon** is the server using the publishable key. **EF** is the edge function. **TRG** is a trigger. **SQL** is an editor-run script.

| Table | Reads | Writes |
|---|---|---|
| profiles | C-JWT: boot select `dashboard.html:2617-2639`; `dashboard-personalize.js:3736`, `:11502`; `onboarding.html:1342`; `stylenotes.html:1734` (`select *`); `admin.html:221` (own `is_admin` gate), `:338`/`:715` (any user, admin RLS). S-svc: `server.js:3044` (avatar_id for **body-supplied** userId); `notify.js:152`, `:249` (all users); `inbox.js:322` (by inbox_address). EF: `index.ts:48-52` (user JWT). | C-JWT PATCH: `dashboard-personalize.js:148` (first/last/mobile), `:718` (notification_prefs), `:3751` (inbox_address mint), `:22141` (instagram_handle); `onboarding.html:494` (style_icons, style_dna, onboarded_at, ...); `stylenotes.html:843` (analysis, scalars, photo urls, style_dna), `:1274` (avatar_id/prefs). S-svc: `notify.js:156` (unsubscribe). TRG: `handle_new_user` insert, `sync_wardrobe_items_count`. |
| prompt_history | admin only (`admin.html` via admin policy). No client reader found. | EF service role insert (`index.ts:85-96`). The user-JWT insert policy exists but is unused. |
| wardrobe_items | C-JWT `dashboard-personalize.js:777`; `admin.html:339`; S-svc `notify.js:293` (all users, limit 20000) | C-JWT POST/PATCH/DELETE: `:3571`, `:3618-3619` (`_waRowWrite`), `:4244`, `:6508`, `:6993-6999`, `:10861`, `:11633`/`:11650` (times_worn ±1), `:17617`, `:21625`, `:25177`, `:27593-27599`; `onboarding.html:1166-1171`. TRG `rb_apply_tag_defaults` (season_band). |
| wishlist_items | C-JWT `:4411`; `admin.html:340` | C-JWT `:3618` (via `_waRowWrite`), `:4448`, `:4482`, `:4581`, `:4594` |
| lookbook_items | C-JWT `:5398` (limit 100); `admin.html:341`; **S-anon `server.js:2392`** (`/board/:shareId`); S-svc `notify.js:294`, `:388`; SQL `planned_days_backfill.sql`; `scripts/backfill_planned_days.mjs` | C-JWT `:5374` POST, `:5381`/`:5408` PATCH, `:5386` DELETE, `:22068`/`:22073` (share_id + is_public). SQL `weekly_plan_sweep.sql:19-21`. |
| events | admin `admin.html:333`; S-svc `notify.js:292` | C-JWT `dashboard-personalize.js:666-691` (`_rbCapturePost`, return=minimal), `onboarding.html:526`, `stylenotes.html:1292`; S-svc `inbox.js:503`, `notify.js:196` |
| generation_log | admin `admin.html:334`, `:589`, `:674` | S-svc `server.js:81-96` (`glog`) via the `generateContent` wrapper `:116-159`, and composition rows `:1038-1050`, `:1940-1947`. **`user_id` comes from the unauthenticated `req.body.userId`** (`server.js:68-79`). |
| feedback | admin `admin.html:342`, `:703` | C-JWT `dashboard-personalize.js:753-765`. The same feedback also goes to Airtable via `POST /api/feedback` (`server.js:421-433`). |
| planned_days | C-JWT `:5790`, `:24873`; S-svc `notify.js:295` | C-JWT upsert `:5665-5690` (raw fetch, `on_conflict=user_id,source_id,day_index,slot`) + range DELETEs `:5675-5684`, `:5752`; SQL backfill/sweep; `scripts/backfill_planned_days.mjs` (service key) |
| looks | C-JWT `:11231`; S-svc `notify.js:273` (with embedded `look_pieces(wardrobe_items(image_url))`) | C-JWT `:11394`/`:11398` POST (client uuid), `:11438`/`:11444` PATCH, `:14688` DELETE |
| look_pieces | C-JWT `:11232` | C-JWT `:11417` DELETE-all then `:11418` POST, which is **non-atomic** |
| wears | C-JWT `:11233` | C-JWT `:11620` POST (client uuid), `:11645` DELETE |
| tags / tag_pieces / tag_looks | C-JWT `:3972-3977`, `:4011` | C-JWT `:4004` (upsert `on_conflict=user_id,kind,slug`), `:4051` POST, `:4055` DELETE; TRG `rb_apply_tag_defaults` |
| wardrobe_taxonomy, wardrobe_tag_defaults, wear_seed_labels | functions only (`rb_piece_defaults`, `rb_apply_tag_defaults`) | SQL seeds only |
| avatar_cells | S-svc `server.js:2955` | S-svc `server.js:2972` (upsert `on_conflict=id`) |
| notifications | admin `admin.html:345`, `:663`; S-svc `notify.js:291` | S-svc `notify.js:171` (ledger row before send), `:193` (delete on a failed send) |
| wardrobe_inbox | C-JWT `:3684`; admin `admin.html:346`, `:648` | S-svc `inbox.js:495` (insert); C-JWT `:3824`, `:3834` (status/filed_ids/filed_to/decided_at) |
| RPC `admin_user_overview` | C-JWT `admin.html:288`, `:291`, `:337` | none |

The architecture this implies: the browser is the application server for every CRUD path. RLS is the **only** authorization layer for user data. Express does no authentication at all: no endpoint verifies a JWT (grep for `auth/v1|getUser` in `server.js` finds nothing). The service key is used for logging, the notification tick, the inbox, and avatar cells.

---

## 5. Security and integrity findings

| # | Sev | Finding | Evidence | Fix in target |
|---|---|---|---|---|
| S1 | **Critical** | **Any signed-in user can make themselves admin.** The own-row UPDATE policy on profiles has no column restriction, and `is_admin` lives on the same row. `PATCH /rest/v1/profiles?id=eq.<self> {"is_admin":true}` passes the policy. The user then gets `is_admin()` across every `*_admin_read` policy: all profiles, wardrobes, lookbooks, prompt_history, events, feedback, the full-prompt `generation_log`, notifications, inboxes and planned_days. They also get the **email and last sign-in of every user** via `admin_user_overview()`, and the `/admin` UI gate passes (`admin.html:221-222`). | `schema.sql:97-100`; `admin_capture_migration.sql:22-35`, `:119-128`, `:142-217` | A separate `admin_users` table with no client write path. Column-level `GRANT UPDATE (...)` on profiles. |
| S2 | **High** | **Other server-owned profile columns are client-writable through the same policy:** `wardrobe_items_count` (which drives cold-start prompt routing), `onboarded_at`, `inbox_address` (a vanity or squatting address such as `support`), `avatar_id`, `created_at`, `updated_at`, and the analysis outputs `style_dna`, `colour_analysis`, `season` and the rest. All of this is interpolated into LLM prompts, which makes it a prompt-injection surface that is persisted server-side. | `schema.sql:97-100`; writers in §4 | Server-owned columns move to server-written tables. Grant only the user-editable columns. |
| S3 | **High** | **The anon share policy exposes whole rows, and it exposes every public row.** `lookbook_select_shared` is `TO anon USING (is_public)` with no share-id predicate, so anyone holding the (public) publishable key can run `GET /rest/v1/lookbook_items?is_public=eq.true&select=*`. That lists every shared artifact across users, with `user_id`, `share_id` and the full `data`: the uploaded `photoUrl`, prompts, **travel destinations and dates**, and wardrobe item uuids and images. The server itself only needs one row by share_id (`server.js:2392`). | `share_migration.sql:16-18` | No anon table policies. `get_shared_look(token)` becomes a SECURITY DEFINER RPC returning a sanitised snapshot from a `shares` table. |
| S4 | **High** | **The Express API trusts `req.body.userId`.** `generation_log.user_id` can be forged for any uuid. `avatarRefForUser` reads any user's `avatar_id` with the service key. There is no per-user quota, because generation is anonymous with only per-IP limits. The notify and inbox paths are fine, since they are server-internal. | `server.js:68-79`, `:3040-3050` | Verify the JWT on every `/api` route (`supabase.auth.getUser` or JWKS). Take the user id from the token. |
| S5 | **High** | **`wear_seed_labels` has no RLS.** Supabase's default grants give `anon` and `authenticated` full DML on public tables, so anyone with the publishable key can rewrite the labels. `rb_apply_tag_defaults` (SECURITY DEFINER) copies them into **every user's** `tags.label` on the next insert, which gives a cross-tenant content/XSS vector if a label is ever rendered unescaped. This only applies once migration 18 runs. | `tag_prefill_migration.sql:142-154`, `:214-219` (no `enable row level security` for this table) | RLS on every table. `revoke all ... from anon, authenticated` on reference tables. |
| S6 | Medium | **`rb_apply_tag_defaults(uuid)` is a SECURITY DEFINER function with the default PUBLIC EXECUTE grant**, so anon and authenticated can call it via RPC for *any* `wardrobe_items.id`. The call rewrites that item's `season_band` and inserts tags and links into the victim's account. The victim's item uuids are harvestable from public share blobs (S3: `wardrobe_match.id`). | `tag_prefill_migration.sql:184-231` (no REVOKE) | `revoke execute ... from public, anon, authenticated` on every internal function. Put them in a non-exposed `private` schema. |
| S7 | Medium | **Share ids and entity ids are client-minted.** `share_id` is 40 bits (`crypto.getRandomValues(5)`), set by an owner PATCH, and can be any string, so a user could choose a vanity or colliding id. The `lookbook_items.id` is `Date.now()`. The `looks.id` and `wears.id` uuids come from the client, with a `Math.random()` fallback. | `dashboard-personalize.js:22062-22066`, `:5991`, `:11214-11218`, `:11375`, `:11613` | The server or DB mints every id (`gen_random_uuid()` / uuidv7). Share tokens are at least 128 bits, generated by an RPC. |
| S8 | Medium | **Cross-tenant references are not checked on insert.** `look_pieces` checks only that the look is owned, not the `wardrobe_item_id`. `tag_pieces`/`tag_looks` do not check `tag_id` ownership. `wears` does not check `look_id` ownership. Postgres FKs bypass RLS, so these give an existence oracle for foreign uuids, and a victim's delete cascades into the attacker's rows. The impact is low, but it is an integrity hole. | `looks_migration.sql:101-102`, `:139`; `season_tags_migration.sql:268-287` | Composite FKs that include `user_id` (for example `(wardrobe_item_id, user_id) → wardrobe_items(id, user_id)`), plus a `user_id` column on the join tables. |
| S9 | Medium | **Account deletion and GDPR.** No delete-account path exists anywhere (grep found none). The `auth.users` cascade would cover most tables, but: `generation_log` is `ON DELETE SET NULL` and keeps full prompts forever, with no retention; Cloudinary assets (face and full-length photos, wardrobe photos, renders) are never deleted; Airtable Contacts and Feedback are keyed by email; `wardrobe_inbox.from_email`/`subject` are kept. Users also **cannot delete** their own `events`, `feedback`, `prompt_history` or `notifications` (no delete policy). Face and body photos plus derived hex values (`extracted_values`) are biometric-adjacent special-category data. | `admin_capture_migration.sql:67`; §2 policies | An `account_deletion_requests` table plus a server worker. Retention jobs. An asset registry for external blobs. |
| S10 | Medium | **`prompt_history` has a user insert policy**, although the only writer is the edge function using the service role. Users can therefore forge "history" rows, which are later read as an LLM-corpus or audit trail. The table also has no delete policy. | `schema.sql:107-109`; `index.ts:83-96` | Remove the policy. Treat the table as server-owned. |
| S11 | Medium | **`inbox_address` is a guessable bearer capability.** It is first name + 4 characters from a 31-letter alphabet (about 9.2×10⁵ values per name). Anyone who can guess it can drop "receipts" into a user's held queue. Rows are held for review, so the impact is spam or phishing-by-proxy. The user can also PATCH the address to any value (S2). | `dashboard-personalize.js:3743-3749`; `inbox.js:320-325`, `:458-462` | Server-minted random tokens of at least 64 bits, plus sender allow-listing (only forwards from the account email). |
| S12 | Medium | **`is_admin()` is called per row in OR-ed permissive policies,** and `auth.uid()` is bare in every policy (about 45 policies across `schema.sql`, `wardrobe_schema.sql`, `lookbook_migration.sql`, `looks_migration.sql`, `season_tags_migration.sql` and others). Without `(select ...)` wrapping, Postgres can re-evaluate both per row instead of once per statement (initPlan), which is the Supabase advisor lint `auth_rls_initplan`. The `exists(select ... looks ...)` sub-policies on join tables are also evaluated per row. | policies listed in §2 | `(select auth.uid())`, `(select private.is_admin())`, a denormalised `user_id` on the join tables. |
| S13 | Low | **SECURITY DEFINER functions use `search_path = public`** rather than `''` with fully qualified names. `public` is writable by default only in pre-PG15 setups, but that is not the hardened pattern. `set_updated_at`, `rb_tag_slug` and `rb_piece_defaults` have no `search_path` at all (Supabase lint `function_search_path_mutable`). | `schema.sql:36`; `style_dna_migration.sql:26`; `admin_capture_migration.sql:31`, `:167`; `tag_prefill_migration.sql:188`, `:240`; `schema.sql:55-58`; `season_tags_migration.sql:65-68`; `tag_prefill_migration.sql:160-163` | `set search_path = ''` everywhere. |
| S14 | Low | **UPDATE policies with no explicit WITH CHECK.** Postgres reuses USING, so these are not exploitable, but the intent is implicit. | `lookbook_migration.sql:25-26`; `looks_migration.sql:103-104`; `season_tags_migration.sql:270-271`, `:284-285` | Always state USING and WITH CHECK. |
| S15 | Low | **`wardrobe_inbox` own-update covers every column,** including the server-read fields (`items`, `from_email`, `provider_id`, `received_at`). | `wardrobe_inbox_migration.sql:67-69` | A `decide_inbox_item(id, action, filed_ids)` RPC. No direct UPDATE grant. |
| S16 | Low | **Log poisoning.** `events` accepts any `event_type`, `metadata` and `environment` from the client, and `feedback` accepts any `track`, `note` and `lookbook_item_id`. The admin panel and analytics trust these values. | `admin_capture_migration.sql:53-54`, `:110-111` | Write events through the server or an RPC. Validate `event_type` against a catalog. |
| S17 | Low | **Unauthenticated Airtable writers.** `/api/instagram` upserts a `Contacts` row by *any* supplied email (overwriting someone's handle). `/api/feedback` and `/api/waitlist` are unauthenticated and not rate-limited. | `server.js:395-433` | Move waitlist and feedback into Postgres behind rate-limited RPCs or captcha. |
| S18 | Low | **The edge function** allows `CORS: *`, accepts an unbounded `prompt` length, and has no quota. | `index.ts:6-9`, `:39-45` | Put it behind the entitlement/quota check. Cap input. |

**Integrity and performance issues that are not security findings:**

- **Missing or weak indexes:**
  - `wardrobe_items (user_id, created_at desc)`: the main list query orders by `created_at` (`dashboard-personalize.js:777`), but only `(user_id)` is indexed.
  - `wishlist_items (user_id, created_at desc)`.
  - `events (user_id, created_at desc)` and `generation_log (user_id, created_at desc)`: admin timelines use `admin.html:333-334`, and only single-column indexes exist.
  - `lookbook_items (type, created_at)`: needed by the notify tick (`notify.js:294`).
  - `looks.origin_look_id`: unindexed and has no FK.
  - `feedback (user_id, created_at)`.
  - `idx_wardrobe_items_category_l2` is not user-scoped.
  - The GIN indexes on `item_dna` and `style_dna` are unused and cost write amplification.
  - `hero_position` has no unique `(user_id, hero_position)` constraint and no CHECK 1..10.
- **Counters that drift:**
  - `wardrobe_items.times_worn` is incremented by the client with read-modify-write (`dashboard-personalize.js:11631-11634`, `:11648-11651`), independently of `wears`, so it drifts under concurrency or multiple devices.
  - `profiles.wardrobe_items_count` is kept by trigger, but it is also client-writable.
- **No `updated_at`** on wardrobe_items, wishlist_items, lookbook_items, tags or look_pieces. `looks.updated_at` and `planned_days.updated_at` are client-supplied with no trigger. There are no soft deletes anywhere. Multi-device sync is last-write-wins with no tombstones.
- **Non-atomic multi-statement writes:**
  - look_pieces is DELETE-all then INSERT (`:11417-11418`).
  - planned_days is an upsert followed by 4 range DELETEs (`:5675-5690`).
  - A receipt filing does N inserts and then a PATCH (`:3800-3824`).
- **Enumerated text columns with no CHECK:** `lookbook_items.type`, `wardrobe_items.category`/`fit_confidence`/`sentiment`, `wishlist_items.source_type`, `looks.source`, `wears.source`, `planned_days.source_type`/`status`, `generation_log.status`, `events.environment`, `notifications.kind`.
- **Soft references with no FK:** `planned_days.source_id` (text, which is either a bigint or a uuid), `feedback.lookbook_item_id`, `wears.piece_ids`, `wears.source_id`, `planned_days.item_ids`, `looks.origin_look_id`, and `wardrobe_match.id` inside blobs. Orphans are cleaned by the client (`_pdDeleteSource`).
- **Two id schemes:** bigint `Date.now()` for the lookbook and uuids for entities. `planned_days.source_id` mixes both.
- **Taxonomy inconsistency:** `wishlist_items.category_l2/l3` has no taxonomy FK, while `wardrobe_items` does.
- `planned_days.environment` defaults to `'beta'`, while `events` and `generation_log` default to `'production'`. The two services share one project, so environment is a column instead of a project boundary.
- **The admin panel cannot read** looks, look_pieces, wears or planned_days *in admin.html*. (planned_days does have an admin policy.)

---

## 6. Proposed target schema (Next.js + Supabase, CLI-managed migrations)

### 6.1 Principles
1. **Migrations are the source of truth.** Use `supabase/migrations/*.sql` via the CLI, with one ledger, no editor pastes, and `supabase db lint` plus advisors in CI. Seed reference data from `supabase/seed.sql` or generated migrations.
2. **Ownership is explicit per table.** It is one of three models:
   - **User-writable (U):** RLS own-row, plus column grants that expose only the editable columns.
   - **Server-owned (S):** clients may SELECT their own rows at most. Every write goes through the service role in Next.js route handlers or server actions, or through narrow SECURITY DEFINER RPCs.
   - **Reference (R):** read-only for `authenticated`. There are no grants for `anon`.
3. **The DB or server mints every id.** Use `uuid` default `gen_random_uuid()`. uuidv7 via `pg_uuidv7` is optional if time-ordering matters. Clients may send an `client_ref`/idempotency key, never a PK.
4. **RLS patterns:**
   - Always write `(select auth.uid())`.
   - Every policy has an explicit `TO authenticated` (never public). Every UPDATE has both USING and WITH CHECK.
   - Denormalise `user_id` onto join tables, and use composite FKs `(x_id, user_id) → parent(id, user_id)` so cross-tenant links are impossible.
   - `anon` gets **no table access**. `revoke all on all tables in schema public from anon`, and alter the default privileges to match.
5. **Admin is a separate table,** `private.admin_users`. The `private.is_admin()` function is `STABLE SECURITY DEFINER SET search_path = ''` and is invoked as `(select private.is_admin())`. Admin reads go through server routes using the service role and write an `audit_log` row. Only a few admin-read RLS policies remain, if any.
6. **Sync fields on every user-content table:** `created_at`, `updated_at` (maintained by a trigger, never client-set) and `deleted_at` (a soft-delete tombstone). The client pulls deltas with `updated_at > cursor`, tombstones included. A nightly job hard-deletes rows 30 days after `deleted_at`.
7. **Enumerations** are `text` + CHECK, keeping the legacy convention from ADR-002, or small reference tables where the set is user-extensible.
8. **Every internal function lives in `private`** (not exposed by PostgREST), with `revoke execute from public`. Exposed RPCs are few and explicitly granted.

### 6.2 Identity, profile, admin
| Table | Own. | Columns | Notes |
|---|---|---|---|
| `profiles` | U (column grants) | `id uuid PK FK auth.users cascade`, `first_name`, `last_name`, `mobile`, `gender_identity` (check), `style_icons text[]`, `style_archetypes text[]`, `budget`, `annual_spend`, `splurge_categories text[]`, `wardrobe_description`, `instagram_handle`, `notification_prefs jsonb` (check: `jsonb_typeof = 'object'`), `avatar_prefs jsonb`, `onboarded_at`, `created_at`, `updated_at` | `grant update (first_name, last_name, mobile, gender_identity, style_icons, style_archetypes, budget, annual_spend, splurge_categories, wardrobe_description, instagram_handle, notification_prefs, avatar_prefs) on profiles to authenticated`. `onboarded_at` is set by the `complete_onboarding()` RPC. There is no INSERT grant: the signup trigger creates the row. |
| `style_profiles` | S (own select) | `user_id PK`, `season`, `undertone`, `contrast`, `body_type`, `color_harmony jsonb`, `silhouette_proportions jsonb`, `colour_render jsonb`, `silhouette_render jsonb`, `headshot_asset_id`, `full_length_asset_id`, `user_overrides jsonb` (U: the one grant-updatable column), `model_version`, `updated_at` | Written by the analyse route handler. This replaces `profiles.style_dna`/`*_analysis`/scalars. |
| `avatars` | S | `user_id PK`, `avatar_id text`, `derived_from jsonb`, `updated_at` | `avatar_id` is computed server-side from `profiles.avatar_prefs` + style. |
| `inbox_addresses` | S (own select) | `address text PK` (random, at least 64 bits), `user_id unique`, `created_at`, `revoked_at` | Minted by the `mint_inbox_address()` RPC. |
| `private.admin_users` | S (no client access) | `user_id PK FK auth.users`, `role text check in ('admin','support','analyst')`, `granted_by`, `granted_at` | This is the only source of truth for `private.is_admin()`. |
| `audit_log` | S | `id`, `actor_id`, `action`, `subject_user_id`, `subject_table`, `subject_id`, `detail jsonb`, `ip inet`, `created_at` | Records admin reads and actions, deletions and role grants. Append-only, retained for 2 years. |

### 6.3 Wardrobe
| Table | Own. | Columns | Notes |
|---|---|---|---|
| `wardrobe_items` | U | `id`, `user_id`, `label`, `category` (check L1), `category_l2`, `category_l3` (FK taxonomy), `color`, `brand`, `notes`, `image_asset_id` / `image_url`, `item_dna jsonb`, `hero_position smallint check 1..10`, `season_band` (check), `season_source` (check), `fit_confidence` (check), `sentiment` (check), `price numeric(10,2)`, `currency char(3)`, `size`, `acquired_via text check ('photo','receipt','url','wishlist','onboarding','travel')`, `created_at`, `updated_at`, `deleted_at` | `unique (id, user_id)` supports composite FKs. `unique (user_id, hero_position) where hero_position is not null and deleted_at is null`. Index `(user_id, updated_at)` for sync and `(user_id, created_at desc)`. **`seasons`, `occasions` and `times_worn` are dropped:** use `season_band`, `tag_pieces` and the `wardrobe_item_stats` view. |
| `wishlist_items` | U | the same core columns as wardrobe_items + `source_type` (check), `source_label`, `source_url`, `promoted_item_id` (FK wardrobe_items) | taxonomy FK added |
| `wardrobe_taxonomy` | R | as legacy | seeded by migration |
| `wardrobe_tag_defaults` | R | `id` PK + as legacy | RLS on, no anon |
| `wear_seed_labels` | R | as legacy | **RLS on**, no DML grants |
| `tags` | U | `id`, `user_id`, `kind` (check), `label`, `slug` (generated by `private.tag_slug(label)`), `is_seed`, `created_at`, `updated_at`, `deleted_at` | unique `(user_id, kind, slug)`, `unique (id, user_id)` |
| `tag_pieces` / `tag_looks` | U | `user_id`, `tag_id`, `wardrobe_item_id` / `look_id`, `source` (check), `created_at` | composite FKs `(tag_id, user_id)`, `(wardrobe_item_id, user_id)` / `(look_id, user_id)`, PK `(owner_id, tag_id)`; the policy is simply `user_id = (select auth.uid())` |
| `wardrobe_inbox` | S (own select) | as legacy + `decided_by_rpc` | Decisions go through `decide_inbox(id, action, filed_ids, filed_to)`. There is no UPDATE grant. `from_email` and `subject` are purged 90 days after the decision. |

The pre-fill trigger becomes `private.apply_tag_defaults()`, with EXECUTE revoked, and a `search_path=''` trigger.

### 6.4 Looks, wears, diary
| Table | Own. | Columns | Notes |
|---|---|---|---|
| `looks` | U | `id`, `user_id`, `name`, `name_provisional`, `note`, `photo_asset_id`, `source` (check), `origin_look_id` (FK looks, **on delete set null**, indexed), `climate_band`, `climate_source`, `proposals jsonb`, `render_url`, `render_key`, `created_at`, `updated_at`, `deleted_at` | `looks.tags text[]` is dropped in favour of `tag_looks` |
| `look_pieces` | U | `look_id`, `user_id`, `wardrobe_item_id`, `slot`, `position`, `role` (check against the 4 roles or null) | composite FKs; composition replacement via the `set_look_pieces(look_id, pieces jsonb)` RPC, which is transactional |
| `wears` | U (insert/select/delete only) | `id`, `user_id`, `look_id`, `worn_on`, `piece_ids uuid[]`, `note`, `source` (check), `source_ref text`, `confirmed_at` | composite FK `(look_id, user_id)`; unique `(user_id, look_id, worn_on)`; **no UPDATE grant**; a `wears_pieces` child table is optional if per-piece FKs are wanted |
| `wardrobe_item_stats` (view, `security_invoker`) | derived | `wardrobe_item_id`, `times_worn`, `last_worn_on`, `cost_per_wear` | replaces the client counter |
| `planned_days` | U | as legacy minus `environment`, plus `source_kind check ('artifact','look')`, `artifact_id uuid null` FK lookbook_items, `look_id uuid null` FK looks, a check that exactly one is set, `updated_at` (trigger), `deleted_at` | real FKs replace the text `source_id`; writes go through the `sync_planned_days(source, rows jsonb)` RPC (upsert + prune in one transaction) |

### 6.5 Generated artifacts, jobs, sharing
| Table | Own. | Columns | Notes |
|---|---|---|---|
| `generation_jobs` | S (own select) | `id uuid`, `user_id`, `kind check ('key_piece','daily','travel','travel_looks','moodboard','look_render','avatar_cell','wardrobe_analyse','stylenotes_analyse','receipt_read','alternates','lookbuild_note','intent')`, `status check ('queued','running','succeeded','partial','failed','cancelled')`, `idempotency_key text`, `input jsonb` (sanitised brief, no base64), `output jsonb`, `error text`, `attempts int`, `artifact_id uuid null`, `created_at`, `started_at`, `finished_at` | `unique (user_id, idempotency_key)`; index `(user_id, created_at desc)`, `(status, created_at)`; replaces the in-memory `imageJobs`/`lookStore` Maps and the client `genId`; Realtime on own rows allows image polling to be dropped |
| `generation_assets` | S (own select) | `id`, `job_id`, `user_id`, `idx int`, `role text` (hero/still/grid...), `asset_id`, `status`, `created_at` | one row per image frame |
| `lookbook_items` (artifacts) | U (title and archive only) / S (create) | `id uuid`, `user_id`, `legacy_id bigint null` (for migration), `type check ('key_piece','daily_look','travel_edit','moodboard','weekly_plan_archived')`, `title`, `subtitle`, `cover_asset_id` / `img`, `data jsonb`, `schema_version smallint`, `generation_job_id`, `created_at`, `updated_at`, `deleted_at` | The server creates the artifact when the job succeeds. The client may update `title`, `subtitle` and `data` sub-state such as packed and pins (a column grant on `title, subtitle, data`), plus soft delete. `share_id`/`is_public` are removed. `unique (user_id, legacy_id)`. |
| `shares` | S | `token text PK` (at least 128-bit base64url, from `gen_random_bytes(16)`), `owner_id`, `subject_type check ('artifact','look')`, `subject_id uuid`, `snapshot jsonb` (a sanitised public projection: title, images and pieces with no ids, photoUrl, dates or prompt), `created_at`, `revoked_at`, `expires_at`, `view_count` | Created by `create_share(subject_type, subject_id)` (SECURITY DEFINER; checks ownership, builds the snapshot, returns the token). Read by `get_share(token)`, which is granted to `anon` and returns only the snapshot when `revoked_at is null`. **There are no table policies for anon.** |
| `avatar_cells` | R/S | as legacy | a shared catalog |

### 6.6 Entitlements, quota, usage
| Table | Own. | Columns | Notes |
|---|---|---|---|
| `plans` | R | `id text PK` ('beta','free','plus'), `limits jsonb` (per-metric caps per period) | |
| `entitlements` | S (own select) | `id`, `user_id`, `plan_id`, `status check ('active','trialing','past_due','canceled')`, `source check ('beta_invite','stripe','manual')`, `external_ref` (Stripe subscription id), `current_period_start/end`, `created_at`, `updated_at` | partial unique on the active row per user |
| `usage_counters` | S | `user_id`, `metric` ('generation.text','generation.image','analyse.photo','inbox.receipt'), `period_start date`, `count int` | PK `(user_id, metric, period_start)`; incremented by `private.consume_quota(user, metric, n)`, which returns false over the limit (atomic `insert ... on conflict do update ... where count + n <= limit`) |
| `generation_log` → `generation_calls` | S | `id`, `job_id`, `user_id` (**from the verified JWT**), `endpoint`, `model`, `tokens_in`, `tokens_out`, `latency_ms`, `status` (check), `prompt text`, `response jsonb`, `detail jsonb`, `created_at` | partitioned monthly (`pg_partman` or manual); `prompt`/`response` are nulled after 30 days and the rows dropped after 13 months; `user_id` is nulled on account deletion *and the prompt is purged* |

### 6.7 Growth and feedback (moved from Airtable)
| Table | Own. | Columns | Notes |
|---|---|---|---|
| `waitlist` | S | `id`, `email citext unique`, `name`, `instagram_handle`, `source`, `utm jsonb`, `invited_at`, `converted_user_id FK auth.users set null`, `created_at`, `unsubscribed_at` | written by a rate-limited route handler (+ Turnstile); replaces Airtable `Contacts` |
| `feedback` | U (insert only) + S | `id`, `user_id null`, `email null` (anon waitlist feedback), `subject_type check ('artifact','look','job','app')`, `subject_id uuid null`, `track`, `rating smallint check in (0,1)`, `note`, `prompt`, `context jsonb` (was Airtable `Looks Output`), `photo_asset_id`, `created_at` | merges Airtable `Feedback` and legacy `feedback`; there is no client select |
| `events` | S (insert via route handler or `track_event(type, meta)` RPC validating against `event_types`) | as legacy; `environment` is dropped (separate projects per env) | partitioned monthly, 13-month retention; PostHog remains the funnel tool |
| `notifications` | S (own select) | as legacy + `channel`, `provider_message_id`, `status` | |
| `email_suppressions` | S | `email citext PK`, `reason`, `created_at` | unsubscribe/bounce |

### 6.8 Assets and deletion
- **`assets`** (S, own select): `id`, `user_id null` (null means a shared catalog asset), `provider check ('cloudinary','supabase_storage')`, `public_id`, `url`, `kind` (wardrobe/headshot/full_length/generated/render/receipt), `sensitive bool` (true for face and body photos), `created_at`, `deleted_at`. Every URL column above references an asset, so deletion can enumerate external blobs. Consider Supabase Storage with private buckets and signed URLs for `sensitive` assets.
- **`account_deletion_requests`** (S): `user_id PK`, `requested_at`, `status`, `completed_at`, `detail jsonb`. It is created by the `request_account_deletion()` RPC (own user only). A worker then:
  1. deletes the provider assets listed in `assets`
  2. deletes `waitlist`/Resend contacts by email
  3. purges `generation_calls.prompt/response` for the user
  4. writes `audit_log`
  5. calls `auth.admin.deleteUser`, which cascades through every `user_id` FK

  Every user-owned FK is `on delete cascade`, except `generation_calls`/`audit_log`/`feedback`, which are `set null` after redaction.
- **Retention jobs** (pg_cron or a scheduled route):
  - hard-delete tombstones older than 30 days
  - purge `generation_calls` payloads older than 30 days
  - delete the bodies of decided `wardrobe_inbox` rows older than 90 days
  - drop `events` partitions older than 13 months

### 6.9 RLS templates
```sql
-- user-writable table template
alter table public.wardrobe_items enable row level security;
revoke all on public.wardrobe_items from anon;
create policy wi_select on public.wardrobe_items for select to authenticated
  using (user_id = (select auth.uid()));
create policy wi_insert on public.wardrobe_items for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy wi_update on public.wardrobe_items for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- no DELETE policy: soft delete via update of deleted_at; hard delete by retention job
create trigger wi_touch before update on public.wardrobe_items
  for each row execute function private.touch_updated_at();   -- security invoker, search_path ''

-- profiles: column-level grants
revoke update on public.profiles from authenticated;
grant update (first_name, last_name, mobile, gender_identity, style_icons, style_archetypes,
              budget, annual_spend, splurge_categories, wardrobe_description,
              instagram_handle, notification_prefs, avatar_prefs) on public.profiles to authenticated;

-- admin helper
create function private.is_admin() returns boolean
  language sql stable security definer set search_path = '' as
  $$ select exists (select 1 from private.admin_users a where a.user_id = (select auth.uid())) $$;
revoke execute on function private.is_admin() from public, anon;

-- share read (the only anon surface)
create function public.get_share(p_token text) returns jsonb
  language sql stable security definer set search_path = '' as
  $$ select s.snapshot from public.shares s
     where s.token = p_token and s.revoked_at is null
       and (s.expires_at is null or s.expires_at > now()) $$;
revoke execute on function public.get_share(text) from public;
grant execute on function public.get_share(text) to anon, authenticated;
```

### 6.10 Legacy → target mapping (data migration)
The ETL runs server-side with the service role, from a `pg_dump --data-only` of Robes_p0 into a staging schema `legacy.*`, followed by `insert ... select` transforms.

| Legacy | Target | Transform |
|---|---|---|
| `profiles.id, first_name, last_name, mobile, style_icons, budget, wardrobe_description, splurge_categories, annual_spend, instagram_handle, gender_identity, onboarded_at, created_at, updated_at` | `profiles.*` (same names) | copy as-is |
| `profiles.style_dna->'style_archetypes'` | `profiles.style_archetypes` | `array(select jsonb_array_elements_text(...))` |
| `profiles.notification_prefs`, `avatar_prefs` | `profiles.notification_prefs`, `avatar_prefs` | copy as-is (set `v` to 2 if missing) |
| `profiles.style_dna->'color_harmony'`, `->'silhouette_proportions'`, `->'user_overrides'` | `style_profiles.color_harmony`, `silhouette_proportions`, `user_overrides` | extract |
| `profiles.colour_analysis`, `silhouette_analysis` | `style_profiles.colour_render`, `silhouette_render` | copy (or regenerate from the catalogs) |
| `profiles.season, undertone, contrast, body_type` | `style_profiles.*` | copy |
| `profiles.headshot_url`, `full_length_url` | `assets` (kind headshot/full_length, `sensitive=true`) → `style_profiles.*_asset_id` | parse the Cloudinary `public_id` from the URL |
| `profiles.avatar_id` | `avatars.avatar_id` | copy |
| `profiles.inbox_address` | `inbox_addresses` | **re-mint** (the old value is guessable); forwarders need to learn the new address |
| `profiles.is_admin = true` | `private.admin_users` | insert with role `admin`, after manual review |
| `profiles.wardrobe_items_count` | dropped | derive with `count(*)` |
| `prompt_history.*` | `generation_calls` (endpoint `'edge:wardrobe-context'`) or dropped | small volume, so optionally drop |
| `wardrobe_items.*` core | `wardrobe_items.*` | copy the id; `image_url` → `assets` + keep the url |
| `wardrobe_items.seasons` | `season_band`/`season_source` | apply the `season_tags_migration.sql:119-130` mapping if migration 17 never ran on Robes_p0 |
| `wardrobe_items.occasions` | `tags` + `tag_pieces` (source `user`) | apply the `season_tags_migration.sql:333-357` logic if 17 never ran |
| `wardrobe_items.times_worn` | dropped | derive from `wears`. **Diff first:** where legacy `times_worn` exceeds the `wears` count, record the difference as `wardrobe_items.legacy_wear_count` or synthesize `wears` rows with source `'retro'`. |
| `wishlist_items.*` | `wishlist_items.*` | copy |
| `tags`, `tag_pieces`, `tag_looks` | same names | add `user_id` to the join rows from the parent; drop rows whose tag and parent owners differ (S8) |
| `lookbook_items (user_id, id bigint)` | `lookbook_items (id uuid, legacy_id = id)` | new uuid. `type` maps `key-piece`→`key_piece`, `daily-look`→`daily_look`, `travel-edit`→`travel_edit`, `moodboard`→`moodboard`, and `weekly-plan*`→`weekly_plan_archived`. **Drop type `look`** (empty stubs) or keep it as `legacy_stub`. Unwrap `data`: `data.kpData`/`dlData`/`tvData`/`wkData` → `data` with `schema_version=1`; moodboard data is used as-is. Strip base64 and `jobId`. Image URLs → `generation_assets`/`assets`. |
| `lookbook_items.share_id, is_public` | `shares` | For each public row, build a sanitised `snapshot`. **Keep the old share_id as the token** so live `/board/<id>` links survive, and flag `legacy_token=true` for rotation, *or* re-mint and add a 301 map. |
| `planned_days.source_id` + `source_type` | `planned_days.artifact_id` / `look_id` | `source_type='look'` → `look_id = source_id::uuid`; otherwise join `legacy lookbook (user_id, id = source_id::bigint)` → the new `artifact_id`. Drop orphans. Drop `environment`. |
| `looks.*` | `looks.*` | copy; `looks.tags` → `tag_looks` (inferred) if 17 never ran; `render_url` → assets |
| `look_pieces.*` | `look_pieces.* + user_id` | join the parent; drop rows whose piece owner differs from the look owner |
| `wears.*` | `wears.*`, `source_id` → `source_ref` | drop rows whose `look_id` owner differs from `user_id` |
| `events.*` | `events.*` | copy the last 13 months; drop `environment` or keep it as `metadata.env` |
| `generation_log.*` | `generation_calls.*` | copy the last 30 days with payloads; aggregates only for older rows (or drop). `user_id` stays as-is, but note it was **unverified** (S4). |
| `feedback.*` | `feedback` (`subject_type='artifact'`, `subject_id` = the new uuid via `legacy_id`) | map `lookbook_item_id` through the legacy lookbook |
| Airtable `Contacts` | `waitlist` (email, name, instagram_handle, created_at ← Joined At); `converted_user_id` by matching `auth.users.email` | Airtable API export |
| Airtable `Feedback` | `feedback` (`email`, `prompt`, `note` ← User Feedback, `rating`, `context` ← Looks Output (parsed if JSON), `photo_asset_id` ← Photo) | Airtable API export |
| `notifications.*` | `notifications.*` | copy (it keeps the idempotency across the cutover) |
| `wardrobe_inbox.*` | `wardrobe_inbox.*` | copy the held rows; the decided rows are redacted |
| `avatar_cells.*` | `avatar_cells.*` | copy |
| `wardrobe_taxonomy`, `wardrobe_tag_defaults`, `wear_seed_labels` | same names | re-seed from `wardrobe_taxonomy.js` via the generators; do not copy |
| auth.users | auth.users | the same project can be kept; for a new project use Supabase's auth migration (keeps uuids and password hashes; OAuth identities re-link by email) |

**Cutover checklist:**
1. Introspect Robes_p0 and record which of migrations 12 and 16-23 actually exist.
2. Freeze legacy writes, which requires disabling client direct REST.
3. Run the ETL into staging and run the assertions: counts per user and table, orphan reports, and a JSON-shape census per `lookbook_items.type`.
4. Swap DNS, and keep `/board/:shareId` working through the `shares` legacy tokens.
5. Rotate the publishable key and service key.
6. Delete the Airtable base once parity is verified.
