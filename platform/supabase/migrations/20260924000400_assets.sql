create table app.assets (
  id uuid primary key default gen_random_uuid(),
  -- null user_id marks a shared catalog asset.
  user_id uuid references auth.users (id) on delete cascade,
  provider text not null default 's3' check (provider in ('s3', 'cloudinary_legacy')),
  bucket_key text check (char_length(bucket_key) <= 512),
  legacy_url text,
  kind text not null check (kind in ('wardrobe', 'wishlist', 'headshot', 'full_length', 'look_photo',
    'generated', 'render', 'receipt', 'avatar_cell', 'share')),
  sensitive boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'ready', 'failed', 'deleted')),
  content_type text check (content_type in ('image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif')),
  bytes integer check (bytes between 0 and 26214400),
  width integer check (width > 0),
  height integer check (height > 0),
  blurhash text check (char_length(blurhash) <= 100),
  renditions jsonb not null default '{}' check (jsonb_typeof(renditions) = 'object'),
  has_cutout boolean not null default false,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, user_id)
);
select private.track_updates('app.assets');
create index assets_user_updated_idx on app.assets (user_id, updated_at);
create index assets_pending_idx on app.assets (status, created_at) where status = 'pending';

create table app.account_deletion_requests (
  user_id uuid primary key references auth.users (id) on delete cascade,
  requested_at timestamptz not null default now(),
  status text not null default 'requested' check (status in ('requested', 'running', 'completed', 'failed')),
  completed_at timestamptz,
  detail jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
select private.track_updates('app.account_deletion_requests');

create table app.data_export_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  requested_at timestamptz not null default now(),
  status text not null default 'requested' check (status in ('requested', 'running', 'ready', 'expired', 'failed')),
  asset_key text,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);
select private.track_updates('app.data_export_requests');
create index data_export_requests_user_idx on app.data_export_requests (user_id, requested_at desc);
