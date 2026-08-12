-- ADR-002 harness fixture — the slice of Robes_p0 that migration 17 touches.
-- Loaded by scripts/season_tags_migration_test.sh. Throwaway databases only.
-- Pre-migration-17 fixture: the slice of Robes_p0 that migration 17 touches.
create schema if not exists auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select '00000000-0000-0000-0000-000000000001'::uuid $$;

create table public.profiles (id uuid primary key references auth.users(id), is_admin boolean not null default false);
create function public.is_admin() returns boolean language sql stable security definer as
  $$ select coalesce((select is_admin from public.profiles where id = auth.uid()), false) $$;

create table public.wardrobe_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text, category text default 'Other',
  seasons text[], occasions text[]
);
create table public.looks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, tags text[]
);

insert into auth.users (id) values
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002');
insert into public.profiles (id) values
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002');

-- season backfill coverage
insert into public.wardrobe_items (id, user_id, label, seasons, occasions) values
 ('11111111-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','spring only',      array['Spring'],            null),
 ('11111111-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','spring+summer',    array['Spring','Summer'],   null),
 ('11111111-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','autumn+winter',    array['Autumn','Winter'],   null),
 ('11111111-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','cross band',       array['Spring','Winter'],   null),
 ('11111111-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001','legacy year-round',array['Year-round'],        null),
 ('11111111-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000001','untagged',         null,                       null),
 ('11111111-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000001','empty array',      array[]::text[],            null),
-- occasions backfill coverage
 ('11111111-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000001','two seeds',        null, array['Work','Evening']),
 ('11111111-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000001','custom chip',      null, array['School run']),
 ('11111111-0000-0000-0000-00000000000a','00000000-0000-0000-0000-000000000001','legacy everyday',  null, array['Everyday']),
 ('11111111-0000-0000-0000-00000000000b','00000000-0000-0000-0000-000000000001','seed + custom',    null, array['Travel','Lisbon']),
 ('11111111-0000-0000-0000-00000000000c','00000000-0000-0000-0000-000000000001','blank chip',       null, array['Work','  ']),
-- a second user, to prove the namespace is per-user
 ('11111111-0000-0000-0000-00000000000d','00000000-0000-0000-0000-000000000002','other user',       array['Summer'], array['Lisbon']);

insert into public.looks (id, user_id, name, tags) values
 ('22222222-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','all four axes',
    array['High Summer','Daylight','Elevated Everyday','Sharp Tailoring']),
 ('22222222-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','fan-out',
    array['Deep Winter','Work-to-Dinner']),
 ('22222222-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','customs',
    array['Transitional Cool','vibe:Undone','Lisbon']),
 ('22222222-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','untagged look', null),
 ('22222222-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001','gala',
    array['Formal / Gala','Transitional Warm']),
 ('22222222-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000001','light only',
    array['Twilight & Evening']),
 ('22222222-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000002','other user look',
    array['Deep Winter','Lisbon']);
