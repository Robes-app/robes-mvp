-- ADR-002 audit gate — run BEFORE migration 17, in the Supabase SQL editor.
-- Read-only. Writes nothing, changes nothing. Safe to run repeatedly.
--
-- ONE STATEMENT, ON PURPOSE. The Supabase SQL editor renders only the LAST
-- statement's result, so a file of six separate queries silently throws away
-- five of them (hit for real on 2026-08-12: the gate verdict ran and was
-- never seen). Everything below is a single union'd result set — one run,
-- one table, every section. Read it top to bottom.
--
-- The question it answers: does collapsing the five-value `seasons` axis into
-- three bands (Spring/Summer · Autumn/Winter · Year-round) lose real
-- information? A piece tagged {Spring} or {Spring, Summer} lands cleanly in a
-- band. A piece tagged {Spring, Winter} does not — it collapses to year_round
-- and the distinction it was carrying is gone.
--
-- THE GATE, pre-committed (ADR-002 [Q4]): if cross-band pairings exceed 25%
-- of season-tagged pieces, the four-season axis was carrying real information
-- and the ADR needs revisiting before migration 17 runs. Below that, the
-- collapse is near-lossless and Session A proceeds. Pre-commit the threshold
-- before reading the number — on current beta volumes this may be a handful
-- of rows, and a small n should be called indicative rather than dressed up
-- as data.

with
-- ── season banding ──
banded as (
  select coalesce(seasons, '{}'::text[]) as s from public.wardrobe_items
),
classed as (
  select
    ('Spring' = any(s) or 'Summer' = any(s)) as has_ss,
    ('Autumn' = any(s) or 'Winter' = any(s)) as has_aw,
    ('Year-round' = any(s))                  as has_yr,
    cardinality(s) as n
  from banded
),
gate as (
  select
    count(*) filter (where has_ss or has_aw)  as tagged,
    count(*) filter (where has_ss and has_aw) as cross_band
  from classed
),
-- ── the look-tag flat array (ADR-002 [C1]) ──
looktags as (
  select trim(t.tag) as tag
  from public.looks l, unnest(coalesce(l.tags, '{}'::text[])) as t(tag)
  where trim(coalesce(t.tag, '')) <> ''
),
-- ── the piece occasions array ──
occ as (
  select trim(o.tag) as tag
  from public.wardrobe_items w, unnest(coalesce(w.occasions, '{}'::text[])) as o(tag)
  where trim(coalesce(o.tag, '')) <> ''
),
rows_out as (

  -- 1 · THE GATE ─────────────────────────────────────────────────────────
  select 1 as sect, 0 as ord, '1 · GATE' as section, 'VERDICT' as item, null::bigint as n,
    case
      when tagged = 0        then 'NO DATA — decide on the product argument'
      when tagged < 40       then 'SMALL n — indicative only, decide on the product argument'
      when 100.0 * cross_band / tagged > 25 then 'GATE FAILS — revisit ADR-002 before migration 17'
      else 'GATE PASSES — proceed to migration 17'
    end as detail
  from gate
  union all
  select 1, 1, '1 · GATE', 'cross-band %', null,
         coalesce(round(100.0 * cross_band / nullif(tagged, 0), 1)::text, 'n/a') || '  (threshold 25%)'
  from gate
  union all
  select 1, 2, '1 · GATE', 'season-tagged pieces', tagged, null from gate
  union all
  select 1, 3, '1 · GATE', 'of which cross-band', cross_band, null from gate

  -- 2 · HOW THE WARDROBE SPLITS ──────────────────────────────────────────
  union all
  select 2, 0, '2 · PIECES', bucket, cnt,
         round(100.0 * cnt / nullif(sum(cnt) over (), 0), 1)::text || '% of all pieces'
  from (
    select
      case
        when n = 0                             then 'untagged (-> year_round)'
        when has_yr and not (has_ss or has_aw) then 'year-round only'
        when has_ss and has_aw                 then 'CROSS-BAND (-> year_round, the loss)'
        when has_ss                            then 'spring/summer only'
        else 'autumn/winter only'
      end as bucket,
      count(*) as cnt
    from classed group by 1
  ) b

  -- 3 · WHICH PAIRINGS, IF THE GATE FAILS ────────────────────────────────
  -- Says WHAT was being expressed, so a fourth band ('transitional') could be
  -- argued from data rather than from anticipation.
  union all
  select 3, 0, '3 · PAIRINGS', array_to_string(array(select unnest(seasons) order by 1), ' + '),
         count(*), null
  from public.wardrobe_items
  where seasons is not null and cardinality(seasons) > 0
  -- group by the EXPRESSION, never `group by 1`: inside a union branch the
  -- first output column is the constant section number, so an ordinal
  -- silently groups the wrong thing (or errors, as this one did).
  group by array_to_string(array(select unnest(seasons) order by 1), ' + ')

  -- 4 · LEGACY LOOK CLIMATE -> BAND ──────────────────────────────────────
  union all
  select 4, 0, '4 · LOOK CLIMATE', tag, count(*),
    '-> ' || case tag
      when 'High Summer' then 'spring_summer' when 'Transitional Warm' then 'spring_summer'
      when 'Transitional Cool' then 'autumn_winter' else 'autumn_winter' end
  from looktags
  where tag in ('High Summer','Transitional Warm','Transitional Cool','Deep Winter')
  group by tag

  -- 5 · CUSTOM TAGS AT RISK ──────────────────────────────────────────────
  -- The count migration 17 must preserve. An unknown plain string is a CUSTOM
  -- WEAR TAG and a 'vibe:' prefix is a custom vibe — both invisible to a
  -- migration that only maps the known vocabularies.
  union all
  select 5, 0, '5 · AT RISK',
         case when tag ilike 'vibe:%' then 'look · custom vibe' else 'look · custom wear_for' end,
         count(*), string_agg(distinct tag, ', ')
  from looktags
  where tag not in (
    'High Summer','Transitional Warm','Transitional Cool','Deep Winter',
    'Daylight','Twilight & Evening',
    'Elevated Everyday','Smart Creative','Boardroom Power','Work-to-Dinner',
    'Al Fresco & Travel','Cocktail & Cultural','Formal / Gala',
    'Sharp Tailoring','Fluid Monochrome','Column Line','Soft Layering',
    'Old Céline Minimal','90s Off-Duty','Minimalist Glamour')
  group by (case when tag ilike 'vibe:%' then 'look · custom vibe' else 'look · custom wear_for' end)
  union all
  select 5, 1, '5 · AT RISK', 'piece · custom wear_for', count(*), string_agg(distinct tag, ', ')
  from occ
  where tag not in ('Everyday','Work','Evening','Occasion','Travel','Active')
  having count(*) > 0

  -- 6 · WHAT MIGRATION 17 WILL TOUCH ─────────────────────────────────────
  union all
  select 6, 0, '6 · SCALE', 'pieces', count(*), null from public.wardrobe_items
  union all
  select 6, 1, '6 · SCALE', 'looks',  count(*), null from public.looks
  union all
  select 6, 2, '6 · SCALE', 'looks carrying any tag', count(*), null
  from public.looks where tags is not null and cardinality(tags) > 0

  -- 7 · DEPENDENCIES ─────────────────────────────────────────────────────
  -- Session B's category -> tag pre-fill keys on L2. category_l2 is checked
  -- via the catalog rather than referenced, so this file still runs on a
  -- project where migration 15 has not been applied.
  union all
  select 7, 0, '7 · DEPS', 'migration 15 (wardrobe_taxonomy)', null,
    case when to_regclass('public.wardrobe_taxonomy') is not null
      and exists (select 1 from information_schema.columns
                  where table_schema='public' and table_name='wardrobe_items' and column_name='category_l2')
      then 'present' else 'MISSING — run wardrobe_taxonomy_migration.sql first' end
  union all
  select 7, 1, '7 · DEPS', 'migration 16 (look_pieces.role)', null,
    case when exists (select 1 from information_schema.columns
                      where table_schema='public' and table_name='look_pieces' and column_name='role')
      then 'present' else 'MISSING — run look_roles_migration.sql' end
  union all
  select 7, 2, '7 · DEPS', 'migration 17 (this ADR)', null,
    case when exists (select 1 from information_schema.columns
                      where table_schema='public' and table_name='wardrobe_items' and column_name='season_band')
      then 'ALREADY APPLIED' else 'not yet applied' end
)
select section, item, n, detail
from rows_out
order by sect, ord, n desc nulls last, item;
