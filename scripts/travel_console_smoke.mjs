// Travel console smoke — the first tranche of the travel harness rewrite
// (the Stage 3/5 assertions were superseded by the looks-first restructure).
// Boots the real dashboard (Supabase stubbed), feeds __tvRenderResult a
// looks-first fixture and walks: the Days | Looks | The Rack segment, the
// shared-console day view (multi-look switcher, scoped flick + badge, free
// day), the dayless look console, imported-look reader, The Travel Rack
// pane and legacy-save migration.
// Run manually: npm i --no-save playwright && node scripts/travel_console_smoke.mjs
// Set CHROME_PATH when playwright's bundled browser build isn't installed.
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
window.supabase = { createClient(){
  const sess = { user: { id: 'u-test', email: 't@t.co' }, access_token: 'tok' };
  const q = () => ({ select(){ return this; }, eq(){ return this; }, order(){ return this; },
    single(){ return Promise.resolve({ data: window.__TEST_PROFILE, error: null }); },
    then(r){ return Promise.resolve({ data: [], error: null }).then(r); } });
  return { auth: { onAuthStateChange(){ return { data: { subscription: { unsubscribe(){} } } }; },
    getSession(){ return Promise.resolve({ data: { session: sess } }); }, signOut(){ return Promise.resolve({}); } },
    from(){ return q(); } };
} };`;

const WARDROBE = [
  { id: 'w1', label: 'Cream silk shirt', category: 'Tops', color: 'Cream' },
  { id: 'w2', label: 'Ribbed white tank', category: 'Tops', color: 'White' },
  { id: 'w3', label: 'Barrel-leg jeans', category: 'Bottoms', color: 'Navy' },
  { id: 'w4', label: 'Flat leather sandals', category: 'Shoes', color: 'Camel' },
  { id: 'w5', label: 'Tan leather slides', category: 'Shoes', color: 'Camel' },
].map((p, i) => ({ ...p, user_id: 'u-test', brand: 'Studio', notes: '', image_url: null, times_worn: 0, item_dna: {}, hero_position: null, seasons: null, occasions: null, created_at: new Date(Date.now() - i * 1000).toISOString() }));

const FIXTURE = {
  trip_label: 'LAHINCH · JULY', headline: 'Lahinch, packed once.', location_vibe: 'Wild Atlantic ease',
  stylist_summary: 'A tight case for the coast.', suitcase_note: '', palette: ['#8A8078', '#C9BCA6'],
  destination: 'Lahinch', dateFrom: '2026-07-31', dateTo: '2026-08-03', dateLine: '31 Jul – 3 Aug',
  tripDays: 4, plans: ['Night out', 'Beach day'], weather: { city: 'Lahinch', tempRange: '14–19°C', condition: 'passing showers' },
  capsule: [
    { name: 'Cream silk shirt', tier: 'Foundations & Tailoring', category: 'Tops', brand: 'Studio', description: '', reason: '', wardrobe_index: 0, retailer_hint: '', price_point: '', wardrobe_match: { id: 'w1', label: 'Cream silk shirt', image_url: null, color: 'Cream' } },
    { name: 'Ribbed white tank', tier: 'Foundations & Tailoring', category: 'Tops', brand: 'Studio', description: '', reason: '', wardrobe_index: 1, retailer_hint: '', price_point: '', wardrobe_match: { id: 'w2', label: 'Ribbed white tank', image_url: null, color: 'White' } },
    { name: 'Barrel-leg jeans', tier: 'Foundations & Tailoring', category: 'Bottoms', brand: 'Studio', description: '', reason: '', wardrobe_index: 2, retailer_hint: '', price_point: '', wardrobe_match: { id: 'w3', label: 'Barrel-leg jeans', image_url: null, color: 'Navy' } },
    { name: 'Flat leather sandals', tier: 'The Hardware', category: 'Shoes', brand: 'Studio', description: '', reason: '', wardrobe_index: 3, retailer_hint: '', price_point: '', wardrobe_match: { id: 'w4', label: 'Flat leather sandals', image_url: null, color: 'Camel' } },
    { name: 'Tan leather slides', tier: 'The Hardware', category: 'Shoes', brand: 'Studio', description: '', reason: '', wardrobe_index: 4, retailer_hint: '', price_point: '', wardrobe_match: { id: 'w5', label: 'Tan leather slides', image_url: null, color: 'Camel' } },
    { name: 'Storm shell jacket', tier: 'The Hardware', category: 'Outerwear', brand: 'Arket', description: '', reason: '', wardrobe_index: -1, retailer_hint: 'Arket', price_point: '€180' },
  ],
  left_behind: [],
  looks: [
    { occasion: 'Night out', title: 'Coast after dark', how: 'Silk over denim, slides for the walk back.', pins: [0, 1], overrides: {}, slotOverrides: {},
      formula: [ { role: 'The Anchor', item_index: 0, note: 'Worn open over the tank' }, { role: 'The Canvas', item_index: 2, note: 'Rolled once at the hem' }, { role: 'The Exclamation Point', item_index: 4, note: 'Bare ankle, gold hardware' } ] },
    { occasion: 'Beach day', title: 'Tide-line morning', how: 'The tank and jeans, sandals in hand.', pins: [0], overrides: {}, slotOverrides: {},
      formula: [ { role: 'The Anchor', item_index: 1, note: 'Tucked loosely' }, { role: 'The Canvas', item_index: 2, note: 'Cuffed to the shin' }, { role: 'The Exclamation Point', item_index: 3, note: 'Off more than on' } ] },
    { imported: true, lookId: 'lk-9', occasion: 'Dinner out', title: 'The Thursday one', how: '', img: null, pins: [1], overrides: {}, slotOverrides: {},
      pieces: [ { name: 'Cream silk shirt', image: null }, { name: 'Barrel-leg jeans', image: null } ], formula: [] },
  ],
};

const LEGACY = {
  trip_label: 'IBIZA · MAY', headline: 'Ibiza, the old way.', location_vibe: '', stylist_summary: '', suitcase_note: '',
  palette: [], destination: 'Ibiza', dateFrom: '2026-05-04', dateTo: '2026-05-06', dateLine: '4 – 6 May',
  capsule: FIXTURE.capsule.slice(0, 5), left_behind: [],
  days: [
    { day_label: 'Day 1 · Arrival', slots: [ { slot: 'Day', title: 'Landing look', how: '', formula: [{ role: 'The Anchor', item_index: 0, note: '' }, { role: 'The Canvas', item_index: 2, note: '' }] },
      { slot: 'Evening', title: 'First dinner', how: '', formula: [{ role: 'The Anchor', item_index: 1, note: '' }, { role: 'The Exclamation Point', item_index: 4, note: '' }] } ] },
  ],
};

let pass = 0, fail = 0;
const ok = (cond, name) => { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + name); } };

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1200 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('  [pageerror]', e.message));

await page.route('**cdn.jsdelivr.net/**', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: SUPA_STUB }));
await page.route('**ayowpaknssulsqqvwpqx.supabase.co/**', (r) => {
  const u = r.request().url(); const m = r.request().method();
  if (m !== 'GET') return r.fulfill({ status: 201, contentType: 'application/json', body: '[]' });
  let body = '[]';
  if (u.includes('wardrobe_items')) body = JSON.stringify(WARDROBE);
  return r.fulfill({ status: 200, contentType: 'application/json', body });
});
await page.route('**nominatim**', (r) => r.abort());
await page.route('**open-meteo**', (r) => r.abort());
await page.addInitScript(() => {
  window.__TEST_PROFILE = { first_name: 'Annie', style_icons: [], style_dna: {}, wardrobe_items_count: 5, onboarded_at: '2026-07-01', gender_identity: 'woman' };
  Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true });
});

await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle' });
await page.waitForFunction(() => typeof window.__tvRenderResult === 'function', null, { timeout: 15000 });
await page.waitForTimeout(800);

// ── 1. Render + default tab ──
await page.evaluate((fx) => window.__tvRenderResult(fx), FIXTURE);
await page.waitForTimeout(300);
ok(await page.locator('#tv-result-page .tvm-seg button').count() === 3, 'seg control has 3 tabs');
ok(await page.locator('#tv-tab-looks.on').count() === 1, 'opens on Looks');
ok(await page.locator('#tv-pane-looks').isVisible(), 'looks pane visible');
ok(!(await page.locator('#tv-pane-days').isVisible()), 'days pane hidden');

// ── 2. Look console (dayless) ──
ok(await page.locator('#tv-look-console .rbc-panel').count() === 1, 'look console draws The Look panel');
ok(await page.locator('#tv-look-console .rbc-row').count() === 3, 'look rack has 3 rows');
ok((await page.locator('#tv-look-console .rbc-rackhead').innerText()).toLowerCase().includes('night out'), 'rack label carries the occasion');
ok(await page.locator('#tv-look-console .rbc-hbtn', { hasText: 'Pin to days' }).count() === 1, 'dayless head has Pin to days');
ok((await page.locator('#tv-look-console').innerText()).includes('Pinned to Day 1 · Day 2'), 'pins line reads');

// select the imported look → reader, not console
await page.evaluate(() => window.__tvSelectLook(2));
await page.waitForTimeout(150);
ok((await page.locator('#tv-look-console').innerText()).toLowerCase().includes('travels as styled'), 'imported look reads as packed whole');
ok(await page.locator('#tv-look-console .rbc-panel').count() === 0, 'imported look gets no interactive console');

// ── 3. Days tab: day console + multi-look switcher ──
await page.evaluate(() => window.__tvSelectDay(0));
await page.waitForTimeout(200);
ok(await page.locator('#tv-tab-days.on').count() === 1, 'day select lands the Days tab');
ok(await page.locator('#tv-pane-days').isVisible(), 'days pane visible');
ok(await page.locator('#tv-weekstrip .rb-dc, #tv-weekstrip .rbd-day').first().isVisible(), 'day strip renders');
ok(await page.locator('#tv-day-console .rbc-panel').count() === 1, 'day console draws The Look panel');
const segTxt = await page.locator('#tv-day-console').innerText();
ok(segTxt.includes('NIGHT OUT') && segTxt.includes('BEACH DAY'), 'two pinned looks tab like Day/Evening');
ok(await page.locator('#tv-day-console .rbc-hbtn', { hasText: 'Unpin from this day' }).count() === 1, 'day head has Unpin');
await page.evaluate(() => window.__tvDaySetLook(1));
await page.waitForTimeout(150);
ok((await page.locator('#tv-day-console .rbc-rackhead').innerText()).includes('Tide-line morning'), 'switcher swaps to the second look');

// ── 4. Scoped flick from the day console ──
await page.evaluate(() => window.__tvDaySetLook(0));
await page.waitForTimeout(120);
await page.locator('#tv-day-console .rbc-row').nth(2).locator('.rbc-arrow').nth(1).click();
await page.waitForTimeout(200);
const ovr = await page.evaluate(() => JSON.parse(JSON.stringify(window.__lastTvData.looks[0].overrides || {})));
ok(ovr['0'] && Number.isInteger(ovr['0']['2']), 'day flick writes a Day-1-only override');
ok((await page.locator('#tv-day-console').innerText()).toLowerCase().includes('swapped for day 1 only'), 'scope badge renders');
const day2Clean = await page.evaluate(() => !window.__lastTvData.looks[0].overrides[1]);
ok(day2Clean, 'the other pinned day is untouched');
// the look console shows the look-level piece, badge-free
await page.evaluate(() => window.__tvSelectLook(0));
await page.waitForTimeout(150);
ok(!(await page.locator('#tv-look-console').innerText()).toLowerCase().includes('swapped for day'), 'look console carries no day badge');

// ── 5. Free day invitation ──
await page.evaluate(() => window.__tvSelectDay(3));
await page.waitForTimeout(150);
const freeTxt = await page.locator('#tv-day-console').innerText();
ok(/left free/.test(freeTxt), 'free day reads left free');
ok(/style a look for this day/i.test(freeTxt), 'free day offers styling');

// ── 6. Rack pane survives ──
await page.evaluate(() => window.__tvSetTab('rack'));
await page.waitForTimeout(150);
ok(await page.locator('#tv-pane-rack').isVisible(), 'rack pane opens');
ok((await page.locator('#tv-pane-rack').innerText()).includes('Keep'), 'Keep section renders');
ok((await page.locator('#tv-pane-rack').innerText()).includes('Worth adding'), 'Worth adding renders');

// ── 7. Legacy save migrates ──
await page.evaluate((fx) => window.__tvRenderResult(fx, { skipSave: true, savedId: null }), LEGACY);
await page.waitForTimeout(250);
const mig = await page.evaluate(() => ({ n: window.__lastTvData.looks.length, occ: window.__lastTvData.looks.map(l => l.occasion), pins: window.__lastTvData.looks.map(l => l.pins) }));
ok(mig.n === 2, 'legacy day slots become 2 looks');
ok(mig.pins.every(p => p.length === 1 && p[0] === 0), 'both pinned to their old day');
await page.evaluate(() => window.__tvSelectDay(0));
await page.waitForTimeout(150);
ok(await page.locator('#tv-day-console .rbc-panel').count() === 1, 'migrated day renders the console');

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
server.kill();
process.exit(fail ? 1 : 0);
