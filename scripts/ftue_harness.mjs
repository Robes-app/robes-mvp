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

function wardrobe(n) {
  const cats = ['Tops', 'Bottoms', 'Shoes', 'Outerwear'];
  return Array.from({ length: n }, (_, i) => ({
    id: 'w' + i, user_id: 'u-test', label: 'Piece ' + (i + 1),
    category: cats[i % 4], color: 'Black', brand: '', notes: '',
    image_url: null, times_worn: 0, item_dna: {}, hero_position: null,
    created_at: new Date().toISOString(),
  }));
}

async function boot(browser, n, width = 1280) {
  const ctx = await browser.newContext({ viewport: { width, height: 1100 } });
  const page = await ctx.newPage();

  await page.route('**cdn.jsdelivr.net/**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/javascript', body: SUPA_STUB }));
  await page.route('**ayowpaknssulsqqvwpqx.supabase.co/**', (r) => {
    const u = r.request().url();
    const body = u.includes('wardrobe_items') ? JSON.stringify(wardrobe(n)) : '[]';
    return r.fulfill({ status: 200, contentType: 'application/json', body });
  });
  await page.route('**nominatim**', (r) => r.abort());
  await page.route('**open-meteo**', (r) => r.abort());

  await page.addInitScript((count) => {
    window.__TEST_PROFILE = {
      first_name: 'Annie', last_name: '', mobile: '', style_icons: [], budget: null,
      wardrobe_description: '', style_dna: {}, wardrobe_items_count: count,
      onboarded_at: '2026-07-01', gender_identity: 'woman',
    };
    Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true });
  }, n);

  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2600);
  return { ctx, page, errs };
}

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
      .filter((el) => el.offsetParent !== null || el.id === 'wtrk')
      .map((el) => el.id || el.className.split(' ')[0]);
    const cols = Array.from(document.querySelectorAll('#wtrk-ms .rb-ms-col')).map((c) => ({
      at: c.querySelector('.rb-ms-at')?.textContent,
      label: c.querySelector('.rb-ms-lbl')?.textContent,
      on: c.classList.contains('on'),
    }));
    return {
      order,
      trackerVisible: vis(document.getElementById('wtrk')),
      servicesVisible: vis(document.querySelector('.services')),
      head: document.getElementById('wtrk-head')?.innerHTML || '',
      num: document.getElementById('wtrk-num')?.textContent || '',
      fill: document.querySelector('#wtrk-ms .rb-ms-fill')?.style.width || '',
      cols,
      tickLefts: Array.from(document.querySelectorAll('#wtrk-ms .rb-ms-tick')).map((t) => t.style.left),
      trackMask: (() => {
        const t = document.querySelector('#wtrk-ms .rb-ms-track');
        if (!t) return '';
        const cs = getComputedStyle(t);
        return cs.maskImage && cs.maskImage !== 'none' ? cs.maskImage : (cs.webkitMaskImage || '');
      })(),
      pill: document.querySelector('.svc-daily .rb-lock-pill')?.textContent || '',
      eyebrow: document.querySelector('#wtrk .wtrk-ey')?.textContent || '',
      styleNotes: !!document.getElementById('rb-sil-prompt'),
      hasStatus: !!document.querySelector('#wtrk-ms .rb-ms-st'),
      msText: (document.getElementById('wtrk-ms')?.textContent || '').trim(),
      trackerH: Math.round(document.getElementById('wtrk')?.getBoundingClientRect().height || 0),
      railAfterConcierge: (() => {
        const c = dash?.querySelector('.concierge');
        return !!c && c.nextElementSibling?.id === 'rb-rail';
      })(),
    };
  });

  // Progress card retires one piece past the last milestone
  check(`n=${n} · progress card ${n > 15 ? 'retired' : 'visible'}`,
    state.trackerVisible === (n <= 15));

  // Concierge absent below the first unlock
  check(`n=${n} · concierge ${n >= 3 ? 'shown' : 'hidden'}`,
    state.servicesVisible === (n >= 3));

  // Style Notes only at the last milestone
  check(`n=${n} · style notes ${n >= 15 ? 'introduced' : 'absent'}`,
    state.styleNotes === (n >= 15), `got ${state.styleNotes}`);

  // Rail stays glued to the prompt
  check(`n=${n} · rail follows prompt`, state.railAfterConcierge, JSON.stringify(state.order));

  // Order: progress leads below 3, prompt leads from 3
  if (n <= 15) {
    const iTrk = state.order.indexOf('wtrk');
    const iCon = state.order.findIndex((x) => x === 'concierge');
    const leads = n < 3 ? iTrk < iCon : iCon < iTrk;
    check(`n=${n} · ${n < 3 ? 'progress' : 'prompt'} leads`, leads && iTrk >= 0 && iCon >= 0,
      JSON.stringify(state.order));
  }

  // The section must stay near its pre-FTUE height (was 337-353 desktop)
  if (n <= 15) {
    check(`n=${n} · tracker height <= 380`, state.trackerH <= 380, String(state.trackerH));
  }

  // Milestone bar shape + fill — the LEARNING meter (2026-07-29): capability
  // copy, a 20-piece track with the last milestone at 78%, a faded final
  // quarter, and NO denominator anywhere on the card.
  if (n <= 15) {
    // Weekly milestone retired 2026-08-08 (the weekly track is gone) —
    // three capability columns: daily / travel / style notes.
    check(`n=${n} · three milestones`, state.cols.length === 3, JSON.stringify(state.cols));
    check(`n=${n} · capability labels`,
      state.cols.map((c) => c.at + ' ' + c.label).join('|') ===
      '03 Dresses today|10 Packs your trips|15 Knows your taste',
      state.cols.map((c) => c.at + ' ' + c.label).join('|'));
    check(`n=${n} · ticks at 15/50/78%`,
      state.tickLefts.join('|') === '15%|50%|78%', state.tickLefts.join('|'));
    const pts = [[0, 0], [3, 15], [10, 50], [15, 78], [20, 100]];
    const want = (() => {
      for (let i = 1; i < pts.length; i++) {
        if (n <= pts[i][0]) {
          const a = pts[i - 1], b = pts[i];
          return a[1] + ((n - a[0]) / (b[0] - a[0])) * (b[1] - a[1]);
        }
      }
      return 100;
    })();
    check(`n=${n} · fill ${want.toFixed(1)}%`,
      Math.abs(parseFloat(state.fill) - want) < 0.6, `got ${state.fill}`);
    check(`n=${n} · track fades out (no endpoint)`,
      /gradient/.test(state.trackMask), state.trackMask.slice(0, 80));
    const numText = state.num.replace(/\s+/g, ' ').trim();
    check(`n=${n} · bare count, "pieces filed" beneath`,
      new RegExp(`^${n}\\s*Pieces? filed$`, 'i').test(numText), numText);
    check(`n=${n} · no denominator on the card`,
      !/\/\s*\d|of 15/i.test(numText + ' ' + state.head + ' ' + state.msText),
      numText + ' | ' + state.head);
    check(`n=${n} · eyebrow reads "Robes is learning"`,
      state.eyebrow === 'Robes is learning', state.eyebrow);
  }

  // Concierge progress pill (visible 3–14): no fraction, no lock language
  if (n >= 3 && n < 15) {
    check(`n=${n} · concierge pill carries no fraction`,
      state.pill.length > 0 && !/\/\s*\d|of 15|unlock|lock/i.test(state.pill), state.pill);
  }

  // No per-tick status text anywhere — "Locked" would be a lie, and the
  // headline already carries earned/next. Lit state = passed or next target.
  if (n <= 15) {
    check(`n=${n} · no status text`,
      !state.hasStatus && !/locked/i.test(state.msText), state.msText);
    const ats = [3, 10, 15];
    const nextIdx = ats.findIndex((a) => a > n);
    const litOk = state.cols.every((c, i) => c.on === (n >= ats[i] || i === nextIdx));
    check(`n=${n} · lit milestones`, litOk, state.cols.map((c) => c.at + ':' + c.on).join('|'));
  }

  if (n === 0) {
    check('n=0 · headline names the first unlock',
      /Three pieces/.test(state.head), state.head);
  }
  if (n === 1) {
    check('n=1 · headline counts down',
      /Two more pieces/.test(state.head), state.head);
  }

  await ctx.close();
}

// Wardrobe + lookbook empty states at 0 pieces
{
  const { ctx, page } = await boot(browser, 0);
  await page.evaluate(() => window.App && App.showWardrobe && App.showWardrobe());
  await page.waitForTimeout(900);
  const w = await page.evaluate(() => ({
    headline: document.querySelector('#wg-grid div')?.textContent || '',
    hasBar: !!document.querySelector('#wg-grid .rb-ms'),
    barHasStatus: !!document.querySelector('#wg-grid .rb-ms-st'),
    unlocksText: (document.querySelector('#wg-grid .rb-ms')?.closest('div[style]')?.textContent || '').replace(/\s+/g, ' '),
    ghosts: document.querySelectorAll('#wg-grid .rb-ghost-card').length,
    prose: (document.querySelector('#wg-grid p') || {}).textContent || '',
  }));
  check('wardrobe empty · serif line', /Every look starts with a photograph/.test(w.headline), w.headline.slice(0, 80));
  check('wardrobe empty · milestone bar shown', w.hasBar);
  check('wardrobe empty · bar drops status line', !w.barHasStatus);
  check('wardrobe empty · header reads "What more pieces bring"',
    /What more pieces bring/i.test(w.unlocksText), w.unlocksText.slice(0, 90));
  check('wardrobe empty · no denominator, no unlock language',
    !/\/\s*\d|of 15|unlock/i.test(w.unlocksText), w.unlocksText.slice(0, 90));
  check('wardrobe empty · two ghost tiles', w.ghosts === 2, String(w.ghosts));
  check('wardrobe empty · no prose block', !w.prose, w.prose.slice(0, 60));

  await page.evaluate(() => window.__snOpen && window.__snOpen());
  await page.waitForTimeout(600);
  const l = await page.evaluate(() => {
    const ways = document.getElementById('sn-ways');
    const cards = ways ? Array.from(ways.querySelectorAll('.svc')) : [];
    return {
      present: !!ways,
      title: document.getElementById('sn-empty-t')?.textContent || '',
      sub: document.getElementById('sn-empty-s')?.textContent || '',
      count: cards.length,
      titles: cards.map((c) => c.querySelector('.svc-title')?.textContent || ''),
      // the bundle's modal openers must not survive the clone
      inlineOnclick: cards.filter((c) => c.hasAttribute('onclick')).length,
      wired: cards.filter((c) => typeof c.onclick === 'function').length,
      hasImagery: cards.filter((c) => c.querySelector('.svc-img img')).length,
      lockPills: cards.filter((c) => c.querySelector('.rb-lock-wrap')).length,
      matchesHome: (() => {
        // Promo cards (.svc-promo, coming-soon Weekly Planner) stay on home
        // but are never cloned into the lookbook's ways block.
        const home = Array.from(document.querySelectorAll('.services .svc:not(.svc-promo)'))
          .map((c) => c.querySelector('.svc-title')?.textContent || '');
        return JSON.stringify(home) === JSON.stringify(cards.map((c) => c.querySelector('.svc-title')?.textContent || ''));
      })(),
    };
  });
  check('lookbook empty · ways block', l.present);
  check('lookbook empty · title', l.title === 'Nothing saved yet.', l.title);
  check('lookbook empty · subtitle', /filed here/.test(l.sub), l.sub);
  // Two cards since the weekly removal (2026-08-08): Daily outfit + Travel edit
  check('lookbook empty · uses the real concierge cards', l.count === 2, String(l.count));
  check('lookbook empty · same cards as home', l.matchesHome, JSON.stringify(l.titles));
  check('lookbook empty · keeps card imagery', l.hasImagery === 2, String(l.hasImagery));
  check('lookbook empty · no inline modal openers', l.inlineOnclick === 0, String(l.inlineOnclick));
  check('lookbook empty · no dashboard progress pill', l.lockPills === 0, String(l.lockPills));
  check('lookbook empty · every card wired', l.wired === 2, String(l.wired));

  // Tapping a card must land on the dashboard prompt, not a modal
  const routed = await page.evaluate(async () => {
    document.querySelector('#sn-ways .svc').click();
    await new Promise((r) => setTimeout(r, 700));
    const ta = document.getElementById('cb-ta');
    return {
      lookbookClosed: document.getElementById('sn-page').style.display === 'none',
      prompt: ta ? ta.value : '',
      modalOpen: !!document.querySelector('#tv-brief-modal[style*="flex"], #wk-plan-modal[style*="flex"]'),
    };
  });
  check('lookbook empty · card closes the lookbook', routed.lookbookClosed);
  check('lookbook empty · card fills the prompt', routed.prompt.length > 0, routed.prompt);
  check('lookbook empty · card opens no modal', !routed.modalOpen);

  await ctx.close();
}

// First load: opening the Lookbook BEFORE the 600ms card transform must never
// paint the legacy bundle trio ("Key piece, three ways", photo imagery, wrong
// order) — the bug was that it corrected itself only on refresh.
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

  // Immediately after opening, the block must be ABSENT rather than legacy.
  await page.waitForFunction(() => !!document.getElementById('sn-empty') &&
    document.getElementById('sn-empty').style.display !== 'none', null, { timeout: 8000 });
  const early = await page.evaluate(() => {
    const ways = document.getElementById('sn-ways');
    const titles = ways ? Array.from(ways.querySelectorAll('.svc-title')).map((t) => t.textContent) : [];
    return { legacy: titles.some((t) => /key piece, three ways/i.test(t)), titles };
  });
  check('first load · never paints the legacy trio', !early.legacy, JSON.stringify(early.titles));

  // …and once the transform lands it must fill in, without a refresh.
  await page.waitForTimeout(2200);
  const settled = await page.evaluate(() => {
    const ways = document.getElementById('sn-ways');
    const titles = ways ? Array.from(ways.querySelectorAll('.svc-title')).map((t) => t.textContent.trim()) : [];
    const home = Array.from(document.querySelectorAll('.services .svc:not(.svc-promo) .svc-title')).map((t) => t.textContent.trim());
    return { titles, home, imgs: ways ? ways.querySelectorAll('.svc-img img').length : 0 };
  });
  check('first load · fills in without a refresh', settled.titles.length === 2, JSON.stringify(settled.titles));
  check('first load · matches the transformed cards',
    JSON.stringify(settled.titles) === JSON.stringify(settled.home),
    `${JSON.stringify(settled.titles)} vs ${JSON.stringify(settled.home)}`);
  check('first load · no "Key piece, three ways"',
    !settled.titles.some((t) => /key piece, three ways/i.test(t)), JSON.stringify(settled.titles));
  await ctx.close();
}

// Ways block disappears once anything is saved
{
  const { ctx, page } = await boot(browser, 1);
  await page.evaluate(() => {
    const k = 'robes_style_notes__u-test';
    localStorage.setItem(k, JSON.stringify([{ id: 1, type: 'key-piece', title: 'A look', subtitle: '', img: null }]));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2600);
  await page.evaluate(() => window.__snOpen && window.__snOpen());
  await page.waitForTimeout(500);
  const gone = await page.evaluate(() => !document.getElementById('sn-ways'));
  check('lookbook · ways removed once content exists', gone);
  await ctx.close();
}

// Mobile
{
  const { ctx, page, errs } = await boot(browser, 1, 390);
  check('390px · no page errors', errs.length === 0, errs.join(' | ').slice(0, 160));
  const m = await page.evaluate(() => {
    const cols = document.querySelector('#wtrk-ms .rb-ms-cols');
    const dash = document.getElementById('dash');
    return {
      cols: cols ? getComputedStyle(cols).gridTemplateColumns.split(' ').length : 0,
      overflow: document.documentElement.scrollWidth <= window.innerWidth + 1,
      trkFirst: dash?.querySelector('.dash-mast')?.nextElementSibling?.id,
    };
  });
  check('390px · three milestone columns hold', m.cols === 3, String(m.cols));
  check('390px · no horizontal overflow', m.overflow);
  await ctx.close();
}

await browser.close();
server.kill();

const failed = results.filter((r) => !r.pass);
for (const r of results) console.log(`${r.pass ? '  ok ' : 'FAIL '} ${r.name}${r.pass ? '' : '  → ' + r.detail}`);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
