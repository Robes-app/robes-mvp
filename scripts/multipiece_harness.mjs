// Multi-piece harness (2026-10-13) — several pieces from ONE photograph.
// Use case 3 (the wardrobe add: "Here's what Robes saw" with a card per
// piece, the one confirm row, › into the single-piece screen, filing each
// piece with its own crop, the Filed screen) and use case 2b (a look from
// a photo: the two starts, the read, the dots and cards, Yes / No find it,
// the new piece as a rack row, Save waiting on every answer, the park, the
// save filing the new piece first and logging the wear). Plus the real
// server's degrade on the new route.
// Run manually: npm i --no-save playwright && node scripts/multipiece_harness.mjs
// Set CHROME_PATH when playwright's bundled browser build isn't installed.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const ROOT = new URL('..', import.meta.url).pathname;
const PORT = 4331;
const BASE = `http://127.0.0.1:${PORT}`;

const server = spawn('node', ['server.js'], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(PORT), NODE_ENV: 'test', GEMINI_API_KEY: '' },
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

const PNG_OK = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const DNA = (t, c) => ({ display: { title: t, editorial_color_name: c, primary_color_hex: '#202021', brand_raw: '' }, structural_dna: { silhouette_fit: [] }, formality: 'casual', llm_styling_context: {}, ai_generated_notes: '' });

const PIECES = [
  { id: 'w-top1', label: 'Cream silk shirt', category: 'Tops', category_l2: 'Shirts & blouses', category_l3: '', color: 'Cream', brand: 'Studio', image_url: 'https://res.cloudinary.com/demo/w-top1.jpg' },
  { id: 'w-sho1', label: 'Flat leather sandals', category: 'Shoes', category_l2: 'Sandals', category_l3: '', color: 'Camel', brand: 'Studio', image_url: 'https://res.cloudinary.com/demo/w-sho1.jpg' },
  { id: 'w-sho2', label: 'White running shoes', category: 'Shoes', category_l2: 'Trainers', category_l3: '', color: 'White', brand: 'Salomon', image_url: null },
  { id: 'w-bag1', label: 'Woven straw tote', category: 'Bags', category_l2: '', category_l3: '', color: 'Cream', brand: 'Studio', image_url: 'https://res.cloudinary.com/demo/w-bag1.jpg' },
];
function wardrobe() {
  return PIECES.map((p, i) => ({ ...p, user_id: 'u-test', notes: '', times_worn: 0, item_dna: {}, hero_position: null, seasons: null, occasions: null, created_at: new Date(Date.now() - i * 1000).toISOString() }));
}
// The read: a tee (new), leggings (new), trainers that look like hers.
const READ = [
  { label: 'Cream long-sleeve t-shirt', category: 'Tops', category_l2: 'T-shirts & tees', category_l3: 'Long-sleeve tee', color: 'Cream', brand: '', notes: 'A soft long-sleeve tee.', item_dna: DNA('Cream long-sleeve t-shirt', 'Alabaster'), price: null, currency: null, size: null, box: { x: 0.3, y: 0.1, w: 0.4, h: 0.3 }, wardrobe_match: null, match_confidence: 0 },
  { label: 'Black leggings', category: 'Bottoms', category_l2: 'Leggings', category_l3: '', color: 'Black', brand: '', notes: 'High-rise black leggings.', item_dna: DNA('Black leggings', 'Ink'), price: null, currency: null, size: null, box: { x: 0.32, y: 0.42, w: 0.36, h: 0.4 }, wardrobe_match: null, match_confidence: 0 },
  { label: 'White running shoes', category: 'Shoes', category_l2: 'Trainers', category_l3: 'Running trainer', color: 'White', brand: 'Salomon', notes: '', item_dna: DNA('White running shoes', 'Chalk'), price: null, currency: null, size: null, box: { x: 0.35, y: 0.84, w: 0.3, h: 0.14 }, wardrobe_match: { id: 'w-sho2', label: 'White running shoes', image_url: null, color: 'White' }, match_confidence: 0.86 },
];

const results = [];
const check = (name, pass, detail = '') => results.push({ name, pass, detail });

async function boot(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: opts.width || 1280, height: 1100 } });
  const page = await ctx.newPage();
  const writes = [];
  const extra = []; // wardrobe rows the app filed this session, served back on the next read
  let hostN = 0;
  await page.route('**cdn.jsdelivr.net/**', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: SUPA_STUB }));
  await page.route('**ayowpaknssulsqqvwpqx.supabase.co/**', (r) => {
    const req = r.request(); const u = req.url(); const m = req.method();
    const rest = u.split('/rest/v1/')[1] || '';
    let body = null;
    if (m !== 'GET') { try { body = req.postDataJSON(); } catch (_) { body = req.postData(); } writes.push({ method: m, url: rest, body }); }
    if (m === 'POST' && /^wardrobe_items\b/.test(rest)) {
      const row = Object.assign({ id: 'new-' + (extra.length + 1), times_worn: 0, created_at: new Date().toISOString() }, body);
      extra.push(row);
      return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify([row]) });
    }
    if (m === 'PATCH' && /^wardrobe_items\b/.test(rest)) {
      const id = (rest.match(/id=eq\.([^&]+)/) || [])[1];
      PIECES.forEach((p) => { if (p.id === id && body && 'image_url' in body) p.image_url = body.image_url; });
      return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
    if (m !== 'GET') {
      const echo = /^tags\b/.test(rest) && body ? JSON.stringify([Object.assign({ id: 'tag-' + (body.slug || 'x') }, body)]) : '[]';
      return r.fulfill({ status: 201, contentType: 'application/json', body: echo });
    }
    let out = '[]';
    if (/^wardrobe_items\b/.test(rest)) out = JSON.stringify(wardrobe().concat(extra));
    else if (/^profiles\b/.test(rest) && rest.includes('avatar_id')) out = '[]';
    return r.fulfill({ status: 200, contentType: 'application/json', body: out });
  });
  await page.route('**/api/wardrobe/pieces', async (r) => {
    await new Promise((res) => setTimeout(res, 300));
    const pieces = opts.read || READ;
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ noItemDetected: !pieces.length, pieces }) });
  });
  await page.route('**/api/wardrobe/analyse', async (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(READ[0]) }));
  await page.route('**/api/wardrobe/upload', async (r) => { hostN++; return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url: 'https://res.cloudinary.com/robes/host-' + hostN + '.jpg' }) }); });
  await page.route('**/api/avatar/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await page.route('**nominatim**', (r) => r.abort());
  await page.route('**open-meteo**', (r) => r.abort());
  await page.addInitScript(() => {
    window.__TEST_PROFILE = { first_name: 'Annie', last_name: '', mobile: '', style_icons: [], budget: null, wardrobe_description: '', style_dna: {}, wardrobe_items_count: 4, onboarded_at: '2026-07-01', gender_identity: 'woman' };
    Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true });
    localStorage.setItem('rb_lk_guide__u-test', 'off');
  });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2600);
  return { ctx, page, errs, writes, hosts: () => hostN };
}

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});

// ─────────────────────────────────────────────────────────────────────────
// 0 · The real route's degrade: no key → analysisFailed, never a 5xx
// ─────────────────────────────────────────────────────────────────────────
{
  const bad = await fetch(`${BASE}/api/wardrobe/pieces`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  check('route · a body with no photo is a 400', bad.status === 400, String(bad.status));
  const r = await fetch(`${BASE}/api/wardrobe/pieces`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: PNG_OK.toString('base64'), mimeType: 'image/png', wardrobeItems: [{ id: 1, label: 'x' }] }) });
  const j = await r.json();
  check('route · with no model key the read degrades to analysisFailed + an empty list, status 200', r.status === 200 && j.analysisFailed === true && Array.isArray(j.pieces) && !j.pieces.length, JSON.stringify(j));
  const one = await fetch(`${BASE}/api/wardrobe/analyse`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: PNG_OK.toString('base64'), mimeType: 'image/png' }) });
  const oj = await one.json();
  check('route · the single read keeps its degrade shape (analysisFailed + the empty piece)', one.status === 200 && oj.analysisFailed === true && oj.category === 'Other' && oj.item_dna && Array.isArray(oj.item_dna.structural_dna.silhouette_fit), JSON.stringify(oj).slice(0, 200));
}

// ─────────────────────────────────────────────────────────────────────────
// 1 · Use case 3 — several pieces to the wardrobe from one photo
// ─────────────────────────────────────────────────────────────────────────
{
  const { ctx, page, errs, writes } = await boot(browser);
  await page.evaluate(() => window.WA && WA.open());
  await page.waitForTimeout(400);
  await page.setInputFiles('#wa-rb-file', { name: 'outfit.png', mimeType: 'image/png', buffer: PNG_OK });
  await page.waitForSelector('.rb-mp-cards', { timeout: 8000 });
  await page.waitForTimeout(400);
  const a = await page.evaluate(() => ({
    h: document.querySelector('#wa-modal .fm-h')?.textContent || '',
    sub: document.querySelector('#wa-modal .fm-h + p')?.textContent || '',
    tags: Array.from(document.querySelectorAll('.rb-mp-tag')).map((t) => t.textContent),
    cards: document.querySelectorAll('.rb-mp-card').length,
    nums: Array.from(document.querySelectorAll('.rb-mp-num')).map((n) => n.textContent),
    asks: Array.from(document.querySelectorAll('.rb-mp-ask i')).map((i) => i.textContent),
    answers: Array.from(document.querySelectorAll('.rb-mp-ask .rb-pill')).map((b) => b.textContent),
    chips: Array.from(document.querySelectorAll('.rb-mp-chip')).map((c) => c.textContent),
    eyes: Array.from(document.querySelectorAll('.rb-mp-eye')).map((e) => e.textContent.trim()),
    names: Array.from(document.querySelectorAll('.rb-mp-name')).map((e) => e.textContent),
    cta: document.getElementById('wa-saw-cta')?.textContent, ctaOff: document.getElementById('wa-saw-cta')?.disabled,
    photo: !!document.getElementById('rb-mp-photo')?.src, thumbs: Array.from(document.querySelectorAll('img[data-mpcrop]')).filter((i) => i.src).length,
    ink: Array.from(document.querySelectorAll('#wa-modal button')).filter((b) => { const cs = getComputedStyle(b); return cs.backgroundColor === 'rgb(32, 32, 33)' && b.offsetParent; }).map((b) => b.textContent.trim()),
  }));
  check('4.1 · "Here’s what Robes saw." · three pieces in your photo, each filed on its own', /Here’s what Robes/.test(a.h) && /Three pieces in your photo\. Confirm the ones to add; each is filed on its own\./.test(a.sub), a.h + ' / ' + a.sub);
  check('4.1 · a numbered tag on the photo per piece, naming the piece', a.tags.length === 3 && a.tags[0] === '1Long-sleeve tee' && a.tags[1] === '2Leggings' && a.tags[2] === '3Running trainer', JSON.stringify(a.tags));
  check('4.1 · a card per piece, numbered to its tag, eyebrow Category · Brand / Unlabelled, New / Check chips', a.cards === 3 && a.nums.join('') === '123' && /^Tops · UnlabelledNew$/.test(a.eyes[0]) && /^Shoes · SalomonCheck$/.test(a.eyes[2]) && a.chips.join('|') === 'New|New|Check', JSON.stringify([a.eyes, a.chips]));
  check('4.1 · one confirm pattern: "Add this one?" Yes · Skip on a new piece, "Already yours?" Yes · No, add it on a likely duplicate', a.asks.join('|') === 'Add this one?|Add this one?|Already yours?' && a.answers.join('|') === 'Yes|Skip|Yes|Skip|Yes|No, add it', JSON.stringify([a.asks, a.answers]));
  check('4.1 · the names read without the brand; the photo and every crop are on screen', a.names.join('|') === 'Cream long-sleeve t-shirt|Black leggings|White running shoes' && a.photo && a.thumbs === 3, JSON.stringify([a.names, a.thumbs]));
  check('4.1 · the CTA waits (cream) until every piece is answered; no other ink on the screen', a.ctaOff === true && a.cta === 'Add to wardrobe →' && a.ink.length === 0, JSON.stringify([a.cta, a.ctaOff, a.ink]));

  await page.click('.rb-mp-card[data-i="0"] .rb-mp-ask .rb-pill');
  await page.waitForTimeout(200);
  const b = await page.evaluate(() => ({
    tags: document.querySelectorAll('.rb-mp-tag').length, nums: Array.from(document.querySelectorAll('.rb-mp-num')).map((n) => n.textContent).join(''),
    st: document.querySelector('.rb-mp-card[data-i="0"] .rb-mp-st')?.textContent.trim(), cls: document.querySelector('.rb-mp-card[data-i="0"]')?.className,
    ctaOff: document.getElementById('wa-saw-cta')?.disabled,
  }));
  check('4.1 · Yes → the number leaves the card and its tag leaves the photo; the card reads To add; the CTA still waits', b.tags === 2 && b.nums === '23' && /To add/i.test(b.st) && /\badd\b/.test(b.cls) && b.ctaOff === true, JSON.stringify(b));

  // › opens the single-piece screen scoped to piece 2 (4.2)
  await page.click('.rb-mp-card[data-i="1"] .rb-mp-row');
  await page.waitForSelector('#rb-saw-panel', { timeout: 4000 });
  const c = await page.evaluate(() => ({
    crumb: document.querySelector('.rb-mp-crumb')?.textContent || '', cta: document.getElementById('wa-saw-cta')?.textContent,
    retake: !!document.querySelector('#rb-saw-panel .rb-saw-retake'), banner: document.querySelector('.rb-saw-banner')?.textContent,
    rows: document.querySelectorAll('#rb-saw-read .rb-saw-row').length, mp: !!document.querySelector('.rb-mp-cards'),
  }));
  check('4.2 · › opens the existing single-piece screen scoped to that piece: ‹ All pieces · Piece 2, its banner, the 01–04 rows, "Add this piece", no Retake', /All pieces/.test(c.crumb) && /Piece 2/.test(c.crumb) && c.cta === 'Add this piece' && !c.retake && c.banner === 'Black leggings' && c.rows === 4 && !c.mp, JSON.stringify(c));
  await page.evaluate(() => window.__waFormView('details'));
  await page.waitForTimeout(150);
  await page.fill('#wa-saw-label', 'Black ribbed leggings');
  await page.click('#wa-saw-cta');
  await page.waitForTimeout(250);
  const d = await page.evaluate(() => ({
    back: !!document.querySelector('.rb-mp-cards'), name: document.querySelector('.rb-mp-card[data-i="1"] .rb-mp-name')?.textContent,
    cls: document.querySelector('.rb-mp-card[data-i="1"]')?.className, nums: Array.from(document.querySelectorAll('.rb-mp-num')).map((n) => n.textContent).join(''),
  }));
  check('4.2 · "Add this piece" confirms it with her edit and returns to the cards', d.back && d.name === 'Black ribbed leggings' && /\badd\b/.test(d.cls) && d.nums === '3', JSON.stringify(d));

  // A likely duplicate: Yes → already yours
  await page.click('.rb-mp-card[data-i="2"] .rb-mp-ask .rb-pill');
  await page.waitForTimeout(200);
  const e = await page.evaluate(() => ({
    h: document.querySelector('#wa-modal .fm-h')?.textContent || '', sub: document.querySelector('#wa-modal .fm-h + p')?.textContent || '',
    tags: document.querySelectorAll('.rb-mp-tag').length, nums: document.querySelectorAll('.rb-mp-num').length,
    st: document.querySelector('.rb-mp-card[data-i="2"] .rb-mp-st')?.textContent.trim(), op: getComputedStyle(document.querySelector('.rb-mp-card[data-i="2"]')).opacity,
    cta: document.getElementById('wa-saw-cta')?.textContent, ctaOff: document.getElementById('wa-saw-cta')?.disabled,
  }));
  check('4.3 · every piece answered: "Two to add, one already yours.", the tags gone, the owned piece dimmed, the CTA names the count', /Two to add, one already yours\./.test(e.h) && /Every piece answered/.test(e.sub) && e.tags === 0 && e.nums === 0 && /Already yours · photo added/i.test(e.st) && Number(e.op) < 1 && e.cta === 'Add 2 pieces to wardrobe →' && e.ctaOff === false, JSON.stringify(e));

  await page.click('#wa-saw-cta');
  await page.waitForSelector('#rb-mp-done', { timeout: 8000 });
  const posts = writes.filter((w) => w.method === 'POST' && /^wardrobe_items\b/.test(w.url)).map((w) => w.body);
  const patches = writes.filter((w) => w.method === 'PATCH' && /^wardrobe_items\b/.test(w.url));
  check('4.4 · two wardrobe rows, each with its own hosted crop, her edit on the leggings, the read on the tee, source photo_multi', posts.length === 2 && posts[0].label === 'Cream long-sleeve t-shirt' && posts[1].label === 'Black ribbed leggings' && posts.every((p) => /^https:\/\/res\.cloudinary\.com\/robes\/host-/.test(p.image_url)) && posts[0].image_url !== posts[1].image_url && posts.every((p) => p.item_dna && p.item_dna.source && p.item_dna.source.kind === 'photo_multi') && posts[0].category_l2 === 'T-shirts & tees' && posts[1].category === 'Bottoms', JSON.stringify(posts).slice(0, 400));
  check('4.4 · the piece she already owned, photographed for the first time, takes the crop as its photograph (one PATCH, nothing filed twice)', patches.length === 1 && /w-sho2/.test(patches[0].url) && /host-/.test(patches[0].body.image_url), JSON.stringify(patches));
  const f = await page.evaluate(() => ({
    h: document.querySelector('#wa-modal .fm-h')?.textContent || '', sub: document.querySelector('#wa-modal .fm-h + p')?.textContent || '',
    tiles: Array.from(document.querySelectorAll('.rb-mp-tile')).map((t) => t.textContent.trim()), owned: document.querySelector('.rb-mp-ownedline')?.textContent,
    done: document.getElementById('rb-mp-done')?.textContent, imgs: Array.from(document.querySelectorAll('.rb-mp-tile img')).filter((i) => i.src).length,
  }));
  check('4.4 · "Two pieces, filed." — each one cut from the same photo, the owned piece named as keeping the new photo, Back to wardrobe', /Two pieces, filed\./.test(f.h) && /cut from the same photo/.test(f.sub) && f.tiles.length === 2 && /Tops · Just filed/i.test(f.tiles[0]) && /Bottoms · Just filed/i.test(f.tiles[1]) && f.imgs === 2 && /white running shoes kept the new photo/.test(f.owned || '') && f.done === 'Back to wardrobe →', JSON.stringify(f));
  await page.click('#rb-mp-done');
  await page.waitForTimeout(400);
  const g = await page.evaluate(() => ({ open: !!document.querySelector('#wa-modal.open'), n: document.querySelectorAll('#wg-grid .wg-item:not(.rb-add-card)').length }));
  check('4.4 · Back to wardrobe closes the modal; the grid holds the two new pieces', !g.open && g.n === 6, JSON.stringify(g));
  check('no page errors (wardrobe · several)', errs.length === 0, errs.join(' | ').slice(0, 240));
  await ctx.close();
}
{
  // Skip and "No, add it"; a single-piece photo lands on the confirm screen as it does today.
  const { ctx, page, errs, writes } = await boot(browser);
  await page.evaluate(() => window.WA && WA.open());
  await page.waitForTimeout(400);
  await page.setInputFiles('#wa-rb-file', { name: 'outfit.png', mimeType: 'image/png', buffer: PNG_OK });
  await page.waitForSelector('.rb-mp-cards', { timeout: 8000 });
  await page.click('.rb-mp-card[data-i="0"] .rb-mp-ask .rb-pill:nth-child(2)');
  await page.click('.rb-mp-card[data-i="1"] .rb-mp-ask .rb-pill:nth-child(2)');
  await page.click('.rb-mp-card[data-i="2"] .rb-mp-ask .rb-pill:nth-child(2)');
  await page.waitForTimeout(200);
  const s = await page.evaluate(() => ({ h: document.querySelector('#wa-modal .fm-h')?.textContent || '', sts: Array.from(document.querySelectorAll('.rb-mp-st')).map((x) => x.textContent.trim()), cta: document.getElementById('wa-saw-cta')?.textContent, off: document.getElementById('wa-saw-cta')?.disabled }));
  check('4.1 · Skip skips; "No, add it" on a duplicate adds it; "One to add." and the CTA counts one', /^One to add\./.test(s.h) && /Skipped/.test(s.sts[0]) && /Skipped/.test(s.sts[1]) && /To add/i.test(s.sts[2]) && s.cta === 'Add 1 piece to wardrobe →' && s.off === false, JSON.stringify(s));
  await page.evaluate(() => window.WA && WA.close());
  await page.waitForTimeout(300);
  await page.evaluate(() => window.WA && WA.open());
  await page.waitForTimeout(400);
  await page.route('**/api/wardrobe/pieces', async (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ noItemDetected: false, pieces: [READ[0]] }) }));
  await page.setInputFiles('#wa-rb-file', { name: 'tee.png', mimeType: 'image/png', buffer: PNG_OK });
  await page.waitForSelector('#rb-saw-panel', { timeout: 8000 });
  const one = await page.evaluate(() => ({ mp: !!document.querySelector('.rb-mp-cards'), banner: document.querySelector('.rb-saw-banner')?.textContent, cta: document.getElementById('wa-saw-cta')?.textContent, crumb: !!document.querySelector('.rb-mp-crumb') }));
  check('4.2 · a single-piece photo skips the list and lands on today’s confirm screen', !one.mp && one.banner === 'Cream long-sleeve t-shirt' && one.cta === 'Add to wardrobe →' && !one.crumb, JSON.stringify(one));
  await page.evaluate(() => window.WA && WA.close());
  await page.waitForTimeout(300);
  // The multi read failing falls back to the single read — the add never dies on the new door.
  await page.route('**/api/wardrobe/pieces', async (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ analysisFailed: true, pieces: [] }) }));
  await page.evaluate(() => window.WA && WA.open());
  await page.waitForTimeout(400);
  await page.setInputFiles('#wa-rb-file', { name: 'tee.png', mimeType: 'image/png', buffer: PNG_OK });
  await page.waitForSelector('#rb-saw-panel', { timeout: 8000 });
  const fb = await page.evaluate(() => ({ banner: document.querySelector('.rb-saw-banner')?.textContent }));
  check('4.2 · a failed multi read falls back to the single read', fb.banner === 'Cream long-sleeve t-shirt', JSON.stringify(fb));
  check('no page errors (wardrobe · skip / single / fallback)', errs.length === 0 && writes.filter((w) => w.method === 'POST' && /^wardrobe_items\b/.test(w.url)).length === 0, errs.join(' | ').slice(0, 240));
  await ctx.close();
}
{
  // 390: the pieces screen fits the phone
  const { ctx, page, errs } = await boot(browser, { width: 390 });
  await page.evaluate(() => window.WA && WA.open());
  await page.waitForTimeout(400);
  await page.setInputFiles('#wa-rb-file', { name: 'outfit.png', mimeType: 'image/png', buffer: PNG_OK });
  await page.waitForSelector('.rb-mp-cards', { timeout: 8000 });
  const m = await page.evaluate(() => ({ over: document.documentElement.scrollWidth > window.innerWidth + 1, cards: document.querySelectorAll('.rb-mp-card').length, w: document.querySelector('.rb-mp-card')?.getBoundingClientRect().width }));
  check('390 · the pieces screen fits the phone', !m.over && m.cards === 3 && m.w > 280, JSON.stringify(m));
  check('no page errors (wardrobe · 390)', errs.length === 0, errs.join(' | ').slice(0, 240));
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────
// 2 · Use case 2b — a look from a photo
// ─────────────────────────────────────────────────────────────────────────
{
  const { ctx, page, errs, writes } = await boot(browser);
  await page.evaluate(() => window.__lkGo && window.__lkGo());
  await page.waitForTimeout(700);
  const s0 = await page.evaluate(() => ({
    guide: document.querySelector('.rb-lk-starts .rb-lk-guide .gd')?.textContent || '', guideAct: document.querySelector('.rb-lk-starts .rb-lk-guide .ga button')?.textContent.trim(),
    photo: document.querySelector('.rb-lk-starts .rb-lk-start .gh')?.textContent, sub: document.querySelector('.rb-lk-starts .rb-lk-start .gd')?.textContent, pill: document.getElementById('rb-lk-startphoto')?.textContent.trim(),
    doors: document.querySelectorAll('.rb-lk-con .rb-lk-guide').length, save: document.querySelector('.rb-lk-draftbar .rb-lk-save')?.disabled,
    ink: Array.from(document.querySelectorAll('.rb-lk-starts button')).filter((b) => getComputedStyle(b).backgroundColor === 'rgb(32, 32, 33)').length,
  }));
  check('3.1 · the empty look offers two equal starts — the rack (the standing guide card) and a photo — neither ink, Save withheld', /Start anywhere/.test(s0.guide) && s0.guideAct === '+ Add a piece' && s0.photo === 'Start with a photo' && /Robes reads every piece in it/.test(s0.sub || '') && s0.pill === 'Add a photo' && s0.doors === 1 && s0.save === true && s0.ink === 0, JSON.stringify(s0));

  const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('#rb-lk-startphoto')]);
  await fc.setFiles({ name: 'outfit.png', mimeType: 'image/png', buffer: PNG_OK });
  await page.waitForTimeout(150);
  const r0 = await page.evaluate(() => ({
    head: document.querySelector('.rb-lk-composer .rbc-lhead .lab')?.textContent, wait: document.querySelector('.rb-lkr-wait')?.textContent || '',
    skel: !!document.querySelector('.rb-lkr-skel'), save: document.querySelector('.rb-lk-draftbar .rb-lk-save')?.disabled,
  }));
  check('3.3 · Reading: the head reads THE LOOK · READING, "Robes is finding the pieces. The top, for a start." over a skeleton card, Save withheld', /Reading/.test(r0.head || '') && /One moment/i.test(r0.wait) && /Robes is finding the pieces\. The top, for a start\./.test(r0.wait) && r0.skel && r0.save === true, JSON.stringify(r0));

  await page.waitForSelector('.rb-lkr-card', { timeout: 8000 });
  await page.waitForTimeout(500);
  const r1 = await page.evaluate(() => ({
    photo: document.querySelector('.rb-lkm-photo.rb-lkr img')?.getAttribute('src'), dots: Array.from(document.querySelectorAll('.rb-lkr-dot')).map((d) => d.textContent),
    dotPos: Array.from(document.querySelectorAll('.rb-lkr-dot')).map((d) => d.style.left + ' ' + d.style.top),
    cards: document.querySelectorAll('.rb-lkr-card').length, nums: Array.from(document.querySelectorAll('.rb-lkr-num')).map((n) => n.textContent).join(''),
    asks: Array.from(document.querySelectorAll('.rb-lkr-ask i')).map((i) => i.textContent), answers: Array.from(document.querySelectorAll('.rb-lkr-ask .rb-pill')).map((b) => b.textContent),
    eyes: Array.from(document.querySelectorAll('.rb-lkr-eye')).map((e) => e.textContent.trim()), ctx: Array.from(document.querySelectorAll('.rb-lkr-ctx')).map((e) => e.textContent.trim()),
    crops: Array.from(document.querySelectorAll('.rb-lkr-th img')).filter((i) => i.src).length,
    seg: Array.from(document.querySelectorAll('.rb-lkm-seg button')).map((b) => b.textContent + (b.classList.contains('on') ? '*' : '')), note: document.querySelector('.rb-lkm-note')?.textContent,
    head: document.querySelector('.rb-lk-composer .rbc-lhead .lab')?.textContent,
    save: document.querySelector('.rb-lk-draftbar .rb-lk-save')?.disabled, gate: document.getElementById('rb-lk-readgate')?.textContent,
    add: document.querySelector('.rbc-addpiece')?.textContent.trim(), wear: !!document.getElementById('rb-lk-wearnow'), wearOn: document.getElementById('rb-lk-wearnow')?.checked,
  }));
  check('3.3 · the photo lands as the record (You selected, kept as the record), dots on it as pieces are found, a card under each', /host-1\.jpg$/.test(r1.photo || '') && r1.dots.join('') === '123' && /^50% 25%$/.test(r1.dotPos[0]) && r1.cards === 3 && r1.nums === '123' && r1.seg.join('|') === 'You*|Model' && /Kept as the record/.test(r1.note || ''), JSON.stringify(r1));
  check('3.4 · one confirm pattern: a match asks "Your running shoes?", a piece she doesn’t own asks "Not in your rack. New?" — Yes · No, find it', r1.asks.join('|') === 'Not in your rack. New?|Not in your rack. New?|Your white running shoes?' && r1.answers.join('|') === 'Yes|No, find it|Yes|No, find it|Yes|No, find it' && r1.eyes[0] === 'TopsNew' && r1.eyes[2] === 'Shoes · SalomonCheck' && r1.ctx[0] === 'Robes files it on save' && /Looks like the white running shoes/i.test(r1.ctx[2]) && r1.crops === 3, JSON.stringify([r1.asks, r1.answers, r1.eyes, r1.ctx]));
  check('3.4 · Save waits until every piece is confirmed; the note says so; the wear log is off by default; "+ Add a piece, or tap the photo"', r1.save === true && /3 pieces to confirm before you save\./.test(r1.gate || '') && r1.wear && r1.wearOn === false && /Add a piece, or tap the photo/.test(r1.add || '') && /The look · 0 pieces/.test(r1.head || ''), JSON.stringify([r1.save, r1.gate, r1.add, r1.head]));

  // Yes on the match → the rack row; Yes on a new piece → a NEW row
  await page.click('.rb-lkr-card[data-i="2"] .rb-lkr-ask .rb-pill');
  await page.waitForTimeout(250);
  await page.click('.rb-lkr-card[data-i="1"] .rb-lkr-ask .rb-pill');
  await page.waitForTimeout(250);
  const r2 = await page.evaluate(() => ({
    rows: Array.from(document.querySelectorAll('.rb-lk-composer .rbc-trailrow')).map((r) => r.querySelector('.rbc-name')?.textContent + '|' + r.querySelector('.rbc-eye')?.textContent.trim() + '|' + (r.querySelector('.rbc-ctx')?.textContent.trim() || '') + '|' + (/rb-lkr-newrow/.test(r.className) ? 'new' : 'own')),
    dots: document.querySelectorAll('.rb-lkr-dot').length, cards: document.querySelectorAll('.rb-lkr-card').length, head: document.querySelector('.rb-lk-composer .rbc-lhead .lab')?.textContent,
    gate: document.getElementById('rb-lk-readgate')?.textContent, save: document.querySelector('.rb-lk-draftbar .rb-lk-save')?.disabled,
  }));
  check('3.4 · Yes on a match hangs her piece on the rack; Yes on a new piece becomes a rack row marked New · filed on save; the dots leave', r2.rows.some((x) => /^White running shoes\|Shoes · Salomon\|.*\|own$/.test(x)) && r2.rows.some((x) => /^Black leggings\|Bottoms\|.*New · filed on save\|new$/.test(x)) && r2.dots === 1 && r2.cards === 1 && /The look · 2 pieces/.test(r2.head || '') && /One piece to confirm/.test(r2.gate || '') && r2.save === true, JSON.stringify(r2));

  // No, find it → her tops, "None of these — it's new"
  await page.click('.rb-lkr-card[data-i="0"] .rb-lkr-ask .rb-pill:nth-child(2)');
  await page.waitForSelector('#lk-read-drawer', { timeout: 3000 });
  const dr = await page.evaluate(() => ({
    title: document.querySelector('#lk-read-drawer .rb-sd-t')?.textContent, chip: document.querySelector('#lk-read-drawer .rb-sd-chip.on')?.textContent.trim(),
    tiles: Array.from(document.querySelectorAll('#lk-read-drawer .rb-sd-tile:not(.snap) .nm')).map((n) => n.textContent), none: document.querySelector('#lk-read-drawer .rb-lkr-none')?.textContent,
    go: document.querySelector('#lk-read-drawer .rb-sd-go')?.textContent, goOff: document.querySelector('#lk-read-drawer .rb-sd-go')?.disabled,
  }));
  check('3.4 · No, find it → her pieces in that category, Snap first, "None of these — it’s new", the commit reads "Pick the piece it is"', /Find the cream long-sleeve t-shirt/i.test(dr.title || '') && dr.chip === 'Tops' && dr.tiles.join('|') === 'Cream silk shirt' && /None of these — it’s new/.test(dr.none || '') && dr.go === 'Pick the piece it is' && dr.goOff === true, JSON.stringify(dr));
  await page.click('#lk-read-drawer .rb-sd-tile:not(.snap)');
  await page.waitForTimeout(150);
  const dr2 = await page.evaluate(() => document.querySelector('#lk-read-drawer .rb-sd-go')?.textContent);
  check('3.4 · a tile picked: "It’s the cream silk shirt"', dr2 === 'It’s the cream silk shirt', String(dr2));
  await page.click('#lk-read-drawer .rb-sd-go');
  await page.waitForTimeout(300);
  const r3 = await page.evaluate(() => ({
    rows: Array.from(document.querySelectorAll('.rb-lk-composer .rbc-trailrow .rbc-name')).map((n) => n.textContent), dots: document.querySelectorAll('.rb-lkr-dot').length, cards: document.querySelectorAll('.rb-lkr-card').length,
    head: document.querySelector('.rb-lk-composer .rbc-lhead .lab')?.textContent, save: document.querySelector('.rb-lk-draftbar .rb-lk-save')?.disabled, gate: document.getElementById('rb-lk-readgate'),
    park: (() => { try { const d = JSON.parse(localStorage.getItem('rb_lk_draft__u-test') || '{}'); const x = d.v === 3 ? d.drafts[0] : d; return { n: x.read && x.read.pieces.length, states: x.read && x.read.pieces.map((p) => p.state).join(','), data: JSON.stringify(x).indexOf('data:image') > -1 }; } catch (_) { return null; } })(),
  }));
  check('3.5 · every piece answered: the dots and numbers are gone, three on the rack (two hers, one new), Save live', r3.rows.length === 3 && r3.rows.indexOf('Cream silk shirt') > -1 && r3.rows.indexOf('Black leggings') > -1 && r3.dots === 0 && r3.cards === 0 && /The look · 3 pieces/.test(r3.head || '') && r3.save === false && r3.gate === null, JSON.stringify(r3));
  await page.waitForTimeout(600);
  const park = await page.evaluate(() => { try { const d = JSON.parse(localStorage.getItem('rb_lk_draft__u-test') || '{}'); const x = d.v === 3 ? d.drafts[0] : d; return { n: x.read && x.read.pieces.length, states: x.read && x.read.pieces.map((p) => p.state).join(','), data: JSON.stringify(x).indexOf('data:image') > -1, photo: x.photo && x.photo.url }; } catch (_) { return null; } });
  check('park · the read rides the draft’s park — its states, hosted crops only, never a data URL', park && park.n === 3 && park.states === 'yes,new,yes' && park.data === false && /host-1/.test(park.photo || ''), JSON.stringify(park));

  // Wear it, name it, save: the new piece files first with its own crop, then the look, then the wear.
  await page.check('#rb-lk-wearnow');
  await page.fill('#rb-lk-newtitle', 'Sunday run');
  await page.click('.rb-lk-draftbar .rb-lk-save');
  await page.waitForTimeout(1500);
  const w = {
    piece: writes.filter((x) => x.method === 'POST' && /^wardrobe_items\b/.test(x.url)).map((x) => x.body),
    look: writes.filter((x) => x.method === 'POST' && /^looks\b/.test(x.url)).map((x) => x.body),
    pieces: writes.filter((x) => x.method === 'POST' && /^look_pieces\b/.test(x.url)).map((x) => x.body),
    wears: writes.filter((x) => x.method === 'POST' && /^wears\b/.test(x.url)).map((x) => x.body),
  };
  const lp = [].concat(...w.pieces.map((b) => Array.isArray(b) ? b : [b]));
  check('save · the new piece files to the wardrobe first, with its own crop and source look_photo', w.piece.length === 1 && w.piece[0].label === 'Black leggings' && /host-/.test(w.piece[0].image_url) && w.piece[0].item_dna.source.kind === 'look_photo', JSON.stringify(w.piece).slice(0, 300));
  check('save · the look saves named, its three pieces hers (the shirt, the shoes, the filed leggings), the photo as its record', w.look.length === 1 && w.look[0].name === 'Sunday run' && /host-1/.test(w.look[0].photo_url || '') && lp.length === 3 && lp.map((p) => p.wardrobe_item_id).sort().join(',') === 'new-1,w-sho2,w-top1', JSON.stringify([w.look.map((l) => l.name + '|' + l.photo_url), lp.map((p) => p.wardrobe_item_id)]));
  check('save · "Wearing it today" logs the wear on the saved look, dated today', w.wears.length === 1 && w.wears[0].worn_on === new Date().toLocaleDateString('en-CA') && w.wears[0].source === 'photo' && Array.isArray(w.wears[0].piece_ids) && w.wears[0].piece_ids.length === 3, JSON.stringify(w.wears));
  const after = await page.evaluate(() => ({ grid: !!document.querySelector('#rb-lk-grid .rb-lk-tile'), composer: !!document.querySelector('.rb-lk-composer'), read: document.querySelectorAll('.rb-lkr-card').length }));
  check('save · lands on the grid with the look; the composer and the read are gone', after.grid && !after.composer && after.read === 0, JSON.stringify(after));
  check('no page errors (look from a photo)', errs.length === 0, errs.join(' | ').slice(0, 240));
  await ctx.close();
}
{
  // A read that finds nothing keeps the photo as the record; the camera pill on the model canvas READS on a new look.
  const { ctx, page, errs } = await boot(browser, { read: [] });
  await page.evaluate(() => window.__lkGo && window.__lkGo());
  await page.waitForTimeout(700);
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('.rb-lkm-orphoto, .rb-lkm-canvas .rb-lk-imgacts button, #rb-lk-startphoto')]);
  await fc.setFiles({ name: 'room.png', mimeType: 'image/png', buffer: PNG_OK });
  await page.waitForTimeout(1500);
  const n = await page.evaluate(() => ({ photo: !!document.querySelector('.rb-lkm-photo img'), cards: document.querySelectorAll('.rb-lkr-card').length, wait: !!document.querySelector('.rb-lkr-wait'), save: document.querySelector('.rb-lk-draftbar .rb-lk-save')?.disabled, toast: document.body.textContent.indexOf('kept as the record') > -1 }));
  check('3.3 · nothing in the photo: it stays as the record, no cards, Save live (a photograph counts)', n.photo && n.cards === 0 && !n.wait && n.save === false, JSON.stringify(n));
  check('no page errors (look · empty read)', errs.length === 0, errs.join(' | ').slice(0, 240));
  await ctx.close();
}
{
  // 390: the composer with the read on screen fits the phone
  const { ctx, page, errs } = await boot(browser, { width: 390 });
  await page.evaluate(() => window.__lkGo && window.__lkGo());
  await page.waitForTimeout(700);
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('#rb-lk-startphoto')]);
  await fc.setFiles({ name: 'outfit.png', mimeType: 'image/png', buffer: PNG_OK });
  await page.waitForSelector('.rb-lkr-card', { timeout: 8000 });
  await page.waitForTimeout(400);
  const m = await page.evaluate(() => ({ over: document.documentElement.scrollWidth > window.innerWidth + 1, cards: document.querySelectorAll('.rb-lkr-card').length, starts: getComputedStyle(document.querySelector('.rb-lk-starts') || document.body).gridTemplateColumns }));
  check('390 · the read fits the phone (no horizontal overflow, three cards)', !m.over && m.cards === 3, JSON.stringify(m));
  await page.screenshot({ path: '/tmp/claude-0/-home-user-robes-mvp/d822deef-bebb-5a67-9ae8-71afb427c720/scratchpad/look-read-390.png', fullPage: false });
  check('no page errors (look · 390)', errs.length === 0, errs.join(' | ').slice(0, 240));
  await ctx.close();
}

await browser.close();
server.kill();
const failed = results.filter((r) => !r.pass);
for (const r of results) console.log(`${r.pass ? '  ok ' : 'FAIL '} ${r.name}${r.pass ? '' : '  → ' + r.detail}`);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
