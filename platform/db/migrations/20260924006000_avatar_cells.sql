-- migrate:up
-- Shared catalog of model reference portraits ("cells"), one per cell id + art-direction version.
-- A cell is derived only from catalog picks (presence, skin, hair, figure), never from anyone's
-- photo, so it holds no personal data and is shared by everyone with the same picks (SEC-22).
create table app.avatar_cells (
  id text primary key check (id ~ '^[wm]-s[0-7]-h[0-4]-(hg|pe|re|it|ap|nt)(-(ll|lr|fl|fr))*@v[0-9]+$'),
  status text not null default 'pending' check (status in ('pending', 'ready', 'failed')),
  bucket_key text check (char_length(bucket_key) <= 512),
  content_type text check (content_type in ('image/jpeg', 'image/png', 'image/webp')),
  job_id uuid,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
select private.track_updates('app.avatar_cells');

-- A look rendered on her model: claimed while rendering so a repeat ask never spends twice.
alter table app.looks
  add column render_status text check (render_status in ('pending', 'ready', 'failed')),
  add column render_job_id uuid,
  add column render_claimed_at timestamptz;

-- migrate:down
-- Forward-only: fix mistakes with a new migration.
