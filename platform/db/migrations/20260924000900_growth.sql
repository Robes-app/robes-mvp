-- migrate:up
create table app.waitlist (
  id uuid primary key default gen_random_uuid(),
  email extensions.citext not null unique check (char_length(email) <= 254),
  name text check (char_length(name) <= 120),
  instagram_handle text check (instagram_handle ~ '^[A-Za-z0-9._]{1,30}$'),
  source text check (char_length(source) <= 60),
  utm jsonb not null default '{}' check (jsonb_typeof(utm) = 'object'),
  confirmed_at timestamptz,
  invited_at timestamptz,
  converted_user_id uuid references app.users (id) on delete set null,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
select private.track_updates('app.waitlist');

create table app.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app.users (id) on delete set null,
  email extensions.citext,
  subject_type text not null check (subject_type in ('artifact', 'look', 'job', 'app')),
  subject_id uuid,
  track text check (char_length(track) <= 60),
  rating smallint check (rating in (0, 1)),
  note text check (char_length(note) <= 2000),
  context jsonb not null default '{}',
  photo_asset_id uuid references app.assets (id) on delete set null,
  created_at timestamptz not null default now()
);
create index feedback_created_idx on app.feedback (created_at desc);

create table app.events (
  id uuid not null default gen_random_uuid(),
  user_id uuid references app.users (id) on delete set null,
  event_type text not null check (char_length(event_type) <= 80),
  metadata jsonb not null default '{}' check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  primary key (id, created_at)
) partition by range (created_at);
create table app.events_default partition of app.events default;
create index events_user_idx on app.events (user_id, created_at desc);
create index events_type_idx on app.events (event_type, created_at desc);

-- Email/push idempotency ledger: one send per (user, kind, ref).
create table app.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users (id) on delete cascade,
  kind text not null check (kind in ('looks_ready', 'look_waiting', 'borrowing', 'five', 'week_empty',
    'morning', 'receipt', 'account_deleted', 'export_ready')),
  ref text not null check (char_length(ref) <= 120),
  channel text not null default 'email' check (channel in ('email', 'push')),
  provider_message_id text,
  status text not null default 'sent' check (status in ('sent', 'failed', 'suppressed')),
  sent_at timestamptz not null default now(),
  unique (user_id, kind, ref, channel)
);
create index notifications_user_idx on app.notifications (user_id, sent_at desc);

create table app.email_suppressions (
  email extensions.citext primary key,
  reason text not null check (reason in ('unsubscribe', 'bounce', 'complaint', 'manual')),
  created_at timestamptz not null default now()
);

-- migrate:down
-- Forward-only: fix mistakes with a new migration.
