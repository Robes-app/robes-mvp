-- migrate:up
-- Where she is on a day (Front Door design 3k: the prompt's place chip, "For Tuesday 3 only"). One
-- place per calendar day; no row means home. The coordinates are the place's (a city centre from
-- the geocoder), never her device's. Clearing the place deletes the row: not a record to undo.
create table app.day_places (
  user_id uuid not null references app.users (id) on delete cascade,
  day_date date not null,
  city text not null check (char_length(city) between 1 and 120),
  country text check (country is null or char_length(country) <= 120),
  lat numeric(5, 2) not null check (lat between -90 and 90),
  lon numeric(5, 2) not null check (lon between -180 and 180),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, day_date)
);
select private.track_updates('app.day_places');

-- migrate:down
-- Forward-only: fix mistakes with a new migration.
