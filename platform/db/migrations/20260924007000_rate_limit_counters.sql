-- migrate:up
-- Shared API rate-limit store (SEC-33) when Upstash isn't used: one fixed-window counter per key.
create table app.rate_limit_counters (
  key text not null check (char_length(key) <= 300),
  window_start timestamptz not null,
  count integer not null default 1,
  expires_at timestamptz not null,
  primary key (key, window_start)
);
create index rate_limit_counters_expiry_idx on app.rate_limit_counters (expires_at);

-- migrate:down
-- Forward-only: fix mistakes with a new migration.
