-- ============================================================
-- Robes — migration 11: admin capture plane
-- Run once in the Supabase SQL editor (after wardrobe_v2_migration.sql).
-- PREREQUISITE: migration 10 (wardrobe_v2_migration.sql) must have run —
-- this script references wishlist_items. Every statement is additive and
-- idempotent — safe to run while the pre-migration code is live on
-- production AND beta (shared project).
--
-- Adds:
--   profiles.is_admin + recursion-safe is_admin() helper
--   events           — client-written user action log
--   generation_log   — server-written LLM call trail (full prompt/response)
--   feedback         — client-written output ratings
--   admin-read RLS policies on the existing tables
--   admin_user_overview() RPC — one-call users list (email + counts)
--
-- After running, grant yourself admin once:
--   update public.profiles set is_admin = true where id = '<your-auth-uid>';
-- ============================================================

-- ── admin flag + recursion-safe helper ───────────────────────
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- A plain "exists(select from profiles ...)" inside an RLS policy ON
-- profiles recurses; a security-definer function bypasses RLS cleanly.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ── events — action log (client-written) ─────────────────────
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  event_type  text not null,
  metadata    jsonb not null default '{}',
  environment text not null default 'production',  -- 'beta' | 'production', from hostname client-side
  created_at  timestamptz not null default now()
);
create index if not exists events_user_idx    on public.events(user_id);
create index if not exists events_env_idx     on public.events(environment);
create index if not exists events_type_idx    on public.events(event_type);
create index if not exists events_created_idx on public.events(created_at desc);

alter table public.events enable row level security;
drop policy if exists events_own_insert on public.events;
create policy events_own_insert on public.events
  for insert with check (auth.uid() = user_id);
drop policy if exists events_admin_read on public.events;
create policy events_admin_read on public.events
  for select using (public.is_admin());

-- ── generation_log — LLM call trail (server-written) ─────────
-- Written from server.js with the service role (bypasses RLS by design).
-- Full prompt/response kept as a learning corpus — admin-read-only,
-- never exposed to the client SPA. Escape hatch if metrics queries ever
-- slow: split prompt/response into a sibling payloads table (see the
-- admin architecture doc §4.3).
create table if not exists public.generation_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  endpoint    text not null,        -- '/api/style' | '/api/weekly' | '/api/travel' | ...
  model       text,                 -- 'gemini-2.5-flash' | 'gemini-3.1-flash-image' | ...
  tokens_used int,
  latency_ms  int,
  status      text not null,        -- 'ok' | 'partial' | 'timeout' | 'error'
  prompt      text,                 -- FULL prompt sent to the model (learning corpus)
  response    jsonb,                -- FULL structured response (looks JSON, etc.)
  detail      jsonb default '{}',   -- images_returned, retry_count, error reason
  environment text not null default 'production',  -- 'beta' | 'production', from PUBLIC_URL server-side
  created_at  timestamptz not null default now()
);
create index if not exists genlog_user_idx     on public.generation_log(user_id);
create index if not exists genlog_endpoint_idx on public.generation_log(endpoint);
create index if not exists genlog_status_idx   on public.generation_log(status);
create index if not exists genlog_env_idx      on public.generation_log(environment);
create index if not exists genlog_created_idx  on public.generation_log(created_at desc);

alter table public.generation_log enable row level security;
drop policy if exists genlog_admin_read on public.generation_log;
create policy genlog_admin_read on public.generation_log
  for select using (public.is_admin());

-- ── feedback — output ratings (client-written) ───────────────
-- lookbook_item_id is a soft reference (client Date.now() id, matches the
-- lookbook_items PK (user_id, id)) — no hard composite FK, so it never
-- couples to the client-id scheme. user_id + lookbook_item_id joins back
-- to the artifact.
create table if not exists public.feedback (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete cascade,
  lookbook_item_id bigint,
  track            text,            -- 'key-piece' | 'daily' | 'weekly' | 'travel' | 'moodboard' | 'look'
  rating           int check (rating in (0, 1)),  -- 1 = thumbs up, 0 = thumbs down, null = no rating
  note             text,
  created_at       timestamptz not null default now()
);
create index if not exists feedback_user_idx    on public.feedback(user_id);
create index if not exists feedback_item_idx    on public.feedback(lookbook_item_id);
create index if not exists feedback_created_idx on public.feedback(created_at desc);

alter table public.feedback enable row level security;
drop policy if exists feedback_own_insert on public.feedback;
create policy feedback_own_insert on public.feedback
  for insert with check (auth.uid() = user_id);
drop policy if exists feedback_admin_read on public.feedback;
create policy feedback_admin_read on public.feedback
  for select using (public.is_admin());

-- ── admin read across existing tables ────────────────────────
-- The record panel reads every user's rows with the admin's own JWT —
-- no service key in the browser. Existing own-row policies untouched.
drop policy if exists profiles_admin_read on public.profiles;
create policy profiles_admin_read       on public.profiles       for select using (public.is_admin());
drop policy if exists wardrobe_admin_read on public.wardrobe_items;
create policy wardrobe_admin_read       on public.wardrobe_items for select using (public.is_admin());
drop policy if exists wishlist_admin_read on public.wishlist_items;
create policy wishlist_admin_read       on public.wishlist_items for select using (public.is_admin());
drop policy if exists lookbook_admin_read on public.lookbook_items;
create policy lookbook_admin_read       on public.lookbook_items for select using (public.is_admin());
drop policy if exists prompt_history_admin_read on public.prompt_history;
create policy prompt_history_admin_read on public.prompt_history for select using (public.is_admin());

-- ── admin_user_overview() — one-call users list ──────────────
-- PostgREST can't join auth.users (email, last sign-in) or aggregate
-- per-user counts in one round trip, so the users list goes through this
-- security-definer RPC. Returns nothing unless the caller is an admin.
create or replace function public.admin_user_overview(
  p_limit  int  default 50,
  p_offset int  default 0,
  p_search text default null,
  p_user   uuid default null
)
returns table (
  id              uuid,
  email           text,
  first_name      text,
  created_at      timestamptz,
  onboarded_at    timestamptz,
  last_sign_in_at timestamptz,
  wardrobe_count  bigint,
  wishlist_count  bigint,
  lookbook_count  bigint,
  feedback_count  bigint,
  last_event_at   timestamptz,
  is_admin        boolean,
  total_count     bigint
)
language sql
security definer
set search_path = public
stable
as $$
  select
    u.id,
    u.email::text,
    p.first_name,
    u.created_at,
    p.onboarded_at,
    u.last_sign_in_at,
    (select count(*) from public.wardrobe_items w where w.user_id = u.id),
    (select count(*) from public.wishlist_items wl where wl.user_id = u.id),
    (select count(*) from public.lookbook_items l where l.user_id = u.id),
    (select count(*) from public.feedback f where f.user_id = u.id),
    (select max(e.created_at) from public.events e where e.user_id = u.id),
    coalesce(p.is_admin, false),
    count(*) over ()
  from auth.users u
  left join public.profiles p on p.id = u.id
  where public.is_admin()
    and (p_user is null or u.id = p_user)
    and (p_search is null or p_search = ''
         or u.email ilike '%' || p_search || '%'
         or coalesce(p.first_name, '') ilike '%' || p_search || '%')
  order by u.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 200)
  offset greatest(coalesce(p_offset, 0), 0)
$$;

revoke all on function public.admin_user_overview(int, int, text, uuid) from public, anon;
grant execute on function public.admin_user_overview(int, int, text, uuid) to authenticated;
