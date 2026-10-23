// Wardrobe add/edit/refine harness — boots the real dashboard with Supabase
// + API stubs and asserts the piece sheet (Piece_Sheet.dc.html, 2026-10-22):
// the add flow's confirm screen as the one-page sheet (every field a row,
// a tap opens that field's sheet, the one ink pill pinned), the colour
// model's shade / additional colours / print sheets, the category drill,
// the edit door landing on the piece page whose rows save on pick, the
// browse cascade + trail row, Refine's 13 colour families, the ways in,
// receipts and the wishlist on the same anatomy.
// Run manually: npm i --no-save playwright && node scripts/addflow_harness.mjs
// Set CHROME_PATH when playwright's bundled browser build isn't installed.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const ROOT = new URL('..', import.meta.url).pathname;
const PORT = 4324;
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

// 1x1 PNG — the flow only needs a decodable image
const PNG_OK = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64');

const TAG = {
  label: 'Cream wool blazer', category: 'Outerwear', color: 'Cream', brand: 'Zara',
  notes: 'Single-breasted wool blazer.',
  item_dna: {
    display: { title: 'Cream wool blazer', editorial_color_name: 'Alabaster', primary_color_hex: '#EFE9DC', brand_raw: 'Zara' },
    structural_dna: { silhouette_fit: ['Relaxed', 'Single-breasted', 'Unlined'] },
    llm_styling_context: {}, ai_generated_notes: 'Single-breasted wool blazer.',
  },
};
const TAG_TAX = {
  label: 'Blue skinny jeans', category: 'Bottoms', category_l2: 'Jeans', category_l3: 'Skinny jeans',
  color: 'Navy', brand: 'Levi’s', notes: 'High-rise skinny jeans.',
  item_dna: {
    display: { title: 'Blue skinny jeans', editorial_color_name: 'Indigo', primary_color_hex: '#28304D', brand_raw: 'Levi’s' },
    structural_dna: { silhouette_fit: ['Skinny', 'High-rise'] },
    llm_styling_context: {}, ai_generated_notes: 'High-rise skinny jeans.',
  },
};

// A product page read into the analyse shape (+ the hosted page image).
const URL_PIECE = {
  label: 'Leather trainers', category: 'Shoes', category_l2: 'Trainers', category_l3: 'Leather trainer',
  color: 'White', brand: 'Common Projects', price: 340, currency: 'GBP', size: '38', notes: '',
  image_url: 'https://res.cloudinary.com/robes/trainers.jpg',
  item_dna: { display: { title: 'Leather trainers', editorial_color_name: 'Chalk', primary_color_hex: '', brand_raw: 'Common Projects' }, structural_dna: { silhouette_fit: [] }, formality: '', llm_styling_context: {}, ai_generated_notes: 'Clean white leather trainers.', source: { kind: 'url', url: 'https://shop.example.com/p/1', site: 'Example' } },
};
// Two held receipts, read and waiting.
const INBOX = [
  { id: 'rc-1', user_id: 'u-test', source: 'receipt', retailer: 'NET-A-PORTER', order_ref: 'NAP123', subject: 'Fwd: Your order', status: 'held', received_at: new Date().toISOString(),
    items: [
      { label: 'Leather trainers', category: 'Shoes', category_l2: 'Trainers', category_l3: 'Leather trainer', color: 'White', brand: 'Common Projects', price: 340, currency: 'GBP', size: '38', image_url: 'https://res.cloudinary.com/robes/trainers.jpg', quantity: 1, returned: false, item_dna: { display: {}, structural_dna: { silhouette_fit: [] }, formality: '', llm_styling_context: {}, ai_generated_notes: '' } },
      { label: 'Leather tote', category: 'Bags', category_l2: 'Everyday bags', category_l3: '', color: 'Camel', brand: 'Polène', price: 320, currency: 'GBP', size: 'One size', image_url: null, quantity: 1, returned: false, item_dna: { display: {}, structural_dna: { silhouette_fit: [] }, formality: '', llm_styling_context: {}, ai_generated_notes: '' } },
      { label: 'Ribbed cotton tank', category: 'Tops', category_l2: '', category_l3: '', color: 'Black', brand: 'Arket', price: 39, currency: 'GBP', size: 'S', image_url: null, quantity: 2, returned: true, item_dna: { display: {}, structural_dna: { silhouette_fit: [] }, formality: '', llm_styling_context: {}, ai_generated_notes: '' } },
    ] },
  { id: 'rc-2', user_id: 'u-test', source: 'receipt', retailer: 'Sézane', order_ref: null, subject: 'Fwd: Merci', status: 'held', received_at: new Date(Date.now() - 86400000).toISOString(),
    items: [ { label: 'Silk twill scarf', category: 'Accessories', category_l2: 'Scarves', category_l3: '', color: 'Print', brand: 'Sézane', price: 95, currency: 'EUR', size: 'One size', image_url: null, quantity: 1, returned: false, item_dna: { display: {}, structural_dna: { silhouette_fit: [] }, formality: '', llm_styling_context: {}, ai_generated_notes: '' } } ] },
];

const ROWS = [
  { id: 'row-1', user_id: 'u-test', label: 'Blue skinny jeans', category: 'Bottoms', category_l2: 'Jeans', category_l3: 'Skinny jeans', color: 'Navy', brand: 'Levi’s', notes: '', image_url: null, times_worn: 2, item_dna: {}, seasons: ['Summer'], occasions: ['Everyday', 'Travel'], season_band: 'spring_summer', season_source: 'user', hero_position: 1, created_at: '2026-08-01' },
  { id: 'row-2', user_id: 'u-test', label: 'Wide-leg jeans', category: 'Bottoms', category_l2: 'Jeans', category_l3: 'Wide-leg jeans', color: 'Black', brand: 'Arket', notes: '', image_url: null, times_worn: 0, item_dna: {}, seasons: [], occasions: [], season_band: 'year_round', season_source: 'inferred', hero_position: null, created_at: '2026-08-02' },
  { id: 'row-3', user_id: 'u-test', label: 'White tee', category: 'Tops', category_l2: 'T-shirts & tees', category_l3: 'Classic crewneck tee', color: 'White', brand: 'Cos', notes: '', image_url: null, times_worn: 5, item_dna: {}, seasons: [], occasions: ['Work', 'Skiing'], season_band: 'year_round', season_source: 'inferred', hero_position: null, created_at: '2026-08-03' },
];

const results = [];
const check = (name, pass, detail = '') => results.push({ name, pass, detail });
// RB_SHOTS=<dir> writes a screenshot at a few key screens (eyeballing, never a check).
const shot = async (page, name) => { if (process.env.RB_SHOTS) { try { await page.screenshot({ path: process.env.RB_SHOTS + '/addflow-' + name + '.png' }); } catch (e) {} } };

async function boot(browser, tagBody, opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1280, height: 1100 }, permissions: ['camera'] });
  const page = await ctx.newPage();
  const supaPosts = [];
  const supaPatches = [];
  const inboxPatches = [];
  const profilePatches = [];
  const urlReads = [];
  const wlPosts = [];
  let inboxRows = (opts.inbox || []).map((r) => ({ ...r }));
  await page.route('**cdn.jsdelivr.net/**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/javascript', body: SUPA_STUB }));
  await page.route('**ayowpaknssulsqqvwpqx.supabase.co/**', (r) => {
    const req = r.request();
    if (req.url().includes('wishlist_items')) {
      if (req.method() === 'POST') {
        const body = JSON.parse(req.postData() || '{}');
        wlPosts.push(body);
        return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify([{ id: 'wl-' + wlPosts.length, ...body }]) });
      }
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(wlPosts.map((b, i) => ({ id: 'wl-' + (i + 1), created_at: '2026-09-22', ...b }))) });
    }
    if (req.url().includes('wardrobe_inbox')) {
      if (req.method() === 'PATCH') {
        const body = JSON.parse(req.postData() || '{}');
        inboxPatches.push({ url: req.url(), body });
        // inboxPatch 'strict' = the live table lags migration 23's later
        // columns (PGRST204 names the column); 'down' = every PATCH fails
        if (opts.inboxPatch === 'down') return r.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"boom"}' });
        if (opts.inboxPatch === 'strict') {
          const missing = ['filed_to', 'decided_at'].find((k) => k in body);
          if (missing) return r.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ code: 'PGRST204', message: "Could not find the '" + missing + "' column of 'wardrobe_inbox' in the schema cache" }) });
        }
        const id = (req.url().match(/id=eq\.([^&]+)/) || [])[1];
        inboxRows = inboxRows.map((r) => (String(r.id) === String(id) ? { ...r, ...body } : r));
        return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      }
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(inboxRows.filter((x) => x.status === 'held')) });
    }
    if (req.url().includes('/profiles')) {
      if (req.method() === 'PATCH') {
        profilePatches.push(JSON.parse(req.postData() || '{}'));
        return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      }
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ inbox_address: opts.inboxAddress || null }]) });
    }
    if (req.url().includes('wardrobe_items')) {
      if (req.method() === 'POST') {
        const body = JSON.parse(req.postData() || '{}');
        supaPosts.push(body);
        // cmDown: migration 27 not run — a POST carrying the colour columns
        // is refused the way PostgREST refuses it (PGRST204 names the column).
        if (opts.cmDown && 'colour_shade' in body) return r.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ code: 'PGRST204', message: "Could not find the 'colour_shade' column of 'wardrobe_items' in the schema cache" }) });
        return r.fulfill({ status: 201, contentType: 'application/json',
          body: JSON.stringify([{ id: 'new-1', ...body }]) });
      }
      if (req.method() === 'PATCH') {
        supaPatches.push({ url: req.url(), body: JSON.parse(req.postData() || '{}') });
        return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      }
      if (req.method() === 'GET') {
        return r.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify(opts.rows || []) });
      }
    }
    return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  await page.route('**/api/wardrobe/analyse', async (r) => {
    await new Promise((res) => setTimeout(res, 600));
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(tagBody) });
  });
  // The multi-piece read (2026-10-13) runs first on every photo; one piece
  // lands on the confirm screen exactly as the single read did. opts.pieces
  // answers several; the default answers the one tag.
  await page.route('**/api/wardrobe/pieces', async (r) => {
    await new Promise((res) => setTimeout(res, 300));
    const pieces = opts.pieces || [Object.assign({ box: { x: 0, y: 0, w: 1, h: 1 }, wardrobe_match: null, match_confidence: 0 }, tagBody)];
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ noItemDetected: !pieces.length, pieces }) });
  });
  await page.route('**/api/wardrobe/read-url', async (r) => {
    urlReads.push(JSON.parse(r.request().postData() || '{}'));
    await new Promise((res) => setTimeout(res, 300));
    if (opts.urlError) return r.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ error: opts.urlError }) });
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(opts.urlPiece || URL_PIECE) });
  });
  await page.route('**/api/wardrobe/upload', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url: 'https://res.cloudinary.com/robes/test.jpg' }) }));
  await page.route('**nominatim**', (r) => r.abort());
  await page.route('**open-meteo**', (r) => r.abort());
  await page.addInitScript(() => {
    window.__TEST_PROFILE = { first_name: 'Annie', last_name: '', mobile: '', style_icons: [],
      budget: null, wardrobe_description: '', style_dna: {}, wardrobe_items_count: 3,
      onboarded_at: '2026-07-01', gender_identity: 'woman' };
    Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true });
  });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`${BASE}${opts.path || '/dashboard'}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2600);
  return { ctx, page, errs, supaPosts, supaPatches, inboxPatches, profilePatches, urlReads, wlPosts };
}

const browser = await chromium.launch(Object.assign(
  { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] },
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}));

// ── Step 1 + happy path: scan → summary → details → save ───────────────
{
  const { ctx, page, errs, supaPosts } = await boot(browser, TAG);
  await page.evaluate(() => window.WA && WA.open());
  await page.waitForTimeout(400);

  const s1 = await page.evaluate(() => {
    const shown = (el) => el && getComputedStyle(el).display !== 'none';
    return {
      heading: document.querySelector('#wa-modal .fm-h')?.textContent || '',
      dropH: Array.from(document.querySelectorAll('.rb-wf-drop-h')).filter(shown).map((h) => h.textContent),
      btns: Array.from(document.querySelectorAll('.rb-wf-drop-btns')).filter(shown)
        .flatMap((w) => Array.from(w.querySelectorAll('.rb-wf-btn')).map((b) => b.textContent)),
      link: !!document.querySelector('.rb-wf-linkrow input'),
      // Annie's 3.3 mock (2026-08-20): glyph + serif batch headline + sub
      glyph: !!document.querySelector('.rb-wf-glyph svg'),
      sub: document.querySelector('.rb-wf-drop-s')?.textContent || '',
      orcam: (() => { const b = document.querySelector('.rb-wf-orcam .rb-wf-camlink'); return b ? b.textContent.trim() : ''; })(),
      nophoto: document.querySelector('.rb-wf-nophoto')?.textContent || '',
      file: !!document.getElementById('wa-rb-file'),
      multiple: document.getElementById('wa-rb-file')?.multiple,
      capture: document.getElementById('wa-rb-file')?.hasAttribute('capture'),
    };
  });
  check('step1 · Add your pieces heading (3.3 mock)', /Add your pieces/.test(s1.heading), s1.heading);
  check('step1 · desktop is drop-first: batch headline + one Choose-photos button', s1.dropH.join('|') === 'Drop in as many as you like'
    && s1.btns.join('|') === 'Choose photos', `${s1.dropH.join('|')} / ${s1.btns.join('|')}`);
  // Audit 3.2 (2026-08-19): the From-a-link coming-soon door is HIDDEN from
  // the FTU add modal until the feature is live — a dead door in a
  // first-session modal costs trust. __waLinkSoon survives doorless.
  check('step1 · no From-a-link dead door; Add-without-a-photo route stands', !s1.link && s1.nophoto === 'Add without a photo', s1.nophoto);
  check('step1 · the zone carries the glyph, the files-them sub and the take-a-photo link',
    s1.glyph && s1.sub === 'Robes files them one after another.' && s1.orcam === 'take a photo',
    JSON.stringify([s1.glyph, s1.sub, s1.orcam]));
  check('step1 · multi file input, never capture on the picker', s1.file && s1.multiple === true && s1.capture === false, String(s1.capture));
  const cam = await page.evaluate(() => ({
    exists: !!document.getElementById('wa-rb-cam'),
    capture: document.getElementById('wa-rb-cam')?.getAttribute('capture') || '',
    lib: !!document.getElementById('wa-rb-lib'),
    libAccept: document.getElementById('wa-rb-lib')?.getAttribute('accept') || '',
    libMulti: document.getElementById('wa-rb-lib')?.multiple,
    libCapture: document.getElementById('wa-rb-lib')?.hasAttribute('capture'),
  }));
  check('step1 · Take-a-photo rides its own capture input', cam.exists && cam.capture === 'environment', JSON.stringify(cam));
  check('step1 · library input is photos-only (image/* multiple, no capture) so iOS skips the source chooser',
    cam.lib && cam.libAccept === 'image/*' && cam.libMulti === true && cam.libCapture === false, JSON.stringify(cam));


  await page.setInputFiles('#wa-rb-file', { name: 'blazer.png', mimeType: 'image/png', buffer: PNG_OK });
  await page.waitForTimeout(300);
  const scan = await page.evaluate(() => ({
    heading: document.querySelector('#wa-modal .fm-h')?.textContent || '',
    readTxt: !!document.getElementById('wa-read-txt'),
  }));
  check('step2 · scan screen shows', /Reading your piece/.test(scan.heading) && scan.readTxt, scan.heading);

  await page.waitForSelector('#rb-saw-panel', { timeout: 8000 });
  const early = await page.evaluate(() => ({
    tags: document.querySelectorAll('.rb-saw-tag').length,
    banner: document.querySelector('.rb-saw-banner')?.textContent || '',
    rows: Array.from(document.querySelectorAll('.rb-ps-row')).map((r) => r.dataset.k),
    groups: Array.from(document.querySelectorAll('.rb-ps-gt')).map((g) => g.textContent),
    photo: !!document.getElementById('wa-saw-photo')?.src,
    fields: !!document.getElementById('wa-saw-label') || !!document.querySelector('#wa-modal .fm-step input:not([type=file]):not(#wa-label-in)'),
    toggles: document.querySelectorAll('.rb-saw-toggle, .rb-saw-read').length,
    cta: document.getElementById('wa-saw-cta')?.textContent || '',
    fit: getComputedStyle(document.getElementById('wa-saw-photo')).objectFit,
    sub: document.querySelector('#wa-modal .fm-h + p')?.textContent || '',
    sticky: getComputedStyle(document.querySelector('.rb-ps-foot')).position,
  }));
  check('summary · tag pops on the photo (no fit tags)', early.tags === 3, String(early.tags));
  check('summary · label banner', early.banner === 'Cream wool blazer', early.banner);
  check('sheet · every field is a row in four groups (Piece_Sheet 02): Name · Category · Brand / Colour · Additional colours · Print / Season · Wear it for / Size · Price · Notes',
    early.rows.join('|') === 'name|category|brand|colour|extra|print|season|wear|size|price|notes' && early.groups.join('|') === 'The piece|Colour|Wearing|Fit & notes', JSON.stringify([early.rows, early.groups]));
  check('sheet · no form fields, no toggles, no ledger — the rows read first', !early.fields && early.toggles === 0);
  check('sheet · "Filed from your photo. Tap anything that isn’t quite right."', /Filed from your photo\. Tap anything that isn’t quite right\./.test(early.sub), early.sub);
  check('summary · photo contained + the one ink pill pinned (sticky)', early.photo && early.fit === 'contain' && /Add to wardrobe/.test(early.cta) && early.sticky === 'sticky', early.cta + '|' + early.sticky);

  await page.waitForTimeout(2600);
  const settled = await page.evaluate(() => ({
    vals: ['name', 'category', 'brand', 'colour'].map((k) => document.querySelector('.rb-ps-row[data-k="' + k + '"] .rb-ps-v')?.textContent.trim()),
    dot: !!document.querySelector('.rb-ps-row[data-k="colour"] .rb-ps-sw'),
    checks: Array.from(document.querySelectorAll('.rb-ps-row')).filter((r) => r.querySelector('.rb-ps-chk')).map((r) => r.dataset.k),
  }));
  check('sheet · the rows read piece/brand/category/colour', JSON.stringify(settled.vals) === JSON.stringify(['Cream wool blazer', 'Outerwear', 'Zara', 'Cream']), JSON.stringify(settled.vals));
  check('sheet · the colour row carries its swatch', settled.dot);
  check('sheet · a read with no subcategory carries one Check — on Category; a confident colour carries none', settled.checks.join('|') === 'category', JSON.stringify(settled.checks));

  // The colour sheet (the colour model): the row opens it on the shade's family
  await page.click('.rb-ps-row[data-k="colour"]');
  await page.waitForTimeout(250);
  const pop = await page.evaluate(() => ({
    open: !!document.getElementById('rb-ps-wrap'), title: document.querySelector('#rb-ps-wrap h3')?.textContent,
    fams: document.querySelectorAll('.rb-ps-fam').length, fam: document.querySelector('.rb-ps-fam.on .n')?.textContent,
    on: document.querySelector('.rb-ps-shade.on .n')?.textContent, shades: document.querySelectorAll('.rb-ps-shade').length,
    wall: document.querySelectorAll('.rb-wapop-sw').length, famNames: Array.from(document.querySelectorAll('.rb-ps-fam .n')).map((n) => n.textContent),
  }));
  check('colour · the row opens the shade sheet on the shade’s family — 13 families, Whites open, Cream ticked, no 21-swatch wall', pop.open && pop.title === 'Colour' && pop.fams === 13 && pop.fam === 'Whites' && pop.on === 'Cream' && pop.shades === 5 && pop.wall === 0, JSON.stringify(pop));
  check('colour · the families run in the brief’s order, Metallics last, no Neons', pop.famNames[0] === 'Blacks' && pop.famNames[12] === 'Metallics' && !pop.famNames.includes('Neons'), pop.famNames.join('|'));
  await page.click('.rb-ps-fam:has-text("Blues")');
  await page.click('.rb-ps-shade[data-shade="navy"]');
  await page.waitForTimeout(200);
  const picked = await page.evaluate(() => ({
    closed: !document.getElementById('rb-ps-wrap'),
    name: document.querySelector('.rb-ps-row[data-k="colour"] .rb-ps-v')?.textContent || '',
    stash: [window.__waSawColor, window.__waSawShade],
  }));
  check('colour · a pick applies, closes, and writes the shade + its display name', picked.closed && picked.name === 'Navy' && picked.stash.join('|') === 'Navy|navy', JSON.stringify(picked));

  // Rename through the Name sheet — the banner follows
  await page.click('.rb-ps-row[data-k="name"]');
  await page.waitForTimeout(200);
  const nameSheet = await page.evaluate(() => ({ title: document.querySelector('#rb-ps-wrap h3')?.textContent, val: document.getElementById('rb-ps-in')?.value, focused: document.activeElement?.id }));
  check('text · the Name row opens its sheet, the field prefilled and focused', nameSheet.title === 'Name' && nameSheet.val === 'Cream wool blazer' && nameSheet.focused === 'rb-ps-in', JSON.stringify(nameSheet));
  await page.fill('#rb-ps-in', 'Ivory wool blazer');
  await page.press('#rb-ps-in', 'Enter');
  await page.waitForTimeout(200);
  const back = await page.evaluate(() => ({
    banner: document.querySelector('.rb-saw-banner')?.textContent || '',
    row0: document.querySelector('.rb-ps-row[data-k="name"] .rb-ps-v')?.textContent || '',
    row3: document.querySelector('.rb-ps-row[data-k="colour"] .rb-ps-v')?.textContent.trim() || '',
    closed: !document.getElementById('rb-ps-wrap'),
  }));
  check('text · Enter saves and closes; the banner and the row carry the rename, the colour pick survives the repaint', back.closed && back.banner === 'Ivory wool blazer' && back.row0 === 'Ivory wool blazer' && back.row3 === 'Navy', JSON.stringify(back));
  await page.click('.rb-ps-row[data-k="brand"]');
  await page.waitForTimeout(200);
  const rowTap = await page.evaluate(() => ({ title: document.querySelector('#rb-ps-wrap h3')?.textContent, val: document.getElementById('rb-ps-in')?.value }));
  check('sheet · tapping a row opens that field alone', rowTap.title === 'Brand' && rowTap.val === 'Zara', JSON.stringify(rowTap));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  check('sheet · Escape closes the sheet, nothing changed', await page.evaluate(() => !document.getElementById('rb-ps-wrap') && window.__waSawBrand === 'Zara'));

  await page.click('#wa-saw-cta');
  await page.waitForTimeout(1800);
  check('save · wardrobe insert fired', supaPosts.length === 1, String(supaPosts.length));
  check('save · edited label + picked colour persisted', supaPosts[0] && supaPosts[0].label === 'Ivory wool blazer' && supaPosts[0].color === 'Navy',
    supaPosts[0] && `${supaPosts[0].label}|${supaPosts[0].color}`);
  check('save · legacy category carried', supaPosts[0] && supaPosts[0].category === 'Outerwear', supaPosts[0] && supaPosts[0].category);
  // The colour model (2026-10-22): the three migration-27 columns ride every
  // save — the Navy she picked on the old wheel resolves to its shade, a
  // plain piece prints null, no extras.
  check('save · colour_shade / colour_extra / print ride the payload from the picked colour',
    supaPosts[0] && supaPosts[0].colour_shade === 'navy' && Array.isArray(supaPosts[0].colour_extra) && supaPosts[0].colour_extra.length === 0 && supaPosts[0].print === null,
    JSON.stringify(supaPosts[0] && [supaPosts[0].colour_shade, supaPosts[0].colour_extra, supaPosts[0].print]));
  // 2026-09-22: price / size / currency are form fields now and ride every
  // save (null when empty); fit confidence / sentiment / hero stay off.
  check('save · price, size and currency ride the payload (null when empty); the retired columns stay off',
    supaPosts[0] && 'price' in supaPosts[0] && supaPosts[0].price === null && 'size' in supaPosts[0] && supaPosts[0].size === null && 'currency' in supaPosts[0]
      && !('fit_confidence' in supaPosts[0]) && !('sentiment' in supaPosts[0]) && !('hero_position' in supaPosts[0]), JSON.stringify(supaPosts[0] && [supaPosts[0].price, supaPosts[0].size, supaPosts[0].currency]));
  // ADR-002: the band is STORED (not-null), and season_source is omitted
  // when she never touched the chip — a save is not a correction, and
  // stamping 'user' on every save would erase the signal the pre-fill's
  // quality is measured with. The legacy arrays are no longer written.
  // The band sent is the PREVIEW of what the migration-18 trigger will file
  // for this category (Outerwear -> autumn_winter), and season_source is
  // omitted because she never touched the chip — a save is not a correction.
  check('save · the previewed band is sent, provenance not overclaimed',
    supaPosts[0] && supaPosts[0].season_band === 'autumn_winter'
      && !('season_source' in supaPosts[0])
      && !('seasons' in supaPosts[0]) && !('occasions' in supaPosts[0]),
    JSON.stringify([supaPosts[0]?.season_band, supaPosts[0]?.season_source]));
  check('no page errors (happy path)', errs.length === 0, errs.join(' | ').slice(0, 200));
  await ctx.close();
}

// ── Taxonomy: prefilled pickers, re-file via popover, fold on save ─────
{
  const { ctx, page, errs, supaPosts } = await boot(browser, TAG_TAX);
  await page.evaluate(() => window.WA && WA.open());
  await page.waitForTimeout(400);
  await page.setInputFiles('#wa-rb-file', { name: 'jeans.png', mimeType: 'image/png', buffer: PNG_OK });
  await page.waitForSelector('#rb-saw-panel', { timeout: 8000 });
  await page.waitForTimeout(2600);

  const sumTags = await page.evaluate(() => ({
    tags: Array.from(document.querySelectorAll('.rb-saw-tag')).map((t) => t.textContent),
    catRow: document.querySelector('.rb-ps-row[data-k="category"] .rb-ps-v')?.textContent || '',
    check: !!document.querySelector('.rb-ps-row[data-k="category"] .rb-ps-chk'),
  }));
  check('tax · L1/L2/L3 all pop as tags', sumTags.tags.includes('Bottoms') && sumTags.tags.includes('Jeans') && sumTags.tags.includes('Skinny jeans'),
    sumTags.tags.join('|'));
  check('tax · the Category row reads the item type, no Check on a placed read', sumTags.catRow === 'Skinny jeans' && !sumTags.check, JSON.stringify(sumTags));

  await page.click('.rb-ps-row[data-k="category"]');
  await page.waitForTimeout(250);
  const pre = await page.evaluate(() => ({ title: document.querySelector('#rb-ps-wrap h3')?.textContent, crumb: document.querySelector('.rb-ps-crumb')?.textContent, on: document.querySelector('.rb-ps-opt.on .n')?.textContent, back: !!document.querySelector('.rb-ps-back'), select: document.querySelectorAll('#wa-modal select').length }));
  check('tax · the Category sheet opens AT the item type (Jeans, under Bottoms), Skinny jeans ticked, back steps up — never a native select', pre.title === 'Jeans' && pre.crumb === 'Bottoms' && pre.on === 'Skinny jeans' && pre.back && pre.select === 0, JSON.stringify(pre));
  await page.click('.rb-ps-back');
  await page.waitForTimeout(120);
  await page.click('.rb-ps-back');
  await page.waitForTimeout(120);
  const catList = await page.evaluate(() => ({ title: document.querySelector('#rb-ps-wrap h3')?.textContent, back: !!document.querySelector('.rb-ps-back'), list: Array.from(document.querySelectorAll('#rb-ps-wrap .rb-ps-opt .n')).map((n) => n.textContent) }));
  check('tax · back twice lands on the sheet L1s', catList.title === 'Category' && !catList.back && catList.list.includes('Knitwear') && catList.list.includes('Tailoring & suiting') && catList.list.includes('Jewellery'),
    catList.list.join('|').slice(0, 120));
  await page.click('#rb-ps-wrap .rb-ps-opt:has-text("Knitwear")');
  await page.waitForTimeout(120);
  const reset = await page.evaluate(() => ({ title: document.querySelector('#rb-ps-wrap h3')?.textContent, crumb: document.querySelector('.rb-ps-crumb')?.textContent, first: document.querySelector('#rb-ps-wrap .rb-ps-opt .n')?.textContent }));
  check('tax · an L1 with subcategories drills into them, "Just knitwear" leading', reset.title === 'Knitwear' && reset.crumb === 'Category' && reset.first === 'Just knitwear', JSON.stringify(reset));
  await page.click('#rb-ps-wrap .rb-ps-opt:has-text("Cardigans")');
  await page.waitForTimeout(120);
  await page.click('#rb-ps-wrap .rb-ps-opt:has-text("Cardigan coat / coatigan")');
  await page.waitForTimeout(200);
  const refiled = await page.evaluate(() => ({ closed: !document.getElementById('rb-ps-wrap'), row: document.querySelector('.rb-ps-row[data-k="category"] .rb-ps-v')?.textContent, sel: window.__waSawTaxSel }));
  check('tax · the item type pick closes the sheet and re-files the pair', refiled.closed && refiled.row === 'Cardigan coat / coatigan' && refiled.sel.sheet === 'Knitwear' && refiled.sel.l2 === 'Cardigans', JSON.stringify(refiled));

  await page.click('#wa-saw-cta');
  await page.waitForTimeout(1800);
  const row = supaPosts[0] || {};
  check('tax · save folds the split L2 to its legacy category', row.category === 'Outerwear', String(row.category));
  check('tax · save carries the pair', row.category_l2 === 'Cardigans' && row.category_l3 === 'Cardigan coat / coatigan',
    `${row.category_l2}|${row.category_l3}`);
  check('no page errors (taxonomy)', errs.length === 0, errs.join(' | ').slice(0, 200));
  await ctx.close();
}

// ── Tag axes: season band + the shared wear namespace + a custom tag ───
{
  const { ctx, page, errs, supaPosts } = await boot(browser, TAG);
  await page.evaluate(() => window.WA && WA.open());
  await page.waitForTimeout(400);
  await page.setInputFiles('#wa-rb-file', { name: 'blazer.png', mimeType: 'image/png', buffer: PNG_OK });
  await page.waitForSelector('#rb-saw-panel', { timeout: 8000 });
  await page.waitForTimeout(400);
  const axes = await page.evaluate(() => ({
    season: document.querySelector('.rb-ps-row[data-k="season"] .rb-ps-v')?.textContent, wear: document.querySelector('.rb-ps-row[data-k="wear"] .rb-ps-v')?.textContent,
    notes: !!document.querySelector('.rb-ps-row[data-k="notes"]'),
  }));
  // The rows PREVIEW the pre-fill rather than reading blank: an Outerwear
  // piece shows Autumn/Winter + Everyday already filed, hers to correct.
  check('tags · the rows preview what Robes will file (Outerwear → Autumn/Winter + Everyday)', axes.season === 'Autumn/Winter' && axes.wear === 'Everyday' && axes.notes, JSON.stringify(axes));
  await page.click('.rb-ps-row[data-k="season"]');
  await page.waitForTimeout(200);
  const sea = await page.evaluate(() => ({ title: document.querySelector('#rb-ps-wrap h3')?.textContent, opts: Array.from(document.querySelectorAll('#rb-ps-wrap .rb-ps-opt .n')).map((n) => n.textContent), on: document.querySelector('#rb-ps-wrap .rb-ps-opt.on .n')?.textContent }));
  check('tags · Season is a one-tap list of the three bands', sea.title === 'Season' && sea.opts.join('|') === 'Spring/Summer|Autumn/Winter|Year-round' && sea.on === 'Autumn/Winter', JSON.stringify(sea));
  await page.click('#rb-ps-wrap .rb-ps-opt:has-text("Spring/Summer")');
  await page.waitForTimeout(200);
  await page.click('.rb-ps-row[data-k="wear"]');
  await page.waitForTimeout(200);
  const wear = await page.evaluate(() => ({ title: document.querySelector('#rb-ps-wrap h3')?.textContent, done: !!document.querySelector('.rb-ps-done'), x: !!document.querySelector('.rb-ps-x'),
    chips: Array.from(document.querySelectorAll('.rb-ps-chip:not(.add)')).map((c) => c.textContent.replace(/^✓ /, '')), on: Array.from(document.querySelectorAll('.rb-ps-chip.on')).map((c) => c.textContent.replace(/^✓ /, '')), own: !!document.querySelector('.rb-ps-chip.add') }));
  check('tags · Wear it for is multi-select, open until Done: the seven shared seeds, Everyday on, + Your own', wear.title === 'Wear it for' && wear.done && !wear.x && wear.chips.join('|') === 'Everyday|Work|Evening|Occasion|Travel|Active|Lounge' && wear.on.join('|') === 'Everyday' && wear.own, JSON.stringify(wear));
  await page.click('.rb-ps-chip:has-text("Travel")');
  await page.click('.rb-ps-chip.add');
  await page.fill('#rb-ps-own', 'Skiing');
  await page.press('#rb-ps-own', 'Enter');
  await page.waitForTimeout(150);
  const tagged = await page.evaluate(() => Array.from(document.querySelectorAll('.rb-ps-chip.on')).map((c) => c.textContent.replace(/^✓ /, '')));
  check('tags · picks + a custom tag land selected', tagged.join('|') === 'Everyday|Travel|Skiing', tagged.join('|'));
  // Uncapped and emptiable — 'everyday' is a real tag, not a floor.
  await page.click('.rb-ps-chip:has-text("Travel")');
  await page.click('.rb-ps-chip:has-text("Skiing")');
  await page.click('.rb-ps-chip:has-text("Everyday")');
  await page.click('.rb-ps-done');
  await page.waitForTimeout(200);
  const emptied = await page.evaluate(() => ({ closed: !document.getElementById('rb-ps-wrap'), row: document.querySelector('.rb-ps-row[data-k="wear"] .rb-ps-v')?.textContent, season: document.querySelector('.rb-ps-row[data-k="season"] .rb-ps-v')?.textContent }));
  check('tags · Wear it for can be emptied — Done closes, the row reads Add, nothing snaps back; the band is single-select', emptied.closed && emptied.row === 'Add' && emptied.season === 'Spring/Summer', JSON.stringify(emptied));
  await page.click('.rb-ps-row[data-k="wear"]');
  await page.waitForTimeout(150);
  await page.click('.rb-ps-chip:has-text("Travel")');
  await page.click('.rb-ps-chip:has-text("Skiing")');
  await page.click('.rb-ps-done');
  await page.waitForTimeout(150);
  await page.click('.rb-ps-row[data-k="notes"]');
  await page.waitForTimeout(150);
  await page.fill('#rb-ps-in', 'Wear with the navy suit.');
  await page.click('.rb-ps-save');
  await page.waitForTimeout(150);
  const noted = await page.evaluate(() => ({ note: document.querySelector('.rb-ps-row[data-k="notes"] .rb-ps-note')?.textContent, v: document.querySelector('.rb-ps-row[data-k="notes"] .rb-ps-v')?.textContent, wear: document.querySelector('.rb-ps-row[data-k="wear"] .rb-ps-v')?.textContent }));
  check('tags · the note reads under its row in the serif, the wear row names both', noted.note === 'Wear with the navy suit.' && noted.v === '' && noted.wear === 'Travel, Skiing', JSON.stringify(noted));
  await page.click('#wa-saw-cta');
  await page.waitForTimeout(1800);
  const p = supaPosts[0] || {};
  // A touched band files as hers; wear goes to the shared namespace after
  // the row exists, not into the piece payload.
  check('tags · a touched band files as hers',
    p.season_band === 'spring_summer' && p.season_source === 'user'
      && !('occasions' in p),
    JSON.stringify([p.season_band, p.season_source]));
  check('tags · notes persisted', p.notes === 'Wear with the navy suit.', String(p.notes));
  check('no page errors (tag axes)', errs.length === 0, errs.join(' | ').slice(0, 200));
  await ctx.close();
}

// ── Add without a photo ────────────────────────────────────────────────
{
  const { ctx, page, errs, supaPosts } = await boot(browser, TAG);
  await page.evaluate(() => window.WA && WA.open());
  await page.waitForTimeout(400);
  await page.click('.rb-wf-nophoto');
  const manual = await page.evaluate(() => ({
    heading: document.querySelector('#wa-modal .fm-h')?.textContent || '',
    slot: !!document.querySelector('.rb-wf-slot'),
    name: document.querySelector('.rb-ps-row[data-k="name"] .rb-ps-v')?.textContent, cat: document.querySelector('.rb-ps-row[data-k="category"] .rb-ps-v')?.textContent, colName: document.querySelector('.rb-ps-row[data-k="colour"] .rb-ps-v')?.textContent,
    fields: !!document.getElementById('wa-saw-label'),
  }));
  check('manual · same anatomy, empty photo slot', /Add a piece/.test(manual.heading) && manual.slot, manual.heading);
  check('manual · the empty rows read Add, no form fields', manual.name === 'Add' && manual.cat === 'Add' && manual.colName === 'Add' && !manual.fields, JSON.stringify(manual));

  // name guard fires before an empty save — the Name sheet opens
  await page.click('#wa-saw-cta');
  await page.waitForTimeout(200);
  const guard = await page.evaluate(() => ({ sheet: document.querySelector('#rb-ps-wrap h3')?.textContent || '', toast: document.getElementById('toast-msg')?.textContent || document.getElementById('toast')?.textContent || '' }));
  check('manual · the name guard opens the Name sheet and says so', guard.sheet === 'Name' && /name/.test(guard.toast), JSON.stringify(guard));

  await page.fill('#rb-ps-in', 'Linen shirt');
  await page.press('#rb-ps-in', 'Enter');
  await page.waitForTimeout(150);
  await page.click('.rb-ps-row[data-k="category"]');
  await page.waitForTimeout(150);
  await page.click('#rb-ps-wrap .rb-ps-opt:has-text("Tops")');
  await page.waitForTimeout(150);
  await page.click('#rb-ps-wrap .rb-ps-opt:has-text("Just tops")');
  await page.waitForTimeout(150);
  await page.click('#wa-saw-cta');
  await page.waitForTimeout(1800);
  const p = supaPosts[0] || {};
  check('manual · saves without an image', supaPosts.length === 1 && p.label === 'Linen shirt' && p.image_url === null,
    JSON.stringify({ n: supaPosts.length, label: p.label, img: p.image_url }));
  check('manual · category filed from the picker', p.category === 'Tops', String(p.category));

  // Manual + a photo attached through the slot: no re-analyse, image saved
  await page.evaluate(() => { document.getElementById('rb-addfork')?.remove(); window.WA && WA.open(); });
  await page.waitForTimeout(500);
  await page.click('.rb-wf-nophoto');
  await page.waitForTimeout(200);
  await page.setInputFiles('#rb-wf-photoin', { name: 'slot.png', mimeType: 'image/png', buffer: PNG_OK });
  await page.waitForTimeout(500);
  const slotPhoto = await page.evaluate(() => !!document.querySelector('.rb-wf-photo img')?.src);
  check('manual · Add-a-photo slot attaches without a re-scan', slotPhoto);
  await page.click('.rb-ps-row[data-k="name"]');
  await page.waitForTimeout(150);
  await page.fill('#rb-ps-in', 'Photographed shirt');
  await page.press('#rb-ps-in', 'Enter');
  await page.waitForTimeout(150);
  await page.click('#wa-saw-cta');
  await page.waitForTimeout(1800);
  const p2 = supaPosts[1] || {};
  check('manual · attached photo uploads and saves', p2.label === 'Photographed shirt' && /cloudinary/.test(String(p2.image_url)),
    JSON.stringify({ label: p2.label, img: p2.image_url }));
  check('no page errors (manual)', errs.length === 0, errs.join(' | ').slice(0, 200));
  await ctx.close();
}

// ── Unreadable piece: editor open, give-it-a-name copy ─────────────────
{
  const { ctx, page, errs } = await boot(browser, {
    label: '', category: 'Other', color: '', brand: '', notes: '',
    item_dna: { display: {}, structural_dna: { silhouette_fit: [] }, ai_generated_notes: '' },
  });
  await page.evaluate(() => window.WA && WA.open());
  await page.waitForTimeout(400);
  await page.setInputFiles('#wa-rb-file', { name: 'blur.png', mimeType: 'image/png', buffer: PNG_OK });
  await page.waitForTimeout(1400);
  const u = await page.evaluate(() => ({
    panel: !!document.getElementById('rb-saw-panel'),
    rows: !!document.querySelector('.rb-ps-row[data-k="name"]'),
    sub: document.querySelector('#wa-modal .fm-step p')?.textContent || '',
    photo: !!document.querySelector('.rb-wf-photo img'),
  }));
  check('unreadable · no reveal theatre, the rows open', !u.panel && u.rows);
  check('unreadable · give-it-a-name copy + photo kept', /couldn’t quite read|couldn't quite read/.test(u.sub) && u.photo, u.sub);
  await page.click('#wa-saw-cta');
  await page.waitForTimeout(150);
  const guard = await page.evaluate(() => document.querySelector('#rb-ps-wrap h3')?.textContent || '');
  check('unreadable · the name guard opens the Name sheet', guard === 'Name', guard);
  check('no page errors (unreadable)', errs.length === 0, errs.join(' | ').slice(0, 200));
  await ctx.close();
}

// ── Batch: second piece re-enters the scan, tag carries n of m ─────────
{
  const { ctx, page, errs, supaPosts } = await boot(browser, TAG);
  await page.evaluate(() => window.WA && WA.open());
  await page.waitForTimeout(400);
  await page.setInputFiles('#wa-rb-file', [
    { name: 'one.png', mimeType: 'image/png', buffer: PNG_OK },
    { name: 'two.png', mimeType: 'image/png', buffer: PNG_OK },
  ]);
  await page.waitForSelector('#rb-saw-panel', { timeout: 8000 });
  const b1 = await page.evaluate(() => (document.querySelector('#wa-modal .fm-step').textContent.match(/PIECE 1 OF 2/) || [])[0] || '');
  check('batch · piece 1 of 2 tag', b1 === 'PIECE 1 OF 2', b1);
  await page.click('#wa-saw-cta');
  await page.waitForSelector('#wa-read-txt', { timeout: 8000 });
  await page.waitForSelector('#rb-saw-panel', { timeout: 8000 });
  const b2 = await page.evaluate(() => ({
    tag: (document.querySelector('#wa-modal .fm-step').textContent.match(/PIECE 2 OF 2/) || [])[0] || '',
    summary: !document.getElementById('wa-saw-label'),
  }));
  check('batch · piece 2 re-enters the summary', b2.tag === 'PIECE 2 OF 2' && b2.summary, JSON.stringify(b2));
  await page.click('#wa-saw-cta');
  await page.waitForTimeout(1500);
  check('batch · both inserts fired', supaPosts.length === 2, String(supaPosts.length));
  check('no page errors (batch)', errs.length === 0, errs.join(' | ').slice(0, 200));
  await ctx.close();
}

// ── Briefed add (funnel slice 4): the flow opens for a look that borrows ─
// A saved look knows which categories it borrows; opened FROM it the same
// step 1 carries the look's name and a chip per gap, and every filed piece
// whose category matches an open proposal lands ON the look (the proposal
// off the rack, her piece in its slot with the role) and strikes its chip.
// A piece matching nothing files normally; the batch done, the look opens.
{
  const { ctx, page, errs, supaPosts } = await boot(browser, TAG, { rows: ROWS });
  await page.evaluate(() => {
    localStorage.setItem('rb_looks__u-test', JSON.stringify([
      { id: 'lk-fill', name: 'A Parisian Night Out', name_provisional: false, note: '', photo_url: null, tags: null, source: 'daily',
        origin_look_id: null, created_at: '2026-09-10T10:00:00.000Z',
        pieces: [{ id: 'row-3', slot: 'Top', position: 0, role: 'The Canvas' }],
        proposals: [
          { role: 'The Texture', chip: 'Layer', cats: ['Outerwear'], opts: [{ name: 'Wool blazer', brand: 'Robes' }], oi: 0, saved: false, image_url: null },
          { role: 'The Exclamation Point', chip: 'Shoes', cats: ['Shoes'], opts: [{ name: 'Leather loafers', brand: 'Robes' }], oi: 0, saved: false, image_url: null }],
        wears: [] }]));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2600);
  const readStep1 = () => page.evaluate(() => {
    const step = document.querySelector('#wa-modal .fm-step');
    return {
      open: !!document.querySelector('#wa-modal.open'),
      h: step?.querySelector('.fm-h')?.textContent.trim() || '',
      em: step?.querySelector('.fm-h em')?.textContent || '',
      chips: Array.from(step?.querySelectorAll('.rb-wf-gap') || []).map((c) => c.textContent + (c.classList.contains('done') ? '*' : '')),
      label: step?.querySelector('.rb-wf-brief-l')?.textContent || '',
      zone: !!step?.querySelector('#wa-rb-zone'),
      cam: !!step?.querySelector('#wa-rb-cam'), lib: !!step?.querySelector('#wa-rb-lib'), multi: step?.querySelector('#wa-rb-file')?.multiple,
    };
  });
  // A bare open carries no brief.
  await page.evaluate(() => window.WA && WA.open());
  await page.waitForTimeout(400);
  const bare = await readStep1();
  check('brief · a bare open is "Add your pieces." with no chips', bare.open && bare.h === 'Add your pieces.' && bare.chips.length === 0, JSON.stringify(bare));
  await page.evaluate(() => window.WA && WA.close());
  await page.waitForTimeout(300);
  // The door: briefed for the look.
  await page.evaluate(() => window.__rbFillOpen('lk-fill', 'rack'));
  await page.waitForTimeout(400);
  const s1 = await readStep1();
  check('brief · step 1 reads "Make A Parisian Night Out yours." with the look name in italics',
    s1.open && s1.h === 'Make A Parisian Night Out yours.' && s1.em === 'A Parisian Night Out', JSON.stringify(s1));
  check('brief · "Looking for:" + one hairline chip per gap, named off the proposal ("a blazer · loafers")',
    s1.label === 'Looking for:' && s1.chips.join(' · ') === 'a blazer · loafers', JSON.stringify(s1.chips));
  check('brief · nothing else changes — the zone, batch, camera and library inputs stand', s1.zone && s1.cam && s1.lib && s1.multi === true, JSON.stringify(s1));
  // Two photos; both analyse as the Outerwear blazer. The first lands on
  // the look (the Layer proposal); the second matches nothing open and
  // files normally.
  await page.setInputFiles('#wa-rb-file', [
    { name: 'one.png', mimeType: 'image/png', buffer: PNG_OK },
    { name: 'two.png', mimeType: 'image/png', buffer: PNG_OK },
  ]);
  await page.waitForSelector('#rb-saw-panel', { timeout: 8000 });
  const s3 = await page.evaluate(() => ({
    tag: (document.querySelector('#wa-modal .fm-step').textContent.match(/PIECE 1 OF 2/) || [])[0] || '',
    chips: Array.from(document.querySelectorAll('#wa-modal .rb-wf-gap')).map((c) => c.textContent + (c.classList.contains('done') ? '*' : '')),
  }));
  check('brief · the chips ride the confirm screen with the n-of-m tag', s3.tag === 'PIECE 1 OF 2' && s3.chips.join('·') === 'a blazer·loafers', JSON.stringify(s3));
  await page.click('#wa-saw-cta');
  await page.waitForSelector('#wa-read-txt', { timeout: 8000 });
  const mid = await page.evaluate(() => ({
    toast: document.getElementById('toast-msg')?.textContent || document.getElementById('toast')?.textContent || '',
    chips: Array.from(document.querySelectorAll('#wa-modal .rb-wf-gap')).map((c) => c.textContent + (c.classList.contains('done') ? '*' : '')),
    look: JSON.parse(localStorage.getItem('rb_looks__u-test') || '[]')[0],
  }));
  check('brief · the filed blazer lands on the look — the Outerwear proposal is off the rack, her piece in its slot with the role',
    mid.look && Array.isArray(mid.look.proposals) && mid.look.proposals.length === 1 && mid.look.proposals[0].chip === 'Shoes'
      && mid.look.pieces.some((p) => p.id === 'new-1' && p.role === 'The Texture' && p.slot === 'Layer'),
    JSON.stringify({ props: mid.look?.proposals?.length, pieces: mid.look?.pieces }));
  check('brief · the toast says where it went: "Cream wool blazer is in A Parisian Night Out now."', mid.toast === 'Cream wool blazer is in A Parisian Night Out now.', mid.toast);
  check('brief · the blazer chip is struck on the next scan, loafers still open', mid.chips.join('·') === 'a blazer*·loafers', JSON.stringify(mid.chips));
  await page.waitForSelector('#rb-saw-panel', { timeout: 8000 });
  await page.click('#wa-saw-cta');
  await page.waitForTimeout(1500);
  const end = await page.evaluate(() => {
    const sn = document.getElementById('sn-page');
    const look = JSON.parse(localStorage.getItem('rb_looks__u-test') || '[]')[0];
    return {
      modal: !!document.querySelector('#wa-modal.open'),
      sn: !!sn && getComputedStyle(sn).display !== 'none',
      title: !!sn && sn.textContent.includes('A Parisian Night Out'),
      props: look?.proposals?.length, pieces: look?.pieces?.length,
      door: sn?.querySelector('.rb-lk-pinbar .rb-lk-editlook')?.textContent.trim() || null,
    };
  });
  check('brief · the second blazer matched nothing open and filed normally (two inserts, the shoes still borrowed)', supaPosts.length === 2 && end.props === 1 && end.pieces === 2, JSON.stringify(end));
  // The swap zone is off the look page (Look_Creation_Handoff 5a, 2026-10-05):
  // the look opens on its pinned Edit look bar; a proposal's › is its door.
  check('brief · the batch done, the modal closes and the look she dressed opens on its pinned Edit look bar', end.modal === false && end.sn && end.title && end.door === 'Edit look', JSON.stringify(end));
  // WA.close clears the brief like the batch queue.
  await page.evaluate(() => { window.__rbFillOpen('lk-fill', 'rack'); });
  await page.waitForTimeout(400);
  await page.evaluate(() => window.WA && WA.close());
  await page.waitForTimeout(300);
  await page.evaluate(() => window.WA && WA.open());
  await page.waitForTimeout(400);
  const after = await readStep1();
  check('brief · WA.close clears the brief — the next bare open carries no chips', after.h === 'Add your pieces.' && after.chips.length === 0, JSON.stringify(after));
  await page.evaluate(() => window.WA && WA.close());
  check('no page errors (brief)', errs.length === 0, errs.join(' | ').slice(0, 200));
  await ctx.close();
}

// ── The edit door is the piece page (2026-10-22): rows that save on pick ─
{
  const { ctx, page, errs, supaPatches } = await boot(browser, TAG, { rows: ROWS });
  await page.evaluate(() => window.App && App.showWardrobe());
  await page.waitForTimeout(600);
  await page.evaluate(() => window.__wtrkEdit('row-1'));
  await page.waitForTimeout(600);
  const ed = await page.evaluate(() => ({
    page: getComputedStyle(document.getElementById('rb-piece-page') || document.body).display, modal: !!document.querySelector('#wa-modal.open'),
    rows: Array.from(document.querySelectorAll('#rb-piece-page .rb-ps-row')).map((r) => r.dataset.k + '=' + r.querySelector('.rb-ps-v').textContent),
    stats: Array.from(document.querySelectorAll('.rb-pc-stats .k')).map((k) => k.textContent), remove: document.querySelector('.rb-pc-removebtn')?.textContent,
  }));
  check('edit · the edit door opens the piece PAGE, never the modal: the rows prefilled from the row, the stats strip, Remove from wardrobe at the foot',
    ed.page === 'block' && !ed.modal && ed.rows.join('|') === 'category=Skinny jeans|brand=Levi’s|colour=Navy|extra=Add|print=Plain|season=Spring/Summer|wear=Everyday, Travel|size=Add|price=Add|notes=Add'
      && ed.stats.join('|') === 'Worn|Last worn|In looks' && ed.remove === 'Remove from wardrobe', JSON.stringify(ed));
  // A pick saves at once — one PATCH per field, nothing else on it
  await page.click('#rb-piece-page .rb-ps-row[data-k="season"]');
  await page.waitForTimeout(150);
  await page.click('#rb-ps-wrap .rb-ps-opt:has-text("Autumn/Winter")');
  await page.waitForTimeout(400);
  const patch = supaPatches[0] || {};
  check('edit · a Season pick PATCHes the row at once — the band as hers, nothing else on the PATCH', /row-1/.test(patch.url || '') && patch.body && patch.body.season_band === 'autumn_winter' && patch.body.season_source === 'user' && Object.keys(patch.body).length === 2, JSON.stringify(patch));
  check('edit · the row reads the pick', await page.evaluate(() => document.querySelector('#rb-piece-page .rb-ps-row[data-k="season"] .rb-ps-v')?.textContent) === 'Autumn/Winter');
  await page.click('#rb-piece-page .rb-ps-row[data-k="colour"]');
  await page.waitForTimeout(150);
  const cs = await page.evaluate(() => ({ fam: document.querySelector('.rb-ps-fam.on .n')?.textContent, on: document.querySelector('.rb-ps-shade.on .n')?.textContent }));
  check('edit · the colour sheet opens on the row’s shade — a legacy wheel name (Navy) resolved through the model into Blues', cs.fam === 'Blues' && cs.on === 'Navy', JSON.stringify(cs));
  await page.click('.rb-ps-fam:has-text("Greens")');
  await page.click('.rb-ps-shade[data-shade="olive"]');
  await page.waitForTimeout(400);
  const cp = supaPatches[1] || {};
  check('edit · a shade pick writes the display name, the three model columns and the dna colour — the band it did not touch stays off the PATCH',
    cp.body && cp.body.color === 'Olive' && cp.body.colour_shade === 'olive' && JSON.stringify(cp.body.colour_extra) === '[]' && cp.body.print === null && cp.body.item_dna?.display?.editorial_color_name === 'Olive' && !('season_band' in cp.body), JSON.stringify(cp.body));
  await page.click('#rb-piece-page .rb-ps-row[data-k="wear"]');
  await page.waitForTimeout(150);
  await page.click('.rb-ps-chip:has-text("Work")');
  await page.click('.rb-ps-done');
  await page.waitForTimeout(400);
  const wearPatch = supaPatches.find((x) => x.body && ('occasions' in x.body || 'wear' in x.body));
  check('edit · a Wear-it-for pick never rides the piece payload (the tag namespace carries it); the row reads it', !wearPatch && await page.evaluate(() => document.querySelector('#rb-piece-page .rb-ps-row[data-k="wear"] .rb-ps-v')?.textContent) === 'Everyday, Travel, Work');
  await page.click('#rb-piece-page .rb-ps-row[data-k="price"]');
  await page.waitForTimeout(150);
  await page.click('.rb-ps-cur:has-text("GBP")');
  await page.fill('#rb-ps-in', '120');
  await page.click('.rb-ps-save');
  await page.waitForTimeout(400);
  const pp = supaPatches.find((x) => x.body && 'price' in x.body);
  check('edit · Price saves as a number + its currency; the pass-through columns never ride a PATCH', pp && pp.body.price === 120 && pp.body.currency === 'GBP' && !('hero_position' in pp.body) && !('sentiment' in pp.body)
    && await page.evaluate(() => document.querySelector('#rb-piece-page .rb-ps-row[data-k="price"] .rb-ps-v')?.textContent) === '£120', JSON.stringify(pp && pp.body));
  // An untagged piece reads the defaults
  await page.evaluate(() => window.__rbPieceOpen('row-2', { from: 'wardrobe' }));
  await page.waitForTimeout(400);
  const unt = await page.evaluate(() => ['season', 'wear'].map((k) => document.querySelector('#rb-piece-page .rb-ps-row[data-k="' + k + '"] .rb-ps-v')?.textContent));
  check('edit · an untagged piece reads Year-round + Everyday', unt.join('|') === 'Year-round|Everyday', unt.join('|'));
  check('no page errors (edit)', errs.length === 0, errs.join(' | ').slice(0, 200));
  await ctx.close();
}

// ── Browse: cascade + trail + slim Refine + always-visible star ────────
{
  const { ctx, page, errs } = await boot(browser, TAG, { rows: ROWS });
  await page.evaluate(() => window.App && App.showWardrobe());
  await page.waitForTimeout(600);

  const base = await page.evaluate(() => ({
    tabs: Array.from(document.querySelectorAll('#wg-filters .wg-tab')).map((t) => t.dataset.cat),
    trail: !!document.getElementById('rb-wg-trail'),
    count: document.querySelector('.rb-wg-trailcount')?.textContent || '',
    add: document.getElementById('rb-add-pill')?.getAttribute('aria-label') || '',
    refine: !!document.getElementById('rb-refine-pill'),
    pack: !!document.querySelector('.wg-pack-pill'),
    fab: !!document.getElementById('rb-wa-fab'),
    starOpacity: (() => { const s = document.querySelector('.rb-star'); return s ? getComputedStyle(s).opacity : ''; })(),
  }));
  check('browse · sheet-L1 tabs + trail row with count', base.tabs.includes('Knitwear') && base.trail && base.count === '3 pieces', base.count);
  check('browse · the + (Add a piece) and Filter stand in the header', /Add a piece/.test(base.add) && base.refine, base.add);
  check('browse · Pack-a-trip pill and FAB retired', !base.pack && !base.fab);
  check('browse · star always visible on cards', base.starOpacity === '1', base.starOpacity);

  // Top-ten tab row (2026-08-13): the overflow sits behind More ▾, the add
  // card rides the grid once a piece exists, and a category picked from
  // More surfaces into the row as the active tab.
  const moreUx = await page.evaluate(async () => {
    const addCard = !!document.querySelector('#wg-grid .rb-add-card');
    const rowTabs = Array.from(document.querySelectorAll('#wg-filters .wg-tab')).map((t) => t.textContent);
    window.__waMoreTap();
    await new Promise((r) => setTimeout(r, 150));
    const pop = document.getElementById('rb-wg-morepop');
    const cats = Array.from(pop?.querySelectorAll('button[data-cat]') || []).map((b) => b.dataset.cat);
    pop?.querySelector('button[data-cat="Swim & beach"]')?.click();
    await new Promise((r) => setTimeout(r, 350));
    const surfaced = !!document.querySelector('#wg-filters .wg-tab[data-cat="Swim & beach"].active');
    const popGone = !document.getElementById('rb-wg-morepop');
    window.__waCatTap('All');
    await new Promise((r) => setTimeout(r, 250));
    return { addCard, rowTabs, cats, surfaced, popGone };
  });
  check('browse · one tab line — All + ten by count + More ▾; add card back with pieces',
    moreUx.rowTabs.length === 12 && moreUx.rowTabs[0] === 'All' && /^More/.test(moreUx.rowTabs[11]) && moreUx.addCard === true,
    JSON.stringify(moreUx.rowTabs));
  check('browse · the overflow lives in the More popover',
    moreUx.cats.length >= 4 && moreUx.cats.includes('Swim & beach'), JSON.stringify(moreUx.cats));
  check('browse · a category picked from More surfaces into the row, active',
    moreUx.surfaced === true && moreUx.popGone === true, JSON.stringify([moreUx.surfaced, moreUx.popGone]));

  // Cascade: Bottoms → Jeans → Skinny jeans
  await page.click('#wg-filters .wg-tab[data-cat="Bottoms"]');
  await page.waitForTimeout(200);
  const cas = await page.evaluate(() => ({
    open: !!document.getElementById('rb-wg-cascade'),
    l2s: Array.from(document.querySelectorAll('#rb-wg-cascade .c1 .cas-row')).map((r) => r.textContent.replace('›', '').trim()),
    grid: document.querySelectorAll('#wg-grid .wg-item:not(.rb-add-card):not(.rb-ghost-card)').length,
  }));
  check('cascade · opens on a drillable tab with the full tree', cas.open && cas.l2s.includes('Jeans') && cas.l2s.includes('Skirts') && cas.l2s[0] === 'All bottoms',
    cas.l2s.join('|'));
  check('cascade · tab tap already filters the grid', cas.grid === 2, String(cas.grid));

  await page.click('#rb-wg-cascade .c1 .cas-row:has-text("Jeans")');
  await page.waitForTimeout(200);
  const l3col = await page.evaluate(() => ({
    col2: !!document.querySelector('#rb-wg-cascade .c2'),
    l3s: Array.from(document.querySelectorAll('#rb-wg-cascade .c2 .cas-row')).map((r) => r.textContent.replace('✓', '').trim()),
  }));
  check('cascade · L2 pick opens the item-type column', l3col.col2 && l3col.l3s.includes('Skinny jeans') && l3col.l3s.includes('Barrel-leg jeans'),
    l3col.l3s.slice(0, 6).join('|'));
  await page.click('#rb-wg-cascade .c2 .cas-row:has-text("Skinny jeans")');
  await page.waitForTimeout(300);
  const drilled = await page.evaluate(() => ({
    closed: !document.getElementById('rb-wg-cascade'),
    crumbs: document.getElementById('rb-wg-crumbs')?.textContent || '',
    grid: document.querySelectorAll('#wg-grid .wg-item:not(.rb-add-card):not(.rb-ghost-card)').length,
  }));
  check('cascade · L3 pick closes, trail shows the path, grid filters',
    drilled.closed && /Bottoms›Jeans›Skinnyjeans/.test(drilled.crumbs.replace(/\s/g, '')) && drilled.grid === 1,
    JSON.stringify(drilled));
  await page.click('.rb-wg-trailx');
  await page.waitForTimeout(200);
  const cleared = await page.evaluate(() => ({
    crumbs: document.getElementById('rb-wg-crumbs')?.textContent.trim() || '',
    grid: document.querySelectorAll('#wg-grid .wg-item:not(.rb-add-card):not(.rb-ghost-card)').length,
  }));
  check('trail · ✕ clears the whole path', cleared.crumbs === '3 pieces' && cleared.grid === 3, JSON.stringify(cleared));

  // Refine: three things only
  await page.click('#rb-refine-pill');
  await page.waitForTimeout(200);
  const ref = await page.evaluate(() => ({
    labels: Array.from(document.querySelectorAll('#rb-refine .rb-ref-lbl')).map((l) => l.textContent.trim().split('\n')[0]),
    wear: Array.from(document.querySelectorAll('#rb-refine .rb-ref-chip.ctx')).map((c) => c.textContent),
    sw: document.querySelectorAll('#rb-refine .rb-sw').length,
    fams: Array.from(document.querySelectorAll('#rb-refine .rb-ref-fam .n')).map((n) => n.textContent),
    wheel: !!document.querySelector('#rb-refine .rb-sw-wheel'),
    worn: /Never worn/.test(document.getElementById('rb-refine')?.textContent || ''),
    fits: /Silhouette/.test(document.getElementById('rb-refine')?.textContent || ''),
    foot: /Show 3 pieces/.test(document.getElementById('rb-refine')?.textContent || ''),
  }));
  check('refine · four groups in order — Season / Wear it for / Colour / Brand',
    ref.labels.length === 4 && /Season/.test(ref.labels[0]) && /Wear it for/i.test(ref.labels[1]) && /Colour/.test(ref.labels[2]) && /Brand/.test(ref.labels[3]),
    ref.labels.join('|'));
  check('refine · wear chips = the seven seeds + her own tags',
    ref.wear.join('|') === 'Everyday|Work|Evening|Occasion|Travel|Active|Lounge|Skiing', ref.wear.join('|'));
  check('refine · colour is the 13 families, no swatch wall, no wheel', ref.sw === 0 && ref.fams.length === 13 && ref.fams[0] === 'Blacks' && ref.fams[12] === 'Metallics' && !ref.wheel, ref.fams.join('|'));
  check('refine · worn / fits sections gone', !ref.worn && !ref.fits);
  check('refine · Show-N footer', ref.foot);
  // row-1 carries Everyday, row-2 is untagged (= Everyday), row-3 is
  // Work/Skiing only — an "Occasion" pick keeps the two everyday pieces
  // and hides the mismatched tagged one (the Year-round posture).
  await page.click('#rb-refine .rb-ref-chip.ctx:has-text("Occasion")');
  await page.waitForTimeout(200);
  const wearFiltered = await page.evaluate(() => ({
    grid: document.querySelectorAll('#wg-grid .wg-item:not(.rb-add-card):not(.rb-ghost-card)').length,
    foot: /Show 2 pieces/.test(document.getElementById('rb-refine')?.textContent || ''),
  }));
  check('refine · wear pick keeps Everyday/untagged, hides mismatched tags', wearFiltered.grid === 2 && wearFiltered.foot, JSON.stringify(wearFiltered));
  await page.click('#rb-refine .rb-ref-chip.ctx:has-text("Occasion")');
  await page.waitForTimeout(200);
  // A Work pick keeps everything: the Work piece plus both everyday pieces
  await page.click('#rb-refine .rb-ref-chip.ctx:has-text("Work")');
  await page.waitForTimeout(200);
  const wearAll = await page.evaluate(() =>
    document.querySelectorAll('#wg-grid .wg-item:not(.rb-add-card):not(.rb-ghost-card)').length);
  check('refine · Everyday pieces pass any wear pick', wearAll === 3, String(wearAll));
  await page.click('#rb-refine .rb-ref-chip.ctx:has-text("Work")');
  await page.waitForTimeout(200);
  await page.click('#rb-refine .rb-ref-fam[data-f="blues"]');
  await page.waitForTimeout(200);
  const refFiltered = await page.evaluate(() => ({
    note: document.querySelector('.rb-ref-note')?.textContent || '',
    grid: document.querySelectorAll('#wg-grid .wg-item:not(.rb-add-card):not(.rb-ghost-card)').length,
    on: document.querySelector('#rb-refine .rb-ref-fam.on')?.getAttribute('aria-pressed'),
  }));
  check('refine · a family pick filters by the piece’s shade (a legacy Navy reads as Blues) and names itself', refFiltered.note === 'Blues selected' && refFiltered.grid === 1 && refFiltered.on === 'true', JSON.stringify(refFiltered));
  check('no page errors (browse)', errs.length === 0, errs.join(' | ').slice(0, 200));
  await ctx.close();
}

// ── Mobile 390px: cascade drills as a sheet, refine is a sheet ─────────
{
  const { ctx, page, errs } = await boot(browser, TAG, { rows: ROWS, viewport: { width: 390, height: 844 } });
  await page.evaluate(() => window.App && App.showWardrobe());
  await page.waitForTimeout(600);
  await page.click('#wg-filters .wg-tab[data-cat="Bottoms"]');
  await page.waitForTimeout(250);
  const m1 = await page.evaluate(() => ({
    sheet: document.getElementById('rb-wg-cascade')?.classList.contains('sheet'),
    title: document.querySelector('#rb-wg-cascade .cas-title')?.textContent || '',
    rows: Array.from(document.querySelectorAll('#rb-wg-cascade .cas-row')).map((r) => r.textContent.replace('›', '').trim()).slice(0, 3),
  }));
  check('mobile · cascade is a bottom sheet at level 1', m1.sheet === true && m1.title === 'Bottoms' && m1.rows[0] === 'All bottoms',
    JSON.stringify(m1));
  await page.click('#rb-wg-cascade .cas-row:has-text("Jeans")');
  await page.waitForTimeout(250);
  const m2 = await page.evaluate(() => ({
    closed: !document.getElementById('rb-wg-cascade'),
    grid: document.querySelectorAll('#wg-grid .wg-item:not(.rb-add-card):not(.rb-ghost-card)').length,
    crumbs: document.getElementById('rb-wg-crumbs')?.textContent.replace(/\s/g, '') || '',
  }));
  check('mobile · subcategory pick applies and closes the sheet', m2.closed && m2.grid === 2 && /Bottoms›Jeans/.test(m2.crumbs),
    JSON.stringify(m2));
  await page.click('#wg-filters .wg-tab[data-cat="Bottoms"]');
  await page.waitForTimeout(250);
  const m3 = await page.evaluate(() => ({
    back: document.querySelector('#rb-wg-cascade .cas-back')?.textContent || '',
    title: document.querySelector('#rb-wg-cascade .cas-title')?.textContent || '',
  }));
  check('mobile · reopening lands on the drilled item types with back', /Bottoms/.test(m3.back) && m3.title === 'Jeans', JSON.stringify(m3));
  await page.click('#rb-wg-cascade .cas-row:has-text("Skinny jeans")');
  await page.waitForTimeout(250);
  const m4 = await page.evaluate(() => ({
    closed: !document.getElementById('rb-wg-cascade'),
    grid: document.querySelectorAll('#wg-grid .wg-item:not(.rb-add-card):not(.rb-ghost-card)').length,
  }));
  check('mobile · item-type pick applies and closes', m4.closed && m4.grid === 1, JSON.stringify(m4));
  await page.evaluate(() => window.__waTrailClear());
  await page.waitForTimeout(200);
  await page.click('#rb-refine-pill');
  await page.waitForTimeout(250);
  const mref = await page.evaluate(() => {
    const d = document.getElementById('rb-refine');
    const cs = d ? getComputedStyle(d) : null;
    return {
      fixed: cs ? cs.position : '',
      head: !!document.querySelector('.rb-ref-mhead') && getComputedStyle(document.querySelector('.rb-ref-mhead')).display !== 'none',
      labels: Array.from(document.querySelectorAll('#rb-refine .rb-ref-lbl')).map((l) => l.textContent.trim().split('\n')[0]).slice(0, 2),
    };
  });
  check('mobile · refine opens as a bottom sheet with its header', mref.fixed === 'fixed' && mref.head, JSON.stringify(mref));
  check('mobile · Wear-it-for sits after Season in the sheet', /Season/.test(mref.labels[0] || '') && /Wear it for/i.test(mref.labels[1] || ''),
    mref.labels.join('|'));
  await page.evaluate(() => window.__waRefToggle());
  await page.evaluate(() => window.WA && WA.open());
  await page.waitForTimeout(400);
  const ms1 = await page.evaluate(() => {
    const shown = (el) => el && getComputedStyle(el).display !== 'none';
    return {
      dropH: Array.from(document.querySelectorAll('.rb-wf-drop-h')).filter(shown).map((h) => h.textContent),
      btns: Array.from(document.querySelectorAll('.rb-wf-drop-btns')).filter(shown)
        .flatMap((w) => Array.from(w.querySelectorAll('.rb-wf-btn')).map((b) => b.textContent)),
    };
  });
  check('mobile · step 1 stacks Attach photos over Take a photo (3.3 mock)', ms1.dropH.join('|') === 'Add as many as you like'
    && ms1.btns.join('|') === 'Attach photos|Take a photo', `${ms1.dropH.join('|')} / ${ms1.btns.join('|')}`);
  await page.evaluate(() => window.WA && WA.close());
  await page.waitForTimeout(300);
  await page.evaluate(() => window.__waAddChooser());
  await page.waitForTimeout(500);
  const msh = await page.evaluate(() => {
    const m = document.getElementById('wa-modal'), d = m.querySelector('.fm-dialog'), r = d.getBoundingClientRect();
    const rows = Array.from(document.querySelectorAll('.rb-wf-way')).map((b) => b.getBoundingClientRect().height);
    return { sheet: m.classList.contains('rb-wf-sheetmode'), bottom: Math.round(r.bottom), vh: window.innerHeight, top: Math.round(r.top), radius: getComputedStyle(d).borderTopLeftRadius, grab: getComputedStyle(document.querySelector('.rb-wf-grab')).display, rail: getComputedStyle(m.querySelector('.fm-rail')).display, rows, overflow: document.documentElement.scrollWidth <= window.innerWidth };
  });
  await shot(page, 'sheet-390');
  check('mobile · the action sheet is a bottom sheet at 390: pinned to the foot, rounded top, a grab bar, no rail, rows ≥ 44pt', msh.sheet && msh.bottom === msh.vh && msh.top > 200 && parseInt(msh.radius) > 12 && msh.grab === 'block' && msh.rail === 'none' && msh.rows.length === 4 && msh.rows.every((h) => h >= 44) && msh.overflow, JSON.stringify(msh));
  await page.click('.rb-wf-way[data-way="url"]');
  await page.waitForTimeout(300);
  const mu = await page.evaluate(() => { const m = document.getElementById('wa-modal'), d = m.querySelector('.fm-dialog').getBoundingClientRect(); return { sheet: m.classList.contains('rb-wf-sheetmode'), top: Math.round(d.top), h: document.querySelector('#wa-modal .fm-h')?.textContent, eye: document.querySelector('.rb-wf-heye')?.textContent }; });
  await shot(page, 'link-390');
  await page.evaluate(() => window.__waWay('mail'));
  await page.waitForTimeout(600);
  await shot(page, 'mail-390');
  await page.evaluate(() => window.__waWay('url'));
  await page.waitForTimeout(300);
  check('mobile · a door screen (Paste a link) is the full screen again, not the sheet', !mu.sheet && mu.top < 12 && mu.h === 'From a link.' && mu.eye === 'Paste a link', JSON.stringify(mu));  // the dialog's rise animation is still settling at 300ms
  await page.click('.rb-wf-hback');
  await page.waitForTimeout(300);
  check('mobile · the chevron returns to the sheet', await page.evaluate(() => document.getElementById('wa-modal').classList.contains('rb-wf-sheetmode') && document.querySelectorAll('.rb-wf-way').length === 4));
  await page.evaluate(() => window.WA && WA.close());
  check('no page errors (mobile)', errs.length === 0, errs.join(' | ').slice(0, 200));
  await ctx.close();
}

// ── The ways in (2026-09-22): chooser · link · receipt · price/size ────
{
  const { ctx, page, errs, supaPosts, profilePatches, urlReads } = await boot(browser, TAG, { rows: ROWS });
  // A bare open is unchanged — the photo step, straight in.
  await page.evaluate(() => window.WA && WA.open());
  await page.waitForTimeout(400);
  const bare = await page.evaluate(() => ({ h: document.querySelector('#wa-modal .fm-h')?.textContent || '', ways: document.querySelectorAll('.rb-wf-way').length, nophoto: !!document.querySelector('.rb-wf-nophoto'), back: !!document.querySelector('.rb-wf-back') }));
  check('ways · a bare WA.open still lands on the photo step (snap doors, briefs)', bare.h === 'Add your pieces.' && bare.ways === 0 && bare.nophoto && !bare.back, JSON.stringify(bare));
  await page.evaluate(() => window.WA && WA.close());
  await page.waitForTimeout(300);
  // The add card / masthead pill open the chooser: four ways, one dashed.
  await page.evaluate(() => window.__waAddChooser());
  await page.waitForTimeout(400);
  const ch = await page.evaluate(() => ({
    h: document.querySelector('#wa-modal .fm-h')?.textContent || '',
    eye: document.querySelector('.rb-wf-sheeteye')?.textContent || '',
    ways: Array.from(document.querySelectorAll('.rb-wf-way')).map((b) => b.dataset.way + ':' + b.querySelector('.rb-wf-way-t').textContent),
    ics: Array.from(document.querySelectorAll('.rb-wf-way-ic')).map((i) => getComputedStyle(i).width + '/' + getComputedStyle(i).borderRadius),
    nophoto: document.querySelector('.rb-wf-ways + .rb-wf-nophoto')?.textContent || '',
    inputs: ['wa-rb-file', 'wa-rb-lib', 'wa-rb-cam'].map((id) => !!document.getElementById(id)),
    cap: document.getElementById('wa-rb-cam')?.getAttribute('capture'), libCap: document.getElementById('wa-rb-lib')?.hasAttribute('capture'), libMulti: document.getElementById('wa-rb-lib')?.hasAttribute('multiple'),
    door: document.getElementById('wa-modal').classList.contains('rb-wf-door'), dots: getComputedStyle(document.querySelector('#wa-modal .fm-dots')).visibility,
    fills: Array.from(document.querySelectorAll('#wa-modal .fm-step button')).filter((b) => getComputedStyle(b).backgroundColor === 'rgb(32, 32, 33)').length,
  }));
  await shot(page, 'sheet-1280');
  check('ways · the action sheet (1a): Camera / Photo library / Forward a receipt / Paste a link as 44px-circle rows, Add without a photo beneath, no heading, no ink fill',
    !ch.h && ch.eye === 'Add a piece' && ch.ways.join('|') === 'cam:Camera|lib:Photo library|mail:Forward a receipt|url:Paste a link' && ch.ics.every((x) => x === '44px/50%') && ch.nophoto === 'Add without a photo' && ch.fills === 0, JSON.stringify(ch));
  check('ways · the sheet carries the three inputs, so Camera (capture) and Photo library (image/* multiple, no capture) reach the OS in one tap; the dots stand down on a door',
    ch.inputs.every(Boolean) && ch.cap === 'environment' && !ch.libCap && ch.libMulti && ch.door && ch.dots === 'hidden', JSON.stringify(ch));
  const fcLib = page.waitForEvent('filechooser', { timeout: 2500 }).catch(() => null);
  await page.click('.rb-wf-way[data-way="lib"]');
  const libChooser = await fcLib;
  check('ways · Photo library opens the OS picker, several at once', !!libChooser && libChooser.isMultiple(), String(!!libChooser));
  // Camera (1c): the in-app camera — Single | Several, the shutter, Done.
  await page.evaluate(() => { try { localStorage.removeItem('rb_cam_mode'); } catch (e) {} });
  await page.click('.rb-wf-way[data-way="cam"]');
  await page.waitForFunction(() => { const b = document.getElementById('rb-cam-shut'); return b && !b.disabled; }, null, { timeout: 6000 }).catch(() => {});
  const cm1 = await page.evaluate(() => ({ open: !!document.getElementById('rb-cam'), seg: [...document.querySelectorAll('#rb-cam .rb-cam-seg button')].map((b) => b.textContent.trim() + (b.classList.contains('on') ? '*' : '')).join('|'), shut: document.getElementById('rb-cam-shut')?.disabled === false, done: document.getElementById('rb-cam-done')?.hidden }));
  check('ways · Camera opens the in-app camera: Single* | Several, the shutter live, no Done on Single', cm1.open && cm1.seg === 'Single*|Several' && cm1.shut && cm1.done === true, JSON.stringify(cm1));
  await page.click('#rb-cam .rb-cam-seg [data-m="several"]');
  await page.click('#rb-cam-shut');
  await page.waitForTimeout(250);
  await page.click('#rb-cam-shut');
  await page.waitForTimeout(350);
  const cm2 = await page.evaluate(() => ({ n: document.querySelector('#rb-cam-th .n')?.textContent, done: document.getElementById('rb-cam-done')?.disabled === false && !document.getElementById('rb-cam-done').hidden, mode: localStorage.getItem('rb_cam_mode') }));
  await shot(page, 'camera-1280');
  check('ways · Several keeps the shutter open: two shots ride the thumbnail, Done comes live, the pick is remembered', cm2.n === '2' && cm2.done && cm2.mode === 'several', JSON.stringify(cm2));
  await page.click('#rb-cam-done');
  await page.waitForTimeout(600);
  const cm3 = await page.evaluate(() => ({ gone: !document.getElementById('rb-cam'), tag: /PIECE 1 OF 2/.test(document.querySelector('#wa-modal .fm-step')?.textContent || '') }));
  check('ways · Done hands the shots to the batch — piece 1 of 2 reads', cm3.gone && cm3.tag, JSON.stringify(cm3));
  await page.evaluate(() => { try { localStorage.removeItem('rb_cam_mode'); } catch (e) {} window.WA && WA.close(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => window.WA && WA.open({ way: 'choose' }));
  await page.waitForTimeout(400);
  await page.evaluate(() => window.__waWay('photo'));
  await page.waitForTimeout(300);
  const ph = await page.evaluate(() => ({ h: document.querySelector('#wa-modal .fm-h')?.textContent || '', file: !!document.getElementById('wa-rb-file'), cam: !!document.getElementById('wa-rb-cam'), back: document.querySelector('.rb-wf-back')?.textContent || '', nophoto: !!document.querySelector('.rb-wf-nophoto'), door: document.getElementById('wa-modal').classList.contains('rb-wf-door') }));
  check('ways · the drop step (the web’s own door) survives behind __waWay("photo") with "← Other ways in" in place of the no-photo link, the dots back', ph.h === 'Add your pieces.' && ph.file && ph.cam && ph.back === '← Other ways in' && !ph.nophoto && !ph.door, JSON.stringify(ph));
  await page.click('.rb-wf-back');
  await page.waitForTimeout(300);
  check('ways · Other ways in returns to the sheet', (await page.evaluate(() => document.querySelectorAll('.rb-wf-way').length)) === 4);
  await page.click('.rb-wf-ways + .rb-wf-nophoto');
  await page.waitForTimeout(300);
  check('ways · Add without a photo opens the empty sheet', await page.evaluate(() => /Add a piece/.test(document.querySelector('#wa-modal .fm-h')?.textContent || '') && !!document.querySelector('.rb-wf-slot') && !!document.querySelector('.rb-ps-row[data-k="name"]')));

  // Paste a link → reading → the confirm screen, filled from the page.
  await page.evaluate(() => window.__waWay('choose'));
  await page.click('.rb-wf-way[data-way="url"]');
  await page.waitForTimeout(300);
  const u0 = await page.evaluate(() => {
    const shown = (el) => !!el && getComputedStyle(el).display !== 'none';
    return { h: document.querySelector('#wa-modal .fm-h')?.textContent || '', eye: document.querySelector('.rb-wf-heye')?.textContent || '', back: document.querySelector('.rb-wf-hback')?.getAttribute('aria-label'), input: !!document.getElementById('rb-wf-url'), go: document.getElementById('rb-wf-urlgo')?.textContent || '', dim: document.getElementById('rb-wf-urlgo')?.classList.contains('dim'), paste: shown(document.getElementById('rb-wf-paste')), x: shown(document.querySelector('.rb-wf-urlx')), focused: document.activeElement?.id, w: document.getElementById('rb-wf-urlgo')?.getBoundingClientRect().width, fw: document.querySelector('.rb-wf-dfoot')?.getBoundingClientRect().width };
  });
  await shot(page, 'link-1280');
  check('link · (2b) the chevron header, "From a link.", Paste in the field, the one full-width Read it dim until a URL, the field focused', u0.h === 'From a link.' && u0.eye === 'Paste a link' && u0.back === 'Other ways in' && u0.input && u0.go === 'Read it' && u0.dim && u0.paste && !u0.x && u0.focused === 'rb-wf-url' && Math.abs(u0.w - u0.fw) < 2, JSON.stringify(u0));
  await page.fill('#rb-wf-url', 'https://x.example');
  await page.waitForTimeout(80);
  const u0b = await page.evaluate(() => { const shown = (el) => !!el && getComputedStyle(el).display !== 'none'; return { dim: document.getElementById('rb-wf-urlgo')?.classList.contains('dim'), paste: shown(document.getElementById('rb-wf-paste')), x: shown(document.querySelector('.rb-wf-urlx')) }; });
  check('link · typing swaps Paste for × and lights Read it', !u0b.dim && !u0b.paste && u0b.x, JSON.stringify(u0b));
  await page.click('.rb-wf-urlx');
  await page.waitForTimeout(80);
  check('link · × clears the field and brings Paste back', await page.evaluate(() => document.getElementById('rb-wf-url').value === '' && getComputedStyle(document.getElementById('rb-wf-paste')).display !== 'none'));
  await page.fill('#rb-wf-url', 'not a link');
  await page.click('#rb-wf-urlgo');
  await page.waitForTimeout(200);
  check('link · a non-link is named inline, nothing posted', await page.evaluate(() => /doesn’t look like a link/.test(document.getElementById('rb-wf-urlerr')?.textContent || '')) && urlReads.length === 0);
  await page.fill('#rb-wf-url', 'https://shop.example.com/p/1');
  await page.press('#rb-wf-url', 'Enter');
  await page.waitForTimeout(120);
  check('link · Enter reads it; the reading state stands while it does', await page.evaluate(() => /Robes is reading it/.test(document.querySelector('.rb-wf-reading .h')?.textContent || '')));
  await page.waitForTimeout(700);
  const u1 = await page.evaluate(() => ({
    h: document.querySelector('#wa-modal .fm-h')?.textContent || '',
    sub: document.querySelector('#wa-modal .fm-step > p')?.textContent || '',
    photo: document.getElementById('wa-saw-photo')?.getAttribute('src') || '',
    retake: document.querySelector('.rb-saw-retake')?.textContent || '',
    vals: ['name', 'category', 'brand', 'colour'].map((k) => document.querySelector('.rb-ps-row[data-k="' + k + '"] .rb-ps-v')?.textContent),
  }));
  check('link · lands on "Here’s what Robes saw." read from the page, the page image on the panel, the retake reading Another link',
    /what Robes/.test(u1.h) && /Read from the page/.test(u1.sub) && u1.photo === URL_PIECE.image_url && u1.retake === '↺ Another link' && urlReads[0]?.url === 'https://shop.example.com/p/1', JSON.stringify(u1));
  await page.waitForTimeout(2200);
  const u2 = await page.evaluate(() => ({ price: document.querySelector('.rb-ps-row[data-k="price"] .rb-ps-v')?.textContent, size: document.querySelector('.rb-ps-row[data-k="size"] .rb-ps-v')?.textContent, order: Array.from(document.querySelectorAll('.rb-ps-row')).map((r) => r.dataset.k).slice(-3) }));
  check('link · the Price and Size rows carry what the page read, before Notes', u2.price === '£340' && u2.size === '38' && u2.order.join('|') === 'size|price|notes', JSON.stringify(u2));
  await page.click('.rb-ps-row[data-k="size"]');
  await page.waitForTimeout(150);
  const u3 = await page.evaluate(() => ({ title: document.querySelector('#rb-ps-wrap h3')?.textContent, help: document.querySelector('.rb-ps-help')?.textContent || '', val: document.getElementById('rb-ps-in')?.value }));
  check('link · the Size sheet, prefilled, with the one line of help', u3.title === 'Size' && /Both optional/.test(u3.help) && u3.val === '38', JSON.stringify(u3));
  await page.fill('#rb-ps-in', 'UK 5');
  await page.click('.rb-ps-save');
  await page.waitForTimeout(150);
  await page.click('#wa-saw-cta');
  await page.waitForTimeout(1200);
  const post = supaPosts[0] || {};
  check('link · the save carries the hosted image, price 340 GBP and the corrected size', post.image_url === URL_PIECE.image_url && post.price === 340 && post.currency === 'GBP' && post.size === 'UK 5' && post.category_l2 === 'Trainers' && post.item_dna?.source?.kind === 'url', JSON.stringify([post.image_url, post.price, post.currency, post.size, post.category_l2]));

  // Forward a receipt: her address is minted on first open, copyable.
  await page.evaluate(() => window.WA && WA.open({ way: 'mail' }));
  await page.waitForTimeout(700);
  const m1 = await page.evaluate(() => ({ h: document.querySelector('#wa-modal .fm-h')?.textContent || '', eye: document.querySelector('.rb-wf-heye')?.textContent || '', addr: document.getElementById('rb-wf-addr')?.textContent || '', copy: document.getElementById('rb-wf-copy')?.disabled, cardIsBtn: document.getElementById('rb-wf-copy')?.tagName, copyLbl: document.getElementById('rb-wf-copylbl')?.textContent, steps: document.querySelectorAll('.rb-wf-step').length, got: !!document.querySelector('#wa-modal .rb-wf-quiet'), mail: !!document.getElementById('rb-wf-mailgo'), back: !!document.querySelector('#wa-modal .rb-wf-hback'), door: document.getElementById('wa-modal').classList.contains('rb-wf-door') }));
  await shot(page, 'mail-1280');
  check('mail · (2a) the chevron header, "Your own address.", the address CARD is the Copy button (annie-xxxx@in.byrobes.com minted onto her profile), three numbered steps — no Open Mail, no Got it, the chevron the way back',
    m1.h === 'Your own address.' && m1.eye === 'Forward a receipt' && /^annie-[a-z2-9]{4}@in\.byrobes\.com$/.test(m1.addr) && m1.copy === false && m1.cardIsBtn === 'BUTTON' && m1.copyLbl === 'Copy' && m1.steps === 3 && !m1.got && !m1.mail && m1.back && m1.door
      && profilePatches.length === 1 && /^annie-[a-z2-9]{4}$/.test(profilePatches[0].inbox_address || ''), JSON.stringify([m1, profilePatches]));
  await page.evaluate(() => window.WA && WA.close());
  check('no page errors (ways)', errs.length === 0, errs.join(' | ').slice(0, 240));
  await ctx.close();
}
{
  // A page that carried no image lands on the editor, a photo slot in its head.
  const { ctx, page, errs } = await boot(browser, TAG, { rows: ROWS, urlPiece: { ...URL_PIECE, image_url: null } });
  await page.evaluate(() => window.WA && WA.open({ way: 'url' }));
  await page.waitForTimeout(400);
  await page.fill('#rb-wf-url', 'https://shop.example.com/p/2');
  await page.click('#rb-wf-urlgo');
  await page.waitForTimeout(900);
  const n = await page.evaluate(() => ({ label: document.querySelector('.rb-ps-row[data-k="name"] .rb-ps-v')?.textContent, slot: document.querySelector('.rb-wf-slot')?.textContent.trim() || '', photoIn: !!document.getElementById('rb-wf-photoin'), panel: !!document.getElementById('rb-saw-panel') }));
  check('link · no page image → the rows prefilled, the dashed Add-a-photo slot in place of the reveal', n.label === 'Leather trainers' && n.slot === 'Add a photo' && !n.panel && n.photoIn, JSON.stringify(n));
  await page.setInputFiles('#rb-wf-photoin', { name: 'p.png', mimeType: 'image/png', buffer: PNG_OK });
  await page.waitForTimeout(500);
  check('link · Add a photo attaches straight in (no re-scan)', await page.evaluate(() => !!document.querySelector('.rb-wf-photo img')?.src && !document.querySelector('.rb-wf-slot')));
  check('no page errors (link, no image)', errs.length === 0, errs.join(' | ').slice(0, 240));
  await ctx.close();
}
{
  // Held receipts: the wardrobe notice, the list, the review, the filing.
  const { ctx, page, errs, supaPosts, inboxPatches } = await boot(browser, TAG, { rows: ROWS, inbox: INBOX, inboxAddress: 'annie-4f2k' });
  await page.evaluate(() => window.App && App.showWardrobe());
  await page.waitForTimeout(700);
  const n1 = await page.evaluate(() => {
    const el = document.getElementById('rb-wg-inbox');
    const trail = document.getElementById('rb-wg-trail');
    return { on: !!el, h: el?.querySelector('.h')?.textContent || '', s: el?.querySelector('.s')?.textContent || '', go: el?.querySelector('.rb-wg-inbox-go')?.textContent || '', afterTrail: !!el && trail?.nextElementSibling === el, addCard: document.querySelector('#wg-grid .rb-add-card .rb-add-hint')?.textContent || '' };
  });
  check('receipts · the wardrobe strip under the trail: "Robes read two receipts · 4 pieces waiting · Review them →"',
    n1.on && n1.h === 'Robes read two receipts' && n1.s === '4 pieces waiting' && n1.go === 'Review them →' && n1.afterTrail, JSON.stringify(n1));
  check('receipts · the add card names the three doors', n1.addCard === 'Photograph · Receipt · Link', n1.addCard);
  await page.click('#rb-wg-inbox .rb-wg-inbox-go');
  await page.waitForTimeout(500);
  const l1 = await page.evaluate(() => ({ h: document.querySelector('#wa-modal .fm-h')?.textContent || '', ey: document.querySelector('.rb-wf-eyebrow')?.textContent || '', rows: Array.from(document.querySelectorAll('.rb-wf-rcpt')).map((b) => b.querySelector('.t').textContent + ' / ' + b.querySelector('.s').textContent), other: Array.from(document.querySelectorAll('#wa-modal .rb-wf-back')).some((b) => /Other ways in/.test(b.textContent)), subs: document.querySelectorAll('#wa-modal .fm-step > p:not(.rb-wf-note)').length }));
  check('receipts · Review them opens the held list — eyebrow, "4 pieces read", the rows newest first with their day and count, the one note, nothing else',
    l1.ey === 'Waiting for you' && l1.h === '4 pieces read' && l1.rows.length === 2 && /^NET-A-PORTER \/ (This morning|Today) · 3 pieces read$/.test(l1.rows[0]) && l1.rows[1] === 'Sézane / Yesterday · 1 piece read' && !l1.other && l1.subs === 0, JSON.stringify(l1));
  await page.click('.rb-wf-rcpt[data-id="rc-1"]');
  await page.waitForTimeout(300);
  const r1 = await page.evaluate(() => ({
    ey: document.querySelector('.rb-wf-eyebrow')?.textContent || '', h: document.querySelector('#wa-modal .fm-h')?.textContent || '',
    rows: Array.from(document.querySelectorAll('.rb-wf-rev')).map((b) => (b.classList.contains('on') ? '✓' : '·') + b.querySelector('.t').textContent + ' / ' + b.querySelector('.s').textContent),
    thumb: !!document.querySelector('.rb-wf-rev[data-i="0"] .th img'), mono: document.querySelector('.rb-wf-rev[data-i="1"] .th')?.textContent || '',
    chosen: document.getElementById('rb-wf-chosen')?.textContent || '', file: document.getElementById('rb-wf-file')?.textContent || '',
  }));
  check('receipts · the review: three rows, price · size, the returned tank unticked, the image on the first, a monogram on the second, "File 2 pieces"',
    /^From NET-A-PORTER · (This morning|Today)$/.test(r1.ey) && r1.h === '3 pieces read' && r1.rows.join('|') === '✓Leather trainers / £340 · Size 38|✓Leather tote / £320 · Size One size|·Ribbed cotton tank / £39 · Size S · × 2'
      && r1.thumb && r1.mono === 'L' && /^2 pieces chosen/.test(r1.chosen) && r1.file === 'File 2 pieces', JSON.stringify(r1));
  await page.click('.rb-wf-rev[data-i="1"]');
  await page.waitForTimeout(200);
  check('receipts · unticking a row moves the count', (await page.evaluate(() => document.getElementById('rb-wf-file')?.textContent)) === 'File 1 piece');
  await page.click('.rb-wf-rev[data-i="1"]');
  await page.click('#rb-wf-file');
  await page.waitForTimeout(1500);
  const f1 = await page.evaluate(() => ({ h: document.querySelector('#wa-modal .fm-h')?.textContent || '', ey: document.querySelector('.rb-wf-eyebrow')?.textContent || '', open: !!document.querySelector('#wa-modal.open'), rows: document.querySelectorAll('.rb-wf-rcpt').length, revs: document.querySelectorAll('.rb-wf-rev').length, back: Array.from(document.querySelectorAll('#wa-modal .rb-wf-back')).some((b) => /All receipts/.test(b.textContent)), notice: document.getElementById('rb-wg-inbox')?.querySelector('.h')?.textContent || '', noticeS: document.getElementById('rb-wg-inbox')?.querySelector('.s')?.textContent || '', toast: document.getElementById('toast-msg')?.textContent || document.getElementById('toast')?.textContent || '' }));
  check('receipts · File 2 pieces inserts the two ticked rows with their price, size and source, and moves the receipt to filed',
    supaPosts.length === 2 && supaPosts[0].label === 'Leather trainers' && supaPosts[0].price === 340 && supaPosts[0].size === '38' && supaPosts[0].currency === 'GBP' && supaPosts[0].image_url === 'https://res.cloudinary.com/robes/trainers.jpg' && supaPosts[0].item_dna?.source?.kind === 'receipt'
      && supaPosts[1].label === 'Leather tote' && supaPosts[1].category_l2 === 'Everyday bags' && supaPosts[1].image_url === null
      && supaPosts[0].colour_shade === 'optic' && supaPosts[1].colour_shade === 'camel' && supaPosts[1].print === null
      && inboxPatches.length === 1 && /rc-1/.test(inboxPatches[0].url) && inboxPatches[0].body.status === 'filed' && Array.isArray(inboxPatches[0].body.filed_ids),
    JSON.stringify([supaPosts.map((p) => [p.label, p.price, p.size]), inboxPatches]));
  check('receipts · one receipt left → the modal steps straight into ITS review (no list, no "All receipts" back), the strip counts down to "Robes read one receipt · 1 piece waiting", and nothing toasts',
    f1.open && f1.h === '1 piece read' && /^From Sézane · Yesterday$/.test(f1.ey) && f1.rows === 0 && f1.revs === 1 && !f1.back && f1.notice === 'Robes read one receipt' && f1.noticeS === '1 piece waiting' && !/piece/.test(f1.toast), JSON.stringify(f1));
  await page.click('#rb-wf-chosen .rb-wf-back');
  await page.waitForTimeout(600);
  const d1 = await page.evaluate(() => ({ open: !!document.querySelector('#wa-modal.open'), notice: !!document.getElementById('rb-wg-inbox') }));
  check('receipts · Nothing to keep dismisses the last receipt, closes the modal and takes the strip down — no caught-up state in its place',
    !d1.open && !d1.notice && inboxPatches.length === 2 && inboxPatches[1].body.status === 'dismissed' && supaPosts.length === 2, JSON.stringify([d1, inboxPatches[1]]));
  check('no page errors (receipts)', errs.length === 0, errs.join(' | ').slice(0, 240));
  await ctx.close();
}
{
  // The receipt leaves the queue whatever its status write did (Annie,
  // 2026-10-01: "forwarded receipts stays stuck on the wardrobe screen"):
  // a live table lagging a column of migration 23 400s the PATCH, and
  // _waLoad's refetch then painted the same receipt straight back.
  for (const mode of ['strict', 'down']) {
    const { ctx, page, errs, supaPosts, inboxPatches } = await boot(browser, TAG, { rows: ROWS, inbox: INBOX, inboxAddress: 'annie-4f2k', inboxPatch: mode });
    await page.evaluate(() => window.App && App.showWardrobe());
    await page.waitForTimeout(700);
    await page.click('#rb-wg-inbox .rb-wg-inbox-go');
    await page.waitForTimeout(500);
    await page.click('.rb-wf-rcpt[data-id="rc-1"]');
    await page.waitForTimeout(300);
    await page.click('#rb-wf-file');
    await page.waitForTimeout(1800);
    const f = await page.evaluate(() => ({ open: !!document.querySelector('#wa-modal.open'), h: document.querySelector('#wa-modal .fm-h')?.textContent || '', notice: document.getElementById('rb-wg-inbox')?.querySelector('.h')?.textContent || '', noticeS: document.getElementById('rb-wg-inbox')?.querySelector('.s')?.textContent || '' }));
    if (mode === 'strict') {
      const bodies = inboxPatches.filter((p) => /rc-1/.test(p.url)).map((p) => Object.keys(p.body).sort().join(','));
      check('receipts · a PATCH refused for a column the table lacks is retried without it, down to one that lands',
        bodies.length === 3 && bodies[0] === 'decided_at,filed_ids,filed_to,status' && bodies[1] === 'decided_at,filed_ids,status' && bodies[2] === 'filed_ids,status', JSON.stringify(bodies));
    } else {
      check('receipts · a PATCH that never lands is given up after one try, the pieces already filed', inboxPatches.filter((p) => /rc-1/.test(p.url)).length === 1 && supaPosts.length === 2, JSON.stringify(inboxPatches));
    }
    check('receipts (' + mode + ') · the filed receipt leaves the queue and the refetch never brings it back — the strip counts down to the one left',
      f.open && f.h === '1 piece read' && f.notice === 'Robes read one receipt' && f.noticeS === '1 piece waiting', JSON.stringify(f));
    // the second receipt — "Nothing to keep" — clears the strip for good too
    await page.click('#rb-wf-chosen .rb-wf-back');
    await page.waitForTimeout(800);
    const d = await page.evaluate(() => ({ open: !!document.querySelector('#wa-modal.open'), notice: !!document.getElementById('rb-wg-inbox') }));
    check('receipts (' + mode + ') · the last receipt dismissed takes the strip down and it stays down', !d.open && !d.notice, JSON.stringify(d));
    check('no page errors (receipts · ' + mode + ')', errs.length === 0, errs.join(' | ').slice(0, 240));
    await ctx.close();
  }
}
{
  // The quiet way back: pieces filed from a receipt stay findable under Refine → Added from · Receipts.
  const RECEIPT_ROW = { id: 'row-r', user_id: 'u-test', label: 'Pink velour tracksuit top', category: 'Tops', category_l2: 'Sweatshirts & hoodies', category_l3: 'Zip-up hoodie', color: 'Blush', brand: 'Zara', notes: '', image_url: null, times_worn: 0, item_dna: { source: { kind: 'receipt', retailer: 'Zara', order_ref: '1', inbox_id: 'rc-9' } }, seasons: [], occasions: [], season_band: 'year_round', season_source: 'inferred', hero_position: null, created_at: '2026-09-22' };
  const { ctx, page, errs } = await boot(browser, TAG, { rows: ROWS.concat([RECEIPT_ROW]) });
  await page.evaluate(() => window.App && App.showWardrobe());
  await page.waitForTimeout(700);
  await page.click('#rb-refine-pill');
  await page.waitForTimeout(250);
  const rf1 = await page.evaluate(() => ({ lbl: document.querySelector('#rb-refine .rb-ref-sec.src .rb-ref-lbl')?.textContent || '', chip: document.querySelector('#rb-refine .rb-ref-sec.src .rb-ref-chip')?.textContent || '', on: !!document.querySelector('#rb-refine .rb-ref-sec.src .rb-ref-chip.on'), grid: document.querySelectorAll('#wg-grid .wg-item:not(.rb-add-card):not(.rb-ghost-card)').length }));
  check('refine · "Added from · Receipts" renders once a receipt-filed piece exists, off by default', rf1.lbl === 'Added from' && rf1.chip === 'Receipts' && !rf1.on && rf1.grid === 4, JSON.stringify(rf1));
  await page.click('#rb-refine .rb-ref-sec.src .rb-ref-chip');
  await page.waitForTimeout(250);
  const rf2 = await page.evaluate(() => ({ on: !!document.querySelector('#rb-refine .rb-ref-sec.src .rb-ref-chip.on'), cards: document.querySelectorAll('#wg-grid .wg-item:not(.rb-add-card):not(.rb-ghost-card)').length, badge: document.querySelector('#rb-refine-pill .rb-refine-badge')?.textContent || '' }));
  check('refine · the Receipts pick narrows the grid to the receipt-filed piece and counts on the pill', rf2.on && rf2.cards === 1 && rf2.badge === '1', JSON.stringify(rf2));
  await page.evaluate(() => window.__waRefClear());
  await page.waitForTimeout(200);
  check('refine · Clear all drops the pick', (await page.evaluate(() => document.querySelectorAll('#wg-grid .wg-item:not(.rb-add-card):not(.rb-ghost-card)').length)) === 4);
  await page.evaluate(() => window.__waRefToggle());
  check('no page errors (refine · receipts)', errs.length === 0, errs.join(' | ').slice(0, 240));
  await ctx.close();
}

// ── The wishlist takes the same ways in (2026-09-22) ─────────────────
{
  const { ctx, page, errs, supaPosts, wlPosts, inboxPatches } = await boot(browser, TAG, { rows: ROWS, inbox: INBOX, inboxAddress: 'annie-4f2k' });
  await page.evaluate(() => window.App && App.showWardrobe());
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__waSetView('wishlist'));
  await page.waitForTimeout(400);
  const w0 = await page.evaluate(() => ({ pill: document.getElementById('rb-add-pill')?.getAttribute('aria-label'), soon: !!document.querySelector('.rb-soon-tag'), modal: !!document.getElementById('rb-wl-modal'), notice: !!document.getElementById('rb-wg-inbox'), empty: document.querySelector('.rb-wl-empty')?.textContent || '' }));
  check('wishlist · the empty state offers Save a piece + a live Paste a link (no Coming soon), no bespoke modal, no receipt notice on this view', w0.pill === 'Save a piece' && !w0.soon && !w0.modal && !w0.notice && /Paste a link/.test(w0.empty), JSON.stringify(w0));
  await page.click('#rb-add-pill');
  await page.waitForTimeout(400);
  const w1 = await page.evaluate(() => ({ eye: document.querySelector('.rb-wf-sheeteye')?.textContent || '', ways: Array.from(document.querySelectorAll('.rb-wf-way')).map((b) => b.dataset.way) }));
  check('wishlist · + Save a piece opens the same action sheet in the wishlist register: "Save a piece" / the four ways', w1.eye === 'Save a piece' && w1.ways.join('|') === 'cam|lib|mail|url', JSON.stringify(w1));
  await page.evaluate(() => window.__waWay('photo'));
  await page.waitForTimeout(300);
  check('wishlist · the photo step reads "Save what catches your eye."', await page.evaluate(() => document.querySelector('#wa-modal .fm-h')?.textContent) === 'Save what catches your eye.');
  await page.setInputFiles('#wa-rb-file', { name: 'blazer.png', mimeType: 'image/png', buffer: PNG_OK });
  await page.waitForTimeout(1200);
  const w2 = await page.evaluate(() => ({ h: document.querySelector('#wa-modal .fm-h')?.textContent || '', sub: document.querySelector('#wa-modal .fm-step > p')?.textContent || '', cta: document.getElementById('wa-saw-cta')?.textContent || '' }));
  check('wishlist · the scan lands on the same confirm screen, CTA "Save to wishlist →"', /what Robes/.test(w2.h) && /Read from your image/.test(w2.sub) && w2.cta === 'Save to wishlist →', JSON.stringify(w2));
  await page.waitForTimeout(2200);
  const w3 = await page.evaluate(() => ({ rows: Array.from(document.querySelectorAll('.rb-ps-row')).map((r) => r.dataset.k), src: document.querySelector('.rb-ps-row[data-k="src"] .rb-ps-v')?.textContent }));
  check('wishlist · the rows carry Spotted (Screenshot by default) and Size / Price / Notes — no Season, no Wear it for', w3.rows.join('|') === 'name|category|brand|src|colour|extra|print|size|price|notes' && w3.src === 'Screenshot', JSON.stringify(w3));
  await page.click('.rb-ps-row[data-k="src"]');
  await page.waitForTimeout(150);
  const w3b = await page.evaluate(() => ({ title: document.querySelector('#rb-ps-wrap h3')?.textContent, opts: Array.from(document.querySelectorAll('#rb-ps-wrap .rb-ps-opt .n')).map((n) => n.textContent) }));
  check('wishlist · the Spotted sheet lists the five sources', w3b.title === 'Where did you spot it?' && w3b.opts.join('|') === 'Screenshot|Instagram|Substack|In person|A link', JSON.stringify(w3b));
  await page.click('#rb-ps-wrap .rb-ps-opt:has-text("Instagram")');
  await page.waitForTimeout(150);
  await page.click('.rb-ps-row[data-k="price"]');
  await page.waitForTimeout(150);
  await page.click('.rb-ps-cur:has-text("EUR")');
  await page.fill('#rb-ps-in', '245');
  await page.click('.rb-ps-save');
  await page.waitForTimeout(150);
  await page.click('.rb-ps-row[data-k="size"]');
  await page.waitForTimeout(150);
  await page.fill('#rb-ps-in', 'M');
  await page.press('#rb-ps-in', 'Enter');
  await page.waitForTimeout(150);
  await page.click('#wa-saw-cta');
  await page.waitForTimeout(1200);
  const wp = wlPosts[0] || {};
  check('wishlist · the save is a wishlist_items row: label, Instagram provenance, price 245 EUR, size, the taxonomy pair, the hosted photo — and nothing reached wardrobe_items',
    wlPosts.length === 1 && supaPosts.length === 0 && wp.label === 'Cream wool blazer' && wp.source_type === 'instagram' && wp.source_label === 'Saved from Instagram' && wp.price === 245 && wp.currency === 'EUR' && wp.size === 'M' && wp.image_url === 'https://res.cloudinary.com/robes/test.jpg' && wp.category === 'Outerwear' && 'category_l2' in wp && !('season_band' in wp) && !('notes' in wp) && 'note' in wp,
    JSON.stringify(wp));
  const w5 = await page.evaluate(() => ({ open: !!document.querySelector('#wa-modal.open'), view: document.getElementById('rb-wl-grid')?.style.display, card: document.querySelector('#rb-wl-grid .rb-wr-eye')?.textContent || '', stat: document.querySelector('#rb-wl-grid .rb-wr-stat')?.textContent || '' }));
  // The wishlist draws the rack card (Wardrobe_List, 2026-10-06): Category ·
  // Brand on the eyebrow, the price and "Not yours yet" on the status line.
  check('wishlist · the modal closes, the wishlist repaints with the piece (Category · Brand, the price with its currency)', !w5.open && w5.view === 'grid' && w5.card === 'Outerwear · Zara' && w5.stat === '€245 · Not yours yet', JSON.stringify(w5));

  // A link, saved to the wishlist: provenance A link + the page URL kept.
  await page.evaluate(() => window.__wlSoonLink());
  await page.waitForTimeout(400);
  await page.fill('#rb-wf-url', 'https://shop.example.com/p/1');
  await page.click('#rb-wf-urlgo');
  await page.waitForTimeout(1000);
  await page.waitForTimeout(2200);
  await page.click('#wa-saw-cta');
  await page.waitForTimeout(1200);
  const wl2 = wlPosts[1] || {};
  check('wishlist · Paste a link (the old coming-soon door) reads the page and saves it with source A link + the URL, price 340 GBP, size 38', wlPosts.length === 2 && wl2.source_type === 'url' && wl2.source_url === 'https://shop.example.com/p/1' && wl2.price === 340 && wl2.currency === 'GBP' && wl2.size === '38' && wl2.image_url === URL_PIECE.image_url, JSON.stringify(wl2));

  // A receipt reviewed from the wishlist saves there — with a way to the wardrobe on the screen.
  await page.evaluate(() => window.WA && WA.open({ way: 'receipts', target: 'wishlist' }));
  await page.waitForTimeout(400);
  await page.click('.rb-wf-rcpt[data-id="rc-2"]');
  await page.waitForTimeout(300);
  const r0 = await page.evaluate(() => ({ to: document.getElementById('rb-wf-revto')?.textContent || '', file: document.getElementById('rb-wf-file')?.textContent || '' }));
  check('wishlist · the review says "Saving to your wishlist · To the wardrobe instead →", the CTA reads Save', /^Saving to your wishlist/.test(r0.to) && /To the wardrobe instead/.test(r0.to) && r0.file === 'Save 1 piece', JSON.stringify(r0));
  await page.click('#rb-wf-revto .rb-wf-back');
  await page.waitForTimeout(200);
  const r1 = await page.evaluate(() => ({ to: document.getElementById('rb-wf-revto')?.textContent || '', file: document.getElementById('rb-wf-file')?.textContent || '' }));
  check('wishlist · the toggle flips the landing to the wardrobe and back', /^Filing to your wardrobe/.test(r1.to) && r1.file === 'File 1 piece');
  await page.click('#rb-wf-revto .rb-wf-back');
  await page.click('#rb-wf-file');
  await page.waitForTimeout(1200);
  const wl3 = wlPosts[2] || {};
  check('wishlist · Save 1 piece writes the wishlist row from the receipt (From Sézane, 95 EUR) and marks the receipt filed to the wishlist', wlPosts.length === 3 && supaPosts.length === 0 && wl3.source_type === 'receipt' && wl3.source_label === 'From Sézane' && wl3.price === 95 && wl3.currency === 'EUR' && wl3.colour_shade === null && wl3.print === 'other' && inboxPatches.some((p) => /rc-2/.test(p.url) && p.body.status === 'filed' && p.body.filed_to === 'wishlist'), JSON.stringify([wl3, inboxPatches]));
  check('no page errors (wishlist)', errs.length === 0, errs.join(' | ').slice(0, 240));
  await ctx.close();
}
{
  // ── The mail's deep link (2026-09-23): /wardrobe?receipts=1&from=email ──
  // One receipt waiting → the wardrobe opens and steps straight into its
  // review; the params are stripped off the address.
  const { ctx, page, errs } = await boot(browser, TAG, { rows: ROWS, inbox: [INBOX[0]], inboxAddress: 'annie-4f2k', path: '/wardrobe?receipts=1&from=email' });
  await page.waitForTimeout(800);
  const d1 = await page.evaluate(() => ({ open: !!document.querySelector('#wa-modal.open'), revs: document.querySelectorAll('.rb-wf-rev').length, rcpts: document.querySelectorAll('.rb-wf-rcpt').length, ey: document.querySelector('.rb-wf-eyebrow')?.textContent || '', back: Array.from(document.querySelectorAll('#wa-modal .rb-wf-back')).some((b) => /All receipts/.test(b.textContent)), wp: !!document.querySelector('.wardrobe-panel.visible'), url: location.pathname + location.search }));
  check('deep link · /wardrobe?receipts=1&from=email with one receipt waiting opens the wardrobe and lands straight on ITS review, the params stripped',
    d1.open && d1.revs === 3 && d1.rcpts === 0 && /From NET-A-PORTER/.test(d1.ey) && !d1.back && d1.wp && d1.url === '/wardrobe', JSON.stringify(d1));
  check('no page errors (deep link · one)', errs.length === 0, errs.join(' | ').slice(0, 240));
  await ctx.close();
}
{
  // Two waiting → the held list; nothing waiting → the wardrobe alone.
  const a = await boot(browser, TAG, { rows: ROWS, inbox: INBOX, inboxAddress: 'annie-4f2k', path: '/wardrobe?receipts=1' });
  await a.page.waitForTimeout(800);
  const d2 = await a.page.evaluate(() => ({ open: !!document.querySelector('#wa-modal.open'), rcpts: document.querySelectorAll('.rb-wf-rcpt').length, url: location.pathname + location.search }));
  check('deep link · two receipts waiting → the held list', d2.open && d2.rcpts === 2 && d2.url === '/wardrobe', JSON.stringify(d2));
  await a.ctx.close();
  const b = await boot(browser, TAG, { rows: ROWS, inbox: [], inboxAddress: 'annie-4f2k', path: '/wardrobe?receipts=1' });
  await b.page.waitForTimeout(800);
  const d3 = await b.page.evaluate(() => ({ open: !!document.querySelector('#wa-modal.open'), wp: !!document.querySelector('.wardrobe-panel.visible'), url: location.pathname + location.search }));
  check('deep link · nothing waiting (filed elsewhere) → the wardrobe, no modal', !d3.open && d3.wp && d3.url === '/wardrobe', JSON.stringify(d3));
  check('no page errors (deep link · list / none)', a.errs.length === 0 && b.errs.length === 0, a.errs.concat(b.errs).join(' | ').slice(0, 240));
  await a.ctx.close().catch(() => {});
  await b.ctx.close();
}

// ── The colour model (2026-10-22): a read in the new shape ─────────────
// The analyse answers a shade id, extras and a print; the summary's dot
// draws the shade, "Chocolate" is a shade now (never folded to Espresso by
// the old Gemini map), and an untouched save files the three columns as
// read. Then migration 27 missing: the ladder strips them and the row lands.
{
  const TAG_CM = { ...TAG, label: 'Chocolate wool coat', color: 'Chocolate', colour_shade: 'chocolate', colour_extra: ['gold', 'chocolate', 'nope'], print: 'plain',
    item_dna: { ...TAG.item_dna, display: { ...TAG.item_dna.display, primary_color_hex: '#4E3024' }, colour_check: true } };
  const { ctx, page, errs, supaPosts } = await boot(browser, TAG_CM);
  await page.evaluate(() => window.WA && WA.open());
  await page.waitForTimeout(400);
  await page.setInputFiles('#wa-rb-file', { name: 'coat.png', mimeType: 'image/png', buffer: PNG_OK });
  await page.waitForSelector('#rb-saw-panel', { timeout: 8000 });
  await page.waitForTimeout(2800);
  const cm = await page.evaluate(() => ({
    colour: window.__waSawColor, shade: window.__waSawShade, extra: window.__waSawExtra, print: window.__waSawPrint,
    dot: (document.querySelector('.rb-ps-row[data-k="colour"] .rb-ps-sw')?.getAttribute('style') || '').replace(/\s/g, ''),
    model: !!(window.RB_COLOURS && window.RB_COLOURS.SHADES && window.RB_COLOURS.SHADES.length === 74),
    extra: document.querySelector('.rb-ps-row[data-k="extra"] .rb-ps-v')?.textContent, checks: Array.from(document.querySelectorAll('.rb-ps-row')).filter((r) => r.querySelector('.rb-ps-chk')).map((r) => r.dataset.k),
  }));
  check('colour model · the Additional colours row reads the extras (Gold), and colour_check marks Colour + Additional colours "Check" (Category too — the read placed no subcategory)', cm.extra === 'Gold' && cm.checks.join('|') === 'category|colour|extra', JSON.stringify([cm.extra, cm.checks]));
  check('colour model · the page carries window.RB_COLOURS (74 shades)', cm.model, String(cm.model));
  check('colour model · a shade read lands as its display name — Chocolate stays Chocolate', cm.colour === 'Chocolate' && cm.shade === 'chocolate', JSON.stringify(cm));
  check('colour model · the colour row\'s swatch draws the shade\'s hex', /#4E3024/i.test(cm.dot), cm.dot);
  await page.click('#wa-saw-cta');
  await page.waitForTimeout(1800);
  const p = supaPosts[0] || {};
  check('colour model · an untouched save files the shade, the extras (deduped, the shade itself and an unknown id dropped) and no print',
    supaPosts.length === 1 && p.colour_shade === 'chocolate' && JSON.stringify(p.colour_extra) === '["gold"]' && p.print === null && p.color === 'Chocolate',
    JSON.stringify([p.colour_shade, p.colour_extra, p.print, p.color]));
  check('no page errors (colour model)', errs.length === 0, errs.join(' | ').slice(0, 200));
  await ctx.close();
}
{
  // Migration 27 not run: the first POST is refused naming colour_shade,
  // the retry lands without the three columns, nothing else is lost.
  const { ctx, page, errs, supaPosts } = await boot(browser, TAG, { cmDown: true });
  await page.evaluate(() => window.WA && WA.open());
  await page.waitForTimeout(400);
  await page.setInputFiles('#wa-rb-file', { name: 'blazer.png', mimeType: 'image/png', buffer: PNG_OK });
  await page.waitForSelector('#rb-saw-panel', { timeout: 8000 });
  await page.waitForTimeout(2800);
  await page.click('#wa-saw-cta');
  await page.waitForTimeout(1800);
  const p = supaPosts[supaPosts.length - 1] || {};
  check('colour model · PGRST204 on colour_shade → one retry without the three columns, the row lands with its colour name',
    supaPosts.length === 2 && 'colour_shade' in supaPosts[0] && !('colour_shade' in p) && !('colour_extra' in p) && !('print' in p) && p.color === 'Cream' && p.category_l2 !== undefined,
    JSON.stringify(supaPosts.map((x) => Object.keys(x).filter((k) => /colour|print|color/.test(k)))));
  check('no page errors (colour model degrade)', errs.length === 0, errs.join(' | ').slice(0, 200));
  await ctx.close();
}

await browser.close();
server.kill();
const failed = results.filter((r) => !r.pass);
for (const r of results) console.log(`${r.pass ? '  ok ' : 'FAIL '} ${r.name}${r.pass ? '' : '  → ' + r.detail}`);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
