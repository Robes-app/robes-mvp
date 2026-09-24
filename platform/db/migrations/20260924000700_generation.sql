-- migrate:up
create table app.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users (id) on delete cascade,
  kind text not null check (kind in ('fake', 'key_piece', 'daily', 'travel', 'travel_looks', 'look_render',
    'avatar_cell', 'wardrobe_analyse', 'stylenotes_analyse', 'receipt_read', 'alternates', 'lookbuild_note',
    'link_import', 'cutout')),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'succeeded', 'partial', 'failed', 'cancelled')),
  stage text not null default 'queued' check (stage in ('queued', 'text', 'images', 'done')),
  priority smallint not null default 0,
  idempotency_key text check (char_length(idempotency_key) <= 100),
  input jsonb not null default '{}' check (jsonb_typeof(input) = 'object'),
  output jsonb not null default '{}' check (jsonb_typeof(output) = 'object'),
  error text check (char_length(error) <= 200),
  attempts int not null default 0,
  lease_until timestamptz,
  trace_id text,
  cost_micros bigint not null default 0,
  model_map jsonb not null default '{}',
  artifact_id uuid,
  cancel_requested_at timestamptz,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, idempotency_key)
);
select private.track_updates('app.generation_jobs');
create index generation_jobs_user_idx on app.generation_jobs (user_id, created_at desc);
create index generation_jobs_outbox_idx on app.generation_jobs (status, created_at)
  where status in ('queued', 'running');

create table app.generation_assets (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null,
  user_id uuid not null references app.users (id) on delete cascade,
  idx int not null check (idx between 0 and 50),
  role text not null check (role in ('hero', 'still', 'grid', 'render', 'cutout')),
  asset_id uuid,
  status text not null default 'pending' check (status in ('pending', 'ready', 'failed', 'deferred')),
  on_demand boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, idx),
  foreign key (job_id, user_id) references app.generation_jobs (id, user_id) on delete cascade,
  foreign key (asset_id, user_id) references app.assets (id, user_id)
);
select private.track_updates('app.generation_assets');

-- Model call ledger; prompts/responses are purged after 30 days (SEC-82).
create table app.generation_calls (
  id uuid not null default gen_random_uuid(),
  job_id uuid,
  user_id uuid references app.users (id) on delete set null,
  feature text not null,
  model text not null,
  tokens_in int,
  tokens_out int,
  images int not null default 0,
  latency_ms int,
  status text not null check (status in ('ok', 'partial', 'timeout', 'error', 'cancelled')),
  cost_micros bigint not null default 0,
  prompt text,
  response jsonb,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now(),
  primary key (id, created_at)
) partition by range (created_at);
create table app.generation_calls_default partition of app.generation_calls default;
create index generation_calls_user_idx on app.generation_calls (user_id, created_at desc);
create index generation_calls_job_idx on app.generation_calls (job_id);

create table app.generation_cache (
  key text primary key check (char_length(key) = 64),
  output jsonb not null,
  asset_ids uuid[] not null default '{}',
  hits int not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table app.platform_budget (
  day date not null,
  model_family text not null,
  cost_micros bigint not null default 0,
  limit_micros bigint not null,
  primary key (day, model_family)
);

create table app.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users (id) on delete cascade,
  plan_id text not null references app.plans (id),
  status text not null check (status in ('active', 'trialing', 'past_due', 'canceled')),
  source text not null check (source in ('beta_invite', 'stripe', 'revenuecat', 'manual')),
  external_ref text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
select private.track_updates('app.entitlements');
create unique index entitlements_one_active on app.entitlements (user_id)
  where status in ('active', 'trialing', 'past_due');

create table app.usage_counters (
  user_id uuid not null references app.users (id) on delete cascade,
  metric text not null,
  period_start date not null,
  count int not null default 0 check (count >= 0),
  primary key (user_id, metric, period_start)
);

-- migrate:down
-- Forward-only: fix mistakes with a new migration.
