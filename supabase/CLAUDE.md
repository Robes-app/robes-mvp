# supabase/ — the legacy app's database

Project `Robes_p0`, shared by beta and production. There is no migration runner: each file is pasted into the Supabase SQL editor by hand, in the order below, so the live schema can lag the code by weeks.

## Before relying on a column
The history marks many migrations "NOT yet run", and that record goes stale. Check the live schema instead:
```sql
select table_name, column_name from information_schema.columns
where table_schema = 'public' and column_name in ('material', 'colour_shade', 'twin_url', 'status');
```

## Writing a migration
- **Idempotent**: `add column if not exists`, `create … if not exists`, guarded backfills, a rollback block at the foot. It may be pasted twice.
- **Ships with a client degrade.** Until it runs, the client strips the new column on a PGRST204 naming it and retries without it (`_waRowWrite`'s tiers, `_lkPropCol`, `_waCmCols`…), and the feature stands down quietly. Never ship a write that fails without the column.
- **One statement per result you need to see.** The editor pools connections and shows only the last statement's result:
  - no temp tables or session state across statements — repeat the CTE;
  - an audit or diagnostic file is ONE statement (union the sections);
  - a data-modifying CTE can't see its own inserts in the same statement.
- RLS: own-row policies plus `public.is_admin()` admin-read. Insert-only tables with admin-only select are written with `Prefer: return=minimal`.
- **Generated files — never edit the SQL**: 15 (`wardrobe_taxonomy.js`), 18 (`CATEGORY_DEFAULTS` in it), 27 (`colour_model.cjs`). Edit the source and rerun the matching `scripts/gen_*_migration.mjs`.
- **Never re-run `onboarding_migration.sql`**: its unguarded backfill stamps every pending user as onboarded.
- **`baseline/robes_p0_<date>.sql` is the beginning of time**: production's `public` structure, beta's `auth.users` trigger and the reference rows, no user data. Staging was built from it on 2026-10-27 and matched production line for line. Take a new one with `pg_dump` 17 (`/opt/homebrew/opt/libpq/bin`) in a read-only session; production is reached through the `aws-1-eu-central-1` session pooler (its direct host is IPv6-only).
- **The new app's migrations never run as `postgres` here.** Its baseline revokes default `EXECUTE` on functions for the role that runs it, so every later beta function made by `postgres` would lose public access. Run them as a dedicated `robes_migrator` role.
- Migrations 17 and 18 have a throwaway-database harness (`scripts/season_tags_migration_test.sh`, `scripts/tag_prefill_test.sh`, needs `DATABASE_URL`). Run `season_tags_audit.sql` before 17 and `season_tags_verify.sql` after.

## Order
| # | File | Adds |
|---|------|------|
| 1 | `schema.sql` | profiles, prompt_history, signup trigger |
| 2 | `wardrobe_schema.sql` | wardrobe_items |
| 3 | `item_dna_migration.sql` | wardrobe_items.item_dna |
| 4–5 | `style_notes_migration.sql`, `style_notes_analysis_migration.sql` | Style notes columns on profiles |
| 6 | `style_dna_migration.sql` | profiles.style_dna, wardrobe_items_count trigger |
| 7 | `onboarding_migration.sql` | profiles.onboarded_at (do not re-run) |
| 8 | `lookbook_migration.sql` | lookbook_items |
| 9 | `share_migration.sql` | share_id / is_public + anon read, instagram_handle |
| 10 | `wardrobe_v2_migration.sql` | hero/seasons/occasions/price…, wishlist_items |
| 11 | `admin_capture_migration.sql` | is_admin, events, generation_log, feedback, admin RPC |
| 12 | `planned_days_migration.sql` (+ `planned_days_backfill.sql`) | the Diary index |
| 13 | `gender_identity_migration.sql` | profiles.gender_identity |
| 14 | `looks_migration.sql` | looks, look_pieces, wears (no update policy on wears) |
| 15 | `wardrobe_taxonomy_migration.sql` | category_l2/l3 + lookup (generated) |
| 16 | `look_roles_migration.sql` | look_pieces.role |
| 17 | `season_tags_migration.sql` | season/climate bands, shared tags namespace |
| 18 | `tag_prefill_migration.sql` | category → tag pre-fill trigger (generated) |
| 19 | `look_proposals_migration.sql` | looks.proposals |
| 20–21 | `avatar_migration.sql`, `avatar_render_migration.sql` | avatar_id/prefs, avatar_cells, looks.render_url/key |
| 22 | `notifications_migration.sql` | notification_prefs, notifications ledger |
| 23 | `wardrobe_inbox_migration.sql` | size/currency, inbox_address, wardrobe_inbox |
| 24 | `look_styling_migration.sql` | looks.styling |
| 25 | `look_states_migration.sql` | looks.status / anchor / set grouping |
| 26 | `twin_migration.sql` | profiles.twin_url / twin_key |
| 27 | `colour_model_migration.sql` | colour_shade / colour_extra / print (generated) |
| 28 | `looks_admin_read_migration.sql` | admin read on looks |
| 29 | `material_migration.sql` | material |

One-offs: `weekly_plan_sweep.sql` (archives weekly plans, ADR-001). Edge function: `functions/wardrobe-context`.
