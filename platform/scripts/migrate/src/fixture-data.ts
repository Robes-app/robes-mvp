// Deterministic legacy rows for rehearsal and tests: three users covering the shapes and the
// defects reference/legacy-data-model.md records (cross-owner rows, orphans, stubs, bad values).
export const NIALL = '11111111-1111-4111-8111-111111111111';
export const BEA = '22222222-2222-4222-8222-222222222222';
export const CAT = '33333333-3333-4333-8333-333333333333';

export const W = {
  jeans: 'aaaaaaaa-0000-4000-8000-000000000001',
  coat: 'aaaaaaaa-0000-4000-8000-000000000002',
  shirt: 'aaaaaaaa-0000-4000-8000-000000000003',
  jumper: 'aaaaaaaa-0000-4000-8000-000000000004',
  loafers: 'aaaaaaaa-0000-4000-8000-000000000005',
};
export const L = {
  office: 'bbbbbbbb-0000-4000-8000-000000000001',
  weekend: 'bbbbbbbb-0000-4000-8000-000000000002',
  suggested: 'bbbbbbbb-0000-4000-8000-000000000003',
  draft: 'bbbbbbbb-0000-4000-8000-000000000004',
};
export const LB = {
  keyPiece: 1720000000001,
  daily: 1720000000002,
  travel: 1720000000003,
  stub: 1720000000004,
  moodboard: 1720000000005,
  weekly: 1720000000006,
  beaBroken: 1720000000007,
};
export const SHARE_TOKEN = 'lg7k2m9x4q';
const CDN = 'https://res.cloudinary.com/robes/image/upload';

const ways = ['Office', 'Weekend', 'Evening'].map((title, i) => ({
  eyebrow: `Way ${i + 1}`,
  title,
  outfit: `The blazer, worn for ${title.toLowerCase()}.`,
  details: 'Sleeves pushed once.',
  accessories: 'Gold hoops.',
  tags: ['work'],
}));

const dlData = {
  fallback: false,
  occasion_label: 'Office',
  headline: 'Quiet power',
  stylist_summary: 'Straight lines, soft texture.',
  transition_tip: 'Swap the loafers for heels after six.',
  palette: ['#1C2A44', '#F5F0E8', '#8B5A3C'],
  look_tags: { climate: 'year_round', wear_for: ['work'], vibe: ['vibe:polished'] },
  steps: [
    {
      title: 'The Anchor',
      items: [
        {
          name: 'Straight jeans',
          category: 'Bottoms',
          brand: '',
          description: 'Dark wash',
          how: 'Cuffed once',
          wardrobe_index: 0,
          retailer_hint: '',
          price_point: '',
          alternates: [],
          wardrobe_match: { id: W.jeans, label: 'Straight jeans', image_url: `${CDN}/jeans.jpg` },
          image_index: 0,
        },
      ],
    },
    {
      title: 'The Canvas',
      items: [
        {
          name: 'White tee',
          category: 'Tops',
          brand: 'COS',
          how: 'Tucked',
          wardrobe_index: -1,
          retailer_hint: 'COS',
          price_point: '€35',
          alternates: [
            { name: 'Silk tee', brand: 'Arket', retailer_hint: 'Arket', price_point: '€69' },
          ],
          wardrobe_match: null,
          image_index: 1,
        },
      ],
    },
    { title: 'Not A Real Step', items: [{ name: 'x' }] },
  ],
  generatedImages: [`${CDN}/daily-0.jpg`, null],
  anchor_date: '2026-09-01',
};

const json = (v: unknown) => `'${JSON.stringify(v).replaceAll("'", "''")}'::jsonb`;

export const FIXTURE_SQL = `
insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at, created_at) values
  ('${NIALL}', 'niall@legacy.test', '{"first_name":"Niall"}', '2026-07-01', '2026-07-01'),
  ('${BEA}', 'bea@legacy.test', '{"first_name":"Bea"}', null, '2026-07-02'),
  ('${CAT}', 'Cat@Legacy.Test', '{}', '2026-07-03', '2026-07-03');

update public.profiles set
  first_name = 'Niall', last_name = 'Maher', style_icons = '{Phoebe Philo,Jane Birkin}',
  budget = 'mid', season = 'Soft Autumn', undertone = 'Warm', contrast = 'Low', body_type = 'Pear',
  headshot_url = '${CDN}/niall-headshot.jpg', full_length_url = 'data:image/jpeg;base64,AAAA',
  colour_analysis = ${json({ season: 'Soft Autumn', undertone: 'Warm' })},
  silhouette_analysis = ${json({ body_type: 'Pear' })},
  style_dna = ${json({
    color_harmony: { archetype_name: 'Soft Autumn' },
    silhouette_proportions: { body_type: 'Pear' },
    user_overrides: { loved_colors: ['Navy'] },
    // Legacy migration 27's palette: unknown ids and values are dropped, never a failed run.
    palette: {
      fam: { blues: 1, nope: 1, reds: 2 },
      shade: { cobalt: -1, navy: 0, x: 1 },
      print: { stripes: 1, camo: -1 },
    },
    style_archetypes: ['Minimalist', 'Classic'],
    brands: ['The Row', 'COS'],
    investment: '€500–1,500',
    // Bust as a bra size (the tape is ignored in bra mode) and the waist (legacy migration 26).
    facts: {
      height_cm: 168,
      size_uk: 10,
      shoe_uk: 5.5,
      age_band: '45–54',
      weight: 60,
      bust_mode: 'bra',
      bust_band: 34,
      bust_cup: 'C',
      bust_cm: 91,
      waist_cm: 72,
    },
    brief: {
      loves: [
        { text: 'A defined waist', source: 'drafted', at: '2026-09-30T10:00:00Z' },
        'One sharp shoe',
        // Shaped like a date, but not one: kept with her profile's time, never an aborted run.
        { text: 'Clean lines', source: 'drafted', at: '2026-13-40T10:00:00Z' },
      ],
      avoids: [{ text: 'Heels', source: 'typed', prompt: 'Heels' }],
      rules: [],
      notes: 'You dress well when the structure is already there.',
      colours: { loved: ['burgundy'], rejected: ['camel'] },
      struck: ['You avoid colour'],
      pending: [
        {
          list: 'rules',
          text: 'No double denim',
          because: 'You said it on “Saturday”',
          from: 'prompt',
        },
      ],
      read_at: '2026-10-01T09:00:00Z',
    },
    memory: {
      entries: [
        { t: '2026-09-28', k: 'verdict', v: 0, on: 'Harbour Dinner', text: 'too safe' },
        { t: '2026-09-27', k: 'swap', out: 'Tan loafers', in: 'Black flats', cat: 'Shoes' },
        { t: '2026-09-26', k: 'wear', look: 'The Thursday one', pieces: 4 },
        { t: '2026-09-25', k: 'strike', text: 'You avoid colour' },
        // An empty swap is skipped (it would break the swap check); a malformed time falls back.
        { t: '2026-09-24', k: 'swap', out: '', cat: 'Shoes' },
        { t: '2026-13-40T99:00:00Z', k: 'ask', text: 'Something warmer' },
      ],
      v: 1,
    },
  })},
  onboarded_at = '2026-07-01', instagram_handle = 'niall.maher',
  notification_prefs = ${json({ looks_ready: true, morning: false, nudges: true, receipts: false, timezone: 'Australia/Sydney' })},
  avatar_id = 'avatar-niall', twin_url = '${CDN}/niall-twin.png', twin_key = 'legacy-twin-key-niall'
where id = '${NIALL}';

update public.profiles set first_name = 'Bea', instagram_handle = '@bea.style!', is_admin = true
where id = '${BEA}';

-- Out-of-range bust and waist are dropped; a twin with no filed model still carries over.
update public.profiles set style_dna = ${json({ facts: { bust_mode: 'cm', bust_cm: 300, waist_cm: 20, bust_band: 34, bust_cup: 'C' } })},
  twin_url = '${CDN}/cat-twin.png'
where id = '${CAT}';

update public.profiles set first_name = '${'C'.repeat(70)}', gender_identity = 'unspecified',
  onboarded_at = '2026-07-03'
where id = '${CAT}';

insert into public.wardrobe_items (id, user_id, label, category, category_l2, category_l3, color, brand,
  image_url, times_worn, hero_position, seasons, occasions, season_band, season_source, price, currency, size, created_at,
  colour_shade, colour_extra, print, material) values
  ('${W.jeans}', '${NIALL}', 'Straight jeans', 'Bottoms', 'Jeans', 'Straight-leg jeans', 'Indigo', 'Levi''s',
   '${CDN}/jeans.jpg', 3, 1, '{Spring,Summer}', '{Work,Date night}', 'spring_summer', 'user', 120, 'eur', '28', '2026-07-05',
   'denim', '{optic,denim,nope,optic,ivory,chalk,jet}', 'stripes', ' Denim '),
  ('${W.coat}', '${NIALL}', 'Camel coat', 'Outerwear', null, null, 'Camel', null,
   '${CDN}/coat.jpg', 0, null, '{}', '{}', 'year_round', 'inferred', null, null, null, '2026-07-06',
   null, '{}', null, 'wool'),
  ('${W.shirt}', '${NIALL}', 'Blue shirt', 'Tops', null, null, 'Blue', null,
   null, 0, null, null, null, 'year_round', 'inferred', null, null, null, '2026-07-07',
   'chartreuse', '{}', 'tartan-ish', 'plastic-ish'),
  ('${W.jumper}', '${CAT}', 'Jumper', 'Knitwear', null, null, null, null,
   null, 0, 11, null, null, 'year_round', 'inferred', null, null, null, '2026-07-08', null, '{}', null, null),
  ('${W.loafers}', '${BEA}', 'Loafers', 'Shoes', null, null, 'Black', null,
   'not-a-url', 0, null, null, null, 'year_round', 'inferred', null, null, null, '2026-07-09', null, '{}', null, null);

insert into public.wishlist_items (id, user_id, label, category, image_url, price, currency, source_type, source_url, created_at,
  color, colour_shade, colour_extra, print, material) values
  ('cccccccc-0000-4000-8000-000000000001', '${NIALL}', 'Trench coat', 'Outerwear', '${CDN}/trench.jpg', 250, 'eur',
   'url', 'https://shop.test/trench', '2026-07-10', 'Sand', 'sand', '{}', 'checks', 'cotton'),
  ('cccccccc-0000-4000-8000-000000000002', '${NIALL}', 'Scarf', 'Accessories', null, null, null,
   'magazine', 'javascript:alert(1)', '2026-07-11', 'Print', null, '{}', null, null);

insert into public.looks (id, user_id, name, name_provisional, tags, note, photo_url, source, climate_band,
  render_url, created_at) values
  ('${L.office}', '${NIALL}', 'Office', false, '{Work}', 'Monday uniform', null, 'manual', 'year_round',
   '${CDN}/office-render.jpg', '2026-08-01'),
  ('${L.weekend}', '${NIALL}', 'Weekend', true, null, null, null, 'something-else', 'year_round', null, '2026-08-02');

-- Legacy migrations 24/25: styling notes on a saved look; a suggested and a draft look (all carried).
update public.looks set styling = ${json({ [W.jeans]: 'cuffed once' })} where id = '${L.office}';
insert into public.looks (id, user_id, name, tags, source, render_url, status, anchor_piece_id, set_id, set_index, created_at) values
  ('${L.suggested}', '${NIALL}', 'Suggested', '{Holiday}', 'generated', '${CDN}/suggested-render.jpg', 'suggested',
   '${W.coat}', '${LB.keyPiece}', 0, '2026-08-03'),
  ('${L.draft}', '${NIALL}', 'Draft', null, 'manual', null, 'draft', null, null, null, '2026-08-04');

insert into public.look_pieces (look_id, wardrobe_item_id, slot, position, role) values
  ('${L.office}', '${W.jeans}', 'bottom', 0, 'anchor'),
  ('${L.office}', '${W.coat}', 'outer', 1, 'bogus-role'),
  ('${L.weekend}', '${W.shirt}', null, null, null),
  ('${L.weekend}', '${W.loafers}', null, 1, null),
  ('${L.draft}', '${W.shirt}', null, 0, null);

insert into public.wears (id, look_id, user_id, worn_on, piece_ids, source, source_id) values
  ('dddddddd-0000-4000-8000-000000000001', '${L.office}', '${NIALL}', '2026-09-01', '{${W.jeans},${W.coat}}', 'looks', null),
  ('dddddddd-0000-4000-8000-000000000002', '${L.office}', '${NIALL}', '2026-09-02', '{${W.jeans}}', 'diary', 'abc'),
  ('dddddddd-0000-4000-8000-000000000003', '${L.office}', '${BEA}', '2026-09-03', '{}', 'looks', null);

insert into public.lookbook_items (id, user_id, type, title, subtitle, img, data, created_at, share_id, is_public) values
  (${LB.keyPiece}, '${NIALL}', 'key-piece', 'navy blazer', 'Three ways', '${CDN}/kp-0.jpg',
   ${json({ kpData: { ways, fallback: false, generatedImages: [`${CDN}/kp-0.jpg`, null, `${CDN}/kp-2.jpg`], photoUrl: null, jobId: 'job-1' } })},
   '2026-08-10', '${SHARE_TOKEN}', true),
  (${LB.daily}, '${NIALL}', 'daily-look', 'Quiet power', '', null, ${json({ dlData })}, '2026-08-11', null, false),
  (${LB.travel}, '${NIALL}', 'travel-edit', 'Lisbon', '', null,
   ${json({ tvData: { trip_label: 'Lisbon', capsule: [], days: [{ day_label: 'Day 1' }] } })}, '2026-08-12', null, false),
  (${LB.stub}, '${NIALL}', 'look', '', '', null, '{}', '2026-08-13', null, false),
  (${LB.moodboard}, '${NIALL}', 'moodboard', 'Autumn', '', null, ${json({ items: [{ note: 'rust' }] })}, '2026-08-14', null, false),
  (${LB.weekly}, '${NIALL}', 'weekly-plan-archived', 'Week 32', '', null, ${json({ wkData: { days: [] } })}, '2026-08-15', null, false),
  (${LB.beaBroken}, '${BEA}', 'key-piece', 'mystery', '', null, ${json({ kpData: { ways: [{ title: 'only one' }] } })}, '2026-08-16', null, false);

insert into public.planned_days (id, user_id, day_date, source_type, source_id, day_index, slot, status, activity, item_ids) values
  ('eeeeeeee-0000-4000-8000-000000000001', '${NIALL}', '2026-10-01', 'look', '${L.office}', 0, 'day', 'planned', 'Board meeting', '["${W.jeans}"]'),
  ('eeeeeeee-0000-4000-8000-000000000002', '${NIALL}', '2026-10-02', 'daily', '${LB.daily}', 0, 'evening', 'worn', null, '[]'),
  ('eeeeeeee-0000-4000-8000-000000000003', '${NIALL}', '2026-10-03', 'look', 'ffffffff-0000-4000-8000-000000000009', 0, 'day', 'planned', null, '[]'),
  ('eeeeeeee-0000-4000-8000-000000000004', '${NIALL}', '2026-10-04', 'travel', '${LB.travel}', 1, 'day', 'planned', 'Day 1', '[]'),
  ('eeeeeeee-0000-4000-8000-000000000005', '${NIALL}', '2026-10-05', 'look', 'not-a-uuid', 0, 'day', 'planned', null, '[]');

insert into public.notifications (user_id, kind, ref, sent_at) values
  ('${NIALL}', 'looks_ready', '${LB.keyPiece}', '2026-08-10'),
  ('${NIALL}', 'week_empty', '2026-W33', '2026-08-12'),
  ('${NIALL}', 'mystery_kind', 'x', '2026-08-13');

insert into public.wardrobe_inbox (id, user_id, retailer, order_ref, subject, from_email, items, status, filed_ids, filed_to, received_at, decided_at) values
  ('99999999-0000-4000-8000-000000000001', '${NIALL}', 'COS', 'A1', 'Your order', 'orders@cos.test',
   ${json([{ label: 'Silk tee', category: 'Tops' }])}, 'held', null, null, '2026-09-10', null),
  ('99999999-0000-4000-8000-000000000002', '${NIALL}', 'Arket', 'B2', 'Your order', 'orders@arket.test',
   ${json([{ label: 'Wool scarf' }])}, 'filed', ${json([W.coat])}, 'wardrobe', '2026-09-11', '2026-09-12');

insert into public.tags (user_id, kind, label, slug, is_seed)
values ('${NIALL}', 'wear_for', 'Date night', public.rb_tag_slug('Date night'), false)
on conflict (user_id, kind, slug) do nothing;
insert into public.tag_pieces (wardrobe_item_id, tag_id, source)
select '${W.jeans}', t.id, 'user' from public.tags t
where t.user_id = '${NIALL}' and t.slug = public.rb_tag_slug('Date night')
on conflict do nothing;
insert into public.tags (user_id, kind, label, slug, is_seed)
values ('${NIALL}', 'wear_for', 'Work', public.rb_tag_slug('Work'), true)
on conflict (user_id, kind, slug) do nothing;
insert into public.tag_looks (look_id, tag_id, source)
select '${L.office}', t.id, 'user' from public.tags t
where t.user_id = '${NIALL}' and t.slug = public.rb_tag_slug('Work')
on conflict do nothing;
`;
