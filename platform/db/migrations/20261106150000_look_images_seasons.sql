-- migrate:up

-- Felix rebuild D13 (plan 2026-11-06): a look holds any number of her photographs, not one. Each
-- row is one photograph; `position` orders them and the one at 0 leads. Robes' picture (the frame,
-- else the render) is not a row here: it lives on the look, can only be redrawn, and `record_image`
-- still says whether a photograph or Robes' picture is in front. `photo_asset_id` keeps being
-- written as the position-0 photograph, so the code deployed before this and the phone builds that
-- read one photograph keep reading it.
create table app.look_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users (id) on delete cascade,
  look_id uuid not null,
  asset_id uuid not null,
  position smallint not null default 0 check (position between 0 and 19),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (look_id, asset_id),
  foreign key (look_id, user_id) references app.looks (id, user_id) on delete cascade,
  foreign key (asset_id, user_id) references app.assets (id, user_id)
);
select private.track_updates('app.look_images');
create index look_images_look_idx on app.look_images (look_id, position);

-- Every photograph already on file leads its look's stack. Soft-deleted looks come too: a restore
-- brings the look back whole, and a purge cascades the row away.
insert into app.look_images (user_id, look_id, asset_id, position)
select l.user_id, l.id, l.photo_asset_id, 0
from app.looks l
join app.assets a on a.id = l.photo_asset_id and a.user_id = l.user_id
where l.photo_asset_id is not null;

-- Felix rebuild D12: seasons are the four seasons, any of them, and Year Round is none. The band
-- (`climate_band` on a look, `season_band` on a piece; ADR-002) becomes a value derived from them,
-- kept in step both ways by a trigger so every writer agrees: older code and phone builds write the
-- band and read it unchanged; new code writes `seasons`. Spring or summer alone reads as the
-- spring/summer band, autumn or winter alone as autumn/winter; a mix, or none, is year round.
create function private.season_band_of(p_seasons text[])
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_seasons && array['spring', 'summer']::text[]
      and not (p_seasons && array['autumn', 'winter']::text[]) then 'spring_summer'
    when p_seasons && array['autumn', 'winter']::text[]
      and not (p_seasons && array['spring', 'summer']::text[]) then 'autumn_winter'
    else 'year_round'
  end;
$$;
revoke execute on function private.season_band_of(text[]) from public;

create function private.seasons_of_band(p_band text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case p_band
    when 'spring_summer' then array['spring', 'summer']::text[]
    when 'autumn_winter' then array['autumn', 'winter']::text[]
    else '{}'::text[]
  end;
$$;
revoke execute on function private.seasons_of_band(text) from public;

-- One spelling: each season once, in the order of the year.
create function private.normalise_seasons(p_seasons text[])
returns text[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    (select array_agg(s order by array_position(array['spring', 'summer', 'autumn', 'winter'], s))
     from (select distinct unnest(p_seasons) as s) u),
    '{}'::text[]);
$$;
revoke execute on function private.normalise_seasons(text[]) from public;

alter table app.looks
  add column seasons text[] not null default '{}'
    constraint looks_seasons_check
    check (seasons <@ array['spring', 'summer', 'autumn', 'winter']::text[]);
alter table app.wardrobe_items
  add column seasons text[] not null default '{}'
    constraint wardrobe_items_seasons_check
    check (seasons <@ array['spring', 'summer', 'autumn', 'winter']::text[]);

-- The seasons she picked set the band; a band written by older code (or by the taxonomy's
-- defaults) sets the seasons. On an insert, whichever side was given wins.
create function private.sync_look_seasons()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.seasons := private.normalise_seasons(new.seasons);
  if tg_op = 'INSERT' then
    if new.seasons <> '{}'::text[] then
      new.climate_band := private.season_band_of(new.seasons);
    else
      new.seasons := private.seasons_of_band(new.climate_band);
    end if;
  elsif new.seasons is distinct from old.seasons then
    new.climate_band := private.season_band_of(new.seasons);
  elsif new.climate_band is distinct from old.climate_band then
    new.seasons := private.seasons_of_band(new.climate_band);
  end if;
  return new;
end;
$$;
revoke execute on function private.sync_look_seasons() from public;
create trigger sync_seasons before insert or update on app.looks
  for each row execute function private.sync_look_seasons();

create function private.sync_piece_seasons()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.seasons := private.normalise_seasons(new.seasons);
  if tg_op = 'INSERT' then
    if new.seasons <> '{}'::text[] then
      new.season_band := private.season_band_of(new.seasons);
    else
      new.seasons := private.seasons_of_band(new.season_band);
    end if;
  elsif new.seasons is distinct from old.seasons then
    new.season_band := private.season_band_of(new.seasons);
  elsif new.season_band is distinct from old.season_band then
    new.seasons := private.seasons_of_band(new.season_band);
  end if;
  return new;
end;
$$;
revoke execute on function private.sync_piece_seasons() from public;
create trigger sync_seasons before insert or update on app.wardrobe_items
  for each row execute function private.sync_piece_seasons();

-- Backfill from the band without touching updated_at: nothing about the look or the piece changed,
-- only how its season is spelled.
alter table app.looks disable trigger touch_updated_at;
update app.looks set seasons = private.seasons_of_band(climate_band) where climate_band <> 'year_round';
alter table app.looks enable trigger touch_updated_at;
alter table app.wardrobe_items disable trigger touch_updated_at;
update app.wardrobe_items set seasons = private.seasons_of_band(season_band) where season_band <> 'year_round';
alter table app.wardrobe_items enable trigger touch_updated_at;

-- migrate:down
-- Forward-only: fix mistakes with a new migration.
