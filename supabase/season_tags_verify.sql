-- ADR-002 — post-migration-17 verification. Read-only, safe to re-run.
--
-- Run this AFTER supabase/season_tags_migration.sql. The migration's own
-- report is a RAISE NOTICE block, which the Supabase SQL editor does not
-- surface — it just says "Success. No rows returned". This is the same
-- report as a result set, plus reconciliation the notices never did.
--
-- ONE STATEMENT, for the same reason the audit is: the editor renders only
-- the last statement's result.
--
-- Sections 1–5 describe what landed. Section 6 is the one that matters: it
-- recomputes the expected outcome from the UNTOUCHED source columns
-- (`seasons`, `occasions`, `looks.tags`) and compares. Every check must read
-- OK. A FAIL means the backfill and its source disagree — investigate before
-- Session B, and do not drop the source columns.

with
banded as (
  select id, user_id, season_band, season_source, coalesce(seasons, '{}'::text[]) as s
  from public.wardrobe_items
),
expected_band as (
  select id, season_band,
    case
      when ('Spring' = any(s) or 'Summer' = any(s))
       and ('Autumn' = any(s) or 'Winter' = any(s)) then 'year_round'
      when ('Spring' = any(s) or 'Summer' = any(s))  then 'spring_summer'
      when ('Autumn' = any(s) or 'Winter' = any(s))  then 'autumn_winter'
      else 'year_round'
    end as want_band,
    season_source,
    case when cardinality(s) > 0 then 'user' else 'inferred' end as want_source
  from banded
),
-- custom labels present in the SOURCE arrays
src_piece_custom as (
  select distinct public.rb_tag_slug(trim(o.tag)) as slug
  from public.wardrobe_items w, unnest(coalesce(w.occasions, '{}'::text[])) as o(tag)
  where public.rb_tag_slug(o.tag) is not null
    and trim(o.tag) not in ('Everyday','Work','Evening','Occasion','Travel','Active')
),
src_look_custom as (
  select distinct public.rb_tag_slug(
           case when trim(t.tag) ilike 'vibe:%' then trim(substring(trim(t.tag) from 6)) else trim(t.tag) end) as slug
  from public.looks l, unnest(coalesce(l.tags, '{}'::text[])) as t(tag)
  where trim(coalesce(t.tag,'')) <> ''
    and trim(t.tag) not in (
      'High Summer','Transitional Warm','Transitional Cool','Deep Winter',
      'Daylight','Twilight & Evening',
      'Elevated Everyday','Smart Creative','Boardroom Power','Work-to-Dinner',
      'Al Fresco & Travel','Cocktail & Cultural','Formal / Gala',
      'Sharp Tailoring','Fluid Monochrome','Column Line','Soft Layering',
      'Old Céline Minimal','90s Off-Duty','Minimalist Glamour')
),
rows_out as (

  -- 1 · PIECES ────────────────────────────────────────────────────────────
  select 1 as sect, 0 as ord, '1 · PIECES' as section, season_band as item,
         count(*) as n,
         round(100.0 * count(*) / nullif(sum(count(*)) over (), 0), 1)::text || '%' as detail
  from public.wardrobe_items group by season_band
  union all
  select 1, 1, '1 · PIECES', 'source: ' || season_source, count(*),
         case season_source when 'user' then 'she set these'
                            else 'default — Session B''s pre-fill fills these' end
  from public.wardrobe_items group by season_source

  -- 2 · LOOKS ─────────────────────────────────────────────────────────────
  union all
  select 2, 0, '2 · LOOKS', climate_band, count(*), null from public.looks group by climate_band
  union all
  select 2, 1, '2 · LOOKS', 'source: ' || climate_source, count(*),
         case climate_source when 'derived' then 're-derives on next save'
                             else 'her override — never re-derived' end
  from public.looks group by climate_source

  -- 3 · TAGS ──────────────────────────────────────────────────────────────
  union all
  -- n counts ROWS; labels are distinct. The two differ when more than one
  -- account owns the same label — the namespace is per-user by design, so
  -- two "Lisbon" rows is correct, not a duplicate.
  select 3, 0, '3 · TAGS', kind || (case when is_seed then ' · seed' else ' · CUSTOM' end),
         count(*),
         string_agg(distinct label, ', ')
           || case when count(*) > count(distinct label)
                   then ' (across ' || count(distinct user_id) || ' accounts)' else '' end
  from public.tags group by kind, is_seed

  -- 4 · LINKS ─────────────────────────────────────────────────────────────
  union all
  select 4, 0, '4 · LINKS', 'tag_pieces', count(*), null from public.tag_pieces
  union all
  select 4, 1, '4 · LINKS', 'tag_looks',  count(*), null from public.tag_looks

  -- 5 · UNTOUCHED SOURCE COLUMNS ──────────────────────────────────────────
  -- These still carry the truth and are not dropped until a follow-up
  -- migration (ADR-002 [C8]). Rollback stays a redeploy while they exist.
  union all
  select 5, 0, '5 · SOURCE (kept)', 'pieces with seasons',   count(*), null
  from public.wardrobe_items where seasons is not null and cardinality(seasons) > 0
  union all
  select 5, 1, '5 · SOURCE (kept)', 'pieces with occasions', count(*), null
  from public.wardrobe_items where occasions is not null and cardinality(occasions) > 0
  union all
  select 5, 2, '5 · SOURCE (kept)', 'looks with tags',       count(*), null
  from public.looks where tags is not null and cardinality(tags) > 0

  -- 6 · RECONCILIATION — every row must read OK ───────────────────────────
  union all
  select 6, 0, '6 · CHECK', 'season_band matches seasons', count(*) filter (where season_band <> want_band),
         case when count(*) filter (where season_band <> want_band) = 0
              then 'OK' else 'FAIL — banding disagrees with the source array' end
  from expected_band
  union all
  select 6, 1, '6 · CHECK', 'season_source matches seasons', count(*) filter (where season_source <> want_source),
         case when count(*) filter (where season_source <> want_source) = 0
              then 'OK' else 'FAIL — provenance disagrees with the source array' end
  from expected_band
  union all
  select 6, 2, '6 · CHECK', 'custom piece tags preserved', count(*),
         case when count(*) = 0 then 'OK'
              else 'FAIL — custom occasions chips missing from tags' end
  from (select slug from src_piece_custom
        except select slug from public.tags where kind = 'wear_for') m
  union all
  select 6, 3, '6 · CHECK', 'custom look tags preserved', count(*),
         case when count(*) = 0 then 'OK'
              else 'FAIL — custom look tags missing from tags' end
  from (select slug from src_look_custom
        except select slug from public.tags) m
  union all
  select 6, 4, '6 · CHECK', 'no orphaned links', count(*),
         case when count(*) = 0 then 'OK' else 'FAIL — links point at missing tags' end
  from (
    select tag_id from public.tag_pieces where tag_id not in (select id from public.tags)
    union all
    select tag_id from public.tag_looks  where tag_id not in (select id from public.tags)
  ) o
  union all
  select 6, 5, '6 · CHECK', 'no cross-user links', count(*),
         case when count(*) = 0 then 'OK' else 'FAIL — a tag is attached across accounts' end
  from (
    select 1 from public.tag_pieces tp join public.tags t on t.id = tp.tag_id
      join public.wardrobe_items w on w.id = tp.wardrobe_item_id where t.user_id <> w.user_id
    union all
    select 1 from public.tag_looks tl join public.tags t on t.id = tl.tag_id
      join public.looks l on l.id = tl.look_id where t.user_id <> l.user_id
  ) x
  union all
  select 6, 6, '6 · CHECK', 'Light discarded (ADR-002 §7)', count(*),
         case when count(*) = 0 then 'OK' else 'FAIL — a Light value became a tag' end
  from public.tags where slug in ('daylight', 'twilight-evening')
)
select section, item, n, detail
from rows_out
order by sect, ord, n desc nulls last, item;
