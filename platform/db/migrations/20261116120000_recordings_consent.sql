-- migrate:up
-- Her yes to screen recordings that show her words (owner, 16 Nov 2026). A yes given under
-- 'replay' was to recordings with every word hidden, so it is its own kind and is asked afresh.
-- Widening the check is additive: code and phone builds from before it never write 'recordings',
-- and read only the kinds they know.
alter table app.consents drop constraint consents_kind_check;
alter table app.consents
  add constraint consents_kind_check
  check (kind in (
    'analytics', 'replay', 'marketing_email', 'photo_analysis', 'look_sharing', 'recordings'
  ));

-- migrate:down
-- Forward-only: fix mistakes with a new migration.
