-- Read-only census before bringing beta people across (docs/migration.md §4a). Run against
-- Robes_p0, which holds legacy (auth, public) and production (app):
--   PGOPTIONS='-c default_transaction_read_only=on' psql "$LEGACY_DATABASE_URL" -f scripts/migrate/census.sql
select 'legacy accounts' as what, count(*) from auth.users
union all select 'legacy people with pieces', count(distinct user_id) from public.wardrobe_items
union all select 'legacy people with looks', count(distinct user_id) from public.looks
union all select 'platform accounts', count(*) from app.users
union all select 'same email on both sides', count(*)
  from auth.users a join app.users u on u.email = lower(trim(a.email))
union all select '  of those, already copied (same id)', count(*) from auth.users a join app.users u on u.id = a.id
union all select 'legacy copy schema present', count(*) from information_schema.schemata where schema_name = 'legacy';

-- Everyone on beta who has made something, and where she stands on the platform.
select a.email as beta_email,
  (select count(*) from public.wardrobe_items w where w.user_id = a.id) as pieces,
  (select count(*) from public.wishlist_items w where w.user_id = a.id) as wishes,
  (select count(*) from public.looks l where l.user_id = a.id) as looks,
  (select count(*) from public.wears w where w.user_id = a.id) as wears,
  (select count(*) from public.lookbook_items l where l.user_id = a.id) as lookbook,
  a.last_sign_in_at::date as last_beta_sign_in,
  case when u.id is null then 'no' when u.id = a.id then 'copied' else 'yes' end as on_platform,
  (select count(*) from app.wardrobe_items w where w.user_id = u.id) as platform_pieces,
  (select count(*) from app.looks l where l.user_id = u.id) as platform_looks
from auth.users a
left join app.users u on u.email = lower(trim(a.email))
where exists (select 1 from public.wardrobe_items w where w.user_id = a.id)
   or exists (select 1 from public.looks l where l.user_id = a.id)
   or exists (select 1 from public.lookbook_items l where l.user_id = a.id)
order by pieces desc;
