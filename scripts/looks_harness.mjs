// Looks harness — boots the real dashboard with Supabase + REST stubbed and
// walks the Look-as-entity surfaces: the Wardrobe's Looks tab, the sort
// toggle, Look detail with its four actions, wear confirmation + the quiet
// undo, variant promotion, and the New look composer. Also pins the LookTile
// extraction (brief B2): a DayCard must render byte-identically to its
// pre-extraction markup.
// Run manually: npm i --no-save playwright && node scripts/looks_harness.mjs
// Set CHROME_PATH when playwright's bundled browser build isn't installed.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const ROOT = new URL('..', import.meta.url).pathname;
const PORT = 4323;
const BASE = `http://127.0.0.1:${PORT}`;

const server = spawn('node', ['server.js'], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(PORT), NODE_ENV: 'test' },
  stdio: ['ignore', 'pipe', 'pipe'],
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

// A wardrobe wide enough to fill every composer slot and to offer alternates.
const PIECES = [
  { id: 'w-top1', label: 'Cream silk shirt',   category: 'Tops',        color: 'Cream',  price: 180 },
  { id: 'w-top2', label: 'Ribbed white tank',  category: 'Tops',        color: 'White',  price: 40 },
  { id: 'w-bot1', label: 'Barrel-leg jeans',   category: 'Bottoms',     color: 'Navy',   price: 220 },
  { id: 'w-bot2', label: 'Linen shorts',       category: 'Bottoms',     color: 'Cream',  price: 90 },
  { id: 'w-sho1', label: 'Flat leather sandals', category: 'Shoes',     color: 'Camel',  price: 160 },
  { id: 'w-sho2', label: 'Tan leather slides', category: 'Shoes',       color: 'Camel',  price: 120 },
  { id: 'w-bag1', label: 'Woven straw tote',   category: 'Bags',        color: 'Cream',  price: 140 },
  { id: 'w-bag2', label: 'Raffia basket bag',  category: 'Bags',        color: 'Camel',  price: 95 },
  { id: 'w-acc1', label: 'Gold hoops',         category: 'Accessories', color: 'Ochre',  price: 60 },
  { id: 'w-dre1', label: 'Bias slip dress',    category: 'Dresses',     color: 'Blush',  price: 240 },
];
function wardrobe() {
  return PIECES.map((p, i) => ({
    ...p, user_id: 'u-test', brand: 'Studio', notes: '', image_url: null,
    times_worn: 0, item_dna: {}, hero_position: null, seasons: null, occasions: null,
    created_at: new Date(Date.now() - i * 1000).toISOString(),
  }));
}

// Seeded looks: one with history (promotion path), one never worn (sort path).
const SEED_LOOKS = [
  { id: 'lk-1', user_id: 'u-test', name: 'The Thursday one', name_provisional: false,
    note: 'Cream silk shirt with the barrel-leg jeans, flat leather sandals.',
    photo_url: null, source: 'wear', origin_look_id: null,
    created_at: '2026-07-20T10:00:00Z', updated_at: '2026-07-20T10:00:00Z' },
  { id: 'lk-2', user_id: 'u-test', name: 'The tank one', name_provisional: true,
    note: 'Ribbed white tank with the linen shorts, tan leather slides.',
    photo_url: null, source: 'wear', origin_look_id: null,
    created_at: '2026-07-22T10:00:00Z', updated_at: '2026-07-22T10:00:00Z' },
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
  { id: 'we-1', look_id: 'lk-1', user_id: 'u-test', worn_on: '2026-07-23',
    piece_ids: ['w-top1', 'w-bot1', 'w-sho1', 'w-bag1'], source: 'looks', source_id: null,
    confirmed_at: '2026-07-23T18:00:00Z' },
  { id: 'we-2', look_id: 'lk-1', user_id: 'u-test', worn_on: '2026-07-09',
    piece_ids: ['w-top1', 'w-bot1', 'w-sho2', 'w-bag1'], source: 'looks', source_id: null,
    confirmed_at: '2026-07-09T18:00:00Z' },
];

// Every write the module makes is captured so the harness can assert on the
// payloads — that a wear is INSERTed and undone by DELETE (never updated), and
// that a promotion writes a new look rather than mutating the old one.
async function boot(browser, { width = 1280, looksTable = true, seed = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 1200 } });
  const page = await ctx.newPage();
  const writes = [];

  await page.route('**cdn.jsdelivr.net/**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/javascript', body: SUPA_STUB }));

  await page.route('**ayowpaknssulsqqvwpqx.supabase.co/**', (r) => {
    const req = r.request();
    const u = req.url();
    const m = req.method();
    if (m !== 'GET') {
      let body = null;
      try { body = req.postDataJSON(); } catch (_) { body = req.postData(); }
      writes.push({ method: m, url: u.split('/rest/v1/')[1] || u, body });
    }
    const missing = () => r.fulfill({
      status: 404, contentType: 'application/json',
      body: JSON.stringify({ code: 'PGRST205', message: 'Could not find the table \'public.looks\' in the schema cache' }),
    });
    if (/\/(looks|look_pieces|wears)\b/.test(u) && !looksTable) return missing();
    if (m !== 'GET') return r.fulfill({ status: 201, contentType: 'application/json', body: '[]' });
    let body = '[]';
    if (u.includes('wardrobe_items')) body = JSON.stringify(wardrobe());
    else if (u.includes('/looks')) body = JSON.stringify(seed ? SEED_LOOKS : []);
    else if (u.includes('look_pieces')) body = JSON.stringify(seed ? SEED_PIECES : []);
    else if (u.includes('/wears')) body = JSON.stringify(seed ? SEED_WEARS : []);
    return r.fulfill({ status: 200, contentType: 'application/json', body });
  });
  await page.route('**nominatim**', (r) => r.abort());
  await page.route('**open-meteo**', (r) => r.abort());

  await page.addInitScript(() => {
    window.__TEST_PROFILE = {
      first_name: 'Annie', last_name: '', mobile: '', style_icons: [], budget: null,
      wardrobe_description: '', style_dna: {}, wardrobe_items_count: 10,
      onboarded_at: '2026-07-01', gender_identity: 'woman',
    };
    Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true });
  });

  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2800);
  return { ctx, page, errs, writes };
}

const results = [];
const check = (name, pass, detail = '') => { results.push({ name, pass, detail }); };

async function openLooks(page) {
  await page.evaluate(() => window.App && window.App.showWardrobe && window.App.showWardrobe());
  await page.waitForTimeout(700);
  await page.evaluate(() => window.__waSetView('looks'));
  await page.waitForTimeout(500);
}

const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});

// ─────────────────────────────────────────────────────────────────────────
// 1 · LookTile extraction — zero visual drift on the day surfaces (B2)
// ─────────────────────────────────────────────────────────────────────────
{
  const { ctx, page, errs } = await boot(browser);
  check('boot · no page errors', errs.length === 0, errs.join(' | ').slice(0, 240));

  check('LookTile · the primitive is exposed for every look surface',
    await page.evaluate(() => !!(window._rbLookTile && window._rbLookTile.strip && window._rbLookTile.mosaic)));

  // The primitive, exercised through the same functions DayCard calls: prefix
  // `dc` must emit the day classes byte-for-byte, `lt` the look classes.
  const prim = await page.evaluate(() => {
    const LT = window._rbLookTile;
    return {
      dcStrip: LT.strip(['https://x/a.jpg', 'https://x/b.jpg', 'https://x/c.jpg'], 5, 'dc'),
      evenStrip: LT.strip(['https://x/a.jpg', 'https://x/b.jpg'], 2, 'dc'),
      empty: LT.strip([], 0, 'dc'),
      dcTitle: LT.title('Studio', 'dc'),
      ltTitle: LT.title('Studio', 'lt', true),
      mosaic: LT.mosaic([{ url: 'https://x/a.jpg', name: 'A' }], {}),
      photo: LT.mosaic([], { photo: 'https://x/p.jpg', alt: 'A look' }),
    };
  });
  check('LookTile · a whole-look photo replaces the mosaic',
    /class="lt-photo" src="https:\/\/x\/p\.jpg"/.test(prim.photo || '') && !/<i[ >]/.test(prim.photo || ''),
    (prim.photo || '').slice(0, 160));
  check('LookTile · a short look still renders four cells, the rest empty',
    (prim.mosaic.match(/<i/g) || []).length === 4 && (prim.mosaic.match(/class="e"/g) || []).length === 3,
    (prim.mosaic || '').slice(0, 200));
  check('LookTile · no overflow chip when nothing is hidden',
    !/class="ov/.test(prim.evenStrip || ''), (prim.evenStrip || '').slice(0, 160));
  check('LookTile · strip emits dc-th with .t3 and both overflow chips',
    /class="dc-th"/.test(prim.dcStrip || '') && /class="t3"/.test(prim.dcStrip || '') &&
    /ov d">\+2/.test(prim.dcStrip || '') && /ov m">\+3/.test(prim.dcStrip || ''),
    (prim.dcStrip || '').slice(0, 180));
  check('LookTile · no pieces renders nothing', prim.empty === '', JSON.stringify(prim.empty));
  check('LookTile · dc title has no provisional class', prim.dcTitle === '<div class="dc-title">Studio</div>', prim.dcTitle);
  check('LookTile · lt title marks a provisional name', /class="lt-title prov"/.test(prim.ltTitle || ''), prim.ltTitle);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────
// 2 · The Looks tab — grid, sort, tab semantics (A1)
// ─────────────────────────────────────────────────────────────────────────
{
  const { ctx, page, errs } = await boot(browser);
  await openLooks(page);
  check('tab · no page errors', errs.length === 0, errs.join(' | ').slice(0, 240));

  const s = await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('#rb-wsub button')).map((b) => ({ v: b.dataset.view, t: b.textContent, on: b.classList.contains('active') }));
    const vis = (id) => { const el = document.getElementById(id); return !!el && el.offsetParent !== null; };
    return {
      tabs,
      wrapVisible: vis('rb-lk-wrap'),
      piecesGridHidden: !vis('wg-grid'),
      filtersHidden: !vis('wg-filters'),
      tiles: document.querySelectorAll('#rb-lk-grid .rb-lk-tile').length,
      titles: Array.from(document.querySelectorAll('#rb-lk-grid .lt-title')).map((t) => t.textContent),
      provisional: Array.from(document.querySelectorAll('#rb-lk-grid .lt-title.prov')).map((t) => t.textContent),
      mosaicCells: document.querySelectorAll('#rb-lk-grid .rb-lk-tile:first-child .rb-lk-mos i').length,
      sortLabel: document.querySelector('.rb-lk-sort span')?.textContent,
      sortArrow: document.querySelector('.rb-lk-sort b')?.textContent,
      headerTitle: document.querySelector('.wardrobe-panel .wg-title')?.textContent,
      path: location.pathname,
    };
  });
  check('tab · Pieces | Looks | Wishlist in that order',
    s.tabs.map((t) => t.v).join(',') === 'all,looks,wishlist', JSON.stringify(s.tabs.map((t) => t.v)));
  check('tab · Looks tab is active and counts its looks',
    s.tabs.find((t) => t.v === 'looks')?.on === true && /Looks \(2\)/.test(s.tabs.find((t) => t.v === 'looks')?.t || ''),
    JSON.stringify(s.tabs));
  check('tab · header still says Wardrobe (a tab, not a destination)',
    s.headerTitle === 'Your wardrobe', String(s.headerTitle));
  check('tab · looks surface shown, pieces grid and filters hidden',
    s.wrapVisible && s.piecesGridHidden && s.filtersHidden,
    JSON.stringify([s.wrapVisible, s.piecesGridHidden, s.filtersHidden]));
  check('tab · deep-linkable path', s.path === '/looks', s.path);
  check('grid · one tile per look', s.tiles === 2, String(s.tiles));
  check('grid · mosaic always renders four cells', s.mosaicCells === 4, String(s.mosaicCells));
  check('grid · provisional title renders provisional', s.provisional.length === 1 && s.provisional[0] === 'The tank one', JSON.stringify(s.provisional));
  check('sort · defaults to Last worn ↓', s.sortLabel === 'Last worn' && s.sortArrow === '↓', `${s.sortLabel} ${s.sortArrow}`);
  check('sort · worn look leads descending', s.titles[0] === 'The Thursday one', JSON.stringify(s.titles));

  const asc = await page.evaluate(() => {
    window.__lkSort();
    return {
      label: document.querySelector('.rb-lk-sort span')?.textContent,
      arrow: document.querySelector('.rb-lk-sort b')?.textContent,
      titles: Array.from(document.querySelectorAll('#rb-lk-grid .lt-title')).map((t) => t.textContent),
    };
  });
  check('sort · toggles to First worn ↑', asc.label === 'First worn' && asc.arrow === '↑', `${asc.label} ${asc.arrow}`);
  check('sort · never-worn leads ascending', asc.titles[0] === 'The tank one', JSON.stringify(asc.titles));

  // Tile metadata is hover-only on the pointer surfaces (title-only decision)
  const meta = await page.evaluate(() => {
    window.__lkSort();   // back to Last worn ↓
    const tile = Array.from(document.querySelectorAll('#rb-lk-grid .rb-lk-tile'))
      .find((t) => t.querySelector('.lt-title')?.textContent === 'The Thursday one');
    const el = tile && tile.querySelector('.lt-meta');
    return el ? { txt: el.textContent, opacity: getComputedStyle(el).opacity } : null;
  });
  check('grid · metadata is hover-revealed, not printed', meta && meta.opacity === '0', JSON.stringify(meta));
  check('grid · metadata carries pieces + wears + last worn',
    !!meta && /4 pieces · 2 wears · last 23 Jul/.test(meta.txt), meta && meta.txt);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────
// 3 · Look detail — the four actions, stats, wear + quiet undo (A3, A4)
// ─────────────────────────────────────────────────────────────────────────
{
  const { ctx, page, errs, writes } = await boot(browser);
  await openLooks(page);
  await page.evaluate(() => window.__lkOpen('lk-1'));
  await page.waitForTimeout(400);

  const d = await page.evaluate(() => ({
    back: document.querySelector('.rb-lk-back')?.textContent,
    eyebrow: document.querySelector('.rb-lk-eyebrow')?.textContent,
    title: document.getElementById('rb-lk-title')?.value,
    provisional: document.getElementById('rb-lk-title')?.classList.contains('prov'),
    stats: Array.from(document.querySelectorAll('.rb-lk-stat')).map((s) => [s.querySelector('b')?.textContent, s.querySelector('span')?.textContent]),
    actions: Array.from(document.querySelectorAll('.rb-lk-acts .rb-lk-act')).map((b) => b.textContent),
    pieceRows: document.querySelectorAll('.rb-lk-row').length,
    wearRows: document.querySelectorAll('.rb-lk-wear').length,
    wearTags: Array.from(document.querySelectorAll('.rb-lk-wear .tg')).map((t) => t.textContent),
    gridHidden: document.getElementById('rb-lk-grid')?.style.display === 'none',
    heroCells: document.querySelectorAll('.rb-lk-det-l .rb-lk-mos i').length,
  }));
  check('detail · no page errors', errs.length === 0, errs.join(' | ').slice(0, 240));
  check('detail · back link returns to the tab', /Wardrobe · Looks/.test(d.back || ''), d.back);
  check('detail · grid yields to the detail', d.gridHidden === true);
  check('detail · named title is not provisional', d.title === 'The Thursday one' && d.provisional === false, `${d.title}/${d.provisional}`);
  check('detail · eyebrow reads Look for a named look', d.eyebrow === 'Look', d.eyebrow);
  check('detail · four load-bearing actions',
    d.actions.join(' | ') === 'Wear it today | Pin to a day | Pack it | Restyle', JSON.stringify(d.actions));
  check('detail · stats show pieces, wears, last worn',
    JSON.stringify(d.stats.slice(0, 3)) === JSON.stringify([['4', 'Pieces'], ['2', 'Wears'], ['23 Jul', 'Last worn']]),
    JSON.stringify(d.stats));
  check('detail · cost per wear derives from priced pieces (700/2)',
    d.stats.some((s) => s[1] === 'Per wear' && s[0] === '€350'), JSON.stringify(d.stats));
  check('detail · every piece is listed', d.pieceRows === 4, String(d.pieceRows));
  check('detail · wear history lists both wears', d.wearRows === 2, String(d.wearRows));
  check('detail · a wear whose snapshot differs is not labelled Confirmed',
    d.wearTags.join(',') === 'Confirmed,As worn', JSON.stringify(d.wearTags));
  check('detail · hero mosaic renders', d.heroCells === 4, String(d.heroCells));

  // The tap IS the wear, with a quiet undo on the card (A4/C1)
  const worn = await page.evaluate(() => {
    document.querySelector('.rb-lk-acts .rb-lk-act.primary').click();
    return {
      wears: document.querySelectorAll('.rb-lk-stat')[1]?.querySelector('b')?.textContent,
      undo: !!Array.from(document.querySelectorAll('.rb-lk-quiet')).find((b) => b.textContent === 'Not this, actually'),
      dialog: !!document.querySelector('.sheet-overlay.open'),
      wearRows: document.querySelectorAll('.rb-lk-wear').length,
      primaryDisabled: !!document.querySelector('.rb-lk-acts .rb-lk-act[disabled]'),
    };
  });
  check('wear · a tap creates the wear with no confirm dialog', worn.wears === '3' && !worn.dialog, JSON.stringify(worn));
  check('wear · undo is a quiet affordance on the card, not a toast', worn.undo === true);
  check('wear · the action settles to Worn today ✓', worn.primaryDisabled === true);
  check('wear · history gains the row', worn.wearRows === 3, String(worn.wearRows));

  await page.waitForTimeout(500);
  const wearWrite = writes.find((w) => w.method === 'POST' && /^wears/.test(w.url));
  check('wear · INSERTs a wear row with a piece snapshot',
    !!wearWrite && Array.isArray(wearWrite.body?.piece_ids) && wearWrite.body.piece_ids.length === 4,
    JSON.stringify(wearWrite?.body || null));
  check('wear · bumps times_worn on the pieces',
    writes.filter((w) => w.method === 'PATCH' && /wardrobe_items/.test(w.url)).length === 4,
    String(writes.filter((w) => w.method === 'PATCH' && /wardrobe_items/.test(w.url)).length));

  const undone = await page.evaluate(() => {
    Array.from(document.querySelectorAll('.rb-lk-quiet')).find((b) => b.textContent === 'Not this, actually').click();
    return {
      wears: document.querySelectorAll('.rb-lk-stat')[1]?.querySelector('b')?.textContent,
      backToPrimary: document.querySelector('.rb-lk-acts .rb-lk-act.primary')?.textContent,
    };
  });
  check('undo · the count returns', undone.wears === '2', String(undone.wears));
  check('undo · Wear it today comes back', undone.backToPrimary === 'Wear it today', String(undone.backToPrimary));
  await page.waitForTimeout(500);
  check('undo · corrects by DELETE, never an update to a wear',
    writes.some((w) => w.method === 'DELETE' && /^wears/.test(w.url)) &&
    !writes.some((w) => w.method === 'PATCH' && /^wears/.test(w.url)),
    JSON.stringify(writes.filter((w) => /^wears/.test(w.url)).map((w) => w.method)));
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────
// 4 · Swap → variant promotion (A5) and the pin (A3)
// ─────────────────────────────────────────────────────────────────────────
{
  const { ctx, page, errs, writes } = await boot(browser);
  await openLooks(page);
  await page.evaluate(() => window.__lkOpen('lk-1'));
  await page.waitForTimeout(300);

  const swap = await page.evaluate(() => {
    window.__lkSwap('w-bag1');
    return {
      options: Array.from(document.querySelectorAll('.rb-lk-opt span')).map((s) => s.textContent),
    };
  });
  check('swap · offers her own same-category pieces only',
    swap.options.length === 1 && swap.options[0] === 'Raffia basket bag', JSON.stringify(swap.options));

  const promo = await page.evaluate(() => {
    window.__lkSwapPick('w-bag1', 'w-bag2');
    const panel = document.querySelector('.rb-lk-panel');
    return {
      line: panel?.querySelector('.pl')?.textContent,
      body: panel?.querySelector('.pb')?.textContent,
      acts: Array.from(panel?.querySelectorAll('.rb-lk-panel-acts button') || []).map((b) => b.textContent),
      piecesUnchanged: Array.from(document.querySelectorAll('.rb-lk-row .nm')).map((n) => n.childNodes[0].textContent.trim()),
    };
  });
  check('promotion · a look with history asks before it changes',
    /has been worn 2 times/.test(promo.line || ''), promo.line);
  check('promotion · offers Update / Save as a new look / Leave it',
    promo.acts.join(' | ') === 'Update this look | Save as a new look | Leave it', JSON.stringify(promo.acts));
  check('promotion · nothing is applied until she chooses',
    promo.piecesUnchanged.includes('Woven straw tote'), JSON.stringify(promo.piecesUnchanged));

  const promoted = await page.evaluate(() => {
    window.__lkPromote();
    return {
      title: document.getElementById('rb-lk-title')?.value,
      wears: document.querySelectorAll('.rb-lk-stat')[1]?.querySelector('b')?.textContent,
      note: document.querySelector('.rb-lk-panel .pl')?.textContent,
      count: document.getElementById('wg-count')?.textContent,
    };
  });
  check('promotion · Save as a new look opens the NEW look', /in the bag/i.test(promoted.title || '') || /The Thursday one,/.test(promoted.title || ''), promoted.title);
  check('promotion · the new look starts with no wears', promoted.wears === '0', String(promoted.wears));
  check('promotion · says the original is untouched', /untouched/.test(promoted.note || ''), promoted.note);
  await page.waitForTimeout(500);
  const newLook = writes.find((w) => w.method === 'POST' && /^looks/.test(w.url));
  check('promotion · writes a new look row carrying its origin',
    !!newLook && newLook.body?.origin_look_id === 'lk-1' && newLook.body?.source === 'variant',
    JSON.stringify(newLook?.body || null));
  check('promotion · never rewrote the ancestor composition',
    !writes.some((w) => w.method === 'DELETE' && /look_pieces\?look_id=eq\.lk-1/.test(w.url)),
    JSON.stringify(writes.filter((w) => /look_pieces/.test(w.url)).map((w) => w.method + ' ' + w.url)));

  // Update-this-look keeps identity and history
  const upd = await page.evaluate(() => {
    window.__lkOpen('lk-1');
    window.__lkSwap('w-sho1');
    window.__lkSwapPick('w-sho1', 'w-sho2');
    window.__lkUpdate();
    return {
      note: document.querySelector('.rb-lk-panel .pl')?.textContent,
      wears: document.querySelectorAll('.rb-lk-stat')[1]?.querySelector('b')?.textContent,
      pieces: Array.from(document.querySelectorAll('.rb-lk-row .nm')).map((n) => n.childNodes[0].textContent.trim()),
      firstWearSnapshot: document.querySelector('.rb-lk-wear .pc')?.textContent,
    };
  });
  check('update · keeps the look and states history is intact',
    /2 wears stay as they were/.test(upd.note || ''), upd.note);
  check('update · wear count survives the edit', upd.wears === '2', String(upd.wears));
  check('update · composition changed', upd.pieces.includes('Tan leather slides'), JSON.stringify(upd.pieces));
  check('update · the wear keeps its own snapshot (history never rewritten)',
    /Flat leather sandals/.test(upd.firstWearSnapshot || ''), upd.firstWearSnapshot);

  // Pin to a day
  const pinned = await page.evaluate(() => {
    window.__lkAct('pin');
    const btns = Array.from(document.querySelectorAll('.rb-lk-panel-acts .rb-lk-act')).map((b) => b.textContent);
    document.querySelectorAll('.rb-lk-panel-acts .rb-lk-act')[1].click();  // Tomorrow
    return { btns, done: document.querySelector('.rb-lk-panel .pl')?.textContent };
  });
  check('pin · offers today, tomorrow and a date', pinned.btns.length >= 3, JSON.stringify(pinned.btns));
  check('pin · confirms the day it pinned to', /^Pinned to /.test(pinned.done || ''), pinned.done);
  await page.waitForTimeout(1200);   // the planned_days write is debounced
  const pinWrite = writes.find((w) => w.method === 'POST' && /^planned_days/.test(w.url));
  check('pin · writes a planned_days row of source_type look',
    !!pinWrite && Array.isArray(pinWrite.body) && pinWrite.body[0]?.source_type === 'look' && pinWrite.body[0]?.source_id === 'lk-1',
    JSON.stringify(pinWrite?.body?.[0] || null));
  check('pin · the day carries the look\'s pieces', (pinWrite?.body?.[0]?.item_ids || []).length === 4,
    JSON.stringify(pinWrite?.body?.[0]?.item_ids || null));
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────
// 5 · The composer (Phase 2) — look card left, rack right, save at two
// ─────────────────────────────────────────────────────────────────────────
{
  const { ctx, page, errs, writes } = await boot(browser);
  await openLooks(page);
  await page.evaluate(() => window.__lkNew());
  await page.waitForTimeout(300);

  const c0 = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.rb-lk-rrow'));
    const card = document.querySelector('.rb-lk-card');
    const rack = document.querySelector('.rb-lk-rack');
    return {
      errs: 0,
      slots: rows.map((r) => r.querySelector('.rb-lk-rthumb b')?.textContent),
      emptyNames: rows.map((r) => r.querySelector('.rb-lk-rname')?.textContent),
      allItalic: rows.every((r) => r.querySelector('.rb-lk-rname')?.classList.contains('empty')),
      cardBeforeRack: !!card && !!rack && card.compareDocumentPosition(rack) === Node.DOCUMENT_POSITION_FOLLOWING,
      hasSideRail: !!document.querySelector('#rb-lk-shelf'),
      saveShown: !!document.querySelector('.rb-lk-save'),
      titleEyebrow: document.querySelector('.rb-lk-rack .rb-lk-eyebrow')?.textContent,
      titleProvisional: document.getElementById('rb-lk-newtitle')?.classList.contains('prov'),
      addRow: !!document.querySelector('.rb-lk-add'),
      eyebrowCount: document.querySelector('.rb-lk-card-hd b')?.textContent,
    };
  });
  check('composer · no page errors', errs.length === 0, errs.join(' | ').slice(0, 240));
  check('composer · four slot rows: Top, Bottom, Shoe, Bag',
    c0.slots.join(',') === 'Top,Bottom,Shoe,Bag', JSON.stringify(c0.slots));
  check('composer · empty rows invite in italics',
    c0.allItalic && c0.emptyNames.join(' | ') === 'Add a top | Add a bottom | Add a shoe | Add a bag',
    JSON.stringify(c0.emptyNames));
  check('composer · look card sits left of the rack', c0.cardBeforeRack === true);
  check('composer · no side rail of pieces (the rows are the picker)', c0.hasSideRail === false);
  check('composer · Save is withheld until there is a look', c0.saveShown === false);
  check('composer · the title is the rack header and is offered',
    c0.titleEyebrow === 'Robes suggests' && c0.titleProvisional === true, `${c0.titleEyebrow}/${c0.titleProvisional}`);
  check('composer · "+ Add a piece" is available', c0.addRow === true);
  check('composer · card eyebrow counts pieces', c0.eyebrowCount === 'The look · 0 pieces', c0.eyebrowCount);

  // Picking happens inside the row
  const pick = await page.evaluate(() => {
    window.__lkRowOpen('r1');
    const inRow = document.querySelector('.rb-lk-rrow.on .rb-lk-pick');
    const opts = Array.from(document.querySelectorAll('.rb-lk-rrow.on .rb-lk-opt span')).map((s) => s.textContent);
    return { insideTheRow: !!inRow, opts };
  });
  check('composer · the picker opens inside the row', pick.insideTheRow === true);
  check('composer · the Top row offers tops, dresses and layers',
    pick.opts.includes('Cream silk shirt') && pick.opts.includes('Bias slip dress') && !pick.opts.includes('Linen shorts'),
    JSON.stringify(pick.opts));

  const one = await page.evaluate(() => {
    window.__lkRowPick('r1', 'w-top1');
    return {
      name: document.querySelector('.rb-lk-rrow .rb-lk-rname')?.textContent,
      meta: document.querySelector('.rb-lk-rrow .rb-lk-rmeta')?.textContent,
      cta: document.querySelector('.rb-lk-rrow .rb-lk-rcta')?.textContent,
      remove: !!Array.from(document.querySelectorAll('.rb-lk-rrow .rb-lk-quiet')).find((b) => b.textContent === 'Remove'),
      saveShown: !!document.querySelector('.rb-lk-save'),
      note: document.querySelector('.rb-lk-note')?.textContent,
      eyebrowCount: document.querySelector('.rb-lk-card-hd b')?.textContent,
    };
  });
  check('composer · a filled row shows the piece and its provenance',
    one.name === 'Cream silk shirt' && /In your wardrobe/.test(one.meta || ''), `${one.name} / ${one.meta}`);
  check('composer · a filled row offers Swap and Remove', one.cta === 'Swap' && one.remove === true, `${one.cta}/${one.remove}`);
  check('composer · one piece is not yet a look (no Save)', one.saveShown === false);
  check('composer · one piece writes no styling note', one.note === '', JSON.stringify(one.note));
  check('composer · eyebrow follows the count', one.eyebrowCount === 'The look · 1 piece', one.eyebrowCount);

  const two = await page.evaluate(() => {
    window.__lkRowPick('r2', 'w-bot1');
    return {
      saveShown: !!document.querySelector('.rb-lk-save'),
      note: document.querySelector('.rb-lk-note')?.textContent,
      title: document.getElementById('rb-lk-newtitle')?.value,
      palette: document.querySelectorAll('.rb-lk-pal i').length,
      allYours: document.querySelector('.rb-lk-pal span')?.textContent,
      mosaicFilled: Array.from(document.querySelectorAll('.rb-lk-card .rb-lk-mos i')).filter((i) => !i.classList.contains('e')).length,
    };
  });
  check('composer · Save appears at two pieces', two.saveShown === true);
  check('composer · Robes describes the look once it can',
    two.note === 'Cream silk shirt with the barrel-leg jeans.', two.note);
  check('composer · the offered name comes from the look itself', two.title === 'The shirt one', two.title);
  check('composer · palette dots follow the pieces', two.palette === 2, String(two.palette));
  check('composer · says how much of it is hers', two.allYours === 'All 2 from your wardrobe', two.allYours);
  check('composer · the mosaic fills as pieces land', two.mosaicFilled === 2, String(two.mosaicFilled));

  // A dress in the Top slot retires the Bottom row
  const dress = await page.evaluate(() => {
    window.__lkRowClear('r2');
    window.__lkRowPick('r1', 'w-dre1');
    return {
      slots: Array.from(document.querySelectorAll('.rb-lk-rrow .rb-lk-rthumb b')).map((b) => b.textContent),
      rows: document.querySelectorAll('.rb-lk-rrow').length,
    };
  });
  check('composer · a dress quietly retires the Bottom slot',
    !dress.slots.includes('Bottom'), JSON.stringify(dress.slots));

  // Moving a piece between slots doesn't duplicate it
  const moved = await page.evaluate(() => {
    window.__lkRowPick('r1', 'w-top1');
    window.__lkAddRow();
    const key = Array.from(document.querySelectorAll('.rb-lk-rrow')).pop();
    window.__lkRowPick('r3', 'w-sho1');
    return { used: (document.querySelector('.rb-lk-pal span') || {}).textContent };
  });
  check('composer · pieces are not double-counted across slots',
    moved.used === 'All 2 from your wardrobe', String(moved.used));

  const saved = await page.evaluate(() => {
    window.__lkRowPick('r4', 'w-bag1');
    window.__lkNewTitleInput('Terrace mornings');
    window.__lkSave();
    return {
      line: document.querySelector('#rb-lk-body h3')?.textContent,
      acts: Array.from(document.querySelectorAll('#rb-lk-body .rb-lk-act')).map((b) => b.textContent),
      tab: document.querySelector('#rb-wsub [data-view="looks"]')?.textContent,
    };
  });
  check('composer · save confirms by name', /^Terrace mornings, saved\.$/.test(saved.line || ''), saved.line);
  check('composer · offers the look and another build', saved.acts.join(' | ') === 'Open it | Add another', JSON.stringify(saved.acts));
  check('composer · the tab count grows', saved.tab === 'Looks (3)', String(saved.tab));
  await page.waitForTimeout(600);
  const lookWrite = writes.filter((w) => w.method === 'POST' && /^looks/.test(w.url)).pop();
  const pieceWrite = writes.filter((w) => w.method === 'POST' && /^look_pieces/.test(w.url)).pop();
  check('composer · writes the look with her name, not provisional',
    !!lookWrite && lookWrite.body?.name === 'Terrace mornings' && lookWrite.body?.name_provisional === false && lookWrite.body?.source === 'manual',
    JSON.stringify(lookWrite?.body || null));
  check('composer · writes its composition with slots',
    Array.isArray(pieceWrite?.body) && pieceWrite.body.length === 3 && pieceWrite.body.every((p) => !!p.slot),
    JSON.stringify(pieceWrite?.body || null));
  check('composer · a saved look has no wears (it is a plan, not a fact)',
    !writes.some((w) => w.method === 'POST' && /^wears/.test(w.url)));
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────
// 6 · Early days — the empty state (A1)
// ─────────────────────────────────────────────────────────────────────────
{
  const { ctx, page, errs } = await boot(browser, { seed: false });
  await openLooks(page);
  const e = await page.evaluate(() => ({
    head: document.querySelector('.rb-lk-empty h3')?.textContent,
    body: document.querySelector('.rb-lk-empty p')?.textContent,
    acts: Array.from(document.querySelectorAll('.rb-lk-empty-acts button')).map((b) => b.textContent),
    paras: document.querySelectorAll('.rb-lk-empty p').length,
    barHidden: document.getElementById('rb-lk-bar')?.style.display === 'none',
    tab: document.querySelector('#rb-wsub [data-view="looks"]')?.textContent,
  }));
  check('empty · no page errors', errs.length === 0, errs.join(' | ').slice(0, 240));
  check('empty · says what lands here', /Nothing saved yet\./.test(e.head || '') && /Wear something and it lands here\./.test(e.head || ''), e.head);
  check('empty · exactly one line of explanation, no instruction wall', e.paras === 1, String(e.paras));
  check('empty · two ways forward', e.acts.join(' | ') === "See today's look | Add one now", JSON.stringify(e.acts));
  check('empty · the sort control is withheld', e.barHidden === true);
  check('empty · the tab carries no count at zero', e.tab === 'Looks', e.tab);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────
// 7 · Degradation — the migration hasn't run
// ─────────────────────────────────────────────────────────────────────────
{
  const { ctx, page, errs } = await boot(browser, { looksTable: false });
  await openLooks(page);
  const g = await page.evaluate(() => {
    window.__lkNew();
    window.__lkRowPick('r1', 'w-top1');
    window.__lkRowPick('r3', 'w-sho1');
    window.__lkSave();
    const line = document.querySelector('#rb-lk-body h3')?.textContent;
    window.__lkBack();
    return { line, tiles: document.querySelectorAll('#rb-lk-grid .rb-lk-tile').length };
  });
  check('degrade · no page errors when the tables are missing', errs.length === 0, errs.join(' | ').slice(0, 240));
  check('degrade · a look still saves locally', /saved\.$/.test(g.line || ''), g.line);
  check('degrade · and still renders in the grid', g.tiles === 1, String(g.tiles));
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────
// 8 · Mobile — 390px
// ─────────────────────────────────────────────────────────────────────────
{
  const { ctx, page, errs } = await boot(browser, { width: 390 });
  await openLooks(page);
  const m = await page.evaluate(() => {
    const grid = document.getElementById('rb-lk-grid');
    return {
      cols: grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : 0,
      metaVisible: getComputedStyle(document.querySelector('#rb-lk-grid .lt-meta')).opacity === '1',
      overflow: document.documentElement.scrollWidth <= window.innerWidth + 1,
    };
  });
  check('390px · no page errors', errs.length === 0, errs.join(' | ').slice(0, 240));
  check('390px · two-up grid', m.cols === 2, String(m.cols));
  check('390px · metadata is printed where there is no hover', m.metaVisible === true);
  check('390px · no horizontal overflow on the grid', m.overflow === true);

  const md = await page.evaluate(() => {
    window.__lkOpen('lk-1');
    const det = document.querySelector('.rb-lk-det');
    return {
      stacked: det ? getComputedStyle(det).flexDirection === 'column' : false,
      overflow: document.documentElement.scrollWidth <= window.innerWidth + 1,
      actions: document.querySelectorAll('.rb-lk-acts .rb-lk-act').length,
    };
  });
  check('390px · detail stacks', md.stacked === true);
  check('390px · all four actions survive', md.actions === 4, String(md.actions));
  check('390px · no horizontal overflow on the detail', md.overflow === true);

  const mc = await page.evaluate(() => {
    window.__lkNew();
    const n = document.querySelector('.rb-lk-new');
    return {
      stacked: n ? getComputedStyle(n).flexDirection === 'column' : false,
      rowsFullWidth: (() => {
        const r = document.querySelector('.rb-lk-rrow');
        const rack = document.querySelector('.rb-lk-rack');
        return !!r && !!rack && Math.abs(r.getBoundingClientRect().width - rack.getBoundingClientRect().width) < 2;
      })(),
      overflow: document.documentElement.scrollWidth <= window.innerWidth + 1,
    };
  });
  check('390px · composer stacks the card above the rack', mc.stacked === true);
  check('390px · rack rows run full width (no cramped shelf)', mc.rowsFullWidth === true);
  check('390px · no horizontal overflow on the composer', mc.overflow === true);
  await ctx.close();
}

await browser.close();
server.kill();

const failed = results.filter((r) => !r.pass);
for (const r of results) console.log(`${r.pass ? '  ok ' : 'FAIL '} ${r.name}${r.pass ? '' : '  → ' + r.detail}`);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
