// Piece page smoke — the piece as its own page (Robes_Piece_IA, 2026-09-07):
// the wardrobe door (full record — wears, looks, build tile, Style it three
// ways), the look door (preview + pager, back to the look), the one shared
// editor behind the pencil, the wishlist on the same anatomy, the /piece/:id
// address, and the 390px shell.
// Nav architecture (2026-09-10): the page's sticky header became the shared
// return band (‹ the previous screen + "n of N in this look / in tops"),
// the star and pencil moved into the title block on BOTH doors, the body
// is the two-column shell (media 38% | the rest), and the full-width ink
// "Style it three ways" became the hairline "Style this piece ▾" pill under
// the card, opening Build a look / Style it three ways. ≤767px the nav bar
// carries the pill + position and the in-page band hides.
// WardrobeItem (2026-10-15): the dropdown is gone — the ✦ at the foot
// opens the prompt OVER the page with the piece attached ("Style this shirt
// for…"); the + beside it adds photos (references); Send is three looks.
// Run manually: npm i --no-save playwright && node scripts/piece_page_smoke.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const ROOT = new URL('..', import.meta.url).pathname;
const PORT = 4391;
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

const results = [];
const check = (name, pass, detail = '') => results.push({ name, pass, detail });
process.on('uncaughtException', (e) => { console.error(String(e).split('\n')[0]); report(); server.kill(); process.exit(1); });
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const SHOT = process.env.SHOT_DIR || '';

// ── 1 · The wardrobe door — the full record ──────────────────────────────
{
  const { ctx, page, errs, writes, api } = await boot(browser);
  await page.evaluate(() => window.__rbNavGo('wardrobe'));
  await page.waitForTimeout(500);
  const card = page.locator('#wg-grid .wg-item:has-text("Cream silk shirt")').first();
  check('wardrobe · the grid card exists', await card.count() === 1);
  await card.click();
  await page.waitForTimeout(400);
  const pg = page.locator('#rb-piece-page');
  check('wardrobe · the card opens the piece page (not the editor)', await pg.isVisible() && !(await page.locator('#wa-modal .fm-step').isVisible()));
  check('wardrobe · the address is the piece', await page.evaluate(() => location.pathname) === '/piece/w-top1');
  const t = (await pg.innerText()).replace(/\n/g, ' ');
  const ret = page.locator('#rb-piece-page .rb-ret');
  check('wardrobe · the return band names the previous screen (Wardrobe) and the set position (in tops)',
    (await ret.locator('.rb-ret-pill .lab').innerText()).trim() === 'Wardrobe' && /1 of 2 in tops/i.test(await ret.locator('.rb-ret-pos').innerText()));
  check('wardrobe · the band is 48px, hairline-bottomed, holding the pill and the position alone',
    await ret.evaluate((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return Math.round(r.height) === 48 && cs.borderBottomWidth !== '0px' && e.querySelectorAll('button').length === 3; }));
  check('wardrobe · eyebrow (rose) + title + brand in the title block', /In your wardrobe/i.test(t) && t.includes('Cream silk shirt') && t.includes('Arket')
    && await page.locator('.rb-tb .rb-tb-ey').evaluate((e) => getComputedStyle(e).color === 'rgb(142, 112, 119)'));
  check('wardrobe · the pencil and the star sit after the title, in the title block', await page.locator('.rb-tb-trow .rb-pc-pencil').count() === 1 && await page.locator('.rb-tb-trow .rb-pc-star').count() === 1);
  check('wardrobe · the meta line reads category · worn · in N looks', /Tops · worn eight times · in 1 look/i.test(t), t.slice(0, 300));
  check('wardrobe · two columns at 1280: the piece 38% (min 360 max 560), the rest beside it',
    await page.evaluate(() => { const m = document.querySelector('.rb-pc-media').getBoundingClientRect(), r = document.querySelector('.rb-pc-rest').getBoundingClientRect(); return m.width >= 360 && m.width <= 560 && r.left > m.right + 40 && Math.abs(r.top - m.top) < 4; }));
  check('wardrobe · the photo renders with a replace-photo button', await page.locator('.rb-pc-photo img').count() === 1 && await page.locator('#rb-pc-rephoto').count() === 1);
  const ph = await page.evaluate(() => { const b = document.querySelector('.rb-pc-photo').getBoundingClientRect(); const i = document.querySelector('.rb-pc-photo img'); return { w: b.width, h: b.height, fit: getComputedStyle(i).objectFit }; });
  check('wardrobe · the photo is shown whole in a 1:1 frame, never a landscape crop', ph.fit === 'contain' && Math.abs(ph.h - ph.w) < 3, JSON.stringify(ph));
  check('wardrobe · the replace icon is the Look photograph\'s glyph', await page.evaluate(() => document.querySelector('#rb-pc-rephoto svg path')?.getAttribute('d')?.startsWith('M1.4 5.2')));
  check('wardrobe · the note reads in italic serif', t.includes('Close-fitting base under the open shirt.'));
  const rows = await page.evaluate(() => Array.from(document.querySelectorAll('#rb-piece-page .rb-ps-row')).map((r) => r.dataset.k + '=' + r.querySelector('.rb-ps-v').textContent));
  check('wardrobe · the record is the piece sheet (Piece_Sheet 01): every field a row, the band and the wear-for defaults among them, no tag chips',
    rows.join('|') === 'category=Tops|brand=Arket|colour=Cream|extra=Add|print=Plain|season=Year-round|wear=Everyday|size=Add|price=€180|notes=' && await page.locator('.rb-pc-tag').count() === 0, JSON.stringify(rows));
  const stats = await page.evaluate(() => ({ k: Array.from(document.querySelectorAll('.rb-pc-stats .k')).map((k) => k.textContent), v: Array.from(document.querySelectorAll('.rb-pc-stats .v')).map((k) => k.textContent) }));
  check('wardrobe · the stats strip reads Worn / Last worn / In looks', stats.k.join('|') === 'Worn|Last worn|In looks' && stats.v[0] === 'eight times' && /Aug/.test(stats.v[1]) && stats.v[2] === '1', JSON.stringify(stats));
  check('wardrobe · Remove from wardrobe is the quiet link at the foot', await page.locator('.rb-pc-removebtn').count() === 1 && await page.locator('.rb-pc-removebtn').evaluate((e) => getComputedStyle(e).backgroundColor === 'rgba(0, 0, 0, 0)'));
  const wearRows = await page.locator('.rb-pc-wear').allInnerTexts();
  check('wardrobe · recent wears list date + look, newest first', wearRows.length === 3 && /Aug/.test(wearRows[0]) && /Jul/.test(wearRows[1]) && wearRows[1].includes('The Thursday one'), JSON.stringify(wearRows));
  check('wardrobe · a worn diary day lists as a wear with its occasion', /Coffee with Mum/.test(wearRows[0]), wearRows[0]);
  check('wardrobe · no view-all link below three wears', await page.locator('.rb-pc-link').count() === 0);
  check('wardrobe · wears counted before the diary are named, not hidden', /5 wears counted before Robes kept the dates/.test(t), t.slice(0, 500));
  check('wardrobe · In N looks rail names the saved look — and only saved looks', /In 1 look/i.test(t) && t.includes('The Thursday one') && /Worn 23 Jul/.test(t) && !t.includes('Coffee with Mum.'));
  check('wardrobe · no "Style this piece ▾" dropdown, no ink banner, no build tile — the ✦ floats at the foot, a white circle',
    await page.locator('.rb-pc-stylebtn').count() === 0 && await page.locator('.rb-pc-cta').count() === 0 && await page.locator('.rb-pc-build').count() === 0
    && await page.locator('#rb-pc-spark').evaluate((e) => { const c = getComputedStyle(e); return c.position === 'fixed' && c.backgroundColor === 'rgb(255, 255, 255)' && c.borderRadius === '50%' && c.width === '56px'; }));
  check('wardrobe · nothing on the screen is filled ink', await page.evaluate(() => [...document.querySelectorAll('#rb-piece-page button')].every((b) => getComputedStyle(b).backgroundColor !== 'rgb(32, 32, 33)')));
  check('wardrobe · the nav lights Wardrobe', await page.locator('#rb-tn-wardrobe').evaluate((e) => e.classList.contains('active')));
  if (SHOT) await page.screenshot({ path: SHOT + '/piece-wardrobe.png', fullPage: false });

  // The pencil renames; a row opens its own sheet and saves on pick
  await page.locator('.rb-pc-pencil').click();
  await page.waitForTimeout(300);
  const ed = await page.evaluate(() => ({ title: document.querySelector('#rb-ps-wrap h3')?.textContent, val: document.getElementById('rb-ps-in')?.value, modal: !!document.querySelector('#wa-modal.open') }));
  check('editor · the pencil opens the Name sheet, prefilled — never the modal', ed.title === 'Name' && ed.val === 'Cream silk shirt' && !ed.modal, JSON.stringify(ed));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  check('editor · Escape closes it, the page stays', await pg.isVisible() && await page.locator('#rb-ps-wrap').count() === 0);
  await page.locator('#rb-piece-page .rb-ps-row[data-k="colour"]').click();
  await page.waitForTimeout(250);
  await page.locator('.rb-ps-fam:has-text("Neutrals")').click();
  await page.locator('.rb-ps-shade[data-shade="camel"]').click();
  await page.waitForTimeout(500);
  const colourWrite = writes.find((w) => w.method === 'PATCH' && /wardrobe_items\?id=eq\.w-top1/.test(w.url) && w.body && w.body.colour_shade);
  check('editor · a shade pick saves at once (PATCH colour + the model columns) and the row reads it', !!colourWrite && colourWrite.body.color === 'Camel' && colourWrite.body.colour_shade === 'camel'
    && await page.evaluate(() => document.querySelector('#rb-piece-page .rb-ps-row[data-k="colour"] .rb-ps-v')?.textContent) === 'Camel', JSON.stringify(colourWrite && colourWrite.body));

  // Replace photo: downscale → upload → PATCH image_url → the page repaints
  await page.setInputFiles('#rb-pc-photoin', { name: 'shirt.png', mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64') });
  await page.waitForTimeout(900);
  const photoWrite = writes.find((w) => w.method === 'PATCH' && /wardrobe_items\?id=eq\.w-top1/.test(w.url) && w.body && w.body.image_url);
  check('photo · the replace button uploads and PATCHes image_url', !!photoWrite && photoWrite.body.image_url.endsWith('replaced.jpg'), JSON.stringify(photoWrite && photoWrite.body));
  check('photo · the page shows the new photograph', (await page.locator('.rb-pc-photo img').getAttribute('src') || '').endsWith('replaced.jpg'));

  // The star favourites
  await page.locator('.rb-pc-star').click();
  await page.waitForTimeout(300);
  check('star · toggles the Hero Rack (PATCH hero_position) and lights up',
    writes.some((w) => w.method === 'PATCH' && /wardrobe_items\?id=eq\.w-top1/.test(w.url) && w.body && w.body.hero_position != null)
    && await page.locator('.rb-pc-star').evaluate((e) => e.classList.contains('on')));

  // A diary-day wear row opens the day; a look wear row opens the look
  await page.locator('.rb-pc-wear', { hasText: 'Coffee with Mum' }).click();
  await page.waitForTimeout(700);
  check('wear row · a worn day opens as the day', !(await pg.isVisible()) && await page.locator('#dl-result-page').isVisible()
    && (await page.locator('#dl-result-page').innerText()).includes('Coffee with Mum'));
  await page.evaluate(() => window.__rbPieceOpen('w-top1', { from: 'wardrobe' }));
  await page.waitForTimeout(300);
  await page.locator('.rb-pc-wear', { hasText: 'The Thursday one' }).first().click();
  await page.waitForTimeout(600);
  check('wear row · opens the saved look', !(await pg.isVisible()) && (await page.locator('#sn-page').innerText()).includes('The Thursday one'));

  // ── 2 · The look door — preview, pager, back to the look ───────────────
  const names = page.locator('#sn-page .rbc-rack .rbc-namebtn');
  check('look · every owned rack row names a tappable piece', await names.count() === 4);
  await names.first().click();
  await page.waitForTimeout(400);
  const t2 = (await pg.innerText()).replace(/\n/g, ' ');
  check('look · the row opens the piece page from the look', await pg.isVisible());
  check('look · the return pill names the look', (await page.locator('#rb-piece-page .rb-ret-pill .lab').innerText()).trim() === 'The Thursday one');
  check('look · the position reads 1 of 4 in this look', /1 of 4 in this look/i.test(await page.locator('#rb-piece-page .rb-ret-pos').innerText()));
  check('look · the meta line carries category · brand · worn', /Tops · Arket · worn eight times/i.test(t2), t2.slice(0, 160));
  check('look · no star and no pencil from a look — the preview, not the record (handoff 4c)', await page.locator('.rb-tb-trow .rb-pc-star').count() === 0 && await page.locator('.rb-tb-trow .rb-pc-pencil').count() === 0);
  check('look · no wear ledger on the preview', await page.locator('.rb-pc-rule').count() === 0 && await page.locator('.rb-pc-wear').count() === 0);
  // The card wears the Look panel's dress — compared against the held card
  // underneath (since 2026-09-08 the look page's panel merges into the
  // held `.rb-lk-held` card, which carries the corners and the hairline).
  const dress = await page.evaluate(() => {
    const c = getComputedStyle(document.querySelector('.rb-pc-card')), p = getComputedStyle(document.querySelector('#sn-page .rb-lk-held'));
    const n = getComputedStyle(document.querySelector('.rb-pc-note')), q = document.querySelector('#sn-page .rbc-quote') && getComputedStyle(document.querySelector('#sn-page .rbc-quote'));
    const t = getComputedStyle(document.querySelector('.rb-pc-tag')), lt = document.querySelector('#sn-page .rbc-tags .tg') && getComputedStyle(document.querySelector('#sn-page .rbc-tags .tg'));
    const tags = getComputedStyle(document.querySelector('.rb-pc-tags'));
    return { radius: [c.borderRadius, p.borderRadius], border: [c.borderWidth, p.borderWidth], noteWeight: [n.fontWeight, q && q.fontWeight], noteSize: [n.fontSize, q && q.fontSize],
      tagBg: [t.backgroundColor, lt && lt.backgroundColor], tagRadius: t.borderRadius, sep: tags.borderTopWidth, noteSep: n.borderTopWidth };
  });
  check('look · the card has the Look panel\'s corners and hairline', dress.radius[0] === dress.radius[1] && dress.border[0] === dress.border[1], JSON.stringify(dress));
  check('look · the note reads in the Look\'s light italic (300, 15px), no rule above it', dress.noteWeight[0] === '300' && dress.noteSize[0] === '15px' && dress.noteSep === '0px' && (!dress.noteWeight[1] || dress.noteWeight[1] === '300'), JSON.stringify(dress));
  check('look · the tags are the Look\'s filled pills under a hairline', dress.tagRadius === '100px' && dress.sep !== '0px' && (!dress.tagBg[1] || dress.tagBg[0] === dress.tagBg[1]), JSON.stringify(dress));
  check('look · In N looks rail, then the record link', /In 1 look/i.test(t2) && /See the full record in your wardrobe/.test(t2));
  check('look · no build tile, no ink CTA on the preview', await page.locator('.rb-pc-build').count() === 0 && await page.locator('.rb-pc-cta').count() === 0);
  // Rule 1: the nav is lit by the section she ENTERED through — this look
  // was reached from the piece's wardrobe record, so Wardrobe stays lit.
  check('look · the nav keeps the section she entered through (Wardrobe)', await page.locator('#rb-tn-wardrobe').evaluate((e) => e.classList.contains('active')));
  if (SHOT) await page.screenshot({ path: SHOT + '/piece-look.png', fullPage: false });
  await page.locator('#rb-piece-page .rb-ret-nav').nth(1).click();
  await page.waitForTimeout(300);
  const t3 = (await pg.innerText()).replace(/\n/g, ' ');
  check('look · › walks to the second piece', /2 of 4 in this look/i.test(await page.locator('#rb-piece-page .rb-ret-pos').innerText()) && t3.includes('Barrel-leg jeans'));
  check('look · a piece worn in two wears reads twice (from the wear snapshots, not times_worn)', /Worn twice/i.test(t3), t3.slice(0, 300));
  await page.locator('#rb-piece-page .rb-ret-pill').click();
  await page.waitForTimeout(300);
  check('look · back returns to the look underneath', !(await pg.isVisible()) && await page.locator('#sn-page').isVisible());

  // The record link flips doors
  await names.first().click();
  await page.waitForTimeout(300);
  await page.locator('.rb-pc-link', { hasText: 'See the full record' }).click();
  await page.waitForTimeout(300);
  check('record link · the page reopens as the wardrobe\'s record', (await page.locator('#rb-piece-page .rb-ret-pill .lab').innerText()).trim() === 'Wardrobe' && await page.locator('.rb-pc-stats').count() === 1);

  // The ✦ — the prompt opens OVER the piece page with the piece inside it
  // (WardrobeItem 2026-10-15), the page staying put until she sends.
  await page.locator('#rb-pc-spark').click();
  await page.waitForTimeout(500);
  const mt = await page.evaluate(() => ({ dock: !!document.querySelector('#rb-lp.rb-lp-dock'), fade: !!document.querySelector('#rb-lp-scrim.fade'), card: document.getElementById('rb-lp-piece')?.textContent.replace(/\s+/g, ' ').trim() || '',
    inside: !!document.querySelector('#rb-lp .rb-lp.haspiece #rb-lp-piece'), modes: document.querySelectorAll('#rb-lp .mode').length, menu: !!document.getElementById('rb-lp-plusmenu'),
    ph: document.getElementById('rb-lp-in')?.placeholder, ink: document.getElementById('rb-lp-send')?.classList.contains('ink'), page: document.getElementById('rb-piece-page')?.style.display !== 'none',
    spark: document.getElementById('rb-pc-spark') ? getComputedStyle(document.getElementById('rb-pc-spark')).display : 'gone' }));
  check('✦ · the box opens docked over a soft fade with the piece INSIDE it (Cream silk shirt, Tops · in your wardrobe), the page still under it, the ✦ stood down',
    mt.dock && mt.fade && mt.inside && mt.page && /Cream silk shirt/.test(mt.card) && /Tops · in your wardrobe/.test(mt.card) && mt.spark === 'none', JSON.stringify(mt));
  check('✦ · no modes and no menu — "Style this shirt for…", the arrow ready', mt.modes === 0 && !mt.menu && mt.ph === 'Style this shirt for…' && mt.ink, JSON.stringify(mt));
  // The + is the photo picker: a photo sits beside the piece, × takes it away.
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR4nGP8z8DwnwEKGBkYAB1IA/wSCV0LAAAAAElFTkSuQmCC', 'base64');
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.locator('#rb-lp-plus').click()]);
  await chooser.setFiles({ name: 'me.png', mimeType: 'image/png', buffer: png });
  await page.waitForTimeout(500);
  check('✦ · + opens the photo picker; the photo sits beside the piece', await page.locator('#rb-lp .rb-lp-ref img').count() === 1 && await page.locator('#rb-lp-piece').count() === 1);
  // Remove every attachment and the box folds back to one line.
  await page.locator('#rb-lp .rb-lp-ref .rm').click();
  await page.locator('#rb-lp-piece .rm').click();
  await page.waitForTimeout(250);
  const folded = await page.evaluate(() => ({ has: document.querySelector('#rb-lp .rb-lp')?.classList.contains('haspiece'), ph: document.getElementById('rb-lp-in')?.placeholder, box: !!document.getElementById('rb-lp'), radius: getComputedStyle(document.querySelector('#rb-lp .rb-lp')).borderTopLeftRadius }));
  check('✦ · remove every attachment and it folds back to one line — "Where to? Optional"', folded.box && !folded.has && folded.ph === 'Where to? Optional' && folded.radius === '100px', JSON.stringify(folded));
  await page.evaluate(() => window.__rbLpClose());
  await page.waitForTimeout(200);

  // Send: three looks, the photo she added riding as a reference.
  await page.evaluate(() => window.__rbPieceOpen('w-top1', { from: 'wardrobe' }));
  await page.waitForTimeout(300);
  await page.locator('#rb-pc-spark').click();
  await page.waitForTimeout(400);
  const [ch2] = await Promise.all([page.waitForEvent('filechooser'), page.locator('#rb-lp-plus').click()]);
  await ch2.setFiles({ name: 'me.png', mimeType: 'image/png', buffer: png });
  await page.waitForTimeout(500);
  await page.fill('#rb-lp-in', 'for a gallery opening');
  await page.evaluate(() => window.__rbLpSend());
  await page.waitForTimeout(300);
  const askPp = await page.evaluate(() => ({ chips: Array.from(document.querySelectorAll('#rb-lp .chips .chip')).map((b) => b.textContent), ph: document.getElementById('rb-lp-in')?.placeholder, page: document.getElementById('rb-piece-page')?.style.display !== 'none' }));
  check('✦ · the box asks where the pieces should come from before the looks begin, the piece page still under it', askPp.chips.length === 3 && askPp.ph === 'Or say it your way' && askPp.page, JSON.stringify(askPp));
  await page.evaluate(() => window.__rbLpBalance('new'));
  await page.waitForTimeout(900);
  check('✦ · "Suggest new pieces" rides as balance: "new"', api.style.length === 1 && api.style[0].balance === 'new', JSON.stringify(api.style[0] && api.style[0].balance));
  check('✦ · Send styles it three ways — her words finish the sentence, the photo rides as a reference, the piece page steps aside',
    api.style.length === 1 && /^Style my Cream silk shirt three ways( \(worn \d+ times?\))? for a gallery opening$/.test(api.style[0]?.prompt || '') && Array.isArray(api.style[0]?.references) && api.style[0].references.length === 1
      && /^data:image/.test(api.style[0].references[0] || '') && await page.evaluate(() => document.getElementById('rb-piece-page')?.style.display === 'none'), JSON.stringify(api.style[0] && { p: api.style[0].prompt, r: (api.style[0].references || []).length }));
  // Keep or pass (F14, 2026-10-07): the result lands on the deck inside the
  // Lookbook — three suggested looks around the shirt, one card at a time
  // (no job here, so all three are live at once), never the kp page.
  const landed = await page.evaluate(() => ({ kp: document.getElementById('kp-result-page')?.style.display || 'none', sn: document.getElementById('sn-page')?.style.display, deck: document.querySelector('#rb-lk-body .rb-lk-deck')?.className,
    band: document.querySelector('#rb-lk-body .rb-ret-pill .lab')?.textContent, ey: document.querySelector('.rb-lk-decktb .rb-tb-ey')?.textContent, top: document.querySelector('.rb-deck-card.top .rb-deck-t')?.textContent, under: document.querySelectorAll('.rb-deck-card.under').length, dots: document.querySelectorAll('.rb-deck-dots i').length }));
  check('style · the result lands on the keep-or-pass deck — ‹ Cream silk shirt, "Around your cream silk shirt", the first way on top with two behind, three dots, no kp page',
    landed.kp === 'none' && landed.sn === 'block' && /live/.test(landed.deck || '') && landed.band === 'Cream silk shirt' && landed.ey === 'Around your cream silk shirt' && landed.top === 'Way One' && landed.under === 2 && landed.dots === 3, JSON.stringify(landed));
  await page.evaluate(() => window.__lkDeckBack());
  await page.waitForTimeout(400);
  check('style · the deck\'s back pill returns to the piece page', await page.evaluate(() => document.getElementById('rb-piece-page')?.style.display !== 'none' && !document.querySelector('.rb-lk-deck')));
  check('no page errors (wardrobe + look doors)', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

// ── 3 · The daily draft lands in the composer (rule 04) — its rows are doors ──
{
  const { ctx, page, errs } = await boot(browser);
  await page.evaluate(() => window.__dlSubmit('an outfit for a coffee run'));
  await page.waitForTimeout(1500);
  // The day is carried by the return band; Save is plain — it OFFERS the
  // day once saved, never files to it (2026-10-10).
  check('daily · the fresh look opens in the composer, not the daily console; Save is plain',
    await page.locator('#sn-page .rb-lk-composer').isVisible() && !(await page.locator('#dl-result-page').isVisible())
    && await page.locator('#sn-page .rb-lk-daychip').count() === 0
    && /^save/i.test(await page.locator('#sn-page .rb-lk-save').innerText()) && !/^save to /i.test(await page.locator('#sn-page .rb-lk-save').innerText()));
  const dlNames = page.locator('#sn-page .rbc-rack .rbc-namebtn');
  // Handoff 4d: a proposal opens its own page too (Not yours yet)
  check('daily · every row is a door — owned pieces and proposals alike (4 of 4)', await dlNames.count() === 4);
  await dlNames.first().click();
  await page.waitForTimeout(400);
  const pg = page.locator('#rb-piece-page');
  const t = (await pg.innerText()).replace(/\n/g, ' ');
  check('daily · opens from the draft with its name as the way back', await pg.isVisible() && (await page.locator('#rb-piece-page .rb-ret-pill .lab').innerText()).trim() === 'Coffee run, elevated');
  check('daily · the position walks every row of the draft, proposals included (handoff 4d)', /2 of 4 in this look/i.test(await page.locator('#rb-piece-page .rb-ret-pos').innerText()) && t.includes('Barrel-leg jeans'), t.slice(0, 200));
  check('daily · the rail holds SAVED looks only — the unsaved draft is not in it', /In 1 look/i.test(t) && !t.includes('Coffee run, elevated.'), t.slice(0, 300));
  await page.locator('#rb-piece-page .rb-ret-pill').click();
  await page.waitForTimeout(300);
  check('daily · back lands on the composer', !(await pg.isVisible()) && await page.locator('#sn-page .rb-lk-composer').isVisible());
  check('no page errors (daily door)', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

// ── 3b · The wishlist on the same anatomy, and history ───────────────────
// (A fresh boot: leaving the unkept daily look above would raise its own
// "Keep this look?" guard, which is the app's rule, not this page's.)
{
  const { ctx, page, errs, writes } = await boot(browser);
  const pg = page.locator('#rb-piece-page');
  await page.evaluate(() => window.__rbNavGo('wardrobe'));
  await page.waitForTimeout(300);
  await page.evaluate(() => window.__waSetView('wishlist'));
  await page.waitForTimeout(400);
  await page.locator('#rb-wl-grid .rb-wl-item:has-text("Camel wool coat") .rb-wl-tile').click();
  await page.waitForTimeout(400);
  const wt = await pg.innerText();
  check('wishlist · the card opens the page', await pg.isVisible() && wt.includes('Camel wool coat') && wt.includes('Toteme'));
  check('wishlist · eyebrow + return pill', /On your wishlist/i.test(wt) && (await page.locator('#rb-piece-page .rb-ret-pill .lab').innerText()).trim() === 'Wishlist');
  check('wishlist · no pencil, no replace-photo (nothing to edit yet)', await page.locator('.rb-pc-pencil').count() === 0 && await page.locator('#rb-pc-rephoto').count() === 0);
  const wtags = await page.locator('.rb-pc-tag').allInnerTexts();
  check('wishlist · provenance + price stand where the tags do', wtags.includes('Robes suggests') && wtags.includes('€690'), JSON.stringify(wtags));
  check('wishlist · the note reads', wt.includes('For the winter edit.'));
  check('wishlist · I bought this + Remove at the foot', /I bought this/i.test(wt) && /Remove from wishlist/.test(wt));
  check('wishlist · no wear ledger, no looks rail', await page.locator('.rb-pc-rule').count() === 0 && await page.locator('.rb-pc-rail').count() === 0);
  check('wishlist · the address', await page.evaluate(() => location.pathname) === '/piece/wl-1');
  if (SHOT) await page.screenshot({ path: SHOT + '/piece-wishlist.png', fullPage: false });
  await page.locator('.rb-pc-quiet').click();
  await page.waitForTimeout(300);
  check('wishlist · Remove asks first', await page.locator('#rb-del-modal').count() === 1);
  await page.locator('#rb-del-modal button', { hasText: /delete|remove/i }).first().click();
  await page.waitForTimeout(500);
  check('wishlist · a removed piece closes its page onto the wishlist tab',
    !(await pg.isVisible()) && writes.some((w) => w.method === 'DELETE' && /wishlist_items\?id=eq\.wl-1/.test(w.url))
    && await page.evaluate(() => location.pathname) === '/wishlist');

  // History: back walks the page away
  await page.evaluate(() => window.__waSetView('all'));
  await page.waitForTimeout(200);
  await page.evaluate(() => window.__rbPieceOpen('w-bot1', { from: 'wardrobe' }));
  await page.waitForTimeout(300);
  await page.goBack();
  await page.waitForTimeout(400);
  check('history · browser back closes the page', !(await pg.isVisible()));
  await page.goForward();
  await page.waitForTimeout(500);
  check('history · forward reopens it at its address', await pg.isVisible() && (await pg.innerText()).includes('Barrel-leg jeans'));
  check('no page errors (wishlist + history)', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

// ── 4 · The address on a cold load, and the 390px shell ─────────────────
{
  const { ctx, page, errs } = await boot(browser, { width: 390, path: '/piece/w-top1' });
  const pg = page.locator('#rb-piece-page');
  check('deep link · /piece/:id opens the record once the wardrobe lands', await pg.isVisible() && (await pg.innerText()).includes('Cream silk shirt'));
  check('mobile · the nav bar IS the return band: the pill replaces the wordmark, the position the avatar, the in-page band hides',
    await page.locator('#rb-backpill').isVisible() && (await page.locator('#rb-backpill-label').innerText()).trim() === 'Wardrobe'
    && /1 of 2 in tops/i.test(await page.locator('#rb-navset').innerText())
    && !(await page.locator('#rb-piece-page .rb-ret').isVisible()) && !(await page.locator('#nav-wordmark').isVisible()) && !(await page.locator('.av-wrap').isVisible()));
  check('mobile · the columns stack, media first, at the full gutter width',
    await page.evaluate(() => { const m = document.querySelector('.rb-pc-media').getBoundingClientRect(), r = document.querySelector('.rb-pc-rest').getBoundingClientRect(); return r.top > m.bottom && Math.abs(m.width - r.width) < 2 && m.width > 300; }));
  check('mobile · no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  check('mobile · the dock stays reachable over the page', await page.locator('#rb-dock').isVisible()
    && await page.evaluate(() => { const d = document.getElementById('rb-dock'); const r = d.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!(e && d.contains(e)); }));
  if (SHOT) await page.screenshot({ path: SHOT + '/piece-mobile.png', fullPage: false });
  await page.locator('#rb-backpill').click();
  await page.waitForTimeout(500);
  check('deep link · the nav pill opens the wardrobe it belongs to, and the wordmark returns', !(await pg.isVisible()) && await page.locator('.wardrobe-panel').evaluate((e) => e.classList.contains('visible'))
    && await page.locator('#nav-wordmark').isVisible() && !(await page.locator('#rb-backpill').isVisible()));
  check('no page errors (deep link + mobile)', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

// ── 5 · The wardrobe list (Wardrobe_List, 2026-10-06) — the rack card as the
// wardrobe's row, the grid | list toggle, Filter on the count row, swipe →
// the ask → Undo (nothing deleted) / the hold (deleted after five seconds),
// the wishlist row with Bought.
{
  const { ctx, page, errs, writes } = await boot(browser, { width: 390 });
  await page.evaluate(() => { try { localStorage.removeItem('rb_wa_layout'); } catch (e) {} });
  await page.evaluate(() => window.__rbNavGo('wardrobe'));
  await page.waitForTimeout(600);
  const a = await page.evaluate(() => {
    const row = [...document.querySelectorAll('#wg-grid .rb-wr-row')].find((r) => r.textContent.includes('Cream silk shirt'));
    const face = row?.querySelector('.rb-wr-face');
    const th = row?.querySelector('.rb-wr-th')?.getBoundingClientRect();
    const cs = face ? getComputedStyle(face) : null;
    return {
      list: document.getElementById('wg-grid').classList.contains('rb-wr-list'),
      rows: document.querySelectorAll('#wg-grid .rb-wr-row').length,
      eye: row?.querySelector('.rb-wr-eye')?.textContent, stat: row?.querySelector('.rb-wr-stat')?.textContent,
      th: th ? [Math.round(th.width), Math.round(th.height)] : null,
      name: row ? getComputedStyle(row.querySelector('.rb-wr-name')).fontSize : '',
      pad: cs ? cs.padding : '', star: !!row?.querySelector('.rb-wr-star'), chev: !!row?.querySelector('.rb-wr-chev'),
      neverWarm: (() => { const r2 = [...document.querySelectorAll('#wg-grid .rb-wr-row')].find((r) => r.textContent.includes('Barrel-leg jeans')); return r2?.querySelector('.rb-wr-stat')?.className.includes('warm') && r2?.querySelector('.rb-wr-stat')?.textContent === 'Never worn'; })(),
      filter: !!document.querySelector('#rb-wg-trail #rb-refine-pill') && /Filter/.test(document.getElementById('rb-refine-pill').textContent),
      refineInHead: !!document.querySelector('.wg-header #rb-refine-pill'),
      toggle: !!document.querySelector('#rb-wg-trail .rb-wr-vt button.on[data-v="list"]'),
      addRow: !!document.querySelector('#wg-grid .rb-add-card.rb-wr-addrow'),
    };
  });
  check('list · the phone opens on the list: one rack card per piece', a.list && a.rows === 8, JSON.stringify(a));
  check('list · the row is the rack card: Category · Brand, 18pt serif name, 52 × 64 photograph, 14/10/14/12', a.eye === 'Tops · Arket' && a.name === '18px' && JSON.stringify(a.th) === '[52,64]' && a.pad === '14px 10px 14px 12px', JSON.stringify(a));
  check('list · the status line: Worn 8×, and Never worn in rose', a.stat === 'Worn 8×' && a.neverWarm, a.stat);
  check('list · the star circle and › close the row; the list ends on the dashed + Add a piece', a.star && a.chev && a.addRow);
  check('list · Filter (Refine, renamed) sits on the count row beside the grid | list toggle, off the masthead', a.filter && !a.refineInHead && a.toggle);
  await page.click('#rb-refine-pill'); await page.waitForTimeout(250);
  check('list · Filter opens the same drawer, headed Filter', await page.locator('#rb-refine').isVisible() && /^Filter/.test(await page.locator('#rb-refine .rb-ref-mhead').innerText()));
  await page.evaluate(() => window.__waRefToggle()); await page.waitForTimeout(200);
  // A star on a row is warm, never ink
  await page.locator('#wg-grid .rb-wr-row:has-text("Gold hoops") .rb-wr-star').click(); await page.waitForTimeout(300);
  const starBg = await page.evaluate(() => getComputedStyle(document.querySelector('#wg-grid .rb-wr-row .rb-wr-star.on')).backgroundColor);
  check('list · a starred piece leads the list and its circle is warm (#F3EFE6), never black', starBg === 'rgb(243, 239, 230)' && (await page.locator('#wg-grid .rb-wr-row').first().innerText()).includes('Gold hoops'), starBg);
  // Tap the row → the piece
  await page.locator('#wg-grid .rb-wr-row:has-text("Linen shorts") .rb-wr-name').click(); await page.waitForTimeout(400);
  check('list · the whole row opens the piece', await page.locator('#rb-piece-page').isVisible() && (await page.locator('#rb-piece-page').innerText()).includes('Linen shorts'));
  await page.evaluate(() => window.__rbNavGo('wardrobe')); await page.waitForTimeout(400);
  // Swipe a row open
  const swipe = async (txt, dist, host = '#wg-grid') => {
    const b = await page.locator(host + ' .rb-wr-row:has-text("' + txt + '") .rb-wr-face').boundingBox();
    await page.mouse.move(b.x + b.width - 30, b.y + 30); await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(b.x + b.width - 30 - i * dist / 10, b.y + 30);
    await page.mouse.up(); await page.waitForTimeout(400);
  };
  await swipe('Ribbed white tank', 80);
  const open = await page.evaluate(() => { const r = [...document.querySelectorAll('#wg-grid .rb-wr-row')].find((x) => x.textContent.includes('Ribbed white tank')); return { sw: r.classList.contains('sw'), tx: r.querySelector('.rb-wr-face').style.transform, rm: getComputedStyle(r.querySelector('.rb-wr-rmbtn')).visibility }; });
  check('swipe · a short drag rests the row open at 88 over Remove', open.sw && open.tx === 'translateX(-88px)' && open.rm === 'visible', JSON.stringify(open));
  check('swipe · the drag never opened the piece', !(await page.locator('#rb-piece-page').isVisible()));
  await page.locator('#wg-grid .rb-wr-row.sw .rb-wr-rmbtn').click(); await page.waitForTimeout(250);
  const cf = await page.evaluate(() => ({ on: !!document.getElementById('rb-wr-confirm'), t: document.querySelector('#rb-wr-confirm .t')?.textContent, n: document.querySelector('#rb-wr-confirm .n')?.textContent, go: getComputedStyle(document.getElementById('rb-wr-cf-go')).backgroundColor }));
  check('ask · Remove asks once: "Remove from your wardrobe?", the piece named, the ink Remove the one commitment', cf.on && cf.t === 'Remove from your wardrobe?' && cf.n === 'Ribbed white tank' && cf.go === 'rgb(32, 32, 33)', JSON.stringify(cf));
  await page.locator('#rb-wr-confirm .keep').click(); await page.waitForTimeout(400);
  check('ask · Keep it closes the sheet and snaps the row back', !(await page.locator('#rb-wr-confirm').count()) && await page.evaluate(() => !document.querySelector('#wg-grid .rb-wr-row.sw')));
  // A long drag asks straight away; remove → Undo
  await swipe('Ribbed white tank', 200);
  check('swipe · a long drag asks straight away', await page.locator('#rb-wr-confirm').count() === 1);
  const before = writes.filter((w) => w.method === 'DELETE').length;
  await page.click('#rb-wr-cf-go'); await page.waitForTimeout(300);
  const u = await page.evaluate(() => ({ rows: document.querySelectorAll('#wg-grid .rb-wr-row').length, gone: ![...document.querySelectorAll('#wg-grid .rb-wr-row')].some((r) => r.textContent.includes('Ribbed white tank')), toast: document.querySelector('#rb-wr-undo .m')?.textContent, count: document.querySelector('.rb-wg-trailcount')?.textContent }));
  check('remove · the row leaves at once, the count follows, and an Undo pill holds', u.gone && u.rows === 7 && u.toast === 'Ribbed white tank removed from your wardrobe' && u.count === '7 pieces', JSON.stringify(u));
  await page.locator('#rb-wr-undo button').click(); await page.waitForTimeout(300);
  check('remove · Undo puts it back and nothing was deleted', (await page.locator('#wg-grid .rb-wr-row').count()) === 8 && writes.filter((w) => w.method === 'DELETE').length === before);
  await page.waitForTimeout(5200);
  check('remove · an undone remove never deletes later', writes.filter((w) => w.method === 'DELETE').length === before);
  await swipe('Tan leather slides', 200);
  await page.click('#rb-wr-cf-go'); await page.waitForTimeout(5600);
  const del = writes.filter((w) => w.method === 'DELETE').slice(before);
  check('remove · held five seconds, then the row is deleted', del.length === 1 && /wardrobe_items\?id=eq\.w-sho2/.test(del[0].url) && !(await page.locator('#rb-wr-undo').count()), JSON.stringify(del));
  // Grid
  await page.locator('#rb-wg-trail .rb-wr-vt button[data-v="grid"]').click(); await page.waitForTimeout(300);
  const g = await page.evaluate(() => {
    const t = document.querySelector('#wg-grid .rb-wr-tile');
    return { grid: document.getElementById('wg-grid').classList.contains('rb-wr-grid'), tiles: document.querySelectorAll('#wg-grid .rb-wr-tile').length, star: !!t?.querySelector('.rb-wr-photo .rb-wr-star'), three: !!(t?.querySelector('.rb-wr-eye') && t.querySelector('.rb-wr-name') && t.querySelector('.rb-wr-stat')), cols: getComputedStyle(document.getElementById('wg-grid')).gridTemplateColumns.split(' ').length, kept: localStorage.getItem('rb_wa_layout') };
  });
  // (the stub re-serves all eight once the delete lands — it is not stateful)
  check('grid · two columns of tiles, the same three lines under each, the star on the photograph; the pick is remembered', g.grid && g.tiles >= 7 && g.star && g.three && g.cols === 2 && g.kept === 'grid', JSON.stringify(g));
  check('grid · no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  // Wishlist
  await page.locator('#rb-wg-trail .rb-wr-vt button[data-v="list"]').click(); await page.waitForTimeout(200);
  await page.evaluate(() => window.__waSetView('wishlist')); await page.waitForTimeout(400);
  const w = await page.evaluate(() => { const r = document.querySelector('#rb-wl-grid .rb-wr-row'); return { eye: r?.querySelector('.rb-wr-eye')?.textContent, stat: r?.querySelector('.rb-wr-stat')?.textContent, warm: r?.querySelector('.rb-wr-stat')?.classList.contains('warm'), bought: r?.querySelector('.rb-wr-bought')?.textContent, star: !!r?.querySelector('.rb-wr-star'), count: document.querySelector('.rb-wg-trailcount')?.textContent, filter: document.getElementById('rb-refine-pill')?.style.display }; });
  check('wishlist · the same card: Category · Brand, "€690 · Not yours yet" in rose, Bought where the star sits; the count reads "1 wishlisted", Filter stays (Header Audit Round 2, R5)',
    w.eye === 'Outerwear · Toteme' && w.stat === '€690 · Not yours yet' && w.warm && w.bought === 'Bought' && !w.star && w.count === '1 wishlisted' && w.filter !== 'none', JSON.stringify(w));
  await swipe('Camel wool coat', 200, '#rb-wl-grid');
  check('wishlist · the ask reads "Remove from your wishlist?"', (await page.locator('#rb-wr-confirm .t').innerText()) === 'Remove from your wishlist?');
  await page.locator('#rb-wr-confirm .keep').click();
  if (SHOT) await page.screenshot({ path: SHOT + '/wardrobe-list.png' });
  check('no page errors (the wardrobe list)', errs.length === 0, errs.join(' | '));
  await ctx.close();
}

await browser.close();
server.kill();
report();
function report() {
const failed = results.filter((r) => !r.pass);
for (const r of results) console.log((r.pass ? '  ✓ ' : '  ✗ ') + r.name + (r.pass || !r.detail ? '' : '\n      ' + r.detail));
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
}
process.exit(results.some((r) => !r.pass) ? 1 : 0);
