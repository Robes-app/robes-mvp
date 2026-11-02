-- migrate:up
-- The OOTD diary home (plan 2026-11-02) ships dark; admins turn it on in /admin/flags once P1–P3 land.
insert into app.feature_flags (key, enabled, description)
values ('home.diary', false, 'Home as the OOTD diary (strip, day slot, prompt chips, bell)')
on conflict (key) do nothing;

-- migrate:down
-- Forward-only: fix mistakes with a new migration.
