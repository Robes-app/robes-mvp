// Wardrobe add-flow harness — boots the real dashboard with Supabase + API
// stubs and asserts the reveal-first logging experience (2026-07-29 rework):
// scan → tag pops + ledger reveal → collapsed details editor → save, plus the
// unreadable-piece and batch paths.
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
const PNG = Buffer.from(
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

const results = [];
const check = (name, pass, detail = '') => results.push({ name, pass, detail });

async function boot(browser, tagBody) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1100 } });
  const page = await ctx.newPage();
  const supaPosts = [];
  await page.route('**cdn.jsdelivr.net/**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/javascript', body: SUPA_STUB }));
  await page.route('**ayowpaknssulsqqvwpqx.supabase.co/**', (r) => {
    const req = r.request();
    if (req.method() === 'POST' && req.url().includes('wardrobe_items')) {
      supaPosts.push(JSON.parse(req.postData() || '{}'));
      return r.fulfill({ status: 201, contentType: 'application/json',
        body: JSON.stringify([{ id: 'new-1', ...JSON.parse(req.postData() || '{}') }]) });
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
  return { ctx, page, errs, supaPosts };
}

const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});

// ── Happy path: scan → reveal → collapsed editor → save ────────────────
{
  const { ctx, page, errs, supaPosts } = await boot(browser, TAG);
  await page.evaluate(() => window.WA && WA.open());
  await page.waitForTimeout(400);
  await page.setInputFiles('#wa-rb-file', { name: 'blazer.png', mimeType: 'image/png', buffer: PNG });

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
    collapsed: document.getElementById('rb-saw-edit')?.style.display === 'none',
    photo: !!document.getElementById('wa-saw-photo')?.src,
    cta: document.getElementById('wa-saw-cta')?.textContent || '',
  }));
  check('step3 · four tags pop on the photo', early.tags === 4, String(early.tags));
  check('step3 · label banner on the photo', early.banner === 'Cream wool blazer', early.banner);
  check('step3 · five ledger rows', early.rows === 5, String(early.rows));
  check('step3 · ledger starts as Reading', early.reading === 5, String(early.reading));
  check('step3 · details collapsed by default', early.collapsed);
  check('step3 · photo set', early.photo);
  check('step3 · CTA present', /ADD TO WARDROBE/.test(early.cta), early.cta);

  await page.waitForTimeout(2800);
  const settled = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#rb-saw-read .rb-saw-val')).map((v) => v.textContent));
  check('step3 · ledger reveals all five values',
    JSON.stringify(settled) === JSON.stringify(['Cream wool blazer', 'Outerwear', 'Zara', 'Alabaster', 'Relaxed · Single-breasted']),
    JSON.stringify(settled));

  await page.click('#rb-saw-toggle');
  const open = await page.evaluate(() => ({
    visible: document.getElementById('rb-saw-edit')?.style.display !== 'none',
    label: document.getElementById('wa-saw-label')?.value || '',
    cat: document.getElementById('wa-saw-cat')?.value || '',
    brand: document.getElementById('wa-saw-brand')?.value || '',
    swatches: document.querySelectorAll('#rb-saw-edit button[aria-label]').length,
    pills: document.querySelectorAll('#rb-fit-pills span').length,
    detailHost: !!document.getElementById('rb-wa-detail-host'),
    toggleTxt: document.querySelector('#rb-saw-toggle span')?.textContent || '',
  }));
  check('expand · editor opens', open.visible);
  check('expand · fields pre-filled', open.label === 'Cream wool blazer' && open.cat === 'Outerwear' && open.brand === 'Zara',
    `${open.label}|${open.cat}|${open.brand}`);
  check('expand · full swatch set present', open.swatches === 21, String(open.swatches));
  check('expand · fit pills present', open.pills === 3, String(open.pills));
  check('expand · progressive-capture host inside editor', open.detailHost);
  check('expand · toggle flips label', open.toggleTxt === 'Hide the details', open.toggleTxt);

  await page.fill('#wa-saw-label', 'Ivory wool blazer');
  const synced = await page.evaluate(() => ({
    row: document.querySelectorAll('#rb-saw-read .rb-saw-val')[0]?.textContent,
    banner: document.querySelector('.rb-saw-banner')?.textContent,
  }));
  check('sync · edit updates ledger + banner', synced.row === 'Ivory wool blazer' && synced.banner === 'Ivory wool blazer',
    JSON.stringify(synced));

  await page.click('#wa-saw-cta');
  await page.waitForTimeout(1800);
  check('save · wardrobe insert fired', supaPosts.length === 1, String(supaPosts.length));
  check('save · edited label persisted', supaPosts[0] && supaPosts[0].label === 'Ivory wool blazer',
    supaPosts[0] && supaPosts[0].label);
  check('save · category/colour carried', supaPosts[0] && supaPosts[0].category === 'Outerwear' && supaPosts[0].color === 'Cream',
    supaPosts[0] && `${supaPosts[0].category}|${supaPosts[0].color}`);
  check('no page errors (happy path)', errs.length === 0, errs.join(' | ').slice(0, 200));
  await ctx.close();
}

// ── Unreadable piece: no theatre, editor open, name guard ──────────────
{
  const { ctx, page, errs } = await boot(browser, {
    label: '', category: 'Other', color: '', brand: '', notes: '',
    item_dna: { display: {}, structural_dna: { silhouette_fit: [] }, ai_generated_notes: '' },
  });
  await page.evaluate(() => window.WA && WA.open());
  await page.waitForTimeout(400);
  await page.setInputFiles('#wa-rb-file', { name: 'blur.png', mimeType: 'image/png', buffer: PNG });
  await page.waitForSelector('#rb-saw-panel', { timeout: 8000 });
  const u = await page.evaluate(() => ({
    tags: document.querySelectorAll('.rb-saw-tag').length,
    ledger: !!document.getElementById('rb-saw-read'),
    open: document.getElementById('rb-saw-edit')?.style.display !== 'none',
    sub: document.querySelector('#wa-modal .fm-step p')?.textContent || '',
  }));
  check('unreadable · no tag pops', u.tags === 0, String(u.tags));
  check('unreadable · no ledger', !u.ledger);
  check('unreadable · editor open by default', u.open);
  check('unreadable · give-it-a-name copy', /couldn’t quite read|couldn't quite read/.test(u.sub), u.sub);

  await page.click('#wa-saw-cta');
  const guard = await page.evaluate(() => ({
    hint: document.getElementById('wa-saw-namehint')?.textContent || '',
    open: document.getElementById('rb-saw-edit')?.style.display !== 'none',
  }));
  check('unreadable · name guard fires in the open editor', /name/.test(guard.hint) && guard.open, guard.hint);
  check('no page errors (unreadable path)', errs.length === 0, errs.join(' | ').slice(0, 200));
  await ctx.close();
}

// ── Batch: second piece re-enters the scan, tag carries n of m ─────────
{
  const { ctx, page, errs, supaPosts } = await boot(browser, TAG);
  await page.evaluate(() => window.WA && WA.open());
  await page.waitForTimeout(400);
  await page.setInputFiles('#wa-rb-file', [
    { name: 'one.png', mimeType: 'image/png', buffer: PNG },
    { name: 'two.png', mimeType: 'image/png', buffer: PNG },
  ]);
  await page.waitForSelector('#rb-saw-panel', { timeout: 8000 });
  const b1 = await page.evaluate(() => (document.querySelector('#wa-modal .fm-step').textContent.match(/PIECE 1 OF 2/) || [])[0] || '');
  check('batch · piece 1 of 2 tag', b1 === 'PIECE 1 OF 2', b1);
  await page.click('#wa-saw-cta');
  await page.waitForSelector('#wa-read-txt', { timeout: 8000 });
  await page.waitForSelector('#rb-saw-panel', { timeout: 8000 });
  const b2 = await page.evaluate(() => ({
    tag: (document.querySelector('#wa-modal .fm-step').textContent.match(/PIECE 2 OF 2/) || [])[0] || '',
    collapsed: document.getElementById('rb-saw-edit')?.style.display === 'none',
  }));
  check('batch · piece 2 re-enters reveal, collapsed again', b2.tag === 'PIECE 2 OF 2' && b2.collapsed, JSON.stringify(b2));
  await page.click('#wa-saw-cta');
  await page.waitForTimeout(1500);
  check('batch · both inserts fired', supaPosts.length === 2, String(supaPosts.length));
  check('no page errors (batch)', errs.length === 0, errs.join(' | ').slice(0, 200));
  await ctx.close();
}

await browser.close();
server.kill();
const failed = results.filter((r) => !r.pass);
for (const r of results) console.log(`${r.pass ? '  ok ' : 'FAIL '} ${r.name}${r.pass ? '' : '  → ' + r.detail}`);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
