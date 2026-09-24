-- migrate:up
-- Gemini Batch API submissions (M5 task 3, cost lever 4): which jobs ride in which provider batch.
-- Jobs stay `running` with a long lease while their batch is out; if it never lands, the lease
-- expires and the outbox sweeper hands them to the interactive path.
create table app.batch_submissions (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('gemini', 'fake')),
  provider_batch_id text not null check (char_length(provider_batch_id) <= 300),
  feature text not null check (char_length(feature) <= 80),
  status text not null default 'submitted' check (status in ('submitted', 'applied', 'failed')),
  job_ids uuid[] not null check (cardinality(job_ids) between 1 and 1000),
  submitted_at timestamptz not null default now(),
  finished_at timestamptz,
  updated_at timestamptz not null default now()
);
select private.track_updates('app.batch_submissions');
create index batch_submissions_open_idx on app.batch_submissions (submitted_at) where status = 'submitted';

-- migrate:down
-- Forward-only: fix mistakes with a new migration.
