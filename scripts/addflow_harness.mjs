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

const ROWS = [
  { id: 'row-1', user_id: 'u-test', label: 'Blue skinny jeans', category: 'Bottoms', category_l2: 'Jeans', category_l3: 'Skinny jeans', color: 'Navy', brand: 'Levi’s', notes: '', image_url: null, times_worn: 2, item_dna: {}, seasons: ['Summer'], occasions: ['Everyday', 'Travel'], hero_position: 1, created_at: '2026-08-01' },
  { id: 'row-2', user_id: 'u-test', label: 'Wide-leg jeans', category: 'Bottoms', category_l2: 'Jeans', category_l3: 'Wide-leg jeans', color: 'Black', brand: 'Arket', notes: '', image_url: null, times_worn: 0, item_dna: {}, seasons: [], occasions: [], hero_position: null, created_at: '2026-08-02' },
  { id: 'row-3', user_id: 'u-test', label: 'White tee', category: 'Tops', category_l2: 'T-shirts & tees', category_l3: 'Classic crewneck tee', color: 'White', brand: 'Cos', notes: '', image_url: null, times_worn: 5, item_dna: {}, seasons: [], occasions: ['Work', 'Skiing'], hero_position: null, created_at: '2026-08-03' },
];

const results = [];
const check = (name, pass, detail = '') => results.push({ name, pass, detail });

async function boot(browser, tagBody, opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1280, height: 1100 } });
  const page = await ctx.newPage();
  const supaPosts = [];
  const supaPatches = [];
  await page.route('**cdn.jsdelivr.net/**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/javascript', body: SUPA_STUB }));
  await page.route('**ayowpaknssulsqqvwpqx.supabase.co/**', (r) => {
    const req = r.request();
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
  return { ctx, page, errs, supaPosts, supaPatches };
}

const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});

// ── Step 1 + happy path: scan → summary → details → save ───────────────
{
  const { ctx, page, errs, supaPosts } = await boot(browser, TAG);
  await page.evaluate(() => window.WA && WA.open());
  await page.waitForTimeout(400);

  const s1 = await page.evaluate(() => ({
    heading: document.querySelector('#wa-modal .fm-h')?.textContent || '',
    dropH: document.querySelector('.rb-wf-drop-h')?.textContent || '',
    btns: Array.from(document.querySelectorAll('.rb-wf-drop-btns .rb-wf-btn')).map((b) => b.textContent),
    link: !!document.querySelector('.rb-wf-linkrow input'),
    nophoto: document.querySelector('.rb-wf-nophoto')?.textContent || '',
    file: !!document.getElementById('wa-rb-file'),
    multiple: document.getElementById('wa-rb-file')?.multiple,
    capture: document.getElementById('wa-rb-file')?.hasAttribute('capture'),
  }));
  check('step1 · Add a piece heading', /Add a piece/.test(s1.heading), s1.heading);
  check('step1 · dropzone + both picker buttons', s1.dropH === 'Snap or attach the piece'
    && s1.btns.join('|') === 'Take a photo|Choose from library', s1.btns.join('|'));
  check('step1 · From-a-link field + Add-without-a-photo route', s1.link && s1.nophoto === 'Add without a photo', s1.nophoto);
  check('step1 · multi file input, never capture', s1.file && s1.multiple === true && s1.capture === false, String(s1.capture));

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
  check('save · retired columns left off the payload',
    supaPosts[0] && !('price' in supaPosts[0]) && !('fit_confidence' in supaPosts[0]) && !('sentiment' in supaPosts[0]) && !('hero_position' in supaPosts[0]));
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

// ── Tag axes: Season + Wear-it-for + custom tag → seasons/occasions ────
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
    add: !!document.querySelector('.rb-wf-chip.add'),
    notes: !!document.getElementById('wa-saw-notes'),
    hide: Array.from(document.querySelectorAll('button.rb-saw-toggle')).some((b) => /Hide tags and notes/.test(b.textContent)),
    editLink: !!document.querySelector('.rb-wf-headact'),
  }));
  check('tags · Season axis complete', axes.sea.join('|') === 'Spring|Summer|Autumn|Winter|Year-round', axes.sea.join('|'));
  check('tags · Context axis is the new vocabulary (no Everyday)',
    axes.ctx.join('|') === 'Work|Evening|Occasion|Travel|Active', axes.ctx.join('|'));
  check('tags · custom tag door + notes + hide row + header Edit link', axes.add && axes.notes && axes.hide && axes.editLink);

  await page.click('.rb-wf-chip.sea:has-text("Summer")');
  await page.click('.rb-wf-chip.ctx:has-text("Travel")');
  await page.click('.rb-wf-chip.add');
  await page.fill('#rb-wf-tagin', 'Skiing');
  await page.press('#rb-wf-tagin', 'Enter');
  const tagged = await page.evaluate(() => ({
    on: Array.from(document.querySelectorAll('.rb-wf-chip.on')).map((c) => c.textContent),
  }));
  check('tags · picks + custom tag land selected', tagged.on.includes('Summer') && tagged.on.includes('Travel') && tagged.on.includes('Skiing'),
    tagged.on.join('|'));
  await page.fill('#wa-saw-notes', 'Wear with the navy suit.');
  await page.click('#wa-saw-cta');
  await page.waitForTimeout(1800);
  const p = supaPosts[0] || {};
  check('tags · seasons/occasions filed on their own axes',
    JSON.stringify(p.seasons) === JSON.stringify(['Summer']) && JSON.stringify(p.occasions) === JSON.stringify(['Travel', 'Skiing']),
    JSON.stringify([p.seasons, p.occasions]));
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
  check('edit · saved axes prefill, Everyday retired', edTags.on.includes('Summer') && edTags.on.includes('Travel') && !edTags.everyday,
    edTags.on.join('|'));
  await page.click('#wa-saw-cta');
  await page.waitForTimeout(1500);
  const patch = supaPatches[0] || {};
  check('edit · PATCH targets the row', /row-1/.test(patch.url || ''), patch.url);
  check('edit · axes re-filed without Everyday',
    patch.body && JSON.stringify(patch.body.seasons) === JSON.stringify(['Summer']) && JSON.stringify(patch.body.occasions) === JSON.stringify(['Travel']),
    JSON.stringify(patch.body && [patch.body.seasons, patch.body.occasions]));
  check('edit · pass-through columns untouched by the PATCH',
    patch.body && !('price' in patch.body) && !('hero_position' in patch.body) && !('sentiment' in patch.body));
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
  check('refine · wear chips = Everyday + vocabulary + owned free tags',
    ref.wear.join('|') === 'Everyday|Work|Evening|Occasion|Travel|Active|Skiing', ref.wear.join('|'));
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
    back: document.querySelector('#rb-wg-cascade .cas-back')?.textContent || '',
    title: document.querySelector('#rb-wg-cascade .cas-title')?.textContent || '',
    cta: document.querySelector('#rb-wg-cascade .cas-cta')?.textContent || '',
  }));
  check('mobile · level 2 drills with back + Show-N CTA', /Bottoms/.test(m2.back) && m2.title === 'Jeans' && /Show 2 pieces/.test(m2.cta),
    JSON.stringify(m2));
  await page.click('#rb-wg-cascade .cas-cta');
  await page.waitForTimeout(200);
  const m3 = await page.evaluate(() => !document.getElementById('rb-wg-cascade'));
  check('mobile · CTA closes the sheet', m3);
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
  check('no page errors (mobile)', errs.length === 0, errs.join(' | ').slice(0, 200));
  await ctx.close();
}

await browser.close();
server.kill();
const failed = results.filter((r) => !r.pass);
for (const r of results) console.log(`${r.pass ? '  ok ' : 'FAIL '} ${r.name}${r.pass ? '' : '  → ' + r.detail}`);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
