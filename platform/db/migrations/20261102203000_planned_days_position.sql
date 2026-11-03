-- migrate:up
-- The OOTD diary (Front Door design 3k, plan 2026-11-02): a day's looks have an order, and the
-- first is the OOTD that leads on home. Existing rows keep 0 and fall back to slot, then age, so
-- old code reads the day as before; "Make this the OOTD" rewrites the day's positions 0…n.
alter table app.planned_days
  add column position integer not null default 0 check (position >= 0);

-- migrate:down
-- Forward-only: fix mistakes with a new migration.
