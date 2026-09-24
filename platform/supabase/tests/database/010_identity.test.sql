begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

insert into auth.users (id, email, raw_user_meta_data, aud, role)
values
  ('11111111-1111-4111-8111-111111111111', 'a@test.dev', '{"first_name":"Ann"}', 'authenticated', 'authenticated'),
  ('22222222-2222-4222-8222-222222222222', 'b@test.dev', '{}', 'authenticated', 'authenticated');

select is((select first_name from public.profiles where id = '11111111-1111-4111-8111-111111111111'),
  'Ann', 'signup trigger creates the profile');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);

select is((select count(*)::int from public.profiles), 1, 'a user sees only their own profile');
select lives_ok($$ update public.profiles set first_name = 'Annie'
  where id = '11111111-1111-4111-8111-111111111111' $$, 'a user can edit an editable column');
select throws_ok($$ update public.profiles set onboarded_at = now()
  where id = '11111111-1111-4111-8111-111111111111' $$, '42501', null,
  'a user cannot write a server-owned column (SEC-10)');
select throws_ok($$ update public.profiles set id = '22222222-2222-4222-8222-222222222222'
  where id = '11111111-1111-4111-8111-111111111111' $$, '42501', null, 'a user cannot change their id');
update public.profiles set first_name = 'Hacked' where id = '22222222-2222-4222-8222-222222222222';
select throws_ok($$ select * from private.admin_users $$, '42501', null, 'admin table is unreadable (SEC-11)');
select throws_ok($$ insert into private.admin_users (user_id, role)
  values ('11111111-1111-4111-8111-111111111111', 'admin') $$, '42501', null,
  'a user cannot make themselves admin (closes legacy C1)');
select is(private.is_admin(), false, 'a normal user is not admin');

reset role;
select is((select first_name from public.profiles where id = '22222222-2222-4222-8222-222222222222'),
  null, 'cross-user update changed nothing');

set local role anon;
select throws_ok($$ select * from public.profiles $$, '42501', null, 'anon cannot read profiles');
reset role;

insert into private.admin_users (user_id, role) values ('22222222-2222-4222-8222-222222222222', 'admin');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
select is(private.is_admin(), true, 'admin_users grants admin');
reset role;

insert into private.admin_users (user_id, role) values ('11111111-1111-4111-8111-111111111111', 'analyst');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
select is(private.is_admin(), false, 'support/analyst staff are not admins');
reset role;

create function private.m0_probe() returns int language sql as $$ select 1 $$;
set local role authenticated;
select throws_ok($$ select private.m0_probe() $$, '42501', null,
  'new private functions are not executable by users by default');

select * from finish();
rollback;
