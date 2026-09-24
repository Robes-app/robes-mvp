-- migrate:up
create table app.artifacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users (id) on delete cascade,
  legacy_id bigint,
  type text not null check (type in ('idea', 'key_piece', 'daily_look', 'travel_edit', 'moodboard',
    'weekly_plan_archived')),
  title text not null default '' check (char_length(title) <= 160),
  subtitle text not null default '' check (char_length(subtitle) <= 240),
  cover_asset_id uuid,
  data jsonb not null default '{}' check (jsonb_typeof(data) = 'object'),
  schema_version smallint not null default 1,
  generation_job_id uuid,
  saved_at timestamptz,
  -- Unsaved ideas expire after 30 days (roadmap M4 task 4).
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, user_id),
  unique (user_id, legacy_id),
  foreign key (cover_asset_id, user_id) references app.assets (id, user_id),
  foreign key (generation_job_id, user_id) references app.generation_jobs (id, user_id) on delete set null (generation_job_id)
);
select private.track_updates('app.artifacts');
create index artifacts_user_updated_idx on app.artifacts (user_id, updated_at);
create index artifacts_user_type_idx on app.artifacts (user_id, type, created_at desc) where deleted_at is null;

alter table app.generation_jobs
  add foreign key (artifact_id, user_id) references app.artifacts (id, user_id) on delete set null (artifact_id);

create table app.planned_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users (id) on delete cascade,
  day_date date not null,
  source_kind text not null check (source_kind in ('artifact', 'look')),
  artifact_id uuid,
  look_id uuid,
  day_index int not null default 0 check (day_index between 0 and 60),
  slot text not null default 'day' check (slot in ('day', 'evening')),
  pinned boolean not null default false,
  status text not null default 'planned' check (status in ('planned', 'free', 'worn', 'swapped')),
  activity text check (char_length(activity) <= 120),
  headline text check (char_length(headline) <= 160),
  item_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check ((source_kind = 'artifact') = (artifact_id is not null)
    and (source_kind = 'look') = (look_id is not null)),
  foreign key (artifact_id, user_id) references app.artifacts (id, user_id) on delete cascade,
  foreign key (look_id, user_id) references app.looks (id, user_id) on delete cascade
);
select private.track_updates('app.planned_days');
create unique index planned_days_artifact_slot on app.planned_days (user_id, artifact_id, day_index, slot)
  where artifact_id is not null and deleted_at is null;
create unique index planned_days_look_slot on app.planned_days (user_id, look_id, day_date, slot)
  where look_id is not null and deleted_at is null;
create index planned_days_user_date_idx on app.planned_days (user_id, day_date);
create index planned_days_user_updated_idx on app.planned_days (user_id, updated_at);

-- Public snapshots addressed by a ≥128-bit token (SEC-13); served by the API, never PostgREST.
create table app.shares (
  token text primary key check (char_length(token) >= 22 or legacy_token),
  owner_id uuid not null references app.users (id) on delete cascade,
  subject_type text not null check (subject_type in ('artifact', 'look')),
  subject_id uuid not null,
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  legacy_token boolean not null default false,
  view_count int not null default 0,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  expires_at timestamptz
);
create index shares_owner_idx on app.shares (owner_id, created_at desc);
create unique index shares_active_subject on app.shares (owner_id, subject_type, subject_id)
  where revoked_at is null;

-- migrate:down
-- Forward-only: fix mistakes with a new migration.
