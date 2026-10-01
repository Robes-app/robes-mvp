// Diary harness — boots the real dashboard with Supabase + REST stubbed and
// walks the Diary as its own destination (Diary IA, 2026-09-08; the native
// list, 2026-09-29): the list view (default) fed by planned_days rows — one
// SUMMARY row per day grouped by week, the trip as its own block (title ·
// dates · weather), every row opening the day page — the List | Month
// toggle, the + menu, naming and dressing a day ON ITS PAGE (the picker's
// multi-select, the three doors of an empty day), the empty state, 390px.
// Run manually: npm i --no-save playwright && node scripts/diary_harness.mjs
// Set CHROME_PATH when playwright's bundled browser build isn't installed.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const ROOT = new URL('..', import.meta.url).pathname;
const PORT = 4327;
const BASE = `http://127.0.0.1:${PORT}`;

const server = spawn('node', ['server.js'], {
  cwd: ROOT, env: { ...process.env, PORT: String(PORT), NODE_ENV: 'test' }, stdio: ['ignore', 'pipe', 'pipe'],
});
await new Promise((res) => {
  const on = (b) => { if (String(b).includes('listening') || String(b).includes(String(PORT))) res(); };
  server.stdout.on('data', on); server.stderr.on('data', on);
  setTimeout(res, 2500);
});

const SUPA_STUB = `
window.supabase = {
  createClient(){
    const sess = { user: { id: 'u-test', email: 't@t.co' }, access_token: 'tok' };
    const q = () => ({
      select(){ return this; }, eq(){ return this; }, order(){ return this; },
      single(){ return Promise.resolve({ data: window.__TEST_PROFILE, error: null }); },
      then(r){ return Promise.resolve({ data: [], error: null }).then(r); },
    });
    return {
      auth: {
        onAuthStateChange(){ return { data: { subscription: { unsubscribe(){} } } }; },
        getSession(){ return Promise.resolve({ data: { session: sess } }); },
        signOut(){ return Promise.resolve({}); },
      },
      from(){ return q(); },
    };
  }
};`;

const p2 = (n) => String(n).padStart(2, '0');
const isoOf = (d) => d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
const addD = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return isoOf(d); };
const TODAY = addD(0);
// The fixture keeps to THIS month so every row lands in the visible list:
// the trip starts 2 days out, the daily look is tomorrow, the past is 5
// days back (a month boundary simply moves a row out of view, and the
// harness computes its expectations from the same rows).
const T0 = addD(2), T1 = addD(3), T2 = addD(4), TOM = addD(1), PAST = addD(-5);
const TRIP_ID = 1756900000000, DL_ID = 1756900000001, DL_PAST = 1756900000002;
const IMG = (i) => 'https://res.cloudinary.com/demo/image/upload/w' + i + '.jpg';
const PIECES = ['Cream silk shirt|Tops|Cream', 'Barrel-leg jeans|Bottoms|Navy', 'Flat leather sandals|Shoes|Camel', 'Woven straw tote|Bags|Cream', 'Gold hoops|Accessories|Ochre', 'Bias slip dress|Dresses|Blush']
  .map((s, i) => { const [label, category, color] = s.split('|'); return { id: 'w' + i, user_id: 'u-test', label, category, color, brand: 'Studio', notes: '', image_url: IMG(i), times_worn: i, item_dna: {}, hero_position: null, seasons: null, occasions: null, created_at: new Date(Date.now() - i * 1000).toISOString() }; });
const LOOKS = [
  { id: 'lk-1', user_id: 'u-test', name: 'The Thursday one', name_provisional: false, note: '', photo_url: null, source: 'wear', origin_look_id: null, created_at: '2026-07-20T10:00:00Z', updated_at: '2026-07-20T10:00:00Z' },
  { id: 'lk-2', user_id: 'u-test', name: 'Golf Club Dinner', name_provisional: false, note: '', photo_url: null, source: 'wear', origin_look_id: null, created_at: '2026-07-22T10:00:00Z', updated_at: '2026-07-22T10:00:00Z' },
];
const LP = [
  { look_id: 'lk-1', wardrobe_item_id: 'w0', slot: 'Top', position: 0 }, { look_id: 'lk-1', wardrobe_item_id: 'w1', slot: 'Bottom', position: 1 }, { look_id: 'lk-1', wardrobe_item_id: 'w2', slot: 'Shoe', position: 2 },
  { look_id: 'lk-2', wardrobe_item_id: 'w5', slot: 'Dress', position: 0 }, { look_id: 'lk-2', wardrobe_item_id: 'w2', slot: 'Shoe', position: 1 }, { look_id: 'lk-2', wardrobe_item_id: 'w4', slot: 'Accessory', position: 2 },
];
const PD = [
  { source_type: 'travel', source_id: String(TRIP_ID), day_index: 0, slot: 'day', day_date: T0, status: 'planned', activity: 'Travel and Dinner', headline: 'Golf Club Dinner', thumb_urls: [IMG(0)], item_ids: ['w0', 'w1'], pinned: false, updated_at: '2026-09-01T10:00:00Z' },
  { source_type: 'travel', source_id: String(TRIP_ID), day_index: 1, slot: 'day', day_date: T1, status: 'planned', activity: 'Watching golf, evening in the pub', headline: 'Pub Casual', thumb_urls: [IMG(1)], item_ids: ['w1', 'w2'], pinned: false, updated_at: '2026-09-01T10:00:00Z' },
  { source_type: 'travel', source_id: String(TRIP_ID), day_index: 2, slot: 'day', day_date: T2, status: 'planned', activity: 'Travel home', headline: null, thumb_urls: [], item_ids: [], pinned: false, updated_at: '2026-09-01T10:00:00Z' },
  { source_type: 'daily', source_id: String(DL_ID), day_index: 0, slot: 'day', day_date: TOM, status: 'planned', activity: 'Golf Club Event', headline: 'Daytime Nine', thumb_urls: [IMG(5)], item_ids: ['w5', 'w2', 'w4'], pinned: false, updated_at: '2026-09-02T10:00:00Z' },
  { source_type: 'daily', source_id: String(DL_PAST), day_index: 0, slot: 'day', day_date: PAST, status: 'worn', activity: 'The black one', headline: 'The black one', thumb_urls: [IMG(0)], item_ids: ['w0', 'w1', 'w2', 'w3'], pinned: false, updated_at: '2026-09-01T10:00:00Z' },
].map((r) => Object.assign({ user_id: 'u-test' }, r));

let pass = 0, fail = 0;
function check(name, ok, detail) {
  if (ok) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('FAIL  ' + name + (detail ? '  → ' + String(detail).slice(0, 300) : '')); }
}

async function boot(browser, { width = 1280, seed = true, mode = null } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 1100 } });
  const page = await ctx.newPage();
  const writes = [];
  await page.route('**cdn.jsdelivr.net/**', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: SUPA_STUB }));
  await page.route('**ayowpaknssulsqqvwpqx.supabase.co/**', (r) => {
    const req = r.request(); const u = req.url(); const m = req.method();
    if (m !== 'GET') {
      let body = null; try { body = req.postDataJSON(); } catch (_) { body = req.postData(); }
      writes.push({ method: m, url: u.split('/rest/v1/')[1] || u, body });
      return r.fulfill({ status: 201, contentType: 'application/json', body: '[]' });
    }
    let body = '[]';
    if (u.includes('wardrobe_items')) body = JSON.stringify(PIECES);
    else if (u.includes('/looks')) body = JSON.stringify(LOOKS);
    else if (u.includes('look_pieces')) body = JSON.stringify(LP);
    else if (u.includes('planned_days')) body = JSON.stringify(seed ? PD : []);
    return r.fulfill({ status: 200, contentType: 'application/json', body });
  });
  await page.route('**nominatim**', (r) => r.abort());
  await page.route('**open-meteo**', (r) => r.abort());
  await page.route('**res.cloudinary.com/**', (r) => r.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="#E3DDD0"/></svg>' }));
  await page.addInitScript(({ seed, T0, T2, TRIP_ID, DL_ID, DL_PAST, mode }) => {
    window.__TEST_PROFILE = { first_name: 'Annie', last_name: '', mobile: '', style_icons: [], budget: null, wardrobe_description: '', style_dna: {}, wardrobe_items_count: 6, onboarded_at: '2026-07-01', gender_identity: 'woman' };
    Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true });
    if (mode) localStorage.setItem('rb_diary_mode', mode); else localStorage.removeItem('rb_diary_mode');
    if (seed) {
      const trip = { id: TRIP_ID, type: 'travel-edit', title: 'A trip to Lahinch.', subtitle: 'Lahinch, Ireland', img: null,
        tvData: { destination: 'Lahinch, Ireland', dateFrom: T0, dateTo: T2, dateLine: '', vibe: 'Chic golf vibe', brief: '', plans: [], dayTitles: { 0: 'Travel and Dinner', 1: 'Watching golf, evening in the pub', 2: 'Travel home' }, tripDays: 3,
          weather: { city: 'Lahinch', country: 'Ireland', tempRange: '13–19°C', condition: 'passing showers' },
          capsule: [{ name: 'Cream silk shirt', category: 'Tops', tier: 'keep', wardrobe_match: { id: 'w0', label: 'Cream silk shirt', image_url: 'https://res.cloudinary.com/demo/image/upload/w0.jpg' }, packed: true }, { name: 'Barrel-leg jeans', category: 'Bottoms', tier: 'keep', wardrobe_match: { id: 'w1', label: 'Barrel-leg jeans', image_url: 'https://res.cloudinary.com/demo/image/upload/w1.jpg' }, packed: true }],
          looks: [{ occasion: 'Golf Club Dinner', title: 'Golf Club Dinner', how: '', formula: [{ item_index: 0, role: 'The Canvas', note: '' }, { item_index: 1, role: 'The Anchor', note: '' }], pins: [0] }, { occasion: 'Pub Casual', title: 'Pub Casual', how: '', formula: [{ item_index: 1, role: 'The Anchor', note: '' }], pins: [1] }] } };
      const daily = { id: DL_ID, type: 'daily-look', title: 'Golf Club Event', subtitle: 'Daily look', img: null, dlData: { headline: 'Daytime Nine', occasion_label: 'Golf Club Event', steps: [], anchor_date: null } };
      const past = { id: DL_PAST, type: 'daily-look', title: 'The black one', subtitle: 'Daily look', img: null, dlData: { headline: 'The black one', occasion_label: 'The black one', steps: [], anchor_date: null, worn: true } };
      localStorage.setItem('robes_style_notes__u-test', JSON.stringify([trip, daily, past]));
    }
  }, { seed, T0, T2, TRIP_ID, DL_ID, DL_PAST, mode });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2600);
  return { ctx, page, errs, writes };
}

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });

// The list is a ROLLING WINDOW — today and the thirty days after it, month
// boundaries irrelevant (Annie, 2026-09-10). Every day in it is a row; the
// bare ones read "Name the day" (the native list, 2026-09-29 — naming and
// adding happen on the day page).
const WIN_DAYS = 30;
const held = new Set(PD.map((r) => r.day_date));
const winDates = Array.from({ length: WIN_DAYS + 1 }, (_, i) => addD(i));
const expBare = winDates.filter((d) => !held.has(d));
const inWin = (d) => d >= TODAY && d <= addD(WIN_DAYS);
const mondayOf = (iso) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return isoOf(d); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────────────────
// 1 · The list, seeded (1280)
{
  const { ctx, page, errs, writes } = await boot(browser);
  await page.evaluate(() => window.__rbNavGo('diary'));
  await page.waitForTimeout(900);
  const s = await page.evaluate(() => {
    const q = (sel, root) => (root || document).querySelector(sel);
    const qa = (sel, root) => Array.from((root || document).querySelectorAll(sel));
    const trip = q('#sn-cal .dy-trip');
    const row = (r) => ({
      date: r.dataset.date, l: q('.dy-r-l', r)?.textContent, lNow: q('.dy-r-l', r)?.classList.contains('now'), n: q('.dy-r-n', r)?.textContent,
      title: q('.dy-r-t', r)?.textContent, bare: q('.dy-r-t', r)?.classList.contains('none'), meta: q('.dy-r-m', r)?.textContent || null,
      thumbs: qa('.dy-r-th .dy-th', r).length, ar: !!q('.dy-r-ar', r), opens: /__dyOpenDay/.test(r.getAttribute('onclick') || '') && r.getAttribute('role') === 'button',
    });
    return {
      path: location.pathname,
      eyebrow: q('#sn-eyebrow')?.textContent,
      diaryLit: q('#rb-tn-diary')?.classList.contains('active'),
      list: !!q('#sn-cal .dy-list'),
      grid: !!q('#sn-cal .rb-mv-cal'),
      segOn: qa('#sn-cal .rb-mv-seg button').map((b) => b.classList.contains('on')),
      nav: qa('#sn-cal .rb-mv-nav > button[aria-label]').map((b) => b.getAttribute('aria-label')),
      segInActs: (() => { const sg = q('#sn-cal .rb-mv-nav .rb-mv-seg'), nx = q('#sn-cal .rb-mv-nav .rb-mv-add'); if (!sg || !nx) return false; const a = sg.getBoundingClientRect(), b = nx.getBoundingClientRect(); return Math.abs(a.top - b.top) < 24; })(),
      whiteBlocks: qa('#sn-cal .dy-wk').every((c) => getComputedStyle(c).backgroundColor === 'rgb(255, 255, 255)'),
      hoverLift: (() => { const c = q('#sn-cal .dy-r'); return !!c && /background/.test(getComputedStyle(c).transition || ''); })(),
      title: q('#sn-cal .rb-mv-title')?.textContent,
      count: q('#sn-cal .rb-mast-n')?.textContent,
      rows: qa('#sn-cal .dy-r').map(row),
      weeks: qa('#sn-cal .dy-list > .dy-wk').map((w) => ({ label: q('.dy-wk-h', w)?.textContent, week: w.dataset.week, dates: qa('.dy-r', w).map((r) => r.dataset.date) })),
      trip: trip ? {
        title: q('.dy-trip-hd h3', trip)?.textContent, range: q('.dy-trip-d', trip)?.textContent,
        meta: q('.dy-trip-hd-m', trip)?.textContent, em: q('.dy-trip-hd-m em', trip)?.textContent,
        opens: /__snOpenItem/.test(q('.dy-trip-hd', trip)?.getAttribute('onclick') || ''),
        days: qa('.dy-r', trip).map(row),
      } : null,
      order: qa('#sn-cal .dy-list .dy-wk').map((b) => b.classList.contains('dy-trip') ? 'trip:' + b.closest('[data-trip]')?.dataset.trip : b.dataset.week),
      oldDoors: qa('#sn-cal .dy-inv-in, #sn-cal .dy-pen, #sn-cal .dy-dadd, #sn-cal .dy-look, #sn-cal .dy-tail').length,
      cap: !!q('#sn-cal .rb-mv-cap'),
    };
  });
  check('list · no page errors', errs.length === 0, errs.join(' | ').slice(0, 240));
  check('list · the Diary opens at /diary, lit, on the LIST by default (no month grid, no caption)',
    s.path === '/diary' && s.eyebrow === 'Diary' && s.diaryLit === true && s.list === true && s.grid === false && s.cap === false
      && JSON.stringify(s.segOn) === JSON.stringify([true, false]), JSON.stringify([s.path, s.eyebrow, s.diaryLit, s.list, s.grid, s.segOn]));
  check('list · the header names the window, and the List | Month toggle sits on the line with + (Annie 2026-09-10)',
    s.title === 'The next ' + WIN_DAYS + ' days' && JSON.stringify(s.nav) === JSON.stringify(['Add']) && s.segInActs, JSON.stringify([s.title, s.nav, s.segInActs]));
  check('list · the count names the days the window holds', /^\d+ days? filed$/.test(s.count || ''), s.count);
  // The native row (2026-09-29): weekday + numeral, her title or the faint
  // "Name the day", "N looks · N pieces" only when looks exist, the chevron
  // — and the whole row opens the day.
  const bareRows = s.rows.filter((r) => r.bare);
  check('list · EVERY day in the next 30 is a row; an empty one reads "Name the day", faint, with no count',
    JSON.stringify(bareRows.map((r) => r.date)) === JSON.stringify(expBare) && bareRows.every((r) => r.title === 'Name the day' && r.meta === null && r.thumbs === 0),
    JSON.stringify([bareRows.length, expBare.length, bareRows[0]]));
  check('list · the window starts at today — Today in rose on the first row; the past lives on Month',
    s.rows[0]?.date === TODAY && s.rows[0]?.l === 'Today' && s.rows[0]?.lNow === true && !s.rows.some((r) => r.date === PAST) && s.rows.slice(1).every((r) => /^[A-Z][a-z]{2}$/.test(r.l || '') && !r.lNow),
    JSON.stringify([s.rows[0], s.rows.length]));
  check('list · every row opens the day and carries the chevron; naming, the + and the look rows are the day page\'s now',
    s.rows.length > 7 && s.rows.every((r) => r.opens && r.ar) && s.oldDoors === 0, JSON.stringify([s.rows.length, s.rows.filter((r) => !r.opens || !r.ar).length, s.oldDoors]));
  if (inWin(TOM)) {
    const r = s.rows.find((x) => x.date === TOM);
    check('list · a dressed day is a summary row: weekday, numeral, its thumb, the day\'s title, "N looks · N pieces"',
      r && /^[A-Z][a-z]{2}$/.test(r.l) && r.n === String(+TOM.slice(8, 10)) && r.thumbs === 1 && r.title === 'Golf Club Event' && !r.bare && r.meta === '1 look · 3 pieces', JSON.stringify(r));
  }
  check('list · days group by WEEK: "Rest of this week" first, then the week\'s dates; every row in a block shares its Monday',
    s.weeks.length > 2 && /^(Rest of this|This) week$/.test(s.weeks[0].label || '')
      && s.weeks.slice(1).every((w) => /^\d+( [A-Z][a-z]{2})?(–\d+| – \d+)? ?[A-Z][a-z]{2}$/.test(w.label || '') && !/Sept/.test(w.label))
      && s.weeks.every((w) => w.dates.every((d) => mondayOf(d) === w.week)),
    JSON.stringify(s.weeks.map((w) => [w.label, w.dates.length])));
  if (inWin(T0)) {
    const tripDays = [T0, T1, T2].filter(inWin);
    check('list · a trip is a block: its head names it — title, dates, destination · temp · condition — and opens the travel edit',
      s.trip && s.trip.title === 'A trip to Lahinch.' && /^\d+(–\d+)? [A-Z][a-z]{2}/.test(s.trip.range || '') && !/Sept/.test(s.trip.range || '')
        && /^Lahinch, Ireland · 13–19°C · passing showers$/.test(s.trip.meta || '') && s.trip.em === 'passing showers' && s.trip.opens, JSON.stringify(s.trip));
    check('list · the trip\'s days are the same rows: her title, the look\'s thumb and count; an undressed day reads its title alone; each opens the day',
      s.trip && JSON.stringify(s.trip.days.map((d) => d.date)) === JSON.stringify(tripDays)
        && s.trip.days[0].title === 'Travel and Dinner' && s.trip.days[0].meta === '1 look · 2 pieces' && s.trip.days[0].thumbs === 1 && !s.trip.days[0].bare
        && s.trip.days.every((d) => d.opens && d.ar)
        && (tripDays.length < 3 || (s.trip.days[2].title === 'Travel home' && s.trip.days[2].meta === null && s.trip.days[2].thumbs === 0 && !s.trip.days[2].bare)),
      JSON.stringify(s.trip && s.trip.days));
    check('list · one row per date in order; the trip holds its dates as its own block between the weeks',
      s.order.indexOf('trip:' + TRIP_ID) >= 0 && !bareRows.some((r) => tripDays.includes(r.date))
        && s.rows.every((r, i, a) => i === 0 || r.date > a[i - 1].date) && s.rows.length === winDates.length,
      JSON.stringify([s.order, s.rows.length, winDates.length]));
  }
  check('list · the blocks are white on a hairline and the rows lift on hover (the platform register)', s.whiteBlocks && s.hoverLift, JSON.stringify([s.whiteBlocks, s.hoverLift]));
  // The row IS the door: a tap on its body opens the day page.
  const rowTap = await page.evaluate(async (TOM) => {
    const row = document.querySelector('#sn-cal .dy-r[data-date="' + TOM + '"]');
    row?.querySelector('.dy-r-b')?.click();
    await new Promise((x) => setTimeout(x, 700));
    const pg = document.getElementById('dl-result-page');
    const r = { day: !!pg && pg.style.display !== 'none' && !!pg.querySelector('.dyp-grid'), title: pg?.querySelector('.dlm-title')?.textContent.trim(), back: pg?.querySelector('.rb-ret-pill .lab')?.textContent.trim() };
    window.__rbNavGo('diary');
    await new Promise((x) => setTimeout(x, 700));
    r.listBack = !!document.querySelector('#sn-cal .dy-list');
    return r;
  }, TOM);
  check('list · the whole row opens the day page; the return pill names the month; Diary brings the list back',
    rowTap.day && rowTap.title === 'Golf Club Event' && /^[A-Z][a-z]+ \d{4}$/.test(rowTap.back || '') && rowTap.listBack, JSON.stringify(rowTap));

  // Naming a bare day happens ON ITS PAGE now (the native list): the row
  // opens the day, the title names it, the name has its data home (a 'day'
  // row of its own source), and the list reads it back on return.
  if (expBare.length) {
    const d0 = expBare[0];
    const namedBefore = writes.length;
    const named = await page.evaluate(async (d) => {
      document.querySelector('#sn-cal .dy-r[data-date="' + d + '"]')?.click();
      await new Promise((r) => setTimeout(r, 700));
      const pg = document.getElementById('dl-result-page');
      const r = { open: !!pg && pg.style.display !== 'none', doors: Array.from(pg?.querySelectorAll('.dyp-door .l') || []).map((x) => x.textContent), add: !!pg?.querySelector('.dyp-add'), none: !!pg?.querySelector('.dyp-none') };
      window.__rbDayNameEdit();
      await new Promise((r2) => setTimeout(r2, 100));
      const inp = document.getElementById('dyp-name-in');
      if (!inp) return { ...r, inp: false };
      inp.value = 'Dinner with mum';
      inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await new Promise((r2) => setTimeout(r2, 900));
      r.inp = true;
      r.title = pg.querySelector('.dlm-title')?.textContent.trim();
      r.prompt = document.getElementById('cb-ta')?.value || '';
      window.__rbDayBack();
      await new Promise((r2) => setTimeout(r2, 800));
      const row = document.querySelector('#sn-cal .dy-r[data-date="' + d + '"]');
      r.diaryOpen = document.getElementById('sn-page')?.style.display === 'block';
      r.rowTitle = row?.querySelector('.dy-r-t')?.textContent; r.rowBare = row?.querySelector('.dy-r-t')?.classList.contains('none');
      r.bareLeft = document.querySelectorAll('#sn-cal .dy-r-t.none').length;
      return r;
    }, d0);
    const dayWrite = writes.slice(namedBefore).find((w) => w.method === 'POST' && /^planned_days/.test(w.url) && Array.isArray(w.body) && w.body[0]?.source_type === 'day');
    check('day page · an empty day opens on its three doors (Robes styles one · Create a new look · Choose from your looks), no dashed add card',
      named.open && JSON.stringify(named.doors) === JSON.stringify(['Robes styles one', 'Create a new look', 'Choose from your looks']) && !named.add && !named.none, JSON.stringify(named));
    check('list · naming a bare day on its page keeps the name — the row reads it back, nothing sent to the prompt',
      named.inp && named.title === 'Dinner with mum' && named.prompt === '' && named.diaryOpen && named.rowTitle === 'Dinner with mum' && named.rowBare === false
        && named.bareLeft === expBare.length - 1, JSON.stringify(named));
    check('list · the name has a data home: one planned_days row of its own source (day:<date>)',
      !!dayWrite && dayWrite.body[0].source_id === 'day:' + d0 && dayWrite.body[0].day_date === d0
        && dayWrite.body[0].activity === 'Dinner with mum' && dayWrite.body[0].status === 'planned', JSON.stringify(dayWrite?.body?.[0] || null));
    // Choose from your looks → the picker, headed by her name; the pinned
    // look carries it as the day's title.
    const pinBefore = writes.length;
    const inherit = await page.evaluate(async (d) => {
      document.querySelector('#sn-cal .dy-r[data-date="' + d + '"]')?.click();
      await new Promise((r) => setTimeout(r, 700));
      document.querySelector('#dl-result-page .dyp-door:last-child')?.click();
      await new Promise((r) => setTimeout(r, 300));
      const m = document.getElementById('rb-mv-wear');
      const head = m?.querySelector('#rb-mv-wear-ttl')?.textContent || '';
      const hint = m?.querySelector('.pk-hint')?.textContent || '';
      window.__mvWearPick(d, 'lk-1');
      await new Promise((r) => setTimeout(r, 1200));
      const pg = document.getElementById('dl-result-page');
      const r = { head, hint, modalGone: !document.getElementById('rb-mv-wear'), cards: pg?.querySelectorAll('.dyp-card').length, add: pg?.querySelector('.dyp-add-s')?.textContent };
      window.__rbDayBack();
      await new Promise((r2) => setTimeout(r2, 800));
      const row = document.querySelector('#sn-cal .dy-r[data-date="' + d + '"]');
      r.row = { title: row?.querySelector('.dy-r-t')?.textContent, meta: row?.querySelector('.dy-r-m')?.textContent, thumbs: row?.querySelectorAll('.dy-th').length };
      return r;
    }, d0);
    const pin = writes.slice(pinBefore).find((w) => w.method === 'POST' && /^planned_days/.test(w.url) && Array.isArray(w.body) && w.body[0]?.source_type === 'look');
    check('day page · Choose from your looks opens the picker headed by her name ("Tap looks to add one or several"); the pinned look carries the name',
      /Dinner with mum/.test(inherit.head) && /Tap looks to add one or several/.test(inherit.hint) && inherit.modalGone && !!pin && pin.body[0].day_date === d0 && pin.body[0].activity === 'Dinner with mum'
        && inherit.cards === 1 && inherit.add === 'another moment in the day',
      JSON.stringify([inherit, pin?.body?.[0] || null]));
    check('list · the dressed day reads back: her title, the look\'s thumb, "1 look · 3 pieces"',
      inherit.row.title === 'Dinner with mum' && inherit.row.meta === '1 look · 3 pieces' && inherit.row.thumbs === 1, JSON.stringify(inherit.row));
    // The picker's multi-select (2026-09-29): tap two, the foot adds both;
    // a look already on the day is shown but not offered again.
    const d1 = expBare[1];
    const multiBefore = writes.length;
    const multi = await page.evaluate(async ({ d, d0 }) => {
      window.__mvWear(d);
      await new Promise((r) => setTimeout(r, 200));
      const m = document.getElementById('rb-mv-wear');
      const tiles = Array.from(m?.querySelectorAll('.pk-tile') || []);
      const r = { tiles: tiles.length, hint0: m?.querySelector('.pk-hint')?.textContent, cta0: m?.querySelector('.pk-cta')?.textContent || null };
      tiles[0]?.click(); await new Promise((x) => setTimeout(x, 120));
      r.cta1 = m?.querySelector('.pk-cta')?.textContent;
      r.ticked1 = m?.querySelectorAll('.pk-tile.on').length;
      tiles[1]?.click(); await new Promise((x) => setTimeout(x, 120));
      r.cta2 = m?.querySelector('.pk-cta')?.textContent;
      // the first tile again withdraws it
      m?.querySelector('.pk-tile.on')?.click(); await new Promise((x) => setTimeout(x, 120));
      r.cta1b = m?.querySelector('.pk-cta')?.textContent;
      m?.querySelectorAll('.pk-tile:not(.on)').forEach((t) => t.click()); await new Promise((x) => setTimeout(x, 120));
      r.cta2b = m?.querySelector('.pk-cta')?.textContent;
      m?.querySelector('.pk-cta')?.click();
      await new Promise((x) => setTimeout(x, 1400));
      r.gone = !document.getElementById('rb-mv-wear');
      const row = document.querySelector('#sn-cal .dy-r[data-date="' + d + '"]');
      r.row = { title: row?.querySelector('.dy-r-t')?.textContent, meta: row?.querySelector('.dy-r-m')?.textContent, thumbs: row?.querySelectorAll('.dy-th').length };
      // already on the day — the first named day wears lk-1
      window.__mvWear(d0);
      await new Promise((x) => setTimeout(x, 200));
      const m2 = document.getElementById('rb-mv-wear');
      const had = m2?.querySelector('.pk-tile.had');
      r.had = m2?.querySelectorAll('.pk-tile.had').length; r.hadMeta = had?.querySelector('.m')?.textContent;
      had?.click(); await new Promise((x) => setTimeout(x, 120));
      r.hadTicked = m2?.querySelectorAll('.pk-tile.on').length; r.hadCta = m2?.querySelector('.pk-cta')?.textContent || null;
      window.__mvPkClose();
      return r;
    }, { d: d1, d0 });
    const pins = writes.slice(multiBefore).filter((w) => w.method === 'POST' && /^planned_days/.test(w.url) && Array.isArray(w.body) && w.body[0]?.source_type === 'look' && w.body.some((r) => r.day_date === d1));
    check('picker · tap ticks a look, the foot counts them ("Add 1 look" → "Add 2 looks"), a second tap withdraws one, and Add pins them all',
      multi.tiles === 2 && /Tap looks to add one or several/.test(multi.hint0 || '') && multi.cta0 === null && multi.cta1 === 'Add 1 look' && multi.ticked1 === 1
        && multi.cta2 === 'Add 2 looks' && multi.cta1b === 'Add 1 look' && multi.cta2b === 'Add 2 looks' && multi.gone
        && pins.length === 2 && multi.row.title === '2 looks' && /^2 looks · \d+ pieces$/.test(multi.row.meta || '') && multi.row.thumbs === 2,
      JSON.stringify([multi, pins.length]));
    check('picker · a look already on the day reads "Already on this day", dimmed, and a tap on it ticks nothing',
      multi.had === 1 && multi.hadMeta === 'Already on this day' && multi.hadTicked === 0 && multi.hadCta === null, JSON.stringify([multi.had, multi.hadMeta, multi.hadTicked, multi.hadCta]));
  }
  // The prompt's + menu offers the travel edit too (home)
  const promptMenu = await page.evaluate(async () => {
    window.__rbNavGo('home');
    await new Promise((r) => setTimeout(r, 400));
    const opt = document.getElementById('cb-addopt-tv');
    // :scope — the menu rides inside the home field's row now (the box is
    // the default), so a bare 'span span' matched the row's OUTER span
    // through an ancestor and read both lines as one.
    const labels = Array.from(document.querySelectorAll('#cb-addmenu .hp-addopt')).map((b) => (b.querySelector(':scope > span > span') || b).textContent.trim());
    opt && opt.click();
    await new Promise((r) => setTimeout(r, 200));
    const modal = document.getElementById('tv-brief-modal');
    const r = { had: !!opt, labels, intake: !!modal, sub: /Where are we packing for\?/.test(opt?.textContent || '') };
    modal?.remove();
    return r;
  });
  check('prompt · the + menu carries Add a travel edit after Add a look, and it opens the intake',
    promptMenu.had && promptMenu.sub && promptMenu.intake && promptMenu.labels.indexOf('Add a travel edit') === promptMenu.labels.indexOf('Add a look') + 1,
    JSON.stringify(promptMenu));
  await page.evaluate(() => window.__rbNavGo('diary'));
  await page.waitForTimeout(500);
  // Month is one toggle away, remembered per device
  const tripInMonth = T0.slice(0, 7) === TODAY.slice(0, 7) || T2.slice(0, 7) === TODAY.slice(0, 7);
  const month = await page.evaluate(async () => {
    window.__dySetMode('month');
    await new Promise((r) => setTimeout(r, 150));
    const r = {
      grid: !!document.querySelector('#sn-cal .rb-mv-cal'), list: !!document.querySelector('#sn-cal .dy-list'),
      cap: document.querySelector('#sn-cal .rb-mv-cap')?.textContent || null, segOn: Array.from(document.querySelectorAll('#sn-cal .rb-mv-seg button')).map((b) => b.classList.contains('on')),
      nav: Array.from(document.querySelectorAll('#sn-cal .rb-mv-nav > button[aria-label]')).map((b) => b.getAttribute('aria-label')),
      title: document.querySelector('#sn-cal .rb-mv-title')?.textContent,
      trips: Array.from(document.querySelectorAll('#sn-cal .rb-mv-trip')).map((t) => ({ t: t.querySelector('.t')?.textContent, m: t.querySelector('.m')?.textContent, opens: /__mvBand/.test(t.getAttribute('onclick') || '') })),
      dots: Array.from(document.querySelectorAll('#sn-cal .dc-dots')).map((d) => d.querySelectorAll('i').length + ':' + d.querySelectorAll('i.fut').length),
      stored: localStorage.getItem('rb_diary_mode'),
    };
    window.__rbNavGo('lookbook'); await new Promise((r2) => setTimeout(r2, 300));
    window.__rbNavGo('diary'); await new Promise((r2) => setTimeout(r2, 500));
    r.stillMonth = !!document.querySelector('#sn-cal .rb-mv-cal');
    window.__dySetMode('list'); await new Promise((r2) => setTimeout(r2, 150));
    r.backToList = !!document.querySelector('#sn-cal .dy-list');
    return r;
  });
  check('list · Month is one toggle away and remembered per device',
    month.grid && !month.list && JSON.stringify(month.segOn) === JSON.stringify([false, true])
      && month.stored === 'month' && month.stillMonth && month.backToList, JSON.stringify(month));
  // Beneath the grid: the month's trips as a list (2026-09-29) — else the caption
  check('month · the trips in the month list under the grid (start-date tile, name, range · days · looks) and open the travel edit; a month with none keeps the caption',
    tripInMonth
      ? (month.trips.length === 1 && month.trips[0].t === 'A trip to Lahinch.' && /^\d+(–\d+)? [A-Z][a-z]{2} · 3 days · 2 looks$/.test(month.trips[0].m || '') && month.trips[0].opens && month.cap === null)
      : (month.trips.length === 0 && month.cap === 'Month reads the shape of it. List is where you plan.'),
    JSON.stringify([tripInMonth, month.trips, month.cap]));
  // The dot rule the home strip shares: one per look (three at most), rose up to today, ink ahead
  check('month · a filed day carries one dot per look — rose up to today, ink for a day still ahead',
    month.dots.length >= 2 && month.dots.some((d) => /^\d:0$/.test(d)) && (!tripInMonth || month.dots.some((d) => /^(\d):\1$/.test(d))), JSON.stringify([tripInMonth, month.dots]));   // the ahead-dot only when a fixture day still ahead falls in this month (the fixture runs 2 days out — a month end moves it out of the grid)
  // ‹ › are the MONTH's (Annie, 2026-09-10): the list scrolls a rolling
  // window, so paging only exists where it means something.
  check('month · the month names itself and ‹ › page it — the pair the list does not carry',
    JSON.stringify(month.nav) === JSON.stringify(['Previous month', 'Next month', 'Add']) && /^[A-Z][a-z]+ \d{4}$/.test(month.title || ''),
    JSON.stringify([month.nav, month.title]));
  check('list · no page errors after the walk', errs.length === 0, errs.join(' | ').slice(0, 240));
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────
// 2 · Empty (nothing planned this month)
{
  const { ctx, page, errs } = await boot(browser, { seed: false });
  await page.evaluate(() => window.__rbNavGo('diary'));
  await page.waitForTimeout(900);
  const e = await page.evaluate(async () => {
    const em = document.querySelector('#sn-cal .dy-empty');
    const r = {
      had: !!em, h: em?.querySelector('h3')?.textContent, p: em?.querySelector('p')?.textContent, cta: em?.querySelector('.dy-empty-cta')?.textContent,
      rows: document.querySelectorAll('#sn-cal .dy-r').length, bare: document.querySelectorAll('#sn-cal .dy-r-t.none').length,
      darkFills: Array.from(document.querySelectorAll('#sn-cal button')).filter((b) => getComputedStyle(b).backgroundColor === 'rgb(32, 32, 33)').length,
    };
    em?.querySelector('.dy-empty-cta')?.click();
    await new Promise((r2) => setTimeout(r2, 200));
    r.intake = !!document.getElementById('tv-brief-modal');
    r.diaryStill = document.getElementById('sn-page')?.style.display === 'block';
    document.getElementById('tv-brief-modal')?.remove();
    return r;
  });
  const expEmptyRows = winDates.length;
  check('empty · the design\'s empty state: "Nothing planned yet.", the line, Plan a trip',
    e.had && /Nothing planned/.test(e.h || '') && /yet\./.test(e.h || '') && /The diary keeps the dates; the lookbook keeps the looks\./.test(e.p || '') && e.cta === 'Plan a trip', JSON.stringify(e));
  check('empty · Plan a trip is the ONE dark fill and opens the travel intake over the Diary',
    e.darkFills === 1 /* the CTA alone — the List | Month toggle is a view, warm-selected (nav architecture 2026-09-10) */ && e.intake && e.diaryStill, JSON.stringify(e));
  check('empty · the window\'s days still follow beneath — all thirty-one of them, each "Name the day"', e.rows === expEmptyRows && e.bare === expEmptyRows, JSON.stringify([e.rows, e.bare, expEmptyRows]));
  check('empty · no page errors', errs.length === 0, errs.join(' | ').slice(0, 240));
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────
// 3 · 390px
{
  const { ctx, page, errs } = await boot(browser, { width: 390 });
  await page.evaluate(() => window.__rbNavGo('diary'));
  await page.waitForTimeout(900);
  const m = await page.evaluate(() => {
    const sn = document.getElementById('sn-page');
    const row = document.querySelector('#sn-cal .dy-r');
    const trip = document.querySelector('#sn-cal .dy-trip');
    const seg = document.querySelector('#sn-cal .rb-mv-seg'), add = document.querySelector('#sn-cal .rb-mv-add');
    return {
      list: !!document.querySelector('#sn-cal .dy-list'),
      noOverflow: sn.scrollWidth <= sn.clientWidth + 1,
      rowFits: row ? row.getBoundingClientRect().right <= 390 && row.getBoundingClientRect().height >= 44 : false,
      tripFits: trip ? trip.getBoundingClientRect().right <= 390 : true,
      dock: document.getElementById('rb-dock-diary')?.classList.contains('active'),
      // the design's phone head: the toggle as a full track beside a 40px +, the window's name beneath
      segTrack: seg && add ? seg.getBoundingClientRect().width > 200 && add.getBoundingClientRect().width >= 40 && Math.abs(seg.getBoundingClientRect().top - add.getBoundingClientRect().top) < 12 : false,
      titleBelow: (() => { const t = document.querySelector('#sn-cal .rb-mv-title'); return !!t && !!seg && t.getBoundingClientRect().top > seg.getBoundingClientRect().bottom; })(),
    };
  });
  check('390px · the list renders one column wide with no horizontal overflow, rows at 44px; the dock lights Diary',
    m.list && m.noOverflow && m.rowFits && m.tripFits && m.dock === true, JSON.stringify(m));
  check('390px · the head is the design\'s: the List | Month track with the +, the window\'s name as an eyebrow beneath', m.segTrack && m.titleBelow, JSON.stringify(m));
  check('390px · no page errors', errs.length === 0, errs.join(' | ').slice(0, 240));
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────
// 4 · The day page (Annie, 2026-09-09) — a diary day opens on its own page:
// the date, its name, every look on it as a card. The list row is the door.
{
  const { ctx, page, errs, writes } = await boot(browser);
  await page.evaluate(() => window.__rbNavGo('diary'));
  await page.waitForTimeout(900);
  const d = await page.evaluate(async (TOM) => {
    document.querySelector('#sn-cal .dy-r[data-date="' + TOM + '"]').click();
    await new Promise((r) => setTimeout(r, 700));
    const pg = document.getElementById('dl-result-page');
    const q = (s) => pg && pg.querySelector(s);
    return {
      diaryHidden: document.getElementById('sn-page')?.style.display === 'none',
      visible: !!pg && pg.style.display !== 'none',
      eyebrow: q('.dlm-eyebrow')?.textContent, title: q('.dlm-title')?.textContent.trim(),
      sec: q('.dyp-sec-l')?.textContent, stat: q('.dyp-sec-r')?.textContent,
      cards: Array.from(pg ? pg.querySelectorAll('.dyp-card') : []).map((c) => (c.querySelector('.dyp-ey > span:first-child')?.textContent + ' · ' + c.querySelector('.dyp-name')?.textContent + ' · ' + c.querySelector('.dyp-n')?.textContent)),
      add: !!q('.dyp-add'), doors: pg ? pg.querySelectorAll('.dyp-door').length : -1,
      diaryLit: document.getElementById('rb-tn-diary')?.classList.contains('active'),
    };
  }, TOM);
  check('day page · the row opens the day: its name, the date, Looks planned, its look as a card, + Add a look (no doors once a look exists), the Diary still lit',
    d.diaryHidden && d.visible && d.title === 'Golf Club Event' && /^[A-Z][a-z]+day \d+ [A-Z]/.test(d.eyebrow || '') && d.sec === 'Looks planned'
      && d.stat === '1 look · 3 pieces filed' && JSON.stringify(d.cards) === JSON.stringify(['Look 1 · Daytime Nine · 3 pieces']) && d.add && d.doors === 0 && d.diaryLit,
    JSON.stringify(d));
  // The past is Month's now — the list starts at today (Annie, 2026-09-10),
  // so a filed past day is opened from its month cell. A past day carries
  // no forecast (nothing left to dress for).
  const p = await page.evaluate(async (PAST) => {
    window.__rbNavGo('diary');
    await new Promise((r) => setTimeout(r, 700));
    window.__dySetMode('month');
    await new Promise((r) => setTimeout(r, 500));
    const sel = '#sn-cal [onclick*="__mvCell(\'' + PAST + '\')"]';
    if (!document.querySelector(sel)) { window.__mvNav(-1); await new Promise((r) => setTimeout(r, 700)); }
    const cell = document.querySelector(sel);
    cell?.click();
    await new Promise((r) => setTimeout(r, 700));
    const pg = document.getElementById('dl-result-page');
    const q = (s) => pg && pg.querySelector(s);
    const r = { cell: !!cell, visible: !!pg && pg.style.display !== 'none', title: q('.dlm-title')?.textContent.trim(), sec: q('.dyp-sec-l')?.textContent, worn: q('.dyp-card .dyp-worn')?.textContent, cards: pg ? pg.querySelectorAll('.dyp-card').length : 0, wx: !!q('.dyp-wx') };
    window.__dySetMode('list');
    return r;
  }, PAST);
  check('day page · a past day opens from its month cell: Looks filed, the look carries Worn, no forecast',
    p.cell && p.visible && p.title === 'The black one' && p.sec === 'Looks filed' && /Worn/.test(p.worn || '') && p.cards === 1 && !p.wx, JSON.stringify(p));
  const lr = await page.evaluate(async (TOM) => {
    window.__rbNavGo('diary');
    await new Promise((r) => setTimeout(r, 700));
    const row = document.querySelector('#sn-cal .dy-r[data-date="' + TOM + '"]');
    row?.querySelector('.dy-r-th')?.click();
    await new Promise((r) => setTimeout(r, 700));
    const pg = document.getElementById('dl-result-page');
    return { visible: !!pg && pg.style.display !== 'none', grid: !!pg?.querySelector('.dyp-grid'), title: pg?.querySelector('.dlm-title')?.textContent.trim(), back: pg?.querySelector('.rb-ret-pill .lab')?.textContent.trim(), diaryHidden: document.getElementById('sn-page')?.style.display === 'none' };
  }, TOM);
  // The return pill names the month the day lives in (nav architecture 2026-09-10)
  check('day page · the row\'s thumb opens the DAY too (the look is reached from the day page); the return pill names the month',
    lr.visible && lr.grid && lr.title === 'Golf Club Event' && /^[A-Z][a-z]+ \d{4}$/.test(lr.back || '') && lr.diaryHidden, JSON.stringify(lr));
  const bk = await page.evaluate(async () => {
    document.querySelector('#dl-result-page .rb-ret-pill').click();
    await new Promise((r) => setTimeout(r, 700));
    return { diary: document.getElementById('sn-page')?.style.display === 'block' && document.getElementById('sn-page')?.classList.contains('rb-cal-on'), dlHidden: document.getElementById('dl-result-page')?.style.display === 'none' };
  });
  check('day page · the Diary door lands back on the Diary', bk.diary && bk.dlHidden, JSON.stringify(bk));
  // The month view: a cell opens the day straight away — no peek in between
  const mc = await page.evaluate(async (TOM) => {
    window.__dySetMode('month');
    await new Promise((r) => setTimeout(r, 500));
    const cell = document.querySelector('#sn-cal .rb-dc[onclick*="__mvCell(\'' + TOM + '\')"], #sn-cal [onclick*="__mvCell(\'' + TOM + '\')"]');
    if (!cell) return { cell: false, sample: Array.from(document.querySelectorAll('#sn-cal [onclick*="__mvCell"]')).slice(0, 2).map((c) => c.getAttribute('onclick')) };
    cell.click();
    await new Promise((r) => setTimeout(r, 700));
    const pg = document.getElementById('dl-result-page');
    return { cell: true, peek: !!document.getElementById('rb-dpk'), visible: !!pg && pg.style.display !== 'none', grid: !!pg?.querySelector('.dyp-grid'), title: pg?.querySelector('.dlm-title')?.textContent.trim(), back: pg?.querySelector('.rb-ret-pill .lab')?.textContent.trim() };
  }, TOM);
  // A TRIP day is still a day (Annie, 2026-09-10): its month cell lands on
  // the day page carrying the trip's looks + the button out to the travel
  // edit, never the trip's own console with the look in edit mode.
  const tc = await page.evaluate(async (T0) => {
    window.__rbNavGo('diary');
    await new Promise((r) => setTimeout(r, 700));
    window.__dySetMode('month');
    await new Promise((r) => setTimeout(r, 500));
    // the trip may sit in next month (a month boundary is not a bug)
    const selT = '#sn-cal [onclick*="__mvCell(\'' + T0 + '\')"]';
    if (!document.querySelector(selT)) { window.__mvNav(1); await new Promise((r) => setTimeout(r, 700)); }
    const cell = document.querySelector(selT);
    cell?.click();
    await new Promise((r) => setTimeout(r, 800));
    const pg = document.getElementById('dl-result-page');
    const q = (sel) => pg && pg.querySelector(sel);
    const r = {
      cell: !!cell,
      day: !!pg && pg.style.display !== 'none' && !!q('.dyp-grid'),
      tvClosed: document.getElementById('tv-result-page')?.style.display !== 'block',
      title: q('.dlm-title')?.textContent.trim(),
      cards: Array.from(pg ? pg.querySelectorAll('.dyp-card') : []).map((c) => q('.dyp-name', c) ? c.querySelector('.dyp-name').textContent : ''),
      tripLine: q('.dyp-trip')?.textContent.replace(/\s+/g, ' ').trim(), tripOpens: /_rbOpenMoment/.test(q('.dyp-trip')?.getAttribute('onclick') || ''),
      x: pg ? pg.querySelectorAll('.dyp-card .dyp-x').length : -1,
      wx: q('.dyp-wx')?.textContent.replace(/\s+/g, ' ').trim(),
    };
    window.__dySetMode('list');
    return r;
  }, T0);
  check('day page · a TRIP day opens the day page — its looks as cards, "Part of {trip} · Travel edit ›" as the door, no ✕ on a packed look',
    tc.cell && tc.day && tc.tvClosed && tc.title === 'Travel and Dinner'
      && JSON.stringify(tc.cards) === JSON.stringify(['Golf Club Dinner']) && /^Part of A trip to Lahinch\.\s*Travel edit ›$/.test(tc.tripLine || '') && tc.tripOpens && tc.x === 0,
    JSON.stringify(tc));
  // The trip's own forecast is the day's weather there, as one plain line —
  // a day holding one pinned look filed none of its own, and the header
  // read broken.
  check('day page · a trip day reads the DESTINATION\'s weather as one line', tc.wx === 'Lahinch, Ireland · passing showers · 13–19°C', tc.wx);
  check('day page · a month cell opens the day directly — no peek; the return pill names the month',
    mc.cell && mc.peek === false && mc.visible && mc.grid && mc.title === 'Golf Club Event' && /^[A-Z][a-z]+ \d{4}$/.test(mc.back || ''), JSON.stringify(mc));
  // The empty day's other two doors: the composer takes the day (Save to
  // {weekday}); Robes styles one opens the BRIEF sheet (2026-09-29) — the
  // date, "What's on?" chips, her name for the day as the words — and the
  // CTA hands the brief to the standing route: __dlSubmit with the date →
  // /api/daily → the composer with the day attached. Nothing is filed.
  const dailyPosts = [];
  await page.route('**/api/daily', (r) => {
    try { dailyPosts.push(r.request().postDataJSON()); } catch (_) { dailyPosts.push(null); }
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ headline: 'A dinner look.', occasion_label: 'Dinner out', stylist_summary: 'Ease.', look_tags: { climate: 'year_round', wear_for: ['evening'], vibe: ['chic'] },
      steps: [{ title: 'The Canvas', items: [{ name: 'Cream silk shirt', category: 'Tops', wardrobe_match: { id: 'w0', label: 'Cream silk shirt', image_url: null, color: '' } }, { name: 'Barrel-leg jeans', category: 'Bottoms', wardrobe_match: { id: 'w1', label: 'Barrel-leg jeans', image_url: null, color: '' } }] }] }) });
  });
  const doors = await page.evaluate(async (d) => {
    window.__rbCtx = { city: 'Dublin', tempRange: '12–16°C', condition: 'cloudy', hint: 'A light layer' };
    window.__rbNavGo('diary'); await new Promise((r) => setTimeout(r, 600));
    document.querySelector('#sn-cal .dy-r[data-date="' + d + '"]')?.click();
    await new Promise((r) => setTimeout(r, 700));
    window.__rbDayNameEdit(); await new Promise((r) => setTimeout(r, 100));
    const inp = document.getElementById('dyp-name-in');
    if (inp) { inp.value = 'Lunch out'; inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); }
    await new Promise((r) => setTimeout(r, 700));
    const pg = document.getElementById('dl-result-page');
    const r = { doors: pg?.querySelectorAll('.dyp-door').length };
    pg?.querySelectorAll('.dyp-door')[1]?.click();
    await new Promise((r2) => setTimeout(r2, 900));
    const sn = document.getElementById('sn-page');
    r.composer = !!sn && sn.style.display !== 'none' && !!sn.querySelector('.rb-lk-composer');
    r.save = (sn?.textContent || '').match(/Save to [A-Z][a-z]+day/)?.[0] || null;
    // back to the day, then the Robes door → the sheet
    window.__rbDayOpen(d, { from: 'diary' }); await new Promise((r2) => setTimeout(r2, 600));
    document.querySelector('#dl-result-page .dyp-door')?.click();
    await new Promise((r2) => setTimeout(r2, 400));
    const rs = document.getElementById('rb-lp');
    r.sheet = !!rs;
    r.title = rs?.querySelector('.ttl')?.textContent || null;
    r.meta = rs?.querySelector('.meta')?.textContent || null;
    r.chips = rs?.querySelectorAll('.rs-chip, .rb-lp-chip').length ?? null;   // no chips in the box — ever
    r.input = rs?.querySelector('#rb-lp-in')?.value;
    r.dayStill = document.getElementById('dl-result-page')?.style.display !== 'none';
    r.ink = Array.from(rs?.querySelectorAll('button') || []).filter((b) => getComputedStyle(b).backgroundColor === 'rgb(32, 32, 33)').length;
    // her words replace the prefill; Enter sends
    window.__rbLpText('Dinner out with Mary in town');
    const rin = document.getElementById('rb-lp-in'); rin.value = 'Dinner out with Mary in town';
    rin.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await new Promise((r2) => setTimeout(r2, 2600));
    r.sheetGone = !document.getElementById('rb-lp');
    const sn2 = document.getElementById('sn-page');
    r.composer2 = !!sn2 && sn2.style.display !== 'none' && !!sn2.querySelector('.rb-lk-composer');
    r.save2 = (sn2?.textContent || '').match(/Save to [A-Z][a-z]+day/)?.[0] || null;
    r.back2 = sn2?.querySelector('.rb-ret .rb-ret-pill .lab')?.textContent || null;
    r.backWord = new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short' }) + ' ' + Number(d.slice(8, 10));
    return r;
  }, expBare[2]);
  check('day page · Create a new look opens the composer with the day attached (Save to {weekday})', doors.doors === 3 && doors.composer && !!doors.save, JSON.stringify(doors));
  check('day page · Robes styles one opens the look prompt box OVER the day in its new-look mode: “A new look”, the date as the meta line, NO chips, her name for the day prefilled in the one field, the send arrow lit by it (the one ink)',
    doors.sheet && doors.dayStill && doors.title === 'A new look' && /\d/.test(doors.meta || '') && doors.chips === 0 && doors.input === 'Lunch out' && doors.ink === 1, JSON.stringify(doors));
  check('day page · Enter hands her words to /api/daily with the date, and lands in the composer with the day attached (Save to {weekday}, ‹ the day) — nothing written',
    doors.sheetGone && dailyPosts.length === 1 && dailyPosts[0]?.prompt === 'Dinner out with Mary in town' && doors.composer2 && !!doors.save2 && doors.back2 && doors.back2.indexOf(doors.backWord) === 0 && !writes.some((w) => /planned_days|lookbook_items|looks\b/.test(w.url) && w.method === 'POST' && JSON.stringify(w.body).includes('Dinner out')), JSON.stringify([doors, dailyPosts[0]?.prompt, dailyPosts[0]?.anchorDate]));
  check('day page · no page errors', errs.length === 0, errs.join(' | ').slice(0, 240));
  await ctx.close();
}

await browser.close();
server.kill();
console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
