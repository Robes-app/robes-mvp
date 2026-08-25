// Avatar client smoke — boots the real dashboard (looks_harness scaffolding)
// and proves the render loop end to end client-side: opening a saved look
// kicks POST /api/avatar/render with her model id + resolvable garments,
// the poller lands the photograph, the look patches render_url/render_key,
// and the detail hero swaps from the mosaic to the render.
// Run: npm i --no-save playwright && node scripts/avatar_client_smoke.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const ROOT = new URL('..', import.meta.url).pathname;
const PORT = 4327;
const BASE = `http://127.0.0.1:${PORT}`;

const server = spawn('node', ['server.js'], {
  cwd: ROOT, env: { ...process.env, PORT: String(PORT), NODE_ENV: 'test' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
await new Promise((res) => {
  const on = (b) => { if (String(b).includes(String(PORT))) res(); };
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
  { id: 'w-top1', label: 'Cream silk shirt', category: 'Tops', color: 'Cream' },
  { id: 'w-bot1', label: 'Barrel-leg jeans', category: 'Bottoms', color: 'Navy' },
  { id: 'w-sho1', label: 'Flat leather sandals', category: 'Shoes', color: 'Camel' },
  { id: 'w-bag1', label: 'Woven straw tote', category: 'Bags', color: 'Cream' },
];
const wardrobe = () => PIECES.map((p, i) => ({
  ...p, user_id: 'u-test', brand: 'Studio', notes: '',
  image_url: 'https://res.cloudinary.com/demo/image/upload/' + p.id + '.jpg',
  times_worn: 0, item_dna: {}, hero_position: null, seasons: null, occasions: null,
  created_at: new Date(Date.now() - i * 1000).toISOString(),
}));
const SEED_LOOKS = [{ id: 'lk-1', user_id: 'u-test', name: 'The Thursday one', name_provisional: false,
  note: '', photo_url: null, source: 'wear', origin_look_id: null,
  // one Robes proposal beside the owned pieces — its still must ride the render
  proposals: [{ role: 'The Texture', chip: 'Jacket', cats: ['Outerwear'], oi: 0,
    opts: [{ name: 'Taupe suede jacket', brand: 'All Saints' }],
    image_url: 'https://res.cloudinary.com/demo/image/upload/prop1.jpg' }],
  created_at: '2026-07-20T10:00:00Z', updated_at: '2026-07-20T10:00:00Z' }];
const SEED_PIECES = [
  { look_id: 'lk-1', wardrobe_item_id: 'w-top1', slot: 'Top', position: 0 },
  { look_id: 'lk-1', wardrobe_item_id: 'w-bot1', slot: 'Bottom', position: 1 },
  { look_id: 'lk-1', wardrobe_item_id: 'w-sho1', slot: 'Shoe', position: 2 },
];

let fails = 0, passes = 0;
const ok = (c, m, d = '') => { if (c) passes++; else { fails++; console.log('  \x1b[31m✗\x1b[0m ' + m + (d ? ' — ' + d : '')); } };

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1200 } });
const page = await ctx.newPage();
const renderPosts = [];
const patches = [];

await page.route('**cdn.jsdelivr.net/**', (r) =>
  r.fulfill({ status: 200, contentType: 'application/javascript', body: SUPA_STUB }));
await page.route('**ayowpaknssulsqqvwpqx.supabase.co/**', (r) => {
  const req = r.request(); const u = req.url(); const m = req.method();
  if (m === 'PATCH' && /\/looks\?/.test(u)) {
    try { patches.push(req.postDataJSON()); } catch (_) {}
  }
  if (m !== 'GET') return r.fulfill({ status: 201, contentType: 'application/json', body: '[]' });
  let body = '[]';
  if (u.includes('wardrobe_items')) body = JSON.stringify(wardrobe());
  else if (u.includes('select=avatar_id')) body = JSON.stringify([{ avatar_id: 'w-s2-h0-hg' }]);
  else if (u.includes('/looks')) body = JSON.stringify(SEED_LOOKS);
  else if (u.includes('look_pieces')) body = JSON.stringify(SEED_PIECES);
  return r.fulfill({ status: 200, contentType: 'application/json', body });
});
await page.route('**/api/avatar/render', (r) => {
  renderPosts.push(r.request().postDataJSON());
  r.fulfill({ status: 200, contentType: 'application/json', body: '{"jobId":"jj1","count":1}' });
});
await page.route('**/api/images/jj1', (r) =>
  r.fulfill({ status: 200, contentType: 'application/json',
    body: '{"images":["https://res.cloudinary.com/demo/image/upload/render1.jpg"],"done":true}' }));
await page.route('**nominatim**', (r) => r.abort());
await page.route('**open-meteo**', (r) => r.abort());
await page.addInitScript(() => {
  window.__TEST_PROFILE = {
    first_name: 'Annie', last_name: '', mobile: '', style_icons: [], budget: null,
    wardrobe_description: '', style_dna: {}, wardrobe_items_count: 4,
    onboarded_at: '2026-07-01', gender_identity: 'woman',
  };
  Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true });
});
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2800);

console.log('\x1b[1m== avatar client smoke — open a saved look, her model wears it ==\x1b[0m');
await page.evaluate(() => window.__lkGo && window.__lkGo());
await page.waitForTimeout(600);
await page.evaluate(() => window.__lkOpen('lk-1'));
await page.waitForTimeout(800);

ok(renderPosts.length === 1, 'opening the look kicks ONE render', 'got ' + renderPosts.length);
const post = renderPosts[0] || {};
ok(post.avatarId === 'w-s2-h0-hg', 'the POST carries her avatar_id', String(post.avatarId));
ok(Array.isArray(post.pieces) && post.pieces.length === 4, 'three owned pieces + the proposal resolve', JSON.stringify(post.pieces || []).slice(0, 160));
ok(post.pieces && post.pieces.some(g => g.name === 'Taupe suede jacket' && /prop1\.jpg/.test(g.image_url || '')), 'the proposal rides with its generated still');
ok(post.pieces && post.pieces[0] && /res\.cloudinary\.com/.test(post.pieces[0].image_url || ''), 'garment photos ride along');

await page.waitForTimeout(5000);   // poller ticks at 4s
const l = await page.evaluate(() => {
  const raw = localStorage.getItem('rb_looks__u-test');
  const arr = raw ? JSON.parse(raw) : [];
  return arr.find(x => x.id === 'lk-1') || null;
});
ok(l && l.render_url === 'https://res.cloudinary.com/demo/image/upload/render1.jpg', 'the render patches onto the look', l && l.render_url);
ok(l && l.render_key === 'w-s2-h0-hg|w-bot1,w-sho1,w-top1|p:Taupe suede jacket', 'render_key = avatar | pieces | proposals', l && l.render_key);
const patched = patches.find(p => p.render_url);
ok(!!patched && patched.render_key === 'w-s2-h0-hg|w-bot1,w-sho1,w-top1|p:Taupe suede jacket', 'the cloud PATCH carries render_url + render_key');
const hero = await page.evaluate(() => {
  const img = document.querySelector('#rb-lk-body img');
  return img ? img.getAttribute('src') : null;
});
ok(hero === 'https://res.cloudinary.com/demo/image/upload/render1.jpg', 'the detail hero swaps to the render', String(hero));

// re-opening the same composition must NOT re-render (the key cache)
await page.evaluate(() => { window.__lkBack(); window.__lkOpen('lk-1'); });
await page.waitForTimeout(600);
ok(renderPosts.length === 1, 'an unchanged composition never re-renders', 'got ' + renderPosts.length);
ok(errs.length === 0, 'no page errors', errs.join(' | ').slice(0, 200));

console.log(`\n\x1b[1m${passes} passed, ${fails} failed\x1b[0m`);
await browser.close();
server.kill();
process.exit(fails ? 1 : 0);
