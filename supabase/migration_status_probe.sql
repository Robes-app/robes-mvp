-- Migration status probe — run in the Supabase SQL editor, any time.
-- Read-only. Writes nothing, changes nothing. Safe to run repeatedly.
--
-- ONE STATEMENT, ON PURPOSE (the standing rule for this directory): the
-- Supabase SQL editor renders only the LAST statement's result, so a file of
-- seven separate queries would silently show you the seventh and discard the
-- rest. Everything below is a single union'd result set.
--
-- The question it answers: which of migrations 15–21 have ACTUALLY been run
-- on this project? CLAUDE.md's migration list records intent, not state, and
-- the two drift — several of these ship with client-side degrade paths
-- (PGRST204 strip-and-retry), so the app keeps working and nothing surfaces
-- the gap. Run this before running any migration, and again afterwards.
--
-- It probes for the STRUCTURE each migration creates rather than a version
-- table, because there is no migration ledger in this project. A partially
-- applied migration therefore reads 'not run' — which is the honest answer:
-- re-run it, they are all idempotent.
--
-- 15 supabase/wardrobe_taxonomy_migration.sql
-- 16 supabase/look_roles_migration.sql
-- 17 supabase/season_tags_migration.sql      (gate: season_tags_audit.sql first,
--                                             then season_tags_verify.sql after)
-- 18 supabase/tag_prefill_migration.sql      (needs 15 and 17)
-- 19 supabase/look_proposals_migration.sql
-- 20 supabase/avatar_migration.sql
-- 21 supabase/avatar_render_migration.sql

select '15 · wardrobe taxonomy' as migration,
       case when to_regclass('public.wardrobe_taxonomy') is not null
            then 'APPLIED' else 'not run' end as status
union all select '16 · look_pieces.role',
       case when exists(select 1 from information_schema.columns
                        where table_schema='public' and table_name='look_pieces'
                          and column_name='role')
            then 'APPLIED' else 'not run' end
union all select '17 · season bands + tags',
       case when to_regclass('public.tags') is not null
             and exists(select 1 from information_schema.columns
                        where table_schema='public' and table_name='wardrobe_items'
                          and column_name='season_band')
            then 'APPLIED' else 'not run' end
union all select '18 · tag pre-fill',
       case when to_regclass('public.wardrobe_tag_defaults') is not null
             and exists(select 1 from pg_trigger
                        where tgname='trg_wardrobe_tag_defaults')
            then 'APPLIED' else 'not run' end
union all select '19 · looks.proposals',
       case when exists(select 1 from information_schema.columns
                        where table_schema='public' and table_name='looks'
                          and column_name='proposals')
            then 'APPLIED' else 'not run' end
union all select '20 · profiles.avatar_id',
       case when exists(select 1 from information_schema.columns
                        where table_schema='public' and table_name='profiles'
                          and column_name='avatar_id')
             and exists(select 1 from information_schema.columns
                        where table_schema='public' and table_name='profiles'
                          and column_name='avatar_prefs')
            then 'APPLIED' else 'not run' end
union all select '21 · avatar_cells + render_url',
       case when to_regclass('public.avatar_cells') is not null
             and exists(select 1 from information_schema.columns
                        where table_schema='public' and table_name='looks'
                          and column_name='render_url')
            then 'APPLIED' else 'not run' end
order by 1;
