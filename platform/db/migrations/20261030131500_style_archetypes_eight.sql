-- migrate:up
-- Eight style archetypes (Annie, 30 Oct): Romantic, Off-duty and Avant-garde retire into their
-- nearest archetype (@robes/core/style-dna RETIRED_STYLE_TYPES). Her first pick keeps its place
-- and a type she now holds twice is kept once. Old code reads the new names as plain strings.
update app.profiles p
set style_archetypes = (
  select coalesce(array_agg(d.name order by d.pos), '{}')
  from (
    select m.name, min(u.ord) as pos
    from unnest(p.style_archetypes) with ordinality as u(v, ord)
    cross join lateral (
      select case u.v
        when 'Romantic' then 'Bohemian'
        when 'Off-duty' then 'Modern'
        when 'Avant-garde' then 'Sculptural'
        else u.v
      end as name
    ) m
    group by m.name
  ) d
)
where p.style_archetypes && array['Romantic', 'Off-duty', 'Avant-garde'];

-- migrate:down
-- Forward-only: fix mistakes with a new migration.
