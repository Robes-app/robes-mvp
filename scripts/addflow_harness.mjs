// Wardrobe add/edit/refine harness — boots the real dashboard with Supabase
// + API stubs and asserts the 2026-08-05 redesign: fast add (one confirm
// screen), progressive disclosure (details / tags-and-notes), custom
// taxonomy pickers (no native selects), single-swatch colour + popover, the
// two tag axes, the browse cascade + trail row, the slim Refine panel and
// the edit modal riding the same form. Supersedes the 2026-07-29 reveal
// harness (the reveal itself survives: tag pops + 4-row ledger).
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

async function boot(browser, tagBody, opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1280, height: 1100 } });
  const page = await ctx.newPage();
  const supaPosts = [];
  const supaPatches = [];
  const inboxPatches = [];
  const profilePatches = [];
  const urlReads = [];
  let inboxRows = (opts.inbox || []).map((r) => ({ ...r }));
  await page.route('**cdn.jsdelivr.net/**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/javascript', body: SUPA_STUB }));
  await page.route('**ayowpaknssulsqqvwpqx.supabase.co/**', (r) => {
    const req = r.request();
    if (req.url().includes('wardrobe_inbox')) {
      if (req.method() === 'PATCH') {
        const body = JSON.parse(req.postData() || '{}');
        inboxPatches.push({ url: req.url(), body });
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
        supaPosts.push(JSON.parse(req.postData() || '{}'));
        return r.fulfill({ status: 201, contentType: 'application/json',
          body: JSON.stringify([{ id: 'new-1', ...JSON.parse(req.postData() || '{}') }]) });
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
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2600);
  return { ctx, page, errs, supaPosts, supaPatches, inboxPatches, profilePatches, urlReads };
}

const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});

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
    rows: document.querySelectorAll('#rb-saw-read .rb-saw-row').length,
    reading: Array.from(document.querySelectorAll('#rb-saw-read .rb-saw-val')).filter((v) => v.textContent === 'Reading').length,
    photo: !!document.getElementById('wa-saw-photo')?.src,
    fields: !!document.getElementById('wa-saw-label'),
    cta: document.getElementById('wa-saw-cta')?.textContent || '',
    fit: getComputedStyle(document.getElementById('wa-saw-photo')).objectFit,
  }));
  check('summary · tag pops on the photo (no fit tags)', early.tags === 3, String(early.tags));
  check('summary · label banner', early.banner === 'Cream wool blazer', early.banner);
  check('summary · four read-only ledger rows', early.rows === 4, String(early.rows));
  check('summary · ledger starts as Reading', early.reading === 4, String(early.reading));
  check('summary · read-only (no form fields on screen)', !early.fields);
  check('summary · photo contained + CTA present', early.photo && early.fit === 'contain' && /Add to wardrobe/.test(early.cta), early.cta);

  await page.waitForTimeout(2600);
  const settled = await page.evaluate(() => ({
    vals: Array.from(document.querySelectorAll('#rb-saw-read .rb-saw-val')).map((v) => v.textContent.trim()),
    dot: !!document.querySelector('#rb-saw-read .rb-saw-dot'),
  }));
  check('summary · ledger reveals piece/brand/category/colour',
    JSON.stringify(settled.vals) === JSON.stringify(['Cream wool blazer', 'Zara', 'Outerwear', 'Cream']),
    JSON.stringify(settled.vals));
  check('summary · colour row carries its swatch dot', settled.dot);

  await page.click('button.rb-saw-toggle:has-text("Edit the details")');
  const det = await page.evaluate(() => ({
    head: !!document.querySelector('.rb-wf-head'),
    title: document.querySelector('.rb-wf-title')?.textContent || '',
    label: document.getElementById('wa-saw-label')?.value || '',
    brand: document.getElementById('wa-saw-brand')?.value || '',
    catTag: document.getElementById('wa-saw-cat')?.tagName || '',
    cat: document.querySelector('#wa-saw-cat span')?.textContent || '',
    colName: document.querySelector('.rb-wf-colname')?.textContent || '',
    change: !!document.querySelector('.rb-wf-change'),
    swatchWall: document.querySelectorAll('#wa-modal .rb-wapop-sw').length,
    fitPills: !!document.getElementById('rb-fit-pills'),
    hide: Array.from(document.querySelectorAll('button.rb-saw-toggle')).some((b) => /Hide the details/.test(b.textContent)),
    tagsRow: Array.from(document.querySelectorAll('button.rb-saw-toggle')).some((b) => /Add tags and notes/.test(b.textContent)),
  }));
  check('details · compact header replaces the big photo', det.head && det.title === 'Cream wool blazer', det.title);
  check('details · fields prefilled', det.label === 'Cream wool blazer' && det.brand === 'Zara' && det.cat === 'Outerwear',
    `${det.label}|${det.brand}|${det.cat}`);
  check('details · category is a custom picker, not a select', det.catTag === 'BUTTON', det.catTag);
  check('details · colour is one swatch + Change (no wall)', det.colName === 'Cream' && det.change && det.swatchWall === 0,
    `${det.colName}|${det.swatchWall}`);
  check('details · silhouette & fit cut from the flow', !det.fitPills);
  check('details · Hide-details + tags-and-notes rows', det.hide && det.tagsRow);

  // Colour popover
  await page.click('.rb-wf-change');
  const pop = await page.evaluate(() => ({
    open: !!document.getElementById('rb-wa-pop'),
    sw: document.querySelectorAll('#rb-wa-pop .rb-wapop-sw').length,
  }));
  check('colour · popover opens with the full palette', pop.open && pop.sw === 21, String(pop.sw));
  await page.click('#rb-wa-pop .rb-wapop-sw[data-v="Navy"]');
  const picked = await page.evaluate(() => ({
    closed: !document.getElementById('rb-wa-pop'),
    name: document.querySelector('.rb-wf-colname')?.textContent || '',
  }));
  check('colour · pick applies + closes', picked.closed && picked.name === 'Navy', picked.name);

  // Edit the name, return to the summary — repaint must carry it
  await page.fill('#wa-saw-label', 'Ivory wool blazer');
  await page.click('button.rb-saw-toggle:has-text("Hide the details")');
  const back = await page.evaluate(() => ({
    banner: document.querySelector('.rb-saw-banner')?.textContent || '',
    row0: document.querySelectorAll('#rb-saw-read .rb-saw-val')[0]?.textContent || '',
    row3: document.querySelectorAll('#rb-saw-read .rb-saw-val')[3]?.textContent.trim() || '',
  }));
  check('summary · edits survive the round trip', back.banner === 'Ivory wool blazer' && back.row0 === 'Ivory wool blazer' && back.row3 === 'Navy',
    JSON.stringify(back));

  // Ledger row tap opens the editor on that field
  await page.click('#rb-saw-read .rb-saw-row:nth-child(2)');
  const rowTap = await page.evaluate(() => ({
    details: !!document.getElementById('wa-saw-label'),
    focused: document.activeElement && document.activeElement.id === 'wa-saw-brand',
  }));
  check('summary · tapping a row opens the editor on that field', rowTap.details && rowTap.focused, JSON.stringify(rowTap));

  await page.click('#wa-saw-cta');
  await page.waitForTimeout(1800);
  check('save · wardrobe insert fired', supaPosts.length === 1, String(supaPosts.length));
  check('save · edited label + picked colour persisted', supaPosts[0] && supaPosts[0].label === 'Ivory wool blazer' && supaPosts[0].color === 'Navy',
    supaPosts[0] && `${supaPosts[0].label}|${supaPosts[0].color}`);
  check('save · legacy category carried', supaPosts[0] && supaPosts[0].category === 'Outerwear', supaPosts[0] && supaPosts[0].category);
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
    catRow: document.querySelectorAll('#rb-saw-read .rb-saw-val')[2]?.textContent || '',
  }));
  check('tax · L1/L2/L3 all pop as tags', sumTags.tags.includes('Bottoms') && sumTags.tags.includes('Jeans') && sumTags.tags.includes('Skinny jeans'),
    sumTags.tags.join('|'));
  check('tax · ledger Category shows the sheet L1', sumTags.catRow === 'Bottoms', sumTags.catRow);

  await page.click('button.rb-saw-toggle:has-text("Edit the details")');
  const pre = await page.evaluate(() => ({
    cat: document.querySelector('#wa-saw-cat span')?.textContent || '',
    l2: document.querySelector('#wa-saw-l2 span')?.textContent || '',
    l3: document.querySelector('#wa-saw-l3 span')?.textContent || '',
  }));
  check('tax · cascade fields prefilled from analyse', pre.cat === 'Bottoms' && pre.l2 === 'Jeans' && pre.l3 === 'Skinny jeans',
    `${pre.cat}|${pre.l2}|${pre.l3}`);

  await page.click('#wa-saw-cat');
  const catList = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#rb-wa-pop .rb-wapop-row span:first-child')).map((s) => s.textContent));
  check('tax · category picker lists the sheet L1s', catList.includes('Knitwear') && catList.includes('Tailoring & suiting') && catList.includes('Jewellery'),
    catList.join('|').slice(0, 120));
  await page.click('#rb-wa-pop .rb-wapop-row:has-text("Knitwear")');
  const reset = await page.evaluate(() => ({
    l2: document.querySelector('#wa-saw-l2 span')?.textContent || '',
    l3off: document.getElementById('wa-saw-l3')?.disabled,
  }));
  check('tax · L1 change resets the pair, L3 waits on L2', reset.l2 === 'Choose' && reset.l3off === true, JSON.stringify(reset));
  await page.click('#wa-saw-l2');
  await page.click('#rb-wa-pop .rb-wapop-row:has-text("Cardigans")');
  await page.click('#wa-saw-l3');
  await page.click('#rb-wa-pop .rb-wapop-row:has-text("Cardigan coat / coatigan")');
  const refiled = await page.evaluate(() => ({
    l2: document.querySelector('#wa-saw-l2 span')?.textContent || '',
    l3: document.querySelector('#wa-saw-l3 span')?.textContent || '',
    meta: document.querySelector('.rb-wf-meta')?.textContent || '',
  }));
  check('tax · re-filed through the pickers', refiled.l2 === 'Cardigans' && refiled.l3 === 'Cardigan coat / coatigan', JSON.stringify(refiled));
  check('tax · header meta tracks the re-filing', /Knitwear/.test(refiled.meta) && /coatigan/.test(refiled.meta), refiled.meta);

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
  await page.click('button.rb-saw-toggle:has-text("Edit the details")');
  await page.click('button.rb-saw-toggle:has-text("Add tags and notes")');
  const axes = await page.evaluate(() => ({
    sea: Array.from(document.querySelectorAll('.rb-wf-chip.sea')).map((c) => c.textContent),
    ctx: Array.from(document.querySelectorAll('.rb-wf-chip.ctx:not(.add)')).map((c) => c.textContent),
    on: Array.from(document.querySelectorAll('.rb-wf-chip.on')).map((c) => c.textContent),
    add: !!document.querySelector('.rb-wf-chip.add'),
    notes: !!document.getElementById('wa-saw-notes'),
    hide: Array.from(document.querySelectorAll('button.rb-saw-toggle')).some((b) => /Hide tags and notes/.test(b.textContent)),
    editLink: !!document.querySelector('.rb-wf-headact'),
  }));
  // Three bands, one tap (ADR-002 §1) — picking both bands IS year-round.
  check('tags · Season is the three-band axis',
    axes.sea.join('|') === 'Spring/Summer|Autumn/Winter|Year-round', axes.sea.join('|'));
  // The seven shared seeds, in vocabulary order, from the namespace.
  check('tags · Wear it for renders the seven shared seeds',
    axes.ctx.join('|') === 'Everyday|Work|Evening|Occasion|Travel|Active|Lounge', axes.ctx.join('|'));
  // The form PREVIEWS the pre-fill rather than opening blank: an Outerwear
  // piece shows Autumn/Winter + Everyday already filed, hers to correct.
  // Computed at paint, so it cannot race the taxonomy fetch.
  check('tags · the form previews what Robes will file',
    axes.on.join('|') === 'Autumn/Winter|Everyday', axes.on.join('|'));
  check('tags · custom tag door + notes + hide row + header Edit link', axes.add && axes.notes && axes.hide && axes.editLink);

  await page.click('.rb-wf-chip.sea:has-text("Spring/Summer")');
  await page.click('.rb-wf-chip.ctx:has-text("Travel")');
  await page.click('.rb-wf-chip.add');
  await page.fill('#rb-wf-tagin', 'Skiing');
  await page.press('#rb-wf-tagin', 'Enter');
  const tagged = await page.evaluate(() => ({
    on: Array.from(document.querySelectorAll('.rb-wf-chip.on')).map((c) => c.textContent),
  }));
  check('tags · picks + custom tag land selected',
    tagged.on.includes('Spring/Summer') && tagged.on.includes('Travel') && tagged.on.includes('Skiing'),
    tagged.on.join('|'));
  // Single-select: picking a band replaces the previous one rather than
  // adding to it, so Year-round drops off.
  check('tags · the band is single-select', !tagged.on.includes('Year-round'), tagged.on.join('|'));
  // Wear it for is UNCAPPED and may be emptied — 'everyday' is a real tag
  // now, not a floor the axis snaps back to.
  await page.click('.rb-wf-chip.ctx:has-text("Travel")');
  await page.click('.rb-wf-chip.ctx:has-text("Skiing")');
  await page.click('.rb-wf-chip.ctx:has-text("Everyday")');
  const emptied = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.rb-wf-chip.ctx.on')).map((c) => c.textContent));
  check('tags · Wear it for can be emptied, nothing snaps back', emptied.length === 0, emptied.join('|'));
  await page.click('.rb-wf-chip.ctx:has-text("Travel")');
  await page.click('.rb-wf-chip.ctx:has-text("Skiing")');
  await page.fill('#wa-saw-notes', 'Wear with the navy suit.');
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
    label: document.getElementById('wa-saw-label')?.value || '',
    labelPh: document.getElementById('wa-saw-label')?.placeholder || '',
    cat: document.querySelector('#wa-saw-cat span')?.textContent || '',
    colName: document.querySelector('.rb-wf-colname')?.textContent || '',
  }));
  check('manual · same anatomy, empty photo slot', /Add a piece/.test(manual.heading) && manual.slot, manual.heading);
  check('manual · empty fields with placeholders', manual.label === '' && manual.labelPh === 'Name the piece'
    && manual.cat === 'Choose' && manual.colName === 'Pick a colour', JSON.stringify(manual));

  // name guard fires before an empty save
  await page.click('#wa-saw-cta');
  const guard = await page.evaluate(() => document.getElementById('wa-saw-namehint')?.textContent || '');
  check('manual · name guard fires', /name/.test(guard), guard);

  await page.fill('#wa-saw-label', 'Linen shirt');
  await page.click('#wa-saw-cat');
  await page.click('#rb-wa-pop .rb-wapop-row:has-text("Tops")');
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
  await page.fill('#wa-saw-label', 'Photographed shirt');
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
    ledger: !!document.getElementById('rb-saw-read'),
    editorOpen: !!document.getElementById('wa-saw-label'),
    sub: document.querySelector('#wa-modal .fm-step p')?.textContent || '',
    photo: !!document.querySelector('.rb-wf-photo img'),
  }));
  check('unreadable · no summary theatre, editor open', !u.ledger && u.editorOpen);
  check('unreadable · give-it-a-name copy + photo kept', /couldn’t quite read|couldn't quite read/.test(u.sub) && u.photo, u.sub);
  await page.click('#wa-saw-cta');
  const guard = await page.evaluate(() => document.getElementById('wa-saw-namehint')?.textContent || '');
  check('unreadable · name guard fires', /name/.test(guard), guard);
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
      door: sn?.querySelector('.rb-lk-filldoor')?.textContent || null,
    };
  });
  check('brief · the second blazer matched nothing open and filed normally (two inserts, the shoes still borrowed)', supaPosts.length === 2 && end.props === 1 && end.pieces === 2, JSON.stringify(end));
  // The batch door on the look is the swap zone's Swap pill since 2026-09-21.
  check('brief · the batch done, the modal closes and the look she dressed opens, its swap zone offering Swap', end.modal === false && end.sn && end.title && end.door === 'Swap', JSON.stringify(end));
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

// ── Edit modal rides the same form ─────────────────────────────────────
{
  const { ctx, page, errs, supaPatches } = await boot(browser, TAG, { rows: ROWS });
  await page.evaluate(() => window.App && App.showWardrobe());
  await page.waitForTimeout(600);
  await page.evaluate(() => window.__wtrkEdit('row-1'));
  await page.waitForTimeout(500);
  const ed = await page.evaluate(() => ({
    label: document.getElementById('wa-saw-label')?.value || '',
    brand: document.getElementById('wa-saw-brand')?.value || '',
    cat: document.querySelector('#wa-saw-cat span')?.textContent || '',
    l2: document.querySelector('#wa-saw-l2 span')?.textContent || '',
    l3: document.querySelector('#wa-saw-l3 span')?.textContent || '',
    colName: document.querySelector('.rb-wf-colname')?.textContent || '',
    cta: document.getElementById('wa-saw-cta')?.textContent || '',
    del: !!document.querySelector('.rb-wf-del'),
  }));
  check('edit · same form, prefilled from the row', ed.label === 'Blue skinny jeans' && ed.brand === 'Levi’s'
    && ed.cat === 'Bottoms' && ed.l2 === 'Jeans' && ed.l3 === 'Skinny jeans' && ed.colName === 'Navy', JSON.stringify(ed));
  check('edit · Update CTA + delete row', /Update piece/.test(ed.cta) && ed.del, ed.cta);

  await page.click('button.rb-saw-toggle:has-text("Add tags and notes")');
  const edTags = await page.evaluate(() => ({
    on: Array.from(document.querySelectorAll('.rb-wf-chip.on')).map((c) => c.textContent),
    everyday: Array.from(document.querySelectorAll('.rb-wf-chip')).some((c) => c.textContent === 'Everyday'),
  }));
  // ADR-002: 'Everyday' is a real seed now, not a displayed-only default,
  // so a piece tagged Everyday + Travel shows BOTH selected. The band comes
  // from season_band rather than being derived from the seasons array.
  check('edit · band and every wear tag prefill from the row',
    edTags.on.includes('Spring/Summer') && edTags.on.includes('Travel')
    && edTags.on.includes('Everyday') && !edTags.on.includes('Year-round'),
    edTags.on.join('|'));
  await page.click('#wa-saw-cta');
  await page.waitForTimeout(1500);
  const patch = supaPatches[0] || {};
  check('edit · PATCH targets the row', /row-1/.test(patch.url || ''), patch.url);
  // An untouched edit re-files the band it already had, and still does not
  // claim she set it — season_source only appears when she taps the chip.
  // Wear tags never ride the piece payload; they go to the shared namespace.
  check('edit · band re-filed, provenance not overclaimed, no legacy arrays',
    patch.body && patch.body.season_band === 'spring_summer'
      && !('season_source' in patch.body)
      && !('seasons' in patch.body) && !('occasions' in patch.body),
    JSON.stringify(patch.body && [patch.body.season_band, patch.body.season_source]));
  check('edit · price re-filed as the row holds it; the pass-through columns untouched by the PATCH',
    patch.body && 'price' in patch.body && patch.body.price === null && !('hero_position' in patch.body) && !('sentiment' in patch.body), JSON.stringify(patch.body && [patch.body.price, patch.body.size]));

  // An untagged piece shows both defaults selected — the Refine behaviour
  // reads back from the piece level.
  await page.waitForTimeout(400);
  await page.evaluate(() => window.__wtrkEdit('row-2'));
  await page.waitForTimeout(500);
  await page.click('button.rb-saw-toggle:has-text("Add tags and notes")');
  const unt = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.rb-wf-chip.on')).map((c) => c.textContent));
  check('edit · untagged piece shows Year-round + Everyday selected', unt.join('|') === 'Year-round|Everyday', unt.join('|'));
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
    add: document.getElementById('rb-add-pill')?.textContent || '',
    refine: !!document.getElementById('rb-refine-pill'),
    pack: !!document.querySelector('.wg-pack-pill'),
    fab: !!document.getElementById('rb-wa-fab'),
    starOpacity: (() => { const s = document.querySelector('.rb-star'); return s ? getComputedStyle(s).opacity : ''; })(),
  }));
  check('browse · sheet-L1 tabs + trail row with count', base.tabs.includes('Knitwear') && base.trail && base.count === '3 pieces', base.count);
  check('browse · Add piece + Refine live in the trail', /Add piece/.test(base.add) && base.refine, base.add);
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
  check('refine · full palette, no wheel', ref.sw === 21 && !ref.wheel, String(ref.sw));
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
  await page.click('#rb-refine .rb-sw[aria-label="Navy"]');
  await page.waitForTimeout(200);
  const refFiltered = await page.evaluate(() => ({
    note: document.querySelector('.rb-ref-note')?.textContent || '',
    grid: document.querySelectorAll('#wg-grid .wg-item:not(.rb-add-card):not(.rb-ghost-card)').length,
  }));
  check('refine · colour pick filters + names itself', refFiltered.note === 'Navy selected' && refFiltered.grid === 1, JSON.stringify(refFiltered));
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
    ways: Array.from(document.querySelectorAll('.rb-wf-way')).map((b) => b.dataset.way + ':' + b.querySelector('.rb-wf-way-t').textContent + (b.classList.contains('dashed') ? '*' : '')),
    file: !!document.getElementById('wa-rb-file'),
    fills: Array.from(document.querySelectorAll('#wa-modal .fm-step button')).filter((b) => getComputedStyle(b).backgroundColor === 'rgb(32, 32, 33)').length,
  }));
  check('ways · __waAddChooser opens the chooser: Photograph it / Forward a receipt / Paste a link + the dashed Add without a photo, no ink fill',
    ch.h === 'Add a piece.' && ch.ways.join('|') === 'photo:Photograph it|mail:Forward a receipt|url:Paste a link|manual:Add without a photo*' && ch.fills === 0, JSON.stringify(ch));
  await page.click('.rb-wf-way[data-way="photo"]');
  await page.waitForTimeout(300);
  const ph = await page.evaluate(() => ({ h: document.querySelector('#wa-modal .fm-h')?.textContent || '', file: !!document.getElementById('wa-rb-file'), cam: !!document.getElementById('wa-rb-cam'), back: document.querySelector('.rb-wf-back')?.textContent || '', nophoto: !!document.querySelector('.rb-wf-nophoto') }));
  check('ways · Photograph it is the photo step with "← Other ways in" in place of the no-photo link', ph.h === 'Add your pieces.' && ph.file && ph.cam && ph.back === '← Other ways in' && !ph.nophoto, JSON.stringify(ph));
  await page.click('.rb-wf-back');
  await page.waitForTimeout(300);
  check('ways · Other ways in returns to the chooser', (await page.evaluate(() => document.querySelectorAll('.rb-wf-way').length)) === 4);
  await page.click('.rb-wf-way[data-way="manual"]');
  await page.waitForTimeout(300);
  check('ways · Add without a photo opens the empty editor', await page.evaluate(() => /Add a piece/.test(document.querySelector('#wa-modal .fm-h')?.textContent || '') && !!document.querySelector('.rb-wf-slot') && !!document.getElementById('wa-saw-label')));

  // Paste a link → reading → the confirm screen, filled from the page.
  await page.evaluate(() => window.__waWay('choose'));
  await page.click('.rb-wf-way[data-way="url"]');
  await page.waitForTimeout(300);
  const u0 = await page.evaluate(() => ({ h: document.querySelector('#wa-modal .fm-h')?.textContent || '', input: !!document.getElementById('rb-wf-url'), go: document.getElementById('rb-wf-urlgo')?.textContent || '', focused: document.activeElement?.id }));
  check('link · the step is an input + Read it, focused', u0.h === 'From a link.' && u0.input && u0.go === 'Read it' && u0.focused === 'rb-wf-url', JSON.stringify(u0));
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
    vals: Array.from(document.querySelectorAll('#rb-saw-read .rb-saw-val')).map((v) => v.textContent),
  }));
  check('link · lands on "Here’s what Robes saw." read from the page, the page image on the panel, the retake reading Another link',
    /what Robes/.test(u1.h) && /Read from the page/.test(u1.sub) && u1.photo === URL_PIECE.image_url && u1.retake === '↺ Another link' && urlReads[0]?.url === 'https://shop.example.com/p/1', JSON.stringify(u1));
  await page.waitForTimeout(2200);
  await page.click('button.rb-saw-toggle:has-text("Edit the details")');
  await page.waitForTimeout(300);
  const u2 = await page.evaluate(() => ({ meta: document.querySelector('.rb-wf-meta')?.textContent || '', hint: document.querySelector('.rb-saw-toggle .hint')?.textContent || '' }));
  check('link · the header meta carries the price and size; the tags hint counts them', /£340/.test(u2.meta) && /Size 38/.test(u2.meta) && /2 set/.test(u2.hint), JSON.stringify(u2));
  await page.click('button.rb-saw-toggle:has-text("Add tags and notes")');
  await page.waitForTimeout(300);
  const u3 = await page.evaluate(() => ({ price: document.getElementById('wa-saw-price')?.value, size: document.getElementById('wa-saw-size')?.value, note: document.querySelector('.rb-wf-price .note')?.textContent || '', order: Array.from(document.querySelectorAll('#wa-modal .rb-wf-lbl')).map((l) => l.textContent) }));
  check('link · Price and Size sit under Tags, before Notes, prefilled', u3.price === '£340' && u3.size === '38' && /Both optional/.test(u3.note) && u3.order.join('|') === 'Season|Wear it for|Price|Size|Notes', JSON.stringify(u3));
  await page.fill('#wa-saw-size', 'UK 5');
  await page.click('#wa-saw-cta');
  await page.waitForTimeout(1200);
  const post = supaPosts[0] || {};
  check('link · the save carries the hosted image, price 340 GBP and the corrected size', post.image_url === URL_PIECE.image_url && post.price === 340 && post.currency === 'GBP' && post.size === 'UK 5' && post.category_l2 === 'Trainers' && post.item_dna?.source?.kind === 'url', JSON.stringify([post.image_url, post.price, post.currency, post.size, post.category_l2]));

  // Forward a receipt: her address is minted on first open, copyable.
  await page.evaluate(() => window.WA && WA.open({ way: 'mail' }));
  await page.waitForTimeout(700);
  const m1 = await page.evaluate(() => ({ h: document.querySelector('#wa-modal .fm-h')?.textContent || '', addr: document.getElementById('rb-wf-addr')?.textContent || '', copy: document.getElementById('rb-wf-copy')?.disabled, steps: document.querySelectorAll('.rb-wf-step').length, got: !!document.querySelector('.rb-wf-cta.sm') }));
  check('mail · the address panel: annie-xxxx@in.byrobes.com minted onto her profile, Copy live, three steps, Got it',
    m1.h === 'Your own address.' && /^annie-[a-z2-9]{4}@in\.byrobes\.com$/.test(m1.addr) && m1.copy === false && m1.steps === 3 && m1.got
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
  const n = await page.evaluate(() => ({ label: document.getElementById('wa-saw-label')?.value, head: document.querySelector('.rb-wf-headact')?.textContent || '', thumbEmpty: !!document.querySelector('.rb-wf-thumb.empty'), hide: Array.from(document.querySelectorAll("button.rb-saw-toggle")).some((b) => /Hide the details/.test(b.textContent)), photoIn: !!document.getElementById('rb-wf-photoin'), panel: !!document.getElementById('rb-saw-panel') }));
  check('link · no page image → the editor, prefilled, "Add a photo" in the head, no reveal panel', n.label === 'Leather trainers' && n.head === 'Add a photo' && n.thumbEmpty && !n.panel && n.photoIn, JSON.stringify(n));
  await page.setInputFiles('#rb-wf-photoin', { name: 'p.png', mimeType: 'image/png', buffer: PNG_OK });
  await page.waitForTimeout(500);
  check('link · Add a photo attaches straight in (no re-scan)', await page.evaluate(() => !!document.querySelector('.rb-wf-thumb img')?.src && !document.querySelector('.rb-wf-thumb.empty')));
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
  check('receipts · the wardrobe notice under the trail: "Robes read two receipts · 4 pieces are waiting for you to look over · Review them →"',
    n1.on && n1.h === 'Robes read two receipts' && n1.s === '4 pieces are waiting for you to look over' && n1.go === 'Review them →' && n1.afterTrail, JSON.stringify(n1));
  check('receipts · the add card names the three doors', n1.addCard === 'Photograph · Receipt · Link', n1.addCard);
  await page.click('#rb-wg-inbox .rb-wg-inbox-go');
  await page.waitForTimeout(500);
  const l1 = await page.evaluate(() => ({ h: document.querySelector('#wa-modal .fm-h')?.textContent || '', rows: Array.from(document.querySelectorAll('.rb-wf-rcpt')).map((b) => b.querySelector('.t').textContent + ' / ' + b.querySelector('.s').textContent) }));
  check('receipts · Review them opens the held list, newest first, each dated with its count',
    l1.h === 'Four pieces read.' && l1.rows.length === 2 && /^NET-A-PORTER \/ (This morning|Today) · 3 pieces read$/.test(l1.rows[0]) && l1.rows[1] === 'Sézane / Yesterday · 1 piece read', JSON.stringify(l1));
  await page.click('.rb-wf-rcpt[data-id="rc-1"]');
  await page.waitForTimeout(300);
  const r1 = await page.evaluate(() => ({
    ey: document.querySelector('.rb-wf-eyebrow')?.textContent || '', h: document.querySelector('#wa-modal .fm-h')?.textContent || '',
    rows: Array.from(document.querySelectorAll('.rb-wf-rev')).map((b) => (b.classList.contains('on') ? '✓' : '·') + b.querySelector('.t').textContent + ' / ' + b.querySelector('.s').textContent),
    thumb: !!document.querySelector('.rb-wf-rev[data-i="0"] .th img'), mono: document.querySelector('.rb-wf-rev[data-i="1"] .th')?.textContent || '',
    chosen: document.getElementById('rb-wf-chosen')?.textContent || '', file: document.getElementById('rb-wf-file')?.textContent || '',
  }));
  check('receipts · the review: three rows, price · size, the returned tank unticked, the image on the first, a monogram on the second, "File 2 pieces"',
    r1.ey === 'From NET-A-PORTER' && r1.h === 'Three pieces read.' && r1.rows.join('|') === '✓Leather trainers / £340 · Size 38|✓Leather tote / £320 · Size One size|·Ribbed cotton tank / £39 · Size S · × 2'
      && r1.thumb && r1.mono === 'L' && /^2 pieces chosen/.test(r1.chosen) && r1.file === 'File 2 pieces', JSON.stringify(r1));
  await page.click('.rb-wf-rev[data-i="1"]');
  await page.waitForTimeout(200);
  check('receipts · unticking a row moves the count', (await page.evaluate(() => document.getElementById('rb-wf-file')?.textContent)) === 'File 1 piece');
  await page.click('.rb-wf-rev[data-i="1"]');
  await page.click('#rb-wf-file');
  await page.waitForTimeout(1500);
  const f1 = await page.evaluate(() => ({ h: document.querySelector('#wa-modal .fm-h')?.textContent || '', open: !!document.querySelector('#wa-modal.open'), rows: document.querySelectorAll('.rb-wf-rcpt').length, notice: document.getElementById('rb-wg-inbox')?.querySelector('.h')?.textContent || '' }));
  check('receipts · File 2 pieces inserts the two ticked rows with their price, size and source, and moves the receipt to filed',
    supaPosts.length === 2 && supaPosts[0].label === 'Leather trainers' && supaPosts[0].price === 340 && supaPosts[0].size === '38' && supaPosts[0].currency === 'GBP' && supaPosts[0].image_url === 'https://res.cloudinary.com/robes/trainers.jpg' && supaPosts[0].item_dna?.source?.kind === 'receipt'
      && supaPosts[1].label === 'Leather tote' && supaPosts[1].category_l2 === 'Everyday bags' && supaPosts[1].image_url === null
      && inboxPatches.length === 1 && /rc-1/.test(inboxPatches[0].url) && inboxPatches[0].body.status === 'filed' && Array.isArray(inboxPatches[0].body.filed_ids),
    JSON.stringify([supaPosts.map((p) => [p.label, p.price, p.size]), inboxPatches]));
  check('receipts · with one receipt still waiting the modal lands back on the list, and the notice counts down', f1.open && f1.h === 'One piece read.' && f1.rows === 1 && f1.notice === 'Robes read one receipt', JSON.stringify(f1));
  await page.click('.rb-wf-rcpt[data-id="rc-2"]');
  await page.waitForTimeout(200);
  await page.click('#rb-wf-chosen .rb-wf-back');
  await page.waitForTimeout(600);
  const d1 = await page.evaluate(() => ({ open: !!document.querySelector('#wa-modal.open'), notice: !!document.getElementById('rb-wg-inbox') }));
  check('receipts · Nothing to keep dismisses the last receipt, closes the modal and takes the notice down',
    !d1.open && !d1.notice && inboxPatches.length === 2 && inboxPatches[1].body.status === 'dismissed' && supaPosts.length === 2, JSON.stringify([d1, inboxPatches[1]]));
  check('no page errors (receipts)', errs.length === 0, errs.join(' | ').slice(0, 240));
  await ctx.close();
}

await browser.close();
server.kill();
const failed = results.filter((r) => !r.pass);
for (const r of results) console.log(`${r.pass ? '  ok ' : 'FAIL '} ${r.name}${r.pass ? '' : '  → ' + r.detail}`);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
