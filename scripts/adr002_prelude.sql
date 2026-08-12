-- Supabase-provided pieces a bare Postgres has to stand in for, so the real
-- migration files can be replayed in order against a throwaway database.
-- Used by scripts/tag_prefill_test.sh. Throwaway databases only.
create schema if not exists auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable
  as $f$ select '00000000-0000-0000-0000-000000000001'::uuid $f$;
do $d$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
end $d$;
create table public.profiles (
  id uuid primary key references auth.users(id),
  is_admin boolean not null default false
);
create function public.is_admin() returns boolean language sql stable security definer
  as $f$ select coalesce((select is_admin from public.profiles where id = auth.uid()), false) $f$;
insert into auth.users (id) values
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002');
insert into public.profiles (id) values
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002');
