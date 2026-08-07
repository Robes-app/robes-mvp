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
async function boot(browser, { width = 1280, looksTable = true, seed = true, dropCat = null } = {}) {
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
    if (u.includes('wardrobe_items')) body = JSON.stringify(wardrobe().filter((w) => !dropCat || w.category !== dropCat));
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
  const { ctx, page, errs, writes } = await boot(browser);
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
      addCard: !!document.querySelector('#rb-lk-grid .rb-add-card'),
      addCardText: document.querySelector('#rb-lk-grid .rb-add-card')?.textContent,
      rmx: document.querySelectorAll('#rb-lk-grid .rb-lk-rmx').length,
      titles: Array.from(document.querySelectorAll('#rb-lk-grid .lt-title')).map((t) => t.textContent),
      provisional: Array.from(document.querySelectorAll('#rb-lk-grid .lt-title.prov')).map((t) => t.textContent),
      mosaicCells: document.querySelectorAll('#rb-lk-grid .rb-lk-tilewrap:first-child .rb-lk-mos i').length,
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
  check('grid · a New look add card mirrors the pieces grid',
    s.addCard === true && /New look/.test(s.addCardText || ''), JSON.stringify([s.addCard, s.addCardText]));

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
  check('grid · metadata is printed, like every neighbouring grid', meta && meta.opacity === '1', JSON.stringify(meta));
  check('grid · metadata carries pieces + wears + last worn',
    !!meta && /4 pieces · 2 wears · last 23 Jul/.test(meta.txt), meta && meta.txt);

  // The grid bar (2026-08-07): + New look beside Refine, which filters the
  // grid on the looks' tag axes. "Formal / Gala" is a vocabulary pick no
  // fixture look can carry (stored or inherited), so the nothing-matches
  // state is deterministic.
  const bar = await page.evaluate(() => {
    const barEl = document.getElementById('rb-lk-bar');
    const newBtn = barEl && Array.from(barEl.querySelectorAll('button')).find((b) => /New look/.test(b.textContent));
    window.__lkRefineToggle();
    const drawer = document.querySelector('.rb-lk-refwrap');
    const axes = drawer ? Array.from(drawer.querySelectorAll('.rb-lkref-ax')).map((e) => e.textContent) : [];
    const chip = drawer && drawer.querySelector('.rb-lkref-chip[data-val="Formal / Gala"]');
    if (chip) chip.click();
    const shown = document.querySelectorAll('#rb-lk-grid .rb-lk-tile').length;
    const none = /No looks carry those tags/.test(document.getElementById('rb-lk-grid').textContent);
    window.__lkRefineClear();
    const restored = document.querySelectorAll('#rb-lk-grid .rb-lk-tile').length;
    window.__lkRefineToggle();
    return { newBtn: !!newBtn, axes, shown, none, restored };
  });
  check('bar · + New look sits in the grid bar', bar.newBtn === true);
  check('bar · Refine opens all four tag axes',
    JSON.stringify(bar.axes) === JSON.stringify(['Climate', 'Light', 'Wear it for', 'Vibe']), JSON.stringify(bar.axes));
  check('bar · a pick filters; nothing-matches names itself; Clear restores',
    bar.shown === 0 && bar.none === true && bar.restored === 2, JSON.stringify(bar));

  // Delete runs LAST — it consumes the fixture
  check('grid · tiles carry the lookbook hover-✕', s.rmx === 2, String(s.rmx));
  const deleted = await page.evaluate(() => {
    window._rbConfirmDelete = (msg, cb) => { window.__lastConfirmMsg = msg; cb(); };
    const wrap = Array.from(document.querySelectorAll('.rb-lk-tilewrap'))
      .find((w) => w.querySelector('.lt-title')?.textContent === 'The tank one');
    wrap.querySelector('.rb-lk-rmx').click();
    return {
      msg: window.__lastConfirmMsg,
      tiles: document.querySelectorAll('#rb-lk-grid .rb-lk-tile').length,
      tab: document.querySelector('#rb-wsub [data-view="looks"]')?.textContent,
    };
  });
  check('grid · ✕ deletes through the shared confirm',
    /Delete The tank one\?/.test(deleted.msg || '') && deleted.tiles === 1 && deleted.tab === 'Looks (1)',
    JSON.stringify(deleted));
  await page.waitForTimeout(400);
  const delWrite = await page.evaluate(() => null);
  check('grid · the delete reaches the cloud',
    writes.some((w) => w.method === 'DELETE' && /^looks\?id=eq\.lk-2/.test(w.url)),
    JSON.stringify(writes.filter((w) => w.method === 'DELETE').map((w) => w.url)));
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
    back: !!document.querySelector('.rb-lk-back'),
    eyebrow: document.querySelector('.rb-lk-eyebrow')?.textContent,
    title: ((e) => e ? (e.tagName === 'INPUT' ? e.value : e.textContent) : null)(document.getElementById('rb-lk-title')),
    provisional: document.getElementById('rb-lk-title')?.classList.contains('prov'),
    stats: Array.from(document.querySelectorAll('.rb-lk-stat')).map((s) => [s.querySelector('b')?.textContent, s.querySelector('span')?.textContent]),
    actions: Array.from(document.querySelectorAll('.rb-lk-acts .rb-lk-act')).map((b) => b.textContent),
    pieceRows: document.querySelectorAll('.rb-lk-con .rbc-rack .rbc-row').length,
    wearRows: document.querySelectorAll('.rb-lk-wear').length,
    wearTags: Array.from(document.querySelectorAll('.rb-lk-wear .tg')).map((t) => t.textContent),
    gridHidden: document.getElementById('rb-lk-grid')?.style.display === 'none',
    boardTiles: document.querySelectorAll('.rb-lk-con .rbc-board .rbc-tile').length,
    boardN: document.querySelector('.rb-lk-con .rbc-board')?.dataset.n,
    headLabel: document.querySelector('.rb-lk-con .rbc-lhead .lab')?.textContent,
    quote: document.querySelector('.rb-lk-con .rbc-quote')?.textContent,
    yours: document.querySelector('.rb-lk-con .rbc-yours')?.textContent,
    lookv2: document.body.classList.contains('rb-lookv2'),
    deleteLink: !!Array.from(document.querySelectorAll('.rb-lk-quiet')).find((b) => b.textContent === 'Delete this look'),
    inlineStrip: !!document.querySelector('.rb-lk-con .rb-lk-pick'),
    flicks: document.querySelectorAll('.rb-lk-con .rbc-rack .rbc-arrow').length,
    rowSwaps: document.querySelectorAll('.rb-lk-con .rbc-rack .rbc-act').length,
  }));
  check('detail · no page errors', errs.length === 0, errs.join(' | ').slice(0, 240));
  check('detail · no sub-sub-nav back line', d.back === false);
  check('detail · grid yields to the detail', d.gridHidden === true);
  const tabBack = await page.evaluate(() => {
    document.querySelector('#rb-wsub [data-view="looks"]').click();
    return {
      gridShown: document.getElementById('rb-lk-grid')?.style.display !== 'none',
      tiles: document.querySelectorAll('#rb-lk-grid .rb-lk-tile').length,
    };
  });
  check('detail · clicking the Looks tab lands the landing grid',
    tabBack.gridShown && tabBack.tiles === 2, JSON.stringify(tabBack));
  await page.evaluate(() => window.__lkOpen('lk-1'));
  await page.waitForTimeout(200);
  check('detail · named title is not provisional', d.title === 'The Thursday one' && d.provisional === false, `${d.title}/${d.provisional}`);
  check('detail · eyebrow reads Look for a named look', d.eyebrow === 'Look', d.eyebrow);
  check('detail · three load-bearing actions (Swap-a-piece dropped — every rack row swaps)',
    d.actions.join(' | ') === 'Wear it today | Pin to a day | Pack it', JSON.stringify(d.actions));
  const layout = await page.evaluate(() => {
    const mast = document.querySelector('.rb-lk-mast');
    const con = document.querySelector('.rb-lk-con');
    const rack = con?.querySelector('.rbc-rack');
    const stats = con?.querySelector('.rb-lk-stats');
    return {
      mastFirst: !!(mast && con) && !!(mast.compareDocumentPosition(con) & Node.DOCUMENT_POSITION_FOLLOWING),
      titleInMast: !!mast?.querySelector('#rb-lk-title'),
      pencil: !!mast?.querySelector('.rb-rename-tbtn'),
      rackLabel: con?.querySelector('.rb-lk-sec')?.textContent,
      statsBelowRack: !!(rack && stats) && !!(rack.compareDocumentPosition(stats) & Node.DOCUMENT_POSITION_FOLLOWING),
    };
  });
  check('detail · the name leads the page (masthead above the console)', layout.mastFirst && layout.titleInMast, JSON.stringify(layout));
  check('detail · rename is the pencil, not a standing input', layout.pencil === true);
  check('detail · the card list is The Rack', layout.rackLabel === 'The Rack', String(layout.rackLabel));
  check('detail · stats live below the Rack', layout.statsBelowRack === true);
  const renamed = await page.evaluate(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    window.__lkTitleEdit();
    await wait(120);
    const inp = document.getElementById('rb-lk-title');
    const isInput = !!inp && inp.tagName === 'INPUT';
    if (isInput) { inp.value = 'Thursday, renamed'; window.__lkTitleCommit(inp.value); }
    await wait(120);
    const mid = document.getElementById('rb-lk-title');
    const out = { isInput, tag: mid?.tagName, title: mid?.textContent };
    window.__lkTitleEdit();
    await wait(120);
    const back = document.getElementById('rb-lk-title');
    if (back && back.tagName === 'INPUT') { back.value = 'The Thursday one'; window.__lkTitleCommit(back.value); }
    await wait(120);
    return out;
  });
  check('detail · pencil opens the inline input', renamed.isInput === true);
  check('detail · commit lands the name back as the static title',
    renamed.tag === 'H2' && renamed.title === 'Thursday, renamed', JSON.stringify(renamed));
  check('detail · stats show pieces, wears, last worn',
    JSON.stringify(d.stats.slice(0, 3)) === JSON.stringify([['4', 'Pieces'], ['2', 'Wears'], ['23 Jul', 'Last worn']]),
    JSON.stringify(d.stats));
  check('detail · cost per wear derives from priced pieces (700/2)',
    d.stats.some((s) => s[1] === 'Per wear' && s[0] === '€350'), JSON.stringify(d.stats));
  check('detail · every piece is a shared rack row', d.pieceRows === 4, String(d.pieceRows));
  check('detail · the rack rows carry flick and Swap', d.flicks === 8 && d.rowSwaps === 4, JSON.stringify([d.flicks, d.rowSwaps]));
  check('detail · the inline swap strip is gone', d.inlineStrip === false);
  check('detail · The Look is the standing 4:5 board',
    d.lookv2 && d.boardTiles === 4 && d.boardN === '4', JSON.stringify([d.lookv2, d.boardTiles, d.boardN]));
  check('detail · the panel head is the console\'s', d.headLabel === 'The look · 4 pieces', d.headLabel);
  check('detail · the styling note rides the panel quote slot', /Cream silk shirt with/.test(d.quote || ''), d.quote);
  check('detail · ownership line is the canonical copy', /4.of.4 from your wardrobe/.test(d.yours || ''), d.yours);
  check('detail · a quiet delete exists', d.deleteLink === true);
  check('detail · wear history lists both wears', d.wearRows === 2, String(d.wearRows));
  check('detail · a wear whose snapshot differs is not labelled Confirmed',
    d.wearTags.join(',') === 'Confirmed,As worn', JSON.stringify(d.wearTags));

  // Formula strips + look tags (Look Template spec A3 + F, 2026-08-07)
  const specA3F = await page.evaluate(() => {
    const strips = Array.from(document.querySelectorAll('.rb-lk-con .rbc-rack .rbc-rolestrip span')).map((s) => s.textContent);
    const tagsRow = document.querySelector('.rb-lk-con .rbc-tags');
    return {
      strips,
      stripsLeadRows: (() => {
        const rack = document.querySelector('.rb-lk-con .rbc-rack');
        return rack && rack.firstElementChild && rack.firstElementChild.classList.contains('rbc-rolestrip');
      })(),
      tagsRow: !!tagsRow,
      tagsEmptyInvite: tagsRow ? /Untagged|Tags/.test(tagsRow.textContent) : false,
    };
  });
  check('roles · the rack groups under hairline formula strips', specA3F.strips.length >= 2 && specA3F.stripsLeadRows, JSON.stringify(specA3F.strips));
  check('roles · display order is Canvas before Anchor before finishers',
    specA3F.strips.indexOf('The Canvas') === 0
      && specA3F.strips.indexOf('The Anchor') === 1, JSON.stringify(specA3F.strips));
  check('tags · The Look carries the quiet tag row', specA3F.tagsRow === true);
  check('tags · untagged is an invitation, never a form', specA3F.tagsEmptyInvite === true);

  // The tag sheet: open on the untagged look → the inherited seed shows →
  // Done persists a flat text[] to the looks table (spec F2/F3)
  const tagged = await page.evaluate(() => {
    window.__lkTagsEdit();
    const sheet = document.getElementById('rb-tag-sheet');
    const groups = sheet ? Array.from(sheet.querySelectorAll('div > div[style*="uppercase"], div[style*="letter-spacing"]')).map((e) => e.textContent).join('|') : '';
    // pick High Summer (climate 0) + Boardroom Power (wear 2)
    window.__rbTagPick('climate', 0);
    window.__rbTagPick('wear', 2);
    window.__rbTagDone(true);
    const row = document.querySelector('.rb-lk-con .rbc-tags');
    return { hadSheet: !!sheet, groups, rowText: row ? row.textContent : '' };
  });
  check('tags · the sheet opens with all four axes', tagged.hadSheet && /Climate/.test(tagged.groups) && /Light/.test(tagged.groups) && /Wear it for/.test(tagged.groups) && /Vibe/.test(tagged.groups), tagged.groups.slice(0, 200));
  check('tags · picks land back on the row', /High Summer/.test(tagged.rowText) && /Boardroom Power/.test(tagged.rowText), tagged.rowText);
  await page.waitForTimeout(400);
  const tagWrite = writes.find((w) => w.method === 'PATCH' && /^looks\?/.test(w.url) && Array.isArray(w.body?.tags));
  check('tags · the edit PATCHes looks.tags as a flat text[]',
    !!tagWrite && tagWrite.body.tags.includes('High Summer') && tagWrite.body.tags.includes('Boardroom Power'),
    JSON.stringify(tagWrite && tagWrite.body.tags));

  // Custom tags (F2 "+ tag" amendment, 2026-08-07): Wear and Vibe are open
  // axes — a typed tag chips in, and a custom vibe stores with the vibe:
  // prefix so the flat array stays unambiguous.
  const custom = await page.evaluate(() => {
    window.__lkTagsEdit();
    const sheet = document.getElementById('rb-tag-sheet');
    const dashed = sheet ? sheet.querySelectorAll('button[onclick*="__rbTagAdd"]').length : 0;
    window.__rbTagAdd('vibe');
    const hadInput = !!document.querySelector('#rb-tag-newin');
    window.__rbTagCommit('vibe', 'Quiet Luxury');
    window.__rbTagDone(true);
    const row = document.querySelector('.rb-lk-con .rbc-tags');
    return { dashed, hadInput, rowText: row ? row.textContent : '' };
  });
  check('tags · Wear and Vibe carry the dashed + tag door', custom.dashed === 2, String(custom.dashed));
  check('tags · a typed tag becomes an inline input, then a chip on the row',
    custom.hadInput === true && /Quiet Luxury/.test(custom.rowText), custom.rowText);
  await page.waitForTimeout(400);
  const customWrite = writes.filter((w) => w.method === 'PATCH' && /^looks\?/.test(w.url) && Array.isArray(w.body?.tags)).pop();
  check('tags · a custom vibe stores prefixed, keeping the axes recoverable',
    !!customWrite && customWrite.body.tags.includes('vibe:Quiet Luxury'),
    JSON.stringify(customWrite && customWrite.body.tags));

  // Drag & drop role casting (A3 amendment, 2026-08-07): every rack row is
  // draggable, a drop under a strip re-casts freely — the strips educate,
  // they never constrain — and the cast persists on look_pieces.role.
  const cast = await page.evaluate(() => {
    const wraps = document.querySelectorAll('.rb-lk-con .rbc-rack .rbc-dragrow[draggable="true"]');
    const name0 = document.querySelector('.rb-lk-con .rbc-rack .rbc-dragrow[data-roledrag="0"] .rbc-name')?.textContent;
    window.__lkDRoleDrop(0, 'The Exclamation Point');
    const rack = document.querySelector('.rb-lk-con .rbc-rack');
    const names = [];
    let inGroup = false;
    Array.from(rack.children).forEach((el) => {
      if (el.classList.contains('rbc-rolestrip')) inGroup = el.textContent.trim() === 'The Exclamation Point';
      else if (inGroup) { const n = el.querySelector('.rbc-name'); if (n) names.push(n.textContent); }
    });
    return { draggable: wraps.length, name0, names };
  });
  check('roles · every rack row is draggable', cast.draggable === 4, String(cast.draggable));
  check('roles · a drop re-casts the piece under the target strip',
    !!cast.name0 && cast.names.includes(cast.name0), JSON.stringify(cast));
  await page.waitForTimeout(400);
  const roleWrite = writes.filter((w) => w.method === 'POST' && /^look_pieces/.test(w.url)).pop();
  const roleRows = roleWrite && (Array.isArray(roleWrite.body) ? roleWrite.body : [roleWrite.body]);
  check('roles · the cast persists on look_pieces.role',
    !!roleRows && roleRows.some((r) => r.role === 'The Exclamation Point'), JSON.stringify(roleRows));


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
    window.__lkDSwap(3);   // the tote
    const modal = document.getElementById('lkd-swap-modal');
    return {
      open: !!modal,
      candidate: /Raffia basket bag/.test(modal?.textContent || ''),
      snap: /Snap mine/.test(modal?.textContent || ''),
    };
  });
  check('swap · opens the SAME modal the consoles use', swap.open === true);
  check('swap · her wardrobe by category, plus Snap mine',
    swap.candidate === true && swap.snap === true, JSON.stringify(swap));

  const promo = await page.evaluate(() => {
    window.__lkDSwapApply(3, 'w-bag2');
    const panel = document.querySelector('.rb-lk-panel');
    return {
      line: panel?.querySelector('.pl')?.textContent,
      body: panel?.querySelector('.pb')?.textContent,
      acts: Array.from(panel?.querySelectorAll('.rb-lk-panel-acts button') || []).map((b) => b.textContent),
      piecesUnchanged: Array.from(document.querySelectorAll('.rb-lk-con .rbc-rack .rbc-name')).map((n) => n.textContent),
      modalGone: !document.getElementById('lkd-swap-modal'),
    };
  });
  check('promotion · a look with history asks before it changes',
    /has been worn 2 times/.test(promo.line || ''), promo.line);
  check('promotion · offers Update / Save as a new look / Leave it',
    promo.acts.join(' | ') === 'Update this look | Save as a new look | Leave it', JSON.stringify(promo.acts));
  check('promotion · nothing is applied until she chooses',
    promo.piecesUnchanged.includes('Woven straw tote') && promo.modalGone, JSON.stringify(promo.piecesUnchanged));

  const promoted = await page.evaluate(() => {
    window.__lkPromote();
    return {
      title: ((e) => e ? (e.tagName === 'INPUT' ? e.value : e.textContent) : null)(document.getElementById('rb-lk-title')),
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
    window.__lkDSwapApply(2, 'w-sho2');
    window.__lkUpdate();
    return {
      note: document.querySelector('.rb-lk-panel .pl')?.textContent,
      wears: document.querySelectorAll('.rb-lk-stat')[1]?.querySelector('b')?.textContent,
      pieces: Array.from(document.querySelectorAll('.rb-lk-con .rbc-rack .rbc-name')).map((n) => n.textContent),
      firstWearSnapshot: document.querySelector('.rb-lk-wear .pc')?.textContent,
    };
  });
  check('update · keeps the look and states history is intact',
    /2 wears stay as they were/.test(upd.note || ''), upd.note);
  check('update · wear count survives the edit', upd.wears === '2', String(upd.wears));
  check('update · composition changed', upd.pieces.includes('Tan leather slides'), JSON.stringify(upd.pieces));
  check('update · the wear keeps its own snapshot (history never rewritten)',
    /Flat leather sandals/.test(upd.firstWearSnapshot || ''), upd.firstWearSnapshot);

  // Flick routes through the same gate: history asks, no history applies
  const flickGate = await page.evaluate(() => {
    window.__lkDFlip(3, 1);   // lk-1 has wears → must ask, not apply
    const asked = !!Array.from(document.querySelectorAll('.rb-lk-panel .pl'))
      .find((el) => /has been worn/.test(el.textContent));
    window.__lkCancelPromote();
    window.__lkOpen('lk-2');
    // Rows regroup under the formula strips (Look Template spec A3), so
    // positions aren't stable — assert on names, not nth-child.
    const names = () => Array.from(document.querySelectorAll('.rb-lk-con .rbc-rack .rbc-name')).map((n) => n.textContent);
    const before = names();
    window.__lkDFlip(2, 1);   // no history → applies directly
    const after = names();
    window.__lkOpen('lk-1');
    return { asked, before, after };
  });
  check('flick · a look with history asks first', flickGate.asked === true, JSON.stringify(flickGate));
  check('flick · a look without history just takes it',
    flickGate.before.includes('Tan leather slides') && !flickGate.after.includes('Tan leather slides')
      && flickGate.after.includes('Flat leather sandals'), JSON.stringify(flickGate));

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
// 5 · The composer (Phase 2) — the live console: Look panel left at 480px,
// rack rows with flick / swap / ✕ right, save at two pieces
// ─────────────────────────────────────────────────────────────────────────
{
  const { ctx, page, errs, writes } = await boot(browser);
  await openLooks(page);
  await page.evaluate(() => window.__lkNew());
  await page.waitForTimeout(300);

  const c0 = await page.evaluate(() => {
    const empties = Array.from(document.querySelectorAll('.rbc-row.rb-lk-rempty'));
    const con = document.querySelector('.rb-lk-con');
    return {
      lookv2: document.body.classList.contains('rb-lookv2'),
      cols: con ? getComputedStyle(con).gridTemplateColumns : '',
      slots: empties.map((r) => r.querySelector('.vslot')?.textContent),
      emptyNames: empties.map((r) => r.querySelector('.rbc-name')?.textContent),
      panel: !!document.querySelector('.rb-lk-con .rbc-panel'),
      saveShown: !!document.querySelector('.rb-lk-save'),
      rackEyebrow: document.querySelector('.rbc-rackhead .ey')?.textContent,
      titleValue: document.getElementById('rb-lk-newtitle')?.value,
      titlePlaceholder: document.getElementById('rb-lk-newtitle')?.placeholder,
      namedByYou: /Named by you/.test(document.body.textContent || ''),
      addPiece: !!document.querySelector('.rbc-addpiece'),
    };
  });
  check('composer · no page errors', errs.length === 0, errs.join(' | ').slice(0, 240));
  // A fresh session has rendered no console — the composer must inject the
  // shared stylesheet itself, and the styles must actually apply.
  const css = await page.evaluate(() => {
    const row = document.querySelector('.rbc-row');
    const ey = document.querySelector('.rbc-rackhead .ey');
    return {
      sheet: !!document.getElementById('rbc-style'),
      rowIsGrid: row ? getComputedStyle(row).display === 'grid' : false,
      eyCaps: ey ? getComputedStyle(ey).textTransform === 'uppercase' : false,
    };
  });
  check('composer · shared console stylesheet is injected without a console render',
    css.sheet && css.rowIsGrid && css.eyCaps, JSON.stringify(css));
  check('composer · the standing console scale: 480px look column',
    /^480px/.test(c0.cols) && c0.lookv2, c0.cols + ' lookv2=' + c0.lookv2);
  check('composer · the look panel is the shared rbc-panel', c0.panel === true);
  check('composer · four empty slot rows: Top, Bottom, Shoe, Bag',
    c0.slots.join(',') === 'Top,Bottom,Shoe,Bag', JSON.stringify(c0.slots));
  check('composer · empty rows invite ("Add a top" …)',
    c0.emptyNames.join(' | ') === 'Add a top | Add a bottom | Add a shoe | Add a bag',
    JSON.stringify(c0.emptyNames));
  check('composer · Save is withheld until there is a look', c0.saveShown === false);
  // B1 amendment (2026-08-07): the empty state teaches the formula — every
  // empty row sits under a GHOSTED strip forecast from its slot. Education
  // only: the forecast never binds what she adds where.
  const ghosts = await page.evaluate(() => {
    const strips = Array.from(document.querySelectorAll('.rb-lk-con .rbc-rack .rbc-rolestrip'));
    return {
      labels: strips.map((s) => s.textContent.trim()),
      allGhost: strips.length > 0 && strips.every((s) => s.classList.contains('ghost')),
    };
  });
  check('composer · empty rows sit under ghosted formula strips',
    JSON.stringify(ghosts.labels) === JSON.stringify(['The Canvas', 'The Anchor', 'The Texture', 'The Exclamation Point'])
      && ghosts.allGhost, JSON.stringify(ghosts));
  check('composer · the rack header reads The Rack', c0.rackEyebrow === 'The Rack', c0.rackEyebrow);
  check('composer · the name field is a placeholder, "Name your Look"',
    c0.titleValue === '' && c0.titlePlaceholder === 'Name your Look',
    JSON.stringify([c0.titleValue, c0.titlePlaceholder]));
  check('composer · no "Named by you" subtext', c0.namedByYou === false);
  check('composer · the shared "+ Add a piece" is available', c0.addPiece === true);

  // Picking happens inside the empty row
  const pick = await page.evaluate(() => {
    window.__lkRowOpen('r1');
    const inRow = document.querySelector('.rb-lk-rempty .rb-lk-pick');
    const opts = Array.from(document.querySelectorAll('.rb-lk-rempty .rb-lk-opt span')).map((s) => s.textContent);
    return { insideTheRow: !!inRow, opts };
  });
  check('composer · the picker opens inside the empty row', pick.insideTheRow === true);
  check('composer · the Top row offers tops and dresses, not bottoms',
    pick.opts.includes('Cream silk shirt') && pick.opts.includes('Bias slip dress') && !pick.opts.includes('Linen shorts'),
    JSON.stringify(pick.opts));
  check('composer · the picker always offers the normal add flow ("New piece")',
    pick.opts.includes('New piece'), JSON.stringify(pick.opts));


  const one = await page.evaluate(() => {
    window.__lkRowPick('r1', 'w-top1');
    const row = document.querySelector('.rbc-row:not(.rb-lk-rempty)');
    return {
      name: row?.querySelector('.rbc-name')?.textContent,
      owned: /In your wardrobe/.test(row?.querySelector('.rbc-sub')?.textContent || ''),
      flick: row?.querySelectorAll('.rbc-arrow').length,
      swap: !!Array.from(row?.querySelectorAll('.rbc-act') || []).find((b) => /Swap/.test(b.textContent)),
      x: !!row?.querySelector('.rbc-rm'),
      boardTiles: document.querySelectorAll('.rb-lk-con .rbc-board .rbc-tile').length,
      saveShown: !!document.querySelector('.rb-lk-save'),
    };
  });
  check('composer · a filled row is the shared rack card',
    one.name === 'Cream silk shirt' && one.owned === true, `${one.name}/${one.owned}`);
  check('composer · the card carries the flick cluster', one.flick === 2, String(one.flick));
  check('composer · the card carries Swap', one.swap === true);
  check('composer · the card carries the corner ✕', one.x === true);
  check('composer · the look board populates as pieces land', one.boardTiles === 1, String(one.boardTiles));
  check('composer · one piece is not yet a look (no Save)', one.saveShown === false);
  // The strip inks in as the role is cast (B1), and a drag re-casts freely
  const inked = await page.evaluate(() => {
    const stripOf = (label) => Array.from(document.querySelectorAll('.rb-lk-con .rbc-rack .rbc-rolestrip'))
      .find((s) => s.textContent.trim() === label);
    const before = { canvas: stripOf('The Canvas')?.classList.contains('ghost') };
    window.__lkCRoleDrop(0, 'The Anchor');
    const after = {
      canvasGhost: stripOf('The Canvas')?.classList.contains('ghost'),
      anchorGhost: stripOf('The Anchor')?.classList.contains('ghost'),
    };
    window.__lkCRoleDrop(0, 'The Canvas');
    return { beforeCanvasGhost: before.canvas, ...after };
  });
  check('composer · a landed piece inks its strip; a drag re-casts it freely',
    inked.beforeCanvasGhost === false && inked.canvasGhost === true && inked.anchorGhost === false,
    JSON.stringify(inked));

  // The flick cycles same-category pieces
  const flicked = await page.evaluate(() => {
    window.__lkCFlip(0, 1);
    return { name: document.querySelector('.rbc-row:not(.rb-lk-rempty) .rbc-name')?.textContent };
  });
  check('composer · flick moves to the next piece of that kind',
    flicked.name === 'Ribbed white tank' || flicked.name === 'Bias slip dress', flicked.name);
  await page.evaluate(() => window.__lkRowPick('r1', 'w-top1'));

  // Swap opens the SAME modal the consoles use
  const swap = await page.evaluate(() => {
    window.__lkCSwap(0);
    const modal = document.getElementById('lk-swap-modal');
    return {
      open: !!modal,
      head: modal?.querySelector('p')?.textContent,
      wardrobe: /From your wardrobe/.test(modal?.textContent || ''),
      snap: /Snap mine/.test(modal?.textContent || ''),
    };
  });
  check('composer · Swap opens the shared swap modal', swap.open === true);
  check('composer · the modal offers her wardrobe and Snap mine',
    swap.wardrobe === true && swap.snap === true, JSON.stringify(swap));
  const swapped = await page.evaluate(() => {
    window.__lkCSwapApply(0, 'w-top2');
    return {
      modalGone: !document.getElementById('lk-swap-modal'),
      name: document.querySelector('.rbc-row:not(.rb-lk-rempty) .rbc-name')?.textContent,
    };
  });
  check('composer · the swap applies and closes the modal',
    swapped.modalGone && swapped.name === 'Ribbed white tank', JSON.stringify(swapped));

  // ✕ returns a core slot to its placeholder
  const xed = await page.evaluate(() => {
    document.querySelector('.rbc-row:not(.rb-lk-rempty) .rbc-rm').click();
    return {
      empties: document.querySelectorAll('.rbc-row.rb-lk-rempty').length,
      filled: document.querySelectorAll('.rbc-row:not(.rb-lk-rempty)').length,
    };
  });
  check('composer · ✕ empties the slot back to a placeholder',
    xed.empties === 4 && xed.filled === 0, JSON.stringify(xed));

  const two = await page.evaluate(() => {
    window.__lkRowPick('r1', 'w-top1');
    window.__lkRowPick('r2', 'w-bot1');
    return {
      saveShown: !!document.querySelector('.rb-lk-save'),
      note: document.querySelector('.rb-lk-con .rbc-quote')?.textContent,
      boardTiles: document.querySelectorAll('.rb-lk-con .rbc-board .rbc-tile').length,
      yours: document.querySelector('.rb-lk-con .rbc-yours')?.textContent,
    };
  });
  check('composer · Save appears at two pieces', two.saveShown === true);
  check('composer · Robes describes the look once it can',
    two.note === 'Cream silk shirt with the barrel-leg jeans.', two.note);
  check('composer · both pieces are on the board', two.boardTiles === 2, String(two.boardTiles));
  check('composer · ownership line is the canonical console copy',
    /2.of.2 from your wardrobe/.test(two.yours || ''), two.yours);

  // A dress in the Top slot retires the Bottom row
  const dress = await page.evaluate(() => {
    window.__lkRowClear('r2');
    window.__lkRowPick('r1', 'w-dre1');
    return { slots: Array.from(document.querySelectorAll('.rbc-row .vslot')).map((b) => b.textContent) };
  });
  check('composer · a dress quietly retires the Bottom slot',
    !dress.slots.includes('Bottom'), JSON.stringify(dress.slots));

  // "+ Add a piece" routes through the shared chooser and its apply lands
  const added = await page.evaluate(() => {
    window.__lkRowPick('r1', 'w-top1');
    window.__lkRowPick('r3', 'w-sho1');
    window.__lkApplyNew('w-acc1');
    return {
      names: Array.from(document.querySelectorAll('.rbc-row:not(.rb-lk-rempty) .rbc-name')).map((n) => n.textContent),
      yours: document.querySelector('.rb-lk-con .rbc-yours')?.textContent,
    };
  });
  check('composer · an added piece lands as its own rack card',
    added.names.includes('Gold hoops'), JSON.stringify(added.names));
  check('composer · pieces are never double-counted',
    /3.of.3 from your wardrobe/.test(added.yours || ''), added.yours);

  const saved = await page.evaluate(() => {
    window.__lkRowPick('r4', 'w-bag1');
    window.__lkNewTitleInput('Terrace mornings');
    window.__lkSave();
    return {
      gridShown: document.getElementById('rb-lk-grid')?.style.display !== 'none',
      titles: Array.from(document.querySelectorAll('#rb-lk-grid .lt-title')).map((t) => t.textContent),
      toast: (document.getElementById('toast-msg') || document.getElementById('toast'))?.textContent,
      tab: document.querySelector('#rb-wsub [data-view="looks"]')?.textContent,
    };
  });
  check('composer · save lands back on the grid, no interstitial',
    saved.gridShown && saved.titles.includes('Terrace mornings'), JSON.stringify([saved.gridShown, saved.titles]));
  check('composer · the confirmation is a quiet toast',
    /Terrace mornings saved to Looks/.test(saved.toast || ''), saved.toast);
  check('composer · the tab count grows', saved.tab === 'Looks (3)', String(saved.tab));
  await page.waitForTimeout(600);
  const lookWrite = writes.filter((w) => w.method === 'POST' && /^looks/.test(w.url)).pop();
  const pieceWrite = writes.filter((w) => w.method === 'POST' && /^look_pieces/.test(w.url)).pop();
  check('composer · writes the look with her name, not provisional',
    !!lookWrite && lookWrite.body?.name === 'Terrace mornings' && lookWrite.body?.name_provisional === false && lookWrite.body?.source === 'manual',
    JSON.stringify(lookWrite?.body || null));
  // the hoops landed in the Bag slot (first empty slot taking Accessories)
  // and the test then swapped the tote in over them — 3 pieces at save
  check('composer · writes its composition with slots',
    Array.isArray(pieceWrite?.body) && pieceWrite.body.length === 3 && pieceWrite.body.every((p) => !!p.slot),
    JSON.stringify(pieceWrite?.body || null));
  check('composer · a saved look has no wears (it is a plan, not a fact)',
    !writes.some((w) => w.method === 'POST' && /^wears/.test(w.url)));

  // An untouched name saves as the offered name, provisional
  const offered = await page.evaluate(() => {
    window.__lkNew();
    window.__lkRowPick('r1', 'w-top2');
    window.__lkRowPick('r2', 'w-bot2');
    window.__lkSave();
    const tile = Array.from(document.querySelectorAll('#rb-lk-grid .lt-title')).find((t) => t.textContent === 'The tank one' && t.classList.contains('prov'));
    return { onGrid: !!tile };
  });
  check('composer · an untouched name saves as the offered name, provisional on the grid',
    offered.onGrid === true, JSON.stringify(offered));
  await page.waitForTimeout(400);
  const provWrite = writes.filter((w) => w.method === 'POST' && /^looks/.test(w.url)).pop();
  check('composer · and is marked provisional', provWrite?.body?.name_provisional === true,
    JSON.stringify(provWrite?.body || null));
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────
// 5b · An empty category never dead-ends — the normal add flow from a slot
// ─────────────────────────────────────────────────────────────────────────
{
  const { ctx, page, errs } = await boot(browser, { dropCat: 'Shoes', seed: false });
  await openLooks(page);
  await page.evaluate(() => window.__lkNew());
  await page.waitForTimeout(300);

  const shoe = await page.evaluate(() => {
    window.__lkRowOpen('r3');
    const row = Array.from(document.querySelectorAll('.rb-lk-rempty'))
      .find((r) => r.querySelector('.vslot')?.textContent === 'Shoe');
    return {
      deadEnd: /Nothing else in that category yet/.test(row?.textContent || ''),
      invite: /Nothing filed here yet/.test(row?.textContent || ''),
      addBtn: !!Array.from(row?.querySelectorAll('button') || []).find((b) => /Add a piece/.test(b.textContent)),
    };
  });
  check('no-shoes · no page errors', errs.length === 0, errs.join(' | ').slice(0, 240));
  check('no-shoes · the empty category invites instead of dead-ending',
    !shoe.deadEnd && shoe.invite, JSON.stringify(shoe));
  check('no-shoes · and offers the normal add flow', shoe.addBtn === true);

  const wa = await page.evaluate(() => {
    window.__lkRowSnap('r3');
    return new Promise((res) => setTimeout(() => {
      const m = document.getElementById('wa-modal');
      res({ open: !!m && m.classList.contains('open') });
    }, 600));
  });
  check('no-shoes · the slot opens the standard wardrobe add modal', wa.open === true, JSON.stringify(wa));
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
    return { tiles: document.querySelectorAll('#rb-lk-grid .rb-lk-tile').length };
  });
  check('degrade · no page errors when the tables are missing', errs.length === 0, errs.join(' | ').slice(0, 240));
  check('degrade · a look still saves locally and lands on the grid', g.tiles === 1, String(g.tiles));
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
    const det = document.querySelector('.rb-lk-con');
    return {
      stacked: det ? getComputedStyle(det).gridTemplateColumns.split(' ').length === 1 : false,
      overflow: document.documentElement.scrollWidth <= window.innerWidth + 1,
      actions: document.querySelectorAll('.rb-lk-acts .rb-lk-act').length,
    };
  });
  check('390px · detail stacks', md.stacked === true);
  check('390px · all three actions survive', md.actions === 3, String(md.actions));
  check('390px · no horizontal overflow on the detail', md.overflow === true);

  const mc = await page.evaluate(() => {
    window.__lkNew();
    const n = document.querySelector('.rb-lk-con');
    return {
      stacked: n ? getComputedStyle(n).gridTemplateColumns.split(' ').length === 1 : false,
      rowsFullWidth: (() => {
        const r = document.querySelector('.rbc-row');
        const rack = document.querySelector('.rbc-rack');
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
