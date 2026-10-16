-- migrate:up
-- Trips are hidden for the MVP launch (legacy beta 2eacfb4); admins turn them on in /admin/flags.
insert into app.feature_flags (key, enabled, description)
values ('trips', false, 'Trips (travel edit) and every door to them')
on conflict (key) do nothing;

-- migrate:down
-- Forward-only: fix mistakes with a new migration.
