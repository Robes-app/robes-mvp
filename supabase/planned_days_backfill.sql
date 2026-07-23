-- Backfill: existing lookbook blobs → planned_days rows (after migration 12).
-- Paste-and-run in the Supabase SQL editor — the no-terminal equivalent of
-- scripts/backfill_planned_days.mjs. Safe to re-run: every insert upserts on
-- the unique moment index, so repeats produce no duplicates.
--
-- Scope (Diary decisions log, 23 Jul):
--   · weekly-plan  → one 'day' row per day (dates from week_iso when the
--     save carries it, else parsed from "Monday · 14 Jul" labels with the
--     year nearest created_at)
--   · travel-edit  → one row per MOMENT (Day/Evening slots); deferred trips
--     band as bare 'planned' rows
--   · daily-look   → SKIPPED ENTIRELY (no guessing at created_at::date)
--   · unparseable sources are simply left out (query 5 lists them)

-- ═════ 1 · Weekly plans → one 'day' row per day ═════
insert into public.planned_days
  (user_id, day_date, source_type, source_id, day_index, slot,
   status, activity, headline, thumb_urls, item_ids, environment, updated_at)
with wk as (
  select li.user_id, li.id::text as source_id, li.created_at,
         li.data->'wkData' as w
  from public.lookbook_items li
  where li.type = 'weekly-plan'
    and jsonb_typeof(li.data->'wkData'->'days') = 'array'
),
d as (
  select wk.*, day.value as day, (day.ordinality - 1)::int as idx
  from wk, jsonb_array_elements(wk.w->'days') with ordinality day
),
dated as (
  select d.*,
    case
      when d.w->'week_iso'->>d.idx ~ '^\d{4}-\d{2}-\d{2}$'
        then (d.w->'week_iso'->>d.idx)::date
      else (
        select c.dt
        from (select regexp_match(d.day->>'day_label', '(\d{1,2})\s+([A-Za-z]{3,5})') as m) p
        cross join lateral (
          select to_date(p.m[1] || ' ' || left(p.m[2], 3) || ' ' || y::text, 'DD Mon YYYY') as dt
          from generate_series(extract(year from d.created_at)::int - 1,
                               extract(year from d.created_at)::int + 1) as y
        ) c
        where p.m is not null
        order by abs(extract(epoch from (c.dt::timestamp - d.created_at::timestamp)))
        limit 1
      )
    end as day_date,
    coalesce((d.day->>'rest')::boolean, false) as rest
  from d
)
select
  x.user_id, x.day_date, 'weekly', x.source_id, x.idx, 'day',
  case when x.rest then 'free' else 'planned' end,
  case when x.rest then null
       else coalesce(nullif(x.day->>'user_activity', ''), nullif(x.day->>'occasion', '')) end,
  case when x.rest then null
       else coalesce(nullif(x.day->>'note', ''), nullif(x.day->>'occasion', '')) end,
  case when x.rest then '[]'::jsonb else th.thumbs end,
  case when x.rest then '[]'::jsonb else ii.ids end,
  'beta', now()
from dated x
cross join lateral (
  select coalesce(jsonb_agg(u), '[]'::jsonb) as thumbs
  from (
    select distinct u from (
      select case
        when it.value->'wardrobe_match'->>'image_url' like 'http%'
          then it.value->'wardrobe_match'->>'image_url'
        when (it.value->>'image_index') ~ '^\d+$'
          then x.w->'generatedImages'->>((it.value->>'image_index')::int)
      end as u
      from jsonb_array_elements(coalesce(x.day->'items', '[]'::jsonb)) it
    ) z where u like 'http%' limit 3
  ) zz
) th
cross join lateral (
  select coalesce(jsonb_agg(it.value->'wardrobe_match'->'id'), '[]'::jsonb) as ids
  from jsonb_array_elements(coalesce(x.day->'items', '[]'::jsonb)) it
  where it.value->'wardrobe_match'->>'id' is not null
) ii
where x.day_date is not null
on conflict (user_id, source_id, day_index, slot) do update
  set day_date = excluded.day_date, status = excluded.status,
      activity = excluded.activity, headline = excluded.headline,
      thumb_urls = excluded.thumb_urls, item_ids = excluded.item_ids,
      updated_at = now();

-- ═════ 2 · Travel edits with outfits → one row per moment ═════
insert into public.planned_days
  (user_id, day_date, source_type, source_id, day_index, slot,
   status, activity, headline, thumb_urls, item_ids, environment, updated_at)
with tv as (
  select li.user_id, li.id::text as source_id, li.data->'tvData' as t
  from public.lookbook_items li
  where li.type = 'travel-edit'
    and (li.data->'tvData'->>'dateFrom') ~ '^\d{4}-\d{2}-\d{2}$'
    and case when jsonb_typeof(li.data->'tvData'->'days') = 'array'
             then jsonb_array_length(li.data->'tvData'->'days') else 0 end > 0
),
d as (
  select tv.*, day.value as day, (day.ordinality - 1)::int as idx,
         ((tv.t->>'dateFrom')::date + (day.ordinality - 1)::int) as day_date,
         (coalesce((day.value->>'rest')::boolean, false)
          or case when jsonb_typeof(day.value->'slots') = 'array'
                  then jsonb_array_length(day.value->'slots') else 0 end = 0) as freeday,
         nullif(trim(split_part(day.value->>'day_label', '·', 2)), '') as label_part
  from tv, jsonb_array_elements(tv.t->'days') with ordinality day
),
freerows as (
  select user_id, day_date, source_id, idx, 'day'::text as slot,
         'free'::text as status,
         nullif(day->>'user_activity', '') as activity,
         null::text as headline, '[]'::jsonb as thumbs, '[]'::jsonb as ids
  from d where freeday
),
mom as (
  select d.*, s.value as sl,
         case when s.ordinality = 1 then 'day' else 'evening' end as slot_name
  from d, jsonb_array_elements(d.day->'slots') with ordinality s
  where not d.freeday and s.ordinality <= 2
),
momrows as (
  select m.user_id, m.day_date, m.source_id, m.idx, m.slot_name as slot,
         'planned'::text as status,
         coalesce(nullif(m.day->>'user_activity', ''), m.label_part) as activity,
         nullif(m.sl->>'title', '') as headline,
         th.thumbs, ii.ids
  from mom m
  cross join lateral (
    select coalesce(jsonb_agg(u), '[]'::jsonb) as thumbs
    from (
      select distinct u from (
        select case
          when m.t->'capsule'->((f.value->>'item_index')::int)->'wardrobe_match'->>'image_url' like 'http%'
            then m.t->'capsule'->((f.value->>'item_index')::int)->'wardrobe_match'->>'image_url'
          when (m.t->'capsule'->((f.value->>'item_index')::int)->>'image_index') ~ '^\d+$'
            then m.t->'generatedImages'->>((m.t->'capsule'->((f.value->>'item_index')::int)->>'image_index')::int)
        end as u
        from jsonb_array_elements(coalesce(m.sl->'formula', '[]'::jsonb)) f
        where (f.value->>'item_index') ~ '^\d+$'
      ) z where u like 'http%' limit 3
    ) zz
  ) th
  cross join lateral (
    select coalesce(jsonb_agg(distinct m.t->'capsule'->((f.value->>'item_index')::int)->'wardrobe_match'->'id'), '[]'::jsonb) as ids
    from jsonb_array_elements(coalesce(m.sl->'formula', '[]'::jsonb)) f
    where (f.value->>'item_index') ~ '^\d+$'
      and m.t->'capsule'->((f.value->>'item_index')::int)->'wardrobe_match'->>'id' is not null
  ) ii
)
select user_id, day_date, 'travel', source_id, idx, slot,
       status, activity, headline, thumbs, ids, 'beta', now()
from (select * from freerows union all select * from momrows) u
on conflict (user_id, source_id, day_index, slot) do update
  set day_date = excluded.day_date, status = excluded.status,
      activity = excluded.activity, headline = excluded.headline,
      thumb_urls = excluded.thumb_urls, item_ids = excluded.item_ids,
      updated_at = now();

-- ═════ 3 · Deferred trips (no outfits yet) → one 'planned' row per date ═════
insert into public.planned_days
  (user_id, day_date, source_type, source_id, day_index, slot,
   status, activity, headline, thumb_urls, item_ids, environment, updated_at)
with tv as (
  select li.user_id, li.id::text as source_id, li.data->'tvData' as t
  from public.lookbook_items li
  where li.type = 'travel-edit'
    and (li.data->'tvData'->>'dateFrom') ~ '^\d{4}-\d{2}-\d{2}$'
    and case when jsonb_typeof(li.data->'tvData'->'days') = 'array'
             then jsonb_array_length(li.data->'tvData'->'days') else 0 end = 0
),
n as (
  select tv.*,
    case when (t->>'dateTo') ~ '^\d{4}-\d{2}-\d{2}$' and (t->>'dateTo')::date >= (t->>'dateFrom')::date
      then least(10, ((t->>'dateTo')::date - (t->>'dateFrom')::date) + 1)
      else 7 end as ndays
  from tv
),
g as (select n.*, gs::int as idx from n, generate_series(0, n.ndays - 1) gs)
select user_id, (t->>'dateFrom')::date + idx, 'travel', source_id, idx, 'day',
  case when jsonb_typeof(t->'trip_day_plan'->idx) = 'null' then 'free' else 'planned' end,
  nullif(t->'trip_day_plan'->>idx, ''),
  null, '[]'::jsonb, '[]'::jsonb, 'beta', now()
from g
on conflict (user_id, source_id, day_index, slot) do update
  set day_date = excluded.day_date, status = excluded.status,
      activity = excluded.activity, updated_at = now();

-- ═════ 4 · What landed ═════
select source_type, count(*) as row_count, count(distinct source_id) as plans,
       min(day_date) as first_day, max(day_date) as last_day
from public.planned_days
group by source_type order by source_type;

-- ═════ 5 · Sources that could not be backfilled (unparseable dates) ═════
-- daily-look rows appearing here is EXPECTED — they are skipped by design.
select li.type, li.id, li.title, li.created_at
from public.lookbook_items li
left join public.planned_days pd
  on pd.source_id = li.id::text and pd.user_id = li.user_id
where li.type in ('weekly-plan', 'travel-edit') and pd.id is null;
