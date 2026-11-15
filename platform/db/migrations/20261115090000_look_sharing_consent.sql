-- migrate:up
-- Her yes to sharing what she asks Robes and the look it styles with PostHog, so looks can be
-- checked and improved (owner, 15 Nov 2026): its own switch in You › Privacy, off until she turns
-- it on. Widening the check is additive: code and phone builds from before it never write
-- 'look_sharing', and read only the kinds they know.
alter table app.consents drop constraint consents_kind_check;
alter table app.consents
  add constraint consents_kind_check
  check (kind in ('analytics', 'replay', 'marketing_email', 'photo_analysis', 'look_sharing'));

-- migrate:down
-- Forward-only: fix mistakes with a new migration.
