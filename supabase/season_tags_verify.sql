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

-- Preflight. Postgres resolves function references at PARSE time, so the
-- pre-fill checks below cannot be guarded with a CASE — the whole query
-- would fail to parse on a database without migration 18. This turns that
-- into a sentence. (Two statements; the editor shows the last one, which is
-- the report.)
do $$
begin
  if to_regclass('public.wardrobe_tag_defaults') is null then
    raise exception 'ADR-002: migration 18 has not run — apply supabase/tag_prefill_migration.sql first, or use the git history version of this file to verify a 17-only database.';
  end if;
end $$;

with
banded as (
  select id, user_id, category, category_l2, season_band, season_source, coalesce(seasons, '{}'::text[]) as s
  from public.wardrobe_items
),
-- Reconciliation has to know WHICH rule wrote the row. After migration 17
-- alone, every band came from the legacy seasons[] array. After migration
-- 18, an INFERRED band comes from the category pre-fill instead, and only a
-- USER band still traces back to seasons[]. Checking every row against the
-- array would report the whole pre-filled wardrobe as broken.
expected_band as (
  select
    b.id, b.season_band, b.season_source,
    case
      when ('Spring' = any(b.s) or 'Summer' = any(b.s))
       and ('Autumn' = any(b.s) or 'Winter' = any(b.s)) then 'year_round'
      when ('Spring' = any(b.s) or 'Summer' = any(b.s))  then 'spring_summer'
      when ('Autumn' = any(b.s) or 'Winter' = any(b.s))  then 'autumn_winter'
      else 'year_round'
    end as want_from_seasons,
    coalesce(d.season_band,
      case
        when ('Spring' = any(b.s) or 'Summer' = any(b.s))
         and ('Autumn' = any(b.s) or 'Winter' = any(b.s)) then 'year_round'
        when ('Spring' = any(b.s) or 'Summer' = any(b.s))  then 'spring_summer'
        when ('Autumn' = any(b.s) or 'Winter' = any(b.s))  then 'autumn_winter'
        else 'year_round'
      end) as want_inferred,
    case when cardinality(b.s) > 0 then 'user' else 'inferred' end as want_source
  from banded b
  left join public.wardrobe_items w on w.id = b.id
  left join lateral public.rb_piece_defaults(w.category, w.category_l2) d on true
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
  -- NOT "matches seasons[]". Once the client ships, editing a band in the
  -- piece sheet sets 'user' without touching the legacy array, so divergence
  -- there is correct behaviour, not corruption. What must hold is that the
  -- value is a real band; the agreement count below is informational.
  select 6, 0, '6 · CHECK', 'user-set bands are valid values',
         count(*) filter (where season_source = 'user'
           and season_band not in ('spring_summer','autumn_winter','year_round')),
         case when count(*) filter (where season_source = 'user'
           and season_band not in ('spring_summer','autumn_winter','year_round')) = 0
              then 'OK' else 'FAIL — a band she set is not a valid value' end
  from expected_band
  union all
  select 6, 8, '6 · INFO', 'user-set bands that still match seasons[]',
         count(*) filter (where season_source = 'user' and season_band = want_from_seasons),
         'of ' || count(*) filter (where season_source = 'user')
           || ' — divergence is expected once she edits one in the app'
  from expected_band
  union all
  -- Before migration 18 this is the migration-17 rule; after it, an inferred
  -- band is expected to have MOVED off the array onto the category default,
  -- so the check inverts rather than disappearing.
  -- An inferred band is expected to have MOVED off the legacy array onto the
  -- category default. Where the category maps to nothing ('Other'), it stays
  -- wherever migration 17 left it.
  select 6, 1, '6 · CHECK', 'inferred bands match the category pre-fill',
         count(*) filter (where season_source = 'inferred' and season_band <> want_inferred),
         case when count(*) filter (where season_source = 'inferred' and season_band <> want_inferred) = 0
              then 'OK' else 'FAIL — a pre-filled band disagrees with its category' end
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
  -- Everything the pre-fill can reach should have at least one wear tag.
  -- The exception is a piece filed under 'Other', which maps to nothing on
  -- purpose: unfiled is not a use.
  select 6, 7, '6 · CHECK', 'every filable piece carries a wear tag', count(*),
         case when count(*) = 0 then 'OK'
              else 'FAIL — filable pieces still untagged' end
  from public.wardrobe_items w
  -- A user-touched row is skipped by the backfill on purpose (adding
  -- 'everyday' on top of a piece she deliberately tagged 'work' alone would
  -- be editing her work), so it is not a gap.
  where w.season_source <> 'user'
    and exists (select 1 from public.rb_piece_defaults(w.category, w.category_l2))
    and not exists (select 1 from public.tag_pieces tp where tp.wardrobe_item_id = w.id)
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
