begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users (id, email, raw_user_meta_data, aud, role)
values
  ('11111111-1111-4111-8111-111111111111', 'a@test.dev', '{"first_name":"  Ann  "}', 'authenticated', 'authenticated'),
  ('22222222-2222-4222-8222-222222222222', 'b@test.dev', '{}', 'authenticated', 'authenticated');

select is((select first_name from app.profiles where id = '11111111-1111-4111-8111-111111111111'),
  'Ann', 'signup creates a trimmed profile');
select is((select count(*)::int from app.user_ui_state), 2, 'signup creates ui state');
select is((select first_name from app.profiles where id = '22222222-2222-4222-8222-222222222222'),
  null, 'missing first name stays null');

select throws_ok($$ update app.profiles set instagram_handle = 'bad handle!'
  where id = '11111111-1111-4111-8111-111111111111' $$, '23514', null, 'instagram handle is validated');

delete from auth.users where id = '22222222-2222-4222-8222-222222222222';
select is((select count(*)::int from app.profiles where id = '22222222-2222-4222-8222-222222222222'),
  0, 'deleting the auth user cascades');

select * from finish();
rollback;
