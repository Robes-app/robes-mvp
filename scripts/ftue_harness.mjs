// Homescreen FTUE harness — boots the real dashboard with Supabase + REST
// stubbed, at each wardrobe piece count, and asserts the milestone/gating
// rules. Run manually: npm i --no-save playwright && node scripts/ftue_harness.mjs
// Set CHROME_PATH when playwright's bundled browser build isn't installed.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const ROOT = new URL('..', import.meta.url).pathname;
const PORT = 4321;
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

let WARDROBE_PICS = 0;   // the first N fixture pieces carry a photograph (slice 3.1 counts those)
function wardrobe(n) {
  const cats = ['Tops', 'Bottoms', 'Shoes', 'Outerwear'];
  return Array.from({ length: n }, (_, i) => ({
    id: 'w' + i, user_id: 'u-test', label: 'Piece ' + (i + 1),
    category: cats[i % 4], color: 'Black', brand: '', notes: '',
    image_url: i < WARDROBE_PICS ? 'https://img.test/w' + i + '.jpg' : null, times_worn: 0, item_dna: {}, hero_position: null,
    created_at: new Date().toISOString(),
  }));
}

// The learning card and the home Lookbook row only render once home has
// left its FTU states — zero looks shows the quiet index rows (W01/O1),
// exactly ONE look shows the O7 "Your looks" page (FTU simplification
// 2026-08-18). Seed TWO saved looks by default so the milestone rules below
// still have a card to assert against; pass looks:false for the zero state.
// prompt: 'box' | 'card' seeds the home field's per-device flag (phase 3).
// The box is the DEFAULT since 2026-10-01, so every section built on the
// prompt CARD seeds 'card' — pass prompt:null to boot on the live default;
// planned: planned_days rows the stub answers with; intent: the /api/intent
// answer; the boot records every /api/intent, /api/daily and /api/style post.
// gtky: 'done' seeds the three first-run steps as answered (a kept model, a
// style type, a styled key piece) so the legacy postures — zero-lead, the
// first look — can still be pinned; without it those postures are the
// Getting-to-know-you card (First Run v2, 2026-10-09).
async function boot(browser, n, width = 1280, { looks = true, pics = 0, prompt = 'card', planned = [], intent = null, gtky = null } = {}) {
  WARDROBE_PICS = pics;
  const ctx = await browser.newContext({ viewport: { width, height: 1100 }, hasTouch: width < 768 });
  const page = await ctx.newPage();
  const posts = { intent: [], daily: [], style: [] };
  await page.route('**img.test/**', (r) => r.abort());
  await page.route('**/api/intent', (r) => { try { posts.intent.push(r.request().postDataJSON()); } catch (_) { posts.intent.push(null); }
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(intent || { intent: 'unclear', confidence: 0.2 }) }); });
  await page.route('**/api/daily', (r) => { try { posts.daily.push(r.request().postDataJSON()); } catch (_) { posts.daily.push(null); }
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(HB_DAILY) }); });
  await page.route('**/api/style', (r) => { try { posts.style.push(r.request().postDataJSON()); } catch (_) { posts.style.push(null); }
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ways: [{ title: 'One' }, { title: 'Two' }, { title: 'Three' }], generatedImages: [], fallback: false }) }); });
  await page.route('**/api/avatar/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  if (prompt) await page.addInitScript((v) => { localStorage.setItem('rb_prompt_box', v === 'box' ? 'on' : 'off'); }, prompt);
  if (gtky === 'done') await page.addInitScript(() => {
    if (!localStorage.getItem('rb_test_dna')) localStorage.setItem('rb_test_dna', JSON.stringify({ style_archetypes: ['Minimal'] }));
    if (!localStorage.getItem('rb_model__u-test')) localStorage.setItem('rb_model__u-test', JSON.stringify({ skin: 3, hair: 1, nudges: {}, kept: true, gender: 'woman', v: 2 }));
    if (!localStorage.getItem('robes_style_notes__u-test')) localStorage.setItem('robes_style_notes__u-test', JSON.stringify([
      { id: 1754000000000, type: 'key-piece', title: 'Cream blazer', subtitle: 'Worn three ways', img: null, saved_at: '2026-08-01T10:00:00.000Z', kpData: { ways: [], generatedImages: [], suggested: true, intent: 'style' } }]));
  });

  await page.route('**cdn.jsdelivr.net/**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/javascript', body: SUPA_STUB }));
  await page.route('**ayowpaknssulsqqvwpqx.supabase.co/**', (r) => {
    const u = r.request().url();
    const body = u.includes('wardrobe_items') ? JSON.stringify(wardrobe(n)) : (u.includes('planned_days') && r.request().method() === 'GET') ? JSON.stringify(planned) : '[]';
    return r.fulfill({ status: 200, contentType: 'application/json', body });
  });
  await page.route('**nominatim**', (r) => r.abort());
  await page.route('**open-meteo**', (r) => r.abort());

  await page.addInitScript((count) => {
    window.__TEST_PROFILE = {
      first_name: localStorage.getItem('rb_test_name') || 'Annie', last_name: '', mobile: '', style_icons: JSON.parse(localStorage.getItem('rb_test_icons') || '[]'), budget: null,
      wardrobe_description: '', style_dna: JSON.parse(localStorage.getItem('rb_test_dna') || '{}'), wardrobe_items_count: count,
      onboarded_at: '2026-07-01', gender_identity: 'woman',
      notification_prefs: window.__TEST_PREFS || {},
    };
    Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true });
  }, n);
  if (looks) {
    // TWO saved looks, not one: a single look is the O7 first-look state
    // (hero card, tracker hidden), and a daily look would not fill the
    // Lookbook at all (Look Rules 1a, 2026-08-17).
    await page.addInitScript(() => {
      localStorage.setItem('rb_looks__u-test', JSON.stringify([
        { id: 'lk-seed', name: 'A look', name_provisional: false, note: '', photo_url: null,
          tags: null, climate_band: 'year_round', climate_source: 'derived', source: 'manual',
          origin_look_id: null, created_at: '2026-08-05T10:00:00.000Z',
          pieces: [{ id: 'w0', slot: 'Top', position: 0, role: null }, { id: 'w1', slot: 'Bottom', position: 1, role: null }],
          wears: [] },
        { id: 'lk-seed-2', name: 'A second look', name_provisional: false, note: '', photo_url: null,
          tags: null, climate_band: 'year_round', climate_source: 'derived', source: 'manual',
          origin_look_id: null, created_at: '2026-08-04T10:00:00.000Z',
          pieces: [{ id: 'w2', slot: 'Top', position: 0, role: null }, { id: 'w3', slot: 'Bottom', position: 1, role: null }],
          wears: [] },
      ]));
    });
  }

  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2600);
  return { ctx, page, errs, posts };
}
const HB_ISO = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const HB_TODAY = HB_ISO(new Date());
const HB_TOMORROW = HB_ISO(new Date(Date.now() + 86400000));
const HB_DAILY = { headline: 'Soft office armour', occasion_label: 'Office', stylist_summary: 'A note.', transition_tip: '', palette: ['#111111', '#EEEEEE'],
  look_tags: { climate: 'mild', light: 'daylight', wear: ['work'], vibe: 'chic' }, itemCount: 2,
  steps: [
    { title: 'The Anchor', items: [{ name: 'Piece 1', category: 'Tops', color: 'Black', wardrobe_index: 0, wardrobe_match: { id: 'w0', label: 'Piece 1', image_url: 'https://img.test/w0.jpg', color: 'Black' }, alternates: [] }] },
    { title: 'The Canvas', items: [{ name: 'Piece 2', category: 'Bottoms', color: 'Black', wardrobe_index: 1, wardrobe_match: { id: 'w1', label: 'Piece 2', image_url: 'https://img.test/w1.jpg', color: 'Black' }, alternates: [] }] },
  ] };
const HB_LOOK = { id: 'lk-hb', name: 'The office one', name_provisional: false, note: '', photo_url: null, tags: null, climate_band: 'year_round', climate_source: 'derived',
  source: 'manual', origin_look_id: null, created_at: '2026-08-05T10:00:00.000Z', pieces: [{ id: 'w0', slot: 'Top', position: 0, role: null }, { id: 'w1', slot: 'Bottom', position: 1, role: null }], wears: [] };
const HB_PLANNED = [{ user_id: 'u-test', source_type: 'look', source_id: 'lk-hb', day_index: 0, slot: 'day', day_date: HB_TODAY, status: 'planned',
  activity: 'The office one', headline: 'The office one', item_ids: ['w0', 'w1'], thumb_urls: [], updated_at: new Date().toISOString(), created_at: new Date().toISOString() }];

const _RB_ROLE_NAMES = ['The Canvas', 'The Anchor', 'The Texture', 'The Exclamation Point'];
const results = [];
const check = (name, pass, detail = '') =>
  results.push({ name, pass, detail }) && void 0;

const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});

for (const n of [0, 1, 3, 5, 10, 15, 16]) {
  const { ctx, page, errs } = await boot(browser, n);

  check(`n=${n} · no page errors`, errs.length === 0, errs.join(' | ').slice(0, 200));

  const state = await page.evaluate(() => {
    const dash = document.getElementById('dash');
    const vis = (el) => !!el && el.offsetParent !== null;
    const order = Array.from(dash ? dash.children : [])
      .filter((el) => el.offsetParent !== null)
      .map((el) => el.id || el.className.split(' ')[0]);
    return {
      order,
      trackerVisible: vis(document.getElementById('wtrk')),
      servicesVisible: vis(document.querySelector('.services')),
      learnVisible: vis(document.getElementById('rb-svc-learn')),
      cardsVisible: Array.from(document.querySelectorAll('.services-grid .svc')).filter(vis).length,
      styleNotes: !!document.getElementById('rb-sil-prompt'),
      // The banner (Felix's review, 2026-09-25): the wardrobe tracker alone
      learnEy: document.querySelector('#rb-svc-learn .ey')?.textContent || '',
      learnN: document.querySelector('#rb-svc-learn .n')?.textContent || '',
      learnFill: document.querySelector('#rb-svc-learn .fill')?.style.width || '',
      learnMarks: Array.from(document.querySelectorAll('#rb-svc-learn .mk')).map((t) => [t.style.left, t.classList.contains('on')]),
      learnCols: Array.from(document.querySelectorAll('#rb-svc-learn .col')).map((c) => [c.querySelector('.at')?.textContent, c.querySelector('.lbl')?.textContent, c.classList.contains('on')]),
      learnCta: document.querySelector('#rb-svc-learn .cta')?.textContent || '',
      learnText: document.getElementById('rb-svc-learn')?.textContent || '',
      bannerTint: (() => {
        const el = document.getElementById('rb-svc-learn');
        return el ? getComputedStyle(el).backgroundColor : '';
      })(),
      headVisible: vis(document.querySelector('.services > .sec-head')),
      filedRow: !!document.getElementById('rb-svc-filed'),
      filledInBand: Array.from(document.querySelectorAll('.services button'))
        .filter((el) => el.offsetParent !== null)
        .filter((el) => getComputedStyle(el).backgroundColor === 'rgb(32, 32, 33)').length,
      bannerH: document.getElementById('rb-svc-learn')?.getBoundingClientRect().height || 0,
      railAfterConcierge: (() => {
        const c = dash?.querySelector('.concierge');
        return !!c && c.nextElementSibling?.id === 'rb-rail';
      })(),
    };
  });

  // MERGED (2a, 2026-08-18): the standalone learning card never renders —
  // Robes is learning lives inside the Styling Concierge header.
  check(`n=${n} · standalone learning card never renders`,
    state.trackerVisible === false);

  // Load rules (2026-08-19): the concierge stands from the FIRST session,
  // at any piece count — only "Your piece, styled" holding the screen
  // delays it, and none of these boots carries the styled card.
  // …and retires at the ladder's last rung (3.3, 2026-09-21): fifteen
  // filed pieces and the band has said everything it can.
  check(`n=${n} · concierge ${n < 15 ? 'shown (no piece floor)' : 'retired at fifteen'}`,
    state.servicesVisible === (n < 15), String(state.servicesVisible));
  if (n > 0 && n < 15) {
    check(`n=${n} · the concierge is the banner alone — no cards, no header, no receipt row`,
      state.learnVisible && state.cardsVisible === 0 && !state.headVisible && !state.filedRow,
      JSON.stringify([state.learnVisible, state.cardsVisible, state.headVisible, state.filedRow]));
  }
  // Style Notes only at the last milestone
  check(`n=${n} · the 15-piece Style notes card is retired`,
    state.styleNotes === false, `got ${state.styleNotes}`);

  // Rail stays glued to the prompt, which leads the page at every count;
  // the concierge follows the rail, ahead of the Lookbook row (its slot is
  // a rule now, not an accident of markup order).
  check(`n=${n} · rail follows prompt`, state.railAfterConcierge, JSON.stringify(state.order));
  {
    const iCon = state.order.findIndex((x) => x === 'concierge');
    const iSvc = state.order.indexOf('services');
    const iSn = state.order.indexOf('rb-sn');
    check(`n=${n} · prompt leads, ${n < 15 ? 'concierge after the rail, before the Lookbook row' : 'no concierge on the page'}`,
      iCon >= 0 && (n < 15 ? (iSvc > iCon && (iSn === -1 || iSvc < iSn)) : iSvc === -1), JSON.stringify(state.order));
  }

  // The merged header meter: bare count, no denominator, the one honest
  // reason to catalogue, and the fill still walks the milestone curve.
  // (At fifteen the whole band is gone — nothing to read.)
  if (n >= 15) {
    check(`n=${n} · no meter and no cards on the page once the band retires`,
      state.learnVisible === false && state.cardsVisible === 0,
      JSON.stringify([state.learnVisible, state.cardsVisible]));
  }
  if (n >= 3 && n < 15) {
    check(`n=${n} · banner reads "Robes is learning · N pieces filed"`,
      state.learnEy === 'Robes is learning'
        && new RegExp(`^${n}\\s*pieces? filed$`, 'i').test(state.learnN.trim()),
      JSON.stringify([state.learnEy, state.learnN]));
    check(`n=${n} · banner fill ${(n / 15 * 100).toFixed(1)}% along the 5 / 10 / 15 ladder`,
      Math.abs(parseFloat(state.learnFill) - n / 15 * 100) < 0.6, `got ${state.learnFill}`);
    const P = (x) => Math.round(x / 15 * 100);
    check(`n=${n} · the ladder reads 5 / 10 / 15 — builds a daily look · plans a week of outfits · knows your taste`,
      JSON.stringify(state.learnMarks.map((m) => [Math.round(parseFloat(m[0])), m[1]])) === JSON.stringify([[P(5), n >= 5], [P(10), n >= 10], [P(15), false]])
        && JSON.stringify(state.learnCols.map((c) => [c[0], c[1]])) === JSON.stringify([['05', 'Builds a daily look'], ['10', 'Plans a week of outfits'], ['15', 'Knows your taste']]),
      JSON.stringify([state.learnMarks, state.learnCols]));
    check(`n=${n} · the banner is tinted, its one door a hairline pill (no filled button)`,
      state.bannerTint === 'rgb(242, 238, 231)' && state.filledInBand === 0 && /Catalogue a piece/i.test(state.learnCta),
      JSON.stringify([state.bannerTint, state.filledInBand, state.learnCta]));
    check(`n=${n} · no denominator, no lock language on the banner`,
      !/\/\s*\d|of 15|unlock|lock/i.test(state.learnText), state.learnText);
    check(`n=${n} · the banner is one compact row (≤150px)`, state.bannerH > 0 && state.bannerH <= 150, String(state.bannerH));
  }

  await ctx.close();
}

// Wardrobe + lookbook empty states at 0 pieces (and zero looks)
{
  const { ctx, page } = await boot(browser, 0, 1280, { looks: false });
  await page.evaluate(() => window.App && App.showWardrobe && App.showWardrobe());
  await page.waitForTimeout(900);
  // De-dupe pass (Annie, 2026-08-13): at zero pieces the hero invitation
  // is the WHOLE page — the milestone bar (home's learning meter carries
  // that promise) and the add-card grid (it returns with the first piece)
  // are gone.
  const w = await page.evaluate(() => ({
    headline: document.querySelector('#wg-grid div')?.textContent || '',
    hasBar: !!document.querySelector('#wg-grid .rb-ms'),
    ghosts: document.querySelectorAll('#wg-grid .rb-ghost-card').length,
    addCards: document.querySelectorAll('#wg-grid .rb-add-card').length,
    prose: (document.querySelector('#wg-grid p') || {}).textContent || '',
    tabs: Array.from(document.querySelectorAll('#wg-filters .wg-tab')).map((t) => t.textContent),
  }));
  check('wardrobe empty · serif line', /Every look starts with a photograph/.test(w.headline), w.headline.slice(0, 80));
  check('wardrobe empty · milestone bar gone — home carries the meter', !w.hasBar);
  check('wardrobe empty · no ghost tiles, no add-card duplication',
    w.ghosts === 0 && w.addCards === 0, JSON.stringify([w.ghosts, w.addCards]));
  check('wardrobe empty · no prose block', !w.prose, w.prose.slice(0, 60));
  check('wardrobe empty · tab row is All + ten categories + More, one line',
    w.tabs.length === 12 && w.tabs[0] === 'All' && /^More/.test(w.tabs[11]), JSON.stringify(w.tabs));

  await page.evaluate(() => window.__snOpen && window.__snOpen());
  await page.waitForTimeout(600);
  // ONE DOOR (FTUE pass 2026-08-12) — supersedes the "Ways to fill it"
  // clone shelf this section used to pin. An empty Lookbook IS the
  // composer: naming the first look is the one act that fills a Lookbook,
  // so it is the only thing on the page.
  const l = await page.evaluate(() => ({
    ways: !!document.getElementById('sn-ways'),
    emptyShown: document.getElementById('sn-empty')?.style.display !== 'none',
    composer: !!document.querySelector('.rb-lk-composer > .rb-lk-con'),
    titlePlaceholder: document.getElementById('rb-lk-newtitle')?.placeholder || '',
    // Handoff 4·0 (2026-10-05): the empty draft is ONE guided door
    strips: Array.from(document.querySelectorAll('.rb-lk-con .rbc-rolestrip span')).map((s) => s.textContent.trim()),
    ghostRows: document.querySelectorAll('.rb-lk-con .rbc-rghost').length,
    guide: document.querySelector('.rb-lk-con .rb-lk-guide .gh')?.textContent.trim() || '',
    guideActs: Array.from(document.querySelectorAll('.rb-lk-con .rb-lk-guide .ga button')).map((b) => b.textContent.trim()),
    trailingAdd: !!document.querySelector('.rb-lk-con .rbc-addpiece'),
    save: !!document.querySelector('.rb-lk-save'),
    saveDisabled: document.querySelector('.rb-lk-save')?.disabled,
    door: document.querySelector('.rb-lk-robesdoor')?.textContent || '',
    // nothing competes with it
    bar: document.getElementById('rb-lk-bar')?.style.display !== 'none',
    hol: !!document.getElementById('rb-lk-hol'),
    allHead: document.getElementById('rb-lk-allhead')?.style.display !== 'none',
    sort: !!document.querySelector('.rb-lk-sort'),
  }));
  check('lookbook empty · ONE DOOR — the composer, no ways-to-fill shelf',
    l.composer === true && l.ways === false && l.emptyShown === false, JSON.stringify(l));
  check('lookbook empty · the name leads it', l.titlePlaceholder === 'Name your first look', l.titlePlaceholder);
  check('lookbook empty · the guide is the rack: Start with the canvas, + Canvas / + Any piece — no strips, no ghost rows',
    l.strips.length === 0 && l.ghostRows === 0 && l.guide === 'Start with the canvas'
      && JSON.stringify(l.guideActs) === JSON.stringify(['+ Canvas', '+ Any piece']), JSON.stringify([l.strips, l.ghostRows, l.guide, l.guideActs]));
  check('lookbook empty · no trailing + Add a piece — the guide is the one door', l.trailingAdd === false);
  // Save is withheld (cream, no ink) until the first piece or a photograph
  check('lookbook empty · Save stands there, withheld until a piece or a photograph',
    l.save === true && l.saveDisabled === true, JSON.stringify([l.save, l.saveDisabled]));
  check('lookbook empty · no "Or let Robes build the first one" door (the prompt box is where Robes builds)',
    l.door === '', l.door);
  check('lookbook empty · nothing competes: no travel strip, All-looks header, sort or refine',
    l.bar === false && l.hol === false && l.allHead === false && l.sort === false,
    JSON.stringify([l.bar, l.hol, l.allHead, l.sort]));

  // No model on file: the canvas is the invitation to build one, and the
  // rack stays open under a hairline notice (2026-09-03).
  const noModel = await page.evaluate(() => ({
    prompt: !!document.querySelector('.rb-lk-con .rb-lkm-canvas.prompt'),
    ey: document.querySelector('.rb-lk-con .rb-lkm-ey')?.textContent,
    build: document.querySelector('.rb-lk-con .rb-lkm-build')?.textContent,
    orPhoto: document.querySelector('.rb-lk-con .rb-lkm-orphoto')?.textContent,
    notice: document.querySelector('.rb-lk-composer .rb-lkm-notice')?.textContent || '',
    guide: !!document.querySelector('.rb-lk-con .rb-lk-guide'),
  }));
  check('lookbook empty · with no model, the canvas asks for one',
    noModel.prompt === true && noModel.ey === 'No model yet' && noModel.build === 'Build your model'
      && noModel.orPhoto === 'Or start from your own photograph', JSON.stringify(noModel));
  check('lookbook empty · the rack stays open under the notice',
    /They stay on the rack, and your model wears them the moment she exists/.test(noModel.notice) && noModel.guide === true,
    JSON.stringify([noModel.notice, noModel.guide]));

  await ctx.close();
}

// First load: opening the Lookbook before the 600ms concierge transform used
// to paint the legacy bundle trio into the ways block, correcting itself only
// on refresh. The ways block is gone from this page entirely (one door,
// 2026-08-12) — so the race is closed by construction, and what must hold is
// that the early open still lands the composer and never a legacy shelf.
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1100 } });
  const page = await ctx.newPage();
  await page.route('**cdn.jsdelivr.net/**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/javascript', body: SUPA_STUB }));
  await page.route('**ayowpaknssulsqqvwpqx.supabase.co/**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route('**nominatim**', (r) => r.abort());
  await page.route('**open-meteo**', (r) => r.abort());
  await page.addInitScript(() => {
    window.__TEST_PROFILE = { first_name: 'Annie', style_dna: {}, wardrobe_items_count: 0,
      onboarded_at: '2026-07-01', gender_identity: 'woman', style_icons: [] };
    // Open the Lookbook the instant personalize exposes it — well inside the
    // 600ms window the concierge transform runs in.
    const t = setInterval(() => {
      if (window.__snOpen) { clearInterval(t); window.__snOpen(); }
    }, 10);
  });
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });

  await page.waitForFunction(() => !!document.querySelector('.rb-lk-composer'), null, { timeout: 8000 });
  const early = await page.evaluate(() => {
    const ways = document.getElementById('sn-ways');
    const titles = ways ? Array.from(ways.querySelectorAll('.svc-title')).map((t) => t.textContent) : [];
    return { ways: !!ways, legacy: titles.some((t) => /key piece, three ways/i.test(t)), titles };
  });
  check('first load · an early open lands the composer, never a legacy shelf',
    early.ways === false && early.legacy === false, JSON.stringify(early.titles));

  // …and it must still be the composer once the transform lands, unchanged.
  await page.waitForTimeout(2200);
  const settled = await page.evaluate(() => ({
    ways: !!document.getElementById('sn-ways'),
    composer: !!document.querySelector('.rb-lk-composer > .rb-lk-con'),
    emptyShown: document.getElementById('sn-empty')?.style.display !== 'none',
  }));
  check('first load · the transform never displaces it',
    settled.composer === true && settled.ways === false && settled.emptyShown === false,
    JSON.stringify(settled));
  await ctx.close();
}

// Ways block disappears once anything is saved
{
  const { ctx, page } = await boot(browser, 1);
  await page.evaluate(() => {
    const k = 'robes_style_notes__u-test';
    // A daily look counts as Lookbook content; a key piece would not — it
    // lives on the Inspiration tab (IA refinement 2026-08-10).
    localStorage.setItem(k, JSON.stringify([{ id: 1, type: 'daily-look', title: 'A look', subtitle: '', img: null }]));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2600);
  await page.evaluate(() => window.__snOpen && window.__snOpen());
  await page.waitForTimeout(500);
  const gone = await page.evaluate(() => !document.getElementById('sn-ways'));
  check('lookbook · ways removed once content exists', gone);
  await ctx.close();
}

// FTU simplification (2026-08-18, W01/O1 + Annie's bare-page beta pass): at
// zero looks with NO styled card, the prompt LEADS the page in focus under
// the greeting's question; Build your own and The week ahead are hairlines
// that unfurl in place. The rack renders only when she asks.
// (gtky: 'done' — the first run answered, else the door card leads, 2026-10-09)
{
  const { ctx, page, errs } = await boot(browser, 4, 1280, { looks: false, gtky: 'done' });
  const h = await page.evaluate(() => {
    const dash = document.getElementById('dash');
    const rows = document.getElementById('rb-ftu-rows');
    const vis = (el) => !!el && el.offsetParent !== null;
    return {
      mode: rows?.getAttribute('data-mode'),
      rowIds: Array.from(rows?.querySelectorAll('.rb-ftu-row') || []).map((r) => r.id),
      order: Array.from(dash.children).map((e) => e.id || e.className.split(' ')[0])
        .filter((id) => ['concierge', 'rb-ftu-rows', 'services'].includes(id)),
      concEy: document.getElementById('rb-conc-ey')?.textContent,
      echo: dash.querySelector('.dash-echo')?.textContent,
      promptVisible: vis(document.getElementById('cb-ta')),
      railInWeekRow: !!document.querySelector('#rb-ftu-body-week #rb-rail'),
      // the rack is NOT rendered until she asks for it (W01 spec note)
      rackAbsent: !document.getElementById('rb-lkhome'),
      open: Array.from(document.querySelectorAll('.rb-ftu-row.open')).map((r) => r.id),
      // nothing competes: services, tracker, Lookbook + Inspiration rows
      servicesHidden: !vis(document.querySelector('.services')),
      trkHidden: document.getElementById('wtrk')?.style.display === 'none',
      snRowHidden: (document.getElementById('rb-sn')?.style.display === 'none')
        || !document.getElementById('rb-sn')?.textContent.trim(),
      wtrkCta: document.getElementById('wtrk-cta')?.offsetParent !== null,
      weekSub: document.querySelector('#rb-ftu-row-week .rb-ftu-sub')?.textContent,
    };
  });
  check('ftu rows · no page errors', errs.length === 0, errs.join(' | ').slice(0, 200));
  check('ftu rows · without the styled card the prompt leads, the concierge band closes the page',
    h.mode === 'zero-lead' && JSON.stringify(h.order) === JSON.stringify(['concierge', 'rb-ftu-rows', 'services'])
      && h.concEy === undefined && h.promptVisible === true
      && h.echo === 'What are you dressing for today?',
    JSON.stringify([h.mode, h.order, h.concEy, h.echo, h.promptVisible]));
  check('ftu rows · two hairlines beneath it, closed, the rail inside its row',
    JSON.stringify(h.rowIds) === JSON.stringify(['rb-ftu-row-build', 'rb-ftu-row-week'])
      && h.open.length === 0 && h.railInWeekRow === true,
    JSON.stringify([h.rowIds, h.open, h.railInWeekRow]));
  check('ftu rows · the rack is not rendered until she asks', h.rackAbsent === true);
  // Load rules (2026-08-19): the concierge STANDS beneath the rows from
  // the first session — tracker and Lookbook row still stand down.
  check('ftu rows · the concierge stands beneath the rows; tracker + Lookbook row stand down',
    h.servicesHidden === false && h.trkHidden === true && h.snRowHidden === true && h.wtrkCta === false,
    JSON.stringify([h.servicesHidden, h.trkHidden, h.snRowHidden, h.wtrkCta]));
  check('ftu rows · the week whisper is honest', h.weekSub === 'Nothing planned yet.', h.weekSub);

  // Build your own unfurls the rack in place
  const b = await page.evaluate(async () => {
    window.__rbFtuToggle('build');
    await new Promise((r) => setTimeout(r, 250));
    const el = document.getElementById('rb-lkhome');
    return {
      open: Array.from(document.querySelectorAll('.rb-ftu-row.open')).map((r) => r.id),
      inBuildRow: !!document.querySelector('#rb-ftu-body-build #rb-lkhome'),
      arrowBuild: document.querySelector('#rb-ftu-row-build .rb-ftu-arrow')?.textContent,
      count: el?.querySelector('.rb-lkh-count')?.textContent,
      ghostRows: el?.querySelectorAll('.rbc-rghost').length,
      snapWired: Array.from(el?.querySelectorAll('.rbc-rghost') || [])
        .every((r) => /__lkHomeSnap/.test(r.getAttribute('onclick') || '')),
      save: !!el?.querySelector('.rb-lk-save'),
      door: el?.querySelector('.rb-lk-robesdoor')?.textContent,
      composers: document.querySelectorAll('.rb-lk-composer').length,
      showMoreHidden: getComputedStyle(el.querySelector('.rb-lkh-showmore')).display === 'none',
    };
  });
  check('ftu rows · Build your own unfurls the rack in place',
    JSON.stringify(b.open) === JSON.stringify(['rb-ftu-row-build']) && b.inBuildRow === true
      && b.arrowBuild === '↑', JSON.stringify(b));
  check('ftu rows · four slots, every one of them the camera path',
    b.ghostRows === 4 && b.snapWired === true && b.count === '0 of 4 on the rack',
    JSON.stringify([b.ghostRows, b.snapWired, b.count]));
  check('ftu rows · carries Save, and no Robes door',
    b.save === true && b.door === undefined, JSON.stringify([b.save, b.door]));
  check('ftu rows · exactly one composer in the DOM', b.composers === 1, String(b.composers));
  check('ftu rows · all four slots render on web (no collapse)', b.showMoreHidden === true);

  // The week ahead unfurls the rail — the rack stays open beside it (rows
  // never close a sibling), and a second tap folds only that row.
  const w = await page.evaluate(async () => {
    window.__rbFtuToggle('week');
    await new Promise((r) => setTimeout(r, 350));
    const allOpen = Array.from(document.querySelectorAll('.rb-ftu-row.open')).map((r) => r.id);
    const rackStays = !!document.querySelector('#rb-ftu-body-build #rb-lkhome');
    const railCards = document.querySelectorAll('#rb-ftu-body-week #rb-rail .rb-wk, #rb-ftu-body-week #rb-rail .rb-dc, #rb-ftu-body-week #rb-rail .rb-rc').length;
    const railHeadHidden = (() => {
      const hd = document.querySelector('#rb-rail .rb-rail-head');
      return !hd || getComputedStyle(hd).display === 'none';
    })();
    window.__rbFtuToggle('week');
    await new Promise((r) => setTimeout(r, 200));
    return {
      allOpen, rackStays, railCards, railHeadHidden,
      afterFold: Array.from(document.querySelectorAll('.rb-ftu-row.open')).map((r) => r.id),
    };
  });
  check('ftu rows · The week ahead unfurls the rail alongside the open rack',
    JSON.stringify(w.allOpen) === JSON.stringify(['rb-ftu-row-build', 'rb-ftu-row-week'])
      && w.rackStays === true && w.railCards === 7 && w.railHeadHidden === true, JSON.stringify(w));
  check('ftu rows · a second tap folds only that row',
    JSON.stringify(w.afterFold) === JSON.stringify(['rb-ftu-row-build']),
    JSON.stringify(w.afterFold));

  // The draft is SHARED with the Lookbook composer — never a second copy
  const shared = await page.evaluate(async () => {
    window.__lkApplyNew('w0');
    await new Promise((r) => setTimeout(r, 200));
    const onHome = document.querySelector('#rb-lkhome .rbc-rack .rbc-name')?.textContent;
    const count = document.querySelector('#rb-lkhome .rb-lkh-count')?.textContent;
    window.__snOpen();
    await new Promise((r) => setTimeout(r, 400));
    return {
      onHome, count,
      homeGone: !document.getElementById('rb-lkhome'),
      composers: document.querySelectorAll('.rb-lk-composer').length,
      inLookbook: document.querySelector('#rb-lk-body .rbc-rack .rbc-name')?.textContent,
    };
  });
  check('ftu rows · a piece added on home hangs in the rack and counts',
    shared.onHome === 'Piece 1' && shared.count === '1 of 4 on the rack', JSON.stringify(shared));
  check('ftu rows · the SAME draft continues in the Lookbook, never a second copy',
    shared.inLookbook === 'Piece 1' && shared.homeGone === true && shared.composers === 1,
    JSON.stringify(shared));

  // Saving the first look flips home to the first-look posture (the home
  // cut, 2026-09-18): the prompt leads, "Your looks" takes the hero slot,
  // and the hairline rows are GONE — no Build your own, no week row.
  const saved = await page.evaluate(async () => {
    window.__lkApplyNew('w1');
    window.__lkNewTitleInput('Terrace mornings');   // rule 02: the name is the gate
    window.__lkSave();
    await new Promise((r) => setTimeout(r, 300));
    window.__snClose();
    await new Promise((r) => setTimeout(r, 500));
    const dash = document.getElementById('dash');
    return {
      mode: dash.getAttribute('data-home'),
      rows: !!document.getElementById('rb-ftu-rows'),
      order: Array.from(dash.children).map((e) => e.id || e.className.split(' ')[0])
        .filter((id) => ['concierge', 'rb-firstlook', 'rb-ftu-rows'].includes(id)),
      concEy: document.getElementById('rb-conc-ey')?.textContent,
      flName: document.querySelector('.rb-fl-name')?.textContent,
      flCta: document.querySelector('.rb-fl-cta')?.textContent,
      railHidden: document.getElementById('rb-rail')?.style.display === 'none',
      servicesHidden: document.querySelector('.services')?.style.display === 'none',
      trkHidden: document.getElementById('wtrk')?.style.display === 'none',
    };
  });
  check('ftu rows · the first save lands the first-look posture: prompt, Your looks, no rows',
    saved.mode === 'look' && saved.rows === false
      && JSON.stringify(saved.order) === JSON.stringify(['concierge', 'rb-firstlook']),
    JSON.stringify(saved));
  check('ftu rows · the saved look is the card, all hers',
    saved.flName === 'Terrace mornings' && saved.flCta === 'Open →' && saved.concEy === undefined,
    JSON.stringify(saved));
  check('ftu rows · the rail and the concierge band stand down under one unplanned look',
    saved.railHidden === true && saved.servicesHidden === true && saved.trkHidden === true, JSON.stringify(saved));
  await ctx.close();
}

// The rows on a phone: unfurled rack collapses texture + finish, preview
// stands down; no horizontal overflow.
{
  const { ctx, page, errs } = await boot(browser, 4, 390, { looks: false, gtky: 'done' });
  const m = await page.evaluate(async () => {
    window.__rbFtuToggle('build');
    await new Promise((r) => setTimeout(r, 300));
    const el = document.getElementById('rb-lkhome');
    const more = el?.querySelector('.rb-lkh-more');
    const showmore = el?.querySelector('.rb-lkh-showmore');
    return {
      shown: Array.from(el?.querySelectorAll('.rbc-rolestrip span') || [])
        .filter((s) => s.offsetParent !== null).map((s) => s.textContent.trim()),
      moreHidden: more ? getComputedStyle(more).display === 'none' : null,
      showmoreShown: showmore ? getComputedStyle(showmore).display !== 'none' : null,
      previewHidden: el?.querySelector('.rb-lk-con > div:first-child')?.offsetParent === null,
      overflow: document.documentElement.scrollWidth <= window.innerWidth + 1,
    };
  });
  check('390px ftu rows · no page errors', errs.length === 0, errs.join(' | ').slice(0, 200));
  check('390px ftu rows · canvas and anchor are the ask; texture + finish collapse',
    JSON.stringify(m.shown) === JSON.stringify(['The Canvas', 'The Anchor'])
      && m.moreHidden === true && m.showmoreShown === true, JSON.stringify(m));
  check('390px ftu rows · the preview is web-only here', m.previewHidden === true);
  check('390px ftu rows · no horizontal overflow', m.overflow === true);

  // Show expands for the session; a piece cast into a late role force-expands
  const opened = await page.evaluate(async () => {
    document.querySelector('.rb-lkh-showmore').click();
    await new Promise((r) => setTimeout(r, 200));
    const el = document.getElementById('rb-lkhome');
    return Array.from(el.querySelectorAll('.rbc-rolestrip span'))
      .filter((s) => s.offsetParent !== null).map((s) => s.textContent.trim());
  });
  check('390px ftu rows · Show reveals the other two slots',
    JSON.stringify(opened) === JSON.stringify(_RB_ROLE_NAMES), JSON.stringify(opened));
  await ctx.close();
}

// The onboarding key piece lands on the DECK (Annie, 2026-10-09): Style a
// key piece three ways ends where a piece styled from the box ends — the
// keep-or-pass deck (F14) in the Lookbook, the set saved, the three looks
// minted as suggested rows; the old "Your piece, styled" card never paints.
// Back from the deck lands home, where the look step reads done.
{
  const { ctx, page, errs } = await boot(browser, 1, 1280, { looks: false });
  await page.evaluate(() => {
    sessionStorage.setItem('rb_onboard_piece', JSON.stringify({
      prompt: 'Acid green cropped jumper', photo: null, cataloged: true }));
    sessionStorage.setItem('rb_onboard_styled', JSON.stringify({
      prompt: 'Acid green cropped jumper', ts: Date.now(),
      data: { ways: [
        { title: 'Effortless Parisian Polish' }, { title: 'Modern Romantic Edge' }, { title: 'Curated Comfort' },
      ], generatedImages: [], fallback: false, photoUrl: null } }));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2600);
  const d = await page.evaluate(() => ({
    card: !!document.getElementById('rb-styled'),
    sn: document.getElementById('sn-page')?.style.display === 'block',
    deck: !!document.querySelector('#rb-lk-body .rb-lk-deck'),
    cards: document.querySelectorAll('#rb-lk-body .rb-deck-card').length,
    top: document.querySelector('.rb-deck-card.top .rb-deck-t')?.textContent,
    set: (JSON.parse(localStorage.getItem('robes_style_notes__u-test') || '[]').find((x) => x.type === 'key-piece') || {}).kpData,
  }));
  check('onboarding deck · no page errors', errs.length === 0, errs.join(' | ').slice(0, 200));
  check('onboarding deck · the styled key piece lands on the keep-or-pass deck in the Lookbook — never the "Your piece, styled" card',
    d.card === false && d.sn === true && d.deck === true && d.cards >= 1, JSON.stringify([d.card, d.sn, d.deck, d.cards, d.top]));
  check('onboarding deck · the set is saved and marked suggested', !!d.set && d.set.suggested === true && (d.set.ways || []).length === 3, JSON.stringify(d.set && { s: d.set.suggested, n: (d.set.ways || []).length }));
  await page.evaluate(() => window.__lkDeckBack()); await page.waitForTimeout(700);
  const h = await page.evaluate(() => {
    const g = document.getElementById('rb-gtky');
    return {
      mode: document.getElementById('dash').getAttribute('data-home'),
      sn: document.getElementById('sn-page')?.style.display === 'block',
      next: g?.getAttribute('data-next'),
      rowsList: Array.from(g?.querySelectorAll('.rb-gtky-row') || []).map((r) => r.dataset.step + ':' + r.dataset.state),
      insp: (() => { const r = document.getElementById('rb-insp-row'); return r && r.style.display !== 'none' ? r.querySelectorAll('.rb-sn-card').length : 0; })(),
      inspTitle: document.querySelector('#rb-insp-row .rb-sec-ey')?.textContent,
      order: Array.from(document.getElementById('dash').children).filter((e) => e.offsetParent !== null || e.id === 'rb-insp-row').map((e) => e.id || e.className.split(' ')[0]).filter((id) => ['rb-gtky', 'rb-insp-row'].includes(id)),
    };
  });
  check('onboarding deck · back from the deck lands home: the twin next, and the suggested looks STAND on home under the card — no ticked "saved to your lookbook" row (tenth pass)',
    h.mode === 'gtky' && h.sn === false && h.next === 'photos' && h.insp >= 1 && h.inspTitle === 'Suggested' && h.rowsList.indexOf('look:done') < 0 && JSON.stringify(h.order) === JSON.stringify(['rb-gtky', 'rb-insp-row']), JSON.stringify(h));

  // The Worn Three Ways page survives for the SET's entry (__snOpenItem on
  // a key-piece row): the same landing, no guide band, card 01 filled, no
  // per-user flag written.
  const again = await page.evaluate(async () => {
    const it = JSON.parse(localStorage.getItem('robes_style_notes__u-test') || '[]').find((x) => x.type === 'key-piece');
    if (it) window.__snOpenItem(it.id);
    await new Promise((r) => setTimeout(r, 300));
    const b0 = document.getElementById('kp-build-btn-0');
    return {
      entry: !!it, suggested: !!(it && it.kpData && it.kpData.suggested),
      band: !!document.getElementById('kp-guide-band'),
      firstFilled: b0 ? getComputedStyle(b0).backgroundColor === 'rgb(32, 32, 33)' : null,
      flag: !!localStorage.getItem('rb_kp_guide_done__u-test'),
    };
  });
  check('kp legacy page · the set\'s entry (marked suggested) still opens the Worn Three Ways page — no band, card 01 filled, no flag written',
    again.entry && again.suggested && again.band === false && again.firstFilled === true && again.flag === false, JSON.stringify(again));
  await ctx.close();
}

// O7 — hero card retired, prompt leads: exactly one look, nothing planned.
{
  const { ctx, page, errs } = await boot(browser, 4, 1280, { looks: false, gtky: 'done' });
  await page.evaluate(() => {
    localStorage.setItem('rb_looks__u-test', JSON.stringify([
      { id: 'lk-1', name: 'Effortless Parisian Polish', name_provisional: false, note: '', photo_url: null,
        tags: null, source: 'manual', origin_look_id: null, created_at: '2026-08-17T10:00:00.000Z',
        pieces: [
          { id: 'w0', slot: 'Top', position: 0, role: null },
          { id: 'w1', slot: 'Bottom', position: 1, role: null },
          { id: 'w2', slot: 'Shoes', position: 2, role: null }],
        proposals: [{ role: null, chip: 'Bag', cats: ['Bags'], opts: [{ name: 'A bag' }], oi: 0, saved: false, image_url: null }],
        wears: [] },
    ]));
    // A styled key piece's ways are suggested looks (look states,
    // 2026-10-06) — they surface in home's Suggested row here (the styled
    // card has retired, so no duplicate).
    localStorage.setItem('robes_style_notes__u-test', JSON.stringify([
      { id: 1754700000000, type: 'key-piece', title: 'Acid green cropped jumper', subtitle: 'Worn three ways',
        img: null, kpData: { ways: [{ eyebrow: 'A', title: 'Gallery green', outfit: 'The jumper.', details: '', accessories: '' }, { eyebrow: 'B', title: 'Green at lunch', outfit: '', details: '', accessories: '' }, { eyebrow: 'C', title: 'After dark', outfit: '', details: '', accessories: '' }], generatedImages: [], fallback: false, photoUrl: null, intent: 'style' } },
    ]));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2600);
  const o = await page.evaluate(() => {
    const dash = document.getElementById('dash');
    return {
      mode: dash.getAttribute('data-home'),
      order: Array.from(dash.children).map((e) => e.id || e.className.split(' ')[0])
        .filter((id) => ['concierge', 'rb-firstlook', 'rb-ftu-rows', 'rb-rail', 'services', 'rb-insp-row'].includes(id)),
      concEy: document.getElementById('rb-conc-ey')?.textContent,
      rowsGone: !document.getElementById('rb-ftu-rows'),
      flEy: document.querySelector('.rb-fl-ey')?.textContent,
      flName: document.querySelector('.rb-fl-name')?.textContent,
      flMeta: document.querySelector('.rb-fl-meta')?.textContent,
      flCta: document.querySelector('.rb-fl-cta')?.textContent,
      flCap: !!document.querySelector('.rb-fl-cap'),
      flBar: !!document.querySelector('.rb-fl-progress'),
      flOpen: document.querySelector('.rb-fl-row')?.getAttribute('onclick'),
      railHidden: document.getElementById('rb-rail')?.style.display === 'none',
      inkFills: Array.from(document.querySelectorAll('#dash button')).filter((b) => b.offsetParent !== null
        && getComputedStyle(b).backgroundColor === 'rgb(32, 32, 33)').length,
      trkHidden: document.getElementById('wtrk')?.style.display === 'none',
      snRowHidden: (document.getElementById('rb-sn')?.style.display === 'none')
        || !document.getElementById('rb-sn')?.textContent.trim(),
      servicesHidden: document.querySelector('.services')?.offsetParent === null,
      styled: !!document.getElementById('rb-styled'),
      // Look states (2026-10-06): the row reads Suggested — the key
      // piece's ways as suggested looks, never the entry's own title.
      inspShown: document.getElementById('rb-insp-row')?.offsetParent !== null
        && document.querySelector('#rb-insp-row .rb-sec-ey')?.textContent === 'Suggested'
        && document.querySelectorAll('#rb-insp-row .rb-sn-card').length >= 1,
    };
  });
  check('O7 · no page errors', errs.length === 0, errs.join(' | ').slice(0, 200));
  check('O7 · a saved key piece surfaces in the home Suggested row as its looks (look states, 2026-10-06)',
    o.inspShown === true, String(o.inspShown));
  // The home cut (Annie, 2026-09-18): prompt, Your looks, the Inspiration
  // row — no hairline rows, no rail until a day is planned, no band.
  check('O7 · the prompt leads, then Your looks, then Inspiration — no rows, no band',
    o.mode === 'look' && JSON.stringify(o.order) === JSON.stringify(['concierge', 'rb-firstlook', 'rb-rail', 'services', 'rb-insp-row'])
      && o.concEy === undefined && o.rowsGone === true && o.railHidden === true && o.servicesHidden === true,
    JSON.stringify(o));
  check('O7 · the look she owns is the card, Finish it the only nudge',
    o.flEy === 'Your looks' && o.flName === 'Effortless Parisian Polish'
      && o.flMeta === '3 pieces yours · 1 borrowed' && o.flCta === 'Finish it'
      && /__lkCardOpen/.test(o.flOpen || ''), JSON.stringify(o));
  check('O7 · the look card carries no progress bar and no piece-count caption',
    o.flCap === false && o.flBar === false && o.trkHidden === true, JSON.stringify([o.flCap, o.flBar, o.trkHidden]));
  check('O7 · Style me is the one ink fill on the page',
    o.inkFills === 1, String(o.inkFills));
  check('O7 · Lookbook row + styled card stand down',
    o.snRowHidden === true && o.styled === false,
    JSON.stringify([o.snRowHidden, o.styled]));

  // A planned day brings the rail in (Annie, 2026-09-18 — the week ahead
  // IS the rail in this posture): pin the look to tomorrow and the rail
  // paints at dash level with its own head and the diary door.
  const tomorrow = new Date(Date.now() + 86400000);
  const tomorrowISO = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  await page.route('**planned_days**', (r) => {
    const u = r.request().url();
    // The Coming-up strip queries beyond the rail window — keep it empty.
    const body = u.includes('day_date=gt.') ? '[]' : JSON.stringify([
      { user_id: 'u-test', source_id: 'lk-1', source_type: 'look', day_index: 0, slot: 'day',
        day_date: tomorrowISO, status: 'planned', activity: 'Dinner with friends',
        headline: 'Effortless Parisian Polish', thumb_urls: [], item_ids: ['w0'], pinned: true,
        updated_at: new Date().toISOString() },
    ]);
    return r.fulfill({ status: 200, contentType: 'application/json', body });
  });
  const wk = await page.evaluate(async () => {
    window._rbRailPaint();
    await new Promise((r) => setTimeout(r, 900));
    const rail = document.getElementById('rb-rail');
    return {
      railVisible: !!rail && rail.style.display !== 'none' && rail.offsetParent !== null,
      atDash: rail?.parentNode?.id === 'dash',
      head: rail?.querySelector('.rb-rail-ey')?.textContent,
      door: rail?.querySelector('.rb-rail-open')?.textContent,
      // the native strip (2026-09-29): a planned day is a dotted cell
      planned: !!rail?.querySelector('.rb-wk.has-looks .rb-wk-dots i'),
    };
  });
  check('O7 · a planned day brings the week-ahead rail in, with the diary door',
    wk.railVisible === true && wk.atDash === true && wk.head === 'The week ahead' && wk.door === 'Diary ›' && wk.planned === true,
    JSON.stringify(wk));
  await ctx.close();
}

// A styled key piece rides its OWN Inspiration row on home, linked to the
// Inspiration tab — never the Lookbook row (Annie, 2026-08-12).
{
  // looks:false so boot's own seed can't overwrite this fixture on reload
  const { ctx, page, errs } = await boot(browser, 4, 1280, { looks: false, gtky: 'done' });
  await page.evaluate(() => {
    localStorage.setItem('rb_looks__u-test', JSON.stringify([
      { id: 'lk-row', name: 'A look', name_provisional: false, note: '', photo_url: null,
        tags: null, climate_band: 'year_round', climate_source: 'derived', source: 'manual',
        origin_look_id: null, created_at: '2026-08-05T10:00:00.000Z',
        pieces: [{ id: 'w0', slot: 'Top', position: 0, role: null }, { id: 'w1', slot: 'Bottom', position: 1, role: null }],
        wears: [] },
    ]));
    localStorage.setItem('robes_style_notes__u-test', JSON.stringify([
      { id: 1754700000000, type: 'key-piece', title: 'Pink barrel-leg jeans', subtitle: 'Worn three ways', img: null, kpData: { piece_name: 'Pink barrel-leg jeans', the_looks: [], ways: [
        { title: 'The Art Gallery Opening', occasion: 'Effortless chic', outfit: 'A shirt.', why: 'Because.' },
        { title: 'Brunch in the City', occasion: 'Easy', outfit: 'A blazer.', why: 'Because.' },
        { title: 'Evening Cocktails', occasion: 'Sharp', outfit: 'A heel.', why: 'Because.' },
      ] } },
      { id: 1754690000000, type: 'travel-edit', title: 'Ibiza edit', subtitle: 'Travel edit', img: null,
        tvData: { capsule: [], looks: [], dateFrom: '2026-08-07', tripDays: 5 } },
    ]));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2600);
  const k = await page.evaluate(() => {
    const ir = document.getElementById('rb-insp-row');
    const sn = document.getElementById('rb-sn');
    return {
      shown: !!ir && ir.style.display !== 'none',
      ey: ir?.querySelector('.rb-sec-ey')?.textContent,
      link: ir?.querySelector('.rb-sec-link')?.getAttribute('onclick'),
      title: ir?.querySelector('.rb-sn-title')?.textContent,
      type: ir?.querySelector('.rb-sn-type')?.textContent,
      kpInLookbookRow: /Pink barrel-leg/.test(sn?.textContent || ''),
      // Saved Looks only (2026-09-15): a travel edit never rides the home row.
      lookbookRowHasLook: !/Ibiza edit/.test(sn?.textContent || '') && !!sn?.querySelector('.rb-sn-card .rb-lk-mos'),
      // A saved Look's card draws its piece MOSAIC — photo_url is rare on a
      // Look, and the row must never show a blank cream card for one.
      lookMosaic: !!sn?.querySelector('.rb-sn-card .rb-lk-mos'),
      snEy: sn?.querySelector('.rb-sec-ey')?.textContent,
      snLink: sn?.querySelector('.rb-sec-link')?.getAttribute('onclick'),
    };
  });
  check('inspiration row · no page errors', errs.length === 0, errs.join(' | ').slice(0, 200));
  check('saved looks row · reads Saved looks and its View all opens the Lookbook on Show = Looks (Annie, 2026-10-05)',
    k.snEy === 'Saved looks' && /__rbLooksOpen/.test(k.snLink || ''), JSON.stringify([k.snEy, k.snLink]));
  // A kp filter a door set earlier never hides the looks View all asked for.
  await page.evaluate(() => window.__rbInspOpen());
  await page.waitForTimeout(300);
  const showKp = await page.evaluate(() => document.querySelector('#rb-lk-bar .rb-lk-tab.on')?.textContent);
  await page.evaluate(() => window.__rbLooksOpen());
  await page.waitForTimeout(300);
  const showLooks = await page.evaluate(() => ({ lab: document.querySelector('#rb-lk-bar .rb-lk-tab.on')?.textContent, kp: document.querySelectorAll('#rb-lk-grid [data-sugg]').length, looks: document.querySelectorAll('#rb-lk-grid .lt-card:not(.lt-sugg)').length }));
  check('saved looks row · View all after the Suggested door lands on the Saved tab — the saved looks show, no suggested tile',
    showKp === 'Suggested' && showLooks.lab === 'Saved' && showLooks.kp === 0 && showLooks.looks >= 1, JSON.stringify([showKp, showLooks]));
  await page.evaluate(() => window.__rbNavGo('home'));
  await page.waitForTimeout(300);
  // Look states (2026-10-06): the row reads Suggested — the key piece's
  // ways as suggested looks (prompt looks here: no wardrobe piece matches).
  check('suggested row · the key piece\'s looks ride home\'s Suggested row',
    k.shown === true && k.ey === 'Suggested' && ['The Art Gallery Opening', 'Brunch in the City', 'Evening Cocktails'].indexOf(k.title) > -1 && k.type === 'Suggested',
    JSON.stringify(k));
  check('suggested row · View all lands on the Lookbook\'s Suggested tab',
    /__rbInspOpen/.test(k.link || ''), k.link);
  // The home row mirrors what the Lookbook holds: her looks and her travel
  // edits. Key pieces are Inspiration's; days are the Diary's.
  check('inspiration row · key pieces never enter the Lookbook row, which keeps its looks',
    k.kpInLookbookRow === false && k.lookbookRowHasLook === true, JSON.stringify(k));
  check('lookbook row · a saved look draws its piece mosaic, never a blank card',
    k.lookMosaic === true, JSON.stringify(k.lookMosaic));
  // …and the key-piece result lights the Lookbook in the nav (no
  // Inspiration tab since the fold)
  const nav = await page.evaluate(async () => {
    window.__snOpenItem(1754700000000);
    await new Promise((r) => setTimeout(r, 1200));
    const kp = document.getElementById('kp-result-page');
    return {
      opened: !!kp && kp.style.display !== 'none',
      insp: !!document.getElementById('rb-tn-inspiration'),
      look: document.getElementById('rb-tn-lookbook')?.classList.contains('active'),
    };
  });
  check('key pieces row · a key-piece result lights the Lookbook; no Inspiration tab',
    nav.opened === true && nav.insp === false && nav.look === true, JSON.stringify(nav));
  await ctx.close();
}

// The module retires (2a): once she has created one of each live edit — a
// daily look and a travel edit (the weekly planner is a coming-soon promo;
// it rejoins the condition when the track returns) — the whole concierge
// falls away at once, meter, receipt row and all. Nothing takes its place.
{
  const { ctx, page, errs } = await boot(browser, 6);
  await page.evaluate(() => {
    localStorage.setItem('robes_style_notes__u-test', JSON.stringify([
      { id: 1755400000000, type: 'daily-look', title: 'A day', subtitle: '', img: null, dlData: { items: [] } },
      { id: 1755300000000, type: 'travel-edit', title: 'Lisbon edit', subtitle: '', img: null,
        tvData: { capsule: [], looks: [], dateFrom: '2026-08-01', tripDays: 3 } },
    ]));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2600);
  const r = await page.evaluate(() => ({
    services: document.querySelector('.services')?.offsetParent !== null,
    errsFree: true,
  }));
  check('concierge retires · no page errors', errs.length === 0, errs.join(' | ').slice(0, 200));
  // 2026-09-25: the band is the wardrobe tracker alone — making one of each
  // edit no longer retires it; only the ladder's last rung does.
  check('concierge · one of each live edit made — the tracker banner stands',
    r.services === true, JSON.stringify(r));
  await ctx.close();
}

// The concierge cards are day doors (2026-08-18): Style today scopes the
// prompt to TODAY, Plan the week scopes it to TOMORROW — the day chip
// carries the date, her words carry the brief. Image window 260px.
{
  const { ctx, page, errs } = await boot(browser, 5);
  // Node and Chromium disagree on the en-GB comma — compare comma-free.
  const fmt = (off) => {
    const d = new Date(Date.now() + off * 86400000);
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/,/g, '');
  };
  const c = await page.evaluate(async () => {
    const imgH = Math.round(document.querySelector('.svc-daily .svc-img')?.getBoundingClientRect().height || 0);
    const wkCta = Array.from(document.querySelectorAll('.services-grid .svc'))
      .map((el) => ({ t: el.querySelector('.svc-title')?.textContent, cta: el.querySelector('.svc-cta')?.textContent.trim() }))
      .find((x) => x.t === 'Weekly planner')?.cta || '';
    document.querySelector('.svc-daily').click();
    await new Promise((r) => setTimeout(r, 300));
    const chip = document.getElementById('rb-scopechip');
    const daily = { on: chip?.classList.contains('on'), label: chip?.querySelector('.lbl')?.textContent,
      focused: document.activeElement?.id === 'cb-ta' };
    Array.from(document.querySelectorAll('.services-grid .svc'))
      .find((el) => el.querySelector('.svc-title')?.textContent === 'Weekly planner')?.click();
    await new Promise((r) => setTimeout(r, 300));
    const weekly = { on: chip?.classList.contains('on'), label: chip?.querySelector('.lbl')?.textContent };
    return { imgH, wkCta, daily, weekly };
  });
  check('concierge doors · no page errors', errs.length === 0, errs.join(' | ').slice(0, 200));
  // The cards are hidden on home since 2026-09-25 (the banner is the band) —
  // their handlers still stand for the Lookbook's ways-to-fill clones.
  check('concierge doors · the weekly CTA promises the day-chip reality (audit 7.1)',
    c.wkCta === 'Start with tomorrow', c.wkCta);
  check('concierge doors · Style today scopes the prompt to TODAY, in focus',
    c.daily.on === true && (c.daily.label || '').replace(/,/g, '') === fmt(0) && c.daily.focused === true,
    JSON.stringify([c.daily, fmt(0)]));
  check('concierge doors · Start-with-tomorrow scopes the prompt to TOMORROW',
    c.weekly.on === true && (c.weekly.label || '').replace(/,/g, '') === fmt(1), JSON.stringify([c.weekly, fmt(1)]));
  await ctx.close();
}

// Mobile
{
  const { ctx, page, errs } = await boot(browser, 1, 390);
  check('390px · no page errors', errs.length === 0, errs.join(' | ').slice(0, 160));
  const m = await page.evaluate(() => {
    const dash = document.getElementById('dash');
    return {
      overflow: document.documentElement.scrollWidth <= window.innerWidth + 1,
      concFirst: dash?.querySelector('.dash-mast')?.nextElementSibling?.classList.contains('concierge'),
      trackerGone: document.getElementById('wtrk')?.offsetParent === null,
    };
  });
  check('390px · no horizontal overflow', m.overflow);
  check('390px · the prompt leads under the masthead', m.concFirst === true, String(m.concFirst));
  check('390px · no standalone learning card', m.trackerGone === true);
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────
// The next line (four-session funnel brief, slice 1.1 · 2026-09-18): the
// masthead echo becomes ONE derived sentence with a text door — never a
// filled button. Rules in order: model (none on file, ≥1 look) → finish (a
// look borrows ≥2 pieces, <5 photographed) → week (nothing planned ahead)
// → the standing question.
// ─────────────────────────────────────────────────────────────────────────
{
  // Two saved looks, no model on file → the model rule. (looks:false so the
  // boot's init script does not re-seed the looks on the reload below.)
  const { ctx, page, errs } = await boot(browser, 4, 1280, { looks: false });
  await page.evaluate(() => {
    localStorage.setItem('rb_looks__u-test', JSON.stringify([
      { id: 'lk-a', name: 'A look', name_provisional: false, note: '', photo_url: null, tags: null, source: 'manual',
        origin_look_id: null, created_at: '2026-08-05T10:00:00.000Z',
        pieces: [{ id: 'w0', slot: 'Top', position: 0, role: null }, { id: 'w1', slot: 'Bottom', position: 1, role: null }], wears: [] },
      { id: 'lk-a2', name: 'A second look', name_provisional: false, note: '', photo_url: null, tags: null, source: 'manual',
        origin_look_id: null, created_at: '2026-08-04T10:00:00.000Z',
        pieces: [{ id: 'w2', slot: 'Top', position: 0, role: null }, { id: 'w3', slot: 'Bottom', position: 1, role: null }], wears: [] }]));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2600);
  const read = () => page.evaluate(() => {
    const echo = document.querySelector('.dash-echo');
    const mast = document.querySelector('.dash-mast');
    return {
      text: echo?.textContent.replace(/\s+/g, ' ').trim(),
      name: echo?.querySelector('.rb-echo-name')?.textContent,
      door: echo?.querySelector('.rb-echo-door')?.textContent,
      doorInk: echo?.querySelector('.rb-echo-door') ? getComputedStyle(echo.querySelector('.rb-echo-door')).backgroundColor : null,
      mastFills: Array.from(mast?.querySelectorAll('button') || []).filter((b) => getComputedStyle(b).backgroundColor === 'rgb(32, 32, 33)').length,
    };
  });
  const a = await read();
  check('next line · no page errors', errs.length === 0, errs.join(' | ').slice(0, 200));
  check('next line · no model + a look → "Build your model and she’ll wear …", a text door, no ink in the masthead',
    a.name === 'A look' && /^Build your model and she’ll wear A look\./.test(a.text) && a.door === 'Build your model →'
      && a.doorInk !== 'rgb(32, 32, 33)' && a.mastFills === 0, JSON.stringify(a));

  // A model on file (the pre-migration-20 local prefs make an id) and a
  // look that borrows two pieces at three photographed → the finish rule.
  await page.evaluate(() => {
    localStorage.setItem('rb_model__u-test', JSON.stringify({ skin: 3, hair: 1, nudges: {}, kept: true, gender: 'woman', v: 2 }));
    localStorage.setItem('rb_test_dna', JSON.stringify({ style_archetypes: ['Minimal'] }));   // the first run done — else the door card leads (2026-10-09)
    localStorage.setItem('rb_looks__u-test', JSON.stringify([
      { id: 'lk-b', name: 'The Thursday one', name_provisional: false, note: '', photo_url: null, tags: null, source: 'robes',
        origin_look_id: null, created_at: '2026-09-10T10:00:00.000Z',
        pieces: [{ id: 'w0', slot: 'Top', position: 0, role: null }],
        proposals: [
          { role: null, chip: 'Jacket', cats: ['Outerwear'], opts: [{ name: 'A jacket' }], oi: 0, saved: false, image_url: null },
          { role: null, chip: 'Shoes', cats: ['Shoes'], opts: [{ name: 'Loafers' }], oi: 0, saved: false, image_url: null }],
        wears: [] }]));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2600);
  const b = await read();
  check('next line · a model + a look borrowing two pieces → the finish rule, "Swap pieces"',
    b.name === 'The Thursday one' && /borrows 2 pieces\. Photograph yours and swap them in\./.test(b.text) && b.door === 'Swap pieces →',
    JSON.stringify(b));
  // Its door (slice 4) opens the add flow BRIEFED for the look — its name
  // over step 1, a chip per borrowed piece — not the look itself.
  const opened = await page.evaluate(async () => {
    document.querySelector('.dash-echo .rb-echo-door')?.click();
    await new Promise((r) => setTimeout(r, 700));
    const step = document.querySelector('#wa-modal .fm-step');
    return { modal: !!document.querySelector('#wa-modal.open'),
      h: step?.querySelector('.fm-h')?.textContent.trim() || '',
      chips: Array.from(step?.querySelectorAll('.rb-wf-gap') || []).map((c) => c.textContent) };
  });
  check('next line · the finish door opens the add flow briefed for the look ("Make The Thursday one yours." · a jacket · loafers)',
    opened.modal && opened.h === 'Make The Thursday one yours.' && opened.chips.join('·') === 'a jacket·loafers', JSON.stringify(opened));
  await page.evaluate(() => window.WA && WA.close());
  await ctx.close();
}
{
  // A model on file, two owned-only looks (one a saved Robes build), six
  // photographed pieces, nothing in the diary → the week rule, whose door
  // opens the Diary. (five / robes stand down: at the rung with a build
  // already saved.)
  const { ctx, page, errs } = await boot(browser, 6, 1280, { looks: false, pics: 6 });
  await page.evaluate(() => {
    localStorage.setItem('rb_model__u-test', JSON.stringify({ skin: 3, hair: 1, nudges: {}, kept: true, gender: 'woman', v: 2 }));
    localStorage.setItem('rb_looks__u-test', JSON.stringify([
      { id: 'lk-w1', name: 'A look', name_provisional: false, note: '', photo_url: null, tags: null, source: 'manual',
        origin_look_id: null, created_at: '2026-08-05T10:00:00.000Z',
        pieces: [{ id: 'w0', slot: 'Top', position: 0, role: null }, { id: 'w1', slot: 'Bottom', position: 1, role: null }], wears: [] },
      { id: 'lk-w2', name: 'Robes built this', name_provisional: true, note: '', photo_url: null, tags: null, source: 'robes-build',
        origin_look_id: null, created_at: '2026-08-04T10:00:00.000Z',
        pieces: [{ id: 'w2', slot: 'Top', position: 0, role: null }, { id: 'w3', slot: 'Bottom', position: 1, role: null }], wears: [] }]));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2600);
  const c = await page.evaluate(() => {
    const echo = document.querySelector('.dash-echo');
    return { text: echo?.textContent.replace(/\s+/g, ' ').trim(), door: echo?.querySelector('.rb-echo-door')?.textContent };
  });
  check('next line · no page errors (week)', errs.length === 0, errs.join(' | ').slice(0, 200));
  check('next line · a model, looks, nothing planned → the week rule, "Open the diary"',
    /^Nothing planned this week\. Name a day and Robes dresses it\./.test(c.text) && c.door === 'Open the diary →', JSON.stringify(c));
  const diary = await page.evaluate(async () => {
    document.querySelector('.dash-echo .rb-echo-door')?.click();
    await new Promise((r) => setTimeout(r, 700));
    const sn = document.getElementById('sn-page');
    return { open: !!sn && sn.style.display !== 'none', cal: !!sn?.classList.contains('rb-cal-on') };
  });
  check('next line · the week door opens the Diary', diary.open === true && diary.cal === true, JSON.stringify(diary));
  // The brief rule (docs/style-memory-brief.md, slice A): five photographed
  // pieces, three worn days, nothing kept in her words → "Read them";
  // a kept line retires it and the week rule returns.
  await page.evaluate(() => {
    const looks = JSON.parse(localStorage.getItem('rb_looks__u-test'));
    looks[0].wears = [
      { id: 'we1', worn_on: '2026-09-01', piece_ids: ['w0', 'w1'], source: 'looks', source_id: null },
      { id: 'we2', worn_on: '2026-09-08', piece_ids: ['w0', 'w1'], source: 'looks', source_id: null },
      { id: 'we3', worn_on: '2026-09-15', piece_ids: ['w0', 'w1'], source: 'looks', source_id: null }];
    localStorage.setItem('rb_looks__u-test', JSON.stringify(looks));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2600);
  const br = await page.evaluate(() => {
    const echo = document.querySelector('.dash-echo');
    return { text: echo?.textContent.replace(/\s+/g, ' ').trim(), door: echo?.querySelector('.rb-echo-door')?.textContent, key: window.__rbNextDoorKey };
  });
  check('next line · at the rung with three worn days and nothing in her words → the brief rule, "Read them"',
    /^Robes has noticed a few things about how you dress\./.test(br.text) && br.door === 'Read them →', JSON.stringify(br));
  await page.evaluate(() => localStorage.setItem('rb_test_dna', JSON.stringify({ brief: { loves: [{ text: 'A sharp shoulder', source: 'typed' }], source: 'edited' } })));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2600);
  const br2 = await page.evaluate(() => document.querySelector('.dash-echo')?.textContent.replace(/\s+/g, ' ').trim());
  check('next line · a kept line in her brief retires the rule; the week rule returns', /^Nothing planned this week\./.test(br2 || ''), br2);
  // The memory consolidates (slice B): twenty entries since the brief was
  // last read → "noticed more" with its own door; a read stamps them consumed.
  const mem = (n, readAt) => ({ brief: { loves: [{ text: 'A sharp shoulder', source: 'typed' }] }, memory: { v: 1, read_at: readAt || null, entries: Array.from({ length: n }, (_, i) => ({ t: '2026-09-2' + (i % 9) + 'T10:00:00Z', k: 'wear', look: 'x' + i })) } });
  await page.evaluate((d) => localStorage.setItem('rb_test_dna', JSON.stringify(d)), mem(19));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2600);
  const br3 = await page.evaluate(() => document.querySelector('.dash-echo')?.textContent.replace(/\s+/g, ' ').trim());
  check('next line · nineteen entries in the memory → not yet (the week rule)', /^Nothing planned this week\./.test(br3 || ''), br3);
  await page.evaluate((d) => localStorage.setItem('rb_test_dna', JSON.stringify(d)), mem(20));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2600);
  const br4 = await page.evaluate(() => {
    const echo = document.querySelector('.dash-echo');
    return { text: echo?.textContent.replace(/\s+/g, ' ').trim(), door: echo?.querySelector('.rb-echo-door')?.textContent };
  });
  check('next line · twenty entries since the last read → "Robes has noticed more about how you dress." · Read it', /^Robes has noticed more about how you dress\./.test(br4.text || '') && br4.door === 'Read it →', JSON.stringify(br4));
  await page.evaluate((d) => localStorage.setItem('rb_test_dna', JSON.stringify(d)), mem(20, '2026-09-30T00:00:00Z'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2600);
  const br5 = await page.evaluate(() => document.querySelector('.dash-echo')?.textContent.replace(/\s+/g, ' ').trim());
  check('next line · a read stamps the memory consumed; the rule stands down', /^Nothing planned this week\./.test(br5 || ''), br5);
  await page.evaluate(() => localStorage.removeItem('rb_test_dna'));
  await ctx.close();
}
{
  // Slice 3.1 (2026-09-21): below the rung, a model and looks that borrow
  // nothing → the five rule counts the distance and its door opens the add
  // flow. Three of four pieces photographed → "Two more pieces".
  const { ctx, page, errs } = await boot(browser, 4, 1280, { pics: 3 });
  await page.evaluate(() => {
    localStorage.setItem('rb_model__u-test', JSON.stringify({ skin: 3, hair: 1, nudges: {}, kept: true, gender: 'woman', v: 2 }));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2600);
  const f = await page.evaluate(() => {
    const echo = document.querySelector('.dash-echo');
    return { text: echo?.textContent.replace(/\s+/g, ' ').trim(), door: echo?.querySelector('.rb-echo-door')?.textContent };
  });
  check('next line · no page errors (five)', errs.length === 0, errs.join(' | ').slice(0, 200));
  check('next line · under five photographed pieces → the five rule counts the distance, "Add pieces"',
    /^Two more pieces and Robes builds a look from yours alone\./.test(f.text) && f.door === 'Add pieces →', JSON.stringify(f));
  const add = await page.evaluate(async () => {
    document.querySelector('.dash-echo .rb-echo-door')?.click();
    await new Promise((r) => setTimeout(r, 700));
    const m = document.getElementById('wa-modal');
    return { open: !!m && getComputedStyle(m).display !== 'none', step1: /Add your pieces/i.test(m?.textContent || '') };
  });
  check('next line · the five door opens the add flow', add.open === true && add.step1 === true, JSON.stringify(add));
  await ctx.close();
}
{
  // At the rung with no Robes build saved yet → the robes rule; its door
  // opens the composer and Robes fills the rack (nothing saved).
  const { ctx, page, errs } = await boot(browser, 6, 1280, { pics: 5 });
  await page.route('**/api/alternates', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ alternates: [{ name: 'A found piece', brand: 'Robes', retailer_hint: 'Net-a-Porter', price_point: '€90', how: 'Worn open.' }, { name: 'Another', brand: 'Robes', retailer_hint: 'ASOS', price_point: '€40', how: 'Tucked.' }] }) }));
  await page.route('**/api/lookbuild/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ jobId: null, note: 'A quiet build.', look_tags: null, palette: [] }) }));
  await page.route('**/api/avatar/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await page.evaluate(() => {
    localStorage.setItem('rb_model__u-test', JSON.stringify({ skin: 3, hair: 1, nudges: {}, kept: true, gender: 'woman', v: 2 }));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2600);
  const r = await page.evaluate(() => {
    const echo = document.querySelector('.dash-echo');
    return { text: echo?.textContent.replace(/\s+/g, ' ').trim(), door: echo?.querySelector('.rb-echo-door')?.textContent };
  });
  check('next line · no page errors (robes)', errs.length === 0, errs.join(' | ').slice(0, 200));
  check('next line · five photographed pieces and no build saved → the robes rule, "Let Robes build one"',
    /^Five pieces filed\. Robes can build from yours now\./.test(r.text) && r.door === 'Let Robes build one →', JSON.stringify(r));
  const built = await page.evaluate(async () => {
    const writes0 = performance.getEntriesByType('resource').length;
    document.querySelector('.dash-echo .rb-echo-door')?.click();
    await new Promise((r) => setTimeout(r, 2200));
    const sn = document.getElementById('sn-page');
    const comp = document.querySelector('#rb-lk-body .rb-lk-composer');
    return {
      open: !!sn && getComputedStyle(sn).display !== 'none',
      composer: !!comp,
      built: !!document.querySelector('#rb-lk-body .rb-lk-saverow.built'),
      pieces: document.querySelectorAll('#rb-lk-body .rbc-rack .rbc-name').length,
      tryAnother: !!Array.from(document.querySelectorAll('#rb-lk-body .rb-lk-quiet')).find((b) => /Try another/.test(b.textContent)),
      door: !!document.querySelector('#rb-lk-body .rb-lk-robesdoor'),
      _w: writes0,
    };
  });
  check('next line · the robes door opens the composer with the rack filled by Robes, nothing saved, no second door',
    built.open && built.composer && built.built && built.pieces >= 2 && built.tryAnother && !built.door, JSON.stringify(built));
  await ctx.close();
}

// The robes line is a first-time offer (2026-10-01 — it read "Five pieces
// filed" on an account with fifty): it counts the pieces it sees, and it
// stands down once the ladder is done. The nav avatar carries HER initial.
{
  const { ctx, page, errs } = await boot(browser, 7, 1280, { pics: 7 });
  await page.evaluate(() => {
    localStorage.setItem('rb_model__u-test', JSON.stringify({ skin: 3, hair: 1, nudges: {}, kept: true, gender: 'woman', v: 2 }));
    localStorage.setItem('rb_test_name', 'Sinead');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2600);
  const r7 = await page.evaluate(() => ({ text: document.querySelector('.dash-echo')?.textContent.replace(/\s+/g, ' ').trim(), avatar: document.getElementById('avatar')?.textContent.trim(), greet: document.getElementById('dash-greet')?.textContent.trim() }));
  check('next line · seven photographed pieces → the robes line counts seven, never "Five"', /^Seven pieces filed\. Robes can build from yours now\./.test(r7.text || ''), JSON.stringify(r7));
  check('nav · the avatar circle carries her initial (Sinead → S), not the bundle’s A', r7.avatar === 'S' && /Sinead/.test(r7.greet || ''), JSON.stringify(r7));
  check('next line · no page errors (robes · seven)', errs.length === 0, errs.join(' | ').slice(0, 200));
  await ctx.close();
}
{
  const { ctx, page, errs } = await boot(browser, 16, 1280, { pics: 16 });
  await page.evaluate(() => { localStorage.setItem('rb_model__u-test', JSON.stringify({ skin: 3, hair: 1, nudges: {}, kept: true, gender: 'woman', v: 2 })); });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2600);
  const r16 = await page.evaluate(() => ({ text: document.querySelector('.dash-echo')?.textContent.replace(/\s+/g, ' ').trim(), door: document.querySelector('.dash-echo .rb-echo-door')?.textContent }));
  check('next line · past the ladder (sixteen filed) the robes line stands down', !!r16.text && !/pieces filed\. Robes can build/.test(r16.text) && r16.door !== 'Let Robes build one →', JSON.stringify(r16));
  check('next line · no page errors (robes · sixteen)', errs.length === 0, errs.join(' | ').slice(0, 200));
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────
// The model door on home (four-session funnel brief, slice 2.1 · 2026-09-18):
// no model on file + a saved look → a slim WHITE band on a hairline after
// the rail and before the concierge band; ✕ is "not now" (7 days); a model
// id retires it; no saved look → no door; in the first-look posture it
// follows "Your looks".
// ─────────────────────────────────────────────────────────────────────────
{
  const { ctx, page, errs } = await boot(browser, 4);
  const read = () => page.evaluate(() => {
    const d = document.getElementById('rb-model-door');
    const dash = document.getElementById('dash');
    const pill = d?.querySelector('.rb-pill');
    return {
      door: !!d,
      text: d?.textContent.replace(/\s+/g, ' ').trim() || '',
      bg: d ? getComputedStyle(d).backgroundColor : null,
      bleed: d ? getComputedStyle(d).marginLeft : null,
      pill: pill?.textContent.trim() || null,
      pillBg: pill ? getComputedStyle(pill).backgroundColor : null,
      x: !!d?.querySelector('.x'),
      order: Array.from(dash.children).map((e) => e.id || e.className.split(' ')[0]),
      inkOnHome: Array.from(dash.querySelectorAll('button')).filter((b) => b.offsetParent !== null && getComputedStyle(b).backgroundColor === 'rgb(32, 32, 33)').length,
      snooze: localStorage.getItem('rb_model_door_off__u-test'),
    };
  });
  const a = await read();
  check('model door · no page errors', errs.length === 0, errs.join(' | ').slice(0, 200));
  check('model door · no model + saved looks → the band: eyebrow, the serif line, the sub',
    a.door && /Your model/i.test(a.text) && /Build her once, she’ll wear every look you keep\./.test(a.text) && /Thirty seconds by hand, or two photographs\./.test(a.text),
    a.text);
  check('model door · white on a hairline, full-bleed, a hairline Build your model pill + a ✕ — Style me stays the one ink on home',
    a.bg === 'rgb(255, 255, 255)' && a.bleed === '-80px' && a.pill === 'Build your model' && a.pillBg !== 'rgb(32, 32, 33)' && a.x && a.inkOnHome === 1,
    JSON.stringify([a.bg, a.bleed, a.pill, a.pillBg, a.x, a.inkOnHome]));
  const iRail = a.order.indexOf('rb-rail'), iDoor = a.order.indexOf('rb-model-door'), iSvc = a.order.indexOf('services');
  check('model door · sits after the rail and before the concierge band', iRail >= 0 && iDoor === iRail + 1 && iSvc === iDoor + 1, JSON.stringify(a.order));
  await page.click('#rb-model-door .x');
  await page.waitForTimeout(250);
  const b = await read();
  check('model door · ✕ takes it off and files a timestamp, nothing else moves', !b.door && Number(b.snooze) > 0 && b.order.indexOf('services') === b.order.indexOf('rb-rail') + 1, JSON.stringify([b.door, b.snooze]));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2600);
  const c = await read();
  check('model door · stays down on the next load inside the seven days', !c.door, String(c.door));
  await page.evaluate(() => localStorage.setItem('rb_model_door_off__u-test', String(Date.now() - 8 * 24 * 3600 * 1000)));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2600);
  const d = await read();
  check('model door · returns after seven days while the condition holds (✕ is "not now", never "never")', d.door, String(d.door));
  await page.evaluate(() => localStorage.setItem('rb_model__u-test', JSON.stringify({ skin: 3, hair: 1, nudges: {}, kept: true, gender: 'woman', v: 2 })));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2600);
  const e = await read();
  check('model door · a model on file retires it', !e.door && errs.length === 0, JSON.stringify([e.door, errs.slice(0, 1)]));
  await ctx.close();
}
{
  const { ctx, page, errs } = await boot(browser, 4, 1280, { looks: false });
  const z = await page.evaluate(() => ({ door: !!document.getElementById('rb-model-door'), mode: document.getElementById('dash').getAttribute('data-home'), next: document.getElementById('rb-gtky')?.getAttribute('data-next') }));
  check('model door · no saved look → no door: the Getting-to-know-you card leads (the twin its first step)', !z.door && z.mode === 'gtky' && z.next === 'photos', JSON.stringify(z));
  await page.evaluate(() => {
    localStorage.setItem('rb_looks__u-test', JSON.stringify([
      { id: 'lk-only', name: 'The first one', name_provisional: false, note: '', photo_url: null, tags: null, source: 'manual',
        origin_look_id: null, created_at: '2026-08-05T10:00:00.000Z',
        pieces: [{ id: 'w0', slot: 'Top', position: 0, role: null }], wears: [] }]));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2600);
  const o = await page.evaluate(() => ({
    door: !!document.getElementById('rb-model-door'),
    notes: !!document.getElementById('rb-notes-door'),
    card: !!document.getElementById('rb-twin-card'),
    mode: document.getElementById('dash').getAttribute('data-home'),
    next: document.getElementById('rb-gtky')?.getAttribute('data-next'),
    rows: !!document.getElementById('rb-ftu-rows'),
    firstlook: !!document.getElementById('rb-firstlook'),
    servicesHidden: document.querySelector('.services')?.style.display === 'none',
  }));
  check('model door · one look, nothing begun: still the door card (the twin next), never the model door, the notes door or a question card',
    !o.door && !o.notes && !o.card && o.mode === 'gtky' && o.next === 'photos' && o.rows === false && o.firstlook === false && o.servicesHidden === true,
    JSON.stringify(o));
  // An icon on file answers the style step — the door card still carries the twin.
  await page.evaluate(() => localStorage.setItem('rb_test_icons', JSON.stringify(['The Row'])));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2600);
  const oc = await page.evaluate(() => ({ card: document.getElementById('rb-twin-card')?.dataset.kind || null, door: !!document.getElementById('rb-model-door'), notes: !!document.getElementById('rb-notes-door'), next: document.getElementById('rb-gtky')?.getAttribute('data-next'),
    rowsList: Array.from(document.querySelectorAll('#rb-gtky .rb-gtky-row')).map((r) => r.dataset.step + ':' + r.dataset.state) }));
  check('model door · with the style answered (an icon) the door card keeps the twin as its step — the style row reads done, nothing else stands',
    oc.card === null && !oc.door && !oc.notes && oc.next === 'photos' && JSON.stringify(oc.rowsList) === JSON.stringify(['style:done', 'look:done']), JSON.stringify(oc));
  // A model on file retires the door card: the first look posture, and with
  // a model there is no model door — it lives on the standard home alone now.
  await page.evaluate(() => localStorage.setItem('rb_model__u-test', JSON.stringify({ skin: 3, hair: 1, nudges: {}, kept: true, gender: 'woman', v: 2 })));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2600);
  const o2 = await page.evaluate(() => ({
    gtky: !!document.getElementById('rb-gtky'), door: !!document.getElementById('rb-model-door'), notes: !!document.getElementById('rb-notes-door'),
    mode: document.getElementById('dash').getAttribute('data-home'),
    order: Array.from(document.getElementById('dash').children).map((e) => e.id || e.className.split(' ')[0]).filter((id) => ['concierge', 'rb-firstlook', 'rb-model-door', 'rb-notes-door', 'rb-gtky'].includes(id)),
    echoShown: document.querySelector('.dash-echo')?.offsetParent !== null,
  }));
  check('model door · every step done → the first-look posture returns: Your looks after the prompt, no door card, no model door (she has one), the next line back',
    !o2.gtky && !o2.door && !o2.notes && o2.mode === 'look' && JSON.stringify(o2.order) === JSON.stringify(['concierge', 'rb-firstlook']) && o2.echoShown === true,
    JSON.stringify(o2));
  await page.evaluate(() => { localStorage.removeItem('rb_test_icons'); localStorage.removeItem('rb_model__u-test'); });
  check('model door · no page errors (postures)', errs.length === 0, errs.join(' | ').slice(0, 200));
  await ctx.close();
}

// ── The re-engagement channel (funnel slice 6) ────────────────────────
// The Session-1 ask under the styled card's loading tiles: one line, one
// text door, one consent (looks_ready + nudges), retires when the frames
// land. The Account details Emails section writes the prefs shape; the
// boot writes her timezone once when empty.
{
  const { ctx, page, errs } = await boot(browser, 1, 1280, { looks: false });
  const patches = [];
  await page.route('**ayowpaknssulsqqvwpqx.supabase.co/rest/v1/profiles**', (r) => {
    const req = r.request();
    if (req.method() === 'PATCH') { try { patches.push(JSON.parse(req.postData() || '{}')); } catch (_) { patches.push({}); } }
    return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  // The ask lives on the card while the looks compose — the slow path,
  // where no prefire landed: /api/style is held until the frames are "in".
  let releaseStyle = null;
  const styleGate = new Promise((r) => { releaseStyle = r; });
  await page.route('**/api/style', async (r) => { await styleGate; r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ways: [{ title: 'One' }, { title: 'Two' }, { title: 'Three' }], generatedImages: [], fallback: false }) }); });
  await page.evaluate(() => {
    sessionStorage.setItem('rb_onboard_piece', JSON.stringify({ prompt: 'Acid green cropped jumper', photo: null, cataloged: true }));
    sessionStorage.removeItem('rb_onboard_styled');
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(3200);
  const a = await page.evaluate(() => {
    const ask = document.getElementById('rb-styled-mail');
    const btn = document.getElementById('rb-styled-mail-btn');
    const filled = Array.from(document.querySelectorAll('#dash button')).filter((b) => b.offsetParent !== null)
      .filter((b) => getComputedStyle(b).backgroundColor === 'rgb(32, 32, 33)').map((b) => b.textContent.trim());
    return {
      ask: !!ask, inCard: !!ask && !!ask.closest('#rb-styled'),
      line: ask ? ask.textContent.replace(/\s+/g, ' ').trim() : '',
      btn: btn ? btn.textContent.trim() : '', btnBg: btn ? getComputedStyle(btn).backgroundColor : '',
      filled,
      pulsing: !!document.querySelector('#rb-styled [style*="rbStyPulse"]'),
    };
  });
  check('email ask · renders under the pulsing tiles while the looks compose', a.ask && a.inCard && a.pulsing, JSON.stringify(a));
  check('email ask · the line, the text door and the consent sub-line',
    /^Robes is composing your three looks\. Email me when they’re ready →\s*and the odd note when your wardrobe’s ready for more$/.test(a.line) && a.btn === 'Email me when they’re ready →', a.line);
  check('email ask · the door is text, never a fill — no ink on the composing card',
    a.btnBg !== 'rgb(32, 32, 33)' && a.filled.length === 0, JSON.stringify([a.btnBg, a.filled]));
  const tzPatch = patches.find((p) => p.notification_prefs && p.notification_prefs.timezone);
  check('email · the boot writes her timezone once when empty', !!tzPatch && typeof tzPatch.notification_prefs.timezone === 'string' && tzPatch.notification_prefs.timezone.length > 2, JSON.stringify(patches));
  const before = patches.length;
  await page.click('#rb-styled-mail-btn');
  await page.waitForTimeout(500);
  const tapped = await page.evaluate(() => ({
    line: document.getElementById('rb-styled-mail')?.textContent.trim(),
    prefs: window.__robes_profile && window.__robes_profile.notification_prefs,
  }));
  const optin = patches.slice(before).find((p) => p.notification_prefs);
  check('email ask · the tap writes looks_ready + nudges in ONE merge (the timezone kept) and settles to the tick',
    tapped.line === '✓ Robes will email you.' && optin && optin.notification_prefs.looks_ready === true && optin.notification_prefs.nudges === true
      && typeof optin.notification_prefs.timezone === 'string' && tapped.prefs && tapped.prefs.nudges === true,
    JSON.stringify([tapped, optin]));
  releaseStyle();
  await page.waitForTimeout(1500);
  const landed = await page.evaluate(() => ({
    ask: !!document.getElementById('rb-styled-mail'),
    card: !!document.getElementById('rb-styled'),
    deck: !!document.querySelector('#rb-lk-body .rb-lk-deck'),
  }));
  check('email ask · retires with the card once the looks land — on the deck', landed.ask === false && landed.card === false && landed.deck === true, JSON.stringify(landed));

  // Account details · Emails: defaults from the brief, the save's own merge-write
  const acct = await page.evaluate(() => {
    window.__rbAcctEmailsSync();
    return {
      shown: document.getElementById('acct-emails')?.style.display !== 'none',
      ready: document.getElementById('acct-em-ready').checked,
      nudges: document.getElementById('acct-em-nudges').checked,
      morning: document.getElementById('acct-em-morning').checked,
      hour: document.getElementById('acct-em-hour').value,
      labels: Array.from(document.querySelectorAll('#acct-emails label')).map((l) => l.textContent.replace(/\s+/g, ' ').trim()),
      hours: Array.from(document.querySelectorAll('#acct-em-hour option')).map((o) => o.value).join(','),
    };
  });
  check('account · Emails: three switches, the hour select 6–10, defaults reading the prefs (nudges on after the tap, morning off)',
    acct.shown && acct.ready === true && acct.nudges === true && acct.morning === false && acct.hour === '7' && acct.hours === '6,7,8,9,10'
      && /^When my looks are ready$/.test(acct.labels[0]) && /^Notes from Robes$/.test(acct.labels[1]) && /^A morning line on days I’ve planned at/.test(acct.labels[2]),
    JSON.stringify(acct));
  const before2 = patches.length;
  await page.evaluate(() => {
    document.getElementById('acct-em-morning').checked = true;
    document.getElementById('acct-em-hour').value = '8';
    return window.__saveAcctDetails();
  });
  await page.waitForTimeout(400);
  const saved = patches.slice(before2);
  const prefsPatch = saved.find((p) => p.notification_prefs);
  check('account · Save writes the names AND a separate prefs merge {looks_ready, nudges, morning, morning_hour}',
    saved.some((p) => 'first_name' in p && !('notification_prefs' in p)) && prefsPatch
      && prefsPatch.notification_prefs.morning === true && prefsPatch.notification_prefs.morning_hour === 8
      && prefsPatch.notification_prefs.nudges === true && prefsPatch.notification_prefs.looks_ready === true && typeof prefsPatch.notification_prefs.timezone === 'string',
    JSON.stringify(saved));
  check('email · no page errors', errs.length === 0, errs.join(' | ').slice(0, 200));
  await ctx.close();
}
// Already opted in (nudges true) → no ask; the column missing (migration
// 22 not run) → no ask and the Emails section stands down.
for (const prefs of [{ nudges: true }, null]) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1100 } });
  const page = await ctx.newPage();
  await page.route('**img.test/**', (r) => r.abort());
  await page.route('**cdn.jsdelivr.net/**', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: SUPA_STUB }));
  await page.route('**ayowpaknssulsqqvwpqx.supabase.co/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: r.request().url().includes('wardrobe_items') ? JSON.stringify(wardrobe(1)) : '[]' }));
  await page.route('**nominatim**', (r) => r.abort());
  await page.route('**open-meteo**', (r) => r.abort());
  await page.route('**/api/images/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ images: [], done: false }) }));
  await page.route('**/api/style', () => {});   // held: the card stays composing
  await page.addInitScript((p) => {
    window.__TEST_PROFILE = { first_name: 'Annie', last_name: '', mobile: '', style_icons: [], budget: null, wardrobe_description: '', style_dna: {},
      wardrobe_items_count: 1, onboarded_at: '2026-07-01', gender_identity: 'woman', ...(p ? { notification_prefs: p } : {}) };
    Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true });
    sessionStorage.setItem('rb_onboard_piece', JSON.stringify({ prompt: 'Acid green cropped jumper', photo: null, cataloged: true }));
  }, prefs);
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'load' });
  await page.waitForTimeout(3200);
  const q = await page.evaluate(() => {
    window.__rbAcctEmailsSync();
    return { card: !!document.getElementById('rb-styled'), ask: !!document.getElementById('rb-styled-mail'), emails: document.getElementById('acct-emails')?.style.display };
  });
  if (prefs) check('email ask · never renders for someone who already said yes', q.card && q.ask === false && q.emails !== 'none', JSON.stringify(q));
  else check('email · migration 22 not run: no ask, the Emails section stands down', q.card && q.ask === false && q.emails === 'none', JSON.stringify(q));
  await ctx.close();
}


// ─────────────────────────────────────────────────────────────────────────
// The draft on the next line (look prompt brief, phase 1 · 2026-10-01): a
// parked draft outranks every rule Robes derives — a thing SHE started
// comes first — and yields the moment the park is gone.
// ─────────────────────────────────────────────────────────────────────────
{
  const { ctx, page, errs } = await boot(browser, 6, 1280, { looks: true, pics: 6 });
  await page.evaluate(() => {
    localStorage.setItem('rb_lk_draft__u-test', JSON.stringify({
      v: 2, id: 'dftue', at: '2026-10-01T09:00:00.000Z',
      rows: [{ key: 'r1', slot: 'Top', piece: 'w0' }, { key: 'r2', slot: 'Bottom', piece: 'w1' }, { key: 'r3', slot: 'Shoe', piece: null }, { key: 'r4', slot: 'Bag', piece: null }],
      seq: 4, name: 'The Friday one', tags: null, roles: {}, photo: null, home: false,
      shop: [], shopImgs: [], note: null, palette: [], built: false, aspirational: false, gaps: [], mine: false, day: null, src: null, was: {}, styled: {},
    }));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2600);
  const readNext = () => page.evaluate(() => {
    const echo = document.querySelector('.dash-echo');
    return { text: echo?.textContent.replace(/\s+/g, ' ').trim(), name: echo?.querySelector('.rb-echo-name')?.textContent, door: echo?.querySelector('.rb-echo-door')?.textContent,
      doorInk: echo?.querySelector('.rb-echo-door') ? getComputedStyle(echo.querySelector('.rb-echo-door')).backgroundColor : null };
  });
  const d = await readNext();
  check('draft line · a parked draft leads the next line — her look\'s name, “is waiting, unsaved.”, Open it as a text door',
    /is waiting, unsaved\./.test(d.text || '') && d.name === 'The Friday one' && /^Open it/.test(d.door || '') && d.doorInk !== 'rgb(32, 32, 33)', JSON.stringify(d));
  const opened = await page.evaluate(async () => {
    document.querySelector('.dash-echo .rb-echo-door')?.click();
    await new Promise((r) => setTimeout(r, 800));
    return { page: document.getElementById('sn-page')?.style.display !== 'none', composer: !!document.querySelector('#rb-lk-body .rb-lk-composer'), title: document.getElementById('rb-lk-newtitle')?.value,
      rows: document.querySelectorAll('#rb-lk-body .rbc-rack .rbc-row:not(.rb-lk-prop) .rbc-name').length };
  });
  check('draft line · Open it lands on the composer holding the draft', opened.page && opened.composer && opened.title === 'The Friday one' && opened.rows === 2, JSON.stringify(opened));
  const gone = await page.evaluate(async () => {
    window.__lkComposerDiscard();
    await new Promise((r) => setTimeout(r, 150));
    document.getElementById('rb-del-yes')?.click();
    await new Promise((r) => setTimeout(r, 500));
    window.__rbNavGo('home');
    await new Promise((r) => setTimeout(r, 400));
    const echo = document.querySelector('.dash-echo');
    return { park: localStorage.getItem('rb_lk_draft__u-test'), text: echo?.textContent.replace(/\s+/g, ' ').trim() };
  });
  check('draft line · once the draft is let go the line yields to the next rule', gone.park == null && !/is waiting, unsaved/.test(gone.text || ''), JSON.stringify(gone));
  check('draft line · no page errors', errs.length === 0, errs.join(' | ').slice(0, 200));
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────
// The home field (look prompt brief, phase 3 · 2026-10-01 — FLAGGED):
// ?prompt=box, per device. Both flag states at every posture; the field's
// one slot; today's look leading; the classifier's three routes; Save →
// the date sheet with the named day; a Diary-dated draft skips the sheet.
// ─────────────────────────────────────────────────────────────────────────
const hbRead = (page) => page.evaluate(() => {
  const dash = document.getElementById('dash');
  const vis = (el) => !!el && el.offsetParent !== null;
  const hb = document.getElementById('rb-hb');
  return {
    mode: dash.getAttribute('data-home'),
    order: Array.from(dash.children).filter(vis).map((e) => e.id || e.className.split(' ')[0]),
    conc: vis(dash.querySelector('.concierge')),
    pills: Array.from(document.querySelectorAll('#rb-sugg button')).filter(vis).length,
    hb: vis(hb),
    fields: hb ? hb.querySelectorAll('#rb-lp, .rb-lp-field').length : 0,
    inline: !!hb?.querySelector('#rb-lp.rb-lp-in'),
    label: hb?.querySelector('#rb-lp-in')?.placeholder || hb?.querySelector('.rb-lp-field .ph')?.textContent || '',
    row: hb?.querySelector('#rb-lp .rb-lpd-row .nm')?.textContent || '', rowEy: hb?.querySelector('#rb-lp .rb-lpd-row .ey')?.textContent || '', rowMeta: hb?.querySelector('#rb-lp .rb-lpd-row .m')?.textContent || '',
    save: hb?.querySelector('#rb-lp .rb-lpd-save')?.textContent.trim() || '', busy: hb?.querySelector('#rb-lp .rb-lpd-busy')?.textContent || '',
    days: hb ? hb.querySelectorAll('#rb-lp .rb-lpd-days button').length : 0, hint: hb?.querySelector('#rb-lp .rb-lpd-days button.hint .n')?.textContent || '',
    done: hb?.querySelector('#rb-lp .rb-lpd-done')?.textContent.replace(/\s+/g, ' ').trim() || '',
    plusRows: Array.from(document.querySelectorAll('#rb-hb #rb-lp-plusmenu button')).map((b) => b.querySelector('span')?.childNodes[0]?.textContent.trim()),
    plusInField: !!hb?.querySelector('#rb-lp .fieldrow #rb-lp-plus') && !hb?.querySelector('.hp-add'),
    inkInHb: hb ? Array.from(hb.querySelectorAll('button')).filter((b) => getComputedStyle(b).backgroundColor === 'rgb(32, 32, 33)').length : 0,
    today: document.querySelector('#rb-today .nm')?.textContent || '',
    more: document.querySelector('#rb-today .rb-today-more')?.textContent || '',
    rowPos: hb ? getComputedStyle(hb.querySelector('.rb-hb-row')).position : '',
    bodyOn: document.body.classList.contains('rb-hb-on'),
  };
});
// The + lives INSIDE the field (2026-10-05): a piece by camera, by upload or
// from the wardrobe — then its two modes on the card above the field.
const HB_ROWS = ['Take a picture', 'Upload a photo', 'From wardrobe'];
// Both flag states at the three postures that carry the prompt: zero-lead
// (no looks, no styled card), the first look (O7) and the standard home.
for (const posture of ['zero-lead', 'look', 'standard']) {
  // 'default' seeds nothing — the live default, which is the box since
  // 2026-10-01 (?prompt=card is the per-device opt-out).
  for (const flag of ['card', 'box', 'default']) {
    const { ctx, page, errs } = await boot(browser, 6, 1280, { looks: posture === 'standard', pics: 6, prompt: flag === 'default' ? null : flag, gtky: posture === 'standard' ? null : 'done' });
    if (posture === 'look') {
      await page.evaluate((lk) => { localStorage.setItem('rb_looks__u-test', JSON.stringify([lk])); }, HB_LOOK);
      await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(2600);
    }
    const h = await hbRead(page);
    const modeOk = posture === 'standard' ? h.mode === 'standard' : h.mode === posture;
    check(`home field · ${posture} · ${flag} · no page errors`, errs.length === 0, errs.join(' | ').slice(0, 200));
    if (flag === 'card') {
      check(`home field · ${posture} · card · the prompt card and its three pills stand, no field`,
        modeOk && h.conc === true && h.pills === 3 && h.hb === false && h.bodyOn === false, JSON.stringify(h));
    } else {
      check(`home field · ${posture} · ${flag} · the card and the pills stand down; ONE box under the greeting — inline in the row, no sheet — reads "A new look for…", in flow on the web`,
        modeOk && h.conc === false && h.pills === 0 && h.hb === true && h.fields === 1 && h.inline && h.label === 'A new look for…'
          && h.order[0] === 'dash-mast' && h.order[1] === 'rb-hb' && h.rowPos === 'static', JSON.stringify(h));
      check(`home field · ${posture} · ${flag} · the + sits inside the field with its three rows, no ink inside the field's row`,
        JSON.stringify(h.plusRows) === JSON.stringify(HB_ROWS) && h.plusInField && h.inkInHb === 0, JSON.stringify([h.plusRows, h.plusInField, h.inkInHb]));
    }
    await ctx.close();
  }
}
// Zero (the styled card as the hero): the field stands down exactly as the
// prompt does — one goal at a time — and returns when the card retires.
{
  const { ctx, page, errs } = await boot(browser, 1, 1280, { looks: false, prompt: 'box' });
  // the card stands while the looks compose (the slow path — /api/style held)
  let releaseZ = null;
  const gateZ = new Promise((r) => { releaseZ = r; });
  await page.route('**/api/style', async (r) => { await gateZ; r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ways: [{ title: 'One' }, { title: 'Two' }, { title: 'Three' }], generatedImages: [], fallback: false }) }); });
  await page.evaluate(() => {
    sessionStorage.setItem('rb_onboard_piece', JSON.stringify({ prompt: 'Acid green cropped jumper', photo: null, cataloged: true }));
    sessionStorage.removeItem('rb_onboard_styled');
  });
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(3200);
  const z = await hbRead(page);
  const zg = await page.evaluate(() => ({ askey: document.getElementById('rb-gtky-askey')?.textContent, askeyNext: document.getElementById('rb-gtky-askey')?.nextElementSibling?.id, hbPrev: ((p) => p && (p.id || p.className))(document.getElementById('rb-hb')?.previousElementSibling) }));
  check('home field · the field leads under the masthead, bare, over the styled card and the door card (ninth pass)', z.mode === 'gtky' && z.hb === true && z.fields === 1 && z.conc === false && zg.hbPrev === 'dash-mast' && zg.askey === undefined, JSON.stringify([z, zg]));
  releaseZ(); await page.waitForTimeout(1500);   // the looks land on the deck
  await page.evaluate(() => window.__rbNavGo('home')); await page.waitForTimeout(500);
  const z2 = await hbRead(page);
  check('home field · the card retires onto the deck; home again: the door card and the field stand', z2.mode === 'gtky' && z2.hb === true && z2.fields === 1 && z2.conc === false && z2.order[1] === 'rb-hb' && z2.order[2] === 'rb-gtky', JSON.stringify(z2));
  check('home field · zero · no page errors', errs.length === 0, errs.join(' | ').slice(0, 200));
  await ctx.close();
}
// Today's look leads: the Diary holds a look for today → the card under the
// greeting is the door to the look (its box titled with the look); the
// FIELD stays neutral (Annie, 2026-10-01 — "Change today's look…" read
// wrong for planning): "A new look for…", opening the new-look box.
{
  const { ctx, page, errs } = await boot(browser, 6, 1280, { looks: false, pics: 6, prompt: 'box', planned: HB_PLANNED });
  await page.evaluate((lk) => { localStorage.setItem('rb_looks__u-test', JSON.stringify([lk, Object.assign({}, lk, { id: 'lk-hb-2', name: 'A second look' })])); }, HB_LOOK);
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(2800);
  const t = await hbRead(page);
  check('home field · today · the look leads the page and the field stays neutral — "A new look for…"',
    t.today === 'The office one' && t.label === 'A new look for…' && t.fields === 1 && t.more === '', JSON.stringify(t));
  const neutral = await page.evaluate(async () => {
    window.__rbHbOpen();
    await new Promise((r) => setTimeout(r, 300));
    const out = { sn: document.getElementById('sn-page')?.style.display === 'block', box: !!document.querySelector('#rb-hb #rb-lp.rb-lp-in'), sheet: !!document.querySelector('#rb-lp.rb-lp-dock, .rb-lp-scrim'), ph: document.getElementById('rb-lp-in')?.placeholder, focused: document.activeElement?.id };
    document.getElementById('rb-lp-in')?.blur();
    return out;
  });
  check('home field · today · the field is the NEW-look box, focused in place (a day to plan, a trip, a piece) — never today’s look, never a sheet',
    !neutral.sn && neutral.box && !neutral.sheet && neutral.ph === 'A new look for…' && neutral.focused === 'rb-lp-in', JSON.stringify(neutral));
  const opened = await page.evaluate(async () => {
    document.querySelector('#rb-today .rb-today-main').click();
    await new Promise((r) => setTimeout(r, 700));
    return { sn: document.getElementById('sn-page')?.style.display === 'block', box: !!document.querySelector('#rb-lp.rb-lp-dock'), name: document.querySelector('#rb-lp .rb-lp')?.getAttribute('aria-label'),
      ph: document.getElementById('rb-lp-in')?.placeholder, band: document.querySelector('#rb-lk-body .rb-ret .lab')?.textContent };
  });
  check('home field · today · the card opens the look itself with its box docked on it (named for the look, “Change this look…”), ‹ Home as the way back',
    opened.sn && opened.box && opened.name === 'The office one' && opened.ph === 'Change this look…' && opened.band === 'Home', JSON.stringify(opened));
  check('home field · today · no page errors', errs.length === 0, errs.join(' | ').slice(0, 200));
  await ctx.close();
}
// The classifier's three routes + Save → the date sheet with the named day.
{
  const { ctx, page, errs, posts } = await boot(browser, 6, 1280, { looks: true, pics: 6, prompt: 'box', intent: { intent: 'daily', confidence: 0.9, date_start: HB_TOMORROW } });
  await page.evaluate(() => window.__rbHbOpen()); await page.waitForTimeout(200);
  const b = await hbRead(page);
  const b2 = await page.evaluate(() => ({ chips: document.querySelectorAll('#rb-lp .rs-chip').length, thread: document.querySelectorAll('#rb-lp-thread > div').length, sheet: !!document.querySelector('#rb-lp.rb-lp-dock, .rb-lp-scrim'), send: getComputedStyle(document.getElementById('rb-lp-send')).display, sendInk: document.getElementById('rb-lp-send').classList.contains('ink'), focused: document.activeElement?.id }));
  check('home field · the box is the field: inline, focused, "A new look for…", no title, no chips, no thread, the send arrow showing while she is in the field (hairline until she types)',
    b.inline && b.label === 'A new look for…' && b2.chips === 0 && b2.thread === 0 && !b2.sheet && b2.send === 'flex' && !b2.sendInk && b2.focused === 'rb-lp-in' && b.inkInHb === 0, JSON.stringify([b, b2]));
  await page.evaluate(() => window.__rbLpText('Dinner with Mary tomorrow'));
  const typing = await page.evaluate(() => ({ ink: document.getElementById('rb-lp-send').classList.contains('ink') }));
  // The live build takes seconds; the stub answers in milliseconds — hold it
  // long enough for the busy line to be seen.
  await page.route('**/api/daily', async (r) => { try { posts.daily.push(r.request().postDataJSON()); } catch (_) { posts.daily.push(null); } await new Promise((res) => setTimeout(res, 700)); r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(HB_DAILY) }); });
  await page.locator('#rb-lp-in').press('Enter');
  const busySeen = await page.waitForSelector('#rb-hb .rb-lpd-busy', { timeout: 4000 }).then(() => true).catch(() => false);
  const mid = { busy: busySeen ? await page.evaluate(() => document.querySelector('#rb-hb .rb-lpd-busy')?.textContent || '') : '' };
  await page.waitForTimeout(2600);
  if (process.env.HB_SHOTS) await page.screenshot({ path: process.env.HB_SHOTS + 'hb-draft-1280.png' });
  const d = await hbRead(page);
  const d2 = await page.evaluate(() => ({ sn: document.getElementById('sn-page')?.style.display === 'block', overlay: document.getElementById('kp-loading-overlay')?.style.display, thread: document.querySelectorAll('#rb-lp-thread > div').length, park: ((d) => (d && d.v === 3) ? (d.drafts[0] || null) : d)(JSON.parse(localStorage.getItem('rb_lk_draft__u-test') || 'null'))?.name }));
  check('home field · route 1 · a day ask → the classifier → the draft is built IN the box: typing turns the send ink, one busy line while it builds (no overlay, no navigation), then the draft row lands under the field',
    typing.ink && posts.intent.length === 1 && posts.intent[0].prompt === 'Dinner with Mary tomorrow' && posts.daily.length === 1 && posts.daily[0].prompt === 'Dinner with Mary tomorrow' && posts.daily[0].name !== undefined
      && mid.busy === 'Building a draft from your wardrobe…' && d2.overlay !== 'flex' && !d2.sn && d.inline && d.row === 'Soft office armour' && d.rowEy === 'Draft look · not saved yet' && d.rowMeta === '2 pieces · all yours' && d.save === 'Save look'
      && d.label === 'Change this draft…' && d2.thread === 0 && d2.park === 'Soft office armour', JSON.stringify([typing, mid.busy, d, d2]));
  const sv0 = await page.evaluate(async () => { document.querySelector('#rb-hb .rb-lpd-save').click(); await new Promise((r) => setTimeout(r, 900)); return { sheet: !!document.getElementById('rb-lkdy'), sn: document.getElementById('sn-page')?.style.display === 'block', looks: JSON.parse(localStorage.getItem('rb_looks__u-test') || '[]').length, park: !!localStorage.getItem('rb_lk_draft__u-test') }; });
  if (process.env.HB_SHOTS) await page.screenshot({ path: process.env.HB_SHOTS + 'hb-saved-1280.png' });
  const sv = await hbRead(page);
  check('home field · Save look saves it IN the box: the row reads Saved to your lookbook, the week appears beneath it (seven days, the day her words named marked), the field asks for a new look again — no sheet, no page',
    !sv0.sheet && !sv0.sn && sv0.looks === 3 && !sv0.park && sv.rowEy === 'Saved to your lookbook' && sv.row === 'Soft office armour' && sv.days === 7 && sv.hint === String(Number(HB_TOMORROW.slice(8, 10))) && sv.save === '' && sv.label === 'A new look for…', JSON.stringify([sv0, sv, HB_TOMORROW]));
  await page.evaluate((iso) => window.__rbHbDate(iso), HB_TOMORROW); await page.waitForTimeout(400);
  if (process.env.HB_SHOTS) await page.screenshot({ path: process.env.HB_SHOTS + 'hb-dated-1280.png' });
  const dated = await hbRead(page);
  const pinned = await page.evaluate((iso) => { const rows = JSON.parse(localStorage.getItem('robes_planned_days__u-test') || '[]'); return rows.filter((r) => r.day_date === iso && r.source_type === 'look').length; }, HB_TOMORROW);
  check('home field · a day picked files the look to it — one confirmation line in the box (“✓ In your diary for …”, Change) and the pin on the day',
    /^✓ In your diary for \w{3} \d{1,2} \w{3}\.\s*Change$/.test(dated.done) && dated.days === 0 && pinned >= 1, JSON.stringify([dated.done, pinned]));
  await page.evaluate(() => window.__rbHbRePick()); await page.waitForTimeout(200);
  const re = await hbRead(page);
  check('home field · Change brings the week back', re.days === 7 && re.done === '', JSON.stringify(re));
  const opened2 = await page.evaluate(async () => { document.querySelector('#rb-hb .rb-lpd-row').click(); await new Promise((r) => setTimeout(r, 700)); return { sn: document.getElementById('sn-page')?.style.display === 'block', detail: !!document.querySelector('#rb-lk-body .rb-lk-held'), band: document.querySelector('#rb-lk-body .rb-ret .lab')?.textContent }; });
  check('home field · the saved row opens the look’s page with ‹ Home', opened2.sn && opened2.detail && opened2.band === 'Home', JSON.stringify(opened2));
  // Route 3 — a piece: a named piece in her words goes to the piece track.
  await page.evaluate(() => { window.__rbNavGo('home'); }); await page.waitForTimeout(400);
  await page.evaluate(() => window.__rbHbOpen()); await page.waitForTimeout(150);
  await page.evaluate(() => window.__rbLpText('Style my cream blazer three ways'));
  await page.locator('#rb-lp-in').press('Enter'); await page.waitForTimeout(1500);

  check('home field · route 3 · a named piece → the piece track (/api/style), the classifier never asked',
    posts.style.length === 1 && posts.style[0].intent === 'style' && posts.intent.length === 1, JSON.stringify([posts.style.length, posts.intent.length]));
  check('home field · routes · no page errors', errs.length === 0, errs.join(' | ').slice(0, 200));
  await ctx.close();
}
{
  const { ctx, page, errs, posts } = await boot(browser, 6, 1280, { looks: true, pics: 6, prompt: 'box', intent: { intent: 'travel', confidence: 0.9, destination: 'Lisbon', date_start: HB_TOMORROW, date_end: HB_ISO(new Date(Date.now() + 4 * 86400000)), vibe: 'easy' } });
  await page.evaluate(() => window.__rbHbOpen()); await page.waitForTimeout(150);
  await page.evaluate(() => window.__rbLpText('Four days in Lisbon from tomorrow'));
  await page.locator('#rb-lp-in').press('Enter'); await page.waitForTimeout(1200);
  const tv = await page.evaluate(() => ({ box: !!document.getElementById('rb-lp'), modal: !!document.getElementById('tv-brief-modal'), dest: document.getElementById('tv-dest')?.value }));
  check('home field · route 2 · a trip → the travel intake, prefilled from the classifier (Lisbon)', posts.intent.length === 1 && tv.modal && tv.dest === 'Lisbon', JSON.stringify(tv));
  await page.evaluate(() => document.getElementById('tv-brief-modal')?.remove());
  // Unclear → the box never questions her: it DEFAULTS to a new look (a
  // loose draft), the day assigned afterwards from the sheet.
  await page.route('**/api/intent', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ intent: 'unclear', confidence: 0.3 }) }));
  await page.evaluate(() => window.__rbHbOpen()); await page.waitForTimeout(150);
  await page.evaluate(() => window.__rbLpText('Something for Saturday'));
  await page.locator('#rb-lp-in').press('Enter'); await page.waitForTimeout(2200);
  const u = await hbRead(page);
  check('home field · unclear → no question: a NEW look (a loose draft) by default, landing in the box with Save look',
    u.inline && u.row === 'Soft office armour' && u.rowEy === 'Draft look · not saved yet' && u.save === 'Save look' && posts.daily.length === 1 && posts.daily[0].prompt === 'Something for Saturday', JSON.stringify([u, posts.daily.map((x) => x && x.prompt)]));
  // A completed ask never holds its thread — the next open is clean.
  await page.evaluate(() => { window.__rbNavGo('home'); }); await page.waitForTimeout(400);
  await page.evaluate(() => window.__rbHbOpen()); await page.waitForTimeout(150);
  const a = await page.evaluate(() => ({ box: !!document.getElementById('rb-lp'), thread: Array.from(document.querySelectorAll('#rb-lp-thread > div')).map((x) => x.className + ':' + x.textContent) }));
  check('home field · the box holds no thread after a completed ask', a.box && a.thread.length === 0, JSON.stringify(a));
  check('home field · routes 2 + ask · no page errors', errs.length === 0, errs.join(' | ').slice(0, 200));
  await ctx.close();
}
// A Diary-dated door (the rail's scope, Style today) opens the box ON the
// date: the words land attached, and Save files to the day — no sheet.
{
  const { ctx, page, errs, posts } = await boot(browser, 6, 1280, { looks: true, pics: 6, prompt: 'box' });
  await page.evaluate((iso) => window._ikScopeDay(iso), HB_TOMORROW); await page.waitForTimeout(200);
  const m = await page.evaluate(() => ({ box: !!document.querySelector('#rb-lp.rb-lp-dock'), scrim: !!document.querySelector('.rb-lp-scrim'), ph: document.getElementById('rb-lp-in')?.placeholder, chip: document.getElementById('rb-scopechip')?.className || '' }));
  check('home field · a dated door opens the box docked ON the date (reading the day, no shade, no chip under the flag)', m.box && !m.scrim && /^Dress \w{3} \d{1,2} \w{3}…$/.test(m.ph || '') && !/on/.test(m.chip), JSON.stringify(m));
  await page.evaluate(() => window.__rbLpText('The office, then drinks'));
  await page.locator('#rb-lp-in').press('Enter'); await page.waitForTimeout(2600);
  const dd = await page.evaluate(() => ({ row: document.querySelector('#rb-lp .rb-lpd-row .nm')?.textContent, ey: document.querySelector('#rb-lp .rb-lpd-row .ey')?.textContent, save: document.querySelector('#rb-lp .rb-lpd-save')?.textContent.trim(), sn: document.getElementById('sn-page')?.style.display === 'block' }));
  check('home field · dated · the words go straight to the day (no classifier) and the draft lands in the box carrying the day',
    posts.intent.length === 0 && posts.daily.length === 1 && posts.daily[0].prompt === 'The office, then drinks' && !dd.sn && dd.row === 'Soft office armour' && /^Draft look · \w{3} \d{1,2} \w{3}$/.test(dd.ey || '') && dd.save === 'Save look', JSON.stringify([posts.intent.length, dd]));
  const s2 = await page.evaluate(async () => { document.querySelector('#rb-lp .rb-lpd-save').click(); await new Promise((r) => setTimeout(r, 900)); return { sheet: !!document.getElementById('rb-lkdy'), done: document.querySelector('#rb-lp .rb-lpd-done')?.textContent.replace(/\s+/g, ' ').trim(), days: document.querySelectorAll('#rb-lp .rb-lpd-days button').length, looks: JSON.parse(localStorage.getItem('rb_looks__u-test') || '[]').length }; });
  check('home field · dated · Save files to the day in the box — the confirmation line, no week to pick, no sheet', !s2.sheet && /^✓ In your diary for \w{3} \d{1,2} \w{3}\.\s*Change$/.test(s2.done || '') && s2.days === 0 && s2.looks === 3, JSON.stringify(s2));
  check('home field · dated · no page errors', errs.length === 0, errs.join(' | ').slice(0, 200));
  await ctx.close();
}
// The intent fork's landings (2026-10-08): the door she picked in onboarding
// opens its first screen here — dress → the home box focused in place,
// catalogue → the add flow, and the walk's Done → the box under one sage
// line, the first ask after it logged as walk_asked.
{
  const { ctx, page, errs, posts } = await boot(browser, 0, 1280, { looks: false, prompt: null });
  await page.evaluate(() => sessionStorage.setItem('rb_onboard_intent', 'dress'));
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(3200);
  const dr = await page.evaluate(() => ({ box: !!document.querySelector('#rb-hb #rb-lp.rb-lp-in'), focused: document.activeElement?.id, handoff: sessionStorage.getItem('rb_onboard_intent'), next: document.getElementById('rb-gtky')?.getAttribute('data-next'), cta: document.querySelector('#rb-gtky .rb-gtky-cta')?.textContent, notes: !!document.getElementById('rb-notes-door') }));
  check('intent fork · Not sure yet (Dress me today, no words) lands on home: the door card leads with the twin, the box under it unfocused, the handoff consumed',
    dr.box && dr.focused !== 'rb-lp-in' && dr.handoff === null && dr.next === 'photos' && dr.cta === 'Add photographs' && !dr.notes, JSON.stringify(dr));
  // Dress me today WITH her words: they go through home's own box — the
  // draft lands beneath the field, Robes composes the look, the toast says so.
  await page.evaluate(() => { sessionStorage.setItem('rb_onboard_intent', 'dress'); sessionStorage.setItem('rb_onboard_prompt', 'Lunch with my sister, then the park'); });
  const toasts = [];
  await page.exposeFunction('__rbToastSeen', (t) => toasts.push(t));
  await page.evaluate(() => { const mo = new MutationObserver(() => { document.querySelectorAll('.wa-toast, #wa-toast, .rb-toast, [class*="toast"]').forEach((t) => { if (t.textContent.trim()) window.__rbToastSeen(t.textContent.trim()); }); }); mo.observe(document.body, { childList: true, subtree: true, characterData: true }); });
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(4200);
  const dp = await page.evaluate(() => ({ prompt: sessionStorage.getItem('rb_onboard_prompt'), row: document.querySelector('#rb-hb #rb-lp .rb-lpd-row .nm')?.textContent || '', ey: document.querySelector('#rb-hb #rb-lp .rb-lpd-row .ey')?.textContent || '',
    rows: Array.from(document.querySelectorAll('#rb-gtky .rb-gtky-row')).map((r) => r.dataset.step + ':' + r.dataset.state) }));
  check('intent fork · Dress me today with her words: the box sends them (one /api/daily with her prompt), the draft lands beneath the field, the look step reads done',
    dp.prompt === null && posts.daily.length === 1 && posts.daily[0].prompt === 'Lunch with my sister, then the park' && dp.row === 'Soft office armour' && /^Draft look/.test(dp.ey) && dp.rows.includes('look:done'),
    JSON.stringify([dp, posts.daily.map((x) => x && x.prompt)]));
  // Find my style lands HOME (B5) — the door card leads with Style DNA.
  await page.evaluate(() => { localStorage.setItem('rb_test_dna', JSON.stringify({ intent: 'style' })); sessionStorage.setItem('rb_onboard_intent', 'style'); localStorage.removeItem('rb_lk_draft__u-test'); });
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(3200);
  const fs = await page.evaluate(() => ({ url: location.pathname, handoff: sessionStorage.getItem('rb_onboard_intent'), next: document.getElementById('rb-gtky')?.getAttribute('data-next'), ey: document.querySelector('#rb-gtky .rb-gtky-body .ey')?.textContent, cta: document.querySelector('#rb-gtky .rb-gtky-cta')?.textContent,
    rows: Array.from(document.querySelectorAll('#rb-gtky .rb-gtky-row')).map((r) => r.dataset.step + ':' + r.dataset.state) }));
  check('intent fork · Find my style lands on home with Style DNA as the first door; the twin and the first look follow in the list',
    fs.url === '/dashboard' && fs.handoff === null && fs.next === 'style' && fs.ey === 'Next · Style DNA' && fs.cta === 'Find my style' && JSON.stringify(fs.rows) === JSON.stringify(['photos:later', 'look:later']), JSON.stringify(fs));
  await page.evaluate(() => localStorage.removeItem('rb_test_dna'));
  await page.evaluate(() => sessionStorage.setItem('rb_onboard_intent', 'catalogue'));
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(3200);
  const ca = await page.evaluate(() => ({ modal: document.getElementById('wa-modal')?.classList.contains('open'), file: !!document.getElementById('wa-rb-file'), multiple: document.getElementById('wa-rb-file')?.hasAttribute('multiple') }));
  check('intent fork · Build my wardrobe lands on the add flow, several photos at a time', ca.modal === true && ca.file && ca.multiple === true, JSON.stringify(ca));
  // Build my digital twin → the twin page (?page=twin, which spBoot routes
  // to #twin); the settings page itself is stubbed blank here — the pin is
  // the redirect, not the page (the settings harness pins the page).
  await page.route('**/settings?page=twin', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>twin</title>' }));
  await page.evaluate(() => sessionStorage.setItem('rb_onboard_intent', 'twin'));
  // 'commit', not 'networkidle' — the boot's location.replace cuts the
  // dashboard load short, which networkidle reads as a hang.
  await page.reload({ waitUntil: 'commit' }).catch(() => {});
  await page.waitForURL('**/settings?page=twin', { timeout: 6000 }).catch(() => {});
  const tw = { url: page.url(), handoff: await page.evaluate(() => sessionStorage.getItem('rb_onboard_intent')) };
  check('intent fork · Build my digital twin lands on the twin page, the handoff consumed', tw.url.endsWith('/settings?page=twin') && tw.handoff === null, JSON.stringify(tw));
  await page.goto(page.url().replace(/\/settings\?page=twin$/, '/dashboard'), { waitUntil: 'networkidle' }); await page.waitForTimeout(1200);
  await page.evaluate(() => sessionStorage.setItem('rb_walk_done', '1'));
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(3200);
  const wd = await page.evaluate(() => ({ line: document.getElementById('rb-walk-line')?.textContent.replace(/\s+/g, ' ').trim(), before: document.getElementById('rb-walk-line')?.nextElementSibling?.id, focused: document.activeElement?.id, handoff: sessionStorage.getItem('rb_walk_done') }));
  check('intent fork · the walk’s Done lands on home with the box focused under “Read. Ask Robes for a look.”',
    wd.line === 'Read. Ask Robes for a look.' && wd.before === 'rb-hb-row' && wd.focused === 'rb-lp-in' && wd.handoff === null, JSON.stringify(wd));
  await page.evaluate(() => window.__rbLpText('Dinner on Friday'));
  await page.locator('#rb-lp-in').press('Enter'); await page.waitForTimeout(1500);
  const asked = await page.evaluate(() => ({ line: !!document.getElementById('rb-walk-line') }));
  check('intent fork · the first ask after the walk takes the line with it', asked.line === false, JSON.stringify(asked));
  check('intent fork · no page errors', errs.length === 0, errs.join(' | ').slice(0, 200));
  await ctx.close();
}

// ─────────────────────────────────────────────────────────────────────────
// Getting to know you (First Run v2 + the redlines, 2026-10-09): while the
// twin, her style or the first look is still to come — and the Lookbook
// holds at most her first look — home is ONE door card carrying the next
// step, a short list of what follows, and the box under "Or ask Robes".
// The order follows the onboarding door (Find my style leads with Style
// DNA); every step done retires the module for good.
// ─────────────────────────────────────────────────────────────────────────
{
  const gtkyRead = () => page.evaluate(() => {
    const dash = document.getElementById('dash');
    const vis = (el) => !!el && el.offsetParent !== null;
    const g = document.getElementById('rb-gtky');
    const door = g?.querySelector('.rb-gtky-door');
    const cta = g?.querySelector('.rb-gtky-cta');
    const mast = dash.querySelector('.dash-mast');
    return {
      mode: dash.getAttribute('data-home'), bodyCls: document.body.classList.contains('rb-gtky'),
      order: Array.from(dash.children).filter(vis).map((e) => e.id || e.className.split(' ')[0]),
      next: g?.getAttribute('data-next'),
      slots: Array.from(g?.querySelectorAll('.rb-gtky-slots .sl') || []).map((s) => [s.textContent.trim(), getComputedStyle(s).borderTopStyle, Math.round(s.getBoundingClientRect().width / s.getBoundingClientRect().height * 100) / 100]),
      ey: door?.querySelector('.ey')?.textContent, eyColor: door ? getComputedStyle(door.querySelector('.ey')).color : null,
      h: door?.querySelector('h3')?.textContent.replace(/\s+/g, ' ').trim(), hEm: door?.querySelector('h3 em')?.textContent,
      line: door?.querySelector('p')?.textContent, lineFont: door ? getComputedStyle(door.querySelector('p')).fontFamily : null,
      cta: cta?.textContent, ctaBg: cta ? getComputedStyle(cta).backgroundColor : null, ctaBorder: cta ? getComputedStyle(cta).borderTopWidth : null,
      doorBg: door ? getComputedStyle(door).backgroundColor : null, doorShadow: door ? getComputedStyle(door).boxShadow : null,
      head: g?.querySelector('.rb-gtky-head')?.textContent, headColor: g ? getComputedStyle(g.querySelector('.rb-gtky-head')).color : null,
      rows: Array.from(g?.querySelectorAll('.rb-gtky-row') || []).map((r) => ({ step: r.dataset.step, state: r.dataset.state, t: r.querySelector('.t')?.textContent, l: r.querySelector('.l')?.textContent, mk: r.querySelector('.mk')?.textContent.trim(), mkStyle: getComputedStyle(r.querySelector('.mk')).borderTopStyle, h: Math.round(r.getBoundingClientRect().height), chev: r.querySelector('.ch')?.textContent })),
      ink: Array.from(dash.querySelectorAll('button')).filter((b) => vis(b) && getComputedStyle(b).backgroundColor === 'rgb(32, 32, 33)').map((b) => b.textContent.trim()),
      twin: !!document.getElementById('rb-twin-card'), notes: !!document.getElementById('rb-notes-door'), model: !!document.getElementById('rb-model-door'),
      ftuRows: !!document.getElementById('rb-ftu-rows'), firstlook: !!document.getElementById('rb-firstlook'),
      rail: vis(document.getElementById('rb-rail')), services: vis(document.querySelector('.services')), sn: vis(document.getElementById('rb-sn')), insp: vis(document.getElementById('rb-insp-row')),
      echo: vis(mast.querySelector('.dash-echo')),
      wxFirst: mast.firstElementChild?.id === 'dash-wx-m', wxLast: mast.lastElementChild?.id === 'dash-wx-m' && mast.firstElementChild?.id === 'dash-greet', echoText: mast.querySelector('.dash-echo')?.textContent, greet: document.getElementById('dash-greet')?.textContent,
      hbPrev: ((p) => p && (p.id || p.className))(document.getElementById('rb-hb')?.previousElementSibling), askey: document.getElementById('rb-gtky-askey')?.textContent, askeyNext: document.getElementById('rb-gtky-askey')?.nextElementSibling?.id,
      hbVis: vis(document.getElementById('rb-hb')),
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      gW: g ? Math.round(g.getBoundingClientRect().width) : null,
    };
  });
  let ctx, page, errs, events;
  const gboot = async (o = {}, dna = null, model = false) => {
    const r = await boot(browser, o.n ?? 2, o.width || 1280, { looks: false, prompt: null, pics: o.pics || 0 });
    ({ ctx, page, errs } = r); events = [];
    await page.route('**ayowpaknssulsqqvwpqx.supabase.co/rest/v1/events**', (rt) => { try { const b = JSON.parse(rt.request().postData() || '{}'); events.push([b.event_type, b.metadata]); } catch (_) {} return rt.fulfill({ status: 201, contentType: 'application/json', body: '' }); });
    await page.route('**/settings?**', (rt) => rt.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>settings</title>' }));
    await page.evaluate(({ dna, model }) => {
      if (dna) localStorage.setItem('rb_test_dna', JSON.stringify(dna)); else localStorage.removeItem('rb_test_dna');
      if (model) localStorage.setItem('rb_model__u-test', JSON.stringify({ skin: 3, hair: 1, nudges: {}, kept: true, gender: 'woman', v: 2 })); else localStorage.removeItem('rb_model__u-test');
      localStorage.removeItem('rb_lk_draft__u-test');
    }, { dna, model });
    await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(3000);
    return r;
  };
  // The twin door: two pieces, nothing done, no intent → the twin first.
  await gboot();
  const a = await gtkyRead();
  check('gtky · no page errors', errs.length === 0, errs.join(' | ').slice(0, 200));
  check('gtky · the mode: the box straight under the masthead, then the door card — nothing else on the page',
    a.mode === 'gtky' && a.bodyCls && JSON.stringify(a.order) === JSON.stringify(['dash-mast', 'rb-hb', 'rb-gtky']) && a.hbVis && a.hbPrev === 'dash-mast', JSON.stringify([a.mode, a.order, a.hbPrev]));
  check('gtky · the twin door (H3): Next · Your digital twin, two dashed 4:5 slots Close-up / Full length, the serif title with its italic half, the sans line, "Add photographs"',
    a.next === 'photos' && a.ey === 'Next · Your digital twin' && JSON.stringify(a.slots) === JSON.stringify([['Close-up', 'dashed', 0.8], ['Full length', 'dashed', 0.8]])
      && a.h === 'Two photographs, one model of you.' && a.hEm === 'one model of you.' && /A close-up and a full length\./.test(a.line) && /Inter/.test(a.lineFont) && a.cta === 'Add photographs',
    JSON.stringify([a.next, a.ey, a.slots, a.h, a.hEm, a.line, a.cta]));
  check('gtky · the card (H2): white on a hairline with a soft shadow; the CTA a hairline pill, never ink — no ink anywhere on home',
    a.doorBg === 'rgb(255, 255, 255)' && a.doorShadow !== 'none' && a.ctaBg === 'rgb(255, 255, 255)' && a.ctaBorder === '1px' && a.eyColor === 'rgb(126, 124, 90)' && a.ink.length === 0, JSON.stringify([a.doorBg, a.doorShadow, a.ctaBg, a.ctaBorder, a.eyColor, a.ink]));
  check('gtky · the list (H4): Getting to know you, the two steps that follow — dashed markers, the 62px rows, › — no counts',
    a.head === 'Getting to know you' && a.headColor === 'rgb(142, 112, 119)' && a.rows.length === 2
      && a.rows[0].step === 'style' && a.rows[0].state === 'later' && a.rows[0].t === 'Your style' && a.rows[0].l === 'The styles that feel like you' && a.rows[0].mk === '' && a.rows[0].mkStyle === 'dashed' && a.rows[0].h >= 62 && a.rows[0].chev === '›'
      && a.rows[1].step === 'look' && a.rows[1].t === 'Your first look' && a.rows[1].l === 'Dressed for today' && !/\d/.test(a.head + a.rows.map((r) => r.t + r.l).join('')),
    JSON.stringify([a.head, a.headColor, a.rows]));
  check('gtky · nothing else stands: no question card, no walk card, no model door, no rows, no Your looks, no rail, no band, no Lookbook or Inspiration row',
    !a.twin && !a.notes && !a.model && !a.ftuRows && !a.firstlook && !a.rail && !a.services && !a.sn && !a.insp, JSON.stringify([a.twin, a.notes, a.model, a.ftuRows, a.firstlook, a.rail, a.services, a.sn, a.insp]));
  check('gtky · the header (Annie, 2026-10-09): the greeting, the italic sub, the weather line beneath them',
    a.echo === true && a.echoText === 'What are you dressing for today?' && a.wxLast === true && a.wxFirst === false && /^Good (morning|afternoon|evening), Annie\.$/.test(a.greet || ''), JSON.stringify([a.echo, a.echoText, a.wxLast, a.greet]));
  check('gtky · the box carries no eyebrow and sits between the weather line and the door card (ninth pass)', a.askey === undefined && a.hbPrev === 'dash-mast', JSON.stringify([a.askey, a.hbPrev]));
  check('gtky · gtky_shown {next, order}', events.some(([t, m]) => t === 'gtky_shown' && m.next === 'photos' && m.order === 'photos,style,look'), JSON.stringify(events.filter(([t]) => /gtky/.test(t))));
  // H8: before the twin exists, the box says so once — a line, never a gate
  const h8 = await page.evaluate(async () => {
    const toastText = () => document.querySelector('#toast.show #toast-msg, #toast.show, .toast.show')?.textContent.trim() || '';
    window.__rbHbOpen(); await new Promise((r) => setTimeout(r, 200));
    const first = toastText(); const focused = document.activeElement?.id;
    document.getElementById('rb-lp-in')?.blur();
    await new Promise((r) => setTimeout(r, 3200));
    window.__rbHbOpen(); await new Promise((r) => setTimeout(r, 200));
    const second = toastText();
    document.getElementById('rb-lp-in')?.blur();
    return { first, focused, second };
  });
  check('gtky · tapping the box before the twin exists shows "Robes dresses you on your model. Two photographs first." once — the field still works',
    h8.first === 'Robes dresses you on your model. Two photographs first.' && h8.focused === 'rb-lp-in' && h8.second === '', JSON.stringify(h8));
  // The row and the door are doors: the twin page, the walk.
  await page.click('#rb-gtky .rb-gtky-row[data-step="style"]');
  await page.waitForURL('**/settings?walk=1', { timeout: 5000 }).catch(() => {});
  check('gtky · the style row opens the walk', /\/settings\?walk=1$/.test(page.url()), page.url());
  check('gtky · gtky_tapped {step, from}', events.some(([t, m]) => t === 'gtky_tapped' && m.step === 'style' && m.from === 'row'), JSON.stringify(events.filter(([t]) => t === 'gtky_tapped')));
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' }); await page.waitForTimeout(3000);
  await page.click('#rb-gtky .rb-gtky-cta');
  await page.waitForURL('**/settings?page=twin', { timeout: 5000 }).catch(() => {});
  check('gtky · Add photographs opens the twin page', /\/settings\?page=twin$/.test(page.url()), page.url());
  await ctx.close();

  // Find my style: Style DNA leads, the twin and the look follow.
  await gboot({}, { intent: 'style' });
  const b = await gtkyRead();
  check('gtky · Find my style → the Style DNA door first (B5): Next · Style DNA, "Now, what feels like you.", Find my style; the twin and the first look in the list',
    b.next === 'style' && b.ey === 'Next · Style DNA' && b.h === 'Now, what feels like you.' && b.cta === 'Find my style' && b.slots.length === 0
      && b.rows.map((r) => r.step + ':' + r.state + ':' + r.t).join('|') === 'photos:later:Your digital twin|look:later:Your first look', JSON.stringify([b.next, b.ey, b.h, b.cta, b.rows]));
  check('gtky · style order · no page errors', errs.length === 0, errs.join(' | ').slice(0, 200));
  await ctx.close();

  // The look door, the key-piece way: model + style done, piece intent.
  await gboot({ n: 2 }, { intent: 'piece', style_archetypes: ['Minimal'] }, true);
  const c = await gtkyRead();
  check('gtky · the twin and the style done → the look door: Ready · A key piece, "One piece, three ways to wear it.", Style a key piece; the two done rows read as such',
    c.next === 'look' && c.ey === 'Ready · A key piece' && c.h === 'One piece, three ways to wear it.' && c.cta === 'Style a key piece'
      && c.rows.map((r) => r.step + ':' + r.state + ':' + r.l + ':' + r.mk + ':' + r.mkStyle).join('|') === 'photos:done:A model of you, built:✓:solid|style:done:Filed under Style DNA:✓:solid', JSON.stringify([c.next, c.ey, c.h, c.cta, c.rows]));
  const pick = await page.evaluate(async () => { document.querySelector('#rb-gtky .rb-gtky-cta').click(); await new Promise((r) => setTimeout(r, 500)); return { box: !!document.querySelector('#rb-hb #rb-lp.rb-lp-in'), sheet: !!document.getElementById('cb-wa-pick') }; });
  check('gtky · Style a key piece opens the box with her wardrobe sheet — the piece first', pick.box && pick.sheet, JSON.stringify(pick));
  check('gtky · piece door · no page errors', errs.length === 0, errs.join(' | ').slice(0, 200));
  await ctx.close();

  // The look door, the today way; a look saved retires the module.
  await gboot({ n: 2 }, { intent: 'dress', style_archetypes: ['Minimal'] }, true);
  const d = await gtkyRead();
  check('gtky · Dress me today → Ready · Today, the weekday leading the title, "Robes has a look in mind.", Dress me today',
    d.next === 'look' && d.ey === 'Ready · Today' && /^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\. Robes has a look in mind\.$/.test(d.h || '') && d.cta === 'Dress me today', JSON.stringify([d.next, d.ey, d.h, d.cta]));
  const dm = await page.evaluate(async () => { document.querySelector('#rb-gtky .rb-gtky-cta').click(); await new Promise((r) => setTimeout(r, 400)); return { focused: document.activeElement?.id, dock: !!document.querySelector('#rb-lp.rb-lp-dock') }; });
  check('gtky · Dress me today focuses the box in place', dm.focused === 'rb-lp-in' && !dm.dock, JSON.stringify(dm));
  await page.evaluate((lk) => { document.getElementById('rb-lp-in')?.blur(); localStorage.setItem('rb_looks__u-test', JSON.stringify([lk])); }, HB_LOOK);
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(3000);
  const e = await gtkyRead();
  check('gtky · every step done → the module retires for good: the first-look posture, the next line back, the body class gone',
    e.mode === 'look' && !e.bodyCls && e.next === undefined && e.firstlook && e.echo === true && e.askey === undefined, JSON.stringify([e.mode, e.bodyCls, e.next, e.firstlook, e.echo, e.askey]));
  check('gtky · done · no page errors', errs.length === 0, errs.join(' | ').slice(0, 200));
  await ctx.close();

  // 390: the card fits, the slots run two across, no overflow (H6: the box clears the dock).
  await gboot({ width: 390 });
  const m = await gtkyRead();
  const m2 = await page.evaluate(() => { const hb = document.getElementById('rb-hb'); const dock = document.getElementById('rb-dock'); return { hbBottom: Math.round(hb.getBoundingClientRect().bottom), docTop: dock ? Math.round(dock.getBoundingClientRect().top) : null, bodyH: document.body.scrollHeight, vh: window.innerHeight }; });
  check('gtky · 390: the card fits the viewport, two slots across, no horizontal overflow', !m.overflow && m.gW <= 390 && m.slots.length === 2 && m.next === 'photos', JSON.stringify([m.overflow, m.gW, m.slots.length]));
  check('gtky · 390 · no page errors', errs.length === 0, errs.join(' | ').slice(0, 200));
  await ctx.close();
}

// The question cards (cut C of the first-run plan, 2026-10-09): one card a
// visit once the walk's invitation has retired — the facts, three pieces
// she loves, one Robes-noticed line — in the Robes-noticed register, never
// beside the model door, never the same card twice in a day, every answer
// landing on the key Settings writes. Then the investment-vs-memory read
// riding styleDna into the next generation.
{
  const TW_TODAY = HB_TODAY, TW_YDAY = HB_ISO(new Date(Date.now() - 86400000));
  // Six photographed pieces; `heroes` carry a star, `priced` carry EUR prices.
  const twinRows = ({ heroes = 0, priced = false } = {}) => wardrobe(6).map((w, i) => Object.assign(w, {
    image_url: 'https://img.test/w' + i + '.jpg', times_worn: 6 - i,
    hero_position: i < heroes ? i + 1 : null,
    price: priced && i < 4 ? [600, 500, 400, 700][i] : null, currency: priced && i < 4 ? 'EUR' : null,
  }));
  const twinBoot = async ({ dna = {}, icons = ['The Row'], heroes = 0, priced = false, width = 1280, looks = true, record = null } = {}) => {
    const r = await boot(browser, 6, width, { pics: 6, prompt: null, looks });
    const { page } = r;
    const patches = [], wpatches = [], events = [];
    await page.route('**ayowpaknssulsqqvwpqx.supabase.co/rest/v1/profiles**', (rt) => {
      const req = rt.request();
      if (req.method() === 'PATCH') { try { patches.push(JSON.parse(req.postData() || '{}')); } catch (_) { patches.push({}); } }
      return rt.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
    await page.route('**ayowpaknssulsqqvwpqx.supabase.co/rest/v1/wardrobe_items**', (rt) => {
      const req = rt.request();
      if (req.method() === 'PATCH') { try { wpatches.push({ url: req.url(), body: JSON.parse(req.postData() || '{}') }); } catch (_) {} return rt.fulfill({ status: 200, contentType: 'application/json', body: '[]' }); }
      return rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(twinRows({ heroes, priced })) });
    });
    await page.route('**ayowpaknssulsqqvwpqx.supabase.co/rest/v1/events**', (rt) => {
      try { events.push(JSON.parse(rt.request().postData() || '{}').event_type); } catch (_) {}
      return rt.fulfill({ status: 201, contentType: 'application/json', body: '' });
    });
    await page.evaluate(({ dna, icons, record }) => {
      localStorage.setItem('rb_test_dna', JSON.stringify(dna));
      localStorage.setItem('rb_test_icons', JSON.stringify(icons));
      if (record) localStorage.setItem('rb_twin_card__u-test', JSON.stringify(record)); else localStorage.removeItem('rb_twin_card__u-test');
    }, { dna, icons, record });
    await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(3200);
    return Object.assign(r, { patches, wpatches, events });
  };
  const twinRead = () => ({
    kind: document.getElementById('rb-twin-card')?.dataset.kind || null,
    k: document.querySelector('#rb-twin-card .k')?.textContent.trim(),
    t: document.querySelector('#rb-twin-card .t')?.textContent.replace(/\s+/g, ' ').trim(),
    b: document.querySelector('#rb-twin-card .b')?.textContent.replace(/\s+/g, ' ').trim(),
    rows: document.querySelectorAll('#rb-twin-card .rb-tc-row').length,
    tiles: document.querySelectorAll('#rb-twin-card .rb-tc-tile').length,
    on: document.querySelectorAll('#rb-twin-card .rb-tc-tile.on').length,
    count: document.querySelector('#rb-twin-card .rb-tc-count')?.textContent.trim(),
    verbs: Array.from(document.querySelectorAll('#rb-twin-card .verbs button')).map((b) => b.textContent.trim() + (b.disabled ? ' (off)' : '')),
    ink: Array.from(document.querySelectorAll('#rb-twin-card button')).filter((b) => getComputedStyle(b).backgroundColor === 'rgb(32, 32, 33)').length,
    stamps: document.querySelectorAll('#rb-twin-card .stamp').length,
    prev: document.getElementById('rb-twin-card')?.previousElementSibling?.className.split(' ')[0],
    notes: !!document.getElementById('rb-notes-door'), door: !!document.getElementById('rb-model-door'),
    record: JSON.parse(localStorage.getItem('rb_twin_card__u-test') || 'null'),
    overflow: document.documentElement.scrollWidth > window.innerWidth,
  });

  // The facts card is RETIRED from home (First Run redlines H1 / R2, 2026-10-09:
  // height, size, shoes and age are collected in Settings only). The loved
  // card leads; Not now puts it off for the day and the model door takes the slot.
  {
    const { ctx, page, errs, patches, events } = await twinBoot();
    const a = await page.evaluate(twinRead);
    check('twin cards · no facts card on home — the loved card leads with the facts unset', a.kind === 'loved' && a.rows === 0 && a.tiles === 6, JSON.stringify(a));
    check('twin cards · never ink, never beside the model door or the invitation, after the prompt', a.ink === 0 && !a.door && !a.notes && a.prev === 'concierge', JSON.stringify([a.ink, a.door, a.notes, a.prev]));
    check('twin cards · the day’s record and twin_card_shown {kind}', a.record && a.record.date === TW_TODAY && a.record.kind === 'loved' && a.record.done === false && events.includes('twin_card_shown'), JSON.stringify([a.record, events]));
    await page.click('#rb-twin-card [data-v="later"]'); await page.waitForTimeout(600);
    const l = await page.evaluate(twinRead);
    check('twin cards · Not now closes it for the day, writes nothing to the twin, and the model door stands in its slot', l.kind === null && l.record.done === true && l.door && !patches.some((p) => p.style_dna) && events.includes('twin_card_later'), JSON.stringify([l.kind, l.record, l.door, patches]));
    await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(3200);
    const l2 = await page.evaluate(twinRead);
    check('twin cards · never the same card twice in a day: a reload shows no card, the door stays', l2.kind === null && l2.door, JSON.stringify([l2.kind, l2.door]));
    check('twin cards · loved first · no page errors', errs.length === 0, errs.join(' | ').slice(0, 200));
    await ctx.close();
  }
  // A new day: yesterday's record is spent and the card returns.
  {
    const { ctx, page, errs } = await twinBoot({ record: { date: TW_YDAY, kind: 'loved', done: true } });
    const a = await page.evaluate(twinRead);
    check('twin cards · yesterday’s record is spent — the loved card returns', a.kind === 'loved', JSON.stringify(a.record));
    check('twin cards · new day · no page errors', errs.length === 0, errs.join(' | ').slice(0, 200));
    await ctx.close();
  }
  // The loved pieces: the facts set, fewer than three stars → her six most worn, the wardrobe's own star.
  {
    const { ctx, page, errs, wpatches, events } = await twinBoot({ dna: { facts: { size_uk: 10 } } });
    const a = await page.evaluate(twinRead);
    check('twin cards · the loved card: six photographed pieces, the most worn first, nothing starred, Done cream',
      a.kind === 'loved' && /^Star three pieces you love\.$/.test(a.t) && a.tiles === 6 && a.on === 0 && a.count === 'Tap a piece to star it' && JSON.stringify(a.verbs) === JSON.stringify(['Not now', 'Done → (off)']), JSON.stringify(a));
    await page.click('#rb-twin-card [data-star="w0"]'); await page.waitForTimeout(600);
    const s1 = await page.evaluate(twinRead);
    check('twin cards · a star is the wardrobe’s star: hero_position PATCHed, the tile warm, “1 of 3 starred”, Done live',
      s1.on === 1 && s1.count === '1 of 3 starred' && s1.verbs[1] === 'Done →' && wpatches.length === 1 && /id=eq\.w0/.test(wpatches[0].url) && wpatches[0].body.hero_position === 1 && events.includes('twin_card_answered'), JSON.stringify([s1.on, s1.count, s1.verbs, wpatches]));
    await page.click('#rb-twin-card [data-star="w1"]'); await page.waitForTimeout(500);
    await page.click('#rb-twin-card [data-star="w2"]'); await page.waitForTimeout(900);
    const s3 = await page.evaluate(twinRead);
    check('twin cards · the third star answers the card — it leaves, the day is marked, the model door takes the slot', s3.kind === null && s3.record.kind === 'loved' && s3.record.done === true && s3.door && wpatches.length === 3, JSON.stringify([s3.kind, s3.record, s3.door, wpatches.length]));
    check('twin cards · loved · no page errors', errs.length === 0, errs.join(' | ').slice(0, 200));
    await ctx.close();
  }
  // The Robes-noticed line: the facts set, three stars on → the pending line, Settings' own swipe card.
  const pending = { list: 'loves', text: 'A sharp shoulder, every time.', because: 'From 6 pieces filed', at: '2026-10-08T09:00:00.000Z' };
  {
    const { ctx, page, errs, patches, events } = await twinBoot({ dna: { facts: { size_uk: 10 }, brief: { pending: [pending], loves: [{ text: 'A defined waist', source: 'typed', at: '2026-10-01T00:00:00.000Z' }] } }, heroes: 3 });
    const a = await page.evaluate(twinRead);
    check('twin cards · the noticed card: Robes noticed, the line, the evidence, ← Not me / Keep →, the two stamps',
      a.kind === 'noticed' && a.k === 'Robes noticed' && a.t === pending.text && a.b === pending.because && JSON.stringify(a.verbs) === JSON.stringify(['← Not me', 'Keep →']) && a.stamps === 2, JSON.stringify(a));
    const box = await page.locator('#rb-twin-card').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2, { steps: 6 });
    const mid = await page.evaluate(() => ({ keep: Number(document.querySelector('#rb-twin-card .stamp.keep')?.style.opacity), tx: document.getElementById('rb-twin-card')?.style.transform }));
    await page.mouse.move(box.x + box.width / 2 + 150, box.y + box.height / 2, { steps: 6 }); await page.mouse.up();
    await page.waitForTimeout(700);
    const k = await page.evaluate(twinRead);
    const bp = patches.find((p) => p.style_dna && p.style_dna.brief);
    check('twin cards · the drag: the ✓ Keep stamp fades in with it; past 90px it keeps — the line files under Works, pending empties, nothing else on the brief moves',
      mid.keep > 0.5 && mid.keep < 1 && /translateX\(60px\)/.test(mid.tx) && k.kind === null && k.record.done === true && bp && bp.style_dna.brief.pending.length === 0
        && bp.style_dna.brief.loves.length === 2 && bp.style_dna.brief.loves[1].text === pending.text && bp.style_dna.brief.loves[1].source === 'drafted' && bp.style_dna.brief.loves[0].text === 'A defined waist'
        && bp.style_dna.facts.size_uk === 10, JSON.stringify([mid, k.kind, k.record, bp && bp.style_dna]));
    check('twin cards · Keep: brief_line keep + twin_card_answered', events.includes('brief_line') && events.includes('twin_card_answered'), JSON.stringify(events));
    check('twin cards · noticed · no page errors', errs.length === 0, errs.join(' | ').slice(0, 200));
    await ctx.close();
  }
  {
    const { ctx, page, errs, patches } = await twinBoot({ dna: { facts: { size_uk: 10 }, brief: { pending: [pending] } }, heroes: 3 });
    await page.click('#rb-twin-card [data-v="no"]'); await page.waitForTimeout(900);
    const n = await page.evaluate(twinRead);
    const bp = patches.find((p) => p.style_dna && p.style_dna.brief);
    const mp = patches.find((p) => p.style_dna && p.style_dna.memory);
    check('twin cards · Not me strikes the line (brief.struck) and lands a memory strike, the brief untouched otherwise',
      n.kind === null && bp && bp.style_dna.brief.struck[0] === pending.text && bp.style_dna.brief.pending.length === 0 && !(bp.style_dna.brief.loves || []).length
        && mp && mp.style_dna.memory.entries[0].k === 'strike' && mp.style_dna.memory.entries[0].text === pending.text && mp.style_dna.brief.struck[0] === pending.text, JSON.stringify([n.kind, bp && bp.style_dna.brief, mp && mp.style_dna.memory]));
    check('twin cards · strike · no page errors', errs.length === 0, errs.join(' | ').slice(0, 200));
    await ctx.close();
  }
  // The order and the gates: the loved pieces outrank a pending line; nothing until the walk has begun; the first run outranks every card.
  {
    const { ctx, page, errs } = await twinBoot({ dna: { brief: { pending: [pending] } } });
    const o = await page.evaluate(twinRead);
    check('twin cards · loved first: with three stars short and a line pending, the loved card is the one shown (never the facts)', o.kind === 'loved', JSON.stringify(o.kind));
    await page.evaluate(() => { localStorage.setItem('rb_test_icons', '[]'); localStorage.setItem('rb_test_dna', '{}'); });
    await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(3200);
    const g = await page.evaluate(twinRead);
    check('twin cards · nothing of the walk answered → no card (the standard home shows no invitation either)', g.kind === null && !g.notes, JSON.stringify([g.kind, g.notes]));
    await ctx.close();
    const z = await twinBoot({ icons: [], looks: false });
    const zi = await z.page.evaluate(twinRead);
    const zg = await z.page.evaluate(() => !!document.getElementById('rb-gtky'));
    check('twin cards · the first run outranks every card: nothing begun shows the Getting-to-know-you card alone — no walk card, no question card', zg && !zi.notes && zi.kind === null, JSON.stringify([zg, zi.notes, zi.kind]));
    check('twin cards · gates · no page errors', errs.length === 0 && z.errs.length === 0, errs.concat(z.errs).join(' | ').slice(0, 200));
    await z.ctx.close();
  }
  // 390: the card fits, the rows wrap, the tiles run three across.
  {
    const { ctx, page, errs } = await twinBoot({ width: 390 });
    const m = await page.evaluate(twinRead);
    const { ctx: c2, page: p2, errs: e2 } = await twinBoot({ width: 390, dna: { facts: { size_uk: 10 } } });
    const m2 = await p2.evaluate(() => ({ overflow: document.documentElement.scrollWidth > window.innerWidth, cols: getComputedStyle(document.querySelector('#rb-twin-card .rb-tc-tiles')).gridTemplateColumns.split(' ').length, w: document.getElementById('rb-twin-card').getBoundingClientRect().width }));
    check('twin cards · 390: the loved card fits the viewport, its tiles run three across', m.kind === 'loved' && !m.overflow && !m2.overflow && m2.cols === 3 && m2.w <= 390, JSON.stringify([m.kind, m.overflow, m2]));
    check('twin cards · 390 · no page errors', errs.length === 0 && e2.length === 0, errs.concat(e2).join(' | ').slice(0, 200));
    await ctx.close(); await c2.close();
  }
  // The investment-vs-memory read: four priced pieces over her level ride styleDna.spend into the next ask.
  {
    const { ctx, page, errs, posts } = await twinBoot({ dna: { investment: '€500–1,500', facts: { size_uk: 10 } }, heroes: 3, priced: true });
    await page.evaluate(() => window.__rbHbOpen && window.__rbHbOpen());
    await page.evaluate(() => window.__rbLpText('Dinner on Friday'));
    await page.locator('#rb-lp-in').press('Enter'); await page.waitForTimeout(2500);
    const sp = posts.daily[0] && posts.daily[0].styleDna && posts.daily[0].styleDna.spend;
    check('twin cards · spend read: €2,200 across four priced pieces against €500–1,500 rides the ask as styleDna.spend, verdict above',
      !!sp && sp.n === 4 && sp.total === 2200 && sp.median === 600 && sp.level === '€500–1,500' && sp.verdict === 'above' && posts.daily[0].styleDna.investment === '€500–1,500', JSON.stringify([posts.daily.length, sp, posts.daily[0] && Object.keys(posts.daily[0].styleDna || {})]));
    const prof = await page.evaluate(() => Object.keys(window.__robes_profile.style_dna));
    check('twin cards · spend is compiled at send time, never written to the profile', !prof.includes('spend'), JSON.stringify(prof));
    check('twin cards · spend · no page errors', errs.length === 0, errs.join(' | ').slice(0, 200));
    await ctx.close();
  }
}

await browser.close();
server.kill();

const failed = results.filter((r) => !r.pass);
for (const r of results) console.log(`${r.pass ? '  ok ' : 'FAIL '} ${r.name}${r.pass ? '' : '  → ' + r.detail}`);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
