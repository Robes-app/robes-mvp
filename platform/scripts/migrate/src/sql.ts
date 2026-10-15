// Set-based domain transforms, legacy.* → app.* (reference/legacy-data-model.md §6.10 amended by
// data-model.md §5). Every statement is insert … on conflict do nothing with legacy ids kept or
// derived deterministically (pg_temp.legacy_uuid), so a second run inserts nothing.

// Looks in every state are carried (legacy migration 25 → app.looks.status); only saved looks take
// tags, renders, wears and days.
export const SAVED_LOOKS = `(select * from legacy.looks where coalesce(status, 'saved') = 'saved')`;
export const CARRIED_LOOKS = `(select * from legacy.looks where coalesce(status, 'saved') in ('saved', 'suggested', 'draft'))`;

export const UUID_RE = `'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'`;

// Session helpers; pg_temp functions vanish with the connection.
export const SESSION_SQL = `
create or replace function pg_temp.legacy_uuid(p_kind text, p_owner uuid, p_key text)
returns uuid language sql immutable as $$
  select (substr(h, 1, 12) || '3' || substr(h, 14, 3)
    || substr('89ab', (('x' || substr(h, 17, 1))::bit(4)::int % 4) + 1, 1) || substr(h, 18))::uuid
  from (select md5('robes-legacy:' || p_kind || ':' || p_owner::text || ':' || p_key) as h) x
$$;
create or replace function pg_temp.is_http(p_url text) returns boolean language sql immutable as $$
  select coalesce(p_url ~ '^https?://' and char_length(p_url) <= 2048, false)
$$;
create or replace function pg_temp.season_band(p_band text, p_seasons text[]) returns text
language sql immutable as $$
  select case
    when p_band in ('spring_summer', 'autumn_winter', 'year_round') then p_band
    when ('Spring' = any(s) or 'Summer' = any(s)) and ('Autumn' = any(s) or 'Winter' = any(s)) then 'year_round'
    when 'Spring' = any(s) or 'Summer' = any(s) then 'spring_summer'
    when 'Autumn' = any(s) or 'Winter' = any(s) then 'autumn_winter'
    else 'year_round' end
  from (select coalesce(p_seasons, '{}'::text[]) as s) x
$$;
`;

// Cloudinary URLs become assets awaiting rehost (data-model.md §5); ids derive from owner + url.
function assetsFrom(select: string, kind: string, sensitive = false): string {
  return `
insert into app.assets (id, user_id, provider, legacy_url, kind, sensitive, status, created_at)
select distinct on (src.user_id, src.url)
  pg_temp.legacy_uuid('asset', src.user_id, src.url), src.user_id, 'cloudinary_legacy', src.url,
  '${kind}', ${sensitive}, 'pending', coalesce(src.created_at, now())
from (${select}) src
join app.users u on u.id = src.user_id
where pg_temp.is_http(src.url)
on conflict (id) do nothing;`;
}

const asset = (owner: string, url: string) =>
  `case when pg_temp.is_http(${url}) then pg_temp.legacy_uuid('asset', ${owner}, ${url}) end`;

const CATEGORIES = `('Tops','Bottoms','Dresses','Outerwear','Shoes','Bags','Accessories','Swimwear','Other')`;

export const IDENTITY_SQL = `
-- Passwordless now (ADR-020): no hashes move; OAuth identities re-link by email on first sign-in.
insert into app.users (id, name, email, email_verified, created_at)
select u.id,
  left(trim(concat_ws(' ', nullif(trim(p.first_name), ''), nullif(trim(p.last_name), ''))), 120),
  lower(trim(u.email)), u.email_confirmed_at is not null, coalesce(u.created_at, now())
from legacy.auth_users u
left join legacy.profiles p on p.id = u.id
where nullif(trim(u.email), '') is not null
order by u.created_at nulls last, u.id
on conflict do nothing;

${assetsFrom(`select id as user_id, headshot_url as url, created_at from legacy.profiles`, 'headshot', true)}
${assetsFrom(`select id as user_id, full_length_url as url, created_at from legacy.profiles`, 'full_length', true)}

-- The signup trigger made the row; fill it, holding every value to the target's checks.
update app.profiles t set
  first_name = left(nullif(trim(p.first_name), ''), 60),
  last_name = left(nullif(trim(p.last_name), ''), 60),
  mobile = left(p.mobile, 32),
  gender_identity = case when p.gender_identity in ('woman', 'man', 'unspecified') then p.gender_identity else 'woman' end,
  style_icons = coalesce(p.style_icons[1:20], '{}'),
  style_archetypes = coalesce(array(
    select left(x, 60) from jsonb_array_elements_text(
      case when jsonb_typeof(p.style_dna -> 'style_archetypes') = 'array' then p.style_dna -> 'style_archetypes' else '[]'::jsonb end
    ) x limit 20), '{}'),
  budget = left(p.budget, 60),
  annual_spend = left(p.annual_spend, 60),
  splurge_categories = coalesce(p.splurge_categories[1:20], '{}'),
  wardrobe_description = left(p.wardrobe_description, 2000),
  instagram_handle = case when ltrim(p.instagram_handle, '@') ~ '^[A-Za-z0-9._]{1,30}$' then ltrim(p.instagram_handle, '@') end,
  -- Legacy snake_case keys → the NotificationPrefs contract; unknown keys dropped.
  notification_prefs = jsonb_strip_nulls(jsonb_build_object(
    'looksReady', case when jsonb_typeof(n.np -> 'looks_ready') = 'boolean' then n.np -> 'looks_ready' end,
    'morningCue', case when jsonb_typeof(n.np -> 'morning') = 'boolean' then n.np -> 'morning' end,
    'nudges', case when jsonb_typeof(n.np -> 'nudges') = 'boolean' then n.np -> 'nudges' end,
    'receipts', case when jsonb_typeof(n.np -> 'receipts') = 'boolean' then n.np -> 'receipts' end)),
  avatar_prefs = case when jsonb_typeof(p.avatar_prefs) = 'object' then p.avatar_prefs end,
  timezone = case when exists (select 1 from pg_timezone_names z where z.name = n.np ->> 'timezone')
    then left(n.np ->> 'timezone', 64) else t.timezone end,
  onboarded_at = p.onboarded_at,
  created_at = coalesce(p.created_at, t.created_at)
from legacy.profiles p,
  lateral (select case when jsonb_typeof(p.notification_prefs) = 'object' then p.notification_prefs else '{}'::jsonb end as np) n
where t.id = p.id;

insert into app.style_profiles (user_id, season, undertone, contrast, body_type, color_harmony,
  silhouette_proportions, colour_render, silhouette_render, user_overrides, headshot_asset_id,
  full_length_asset_id, model_version)
select p.id, p.season, p.undertone, p.contrast, p.body_type,
  case when jsonb_typeof(p.style_dna -> 'color_harmony') = 'object' then p.style_dna -> 'color_harmony' end,
  case when jsonb_typeof(p.style_dna -> 'silhouette_proportions') = 'object' then p.style_dna -> 'silhouette_proportions' end,
  case when jsonb_typeof(p.colour_analysis) = 'object' then p.colour_analysis end,
  case when jsonb_typeof(p.silhouette_analysis) = 'object' then p.silhouette_analysis end,
  case when jsonb_typeof(p.style_dna -> 'user_overrides') = 'object' then p.style_dna -> 'user_overrides' else '{}'::jsonb end,
  ${asset('p.id', 'p.headshot_url')}, ${asset('p.id', 'p.full_length_url')}, 'legacy'
from legacy.profiles p
join app.users u on u.id = p.id
where coalesce(p.season, p.undertone, p.contrast, p.body_type) is not null
   or p.style_dna is not null or p.colour_analysis is not null or p.silhouette_analysis is not null
   or pg_temp.is_http(p.headshot_url) or pg_temp.is_http(p.full_length_url)
on conflict (user_id) do nothing;

insert into app.avatars (user_id, avatar_id)
select p.id, p.avatar_id from legacy.profiles p join app.users u on u.id = p.id
where nullif(trim(p.avatar_id), '') is not null
on conflict (user_id) do nothing;

-- Her digital twin and brief (legacy Settings + style memory, profiles.style_dna): the brands, the
-- one investment level, the facts, her brief's lines and the memory she told Robes. Anything
-- outside the target's ranges is dropped, never clamped.
update app.profiles t set
  style_brands = coalesce(array(
    select left(trim(x), 80) from jsonb_array_elements_text(
      case when jsonb_typeof(p.style_dna -> 'brands') = 'array' then p.style_dna -> 'brands' else '[]'::jsonb end
    ) x where trim(x) <> '' limit 40), '{}'),
  investment_level = case coalesce(p.style_dna ->> 'investment', p.annual_spend)
    when 'Under €500' then 'under_500' when '€500–1,500' then '500_1500'
    when '€1,500–5,000' then '1500_5000' when '€5,000+' then '5000_plus'
    else case when p.budget ilike '%luxury%' then '5000_plus' when p.budget ilike '%designer%' then '1500_5000'
      when p.budget ilike '%contemporary%' then '500_1500' when p.budget ilike '%everyday%' then 'under_500' end end,
  height_cm = case when (f.f ->> 'height_cm') ~ '^[0-9]+$' and (f.f ->> 'height_cm')::int between 140 and 210
    then (f.f ->> 'height_cm')::int end,
  size_uk = case when (f.f ->> 'size_uk') ~ '^[0-9]+$' and (f.f ->> 'size_uk')::int between 4 and 16
    and (f.f ->> 'size_uk')::int % 2 = 0 then (f.f ->> 'size_uk')::int end,
  shoe_uk = case when (f.f ->> 'shoe_uk') ~ '^[0-9]+(\\.[05])?$' and (f.f ->> 'shoe_uk')::numeric between 2 and 8
    then (f.f ->> 'shoe_uk')::numeric end,
  age_band = case f.f ->> 'age_band' when 'Under 25' then 'under_25' when '25–34' then '25_34'
    when '35–44' then '35_44' when '45–54' then '45_54' when '55–64' then '55_64' when '65+' then '65_plus' end
from legacy.profiles p,
  lateral (select case when jsonb_typeof(p.style_dna -> 'facts') = 'object' then p.style_dna -> 'facts' else '{}'::jsonb end as f) f
where t.id = p.id and p.style_dna is not null;

-- The brief's paragraph and colours ride her style profile (the colours as her overrides).
insert into app.style_profiles (user_id) select p.id from legacy.profiles p join app.users u on u.id = p.id
where jsonb_typeof(p.style_dna -> 'brief') = 'object'
on conflict (user_id) do nothing;
update app.style_profiles t set
  brief_notes = nullif(left(trim(b.b ->> 'notes'), 600), ''),
  brief_read_at = case when (b.b ->> 'read_at') ~ '^\\d{4}-\\d{2}-\\d{2}T' then (b.b ->> 'read_at')::timestamptz end,
  user_overrides = t.user_overrides || jsonb_build_object(
    'loved_colors', (select coalesce(jsonb_agg(distinct c), '[]'::jsonb) from (
      select jsonb_array_elements_text(coalesce(t.user_overrides -> 'loved_colors', '[]'::jsonb)) c
      union select jsonb_array_elements_text(case when jsonb_typeof(b.b -> 'colours' -> 'loved') = 'array'
        then b.b -> 'colours' -> 'loved' else '[]'::jsonb end)) x),
    'rejected_colors', (select coalesce(jsonb_agg(distinct c), '[]'::jsonb) from (
      select jsonb_array_elements_text(coalesce(t.user_overrides -> 'rejected_colors', '[]'::jsonb)) c
      union select jsonb_array_elements_text(case when jsonb_typeof(b.b -> 'colours' -> 'rejected') = 'array'
        then b.b -> 'colours' -> 'rejected' else '[]'::jsonb end)) x))
from legacy.profiles p, lateral (select p.style_dna -> 'brief' as b) b
where t.user_id = p.id and jsonb_typeof(b.b) = 'object';

-- Kept lines (a string, or {text, source, at, prompt}), what waits, and what she struck.
insert into app.style_brief_lines (user_id, list, state, text, source, origin, chip, kept_at, created_at)
select p.id, l.list, 'kept', left(trim(coalesce(e.v ->> 'text', e.v #>> '{}')), 160),
  case when e.v ->> 'source' in ('drafted', 'edited', 'typed') then e.v ->> 'source'
    when jsonb_typeof(e.v) = 'string' then 'typed' else 'drafted' end,
  case when e.v ->> 'source' = 'typed' or jsonb_typeof(e.v) = 'string' then 'her' else 'read' end,
  nullif(left(e.v ->> 'prompt', 60), ''),
  coalesce(case when (e.v ->> 'at') ~ '^\\d{4}-\\d{2}-\\d{2}T' then (e.v ->> 'at')::timestamptz end, p.created_at, now()),
  coalesce(case when (e.v ->> 'at') ~ '^\\d{4}-\\d{2}-\\d{2}T' then (e.v ->> 'at')::timestamptz end, p.created_at, now())
  + make_interval(secs => e.i / 1000.0)
from legacy.profiles p join app.users u on u.id = p.id,
  unnest(array['loves', 'avoids', 'rules']) l(list),
  lateral jsonb_array_elements(case when jsonb_typeof(p.style_dna -> 'brief' -> l.list) = 'array'
    then p.style_dna -> 'brief' -> l.list else '[]'::jsonb end) with ordinality e(v, i)
where trim(coalesce(e.v ->> 'text', e.v #>> '{}', '')) <> ''
on conflict do nothing;

insert into app.style_brief_lines (user_id, list, state, text, full_text, because, origin, loved, rejected, created_at)
select p.id, e.v ->> 'list', 'pending', left(trim(e.v ->> 'text'), 160), nullif(left(e.v ->> 'full', 600), ''),
  nullif(left(e.v ->> 'because', 200), ''), case when e.v ->> 'from' = 'prompt' then 'prompt' else 'read' end,
  coalesce(array(select left(c, 60) from jsonb_array_elements_text(case when jsonb_typeof(e.v -> 'loved') = 'array'
    then e.v -> 'loved' else '[]'::jsonb end) c limit 6), '{}'),
  coalesce(array(select left(c, 60) from jsonb_array_elements_text(case when jsonb_typeof(e.v -> 'rejected') = 'array'
    then e.v -> 'rejected' else '[]'::jsonb end) c limit 6), '{}'),
  coalesce(case when (e.v ->> 'at') ~ '^\\d{4}-\\d{2}-\\d{2}T' then (e.v ->> 'at')::timestamptz end, now())
  + make_interval(secs => e.i / 1000.0)
from legacy.profiles p join app.users u on u.id = p.id,
  lateral jsonb_array_elements(case when jsonb_typeof(p.style_dna -> 'brief' -> 'pending') = 'array'
    then p.style_dna -> 'brief' -> 'pending' else '[]'::jsonb end) with ordinality e(v, i)
where e.v ->> 'list' in ('loves', 'avoids', 'rules', 'notes', 'colours') and trim(coalesce(e.v ->> 'text', '')) <> ''
  and e.i <= 12
on conflict do nothing;

insert into app.style_brief_lines (user_id, list, state, text, source, created_at)
select p.id, 'avoids', 'struck', left(trim(e.v), 160), 'drafted', now() - make_interval(secs => e.i)
from legacy.profiles p join app.users u on u.id = p.id,
  lateral jsonb_array_elements_text(case when jsonb_typeof(p.style_dna -> 'brief' -> 'struck') = 'array'
    then p.style_dna -> 'brief' -> 'struck' else '[]'::jsonb end) with ordinality e(v, i)
where trim(e.v) <> '' and e.i <= 30
  and not exists (select 1 from app.style_brief_lines x where x.user_id = p.id and x.state = 'struck'
    and lower(x.text) = lower(left(trim(e.v), 160)));

-- The memory she told Robes (wears are already rows of app.wears).
insert into app.style_memory (user_id, kind, surface, subject, body, verdict, piece_out, piece_in, category, created_at)
select p.id, e.v ->> 'k', nullif(left(e.v ->> 'surface', 40), ''),
  nullif(left(coalesce(e.v ->> 'on', e.v ->> 'look'), 120), ''), nullif(left(e.v ->> 'text', 240), ''),
  case when e.v ->> 'k' = 'verdict' then case when e.v ->> 'v' = '1' then 1 else 0 end end,
  nullif(left(e.v ->> 'out', 120), ''), nullif(left(e.v ->> 'in', 120), ''), nullif(left(e.v ->> 'cat', 40), ''),
  coalesce(case when (e.v ->> 't') ~ '^\\d{4}-\\d{2}-\\d{2}' then (e.v ->> 't')::timestamptz end, now())
from legacy.profiles p join app.users u on u.id = p.id,
  lateral jsonb_array_elements(case when jsonb_typeof(p.style_dna -> 'memory' -> 'entries') = 'array'
    then p.style_dna -> 'memory' -> 'entries' else '[]'::jsonb end) e(v)
where e.v ->> 'k' in ('verdict', 'swap', 'strike', 'ask')
  and (e.v ->> 'k' <> 'swap' or coalesce(e.v ->> 'out', e.v ->> 'in') is not null)
  and (e.v ->> 'k' not in ('strike', 'ask') or nullif(e.v ->> 'text', '') is not null)
  -- Re-runs insert nothing: legacy entries carry no id, so a twin is one at the same moment.
  and not exists (select 1 from app.style_memory m where m.user_id = p.id and m.kind = e.v ->> 'k'
    and m.created_at = coalesce(case when (e.v ->> 't') ~ '^\\d{4}-\\d{2}-\\d{2}' then (e.v ->> 't')::timestamptz end, now())
    and m.body is not distinct from nullif(left(e.v ->> 'text', 240), '')
    and m.piece_out is not distinct from nullif(left(e.v ->> 'out', 120), ''));
`;

// Tags first (legacy ids aren't kept: the unique key is the slug), so the pieces' default-tag
// trigger finds her own tags instead of minting seeds with the same slug.
const TAG_SOURCES = `
select t.user_id, t.kind, trim(t.label) as label, coalesce(t.is_seed, false) as is_seed, t.created_at
from legacy.tags t
union all
select w.user_id, 'wear_for', trim(o), trim(o) in ('Everyday','Work','Evening','Occasion','Travel','Active'), w.created_at
from legacy.wardrobe_items w, unnest(coalesce(w.occasions, '{}'::text[])) o
union all
select l.user_id, 'wear_for', trim(o), trim(o) in ('Everyday','Work','Evening','Occasion','Travel','Active'), l.created_at
from ${SAVED_LOOKS} l, unnest(coalesce(l.tags, '{}'::text[])) o`;

export const WARDROBE_SQL = `
insert into app.tags (user_id, kind, label, is_seed, created_at)
select distinct on (s.user_id, s.kind, private.tag_slug(s.label))
  s.user_id, s.kind, s.label, s.is_seed, coalesce(s.created_at, now())
from (${TAG_SOURCES}) s
join app.users u on u.id = s.user_id
where s.kind in ('wear_for', 'vibe') and char_length(s.label) between 1 and 40
  and private.tag_slug(s.label) is not null
order by s.user_id, s.kind, private.tag_slug(s.label), s.is_seed desc
on conflict (user_id, kind, slug) do nothing;

${assetsFrom(`select user_id, image_url as url, created_at from legacy.wardrobe_items`, 'wardrobe')}

insert into app.wardrobe_items (id, user_id, label, category, category_l2, category_l3, color, brand,
  notes, image_asset_id, item_dna, status, hero_position, season_band, season_source, fit_confidence,
  sentiment, price, currency, size, acquired_via, created_at)
select w.id, w.user_id,
  left(coalesce(nullif(trim(w.label), ''), 'Piece'), 120),
  case when w.category in ${CATEGORIES} then w.category else 'Other' end,
  case when exists (select 1 from app.wardrobe_taxonomy x where x.l2 = w.category_l2) then w.category_l2 end,
  case when exists (select 1 from app.wardrobe_taxonomy x where x.l2 = w.category_l2 and x.l3 = w.category_l3) then w.category_l3 end,
  left(w.color, 60), left(w.brand, 80), left(w.notes, 1000),
  ${asset('w.user_id', 'w.image_url')},
  case when jsonb_typeof(w.item_dna) = 'object' then w.item_dna else '{}'::jsonb end,
  'ready',
  case when w.hero_position between 1 and 10
    and row_number() over (partition by w.user_id, w.hero_position order by w.created_at, w.id) = 1
    then w.hero_position end,
  pg_temp.season_band(w.season_band, w.seasons),
  case when w.season_source in ('inferred', 'user') then w.season_source
       when cardinality(w.seasons) > 0 then 'user' else 'inferred' end,
  left(w.fit_confidence, 40), left(w.sentiment, 40),
  case when w.price >= 0 and w.price < 100000000 then w.price end,
  case when upper(w.currency) ~ '^[A-Z]{3}$' then upper(w.currency) end,
  left(w.size, 40), 'photo', coalesce(w.created_at, now())
from legacy.wardrobe_items w
join app.users u on u.id = w.user_id
on conflict (id) do nothing;

-- Her picks (legacy tag_pieces, or occasions if migration 17 never ran); owners must match (S8).
insert into app.tag_pieces (user_id, tag_id, wardrobe_item_id, source)
select distinct on (t.id, w.id) w.user_id, t.id, w.id, s.source
from (
  select tp.wardrobe_item_id as item_id, lt.user_id, lt.kind, lt.label,
    case when tp.source in ('inferred', 'user') then tp.source else 'user' end as source
  from legacy.tag_pieces tp join legacy.tags lt on lt.id = tp.tag_id
  union all
  select lw.id, lw.user_id, 'wear_for', trim(o), 'user'
  from legacy.wardrobe_items lw, unnest(coalesce(lw.occasions, '{}'::text[])) o
) s
join app.wardrobe_items w on w.id = s.item_id and w.user_id = s.user_id
join app.tags t on t.user_id = w.user_id and t.kind = s.kind and t.slug = private.tag_slug(trim(s.label))
order by t.id, w.id, (s.source = 'user') desc
on conflict (tag_id, wardrobe_item_id) do update set source = 'user'
  where excluded.source = 'user' and app.tag_pieces.source <> 'user';

${assetsFrom(`select user_id, image_url as url, created_at from legacy.wishlist_items`, 'wishlist')}

insert into app.wishlist_items (id, user_id, label, category, category_l2, category_l3, color, brand,
  note, image_asset_id, item_dna, price, currency, size, source_type, source_label, source_url, created_at)
select i.id, i.user_id,
  left(coalesce(nullif(trim(i.label), ''), 'Piece'), 120),
  case when i.category in ${CATEGORIES} then i.category else 'Other' end,
  case when exists (select 1 from app.wardrobe_taxonomy x where x.l2 = i.category_l2) then i.category_l2 end,
  case when exists (select 1 from app.wardrobe_taxonomy x where x.l2 = i.category_l2 and x.l3 = i.category_l3) then i.category_l3 end,
  left(i.color, 60), left(i.brand, 80), left(i.note, 1000),
  ${asset('i.user_id', 'i.image_url')},
  case when jsonb_typeof(i.item_dna) = 'object' then i.item_dna else '{}'::jsonb end,
  case when i.price >= 0 and i.price < 100000000 then i.price end,
  case when upper(i.currency) ~ '^[A-Z]{3}$' then upper(i.currency) end,
  left(i.size, 40),
  case when i.source_type in ('photo','screenshot','instagram','substack','url','robes','receipt') then i.source_type else 'photo' end,
  left(i.source_label, 120),
  case when pg_temp.is_http(i.source_url) then i.source_url end,
  coalesce(i.created_at, now())
from legacy.wishlist_items i
join app.users u on u.id = i.user_id
on conflict (id) do nothing;
`;

export const LOOKS_SQL = `
${assetsFrom(`select user_id, photo_url as url, created_at from ${CARRIED_LOOKS}`, 'look_photo')}
${assetsFrom(`select user_id, render_url as url, created_at from ${SAVED_LOOKS}`, 'render')}

-- Robes-composed sources keep their provenance (Composed by Robes); a look whose photograph is Robes'
-- frame of the whole look (a suggestion, or source robes / proposals on the row, never a hand
-- build) keeps it as the frame — her model never replaces it (legacy _lkFrameOf, 2026-10-07).
-- How each piece is worn (migration 24) is carried by her piece ids.
insert into app.looks (id, user_id, name, name_provisional, note, photo_asset_id, source, climate_band,
  climate_source, proposals, render_asset_id, render_key, status, anchor_piece_id, frame_asset_id,
  styling, created_at, updated_at)
select l.id, l.user_id,
  left(coalesce(nullif(trim(l.name), ''), 'Look'), 120),
  coalesce(l.name_provisional, true), left(l.note, 2000),
  ${asset('l.user_id', 'l.photo_url')},
  case when l.source in ('wear','manual','variant','generated','today','travel') then l.source
    when l.source in ('robes','robes-build') then 'generated'
    when l.source = 'daily' then 'today'
    else 'manual' end,
  case when l.climate_band in ('spring_summer','autumn_winter','year_round') then l.climate_band else 'year_round' end,
  case when l.climate_source in ('derived','user') then l.climate_source else 'derived' end,
  case when jsonb_typeof(l.proposals) = 'array' then l.proposals end,
  case when coalesce(l.status, 'saved') = 'saved' then ${asset('l.user_id', 'l.render_url')} end,
  case when coalesce(l.status, 'saved') = 'saved' then l.render_key end,
  coalesce(l.status, 'saved'),
  (select w.id from app.wardrobe_items w
    where w.user_id = l.user_id and l.anchor_piece_id is not null and w.id = l.anchor_piece_id),
  case when l.photo_url is not null and coalesce(l.source, '') not in ('manual', 'robes-build', 'wear')
    and (coalesce(l.status, 'saved') <> 'saved' or l.source = 'robes'
      or (jsonb_typeof(l.proposals) = 'array' and jsonb_array_length(l.proposals) > 0))
    then ${asset('l.user_id', 'l.photo_url')} end,
  (select jsonb_object_agg(k, left(v, 120)) from jsonb_each_text(
      case when jsonb_typeof(l.styling) = 'object' then l.styling else '{}'::jsonb end) e(k, v)
    where k ~ ${UUID_RE} and nullif(trim(v), '') is not null),
  coalesce(l.created_at, now()), coalesce(l.updated_at, l.created_at, now())
from ${CARRIED_LOOKS} l
join app.users u on u.id = l.user_id
on conflict (id) do nothing;

-- Lineage only within one owner (the composite FK demands it).
update app.looks t set origin_look_id = l.origin_look_id
from legacy.looks l
join app.looks o on o.id = l.origin_look_id and o.user_id = l.user_id
where t.id = l.id and t.origin_look_id is null;

-- Pieces only where the piece's owner is the look's owner (reference §6.10).
insert into app.look_pieces (look_id, user_id, wardrobe_item_id, slot, position, role)
select lp.look_id, l.user_id, lp.wardrobe_item_id, left(lp.slot, 40),
  least(greatest(coalesce(lp.position,
    (row_number() over (partition by lp.look_id order by lp.position nulls last, lp.wardrobe_item_id)) - 1), 0), 50),
  case when lp.role in ('canvas','anchor','texture','exclamation') then lp.role end
from legacy.look_pieces lp
join app.looks l on l.id = lp.look_id
join app.wardrobe_items w on w.id = lp.wardrobe_item_id and w.user_id = l.user_id
on conflict do nothing;

insert into app.tag_looks (user_id, tag_id, look_id, source)
select distinct on (t.id, l.id) l.user_id, t.id, l.id, s.source
from (
  select tl.look_id, lt.user_id, lt.kind, lt.label,
    case when tl.source in ('inferred','user') then tl.source else 'user' end as source
  from legacy.tag_looks tl join legacy.tags lt on lt.id = tl.tag_id
  union all
  select ll.id, ll.user_id, 'wear_for', trim(o), 'inferred'
  from ${SAVED_LOOKS} ll, unnest(coalesce(ll.tags, '{}'::text[])) o
) s
join app.looks l on l.id = s.look_id and l.user_id = s.user_id and l.status = 'saved'
join app.tags t on t.user_id = l.user_id and t.kind = s.kind and t.slug = private.tag_slug(trim(s.label))
order by t.id, l.id, (s.source = 'user') desc
on conflict do nothing;

-- A wear is a fact about her own look; others are dropped (reference §6.10).
insert into app.wears (id, user_id, look_id, worn_on, piece_ids, note, source, source_ref, confirmed_at)
select w.id, w.user_id, w.look_id, w.worn_on, coalesce(w.piece_ids[1:50], '{}'), left(w.note, 1000),
  case when w.source in ('looks','today','plan','travel','retro') then w.source else 'looks' end,
  left(w.source_id, 120), coalesce(w.confirmed_at, now())
from legacy.wears w
join app.looks l on l.id = w.look_id and l.user_id = w.user_id
on conflict do nothing;
`;

// After artifacts (lookbook rows resolve through legacy_id).
export const PLAN_SQL = `
insert into app.planned_days (id, user_id, day_date, source_kind, artifact_id, look_id, day_index,
  slot, pinned, status, activity, headline, item_ids, created_at, updated_at)
select d.id, d.user_id, d.day_date,
  case when d.source_type = 'look' then 'look' else 'artifact' end,
  a.id, l.id,
  least(greatest(coalesce(d.day_index, 0), 0), 60),
  case when d.slot in ('day','evening') then d.slot else 'day' end,
  coalesce(d.pinned, false),
  case when d.status in ('planned','free','worn','swapped') then d.status else 'planned' end,
  left(d.activity, 120), left(d.headline, 160),
  coalesce(array(
    select x::uuid from jsonb_array_elements_text(
      case when jsonb_typeof(d.item_ids) = 'array' then d.item_ids else '[]'::jsonb end) x
    where x ~ ${UUID_RE}), '{}'),
  coalesce(d.created_at, now()), coalesce(d.updated_at, d.created_at, now())
from legacy.planned_days d
join app.users u on u.id = d.user_id
left join app.looks l on d.source_type = 'look' and l.user_id = d.user_id and l.status = 'saved'
  and l.id = case when d.source_id ~ ${UUID_RE} then d.source_id::uuid end
left join app.artifacts a on d.source_type <> 'look' and a.user_id = d.user_id
  and a.legacy_id = case when d.source_id ~ '^[0-9]{1,18}$' then d.source_id::bigint end
where d.source_type <> 'weekly' and (l.id is not null or a.id is not null)
on conflict do nothing;
`;

export const COMMS_SQL = `
-- The ledger keeps notifier idempotency across the cutover.
insert into app.notifications (id, user_id, kind, ref, channel, sent_at)
select n.id, n.user_id,
  case when n.kind = 'receipt_held' then 'receipt' else n.kind end,
  left(n.ref, 120), 'email', n.sent_at
from legacy.notifications n
join app.users u on u.id = n.user_id
where (case when n.kind = 'receipt_held' then 'receipt' else n.kind end)
  in ('looks_ready','look_waiting','borrowing','five','week_empty','morning','receipt')
on conflict do nothing;

-- Held receipts copy whole; decided ones keep only their outcome (reference §6.10).
insert into app.wardrobe_inbox (id, user_id, source, retailer, order_ref, subject, from_email,
  provider_id, items, status, filed_ids, filed_to, received_at, decided_at)
select i.id, i.user_id,
  case when i.source in ('receipt','photo','link','share') then i.source else 'receipt' end,
  i.retailer, i.order_ref,
  case when h.held then i.subject end,
  case when h.held then i.from_email end,
  i.provider_id,
  case when h.held and jsonb_typeof(i.items) = 'array' then i.items else '[]'::jsonb end,
  case when i.status in ('held','filed','dismissed') then i.status else 'held' end,
  coalesce(array(
    select x::uuid from jsonb_array_elements_text(
      case when jsonb_typeof(i.filed_ids) = 'array' then i.filed_ids else '[]'::jsonb end) x
    where x ~ ${UUID_RE}), '{}'),
  case when i.filed_to in ('wardrobe','wishlist') then i.filed_to end,
  coalesce(i.received_at, now()), i.decided_at
from legacy.wardrobe_inbox i
join app.users u on u.id = i.user_id,
  lateral (select coalesce(i.status, 'held') not in ('filed','dismissed') as held) h
on conflict do nothing;
`;
