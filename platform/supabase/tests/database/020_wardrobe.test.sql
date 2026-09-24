begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email, aud, role) values
  ('11111111-1111-4111-8111-111111111111', 'a@test.dev', 'authenticated', 'authenticated'),
  ('22222222-2222-4222-8222-222222222222', 'b@test.dev', 'authenticated', 'authenticated');
insert into app.assets (id, user_id, kind) values
  ('aaaaaaaa-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222', 'wardrobe');

set local role robes_app;

insert into app.wardrobe_items (id, user_id, label, category, category_l2, category_l3)
values ('bbbbbbbb-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111',
  'Navy blazer', 'Outerwear', 'Blazers', 'Single-breasted blazer');

select is((select season_band from app.wardrobe_items where id = 'bbbbbbbb-0000-4000-8000-000000000001'),
  'year_round', 'tag defaults set the band from the L2 override');
select results_eq(
  $$ select t.slug from app.tag_pieces tp join app.tags t on t.id = tp.tag_id
     where tp.wardrobe_item_id = 'bbbbbbbb-0000-4000-8000-000000000001' order by t.slug $$,
  array['everyday', 'work'], 'tag defaults attach wear-for tags');

insert into app.wardrobe_items (id, user_id, label, category, category_l2, season_band, season_source)
values ('bbbbbbbb-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111',
  'Wool coat', 'Outerwear', 'Coats', 'spring_summer', 'user');
select is((select season_band from app.wardrobe_items where id = 'bbbbbbbb-0000-4000-8000-000000000002'),
  'spring_summer', 'a season she chose is never overwritten');

select throws_ok($$ insert into app.wardrobe_items (user_id, label, image_asset_id)
  values ('11111111-1111-4111-8111-111111111111', 'x', 'aaaaaaaa-0000-4000-8000-000000000002') $$,
  '23503', null, 'composite FK: cannot attach another user''s asset');

select throws_ok($$ insert into app.wardrobe_items (user_id, label, category_l2, category_l3)
  values ('11111111-1111-4111-8111-111111111111', 'x', 'Jeans', 'Hovercraft') $$,
  '23503', null, 'taxonomy FK rejects unknown nodes');

update app.wardrobe_items set hero_position = 1 where id = 'bbbbbbbb-0000-4000-8000-000000000001';
select throws_ok($$ update app.wardrobe_items set hero_position = 1
  where id = 'bbbbbbbb-0000-4000-8000-000000000002' $$, '23505', null, 'hero positions are unique per user');

insert into app.tags (user_id, kind, label) values ('11111111-1111-4111-8111-111111111111', 'vibe', 'Café  Noir!');
select is((select slug from app.tags where label = 'Café  Noir!'), 'cafe-noir', 'tag slugs fold accents and punctuation');

select throws_ok($$ insert into app.tag_pieces (user_id, tag_id, wardrobe_item_id)
  select '22222222-2222-4222-8222-222222222222', t.id, 'bbbbbbbb-0000-4000-8000-000000000001'
  from app.tags t where t.slug = 'cafe-noir' $$, '23503', null, 'composite FK: cannot tag across users');

select * from finish();
rollback;
