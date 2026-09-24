begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, email, aud, role) values
  ('11111111-1111-4111-8111-111111111111', 'a@test.dev', 'authenticated', 'authenticated'),
  ('22222222-2222-4222-8222-222222222222', 'b@test.dev', 'authenticated', 'authenticated');

set local role robes_app;

insert into app.wardrobe_items (id, user_id, label, price) values
  ('bbbbbbbb-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Coat', 300),
  ('bbbbbbbb-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222', 'Her coat', 10);
insert into app.looks (id, user_id, name) values
  ('cccccccc-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Monday');

select lives_ok($$ insert into app.look_pieces (look_id, user_id, wardrobe_item_id)
  values ('cccccccc-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111',
    'bbbbbbbb-0000-4000-8000-000000000001') $$, 'a look holds its owner''s pieces');
select throws_ok($$ insert into app.look_pieces (look_id, user_id, wardrobe_item_id)
  values ('cccccccc-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111',
    'bbbbbbbb-0000-4000-8000-000000000002') $$, '23503', null, 'a look cannot hold another user''s piece');

insert into app.wears (id, user_id, look_id, worn_on, piece_ids) values
  ('dddddddd-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111',
   'cccccccc-0000-4000-8000-000000000001', '2026-09-20', array['bbbbbbbb-0000-4000-8000-000000000001']::uuid[]),
  ('dddddddd-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111',
   'cccccccc-0000-4000-8000-000000000001', '2026-09-21', array['bbbbbbbb-0000-4000-8000-000000000001']::uuid[]);
select throws_ok($$ update app.wears set note = 'edited' where id = 'dddddddd-0000-4000-8000-000000000001' $$,
  '55000', null, 'wears are immutable');
select throws_ok($$ insert into app.wears (user_id, look_id, worn_on)
  values ('11111111-1111-4111-8111-111111111111', 'cccccccc-0000-4000-8000-000000000001', '2026-09-20') $$,
  '23505', null, 'one wear per look per day');

select results_eq(
  $$ select times_worn, cost_per_wear from app.wardrobe_item_stats
     where wardrobe_item_id = 'bbbbbbbb-0000-4000-8000-000000000001' $$,
  $$ values (2, 150.00::numeric) $$, 'stats derive times worn and cost per wear');

select throws_ok($$ insert into app.planned_days (user_id, day_date, source_kind, artifact_id)
  values ('11111111-1111-4111-8111-111111111111', '2026-09-22', 'look', null) $$,
  '23514', null, 'a planned day references exactly one source');
select lives_ok($$ insert into app.planned_days (user_id, day_date, source_kind, look_id)
  values ('11111111-1111-4111-8111-111111111111', '2026-09-22', 'look', 'cccccccc-0000-4000-8000-000000000001') $$,
  'a planned day can point at a look');

reset role;
update app.looks set deleted_at = now() - interval '31 days' where id = 'cccccccc-0000-4000-8000-000000000001';
select private.purge_soft_deleted();
select is((select count(*)::int from app.looks where id = 'cccccccc-0000-4000-8000-000000000001'), 0,
  'retention hard-deletes tombstones after 30 days');

select policies_are('realtime', 'messages', array['receive_own_user_channel'],
  'realtime only lets users receive their own channel');

select * from finish();
rollback;
