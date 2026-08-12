-- Migration 18 assertions — run after supabase/tag_prefill_migration.sql.
-- Loaded by scripts/tag_prefill_test.sh. Throwaway databases only.
\set ON_ERROR_STOP on
create or replace function ck(name text, got anyelement, want anyelement) returns void language plpgsql as $$
begin
  if got is distinct from want then raise exception 'FAIL % — got %, want %', name, got, want; end if;
  raise notice 'ok  %', name;
end $$;

-- band + slug set for a piece, as one comparable string
create or replace function pf(p_label text) returns text language sql stable as $$
  select w.season_band || ' / ' || w.season_source || ' / ' ||
         coalesce((select string_agg(t.slug, ',' order by t.slug)
                   from public.tag_pieces tp join public.tags t on t.id = tp.tag_id
                   where tp.wardrobe_item_id = w.id), '-')
  from public.wardrobe_items w where w.label = p_label;
$$;

do $$
begin
-- ── the mapping ──
perform ck('L2 beats legacy category (Tops row -> Knitwear band)',
  pf('cashmere jumper'), 'autumn_winter / inferred / everyday');
perform ck('per-l2 override: Blazers is workwear, not seasonal',
  pf('oversized blazer'), 'year_round / inferred / everyday,work');
perform ck('Outerwear default sits beside that override',
  pf('wool coat'), 'autumn_winter / inferred / everyday');
perform ck('two-tag default',
  pf('evening gown'), 'year_round / inferred / evening,occasion');
perform ck('the one spring_summer default',
  pf('bikini'), 'spring_summer / inferred / travel');
perform ck('no L2 (pre-migration-15) falls back to legacy category',
  pf('legacy jeans'), 'year_round / inferred / everyday');
perform ck('Other is left alone — unfiled is not a use',
  pf('unfiled thing'), 'year_round / inferred / -');

-- ── the rule that makes correction permanent ──
perform ck('a user-set piece is untouched',
  pf('SHE CORRECTED'), 'spring_summer / user / -');

-- ── provenance ──
perform ck('every pre-filled link is inferred',
  (select count(*) from public.tag_pieces where source <> 'inferred'), 0::bigint);
perform ck('every pre-filled band is inferred',
  (select count(*) from public.wardrobe_items where season_source not in ('inferred','user')), 0::bigint);

-- ── seeds and isolation ──
perform ck('seed tags carry their display label',
  (select label from public.tags where slug = 'everyday' limit 1), 'Everyday');
perform ck('seed tags are marked is_seed',
  (select count(*) from public.tags where not is_seed), 0::bigint);
perform ck('the second account owns its own work tag',
  (select count(distinct user_id) from public.tags where slug = 'work'), 1::bigint);
perform ck('  ...and it is that account',
  (select user_id from public.tags where slug = 'work'),
  '00000000-0000-0000-0000-000000000002'::uuid);
perform ck('no cross-account links',
  (select count(*) from public.tag_pieces tp
     join public.tags t on t.id = tp.tag_id
     join public.wardrobe_items w on w.id = tp.wardrobe_item_id
    where t.user_id <> w.user_id), 0::bigint);

-- ── only the seven seeds can be pre-filled ──
perform ck('pre-fill never invents a slug',
  (select count(*) from public.tags
    where slug not in ('everyday','work','evening','occasion','travel','active','lounge')), 0::bigint);

raise notice '--- MIGRATION 18 ASSERTIONS PASSED ---';
end $$;
