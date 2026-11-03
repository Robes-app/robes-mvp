-- migrate:up
-- Non-binary as a gender (Annie, 2026-10-29): styled across menswear and womenswear, they/them,
-- the figure catalog the woman's (as for 'unspecified'). Widening the check only: old code never
-- writes the new value, and reads an unknown one as 'woman'.
alter table app.profiles drop constraint profiles_gender_identity_check;
alter table app.profiles
  add constraint profiles_gender_identity_check
  check (gender_identity in ('woman', 'man', 'unspecified', 'non_binary'));

-- migrate:down
-- Forward-only: fix mistakes with a new migration.
