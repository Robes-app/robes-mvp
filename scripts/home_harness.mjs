// Home harness — boots the real dashboard against a Supabase stub at each
// activation stage and asserts the modular home (Homepage_Modules.dc.html,
// 2026-10-11): the resolver's five stages, each module's anatomy, the
// G1 map, the snooze, the alerts, the week strip's selected-day card, the
// placeholder and the 390 column. Replaces ftue_harness.mjs.
//   npm i --no-save playwright && node scripts/home_harness.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const ROOT = new URL('..', import.meta.url).pathname;
const PORT = 4321;
const BASE = `http://127.0.0.1:${PORT}`;
const server = spawn('node', ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), NODE_ENV: 'test' }, stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((res) => { const on = (b) => { if (String(b).includes('listening') || String(b).includes(String(PORT))) res(); }; server.stdout.on('data', on); server.stderr.on('data', on); setTimeout(res, 2500); });

const SUPA_STUB = `
window.supabase = { createClient(){
  const sess = { user: { id: 'u-test', email: 't@t.co' }, access_token: 'tok' };
  const q = () => ({ select(){ return this; }, eq(){ return this; }, order(){ return this; },
    single(){ return Promise.resolve({ data: window.__TEST_PROFILE, error: null }); },
    then(r){ return Promise.resolve({ data: [], error: null }).then(r); } });
  return { auth: { onAuthStateChange(){ return { data: { subscription: { unsubscribe(){} } } }; }, getSession(){ return Promise.resolve({ data: { session: sess } }); }, signOut(){ return Promise.resolve({}); } }, from(){ return q(); } };
} };`;

const ISO = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const TODAY = ISO(new Date());
const TOMORROW = ISO(new Date(Date.now() + 86400000));
function wardrobe(n, pics) {
  const cats = ['Tops', 'Bottoms', 'Shoes', 'Outerwear'];
  return Array.from({ length: n }, (_, i) => ({ id: 'w' + i, user_id: 'u-test', label: 'Piece ' + (i + 1), category: cats[i % 4], color: 'Black', brand: '', notes: '',
    image_url: i < pics ? 'https://img.test/w' + i + '.jpg' : null, times_worn: i, item_dna: {}, hero_position: i === 2 ? 1 : null, created_at: new Date(Date.now() - i * 3600000).toISOString() }));
}
const LOOK = (id, o = {}) => Object.assign({ id, name: 'The ' + id + ' one', name_provisional: false, note: '', photo_url: null, tags: null, climate_band: 'year_round', climate_source: 'derived', source: 'manual', origin_look_id: null, created_at: '2026-08-05T10:00:00.000Z', pieces: [{ id: 'w0', slot: 'Top', position: 0, role: null }, { id: 'w1', slot: 'Bottom', position: 1, role: null }], wears: [], proposals: null }, o);
const PLANNED = (lookId, date) => ({ user_id: 'u-test', source_type: 'look', source_id: lookId, day_index: 0, slot: 'day', day_date: date, status: 'planned', activity: 'Office', headline: 'The ' + lookId + ' one', item_ids: ['w0', 'w1'], thumb_urls: [], updated_at: new Date().toISOString(), created_at: new Date().toISOString() });

// n pieces (pics photographed) · dna · model (a kept model) · looks[] · planned[] · inbox[] · name · snooze
async function boot(browser, { n = 1, pics = 1, dna = {}, icons = [], model = false, looks = [], planned = [], inbox = null, name = 'Annie', snooze = null, width = 1280, hour = null } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 1100 }, hasTouch: width < 768 });
  const page = await ctx.newPage();
  const posts = { style: [], daily: [], events: [] };
  await page.route('**img.test/**', (r) => r.abort());
  await page.route('**/api/style', (r) => { try { posts.style.push(r.request().postDataJSON()); } catch (_) {}
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ways: [{ title: 'One' }, { title: 'Two' }, { title: 'Three' }], generatedImages: [], fallback: false }) }); });
  await page.route('**/api/daily', (r) => { try { posts.daily.push(r.request().postDataJSON()); } catch (_) {} r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); });
  await page.route('**/api/alternates', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"alternates":[]}' }));
  await page.route('**/api/lookbuild/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await page.route('**/api/avatar/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await page.route('**cdn.jsdelivr.net/**', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: SUPA_STUB }));
  // planned_days is STATEFUL: an upsert the app posts comes back on the
  // next read (the server's own behaviour — the rail refetches after a pin,
  // and a stub that forgot the row reverted a wear it had just logged).
  const pd = planned.map((r) => Object.assign({}, r));
  const pdKey = (r) => [r.source_id, r.day_date, r.slot || 'day'].join('|');
  await page.route('**ayowpaknssulsqqvwpqx.supabase.co/**', (r) => {
    const u = r.request().url(), m = r.request().method();
    if (m === 'POST' && u.includes('/events')) { try { posts.events.push(r.request().postDataJSON()); } catch (_) {} }
    if (m === 'POST' && u.includes('planned_days')) { try { const rows = r.request().postDataJSON(); (Array.isArray(rows) ? rows : [rows]).forEach((row) => { const i = pd.findIndex((x) => pdKey(x) === pdKey(row)); if (i > -1) pd[i] = Object.assign({}, pd[i], row); else pd.push(row); }); } catch (_) {} }
    let body = '[]';
    if (u.includes('wardrobe_items')) body = JSON.stringify(wardrobe(n, pics));
    else if (u.includes('planned_days') && m === 'GET') body = JSON.stringify(pd);
    else if (u.includes('wardrobe_inbox')) body = inbox ? JSON.stringify(inbox) : JSON.stringify({ message: 'relation "public.wardrobe_inbox" does not exist', code: '42P01' });
    return r.fulfill({ status: (u.includes('wardrobe_inbox') && !inbox) ? 404 : 200, contentType: 'application/json', body });
  });
  await page.route('**nominatim**', (r) => r.abort());
  await page.route('**open-meteo**', (r) => r.abort());
  await page.addInitScript(({ n, dna, icons, model, looks, name, snooze, hour }) => {
    localStorage.setItem('rb_prompt_box', 'on');
    window.__TEST_PROFILE = { first_name: name, last_name: '', mobile: '', style_icons: icons, budget: null, wardrobe_description: '', style_dna: dna, wardrobe_items_count: n, onboarded_at: '2026-07-01', gender_identity: 'woman', notification_prefs: {} };
    if (model) localStorage.setItem('rb_model__u-test', JSON.stringify({ skin: 3, hair: 1, nudges: {}, kept: true, gender: 'woman', v: 2 }));
    if (looks.length) localStorage.setItem('rb_looks__u-test', JSON.stringify(looks));
    if (snooze) localStorage.setItem('rb_home_snooze__u-test', JSON.stringify(snooze));
    if (hour != null) { const D = Date; const fixed = new D(); fixed.setHours(hour, 0, 0, 0); const t = fixed.getTime();
      window.Date = class extends D { constructor(...a) { super(...(a.length ? a : [t])); } static now() { return t; } }; }
    Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true });
  }, { n, dna, icons, model, looks, name, snooze, hour });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2600);
  return { ctx, page, errs, posts };
}
const results = [];
const check = (name, pass, detail = '') => results.push({ name, pass, detail });
const report = () => { const pass = results.filter((r) => r.pass).length; results.forEach((r) => { if (!r.pass) console.log('  ✗ ' + r.name + (r.detail ? '\n      ' + r.detail : '')); }); console.log(`\n${pass}/${results.length} checks passed`); };
process.on('uncaughtException', (e) => { console.log('CRASH: ' + String(e).slice(0, 400)); report(); try { server.kill(); } catch (_) {} process.exit(1); });
const tap = async (page, sel) => { try { await page.click(sel, { timeout: 4000 }); return true; } catch (e) { check('tap ' + sel, false, String(e).slice(0, 120)); return false; } };
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});

const read = (page) => page.evaluate(() => {
  const dash = document.getElementById('dash');
  const vis = (el) => !!el && el.offsetParent !== null;
  const order = Array.from(dash.children).filter((el) => vis(el) && el.innerHTML.trim()).map((el) => el.id || el.className.split(' ')[0]);
  const card = document.getElementById('rb-onb-card');
  return {
    mode: dash.getAttribute('data-home'), stage: dash.getAttribute('data-stage'), order,
    next: card?.getAttribute('data-next') || null,
    ey: card?.querySelector('.ey')?.textContent || '', h3: card?.querySelector('h3')?.textContent.replace(/\s+/g, ' ').trim() || '',
    cta: Array.from(card?.querySelectorAll('.rb-ob-cta') || []).map((b) => b.textContent.trim()), later: !!card?.querySelector('.rb-ob-later'),
    rows: Array.from(document.querySelectorAll('#rb-onb-list .rb-onb-row')).map((r) => r.dataset.step + ':' + r.dataset.state + ':' + r.querySelector('.l').textContent),
    listHead: document.querySelector('#rb-onb-list .hd')?.textContent || null,
    alerts: Array.from(document.querySelectorAll('#rb-alerts .rb-al')).map((a) => a.dataset.kind + ':' + a.querySelector('.ey').textContent + ':' + a.querySelector('.t').textContent),
    rail: vis(document.getElementById('rb-rail')), sn: vis(document.getElementById('rb-sn')), insp: vis(document.getElementById('rb-insp-row')),
    hb: vis(document.getElementById('rb-hb')), wtrk: vis(document.getElementById('wtrk')), svc: vis(document.querySelector('.services')),
    gone: ['rb-gtky', 'rb-twin-card', 'rb-model-door', 'rb-notes-door', 'rb-firstlook', 'rb-ftu-rows', 'rb-today'].filter((id) => document.getElementById(id)),
    ink: Array.from(dash.querySelectorAll('button')).filter((b) => vis(b) && getComputedStyle(b).backgroundColor === 'rgb(32, 32, 33)').map((b) => b.className || b.id),
    greet: document.getElementById('dash-greet')?.textContent, echo: document.querySelector('.dash-echo')?.textContent,
    dashW: Math.round(dash.getBoundingClientRect().width), overflow: document.documentElement.scrollWidth > window.innerWidth,
    ph: document.querySelector('#rb-hb #rb-lp textarea')?.placeholder || document.querySelector('#rb-hb .rb-lp-field .ph')?.textContent || '',
    slot: !!document.querySelector('#rb-lp-slot.on'),
  };
});

// ── Stage 1 · just arrived: one piece, nothing else ──
{
  const { ctx, page, errs } = await boot(browser, { n: 1, pics: 1 });
  const s = await read(page);
  check('stage 1 · no page errors', errs.length === 0, errs.join(' | ').slice(0, 300));
  check('stage 1 · the resolver reads stage 1, onboarding', s.mode === 'onboarding' && s.stage === '1', JSON.stringify([s.mode, s.stage]));
  check('stage 1 · O1 Style DNA is the expanded card', s.next === 'O1' && s.ey === 'Next · Style DNA' && s.h3 === 'Your style, in brief.', JSON.stringify([s.next, s.ey, s.h3]));
  check('stage 1 · the order is masthead → the box → O1 → G1 (nothing else on the page)', JSON.stringify(s.order) === JSON.stringify(['dash-mast', 'rb-hb', 'rb-onb-card', 'rb-onb-list']), JSON.stringify(s.order));
  check('stage 1 · G1 holds the other three steps, all open, no counts', JSON.stringify(s.rows) === JSON.stringify(['O2:later:Two photographs', 'O3:later:One piece filed', 'O4:later:From your own pieces']) && s.listHead === 'Getting to know you', JSON.stringify(s.rows));
  check('stage 1 · the empty O1 is one door: Log your style notes, Later quiet beneath', s.cta.join() === 'Log your style notes' && s.later, JSON.stringify(s.cta));
  const o1 = await page.evaluate(() => { const b = document.querySelector('#rb-onb-card .rb-ob-cta'); const card = document.querySelector('#rb-onb-card .rb-ob-body'); return { rows: document.querySelectorAll('#rb-onb-card .rb-ob-row').length, full: b && card ? Math.round(b.getBoundingClientRect().width) >= Math.round(card.getBoundingClientRect().width) - 41 : false, buttons: document.querySelectorAll('#rb-onb-card button').length }; });
  check('stage 1 · no empty + Add rows; the CTA runs the card width; two buttons in all', o1.rows === 0 && o1.full && o1.buttons === 2, JSON.stringify(o1));
  check('stage 1 · the retired modules are gone: #wtrk, the band, the door card, the question cards, the model door', !s.wtrk && !s.svc && s.gone.length === 0, JSON.stringify([s.wtrk, s.svc, s.gone]));
  check('stage 1 · the O1 CTA is the one ink fill on home', JSON.stringify(s.ink) === JSON.stringify(['rb-ob-cta rb-ob-one']), JSON.stringify(s.ink));
  // the CTA walks into Settings
  await page.route('**/settings?walk=1', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<html></html>' }));
  await Promise.all([page.waitForURL('**/settings?walk=1', { waitUntil: 'commit' }), tap(page, '#rb-onb-card .rb-ob-one')]);
  check('stage 1 · Log your style notes → /settings?walk=1', /\/settings\?walk=1$/.test(page.url()), page.url());
  await page.goBack({ waitUntil: 'commit' }); await page.waitForSelector('#rb-onb-card .rb-ob', { timeout: 15000 });
  check('stage 1 · the greeting and the standing question', /^Good (morning|afternoon|evening), Annie\.$/.test(s.greet) && s.echo === 'What are you dressing for today?', JSON.stringify([s.greet, s.echo]));
  check('stage 1 · the box reads A new look for… while onboarding', s.ph === 'A new look for…', s.ph);
  check('stage 1 · the floating sparkle is hidden while the box is on screen', !s.slot, String(s.slot));
  check('stage 1 · one column at 640 on the desktop', s.dashW <= 640 + 160 + 2 && s.dashW >= 640, String(s.dashW));
  // Later snoozes O1 for the day → O2 leads, O1 joins the map as open
  await tap(page, '#rb-onb-card .rb-ob-later'); await page.waitForTimeout(300);
  const s2 = await read(page);
  check('stage 1 · Later snoozes O1: O2 leads, O1 is a row in the map', s2.next === 'O2' && s2.rows[0] === 'O1:later:A brand, an icon, a style', JSON.stringify([s2.next, s2.rows]));
  const snz = await page.evaluate(() => JSON.parse(localStorage.getItem('rb_home_snooze__u-test') || '{}'));
  check('stage 1 · the snooze is per device, 24h', typeof snz.O1 === 'number', JSON.stringify(snz));
  // a G1 row she taps expands that module in place
  await tap(page, '#rb-onb-list .rb-onb-row[data-step="O4"]'); await page.waitForTimeout(300);
  const s3 = await read(page);
  check('stage 1 · tapping an open row expands that module for the session', s3.next === 'O4' && s3.rows.some((r) => r.indexOf('O2:later') === 0), JSON.stringify([s3.next, s3.rows]));
  const ev = await page.evaluate(() => (window.__rbTestEvents || []));
  await ctx.close();
}
// ── Stage 1 · one row noted: the rows carry her chips, the CTA finishes ──
{
  const { ctx, page, errs } = await boot(browser, { n: 1, pics: 1, dna: { brands: ['The Row'] } });
  const s = await read(page);
  const o1 = await page.evaluate(() => Array.from(document.querySelectorAll('#rb-onb-card .rb-ob-row')).map((r) => r.querySelector('.k').textContent + '=' + r.querySelector('.chips').textContent.trim()));
  check('stage 1 · part-filled O1 keeps the rows with her chips + Finish my style', s.next === 'O1' && JSON.stringify(o1) === JSON.stringify(['Brands=The Row', 'Icons=+ Add', 'Styles=+ Add']) && s.cta.join() === 'Finish my style', JSON.stringify([s.next, o1, s.cta, errs.slice(0, 1)]));
  await ctx.close();
}
// ── Stage 2 · style noted (two rows), no model → O2 ──
{
  const { ctx, page, errs } = await boot(browser, { n: 1, pics: 1, dna: { brands: ['The Row'] }, icons: ['Sienna Miller'] });
  const s = await read(page);
  check('stage 2 · no page errors', errs.length === 0, errs.join(' | ').slice(0, 300));
  check('stage 2 · two rows filled confirm Style DNA; O2 the twin leads', s.stage === '2' && s.next === 'O2' && s.ey === 'Next · Your digital twin' && s.h3 === 'Two photographs, one model of you.', JSON.stringify([s.stage, s.next, s.ey, s.h3]));
  const slots = await page.evaluate(() => Array.from(document.querySelectorAll('#rb-onb-card .rb-ob-slots .sl')).map((b) => [b.textContent.trim(), getComputedStyle(b).borderTopStyle, b.tagName]));
  check('stage 2 · two dashed slots, each a tap target', slots.length === 2 && slots.every((x) => x[1] === 'dashed' && x[2] === 'BUTTON') && slots.map((x) => x[0]).join() === 'Close-up,Full length', JSON.stringify(slots));
  check('stage 2 · Add photographs + Later', s.cta.join() === 'Add photographs' && s.later, JSON.stringify(s.cta));
  check('stage 2 · G1: style done (✓, past tense), the wardrobe and the look open', JSON.stringify(s.rows) === JSON.stringify(['O1:done:Filed under Style DNA', 'O3:later:One piece filed', 'O4:later:From your own pieces']), JSON.stringify(s.rows));
  await ctx.close();
}
// ── Stage 3 · twin made, fewer than five photographed pieces → O3 ──
{
  const { ctx, page, errs } = await boot(browser, { n: 4, pics: 4, dna: { confirmed_at: '2026-10-11T10:00:00Z' }, model: true });
  const s = await read(page);
  check('stage 3 · no page errors', errs.length === 0, errs.join(' | ').slice(0, 300));
  check('stage 3 · confirmed_at alone confirms the style; the model on file retires the twin; O3 leads', s.stage === '3' && s.next === 'O3' && s.ey === 'Next · Your wardrobe', JSON.stringify([s.stage, s.next, s.ey]));
  check('stage 3 · the count once, in words, inside the headline', s.h3 === 'Four pieces filed. The rest in one go.', s.h3);
  const o3 = await page.evaluate(() => ({ thumbs: document.querySelectorAll('#rb-onb-card .rb-ob-thumbs .th:not(.add)').length, add: !!document.querySelector('#rb-onb-card .rb-ob-thumbs .th.add'),
    routes: Array.from(document.querySelectorAll('#rb-onb-card .rb-ob-route')).map((r) => r.dataset.route + ':' + r.querySelector('.t').textContent), ladder: Array.from(document.querySelectorAll('.rb-ms, #rb-svc-learn, .wtrk-num')).some((e) => e.offsetParent !== null) }));
  check('stage 3 · the last four filed as thumbnails + one dashed add slot', o3.thumbs === 4 && o3.add, JSON.stringify(o3));
  check('stage 3 · the Snap route alone (the receipt row waits on migration 23); no ladder, no rungs, no big number', JSON.stringify(o3.routes) === JSON.stringify(['snap:Snap several at once']) && !o3.ladder, JSON.stringify(o3));
  check('stage 3 · G1: style ✓, twin ✓, the look open', JSON.stringify(s.rows) === JSON.stringify(['O1:done:Filed under Style DNA', 'O2:done:Your model is on file', 'O4:later:From your own pieces']), JSON.stringify(s.rows));
  // Snap opens the add flow on its photo step
  await tap(page, '#rb-onb-card .rb-ob-route[data-route="snap"]'); await page.waitForTimeout(500);
  const snap = await page.evaluate(() => ({ modal: !!document.querySelector('#wa-modal.open, .fm.open, [id^="wa-"].open'), file: !!document.getElementById('wa-rb-file'), chooser: !!document.querySelector('.rb-wf-dt, .rb-wf-mb') }));
  check('stage 3 · Snap several at once opens the add flow on the photo step', snap.file && snap.chooser, JSON.stringify(snap));
  await ctx.close();
}
// ── Stage 4 · five photographed pieces, no look of hers → O4 ──
{
  const { ctx, page, errs } = await boot(browser, { n: 6, pics: 6, dna: { confirmed_at: '2026-10-11T10:00:00Z' }, model: true, looks: [LOOK('deck', { proposals: [{ role: 'The Canvas', opts: [{ name: 'A shirt' }], oi: 0 }] })] });
  const s = await read(page);
  check('stage 4 · no page errors', errs.length === 0, errs.join(' | ').slice(0, 300));
  check('stage 4 · a saved look carrying proposals does not count as hers; O4 leads', s.stage === '4' && s.next === 'O4' && s.ey === 'Next · Your first look' && s.h3 === 'Pick a piece, Robes dresses it.', JSON.stringify([s.stage, s.next, s.ey, s.h3]));
  const o4 = await page.evaluate(() => ({ picks: Array.from(document.querySelectorAll('#rb-onb-card .rb-ob-pick')).map((b) => b.dataset.pick + (b.classList.contains('on') ? '*' : '')), cta: document.querySelector('#rb-onb-card .rb-ob-cta')?.textContent, all: document.querySelector('#rb-onb-card .rb-ob-later')?.textContent }));
  check('stage 4 · three candidates, the hero first and pre-selected, then the least worn', JSON.stringify(o4.picks) === JSON.stringify(['w2*', 'w0', 'w1']), JSON.stringify(o4.picks));
  check('stage 4 · Build the look + All pieces ›', o4.cta === 'Build the look' && o4.all === 'All pieces ›', JSON.stringify(o4));
  check('stage 4 · the Saved looks row renders beneath (it has data)', s.sn && s.order.indexOf('rb-sn') > s.order.indexOf('rb-onb-list'), JSON.stringify(s.order));
  await tap(page, '#rb-onb-card .rb-ob-pick[data-pick="w1"]'); await page.waitForTimeout(150);
  const pk = await page.evaluate(() => Array.from(document.querySelectorAll('#rb-onb-card .rb-ob-pick.on')).map((b) => b.dataset.pick));
  check('stage 4 · a tap moves the pick', pk.join() === 'w1', pk.join());
  await tap(page, '#rb-onb-card .rb-ob-cta'); await page.waitForTimeout(2200);
  const b = await page.evaluate(() => ({ composer: !!document.querySelector('#sn-page .rb-lk-composer'), snOpen: document.getElementById('sn-page')?.style.display !== 'none',
    names: Array.from(document.querySelectorAll('#sn-page .rbc-rack .rbc-name')).map((n) => n.textContent.trim()), roles: Array.from(document.querySelectorAll('#sn-page .rbc-rack .rbc-ctx .role, #sn-page .rbc-rack .rbc-eye')).map((n) => n.textContent.trim()),
    props: document.querySelectorAll('#sn-page .rb-lk-shop, #sn-page .rbc-row.rb-lk-shop').length, band: document.querySelector('#sn-page .rb-ret .rb-ret-back, #sn-page .rb-ret button')?.textContent.trim() }));
  check('stage 4 · Build the look opens the composer with her pick on the rack and the rest filled from hers, nothing proposed', b.snOpen && b.composer && b.names.indexOf('Piece 2') > -1 && b.names.length >= 3 && b.props === 0, JSON.stringify(b));
  const ev = await page.evaluate(() => null);
  await ctx.close();
}
// ── Stage 5 · activated: a look from hers + five pieces ──
{
  const planned = [PLANNED('mine', TODAY)];
  const { ctx, page, errs } = await boot(browser, { n: 6, pics: 6, dna: { confirmed_at: '2026-10-11T10:00:00Z' }, model: true, looks: [LOOK('mine')], planned });
  const s = await read(page);
  check('stage 5 · no page errors', errs.length === 0, errs.join(' | ').slice(0, 300));
  check('stage 5 · activated: the daily layout — masthead, the box, the week, the looks; no card, no map', s.mode === 'activated' && s.stage === '5' && JSON.stringify(s.order) === JSON.stringify(['dash-mast', 'rb-hb', 'rb-rail', 'rb-sn']), JSON.stringify([s.mode, s.stage, s.order]));
  check('stage 5 · the placeholder reads the contextual line', s.ph === 'Tell Robes where you’re going, or the look you’re after…', s.ph);
  const r = await page.evaluate(() => ({ cells: document.querySelectorAll('#rb-rail .rb-wk').length, sel: document.querySelector('#rb-rail .rb-wk.is-sel')?.dataset.date, today: document.querySelector('#rb-rail .rb-wk.is-today .rb-wk-l')?.textContent,
    card: (() => { const c = document.querySelector('#rb-rail-day .rb-dayc'); return c ? [c.dataset.state, c.querySelector('.ey')?.textContent, c.querySelector('.nm')?.textContent, c.querySelector('.ar')?.textContent] : null; })(),
    underStrip: (() => { const row = document.querySelector('#rb-rail .rb-rail-row'); return !!row && row.nextElementSibling?.id === 'rb-rail-day'; })(),
    todayAbove: !!document.getElementById('rb-today') }));
  check('stage 5 · seven cells, today selected and labelled Today', r.cells === 7 && r.sel === new Date().toISOString().slice(0, 10) && r.today === 'Today', JSON.stringify(r));
  check('stage 5 · the planned card sits under the strip: Today · the look · →, and the old card above the prompt is gone', r.underStrip && r.card && r.card[0] === 'planned' && r.card[1] === 'Today' && r.card[2] === 'The mine one' && r.card[3] === '→' && !r.todayAbove, JSON.stringify(r));
  // tap tomorrow → the card swaps to a dashed Dress {weekday}
  await tap(page, '#rb-rail .rb-wk:nth-child(2)'); await page.waitForTimeout(300);
  const r2 = await page.evaluate(() => { const c = document.querySelector('#rb-rail-day .rb-dayc'); return { sel: document.querySelector('#rb-rail .rb-wk.is-sel')?.textContent.trim(), state: c?.dataset.state, nm: c?.querySelector('.nm')?.textContent, ey: c?.querySelector('.ey')?.textContent, dashed: c ? getComputedStyle(c).borderTopStyle : null }; });
  const wd = new Date(Date.now() + 86400000).toLocaleDateString('en-GB', { weekday: 'long' });
  check('stage 5 · tapping another day swaps the card: dashed, Dress {weekday}', r2.state === 'empty' && r2.nm === 'Dress ' + wd && r2.ey === wd && r2.dashed === 'dashed', JSON.stringify(r2));
  await tap(page, '#rb-rail-day .rb-dayc'); await page.waitForTimeout(500);
  const box = await page.evaluate(() => ({ open: !!document.querySelector('#rb-lp.rb-lp-dock, #rb-hb #rb-lp'), label: document.querySelector('#rb-lp')?.getAttribute('aria-label') || '' }));
  check('stage 5 · Dress {weekday} opens the box on that date (the deck, never the composer)', box.open, JSON.stringify(box));
  await ctx.close();
}
// ── Stage 5 at 19:00 · Wore it? on today's planned card ──
{
  const { ctx, page, errs } = await boot(browser, { n: 6, pics: 6, dna: { confirmed_at: '2026-10-11T10:00:00Z' }, model: true, looks: [LOOK('mine')], planned: [PLANNED('mine', TODAY)], hour: 20 });
  const w = await page.evaluate(() => ({ wear: document.querySelector('#rb-rail-day .rb-dayc .wx.wear')?.textContent || null }));
  check('wore it · after 19:00 the meta line reads Wore it? Tap to log', w.wear === 'Wore it? Tap to log', JSON.stringify([w, errs.slice(0, 1)]));
  await tap(page, '#rb-rail-day .rb-dayc .wx.wear'); await page.waitForTimeout(400);
  const w2 = await page.evaluate(() => ({ wx: document.querySelector('#rb-rail-day .rb-dayc .wx')?.textContent, state: document.querySelector('#rb-rail-day .rb-dayc')?.dataset.state }));
  check('wore it · the tap logs the wear and the card settles to Worn ✓', w2.wx === 'Worn ✓' && w2.state === 'planned', JSON.stringify(w2));
  await ctx.close();
}
// ── Activated with O1 open → G1 collapses to one row at the foot ──
{
  const { ctx, page, errs } = await boot(browser, { n: 6, pics: 6, model: true, looks: [LOOK('mine')] });
  const s = await read(page);
  check('activated · an open O1 is one quiet row at the foot, no header', s.mode === 'activated' && s.order[s.order.length - 1] === 'rb-onb-list' && JSON.stringify(s.rows) === JSON.stringify(['O1:later:A brand, an icon, a style']) && s.listHead === null, JSON.stringify([s.order, s.rows, s.listHead]));
  await ctx.close();
}
// ── H1 · the receipt strip + the Robes-noticed line ──
{
  const inbox = [{ id: 'r1', retailer: 'Zara', received_at: new Date().toISOString(), status: 'held', items: Array.from({ length: 10 }, (_, i) => ({ label: 'Thing ' + i, image_url: i < 2 ? 'https://img.test/r' + i + '.jpg' : null })) }];
  const dna = { confirmed_at: '2026-10-11T10:00:00Z', brief: { pending: [{ list: 'loves', text: 'Columnar shapes, fluid fabrics, nothing that clings at the hip.', because: 'From 40 pieces' }] } };
  const { ctx, page, errs } = await boot(browser, { n: 6, pics: 6, dna, model: true, looks: [LOOK('a'), LOOK('b'), LOOK('c')], inbox });
  const s = await read(page);
  check('H1 · no page errors', errs.length === 0, errs.join(' | ').slice(0, 300));
  check('H1 · the receipt leads, the observation second; alerts sit after the masthead', s.alerts.length === 2 && s.alerts[0] === 'receipt:From your Zara receipt:Ten pieces read, ready to check.' && s.alerts[1].indexOf('observation:Robes noticed:') === 0 && s.order[1] === 'rb-alerts', JSON.stringify([s.alerts, s.order]));
  const ob = await page.evaluate(() => ({ line: document.querySelector('#rb-alerts .rb-al[data-kind="observation"] .t').textContent, acts: Array.from(document.querySelectorAll('#rb-alerts .rb-al[data-kind="observation"] .acts button')).map((b) => b.textContent), mosaic: document.querySelectorAll('#rb-alerts .rb-al[data-kind="receipt"] .th i').length, more: document.querySelector('#rb-alerts .rb-al[data-kind="receipt"] .th .n')?.textContent }));
  check('H1 · the observation is one short line (≤ 40) with Keep › and Not me as text', ob.line.length <= 41 && ob.line.endsWith('…') && ob.acts.join() === 'Keep ›,Not me', JSON.stringify(ob));
  check('H1 · the receipt mosaic: the pieces with photographs + a +N tile', ob.mosaic === 2 && ob.more === '+8', JSON.stringify(ob));
  await tap(page, '#rb-alerts .rb-al[data-kind="observation"] .acts button:first-child'); await page.waitForTimeout(400);
  const kept = await page.evaluate(() => ({ alerts: document.querySelectorAll('#rb-alerts .rb-al').length, rec: JSON.parse(localStorage.getItem('rb_twin_card__u-test') || 'null'), loves: (window.__robes_profile.style_dna.brief.loves || []).map((x) => x.text) }));
  check('H1 · Keep files the line under its list and the row goes for the day', kept.alerts === 1 && kept.rec && kept.rec.done && kept.loves.length === 1, JSON.stringify(kept));
  await tap(page, '#rb-alerts .rb-al[data-kind="receipt"] .acts button'); await page.waitForTimeout(600);
  const rv = await page.evaluate(() => ({ step: Array.from(document.querySelectorAll('.fm-step')).filter((e) => e.offsetParent !== null).map((e) => e.textContent.replace(/\s+/g, ' ').slice(0, 60)) }));
  check('H1 · Review › opens the receipt review where it already opens (one receipt → straight into it)', rv.step.length === 1 && /From Zara/.test(rv.step[0]) && /10 pieces read/.test(rv.step[0]), JSON.stringify(rv));
  await ctx.close();
}
// ── the email never prints as her name ──
{
  const { ctx, page } = await boot(browser, { n: 1, pics: 1, name: 'annie+test123@gmail.com' });
  const g = await page.evaluate(() => document.getElementById('dash-greet')?.textContent);
  check('H0 · a name typed as an email prints Good afternoon. alone', /^Good (morning|afternoon|evening)\.$/.test(g), g);
  await ctx.close();
}
// ── 390 ──
{
  const { ctx, page, errs } = await boot(browser, { n: 1, pics: 1, width: 390 });
  const s = await read(page);
  check('390 · no page errors, no horizontal overflow, O1 leads', errs.length === 0 && !s.overflow && s.next === 'O1', JSON.stringify([errs.slice(0, 1), s.overflow, s.next]));
  const { ctx: c2, page: p2 } = await boot(browser, { n: 6, pics: 6, dna: { confirmed_at: '2026-10-11T10:00:00Z' }, model: true, looks: [LOOK('mine')], planned: [PLANNED('mine', TODAY)], width: 390 });
  const s2 = await read(p2);
  const cells = await p2.evaluate(() => { const row = document.querySelector('#rb-rail .rb-rail-row'); return row ? row.scrollWidth <= row.clientWidth + 2 : null; });
  check('390 · the activated home fits: seven cells in one row, the card beneath', !s2.overflow && s2.rail && cells === true, JSON.stringify([s2.overflow, s2.rail, cells]));
  await ctx.close(); await c2.close();
}

await browser.close();
server.kill();
report();
process.exit(results.every((r) => r.pass) ? 0 : 1);
