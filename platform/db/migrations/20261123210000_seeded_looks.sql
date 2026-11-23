-- migrate:up
-- Seeded looks (plan "Seeded Christmas looks", 23 Nov): a drop of looks Robes' stylist made, written
-- into every account as suggestions while the drop is live, and taken away unsaved once it ends.
-- Additive only: older code and phone builds never write 'seed' and read `source` as free text.
alter table app.looks drop constraint looks_source_check;
alter table app.looks
  add constraint looks_source_check
  check (source in ('wear', 'manual', 'variant', 'generated', 'today', 'travel', 'capture', 'seed'));

-- The drop a seeded look came from ('xmas-2026'), and the look's id inside it ('xmas-01'): what
-- retires her unsaved looks when the drop ends.
alter table app.looks
  add column seed_id text check (seed_id ~ '^[a-z0-9][a-z0-9-]{0,39}$'),
  add column seed_look_id text check (seed_look_id ~ '^[a-z0-9][a-z0-9-]{0,39}$'),
  add constraint looks_seed_pair check ((seed_id is null) = (seed_look_id is null));
create index looks_user_seed_idx on app.looks (user_id, seed_id) where seed_id is not null;

-- The drops an account has had. A drop lands once: deleting every look it brought never brings
-- them back.
create table app.user_seeds (
  user_id uuid not null references app.users (id) on delete cascade,
  seed_id text not null check (seed_id ~ '^[a-z0-9][a-z0-9-]{0,39}$'),
  seeded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, seed_id)
);
select private.track_updates('app.user_seeds');

-- A seeded look's picture is shared catalog media (catalog/seeds/…): its asset row is hers, the
-- files are not. `catalog_base` names where the files live; everything else keys by her id.
alter table app.assets
  add column catalog_base text check (catalog_base ~ '^catalog/seeds/[a-z0-9-]{1,40}/[a-z0-9-]{1,60}$');

-- migrate:down
-- Forward-only: fix mistakes with a new migration.
