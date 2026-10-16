-- migrate:up
-- The modular home (legacy 0478e63): when she last tapped Later on an onboarding step
-- ({"O1": "<iso>"}); the step stands down for a day. Legacy kept this per device.
alter table app.profiles
  add column home_snoozes jsonb not null default '{}'::jsonb
    check (jsonb_typeof(home_snoozes) = 'object');

-- migrate:down
-- Forward-only: fix mistakes with a new migration.
