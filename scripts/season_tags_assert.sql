-- ADR-002 harness assertions — run after supabase/season_tags_migration.sql.
-- Loaded by scripts/season_tags_migration_test.sh. Throwaway databases only.
\set ON_ERROR_STOP on
create or replace function ck(name text, got anyelement, want anyelement) returns void language plpgsql as $$
begin
  if got is distinct from want then
    raise exception 'FAIL % — got %, want %', name, got, want;
  end if;
  raise notice 'ok  %', name;
end $$;

do $$
declare u1 uuid := '00000000-0000-0000-0000-000000000001';
        u2 uuid := '00000000-0000-0000-0000-000000000002';
begin
-- ── season band backfill ──
perform ck('spring only -> spring_summer',      (select season_band from wardrobe_items where label='spring only'), 'spring_summer');
perform ck('spring+summer -> spring_summer',    (select season_band from wardrobe_items where label='spring+summer'), 'spring_summer');
perform ck('autumn+winter -> autumn_winter',    (select season_band from wardrobe_items where label='autumn+winter'), 'autumn_winter');
perform ck('cross band -> year_round',          (select season_band from wardrobe_items where label='cross band'), 'year_round');
perform ck('legacy Year-round -> year_round',   (select season_band from wardrobe_items where label='legacy year-round'), 'year_round');
perform ck('untagged -> year_round',            (select season_band from wardrobe_items where label='untagged'), 'year_round');
perform ck('empty array -> year_round',         (select season_band from wardrobe_items where label='empty array'), 'year_round');

-- ── season_source: stored value = hers, null/empty = inferred ──
perform ck('tagged piece source=user',          (select season_source from wardrobe_items where label='spring only'), 'user');
perform ck('legacy Year-round source=user',     (select season_source from wardrobe_items where label='legacy year-round'), 'user');
perform ck('untagged source=inferred',          (select season_source from wardrobe_items where label='untagged'), 'inferred');
perform ck('empty array source=inferred',       (select season_source from wardrobe_items where label='empty array'), 'inferred');

-- ── look climate backfill ──
perform ck('High Summer -> spring_summer',      (select climate_band from looks where name='all four axes'), 'spring_summer');
perform ck('Deep Winter -> autumn_winter',      (select climate_band from looks where name='fan-out'), 'autumn_winter');
perform ck('Transitional Cool -> autumn_winter',(select climate_band from looks where name='customs'), 'autumn_winter');
perform ck('Transitional Warm -> spring_summer',(select climate_band from looks where name='gala'), 'spring_summer');
perform ck('no climate tag -> year_round',      (select climate_band from looks where name='light only'), 'year_round');
perform ck('null tags -> year_round',           (select climate_band from looks where name='untagged look'), 'year_round');
perform ck('all migrated looks are derived',    (select count(*) from looks where climate_source <> 'derived'), 0::bigint);

-- ── piece tags: seeds, customs, blanks ──
perform ck('two seeds -> 2 links',
  (select count(*) from tag_pieces tp join wardrobe_items w on w.id=tp.wardrobe_item_id where w.label='two seeds'), 2::bigint);
perform ck('custom chip survives',
  (select count(*) from tag_pieces tp join tags t on t.id=tp.tag_id join wardrobe_items w on w.id=tp.wardrobe_item_id
   where w.label='custom chip' and t.slug='school-run' and t.is_seed=false), 1::bigint);
perform ck('legacy Everyday -> everyday seed',
  (select count(*) from tag_pieces tp join tags t on t.id=tp.tag_id join wardrobe_items w on w.id=tp.wardrobe_item_id
   where w.label='legacy everyday' and t.slug='everyday' and t.is_seed=true), 1::bigint);
perform ck('seed + custom -> 2 links',
  (select count(*) from tag_pieces tp join wardrobe_items w on w.id=tp.wardrobe_item_id where w.label='seed + custom'), 2::bigint);
perform ck('whitespace-only chip dropped',
  (select count(*) from tag_pieces tp join wardrobe_items w on w.id=tp.wardrobe_item_id where w.label='blank chip'), 1::bigint);
perform ck('piece tag source=user',
  (select count(*) from tag_pieces where source <> 'user'), 0::bigint);

-- ── look tags: fan-out, customs, light dropped ──
perform ck('all four axes -> 2 links (light dropped)',
  (select count(*) from tag_looks tl join looks l on l.id=tl.look_id where l.name='all four axes'), 2::bigint);
perform ck('Sharp Tailoring landed as a vibe seed',
  (select count(*) from tag_looks tl join tags t on t.id=tl.tag_id join looks l on l.id=tl.look_id
   where l.name='all four axes' and t.kind='vibe' and t.slug='sharp-tailoring' and t.is_seed), 1::bigint);
perform ck('Work-to-Dinner fans out to 2',
  (select count(*) from tag_looks tl join looks l on l.id=tl.look_id where l.name='fan-out'), 2::bigint);
perform ck('  ...to work + evening',
  (select array_agg(t.slug order by t.slug) from tag_looks tl join tags t on t.id=tl.tag_id join looks l on l.id=tl.look_id
   where l.name='fan-out'), array['evening','work']);
perform ck('vibe: prefix stripped -> custom vibe',
  (select count(*) from tag_looks tl join tags t on t.id=tl.tag_id join looks l on l.id=tl.look_id
   where l.name='customs' and t.kind='vibe' and t.slug='undone' and t.label='Undone' and t.is_seed=false), 1::bigint);
perform ck('unknown string -> custom wear_for',
  (select count(*) from tag_looks tl join tags t on t.id=tl.tag_id join looks l on l.id=tl.look_id
   where l.name='customs' and t.kind='wear_for' and t.slug='lisbon' and t.is_seed=false), 1::bigint);
perform ck('Formal / Gala -> occasion',
  (select array_agg(t.slug) from tag_looks tl join tags t on t.id=tl.tag_id join looks l on l.id=tl.look_id
   where l.name='gala'), array['occasion']);
perform ck('light-only look gets 0 links',
  (select count(*) from tag_looks tl join looks l on l.id=tl.look_id where l.name='light only'), 0::bigint);
perform ck('look tag source=inferred',
  (select count(*) from tag_looks where source <> 'inferred'), 0::bigint);
perform ck('total look links = 8',  (select count(*) from tag_looks), 8::bigint);
-- 2 (two seeds) + 1 (custom chip) + 1 (legacy everyday) + 2 (seed + custom)
-- + 1 (blank chip, whitespace dropped) + 1 (u2) = 8
perform ck('total piece links = 8', (select count(*) from tag_pieces), 8::bigint);

-- ── the namespace is per-user and SHARED across pieces and looks ──
perform ck('Lisbon is ONE tag for u1, reused by piece and look',
  (select count(*) from tags where user_id=u1 and kind='wear_for' and slug='lisbon'), 1::bigint);
perform ck('  ...attached to a piece', (select count(*) from tag_pieces tp join tags t on t.id=tp.tag_id where t.user_id=u1 and t.slug='lisbon'), 1::bigint);
perform ck('  ...and to a look',       (select count(*) from tag_looks  tl join tags t on t.id=tl.tag_id where t.user_id=u1 and t.slug='lisbon'), 1::bigint);
perform ck('u2 has its OWN Lisbon row', (select count(*) from tags where kind='wear_for' and slug='lisbon'), 2::bigint);
perform ck('no cross-user leakage on links',
  (select count(*) from tag_pieces tp join tags t on t.id=tp.tag_id join wardrobe_items w on w.id=tp.wardrobe_item_id
   where t.user_id <> w.user_id), 0::bigint);
perform ck('no cross-user leakage on look links',
  (select count(*) from tag_looks tl join tags t on t.id=tl.tag_id join looks l on l.id=tl.look_id
   where t.user_id <> l.user_id), 0::bigint);

-- ── slug normalisation ──
perform ck('slug: spaces + case',  public.rb_tag_slug('School Run'), 'school-run');
perform ck('slug: punctuation',    public.rb_tag_slug('Formal / Gala'), 'formal-gala');
perform ck('slug: diacritics transliterate', public.rb_tag_slug('Old Céline Minimal'), 'old-celine-minimal');
  perform ck('slug: ligature expands', public.rb_tag_slug('Cœur & Æther'), 'coeur-aether');
perform ck('slug: blank -> null',  public.rb_tag_slug('   '), null::text);
perform ck('slug: null -> null',   public.rb_tag_slug(null), null::text);

-- ── source columns untouched ──
perform ck('seasons still present',   (select count(*) from wardrobe_items where seasons is not null), 7::bigint);
perform ck('occasions still present', (select count(*) from wardrobe_items where occasions is not null), 6::bigint);
perform ck('looks.tags still present',(select count(*) from looks where tags is not null), 6::bigint);

-- ── check constraints bite ──
begin
  insert into wardrobe_items (user_id, label, season_band) values (u1, 'bad', 'transitional');
  raise exception 'FAIL season_band check did not fire';
exception when check_violation then raise notice 'ok  season_band check rejects an unknown band';
end;
begin
  insert into tags (user_id, kind, label, slug) values (u1, 'colour', 'x', 'x');
  raise exception 'FAIL tags_kind check did not fire';
exception when check_violation then raise notice 'ok  tags kind check rejects an unknown axis';
end;
begin
  insert into tags (user_id, kind, label, slug, is_seed) values (u1, 'wear_for', 'Duplicate', 'lisbon', false);
  raise exception 'FAIL slug uniqueness did not fire';
exception when unique_violation then raise notice 'ok  slug is unique per user+kind';
end;

raise notice '--- ALL ASSERTIONS PASSED ---';
end $$;
