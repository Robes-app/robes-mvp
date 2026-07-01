-- ============================================================
-- Robes — Supabase schema
-- Run this in the SQL editor of your Supabase project.
-- ============================================================

-- ── profiles ────────────────────────────────────────────────
-- One row per authenticated user, keyed to auth.users.
create table if not exists public.profiles (
  id                  uuid        primary key references auth.users(id) on delete cascade,
  first_name          text,
  last_name           text,
  mobile              text,
  style_icons         text[]      default '{}',
  budget              text,
  wardrobe_description text,
  season              text,
  undertone           text,
  contrast            text,
  body_type           text,
  splurge_categories  text[]      default '{}',
  annual_spend        text,
  headshot_url        text,
  full_length_url     text,
  colour_analysis     jsonb,
  silhouette_analysis jsonb,
  created_at          timestamptz default now() not null,
  updated_at          timestamptz default now() not null
);

-- Existing databases: run supabase/style_notes_migration.sql instead.

-- Auto-populate a profile row when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, first_name)
  values (
    new.id,
    new.raw_user_meta_data ->> 'first_name'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Keep updated_at current automatically
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ── prompt_history ───────────────────────────────────────────
create table if not exists public.prompt_history (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  prompt       text        not null,
  response     text        not null,
  tokens_used  integer,
  model        text,
  created_at   timestamptz default now() not null
);

create index if not exists prompt_history_user_id_idx
  on public.prompt_history(user_id, created_at desc);

-- ── Row Level Security ───────────────────────────────────────
alter table public.profiles      enable row level security;
alter table public.prompt_history enable row level security;

-- profiles: users can only read/write their own row
create policy "profiles: own row select"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: own row insert"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles: own row update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- prompt_history: users can only read/write their own history
create policy "prompt_history: own rows select"
  on public.prompt_history for select
  using (auth.uid() = user_id);

create policy "prompt_history: own rows insert"
  on public.prompt_history for insert
  with check (auth.uid() = user_id);
