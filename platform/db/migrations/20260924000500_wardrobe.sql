-- migrate:up
create function private.tag_slug(p_label text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(
    pg_catalog.btrim(
      pg_catalog.regexp_replace(
        pg_catalog.regexp_replace(
          pg_catalog.translate(
            pg_catalog.replace(pg_catalog.replace(pg_catalog.replace(
              pg_catalog.lower(coalesce(p_label, '')), 'æ', 'ae'), 'œ', 'oe'), 'ß', 'ss'),
            'áàâäãåāăąéèêëēĕėęěíìîïĩīĭįóòôöõøōŏőúùûüũūŭůűųñńňçćčýÿŷšśşžźżđłŕřťďğ',
            'aaaaaaaaaeeeeeeeeeiiiiiiiiooooooooouuuuuuuuuunnncccyyysssszzzdlrrtdg'),
          '[^a-z0-9]+', '-', 'g'),
        '-{2,}', '-', 'g'),
      '-'),
    '');
$$;
revoke execute on function private.tag_slug(text) from public;
-- Evaluated by the inserting role for tags.slug.
grant execute on function private.tag_slug(text) to robes_app;

create table app.wardrobe_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 120),
  category text not null default 'Other'
    check (category in ('Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Bags', 'Accessories', 'Swimwear', 'Other')),
  category_l2 text,
  category_l3 text,
  color text check (char_length(color) <= 60),
  brand text check (char_length(brand) <= 80),
  notes text check (char_length(notes) <= 1000),
  image_asset_id uuid,
  cutout_asset_id uuid,
  item_dna jsonb not null default '{}' check (jsonb_typeof(item_dna) = 'object'),
  status text not null default 'ready' check (status in ('reading', 'ready', 'failed')),
  hero_position smallint check (hero_position between 1 and 10),
  season_band text not null default 'year_round'
    check (season_band in ('spring_summer', 'autumn_winter', 'year_round')),
  season_source text not null default 'inferred' check (season_source in ('inferred', 'user')),
  fit_confidence text check (char_length(fit_confidence) <= 40),
  sentiment text check (char_length(sentiment) <= 40),
  price numeric(10, 2) check (price >= 0),
  currency char(3) check (currency ~ '^[A-Z]{3}$'),
  size text check (char_length(size) <= 40),
  acquired_via text not null default 'photo'
    check (acquired_via in ('photo', 'receipt', 'url', 'wishlist', 'onboarding', 'travel')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, user_id),
  foreign key (category_l2, category_l3) references app.wardrobe_taxonomy (l2, l3),
  foreign key (image_asset_id, user_id) references app.assets (id, user_id),
  foreign key (cutout_asset_id, user_id) references app.assets (id, user_id)
);
select private.track_updates('app.wardrobe_items');
create unique index wardrobe_items_hero_unique on app.wardrobe_items (user_id, hero_position)
  where hero_position is not null and deleted_at is null;
create index wardrobe_items_user_updated_idx on app.wardrobe_items (user_id, updated_at);
create index wardrobe_items_user_created_idx on app.wardrobe_items (user_id, created_at desc);

create table app.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 120),
  category text not null default 'Other'
    check (category in ('Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Bags', 'Accessories', 'Swimwear', 'Other')),
  category_l2 text,
  category_l3 text,
  color text check (char_length(color) <= 60),
  brand text check (char_length(brand) <= 80),
  note text check (char_length(note) <= 1000),
  image_asset_id uuid,
  item_dna jsonb not null default '{}' check (jsonb_typeof(item_dna) = 'object'),
  price numeric(10, 2) check (price >= 0),
  currency char(3) check (currency ~ '^[A-Z]{3}$'),
  size text check (char_length(size) <= 40),
  source_type text not null default 'photo'
    check (source_type in ('photo', 'screenshot', 'instagram', 'substack', 'url', 'robes', 'receipt')),
  source_label text check (char_length(source_label) <= 120),
  source_url text check (char_length(source_url) <= 2048),
  promoted_item_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, user_id),
  foreign key (category_l2, category_l3) references app.wardrobe_taxonomy (l2, l3),
  foreign key (image_asset_id, user_id) references app.assets (id, user_id),
  foreign key (promoted_item_id, user_id) references app.wardrobe_items (id, user_id)
);
select private.track_updates('app.wishlist_items');
create index wishlist_items_user_updated_idx on app.wishlist_items (user_id, updated_at);

create table app.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users (id) on delete cascade,
  kind text not null check (kind in ('wear_for', 'vibe')),
  label text not null check (char_length(label) between 1 and 40),
  slug text generated always as (private.tag_slug(label)) stored not null,
  is_seed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, user_id),
  unique (user_id, kind, slug)
);
select private.track_updates('app.tags');
create index tags_user_updated_idx on app.tags (user_id, updated_at);

create table app.tag_pieces (
  user_id uuid not null references app.users (id) on delete cascade,
  tag_id uuid not null,
  wardrobe_item_id uuid not null,
  source text not null default 'user' check (source in ('inferred', 'user')),
  created_at timestamptz not null default now(),
  primary key (tag_id, wardrobe_item_id),
  foreign key (tag_id, user_id) references app.tags (id, user_id) on delete cascade,
  foreign key (wardrobe_item_id, user_id) references app.wardrobe_items (id, user_id) on delete cascade
);
create index tag_pieces_item_idx on app.tag_pieces (wardrobe_item_id);

-- Resolves a piece's defaults: sheet category from L2 when known, else the legacy category.
create function private.piece_tag_defaults(p_category text, p_l2 text)
returns table (season_band text, wear_slugs text[])
language sql
stable
set search_path = ''
as $$
  with node as (
    select t.sheet_l1, t.l2 from app.wardrobe_taxonomy t where t.l2 = p_l2 limit 1
  )
  select d.season_band, d.wear_slugs
  from app.wardrobe_tag_defaults d
  where d.sheet_l1 = coalesce((select sheet_l1 from node), p_category)
    and coalesce(d.l2, '') in (coalesce((select l2 from node), ''), '')
  order by d.l2 nulls last
  limit 1;
$$;
revoke execute on function private.piece_tag_defaults(text, text) from public;

-- user_id comes from the piece row, never auth.uid(), so it cannot cross accounts.
create function private.apply_tag_defaults()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  def record;
  v_slug text;
  v_tag uuid;
begin
  select * into def from private.piece_tag_defaults(new.category, new.category_l2);
  if not found then return null; end if;

  if new.season_source <> 'user' then
    update app.wardrobe_items set season_band = def.season_band where id = new.id;
  end if;

  foreach v_slug in array def.wear_slugs loop
    insert into app.tags (user_id, kind, label, is_seed)
    values (new.user_id, 'wear_for',
      coalesce((select l.label from app.wear_seed_labels l where l.slug = v_slug), initcap(v_slug)),
      true)
    on conflict (user_id, kind, slug) do nothing;
    select t.id into v_tag from app.tags t
    where t.user_id = new.user_id and t.kind = 'wear_for' and t.slug = v_slug;
    insert into app.tag_pieces (user_id, tag_id, wardrobe_item_id, source)
    values (new.user_id, v_tag, new.id, 'inferred')
    on conflict do nothing;
  end loop;
  return null;
end;
$$;
revoke execute on function private.apply_tag_defaults() from public;
create trigger apply_tag_defaults after insert on app.wardrobe_items
  for each row execute function private.apply_tag_defaults();

create table app.inbox_addresses (
  address text primary key check (address ~ '^[a-z0-9]{16,40}$'),
  user_id uuid not null unique references app.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table app.wardrobe_inbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users (id) on delete cascade,
  source text not null default 'receipt' check (source in ('receipt', 'photo', 'link', 'share')),
  retailer text,
  order_ref text,
  subject text,
  from_email text,
  provider_id text unique,
  items jsonb not null default '[]' check (jsonb_typeof(items) = 'array'),
  status text not null default 'held' check (status in ('held', 'filed', 'dismissed')),
  filed_ids uuid[] not null default '{}',
  filed_to text check (filed_to in ('wardrobe', 'wishlist')),
  received_at timestamptz not null default now(),
  decided_at timestamptz,
  updated_at timestamptz not null default now()
);
select private.track_updates('app.wardrobe_inbox');
create index wardrobe_inbox_user_idx on app.wardrobe_inbox (user_id, status, received_at desc);

-- migrate:down
-- Forward-only: fix mistakes with a new migration.
