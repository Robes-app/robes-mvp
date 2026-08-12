-- ADR-002 audit gate — run BEFORE migration 17, in the Supabase SQL editor.
-- Read-only. Writes nothing, changes nothing.
--
-- The question this answers: does collapsing the five-value `seasons` axis
-- into three bands (Spring/Summer · Autumn/Winter · Year-round) lose real
-- information? A piece tagged {Spring} or {Spring, Summer} lands cleanly in
-- a band. A piece tagged {Spring, Winter} does not — it collapses to
-- year_round, and the distinction it was carrying is gone.
--
-- THE GATE, pre-committed (ADR-002 [Q4]): if cross-band pairings exceed
-- 25% of season-tagged pieces, the four-season axis was carrying real
-- information and the ADR needs revisiting before migration 17 is run.
-- Below that, the collapse is near-lossless and Session A proceeds.
--
-- Pre-commit the threshold before reading the number. On current beta
-- volumes this may be a handful of rows — if the sample is too small to be
-- evidence, say so and decide on the product argument (Dublin/London
-- wardrobes are year-round with outliers; SS/AW is native ICP vocabulary)
-- rather than dressing a small n up as data.

-- ── 1. The gate ─────────────────────────────────────────────────────────
with banded as (
  select
    id,
    coalesce(seasons, '{}'::text[]) as s
  from public.wardrobe_items
),
classed as (
  select
    id,
    ('Spring' = any(s) or 'Summer' = any(s)) as has_ss,
    ('Autumn' = any(s) or 'Winter' = any(s)) as has_aw,
    ('Year-round' = any(s))                  as has_yr,
    cardinality(s) as n
  from banded
),
bucketed as (
  select
    case
      when n = 0                       then 'untagged'
      when has_yr and not (has_ss or has_aw) then 'year_round_only'
      when has_ss and has_aw           then 'cross_band'
      when has_ss                      then 'spring_summer_only'
      when has_aw                      then 'autumn_winter_only'
      else 'other'
    end as bucket
  from classed
)
select
  bucket,
  count(*) as pieces,
  round(100.0 * count(*) / nullif(sum(count(*)) over (), 0), 1) as pct_of_all
from bucketed
group by bucket
order by pieces desc;

-- ── 2. The single number the gate turns on ──────────────────────────────
-- Cross-band pairings as a share of pieces that carry ANY specific season
-- (untagged and Year-round-only pieces are excluded — they lose nothing).
with banded as (
  select coalesce(seasons, '{}'::text[]) as s from public.wardrobe_items
),
classed as (
  select
    ('Spring' = any(s) or 'Summer' = any(s)) as has_ss,
    ('Autumn' = any(s) or 'Winter' = any(s)) as has_aw
  from banded
)
select
  count(*) filter (where has_ss or has_aw)               as season_tagged_pieces,
  count(*) filter (where has_ss and has_aw)              as cross_band_pieces,
  round(100.0 * count(*) filter (where has_ss and has_aw)
        / nullif(count(*) filter (where has_ss or has_aw), 0), 1) as cross_band_pct,
  case
    when count(*) filter (where has_ss or has_aw) = 0 then 'NO DATA — decide on the product argument'
    when count(*) filter (where has_ss or has_aw) < 40 then 'SMALL n — treat as indicative only'
    when 100.0 * count(*) filter (where has_ss and has_aw)
         / nullif(count(*) filter (where has_ss or has_aw), 0) > 25 then 'GATE FAILS — revisit ADR-002'
    else 'GATE PASSES — proceed to migration 17'
  end as verdict
from classed;

-- ── 3. Which exact pairings, if the gate fails ──────────────────────────
-- Tells you WHAT was being expressed, so a fourth band (`transitional`)
-- can be argued from the actual data rather than from anticipation.
select
  array_to_string(array(select unnest(seasons) order by 1), ' + ') as pairing,
  count(*) as pieces
from public.wardrobe_items
where seasons is not null and cardinality(seasons) > 0
group by 1
order by pieces desc;

-- ── 4. Legacy look climate values, for the migration-17 backfill ────────
-- All four look-tag axes ride ONE flat looks.tags text[] recovered by
-- disjointness (ADR-002 [C1]) — this is the climate slice of that array.
select
  t.tag as legacy_climate,
  case t.tag
    when 'High Summer'        then 'spring_summer'
    when 'Transitional Warm'  then 'spring_summer'
    when 'Transitional Cool'  then 'autumn_winter'
    when 'Deep Winter'        then 'autumn_winter'
  end as maps_to,
  count(*) as looks
from public.looks l, unnest(coalesce(l.tags, '{}'::text[])) as t(tag)
where t.tag in ('High Summer', 'Transitional Warm', 'Transitional Cool', 'Deep Winter')
group by 1, 2
order by looks desc;

-- ── 5. Custom tags at risk — the ones a naive migration would destroy ───
-- An unknown plain string in looks.tags is a CUSTOM WEAR TAG; a 'vibe:'
-- prefix marks a custom vibe. Both are invisible to a migration that only
-- maps the known vocabularies. This is the count that has to survive.
select
  case when t.tag ilike 'vibe:%' then 'custom vibe' else 'custom wear_for' end as kind,
  count(*)                    as occurrences,
  count(distinct t.tag)       as distinct_labels,
  array_agg(distinct t.tag)   as labels
from public.looks l, unnest(coalesce(l.tags, '{}'::text[])) as t(tag)
where trim(coalesce(t.tag, '')) <> ''
  and t.tag not in (
  'High Summer', 'Transitional Warm', 'Transitional Cool', 'Deep Winter',
  'Daylight', 'Twilight & Evening',
  'Elevated Everyday', 'Smart Creative', 'Boardroom Power', 'Work-to-Dinner',
  'Al Fresco & Travel', 'Cocktail & Cultural', 'Formal / Gala',
  'Sharp Tailoring', 'Fluid Monochrome', 'Column Line', 'Soft Layering',
  'Old Céline Minimal', '90s Off-Duty', 'Minimalist Glamour'
)
group by 1;

-- Same question on the piece side: anything in occasions beyond the five
-- known values plus the legacy 'Everyday' is a chip she typed herself.
select
  o.tag as custom_wear_tag,
  count(*) as pieces
from public.wardrobe_items w, unnest(coalesce(w.occasions, '{}'::text[])) as o(tag)
-- Whitespace-only chips are dropped by migration 17 rather than migrated, so
-- they must not inflate the at-risk count here either.
where trim(coalesce(o.tag, '')) <> ''
  and o.tag not in ('Everyday', 'Work', 'Evening', 'Occasion', 'Travel', 'Active')
group by 1
order by pieces desc;

-- ── 6. Migration 15 dependency check (ADR-002 [Q5]) ─────────────────────
-- Session B's category → tag pre-fill keys on L2. If this returns false,
-- run supabase/wardrobe_taxonomy_migration.sql first.
-- (The L2 count is fetched dynamically — the column does not exist until 15
-- has run, so a plain reference to it would make this whole file error out
-- on exactly the projects it is meant to diagnose.)
do $$
declare has15 boolean; withl2 bigint; total bigint;
begin
  has15 := to_regclass('public.wardrobe_taxonomy') is not null
       and exists (select 1 from information_schema.columns
                   where table_schema = 'public' and table_name = 'wardrobe_items'
                     and column_name = 'category_l2');
  execute 'select count(*) from public.wardrobe_items' into total;
  if has15 then
    execute 'select count(*) from public.wardrobe_items where category_l2 is not null' into withl2;
  else
    withl2 := 0;
  end if;
  raise notice 'migration_15_has_run=% pieces_with_l2=% pieces_total=%', has15, withl2, total;
  if not has15 then
    raise notice 'ADR-002 [Q5]: run supabase/wardrobe_taxonomy_migration.sql before Session B.';
  end if;
end $$;
