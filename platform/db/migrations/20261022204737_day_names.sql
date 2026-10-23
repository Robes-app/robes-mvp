-- migrate:up
-- Her name for a day, with or without looks on it (legacy `day` rows, beta 2026-09-08: "it can be
-- used to plan a week before adding outfits"). Looks pinned to a named day carry the name too, so
-- planned_days.activity stays what every existing reader sees. Clearing the name deletes the row:
-- a name is not a record she can undo, so there is no deleted_at to purge later.
create table app.day_names (
  user_id uuid not null references app.users (id) on delete cascade,
  day_date date not null,
  name text not null check (char_length(name) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, day_date)
);
select private.track_updates('app.day_names');

-- migrate:down
-- Forward-only: fix mistakes with a new migration.
