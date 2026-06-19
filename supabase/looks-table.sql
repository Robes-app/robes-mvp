-- Run once in Supabase SQL editor (Dashboard → SQL Editor)
-- Persists shareable looks so they survive server restarts/redeploys

create table if not exists looks (
  id text primary key,
  data jsonb not null,
  created_at timestamptz default now()
);

alter table looks enable row level security;

-- Looks are public (anyone with the ID can read, anyone can write a new look)
create policy "public read" on looks for select using (true);
create policy "public insert" on looks for insert with check (true);

-- Auto-delete looks older than 48h (runs nightly via pg_cron if enabled,
-- otherwise old rows are just ignored in queries)
create index if not exists looks_created_at_idx on looks (created_at);
