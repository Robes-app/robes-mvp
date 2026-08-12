// Looks harness — boots the real dashboard with Supabase + REST stubbed and
// walks the Look-as-entity surfaces: the Lookbook's All looks shelf (IA
// 2026-08-08 — looks moved out of the wardrobe), the sort toggle, Look
// detail with its actions, wear confirmation + the quiet undo, variant
// promotion, the New look composer, the Calendar tab and the empty-day
// wear-a-look door. Also pins the LookTile extraction (brief B2): a DayCard
// must render byte-identically to its pre-extraction markup.
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
    let postBody = null;
    if (m !== 'GET') {
      try { postBody = req.postDataJSON(); } catch (_) { postBody = req.postData(); }
      writes.push({ method: m, url: u.split('/rest/v1/')[1] || u, body: postBody });
    }
    const missing = () => r.fulfill({
      status: 404, contentType: 'application/json',
      body: JSON.stringify({ code: 'PGRST205', message: 'Could not find the table \'public.looks\' in the schema cache' }),
    });
    if (/\/(looks|look_pieces|wears)\b/.test(u) && !looksTable) return missing();
    // PostgREST with Prefer: return=representation echoes the inserted row.
    // Returning [] made every _tgEnsure fall through to a re-read that also
    // returned [], so no tag ever got an id and its link was dropped.
    if (m !== 'GET') {
      const echo = /^tags\b/.test(u.split('/rest/v1/')[1] || '') && postBody
        ? JSON.stringify([Object.assign({ id: 'tag-' + (postBody.slug || 'x') }, postBody)])
        : '[]';
      return r.fulfill({ status: 201, contentType: 'application/json', body: echo });
    }
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
  // The All looks shelf of the Lookbook — where looks live (IA 2026-08-08)
  await page.evaluate(() => window.__lkGo && window.__lkGo());
  await page.waitForTimeout(600);
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
    const seg = Array.from(document.querySelectorAll('#sn-viewseg button')).map((b) => ({ v: b.dataset.mv, t: b.textContent, on: b.classList.contains('on') }));
    const vis = (id) => { const el = document.getElementById(id); return !!el && el.offsetParent !== null; };
    return {
      seg,
      shelves: !!document.getElementById('sn-tabs'),
      wsub: Array.from(document.querySelectorAll('#rb-wsub button')).map((b) => b.dataset.view),
      eyebrow: document.getElementById('sn-eyebrow')?.textContent,
      wrapVisible: vis('rb-lk-wrap'),
      itemGridHidden: !vis('sn-grid'),
      tiles: document.querySelectorAll('#rb-lk-grid .rb-lk-tile').length,
      addCard: !!document.querySelector('#rb-lk-grid .rb-add-card'),
      addCardText: document.querySelector('#rb-lk-grid .rb-add-card')?.textContent,
      rmx: document.querySelectorAll('#rb-lk-grid .rb-lk-rmx').length,
      wearBtns: document.querySelectorAll('#rb-lk-grid .rb-lk-wearx').length,
      titles: Array.from(document.querySelectorAll('#rb-lk-grid .lt-title')).map((t) => t.textContent),
      provisional: Array.from(document.querySelectorAll('#rb-lk-grid .lt-title.prov')).map((t) => t.textContent),
      mosaicCells: document.querySelectorAll('#rb-lk-grid .rb-lk-tilewrap:first-child .rb-lk-mos i').length,
      sortLabel: document.querySelector('.rb-lk-sort span')?.textContent,
      sortArrow: document.querySelector('.rb-lk-sort b')?.textContent,
      eyebrows: Array.from(document.querySelectorAll('#rb-lk-grid .lt-ey')).map((e) => e.textContent),
      cardDress: document.querySelectorAll('#rb-lk-grid .lt-card').length,
      path: location.pathname,
    };
  });
  check('shelf · the Lookbook is Looks | Diary, opening on Looks',
    s.seg.map((t) => t.t).join(',') === 'Looks,Diary' && s.seg[0].on === true && s.seg[1].on === false,
    JSON.stringify(s.seg));
  check('shelf · the type shelves are retired (one looks view)', s.shelves === false);
  check('shelf · the wardrobe holds pieces and wishlist only (Looks moved out)',
    s.wsub.join(',') === 'all,wishlist', JSON.stringify(s.wsub));
  check('shelf · the page eyebrow reads Lookbook', s.eyebrow === 'Lookbook', String(s.eyebrow));
  check('tab · looks surface shown, the item grid stands down',
    s.wrapVisible && s.itemGridHidden, JSON.stringify([s.wrapVisible, s.itemGridHidden]));
  check('tab · deep-linkable path', s.path === '/lookbook', s.path);
  check('grid · every look card carries the Wear verb', s.wearBtns === 2, String(s.wearBtns));
  check('grid · cards carry the type eyebrow in the shared card dress',
    s.eyebrows.every((e) => e === 'Look') && s.eyebrows.length === 2 && s.cardDress === 2,
    JSON.stringify([s.eyebrows, s.cardDress]));
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
    const newBtn = barEl && Array.from(barEl.querySelectorAll('button')).find((b) => /\+ New/.test(b.textContent));
    window.__lkRefineToggle();
    const drawer = document.querySelector('.rb-lk-refwrap');
    const axes = drawer ? Array.from(drawer.querySelectorAll('.rb-lkref-ax')).map((e) => e.textContent) : [];
    const chip = drawer && drawer.querySelector('.rb-lkref-chip[data-val="occasion"]');
    if (chip) chip.click();
    const shown = document.querySelectorAll('#rb-lk-grid .rb-lk-tile').length;
    const none = /No looks carry those tags/.test(document.getElementById('rb-lk-grid').textContent);
    window.__lkRefineClear();
    const restored = document.querySelectorAll('#rb-lk-grid .rb-lk-tile').length;
    window.__lkRefineToggle();
    return { newBtn: !!newBtn, axes, shown, none, restored };
  });
  check('bar · the + New split button sits in the grid bar', bar.newBtn === true);
  // ADR-002 §7: Light is deleted, and Vibe only renders once she has one —
  // the axis is her vocabulary, so an empty one is nothing to show.
  check('bar · Refine opens the surviving tag axes',
    JSON.stringify(bar.axes) === JSON.stringify(['Climate', 'Wear it for']), JSON.stringify(bar.axes));
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
    };
  });
  check('grid · ✕ deletes through the shared confirm',
    /Delete The tank one\?/.test(deleted.msg || '') && deleted.tiles === 1,
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
    document.querySelector('#sn-viewseg [data-mv="grid"]').click();
    return {
      gridShown: document.getElementById('rb-lk-grid')?.style.display !== 'none',
      tiles: document.querySelectorAll('#rb-lk-grid .rb-lk-tile').length,
    };
  });
  check('detail · tapping Looks in the segment lands the landing grid',
    tabBack.gridShown && tabBack.tiles === 2, JSON.stringify(tabBack));
  await page.evaluate(() => window.__lkOpen('lk-1'));
  await page.waitForTimeout(200);
  check('detail · named title is not provisional', d.title === 'The Thursday one' && d.provisional === false, `${d.title}/${d.provisional}`);
  check('detail · eyebrow reads Look for a named look', d.eyebrow === 'Look', d.eyebrow);
  check('detail · three load-bearing actions — Wear is the one scheduling verb',
    d.actions.join(' | ') === 'Wear it today | Wear on a day | Pack it', JSON.stringify(d.actions));
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
    // ADR-002: picks are by SLUG now, not by index into a fixed list
    window.__rbTagPick('climate', 'spring_summer');
    window.__rbTagPick('wear', 'occasion');
    window.__rbTagDone(true);
    const row = document.querySelector('.rb-lk-con .rbc-tags');
    return { hadSheet: !!sheet, groups, rowText: row ? row.textContent : '' };
  });
  check('tags · the sheet opens on the three surviving axes, Light gone',
    tagged.hadSheet && /Climate/.test(tagged.groups) && /Wear it for/.test(tagged.groups)
      && /Vibe/.test(tagged.groups) && !/Light/.test(tagged.groups), tagged.groups.slice(0, 200));
  check('tags · picks land back on the row', /Spring\/Summer/.test(tagged.rowText) && /Occasion/.test(tagged.rowText), tagged.rowText);
  await page.waitForTimeout(400);
  // Climate is a COLUMN now, and her edit is permanent: climate_source flips
  // to 'user' and the look is never re-derived again. Wear and Vibe go to the
  // shared namespace (tag_looks), not onto the looks row.
  const tagWrite = writes.find((w) => w.method === 'PATCH' && /^looks\?/.test(w.url) && w.body && w.body.climate_band);
  check('tags · the edit PATCHes climate_band and marks the override hers',
    !!tagWrite && tagWrite.body.climate_band === 'spring_summer' && tagWrite.body.climate_source === 'user',
    JSON.stringify(tagWrite && tagWrite.body));
  const linkWrite = writes.find((w) => w.method === 'POST' && /^tag_looks/.test(w.url));
  check('tags · wear/vibe land in the shared namespace, not on the look row',
    !!linkWrite, JSON.stringify(writes.filter(w => w.method === 'POST').map(w => w.url)));

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
  // The 'vibe:' prefix was a workaround for packing four axes into one flat
  // text[]. With a real namespace the axis is carried by tags.kind, so the
  // custom vibe is minted as its own row and slugged.
  const vibeTag = writes.find((w) => w.method === 'POST' && /^tags/.test(w.url)
    && w.body && w.body.kind === 'vibe');
  check('tags · a custom vibe mints a namespace row, slugged, no prefix',
    !!vibeTag && vibeTag.body.slug === 'quiet-luxury' && vibeTag.body.label === 'Quiet Luxury'
      && vibeTag.body.is_seed === false,
    JSON.stringify(vibeTag && vibeTag.body));

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

  // Wear on a day (the pin mechanics, in the wear vocabulary)
  const pinned = await page.evaluate(() => {
    window.__lkAct('pin');
    const btns = Array.from(document.querySelectorAll('.rb-lk-panel-acts .rb-lk-act')).map((b) => b.textContent);
    document.querySelectorAll('.rb-lk-panel-acts .rb-lk-act')[1].click();  // Tomorrow
    return { btns, done: document.querySelector('.rb-lk-panel .pl')?.textContent };
  });
  check('pin · offers today, tomorrow and a date', pinned.btns.length >= 3, JSON.stringify(pinned.btns));
  check('pin · confirms the day in the wear vocabulary', /^Wearing it /.test(pinned.done || ''), pinned.done);
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
      emptyRows: empties.length,
      ghostAdds: document.querySelectorAll('.rb-lk-con .rbc-rghost .rbc-act').length,
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
    // The empty composer holds no rows any more — the strips are the
    // styled markup to probe.
    const strip = document.querySelector('.rbc-rolestrip');
    const ey = document.querySelector('.rbc-rackhead .ey');
    return {
      sheet: !!document.getElementById('rbc-style'),
      stripIsFlex: strip ? getComputedStyle(strip).display === 'flex' : false,
      eyCaps: ey ? getComputedStyle(ey).textTransform === 'uppercase' : false,
    };
  });
  check('composer · shared console stylesheet is injected without a console render',
    css.sheet && css.stripIsFlex && css.eyCaps, JSON.stringify(css));
  check('composer · the standing console scale: 480px look column',
    /^480px/.test(c0.cols) && c0.lookv2, c0.cols + ' lookv2=' + c0.lookv2);
  check('composer · the look panel is the shared rbc-panel', c0.panel === true);
  // A2/B1 amendments (2026-08-07): NO slot-bound empty rows — a slot must
  // never forecast a role. The rack IS the formula: each awaiting role is
  // a dashed definition row with its own + Add; the trailing generic CTA
  // waits until every role is inked.
  check('composer · no slot-bound empty rows; four role rows carry the way in',
    c0.emptyRows === 0 && c0.addPiece === false && c0.ghostAdds === 4,
    JSON.stringify([c0.emptyRows, c0.addPiece, c0.ghostAdds]));
  check('composer · Save is withheld until there is a look', c0.saveShown === false);
  // B1 amendment (2026-08-07): the empty state teaches the formula — every
  // empty row sits under a GHOSTED strip forecast from its slot. Education
  // only: the forecast never binds what she adds where.
  const ghosts = await page.evaluate(() => {
    const strips = Array.from(document.querySelectorAll('.rb-lk-con .rbc-rack .rbc-rolestrip'));
    const notes = Array.from(document.querySelectorAll('.rb-lk-con .rbc-rack .rbc-rolenote')).map((n) => n.textContent);
    return {
      labels: strips.map((s) => s.textContent.trim()),
      allGhost: strips.length > 0 && strips.every((s) => s.classList.contains('ghost')),
      notes,
    };
  });
  check('composer · empty rows sit under ghosted formula strips',
    JSON.stringify(ghosts.labels) === JSON.stringify(['The Canvas', 'The Anchor', 'The Texture', 'The Exclamation Point'])
      && ghosts.allGhost, JSON.stringify(ghosts.labels));
  check('composer · each awaiting role carries its education line',
    ghosts.notes.length === 4
      && /Elevated basics balancing proportion and tone/.test(ghosts.notes[0])
      && /hero piece setting the look/.test(ghosts.notes[1])
      && /tactile layer/.test(ghosts.notes[2])
      && /signature finish/.test(ghosts.notes[3]),
    JSON.stringify(ghosts.notes));
  check('composer · the rack header reads The Rack', c0.rackEyebrow === 'The Rack', c0.rackEyebrow);
  check('composer · the name field is a placeholder, "Name your Look"',
    c0.titleValue === '' && c0.titlePlaceholder === 'Name your Look',
    JSON.stringify([c0.titleValue, c0.titlePlaceholder]));
  check('composer · no "Named by you" subtext', c0.namedByYou === false);
  // The empty look panel stretches to the rack's height — the whitespace
  // reads intentional, never a tower past the rack (Annie, 2026-08-07).
  const panelH = await page.evaluate(() => {
    const kids = document.querySelectorAll('.rb-lk-con > div');
    if (kids.length < 2) return null;
    return { left: Math.round(kids[0].getBoundingClientRect().height), right: Math.round(kids[1].getBoundingClientRect().height) };
  });
  check('composer · the empty look panel matches the rack\'s height',
    !!panelH && Math.abs(panelH.left - panelH.right) <= 2, JSON.stringify(panelH));

  // "+ Add a piece" opens the A2 chooser: What kind of piece? An EMPTY
  // look goes straight to all fifteen categories — no still-open gate.
  const chooser = await page.evaluate(() => {
    window.__lkAddOpen();
    const sheet = document.getElementById('rb-lkadd-sheet');
    return {
      open: !!sheet,
      head: /What kind of piece\?/.test(sheet?.textContent || ''),
      stillOpen: /Still open in this look/i.test(sheet?.textContent || ''),
      cats: sheet ? sheet.querySelectorAll('[data-lkadd-cat]').length : 0,
    };
  });
  check('composer · + Add a piece opens the A2 chooser', chooser.open && chooser.head, JSON.stringify(chooser));
  check('composer · an empty look offers all fifteen categories, no still-open gate',
    chooser.stillOpen === false && chooser.cats === 15, JSON.stringify(chooser));

  // A category opens the wardrobe picker (sheet-level filter) + Snap
  const pick = await page.evaluate(() => {
    document.querySelector('[data-lkadd-cat="Tops"]').click();
    const sheet = document.getElementById('rb-lkadd-sheet');
    const opts = Array.from(sheet?.querySelectorAll('.rb-lk-opt span') || []).map((s) => s.textContent);
    return {
      step2: /From your wardrobe\./.test(sheet?.textContent || ''),
      snap: /Snap a new piece/.test(sheet?.textContent || ''),
      caption: /files it to your wardrobe, then into the look/.test(sheet?.textContent || ''),
      opts,
    };
  });
  check('composer · a category opens the wardrobe picker with Snap a new piece',
    pick.step2 && pick.snap && pick.caption, JSON.stringify(pick));
  check('composer · the picker is category-filtered (Tops shows tops only)',
    pick.opts.includes('Cream silk shirt') && !pick.opts.includes('Bias slip dress') && !pick.opts.includes('Linen shorts'),
    JSON.stringify(pick.opts));

  const one = await page.evaluate(() => {
    const opt = Array.from(document.querySelectorAll('#rb-lkadd-sheet .rb-lk-opt'))
      .find((b) => b.querySelector('span')?.textContent === 'Cream silk shirt');
    opt.click();
    const sheetGone = !document.getElementById('rb-lkadd-sheet');
    const row = document.querySelector('.rbc-row:not(.rb-lk-rempty)');
    // Once the look holds a piece, the chooser leads with Still open
    window.__lkAddOpen();
    const reopened = document.getElementById('rb-lkadd-sheet');
    const stillOpen = /Still open in this look/i.test(reopened?.textContent || '');
    const stillChips = Array.from(reopened?.querySelectorAll('button[onclick*="__lkAddPickSlot"]') || []).map((b) => b.textContent);
    window.__lkAddClose();
    window.__rbLkSheetGone = sheetGone;
    window.__rbLkStill = { stillOpen, stillChips };
    return {
      name: row?.querySelector('.rbc-name')?.textContent,
      owned: /In your wardrobe/.test(row?.querySelector('.rbc-sub')?.textContent || ''),
      flick: row?.querySelectorAll('.rbc-arrow').length,
      swap: !!Array.from(row?.querySelectorAll('.rbc-act') || []).find((b) => /Swap/.test(b.textContent)),
      x: !!row?.querySelector('.rbc-rm'),
      boardTiles: document.querySelectorAll('.rb-lk-con .rbc-board .rbc-tile').length,
      saveShown: !!document.querySelector('.rb-lk-save'),
      roleNotes: document.querySelectorAll('.rb-lk-con .rbc-rack .rbc-rolenote').length,
    };
  });
  check('composer · a filled row is the shared rack card',
    one.name === 'Cream silk shirt' && one.owned === true, `${one.name}/${one.owned}`);
  check('composer · the education line gives way once its role is cast',
    one.roleNotes === 3, String(one.roleNotes));
  check('composer · the card carries the flick cluster', one.flick === 2, String(one.flick));
  check('composer · the card carries Swap', one.swap === true);
  check('composer · the card carries the corner ✕', one.x === true);
  check('composer · the look board populates as pieces land', one.boardTiles === 1, String(one.boardTiles));
  check('composer · one piece is not yet a look (no Save)', one.saveShown === false);
  const still = await page.evaluate(() => ({ gone: window.__rbLkSheetGone, ...window.__rbLkStill }));
  check('composer · picking a piece closes the sheet into the rack', still.gone === true);
  check('composer · with a piece placed, Still-open leads the chooser',
    still.stillOpen === true && JSON.stringify(still.stillChips) === JSON.stringify(['Bottom', 'Shoe', 'Bag']),
    JSON.stringify(still));
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

  // ✕ removes the row; the slot returns to the chooser's Still-open list
  // (no placeholder rows since the A2 amendment — slots never sit in the
  // rack empty, and never forecast a role)
  const xed = await page.evaluate(() => {
    document.querySelector('.rbc-row:not(.rb-lk-rempty) .rbc-rm').click();
    window.__lkAddOpen();
    const sheet = document.getElementById('rb-lkadd-sheet');
    const stillOpen = /Still open in this look/i.test(sheet?.textContent || '');
    window.__lkAddClose();
    return {
      empties: document.querySelectorAll('.rbc-row.rb-lk-rempty').length,
      filled: document.querySelectorAll('.rbc-row:not(.rb-lk-rempty):not(.rbc-rghost)').length,
      stillOpen,
    };
  });
  check('composer · ✕ removes the row; the slot returns to the chooser, never a bound placeholder',
    xed.empties === 0 && xed.filled === 0 && xed.stillOpen === false, JSON.stringify(xed));

  // A role row's + Add pre-casts that role on the pick — a TOP added
  // through The Anchor's row anchors (nothing dictates what goes where).
  const armed = await page.evaluate(() => {
    const row = Array.from(document.querySelectorAll('.rb-lk-con .rbc-rghost'))
      .find((r) => r.previousElementSibling?.textContent.trim() === 'The Anchor');
    row.querySelector('.rbc-act').click();
    const eyebrow = document.querySelector('#rb-lkadd-sheet p')?.textContent || '';
    document.querySelector('[data-lkadd-cat="Tops"]').click();
    Array.from(document.querySelectorAll('#rb-lkadd-sheet .rb-lk-opt'))
      .find((b) => b.querySelector('span')?.textContent === 'Cream silk shirt').click();
    const rack = document.querySelector('.rb-lk-con .rbc-rack');
    const names = [];
    let inGroup = false;
    Array.from(rack.children).forEach((el) => {
      if (el.classList.contains('rbc-rolestrip')) inGroup = el.textContent.trim() === 'The Anchor';
      else if (inGroup && !el.classList.contains('rbc-rghost')) {
        const n = el.querySelector('.rbc-name');
        if (n) names.push(n.textContent);
      }
    });
    window.__lkNew();   // reset roles + rows for the sections below
    return { eyebrow, names };
  });
  check('composer · a role row\'s + Add pre-casts the role — a top can anchor',
    /The Anchor/.test(armed.eyebrow) && armed.names.includes('Cream silk shirt'), JSON.stringify(armed));

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
    };
  });
  check('composer · save lands back on the grid, no interstitial',
    saved.gridShown && saved.titles.includes('Terrace mornings'), JSON.stringify([saved.gridShown, saved.titles]));
  check('composer · the confirmation is a quiet toast',
    /Terrace mornings saved to Looks/.test(saved.toast || ''), saved.toast);
  check('composer · the grid grows', saved.titles.length === 3, JSON.stringify(saved.titles));
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
    window.__lkAddOpen();
    document.querySelector('[data-lkadd-cat="Shoes"]').click();
    const sheet = document.getElementById('rb-lkadd-sheet');
    return {
      deadEnd: /Nothing else in that category yet/.test(sheet?.textContent || ''),
      invite: /Nothing filed under Shoes yet/.test(sheet?.textContent || ''),
      snapBtn: !!Array.from(sheet?.querySelectorAll('button') || []).find((b) => /Snap a new piece/.test(b.textContent)),
    };
  });
  check('no-shoes · no page errors', errs.length === 0, errs.join(' | ').slice(0, 240));
  check('no-shoes · the empty category invites instead of dead-ending',
    !shoe.deadEnd && shoe.invite, JSON.stringify(shoe));
  check('no-shoes · and offers the normal add flow', shoe.snapBtn === true);

  const wa = await page.evaluate(() => {
    window.__lkAddSnap();
    return new Promise((res) => setTimeout(() => {
      const m = document.getElementById('wa-modal');
      res({ open: !!m && m.classList.contains('open') });
    }, 600));
  });
  check('no-shoes · Snap opens the standard wardrobe add modal', wa.open === true, JSON.stringify(wa));
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────
// 6 · Early days — the empty state (A1)
// ─────────────────────────────────────────────────────────────────────────
{
  const { ctx, page, errs } = await boot(browser, { seed: false });
  await openLooks(page);
  // A truly empty account (no looks, nothing saved) gets the page-level
  // cold start — "Ways to fill it" — never a bare module empty state.
  const cold = await page.evaluate(() => ({
    waysShown: (() => { const el = document.getElementById('sn-empty'); return !!el && el.style.display !== 'none'; })(),
    wrapHidden: (() => { const el = document.getElementById('rb-lk-wrap'); return !el || el.offsetParent === null; })(),
  }));
  check('empty · a truly empty account keeps the ways-to-fill cold start',
    cold.waysShown === true && cold.wrapHidden === true, JSON.stringify(cold));
  // A key piece alone does NOT fill the Lookbook — it lives on Inspiration
  // (IA refinement 2026-08-10). The cold start holds.
  await page.evaluate(() => {
    localStorage.setItem('robes_style_notes__u-test',
      JSON.stringify([{ id: 1754630000000, type: 'key-piece', title: 'A piece', subtitle: 'Worn three ways', img: null }]));
    window.__lkGo();
  });
  await page.waitForTimeout(300);
  const kpOnly = await page.evaluate(() => ({
    waysShown: (() => { const el = document.getElementById('sn-empty'); return !!el && el.style.display !== 'none'; })(),
  }));
  check('empty · a key piece alone leaves the Lookbook on its cold start (it lives on Inspiration)',
    kpOnly.waysShown === true, JSON.stringify(kpOnly));
  // A daily look DOES fill the shelf — the unified stream shows it in the
  // shared card (eyebrow Look, date as status), the add card keeps the way
  // in, and sort/Refine stay withheld until an actual Look exists.
  await page.evaluate(() => {
    localStorage.setItem('robes_style_notes__u-test',
      JSON.stringify([{ id: 1754640000000, type: 'daily-look', title: 'A look', subtitle: 'Daily look · Tuesday', img: null,
        dlData: { anchor_date: '2026-08-05', worn: true } }]));
    window.__lkGo();
  });
  await page.waitForTimeout(300);
  const e = await page.evaluate(() => ({
    itemCards: document.querySelectorAll('#rb-lk-grid .lt-card').length,
    eyebrow: document.querySelector('#rb-lk-grid .lt-ey')?.textContent,
    meta: document.querySelector('#rb-lk-grid .lt-meta')?.textContent,
    addCard: !!document.querySelector('#rb-lk-grid .rb-add-card'),
    moduleEmpty: !!document.querySelector('.rb-lk-empty'),
    sortAbsent: !document.querySelector('.rb-lk-sort'),
    stat: document.querySelector('.rb-lk-statline')?.textContent,
  }));
  check('empty · no page errors', errs.length === 0, errs.join(' | ').slice(0, 240));
  check('empty · a saved daily look fills the shelf even with zero looks',
    e.itemCards === 1 && e.addCard === true, JSON.stringify(e));
  check('empty · daily look is not a type — eyebrow Look, date as status',
    e.eyebrow === 'Look' && e.meta === 'Worn 5 Aug', JSON.stringify([e.eyebrow, e.meta]));
  check('empty · no module empty state once anything exists', e.moduleEmpty === false);
  check('empty · sort and Refine stay withheld until a Look exists; the stat still counts',
    e.sortAbsent === true && e.stat === '1 look', JSON.stringify([e.sortAbsent, e.stat]));
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
  check('390px · one-up grid, matching the item shelves', m.cols === 1, String(m.cols));
  check('390px · metadata is printed where there is no hover', m.metaVisible === true);
  check('390px · no horizontal overflow on the grid', m.overflow === true);

  const md = await page.evaluate(() => {
    window.__lkOpen('lk-1');
    const det = document.querySelector('.rb-lk-con');
    const ey = document.querySelector('.rbc-rackhead .ey');
    const vslot = document.querySelector('.rbc-vp .vslot');
    const mslot = document.querySelector('.rbc-mslot');
    const badge = document.querySelector('.rbc-share-m');
    const action = document.querySelector('.rbc-action');
    const arrow = document.querySelector('.rbc-arrow');
    const act = document.querySelector('.rbc-acts .rbc-act');
    return {
      stacked: det ? getComputedStyle(det).gridTemplateColumns.split(' ').length === 1 : false,
      overflow: document.documentElement.scrollWidth <= window.innerWidth + 1,
      actions: document.querySelectorAll('.rb-lk-acts .rb-lk-act').length,
      rackEyHidden: ey ? getComputedStyle(ey).display === 'none' : true,
      vslotHidden: vslot ? getComputedStyle(vslot).display === 'none' : true,
      mslotShown: mslot ? getComputedStyle(mslot).display !== 'none' : false,
      badgeShown: badge ? getComputedStyle(badge).display !== 'none' : false,
      actionHidden: action ? getComputedStyle(action).display === 'none' : true,
      arrowH: arrow ? Math.round(arrow.getBoundingClientRect().height) : 0,
      actH: act ? Math.round(act.getBoundingClientRect().height) : 0,
    };
  });
  check('390px · detail stacks', md.stacked === true);
  check('390px · all three actions survive', md.actions === 3, String(md.actions));
  check('390px · no horizontal overflow on the detail', md.overflow === true);
  // Spec E · mobile parity
  check('390px E · one header — the rack\'s duplicate eyebrow folds away', md.rackEyHidden === true);
  check('390px E · slot and status share the row eyebrow',
    md.vslotHidden === true && md.mslotShown === true, JSON.stringify([md.vslotHidden, md.mslotShown]));
  // The Look detail carries no Share (Wear/Pin/Pack are its actions), so
  // the badge contract is probed on a synthetic console fragment — the
  // three generated consoles emit the same markup via cfg.lookActionHtml.
  const share = await page.evaluate(() => {
    const host = document.createElement('div');
    host.innerHTML = '<div class="rbc-board"><button class="rbc-share-m">s</button></div><div class="rbc-action"><button>Share</button></div>';
    document.body.appendChild(host);
    const out = {
      badgeShown: getComputedStyle(host.querySelector('.rbc-share-m')).display !== 'none',
      actionHidden: getComputedStyle(host.querySelector('.rbc-action')).display === 'none',
      detailBadge: !!document.querySelector('.rb-lk-con .rbc-share-m'),
    };
    host.remove();
    return out;
  });
  check('390px E · Share compresses to a badge on the mosaic, footer stays free',
    share.badgeShown === true && share.actionHidden === true && share.detailBadge === false, JSON.stringify(share));
  check('390px E · every action survives at 44px touch height',
    md.arrowH >= 44 && md.actH >= 44, JSON.stringify([md.arrowH, md.actH]));

  const mc = await page.evaluate(() => {
    window.__lkNew();
    window.__lkApplyNew('w-top1');   // the empty composer holds no rows now — measure a filled one
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

// ─────────────────────────────────────────────────────────────────────────
// 9 · IA — three tabs, three tenses (2026-08-08): the legacy Looks door,
// Wear on a card, the Calendar tab, and the empty-day wear-a-look flow
// ─────────────────────────────────────────────────────────────────────────
{
  const { ctx, page, errs, writes } = await boot(browser);

  // The legacy door: __waSetView('looks') redirects out of the wardrobe
  // onto the Lookbook's All looks shelf.
  await page.evaluate(() => window.App && window.App.showWardrobe && window.App.showWardrobe());
  await page.waitForTimeout(600);
  await page.evaluate(() => window.__waSetView('looks'));
  await page.waitForTimeout(600);
  const legacy = await page.evaluate(() => ({
    snOpen: document.getElementById('sn-page').style.display === 'block',
    wrapShown: (() => { const el = document.getElementById('rb-lk-wrap'); return !!el && el.offsetParent !== null; })(),
    wardrobeClosed: !document.querySelector('.wardrobe-panel')?.classList.contains('visible'),
    path: location.pathname,
  }));
  check('IA · the legacy Looks door lands on the Lookbook shelf',
    legacy.snOpen && legacy.wrapShown && legacy.wardrobeClosed && legacy.path === '/lookbook',
    JSON.stringify(legacy));

  // Wear on the card opens the detail with the day question armed.
  const cardWear = await page.evaluate(() => {
    const w = document.querySelector('.rb-lk-tilewrap .rb-lk-wearx');
    if (w) w.click();
    return {
      had: !!w,
      panel: document.querySelector('.rb-lk-panel .pl')?.textContent,
      actions: Array.from(document.querySelectorAll('.rb-lk-acts .rb-lk-act')).map((b) => b.textContent),
    };
  });
  check('IA · a card\'s Wear opens the detail asking which day',
    cardWear.had && /Which day\?/.test(cardWear.panel || ''), JSON.stringify(cardWear));

  // The unified stream (cohesion pass): a saved daily look joins the looks
  // in one card language; a holiday edit rides the pinned row above it,
  // and a key piece stays off the page entirely (it lives on Inspiration).
  const uni = await page.evaluate(() => {
    localStorage.setItem('robes_style_notes__u-test', JSON.stringify([
      { id: 1754640000000, type: 'daily-look', title: 'A Dublin day', subtitle: 'Daily look · Wednesday', img: null },
      { id: 1754640000001, type: 'travel-edit', title: 'Ibiza holiday edit', subtitle: 'Travel edit · Ibiza', img: null,
        tvData: { capsule: Array(12).fill({}), looks: Array(6).fill({}), dateFrom: '2026-08-07', tripDays: 8 } },
      { id: 1754640000002, type: 'key-piece', title: 'Umbro shorts', subtitle: 'Worn three ways', img: null },
    ]));
    window.__lkGo();
    const hol = document.getElementById('rb-lk-hol');
    return {
      cards: document.querySelectorAll('#rb-lk-grid .lt-card').length,
      eyebrows: Array.from(document.querySelectorAll('#rb-lk-grid .lt-ey')).map((e) => e.textContent).sort(),
      itemCard: Array.from(document.querySelectorAll('#rb-lk-grid .lt-card')).some((c) => /A Dublin day/.test(c.textContent)),
      kpInStream: /Umbro shorts/.test(document.getElementById('rb-lk-grid')?.textContent || ''),
      holShown: !!hol && hol.style.display !== 'none',
      holCards: document.querySelectorAll('#rb-lk-hol .rb-lk-holcard:not(.new)').length,
      holMeta: document.querySelector('#rb-lk-hol .rb-lk-holcard .hm')?.textContent,
      holNew: !!document.querySelector('#rb-lk-hol .rb-lk-holcard.new'),
      newSplit: /\+ New ▾/.test(document.getElementById('rb-lk-bar')?.textContent || ''),
      stat: document.querySelector('#rb-lk-bar .rb-lk-statline')?.textContent,
      allRow: (() => {
        const row = document.querySelector('#rb-lk-allhead .rb-lk-allrow');
        return {
          label: row?.querySelector('.rb-lk-sec')?.textContent,
          sortHere: !!row?.querySelector('.rb-lk-sort'),
          sortInBar: !!document.querySelector('#rb-lk-bar .rb-lk-sort'),
        };
      })(),
    };
  });
  check('IA · the stream holds looks and daily looks in one card language ("daily look" is not a type)',
    uni.cards === 3 && uni.itemCard && JSON.stringify(uni.eyebrows) === JSON.stringify(['Look', 'Look', 'Look']),
    JSON.stringify(uni));
  check('IA · a key piece never enters the Lookbook stream', uni.kpInStream === false);
  check('IA · holiday edits ride the pinned row, with + New at its end',
    uni.holShown && uni.holCards === 1 && uni.holNew === true && uni.holMeta === '12 pieces · 6 looks · 7–14 Aug',
    JSON.stringify([uni.holShown, uni.holCards, uni.holNew, uni.holMeta]));
  check('IA · one + New button, split two ways', uni.newSplit === true);
  check('IA · the top row carries the collection stat; sort/Refine align with All looks',
    uni.stat === '3 looks · 1 holiday edit' && uni.allRow.label === 'All looks'
      && uni.allRow.sortHere === true && uni.allRow.sortInBar === false,
    JSON.stringify([uni.stat, uni.allRow]));
  const split = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('#rb-lk-bar button')).find((b) => /\+ New ▾/.test(b.textContent));
    btn.click();
    const menu = document.getElementById('rb-lk-newmenu');
    const opts = menu ? Array.from(menu.querySelectorAll('.card button')).map((b) => b.textContent) : [];
    menu?.remove();
    return { opts };
  });
  check('IA · the split offers New Look and New holiday edit',
    JSON.stringify(split.opts) === JSON.stringify(['New Look', 'New holiday edit']), JSON.stringify(split.opts));

  // A generic look opens hosted as a daily look (today's view), with the
  // quiet door back to the Look details.
  const dayView = await page.evaluate(async () => {
    window.__lkCardOpen('lk-1');
    await new Promise((r) => setTimeout(r, 300));
    const dl = document.getElementById('dl-result-page');
    const onTop = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
    return {
      open: !!dl && dl.style.display !== 'none',
      // The Lookbook page (z-45) MUST close — it sits above the daily
      // console (z-40), and leaving it open rendered the day invisibly
      // beneath (beta bug 2026-08-10: "I can't open a Look").
      snClosed: document.getElementById('sn-page').style.display === 'none',
      topIsDl: !!(onTop && onTop.closest && onTop.closest('#dl-result-page')),
      headline: document.querySelector('#dl-result-page .dlm-title')?.textContent,
      rows: document.querySelectorAll('#dl-result-page .rbc-row').length,
      door: !!document.querySelector('#dl-result-page .dlm-lksrc button'),
      doorCopy: document.querySelector('#dl-result-page .dlm-lksrc')?.textContent || '',
      anchor: window.__lastDlData?.anchor_date,
      todayIso: (() => { const p = (n) => String(n).padStart(2, '0'); const t = new Date(); return t.getFullYear() + '-' + p(t.getMonth() + 1) + '-' + p(t.getDate()); })(),
    };
  });
  check('IA · a generic look opens hosted as a daily look, anchored today',
    dayView.open && dayView.headline === 'The Thursday one' && dayView.rows === 4 && dayView.anchor === dayView.todayIso,
    JSON.stringify(dayView));
  check('IA · the day view actually lands ON TOP (the Lookbook closes under it)',
    dayView.snClosed === true && dayView.topIsDl === true, JSON.stringify([dayView.snClosed, dayView.topIsDl]));
  check('IA · the daily view keeps a quiet door to the Look details',
    dayView.door && /From your look/.test(dayView.doorCopy), dayView.doorCopy);

  const back = await page.evaluate(async () => {
    document.querySelector('#dl-result-page .dlm-lksrc button').click();
    await new Promise((r) => setTimeout(r, 300));
    return {
      dlClosed: document.getElementById('dl-result-page').style.display === 'none',
      detailTitle: document.getElementById('rb-lk-title')?.textContent,
    };
  });
  check('IA · the door lands on the Look detail',
    back.dlClosed && back.detailTitle === 'The Thursday one', JSON.stringify(back));

  // Worn on a calendar day → the card opens THAT day's daily view.
  const pinnedOpen = await page.evaluate(async () => {
    const p = (n) => String(n).padStart(2, '0');
    const t = new Date(Date.now() + 86400000);
    const iso = t.getFullYear() + '-' + p(t.getMonth() + 1) + '-' + p(t.getDate());
    window.__lkPinTo(iso);   // the detail is active on lk-1 from the door
    await new Promise((r) => setTimeout(r, 200));
    window.__lkCardOpen('lk-1');
    await new Promise((r) => setTimeout(r, 300));
    return { anchor: window.__lastDlData?.anchor_date, target: iso };
  });
  check('IA · a look worn on a day opens as that day',
    pinnedOpen.anchor === pinnedOpen.target, JSON.stringify(pinnedOpen));
  await page.evaluate(() => { const dl = document.getElementById('dl-result-page'); if (dl) dl.style.display = 'none'; });

  // The Diary — a view inside the Lookbook (Calendar renamed 2026-08-10);
  // the legacy 'calendar' door still lands there.
  await page.evaluate(() => window.__rbNavGo('calendar'));
  await page.waitForTimeout(700);
  const cal = await page.evaluate(() => ({
    calShown: document.getElementById('sn-cal')?.style.display === 'block',
    calClass: document.getElementById('sn-page').classList.contains('rb-cal-on'),
    path: location.pathname,
    segDiaryOn: document.querySelector('#sn-viewseg [data-mv="cal"]')?.classList.contains('on'),
    tnLookbook: document.getElementById('rb-tn-lookbook')?.classList.contains('active'),
    tnCalGone: !document.getElementById('rb-tn-calendar'),
    tnInsp: !!document.getElementById('rb-tn-inspiration'),
    dockInsp: !!document.getElementById('rb-dock-inspiration'),
    wrapHidden: (() => { const el = document.getElementById('rb-lk-wrap'); return !el || el.offsetParent === null; })(),
    monthTitle: document.querySelector('.rb-mv-title')?.textContent || '',
  }));
  check('IA · the Diary opens inside the Lookbook at /diary',
    cal.calShown && cal.calClass && cal.path === '/diary' && /\d{4}/.test(cal.monthTitle) && cal.segDiaryOn === true,
    JSON.stringify(cal));
  check('IA · no Calendar tab — the Lookbook stays lit; Inspiration holds the third slot',
    cal.tnLookbook === true && cal.tnCalGone === true && cal.tnInsp === true && cal.dockInsp === true,
    JSON.stringify([cal.tnLookbook, cal.tnCalGone, cal.tnInsp, cal.dockInsp]));
  check('IA · the looks view yields under the Diary', cal.wrapHidden === true);

  // An empty future day offers "wear a look" — picking one pins it there.
  const wear = await page.evaluate(async () => {
    const p = (n) => String(n).padStart(2, '0');
    const t = new Date();
    const iso = t.getFullYear() + '-' + p(t.getMonth() + 1) + '-' + p(t.getDate());
    const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
    const isMonthTail = t.getDate() === last;
    const cell = document.querySelector('#sn-cal .rb-dc[onclick*="__mvWear"]');
    const nxt = new Date(t.getTime() + 86400000);
    const niso = nxt.getFullYear() + '-' + p(nxt.getMonth() + 1) + '-' + p(nxt.getDate());
    window.__mvWear(niso);
    const modal = document.getElementById('rb-mv-wear');
    const tiles = modal ? modal.querySelectorAll('button[onclick*="__mvWearPick"]').length : 0;
    const head = modal ? modal.textContent : '';
    window.__mvWearPick(niso, 'lk-1');
    await new Promise((r) => setTimeout(r, 200));
    return {
      cellWired: !!cell || isMonthTail,
      hadModal: !!modal, tiles,
      asks: /Wear a look this day\?/.test(head),
      modalGone: !document.getElementById('rb-mv-wear'),
      today: iso, target: niso,
    };
  });
  check('IA · empty future days are wired to the wear-a-look door', wear.cellWired === true);
  check('IA · the door lists her looks and asks, never creates',
    wear.hadModal && wear.tiles === 2 && wear.asks, JSON.stringify(wear));
  await page.waitForTimeout(1200); // the planned_days write is debounced
  const calPin = writes.find((w) => w.method === 'POST' && /^planned_days/.test(w.url) &&
    Array.isArray(w.body) && w.body[0]?.source_type === 'look');
  check('IA · picking a look pins it to the day (planned_days, source_type look)',
    !!calPin && calPin.body[0]?.source_id === 'lk-1' && calPin.body[0]?.day_date === wear.target,
    JSON.stringify(calPin?.body?.[0] || null));

  // Bridges, not duplicates: a piece's edit form links into the Lookbook.
  await page.evaluate(() => window.__wtrkEdit && window.__wtrkEdit('w-top1'));
  await page.waitForTimeout(900);
  const bridge = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('#wa-modal button'))
      .find((b) => /Styled in \d+ looks? →/.test(b.textContent));
    return { label: btn ? btn.textContent : null, had: !!btn };
  });
  check('IA · a piece\'s form shows the Styled-in-N-looks bridge',
    bridge.had && /Styled in 1 look →/.test(bridge.label || ''), JSON.stringify(bridge));
  const bridged = await page.evaluate(async () => {
    Array.from(document.querySelectorAll('#wa-modal button'))
      .find((b) => /Styled in \d+ looks? →/.test(b.textContent)).click();
    await new Promise((r) => setTimeout(r, 700));
    return {
      modalClosed: !document.getElementById('wa-modal')?.classList.contains('open'),
      wrapShown: (() => { const el = document.getElementById('rb-lk-wrap'); return !!el && el.offsetParent !== null; })(),
    };
  });
  check('IA · the bridge closes the form and lands on the looks shelf',
    bridged.modalClosed && bridged.wrapShown, JSON.stringify(bridged));

  // Inspiration — the undated shelf. The key piece seeded above lives
  // there; Restyle re-arms the home prompt with the original ask.
  await page.evaluate(() => window.__rbNavGo('inspiration'));
  await page.waitForTimeout(500);
  const insp = await page.evaluate(() => ({
    open: document.getElementById('rb-insp-page')?.style.display === 'block',
    path: location.pathname,
    tnActive: document.getElementById('rb-tn-inspiration')?.classList.contains('active'),
    lookbookOff: !document.getElementById('rb-tn-lookbook')?.classList.contains('active'),
    cards: document.querySelectorAll('#rb-in-grid .rb-in-card').length,
    title: document.querySelector('#rb-in-grid .rb-in-title')?.textContent,
    sub: document.querySelector('#rb-in-grid .rb-in-sub')?.textContent,
    saveAsLook: /Save as look/i.test(document.getElementById('rb-in-grid')?.textContent || ''),
  }));
  check('IA · Inspiration is its own destination holding the key pieces',
    insp.open && insp.path === '/inspiration' && insp.tnActive === true && insp.lookbookOff === true
      && insp.cards === 1 && insp.title === 'Umbro shorts' && /Styled three ways by Robes/.test(insp.sub || ''),
    JSON.stringify(insp));
  check('IA · no Save-as-look yet (deferred — Annie 2026-08-10)', insp.saveAsLook === false);
  const restyled = await page.evaluate(async () => {
    document.querySelector('#rb-in-grid .rb-in-act').click();
    await new Promise((r) => setTimeout(r, 600));
    return {
      inspClosed: document.getElementById('rb-insp-page').style.display === 'none',
      prompt: document.getElementById('cb-ta')?.value || '',
    };
  });
  check('IA · Restyle lands on the home prompt with the ask re-armed',
    restyled.inspClosed && /Style my Umbro shorts three ways/.test(restyled.prompt), JSON.stringify(restyled));
  check('IA · no page errors', errs.length === 0, errs.join(' | ').slice(0, 240));
  await ctx.close();
}

// Zero looks: the empty-day door hands her to the Lookbook to make one.
{
  const { ctx, page, errs } = await boot(browser, { seed: false });
  await page.evaluate(() => window.__rbNavGo('calendar'));
  await page.waitForTimeout(700);
  const door = await page.evaluate(() => {
    const p = (n) => String(n).padStart(2, '0');
    const t = new Date(Date.now() + 86400000);
    window.__mvWear(t.getFullYear() + '-' + p(t.getMonth() + 1) + '-' + p(t.getDate()));
    const modal = document.getElementById('rb-mv-wear');
    const btn = modal && Array.from(modal.querySelectorAll('button')).find((b) => /Make one in the Lookbook/.test(b.textContent));
    const copy = modal ? /looks are made there, then worn here/.test(modal.textContent) : false;
    if (btn) btn.click();
    return { hadDoor: !!btn, copy };
  });
  await page.waitForTimeout(700);
  const landed = await page.evaluate(() => ({
    composer: !!document.getElementById('rb-lk-newtitle'),
    calOff: !document.getElementById('sn-page').classList.contains('rb-cal-on'),
  }));
  check('IA zero-looks · the calendar creates nothing — it hands to the Lookbook',
    door.hadDoor && door.copy, JSON.stringify(door));
  check('IA zero-looks · the door lands in the composer', landed.composer && landed.calOff, JSON.stringify(landed));
  check('IA zero-looks · no page errors', errs.length === 0, errs.join(' | ').slice(0, 240));
  await ctx.close();
}

await browser.close();
server.kill();

const failed = results.filter((r) => !r.pass);
for (const r of results) console.log(`${r.pass ? '  ok ' : 'FAIL '} ${r.name}${r.pass ? '' : '  → ' + r.detail}`);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
