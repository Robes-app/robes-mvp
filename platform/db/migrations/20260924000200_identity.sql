-- migrate:up
-- Better Auth tables (ADR-020). Column names are mapped to snake_case in packages/auth.
create table app.users (
  id uuid primary key default gen_random_uuid(),
  name text not null default '' check (char_length(name) <= 120),
  email extensions.citext not null unique check (char_length(email) <= 254),
  email_verified boolean not null default false,
  image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
select private.track_updates('app.users');

create table app.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users (id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
select private.track_updates('app.sessions');
create index sessions_user_idx on app.sessions (user_id);

create table app.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users (id) on delete cascade,
  account_id text not null,
  provider_id text not null,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  password text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_id, account_id)
);
select private.track_updates('app.accounts');
create index accounts_user_idx on app.accounts (user_id);

create table app.verifications (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  value text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
select private.track_updates('app.verifications');
create index verifications_identifier_idx on app.verifications (identifier);

-- Shared store for Better Auth's rate limiter (SEC-33: no per-process state).
create table app.rate_limits (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  count int not null,
  last_request bigint not null
);

create table app.profiles (
  id uuid primary key references app.users (id) on delete cascade,
  first_name text check (char_length(first_name) <= 60),
  last_name text check (char_length(last_name) <= 60),
  mobile text check (char_length(mobile) <= 32),
  gender_identity text not null default 'woman'
    check (gender_identity in ('woman', 'man', 'unspecified')),
  style_icons text[] not null default '{}' check (cardinality(style_icons) <= 20),
  style_archetypes text[] not null default '{}' check (cardinality(style_archetypes) <= 20),
  budget text check (char_length(budget) <= 60),
  annual_spend text check (char_length(annual_spend) <= 60),
  splurge_categories text[] not null default '{}' check (cardinality(splurge_categories) <= 20),
  wardrobe_description text check (char_length(wardrobe_description) <= 2000),
  instagram_handle text check (instagram_handle ~ '^[A-Za-z0-9._]{1,30}$'),
  notification_prefs jsonb not null default '{}' check (jsonb_typeof(notification_prefs) = 'object'),
  avatar_prefs jsonb check (avatar_prefs is null or jsonb_typeof(avatar_prefs) = 'object'),
  locale text not null default 'en-IE' check (char_length(locale) <= 20),
  timezone text not null default 'Europe/Dublin' check (char_length(timezone) <= 64),
  currency char(3) not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  home_city text check (char_length(home_city) <= 120),
  home_lat numeric(6, 3) check (home_lat between -90 and 90),
  home_lon numeric(6, 3) check (home_lon between -180 and 180),
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
select private.track_updates('app.profiles');

create table app.user_ui_state (
  user_id uuid primary key references app.users (id) on delete cascade,
  dismissed jsonb not null default '{}' check (jsonb_typeof(dismissed) = 'object'),
  last_visit_at timestamptz,
  seen_features text[] not null default '{}' check (cardinality(seen_features) <= 200),
  updated_at timestamptz not null default now()
);
select private.track_updates('app.user_ui_state');

-- Every new account gets its profile rows in the same transaction as the user row.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into app.profiles (id, first_name)
  values (new.id, left(nullif(split_part(trim(new.name), ' ', 1), ''), 60));
  insert into app.user_ui_state (user_id) values (new.id);
  return new;
end;
$$;
revoke execute on function private.handle_new_user() from public;
create trigger on_user_created after insert on app.users
  for each row execute function private.handle_new_user();

create table app.style_profiles (
  user_id uuid primary key references app.users (id) on delete cascade,
  season text,
  undertone text,
  contrast text,
  body_type text,
  color_harmony jsonb,
  silhouette_proportions jsonb,
  colour_render jsonb,
  silhouette_render jsonb,
  headshot_asset_id uuid,
  full_length_asset_id uuid,
  user_overrides jsonb not null default '{}' check (jsonb_typeof(user_overrides) = 'object'),
  model_version text,
  updated_at timestamptz not null default now()
);
select private.track_updates('app.style_profiles');

create table app.avatars (
  user_id uuid primary key references app.users (id) on delete cascade,
  avatar_id text not null,
  derived_from jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
select private.track_updates('app.avatars');

create table app.admin_users (
  user_id uuid primary key references app.users (id) on delete cascade,
  role text not null check (role in ('admin', 'support', 'analyst')),
  granted_by uuid references app.users (id),
  granted_at timestamptz not null default now()
);

create table app.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references app.users (id) on delete set null,
  action text not null check (char_length(action) <= 80),
  subject_user_id uuid references app.users (id) on delete set null,
  subject_table text,
  subject_id text,
  detail jsonb not null default '{}',
  ip inet,
  created_at timestamptz not null default now()
);
create index audit_log_subject_idx on app.audit_log (subject_user_id, created_at desc);

-- Append-only; the latest row per (user, kind) is the current answer.
create table app.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users (id) on delete cascade,
  kind text not null check (kind in ('analytics', 'replay', 'marketing_email', 'photo_analysis')),
  granted boolean not null,
  source text not null check (source in ('web', 'ios', 'android', 'email')),
  created_at timestamptz not null default now()
);
create index consents_user_kind_idx on app.consents (user_id, kind, created_at desc);

create table app.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app.users (id) on delete cascade,
  expo_token text not null unique check (char_length(expo_token) <= 200),
  platform text not null check (platform in ('ios', 'android')),
  app_version text check (char_length(app_version) <= 32),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index push_tokens_user_idx on app.push_tokens (user_id) where revoked_at is null;

-- migrate:down
-- Forward-only: fix mistakes with a new migration.
