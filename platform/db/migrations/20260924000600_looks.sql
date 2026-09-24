-- migrate:up
create table app.looks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  name_provisional boolean not null default true,
  note text check (char_length(note) <= 2000),
  photo_asset_id uuid,
  source text not null default 'manual'
    check (source in ('wear', 'manual', 'variant', 'generated', 'today', 'travel')),
  origin_look_id uuid,
  climate_band text not null default 'year_round'
    check (climate_band in ('spring_summer', 'autumn_winter', 'year_round')),
  climate_source text not null default 'derived' check (climate_source in ('derived', 'user')),
  proposals jsonb check (proposals is null or jsonb_typeof(proposals) = 'array'),
  render_asset_id uuid,
  render_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, user_id),
  foreign key (photo_asset_id, user_id) references app.assets (id, user_id),
  foreign key (render_asset_id, user_id) references app.assets (id, user_id),
  foreign key (origin_look_id, user_id) references app.looks (id, user_id) on delete set null (origin_look_id)
);
select private.track_updates('app.looks');
create index looks_user_updated_idx on app.looks (user_id, updated_at);
create index looks_user_created_idx on app.looks (user_id, created_at desc);
create index looks_origin_idx on app.looks (origin_look_id) where origin_look_id is not null;

create table app.look_pieces (
  look_id uuid not null,
  user_id uuid not null references app.users (id) on delete cascade,
  wardrobe_item_id uuid not null,
  slot text check (char_length(slot) <= 40),
  position smallint not null default 0 check (position between 0 and 50),
  -- Dressing-formula cast; null lets Robes decide at render.
  role text check (role in ('canvas', 'anchor', 'texture', 'exclamation')),
  primary key (look_id, wardrobe_item_id),
  foreign key (look_id, user_id) references app.looks (id, user_id) on delete cascade,
  foreign key (wardrobe_item_id, user_id) references app.wardrobe_items (id, user_id) on delete cascade
);
create index look_pieces_item_idx on app.look_pieces (wardrobe_item_id);

create table app.tag_looks (
  user_id uuid not null references app.users (id) on delete cascade,
  tag_id uuid not null,
  look_id uuid not null,
  source text not null default 'user' check (source in ('inferred', 'user')),
  created_at timestamptz not null default now(),
  primary key (tag_id, look_id),
  foreign key (tag_id, user_id) references app.tags (id, user_id) on delete cascade,
  foreign key (look_id, user_id) references app.looks (id, user_id) on delete cascade
);
create index tag_looks_look_idx on app.tag_looks (look_id);

create table app.wears (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users (id) on delete cascade,
  look_id uuid not null,
  worn_on date not null,
  piece_ids uuid[] not null default '{}' check (cardinality(piece_ids) <= 50),
  note text check (char_length(note) <= 1000),
  source text not null default 'looks' check (source in ('looks', 'today', 'plan', 'travel', 'retro')),
  source_ref text check (char_length(source_ref) <= 120),
  confirmed_at timestamptz not null default now(),
  unique (user_id, look_id, worn_on),
  foreign key (look_id, user_id) references app.looks (id, user_id) on delete cascade
);
create index wears_user_idx on app.wears (user_id, worn_on desc);
create index wears_pieces_idx on app.wears using gin (piece_ids);

-- Wears are a record of what happened: insert or delete, never edit.
create function private.forbid_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% rows are immutable', tg_table_name using errcode = '55000';
end;
$$;
revoke execute on function private.forbid_update() from public;
create trigger wears_immutable before update on app.wears
  for each row execute function private.forbid_update();

create view app.wardrobe_item_stats as
  select
    w.id as wardrobe_item_id,
    w.user_id,
    count(we.id)::int as times_worn,
    max(we.worn_on) as last_worn_on,
    case when count(we.id) > 0 and w.price is not null
      then round(w.price / count(we.id), 2) end as cost_per_wear
  from app.wardrobe_items w
  left join app.wears we on we.user_id = w.user_id and w.id = any (we.piece_ids)
  where w.deleted_at is null
  group by w.id, w.user_id, w.price;

-- migrate:down
-- Forward-only: fix mistakes with a new migration.
