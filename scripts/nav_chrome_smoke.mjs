// Nav chrome smoke — the navigation architecture (Navigation_Architecture,
// 2026-09-10): three questions in three permanent slots. Band one (the nav)
// is lit by the section she ENTERED through and stays lit for the whole
// journey; band two (48px, full-bleed) holds ONE return pill naming the
// previous screen + the set position, and is absent on the four roots;
// band three is the title block (eyebrow = the kind, title, pencil / star
// after it, meta). Index mastheads are one tracked-caps line with hairline
// pills; nothing on these screens is filled ink. ≤767px the two web bands
// collapse into the nav bar. Boots on the piece harness's seed.
// Run manually: npm i --no-save playwright && node scripts/nav_chrome_smoke.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const ROOT = new URL('..', import.meta.url).pathname;
const PORT = 4393;
const BASE = `http://127.0.0.1:${PORT}`;

const server = spawn('node', ['server.js'], {
  cwd: ROOT, env: { ...process.env, PORT: String(PORT), NODE_ENV: 'test' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
await new Promise((res) => {
  const on = (b) => { if (String(b).includes(String(PORT)) || String(b).includes('listening')) res(); };
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

const PIECES = [
  { id: 'w-top1', label: 'Cream silk shirt',   category: 'Tops',        color: 'Cream',  price: 180, times_worn: 8, brand: 'Arket', notes: 'Close-fitting base under the open shirt.' },
  { id: 'w-top2', label: 'Ribbed white tank',  category: 'Tops',        color: 'White',  price: 40 },
  { id: 'w-bot1', label: 'Barrel-leg jeans',   category: 'Bottoms',     color: 'Navy',   price: 220 },
  { id: 'w-bot2', label: 'Linen shorts',       category: 'Bottoms',     color: 'Cream',  price: 90 },
  { id: 'w-sho1', label: 'Flat leather sandals', category: 'Shoes',     color: 'Camel',  price: 160 },
  { id: 'w-sho2', label: 'Tan leather slides', category: 'Shoes',       color: 'Camel',  price: 120 },
  { id: 'w-bag1', label: 'Woven straw tote',   category: 'Bags',        color: 'Cream',  price: 140 },
  { id: 'w-acc1', label: 'Gold hoops',         category: 'Accessories', color: 'Ochre',  price: 60 },
];
const wardrobe = () => PIECES.map((p, i) => ({
  user_id: 'u-test', brand: 'Studio', notes: '', times_worn: 0, item_dna: {}, hero_position: null, seasons: null, occasions: null,
  image_url: 'https://res.cloudinary.com/demo/image/upload/' + p.id + '.jpg',
  created_at: new Date(Date.now() - i * 1000).toISOString(),
  ...p,
}));
const SEED_LOOKS = [
  { id: 'lk-1', user_id: 'u-test', name: 'The Thursday one', name_provisional: false, note: 'Cream silk shirt with the barrel-leg jeans.', photo_url: null, source: 'wear', origin_look_id: null, created_at: '2026-07-20T10:00:00Z' },
  { id: 'lk-2', user_id: 'u-test', name: 'The tank one', name_provisional: true, note: '', photo_url: null, source: 'wear', origin_look_id: null, created_at: '2026-07-22T10:00:00Z' },
];
const SEED_PIECES = [
  { look_id: 'lk-1', wardrobe_item_id: 'w-top1', slot: 'Top', position: 0 },
  { look_id: 'lk-1', wardrobe_item_id: 'w-bot1', slot: 'Bottom', position: 1 },
  { look_id: 'lk-1', wardrobe_item_id: 'w-sho1', slot: 'Shoe', position: 2 },
  { look_id: 'lk-1', wardrobe_item_id: 'w-bag1', slot: 'Bag', position: 3 },
  { look_id: 'lk-2', wardrobe_item_id: 'w-top2', slot: 'Top', position: 0 },
  { look_id: 'lk-2', wardrobe_item_id: 'w-bot2', slot: 'Bottom', position: 1 },
  { look_id: 'lk-2', wardrobe_item_id: 'w-sho2', slot: 'Shoe', position: 2 },
];
const SEED_WEARS = [
  { id: 'we-1', look_id: 'lk-1', user_id: 'u-test', worn_on: '2026-07-23', piece_ids: ['w-top1', 'w-bot1', 'w-sho1', 'w-bag1'], source: 'looks', source_id: null },
  { id: 'we-2', look_id: 'lk-1', user_id: 'u-test', worn_on: '2026-07-09', piece_ids: ['w-top1', 'w-bot1', 'w-sho2', 'w-bag1'], source: 'looks', source_id: null },
  { id: 'we-3', look_id: 'lk-2', user_id: 'u-test', worn_on: '2026-07-30', piece_ids: ['w-top2', 'w-bot2', 'w-sho2'], source: 'looks', source_id: null },
];
const SEED_WISH = [
  { id: 'wl-1', user_id: 'u-test', label: 'Camel wool coat', brand: 'Toteme', category: 'Outerwear', color: 'Camel', price: 690,
    image_url: 'https://res.cloudinary.com/demo/image/upload/wl-1.jpg', note: 'For the winter edit.', source_type: 'robes', source_label: null, created_at: '2026-08-01T10:00:00Z' },
];
const SEED_LOOKBOOK = [
  { id: 1756000000000, user_id: 'u-test', type: 'daily-look', title: 'Coffee with Mum', subtitle: '', img: null, created_at: '2026-08-24T09:00:00Z',
    data: { dlData: { headline: 'Coffee with Mum.', occasion_label: 'Coffee with Mum', anchor_date: '2026-08-24', worn: true, stylist_summary: '', palette: [],
      steps: [{ title: 'The Anchor', items: [{ name: 'Cream silk shirt', category: 'Tops', wardrobe_index: 0, wardrobe_match: { id: 'w-top1', label: 'Cream silk shirt', image_url: null, color: 'Cream' }, alternates: [] }] }] } } },
];
const DAILY_RESP = {
  headline: 'Coffee run, elevated.', occasion_label: 'a coffee run', stylist_summary: 'The shirt leads; everything else stays quiet.',
  transition_tip: '', palette: ['#EDE7DE'],
  steps: [
    { title: 'The Anchor', items: [{ name: 'Cream silk shirt', category: 'Tops', description: '', wardrobe_index: 0,
      wardrobe_match: { id: 'w-top1', label: 'Cream silk shirt', image_url: 'https://res.cloudinary.com/demo/image/upload/w-top1.jpg', color: 'Cream' }, alternates: [] }] },
    { title: 'The Canvas', items: [{ name: 'Barrel-leg jeans', category: 'Bottoms', description: '', wardrobe_index: 2,
      wardrobe_match: { id: 'w-bot1', label: 'Barrel-leg jeans', image_url: 'https://res.cloudinary.com/demo/image/upload/w-bot1.jpg', color: 'Navy' }, alternates: [] }] },
    { title: 'The Texture', items: [{ name: 'Charcoal knit cardigan', category: 'Outerwear', description: '', wardrobe_index: -1, retailer_hint: 'Arket', price_point: '€89', alternates: [] }] },
    { title: 'The Accents', items: [{ name: 'Woven raffia tote', category: 'Bags', description: '', wardrobe_index: -1, retailer_hint: 'Zara', price_point: '€49', alternates: [] }] },
  ],
};
const STYLE_RESP = {
  ways: [
    { eyebrow: 'One', title: 'Way One', outfit: 'x', details: 'x', accessories: 'x' },
    { eyebrow: 'Two', title: 'Way Two', outfit: 'x', details: 'x', accessories: 'x' },
    { eyebrow: 'Three', title: 'Way Three', outfit: 'x', details: 'x', accessories: 'x' },
  ],
  generatedImages: [null, null, null], fallback: false, photoUrl: null,
};

async function boot(browser, { width = 1280, path = '/dashboard' } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 1100 }, hasTouch: width < 768 });
  const page = await ctx.newPage();
  const writes = [];
  const api = { style: [], daily: 0 };
  await page.route('**cdn.jsdelivr.net/**', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: SUPA_STUB }));
  await page.route('**ayowpaknssulsqqvwpqx.supabase.co/**', (r) => {
    const req = r.request(); const u = req.url(); const m = req.method();
    if (m !== 'GET') {
      let body = null; try { body = req.postDataJSON(); } catch (_) { body = req.postData(); }
      writes.push({ method: m, url: u.split('/rest/v1/')[1] || u, body });
      return r.fulfill({ status: 201, contentType: 'application/json', body: '[]' });
    }
    let body = '[]';
    if (u.includes('wardrobe_items')) body = JSON.stringify(wardrobe());
    else if (u.includes('wishlist_items')) body = JSON.stringify(SEED_WISH);
    else if (u.includes('lookbook_items')) body = JSON.stringify(SEED_LOOKBOOK);
    else if (u.includes('/looks')) body = JSON.stringify(SEED_LOOKS);
    else if (u.includes('look_pieces')) body = JSON.stringify(SEED_PIECES);
    else if (u.includes('/wears')) body = JSON.stringify(SEED_WEARS);
    return r.fulfill({ status: 200, contentType: 'application/json', body });
  });
  await page.route('**res.cloudinary.com/**', (r) => r.fulfill({ status: 200, contentType: 'image/png',
    body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64') }));
  await page.route('**nominatim**', (r) => r.abort());
  await page.route('**open-meteo**', (r) => r.abort());
  await page.route('**/api/wardrobe/upload', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url: 'https://res.cloudinary.com/demo/image/upload/replaced.jpg' }) }));
  await page.route('**/api/daily', async (r) => { api.daily++; r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(DAILY_RESP) }); });
  await page.route('**/api/style', async (r) => {
    try { api.style.push(r.request().postDataJSON()); } catch (_) { api.style.push(null); }
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(STYLE_RESP) });
  });
  await page.addInitScript(() => {
    window.__TEST_PROFILE = {
      first_name: 'Annie', last_name: '', mobile: '', style_icons: [], budget: null,
      wardrobe_description: '', style_dna: {}, wardrobe_items_count: 8,
      onboarded_at: '2026-07-01', gender_identity: 'woman',
    };
    Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true });
  });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2800);
  return { ctx, page, errs, writes, api };
}

// ── Fixtures for the screens the piece boot does not seed ────────────────
// A trip whose Travel diary holds a saved Look (lookId → lk-1) pinned to
// day 1, so a look row is a door to the Look detail (design 08).
const TRIP = {
  trip_label: 'LAHINCH · JULY', headline: 'A trip to Lahinch.', location_vibe: 'Wild Atlantic ease',
  stylist_summary: 'A tight case for the coast.', suitcase_note: '', palette: ['#8A8078'],
  destination: 'Lahinch', dateFrom: '2026-07-31', dateTo: '2026-08-03', dateLine: '31 Jul – 3 Aug',
  tripDays: 4, plans: [], vibe: 'Chic, cool',
  weather: { city: 'Lahinch', tempRange: '14–19°C', condition: 'passing showers' },
  dayTitles: { 1: 'Dinner out' },
  capsule: [
    { name: 'Cream silk shirt', tier: 'Foundations & Tailoring', category: 'Tops', brand: 'Arket', description: '', reason: '', wardrobe_index: 0, retailer_hint: '', price_point: '', wardrobe_match: { id: 'w-top1', label: 'Cream silk shirt', image_url: null, color: 'Cream' } },
    { name: 'Barrel-leg jeans', tier: 'Foundations & Tailoring', category: 'Bottoms', brand: 'Studio', description: '', reason: '', wardrobe_index: 2, retailer_hint: '', price_point: '', wardrobe_match: { id: 'w-bot1', label: 'Barrel-leg jeans', image_url: null, color: 'Navy' } },
  ],
  left_behind: [],
  looks: [
    { imported: true, lookId: 'lk-1', occasion: 'Dinner out', title: 'The Thursday one', how: '', img: null, pins: [1], overrides: {}, slotOverrides: {},
      pieces: [ { id: 'w-top1', name: 'Cream silk shirt', image: null, category: 'Tops' }, { id: 'w-bot1', name: 'Barrel-leg jeans', image: null, category: 'Bottoms' } ], formula: [] },
  ],
};

const results = [];
const check = (name, pass, detail = '') => results.push({ name, pass, detail });
process.on('uncaughtException', (e) => { console.error(String(e).split('\n')[0]); report(); server.kill(); process.exit(1); });
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const INK = 'rgb(32, 32, 33)';
const lit = (page) => page.evaluate(() => ['lookbook', 'diary', 'wardrobe', 'inspiration'].filter((k) => document.getElementById('rb-tn-' + k).classList.contains('active')));
const band = (page) => page.evaluate(() => {
  const b = window._rbRetTop ? window._rbRetTop() : null;
  if (!b) return null;
  const r = b.getBoundingClientRect(), nav = document.querySelector('.nav').getBoundingClientRect();
  return { label: b.querySelector('.rb-ret-pill .lab')?.textContent.trim(), pos: b.querySelector('.rb-ret-pos')?.textContent.trim() || '', h: Math.round(r.height), top: Math.round(r.top - nav.bottom), hairline: getComputedStyle(b).borderBottomWidth !== '0px', extras: b.querySelectorAll('.rb-tb-btn, .rb-pill, input').length };
});
const titleTop = (page) => page.evaluate(() => {
  const ov = window._rbRetTop && window._rbRetTop(); const tb = ov ? ov.parentElement.querySelector('.rb-tb') || ov.closest('[id]').querySelector('.rb-tb') : null;
  const nav = document.querySelector('.nav').getBoundingClientRect();
  return tb ? Math.round(tb.getBoundingClientRect().top - nav.bottom) : null;
});

// ── 1 · Rule 1: the lit section is the one she ENTERED through, held for
//        the whole journey — wardrobe › piece › look › piece ─────────────
{
  const { ctx, page, errs } = await boot(browser);
  check('home · no nav item lit, no return band, no depth class', JSON.stringify(await lit(page)) === '[]' && (await band(page)) === null
    && !(await page.locator('.nav.rb-depth').count()));
  await page.evaluate(() => window.__rbNavGo('wardrobe')); await page.waitForTimeout(500);
  check('wardrobe · a root: Wardrobe lit, no band', JSON.stringify(await lit(page)) === '["wardrobe"]' && (await band(page)) === null);
  await page.evaluate(() => window.__rbPieceOpen('w-top1', { from: 'wardrobe' })); await page.waitForTimeout(500);
  const b1 = await band(page);
  check('piece from the wardrobe · ‹ Wardrobe, "1 of 2 in tops", Wardrobe stays lit', !!b1 && b1.label === 'Wardrobe' && /^1 of 2 in tops$/i.test(b1.pos) && JSON.stringify(await lit(page)) === '["wardrobe"]', JSON.stringify(b1));
  check('piece · band two is 48px, sits right under the nav, hairline-bottomed, nothing else in it', !!b1 && b1.h === 48 && b1.top === 0 && b1.hairline && b1.extras === 0, JSON.stringify(b1));
  check('piece · the title block starts 48px below the nav (every title in the app now starts at the same height)', (await titleTop(page)) === 48, String(await titleTop(page)));
  await page.locator('#rb-piece-page .rb-pc-rail .rb-lk-tile').first().click(); await page.waitForTimeout(600);
  const b2 = await band(page);
  check('look from the piece · ‹ Cream silk shirt, "1 of 1 with this piece" prints nothing (a set of one), Wardrobe STILL lit',
    !!b2 && b2.label === 'Cream silk shirt' && b2.pos === '' && JSON.stringify(await lit(page)) === '["wardrobe"]' && /^saved look$/i.test(await page.locator('#rb-lk-body .rb-lk-mast .rb-tb-ey').innerText()), JSON.stringify(b2));
  check('look · the title block starts at the same height as the piece\'s', (await titleTop(page)) === 48, String(await titleTop(page)));
  await page.locator('#sn-page .rbc-rack .rbc-namebtn').first().click(); await page.waitForTimeout(500);
  const b3 = await band(page);
  check('piece from the look · ‹ The Thursday one, "1 of 4 in this look", Wardrobe still lit — three deep, one section', !!b3 && b3.label === 'The Thursday one' && /1 of 4 in this look/i.test(b3.pos) && JSON.stringify(await lit(page)) === '["wardrobe"]', JSON.stringify(b3));
  check('piece · the star and the pencil are in the title block from this door too', await page.locator('#rb-piece-page .rb-tb-trow .rb-pc-star').count() === 1 && await page.locator('#rb-piece-page .rb-tb-trow .rb-pc-pencil').count() === 1);
  await page.locator('#rb-piece-page .rb-ret-pill').click(); await page.waitForTimeout(400);
  check('piece · ‹ returns to the look it came from', !(await page.locator('#rb-piece-page').isVisible()) && await page.locator('#sn-page').isVisible() && (await band(page))?.label === 'Cream silk shirt');
  await page.locator('#sn-page .rb-ret-pill').click(); await page.waitForTimeout(500);
  check('look · ‹ returns to the piece, then the wardrobe record', await page.locator('#rb-piece-page').isVisible() && (await band(page))?.label === 'Wardrobe');
  check('no page errors (journey)', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

// ── 2 · The Lookbook: index masthead, the look's set, the roots ─────────
{
  const { ctx, page, errs } = await boot(browser);
  await page.evaluate(() => window.__rbNavGo('lookbook')); await page.waitForTimeout(600);
  const mast = await page.evaluate(() => {
    const m = document.querySelector('#rb-lk-bar .rb-mast');
    const pills = Array.from(m.querySelectorAll('.rb-pill')).map((b) => { const c = getComputedStyle(b); return { t: b.textContent.trim(), fs: c.fontSize, rad: c.borderRadius, bg: c.backgroundColor, tt: c.textTransform }; });
    return { lab: m.querySelector('.rb-mast-lab')?.textContent, n: m.querySelector('.rb-mast-n')?.textContent, labCase: getComputedStyle(m.querySelector('.rb-mast-lab')).textTransform, pills, headRow: getComputedStyle(document.getElementById('sn-headrow')).display };
  });
  check('lookbook · ONE masthead line: ALL LOOKS in tracked caps + "2 looks" in serif italic, no eyebrow row above', mast.lab === 'All looks' && mast.labCase === 'uppercase' && mast.n === '2 looks' && mast.headRow === 'none', JSON.stringify(mast));
  // Sort and Refine sit inert below four looks (transparent, no fill); + New look is live.
  check('lookbook · sort, Refine and + New look are hairline pills — 11px, radius 100, sentence case, the live one white', mast.pills.length === 3 && mast.pills.every((p) => p.fs === '11px' && p.rad === '100px' && p.tt === 'none') && mast.pills[2].bg === 'rgb(255, 255, 255)', JSON.stringify(mast.pills));
  check('lookbook · a root: no band, Lookbook lit', (await band(page)) === null && JSON.stringify(await lit(page)) === '["lookbook"]');
  await page.locator('#rb-lk-grid .rb-lk-tile').first().click(); await page.waitForTimeout(500);
  const lb = await band(page);
  check('look from the grid · ‹ Lookbook + its position in the set', !!lb && lb.label === 'Lookbook' && /^[12] of 2$/.test(lb.pos), JSON.stringify(lb));
  const before = await page.locator('#rb-lk-title').innerText();
  await page.locator('#sn-page .rb-ret-nav:not([disabled])').first().click(); await page.waitForTimeout(400);
  const after = await page.locator('#rb-lk-title').innerText();
  check('look · ‹ › walk the set without leaving the screen', before !== after && (await band(page))?.label === 'Lookbook', before + ' → ' + after);
  await page.locator('#sn-page .rb-ret-pill').click(); await page.waitForTimeout(400);
  check('look · ‹ Lookbook lands on the grid', await page.locator('#rb-lk-grid').isVisible() && (await band(page)) === null);
  await page.evaluate(() => window.__rbNavGo('diary')); await page.waitForTimeout(700);
  check('diary · a root: no band; the masthead is the month in caps + the count, the toggle beneath, ‹ › + as circles',
    (await band(page)) === null && await page.evaluate(() => { const h = document.querySelector('#sn-cal .rb-mv-head'); return getComputedStyle(h.querySelector('.rb-mv-title')).textTransform === 'uppercase' && !!h.querySelector('.rb-mast-n') && h.querySelectorAll('.rb-mv-seg button').length === 2 && h.querySelectorAll('.rb-mv-nav .rb-circ').length === 3 && ![...h.querySelectorAll('button')].some((b) => getComputedStyle(b).backgroundColor === 'rgb(32, 32, 33)'); }));
  await page.evaluate(() => window.__rbNavGo('inspiration')); await page.waitForTimeout(600);
  const insp = await page.evaluate(() => { const m = document.getElementById('rb-in-mast'); const p = m.querySelector('.rb-pill'); return { lab: m.querySelector('.rb-mast-lab')?.textContent, pill: p?.textContent, bg: getComputedStyle(p).backgroundColor, oldEyebrow: !!document.querySelector('#rb-insp-page p'), sec: !!document.getElementById('rb-in-sec') }; });
  check('inspiration · a root: one masthead line "Key pieces, styled", the Style a key piece pill is hairline, no stacked labels', (await band(page)) === null && insp.lab === 'Key pieces, styled' && insp.pill === 'Style a key piece' && insp.bg === 'rgb(255, 255, 255)' && insp.sec === false, JSON.stringify(insp));
  await page.evaluate(() => window.__rbNavGo('wardrobe')); await page.waitForTimeout(500);
  const wd = await page.evaluate(() => ({ tabs: [...document.querySelectorAll('#rb-wsub .rb-mast-tab')].map((b) => b.textContent), inHead: !!document.querySelector('.wg-header #rb-add-pill') && !!document.querySelector('.wg-header #rb-refine-pill'), title: !!document.querySelector('.wg-title'), add: document.getElementById('rb-add-pill').textContent, fills: [...document.querySelectorAll('.wg-header button')].filter((b) => getComputedStyle(b).backgroundColor === 'rgb(32, 32, 33)').length }));
  check('wardrobe · the tabs ARE the masthead: Wardrobe | Wishlist (1), + Add piece and Refine beside them, no YOUR WARDROBE title, nothing filled ink', JSON.stringify(wd.tabs) === JSON.stringify(['Wardrobe', 'Wishlist (1)']) && wd.inHead && !wd.title && wd.add === '+ Add piece' && wd.fills === 0, JSON.stringify(wd));
  await page.evaluate(() => window.__waSetView('wishlist')); await page.waitForTimeout(300);
  check('wishlist · a toggle, not a destination: the add pill follows the tab (+ Save a piece), Refine steps aside, the nav and band are untouched',
    (await page.locator('#rb-add-pill').innerText()) === '+ Save a piece' && !(await page.locator('#rb-refine-pill').isVisible()) && (await band(page)) === null && JSON.stringify(await lit(page)) === '["wardrobe"]');
  check('no page errors (roots)', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

// ── 3 · Key piece, day, trip, and the trip's look ────────────────────────
{
  const { ctx, page, errs } = await boot(browser);
  // Diary › Day › Look, three deep: a look on a day climbs to the DAY (its
  // page lists every look on the date), the day climbs to its month.
  await page.evaluate(() => window.__snOpenItem(1756000000000)); await page.waitForTimeout(700);
  const db = await band(page);
  const dt = await page.evaluate(() => ({ ey: document.querySelector('#dl-result-page .rb-tb-ey')?.textContent, title: document.querySelector('#dl-result-page .dlm-title')?.textContent, pen: !!document.querySelector('#dl-result-page .rb-tb-trow .dlm-daypen'), italic: getComputedStyle(document.querySelector('#dl-result-page .dlm-title')).fontStyle }));
  check('look on a day · ‹ Mon 24 Aug (the day, no position — day paging is deferred); the eyebrow is the date, the occasion titles it in italic serif, the pencil after it; Diary lit',
    !!db && db.label === 'Mon 24 Aug' && db.pos === '' && dt.ey === 'Monday 24 August' && dt.title === 'Coffee with mum' && dt.pen && dt.italic === 'italic' && JSON.stringify(await lit(page)) === '["diary"]', JSON.stringify([db, dt]));
  await page.locator('#dl-result-page .rb-ret-pill').click(); await page.waitForTimeout(700);
  const dp = await band(page);
  const dpt = await page.evaluate(() => ({ grid: !!document.querySelector('#dl-result-page .dyp-grid'), ey: document.querySelector('#dl-result-page .rb-tb-ey')?.textContent, title: document.querySelector('#dl-result-page .dlm-title')?.textContent.trim(), pen: !!document.querySelector('#dl-result-page .rb-tb-trow .dyp-pen'), oldBack: !!document.querySelector('#dl-result-page .dyp-back, #dl-result-page .dlm-dayback') }));
  // The day page's pill names the month it lives in, or Home when the day
  // was reached without the Diary open (this boot never opened it); the
  // seed carries no day title, so the title is the quiet "Name the day" door.
  check('day page · ‹ August 2026 / ‹ Home (no position); the date is the eyebrow, the day\'s title door after it; the old back button is gone',
    !!dp && (dp.label === 'August 2026' || dp.label === 'Home') && dp.pos === '' && dpt.grid && dpt.ey === 'Monday 24 August' && /Name the day|Coffee with Mum/.test(dpt.title || '') && !dpt.oldBack, JSON.stringify([dp, dpt]));
  const dpLabel = dp && dp.label;
  await page.locator('#dl-result-page .rb-ret-pill').click(); await page.waitForTimeout(700);
  check('day page · ‹ lands where the pill said — the Diary at that month, or Home',
    dpLabel === 'Home' ? (!(await page.locator('#dl-result-page').isVisible()) && await page.evaluate(() => location.pathname) === '/dashboard')
      : (await page.locator('#sn-page.rb-cal-on').count() === 1 && (await page.locator('#sn-cal .rb-mv-title').innerText()).toLowerCase() === 'august 2026'));

  await page.evaluate((fx) => window.__tvRenderResult(fx), TRIP); await page.waitForTimeout(900);
  const tb = await band(page);
  const tt = await page.evaluate(() => ({ ey: document.querySelector('#tv-result-page .tvm-eyebrow')?.textContent, title: document.getElementById('tv-headline')?.textContent, pen: document.querySelector('#tv-result-page .rb-tb-trow .tvm-pen')?.getAttribute('aria-label'), pens: document.querySelectorAll('#tv-result-page .tvm-mast .rb-tb-btn').length, arrow: !!document.querySelector('#tv-result-page .tvm-back'), facts: !!document.querySelector('#tv-mastmeta .tvm-line') && !document.querySelector('#tv-mastmeta .tvm-facts'), doors: document.querySelectorAll('#tv-weekstrip .tvw-lk').length }));
  check('trip · the bare ← Diary arrow is gone; ‹ July 2026 names the month the trip lives in; eyebrow The travel edit, ONE pen after the name (Edit details), destination + dates + weather on one line',
    !!tb && tb.label === 'July 2026' && tt.ey === 'The travel edit' && tt.title === 'A trip to Lahinch.' && tt.pen === 'Edit details' && tt.pens === 1 && !tt.arrow && tt.facts && JSON.stringify(await lit(page)) === '["diary"]', JSON.stringify([tb, tt]));
  check('trip · a look row on the Travel diary is the door to the look', tt.doors === 1);
  await page.locator('#tv-weekstrip .tvw-lk').first().click(); await page.waitForTimeout(700);
  const lb = await band(page);
  const lm = await page.evaluate(() => ({ meta: document.querySelector('#rb-lk-body .rb-lk-mast .rb-tb-meta')?.textContent, notice: /Open the travel edit/.test(document.getElementById('rb-lk-body')?.textContent || ''), pack: document.querySelectorAll('#rb-lk-body .rb-lk-packbtn').length }));
  check('trip › look · opens as a screen: ‹ A trip to Lahinch. + "1 of 1 on this trip" prints nothing (a set of one), the pin is a plain meta line, no notice repeats the route, the Pack toggles stay, Diary still lit',
    !!lb && lb.label === 'A trip to Lahinch.' && /pinned for Sat(urday)? 1 Aug, Dinner out/.test(lm.meta || '') && !lm.notice && lm.pack === 2 && JSON.stringify(await lit(page)) === '["diary"]', JSON.stringify([lb, lm]));
  await page.locator('#sn-page .rb-ret-pill').click(); await page.waitForTimeout(700);
  check('trip › look · ‹ returns to the trip', await page.locator('#tv-result-page').isVisible() && !(await page.locator('#sn-page').isVisible()) && (await band(page))?.label === 'July 2026');

  await page.evaluate((r) => window.__kpRenderResult(r, 'Style my black dress for a ball', { intent: 'style' }), STYLE_RESP); await page.waitForTimeout(900);
  const kb = await band(page);
  const kt = await page.evaluate(() => ({ ey: document.querySelector('#kp-result-page .rb-tb-ey')?.textContent, title: (document.getElementById('kp-headline')?.textContent || '').replace(/\s+/g, ' '), pen: !!document.querySelector('#kp-result-page .rb-tb-trow .kp-pen'), share: getComputedStyle(document.querySelector('#kp-result-page .rb-kp-share')).backgroundColor }));
  check('key piece · the result gains the return band it lacked: ‹ Inspiration; eyebrow Key piece; the italic wink still lands; Share is a hairline pill; Inspiration lit',
    !!kb && kb.label === 'Inspiration' && kt.ey === 'Key piece' && /worn three ways\./.test(kt.title) && kt.pen && kt.share === 'rgb(255, 255, 255)' && JSON.stringify(await lit(page)) === '["inspiration"]', JSON.stringify([kb, kt]));
  await page.locator('#kp-result-page .rb-ret-pill').click(); await page.waitForTimeout(600);
  check('key piece · ‹ lands on Inspiration', await page.locator('#rb-insp-page').isVisible() && !(await page.locator('#kp-result-page').isVisible()));
  check('no page errors (kp, day, trip)', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

// ── 4 · 390px: the two web bands collapse into the nav bar ───────────────
{
  const { ctx, page, errs } = await boot(browser, { width: 390 });
  await page.evaluate(() => window.__rbNavGo('lookbook')); await page.waitForTimeout(600);
  check('mobile root · wordmark + avatar, no return pill, no depth class', await page.locator('#nav-wordmark').isVisible() && await page.locator('.av-wrap').isVisible() && !(await page.locator('#rb-backpill').isVisible()) && !(await page.locator('.nav.rb-depth').count()));
  await page.locator('#rb-lk-grid .rb-lk-tile').first().click(); await page.waitForTimeout(600);
  const m = await page.evaluate(() => ({ depth: document.querySelector('.nav').classList.contains('rb-depth'), pill: document.getElementById('rb-backpill-label').textContent, pos: document.getElementById('rb-navset').textContent, wm: getComputedStyle(document.getElementById('nav-wordmark')).display, av: getComputedStyle(document.querySelector('.av-wrap')).display, inPage: getComputedStyle(document.querySelector('#rb-lk-body .rb-ret')).display, navH: Math.round(document.querySelector('.nav').getBoundingClientRect().height), dock: !!document.querySelector('#rb-dock-lookbook.active') }));
  check('mobile depth · the nav bar IS the return band: the pill replaces the wordmark, the position replaces the avatar, the in-page band hides, the dock keeps the section',
    m.depth && m.pill === 'Lookbook' && /^[12] of 2$/.test(m.pos) && m.wm === 'none' && m.av === 'none' && m.inPage === 'none' && m.dock, JSON.stringify(m));
  await page.locator('#rb-backpill').click(); await page.waitForTimeout(500);
  check('mobile · the pill climbs back and the wordmark returns', await page.locator('#rb-lk-grid').isVisible() && await page.locator('#nav-wordmark').isVisible() && !(await page.locator('.nav.rb-depth').count()));
  check('mobile · no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  check('no page errors (mobile)', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

await browser.close();
server.kill();
function report() {
  const failed = results.filter((r) => !r.pass);
  for (const r of results) console.log((r.pass ? '  ✓ ' : '  ✗ ') + r.name + (r.pass || !r.detail ? '' : '\n      ' + r.detail));
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
}
report();
process.exit(results.some((r) => !r.pass) ? 1 : 0);
