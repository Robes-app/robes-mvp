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

// The learning card and the home Lookbook row only render once the Lookbook
// holds something — at zero looks the inline rack replaces both (FTUE step 3,
// 2026-08-12). Seed one saved look by default so the milestone rules below
// still have a card to assert against; pass looks:false for the zero state.
async function boot(browser, n, width = 1280, { looks = true } = {}) {
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
  if (looks) {
    await page.addInitScript(() => {
      localStorage.setItem('robes_style_notes__u-test', JSON.stringify([
        { id: 1754600000000, type: 'daily-look', title: 'A look', subtitle: 'Daily look', img: null,
          dlData: { anchor_date: '2026-08-05' } },
      ]));
    });
  }

  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2600);
  return { ctx, page, errs };
}

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

// Wardrobe + lookbook empty states at 0 pieces (and zero looks)
{
  const { ctx, page } = await boot(browser, 0, 1280, { looks: false });
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
  // ONE DOOR (FTUE pass 2026-08-12) — supersedes the "Ways to fill it"
  // clone shelf this section used to pin. An empty Lookbook IS the
  // composer: naming the first look is the one act that fills a Lookbook,
  // so it is the only thing on the page.
  const l = await page.evaluate(() => ({
    ways: !!document.getElementById('sn-ways'),
    emptyShown: document.getElementById('sn-empty')?.style.display !== 'none',
    composer: !!document.querySelector('.rb-lk-composer > .rb-lk-con'),
    titlePlaceholder: document.getElementById('rb-lk-newtitle')?.placeholder || '',
    // The four formula strips are the whole of the rack at zero
    strips: Array.from(document.querySelectorAll('.rb-lk-con .rbc-rolestrip span')).map((s) => s.textContent.trim()),
    ghostRows: document.querySelectorAll('.rb-lk-con .rbc-rghost').length,
    trailingAdd: !!document.querySelector('.rb-lk-con .rbc-addpiece'),
    save: !!document.querySelector('.rb-lk-save'),
    saveDisabled: document.querySelector('.rb-lk-save')?.disabled,
    door: document.querySelector('.rb-lk-robesdoor')?.textContent || '',
    // nothing competes with it
    bar: document.getElementById('rb-lk-bar')?.style.display !== 'none',
    hol: document.getElementById('rb-lk-hol')?.style.display !== 'none',
    allHead: document.getElementById('rb-lk-allhead')?.style.display !== 'none',
    sort: !!document.querySelector('.rb-lk-sort'),
  }));
  check('lookbook empty · ONE DOOR — the composer, no ways-to-fill shelf',
    l.composer === true && l.ways === false && l.emptyShown === false, JSON.stringify(l));
  check('lookbook empty · the name leads it', l.titlePlaceholder === 'Name your first look', l.titlePlaceholder);
  check('lookbook empty · the four formula strips are the rack',
    JSON.stringify(l.strips) === JSON.stringify(['The Canvas', 'The Anchor', 'The Texture', 'The Exclamation Point'])
      && l.ghostRows === 4, JSON.stringify([l.strips, l.ghostRows]));
  check('lookbook empty · the generic + Add a piece closes the rack', l.trailingAdd === true);
  check('lookbook empty · Save stands there, withheld until two pieces',
    l.save === true && l.saveDisabled === true, JSON.stringify([l.save, l.saveDisabled]));
  check('lookbook empty · the alternative door is worded first-time',
    l.door === 'Or let Robes build the first one', l.door);
  check('lookbook empty · nothing competes: no travel strip, All-looks header, sort or refine',
    l.bar === false && l.hol === false && l.allHead === false && l.sort === false,
    JSON.stringify([l.bar, l.hol, l.allHead, l.sort]));

  // The Robes door lands on the home prompt, never a modal
  const routed = await page.evaluate(async () => {
    document.querySelector('.rb-lk-robesdoor').click();
    await new Promise((r) => setTimeout(r, 700));
    const ta = document.getElementById('cb-ta');
    return {
      lookbookClosed: document.getElementById('sn-page').style.display === 'none',
      prompt: ta ? ta.value : '',
      modalOpen: !!document.querySelector('#tv-brief-modal[style*="flex"], #wk-plan-modal[style*="flex"]'),
    };
  });
  check('lookbook empty · the Robes door closes the lookbook', routed.lookbookClosed);
  check('lookbook empty · and fills the prompt', routed.prompt.length > 0, routed.prompt);
  check('lookbook empty · opening no modal', !routed.modalOpen);

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

// The look, inline on home (FTUE step 3, 2026-08-12) — at zero looks the
// builder replaces both the learning card and the Lookbook row.
{
  const { ctx, page, errs } = await boot(browser, 4, 1280, { looks: false });
  const h = await page.evaluate(() => {
    const dash = document.getElementById('dash');
    const el = document.getElementById('rb-lkhome');
    return {
      mounted: !!el,
      // it leads the prompt, and the learning card + Lookbook row stand down
      abovePrompt: el?.nextElementSibling?.classList.contains('concierge'),
      trkHidden: document.getElementById('wtrk')?.style.display === 'none',
      snRowHidden: (document.getElementById('rb-sn')?.style.display === 'none')
        || !document.getElementById('rb-sn')?.textContent.trim(),
      // no "catalogue your wardrobe" door anywhere on home
      wtrkCta: document.getElementById('wtrk-cta')?.offsetParent !== null,
      eyebrow: el?.querySelector('.rb-lk-eyebrow')?.textContent,
      count: el?.querySelector('.rb-lkh-count')?.textContent,
      ghostRows: el?.querySelectorAll('.rbc-rghost').length,
      // every empty slot is the camera path, not the chooser sheet
      snapWired: Array.from(el?.querySelectorAll('.rbc-rghost') || [])
        .every((r) => /__lkHomeSnap/.test(r.getAttribute('onclick') || '')),
      save: !!el?.querySelector('.rb-lk-save'),
      door: el?.querySelector('.rb-lk-robesdoor')?.textContent,
      // ONE composer in the DOM — the Lookbook page is closed
      composers: document.querySelectorAll('.rb-lk-composer').length,
      showMoreHidden: getComputedStyle(el.querySelector('.rb-lkh-showmore')).display === 'none',
    };
  });
  check('home rack · no page errors', errs.length === 0, errs.join(' | ').slice(0, 200));
  check('home rack · the builder sits on home at zero looks, leading the prompt',
    h.mounted === true && h.abovePrompt === true, JSON.stringify([h.mounted, h.abovePrompt]));
  check('home rack · it replaces the learning card and the Lookbook row',
    h.trkHidden === true && h.snRowHidden === true && h.wtrkCta === false,
    JSON.stringify([h.trkHidden, h.snRowHidden, h.wtrkCta]));
  check('home rack · titled "Build your first look", counting the rack',
    h.eyebrow === 'Build your first look' && h.count === '0 of 4 on the rack',
    JSON.stringify([h.eyebrow, h.count]));
  check('home rack · four slots, every one of them the camera path',
    h.ghostRows === 4 && h.snapWired === true, JSON.stringify([h.ghostRows, h.snapWired]));
  check('home rack · carries Save and the Robes door',
    h.save === true && h.door === 'Or let Robes build the first one', JSON.stringify([h.save, h.door]));
  check('home rack · exactly one composer in the DOM', h.composers === 1, String(h.composers));
  check('home rack · all four slots render on web (no collapse)', h.showMoreHidden === true);

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
  check('home rack · a piece added on home hangs in the rack and counts',
    shared.onHome === 'Piece 1' && shared.count === '1 of 4 on the rack', JSON.stringify(shared));
  check('home rack · the SAME draft continues in the Lookbook, never a second copy',
    shared.inLookbook === 'Piece 1' && shared.homeGone === true && shared.composers === 1,
    JSON.stringify(shared));

  // Saving retires the module and hands the page back to the Lookbook row
  const saved = await page.evaluate(async () => {
    window.__lkApplyNew('w1');
    window.__lkSave();
    await new Promise((r) => setTimeout(r, 300));
    window.__snClose();
    await new Promise((r) => setTimeout(r, 500));
    return {
      homeGone: !document.getElementById('rb-lkhome'),
      snRow: (document.getElementById('rb-sn')?.textContent || '').trim().length > 0,
      trkBack: document.getElementById('wtrk')?.style.display !== 'none',
    };
  });
  check('home rack · saving retires the module and moves everything to the Lookbook row',
    saved.homeGone === true && saved.snRow === true, JSON.stringify(saved));
  check('home rack · the learning card comes back once the Lookbook holds something',
    saved.trkBack === true, JSON.stringify(saved));
  await ctx.close();
}

// The home rack on a phone: texture + finish collapse, preview stands down
{
  const { ctx, page, errs } = await boot(browser, 4, 390, { looks: false });
  const m = await page.evaluate(() => {
    const el = document.getElementById('rb-lkhome');
    const more = el?.querySelector('.rb-lkh-more');
    const showmore = el?.querySelector('.rb-lkh-showmore');
    return {
      shown: Array.from(el?.querySelectorAll('.rbc-rolestrip span') || [])
        .filter((s) => s.offsetParent !== null).map((s) => s.textContent.trim()),
      moreHidden: more ? getComputedStyle(more).display === 'none' : null,
      showmoreShown: showmore ? getComputedStyle(showmore).display !== 'none' : null,
      previewHidden: el?.querySelector('.rb-lk-con > div:first-child')?.offsetParent === null,
      h: Math.round(el?.getBoundingClientRect().height || 0),
      overflow: document.documentElement.scrollWidth <= window.innerWidth + 1,
    };
  });
  check('390px home rack · no page errors', errs.length === 0, errs.join(' | ').slice(0, 200));
  check('390px home rack · canvas and anchor are the ask; texture + finish collapse',
    JSON.stringify(m.shown) === JSON.stringify(['The Canvas', 'The Anchor'])
      && m.moreHidden === true && m.showmoreShown === true, JSON.stringify(m));
  check('390px home rack · the preview is web-only here', m.previewHidden === true);
  check('390px home rack · no horizontal overflow', m.overflow === true);

  // Show expands for the session; a piece cast into a late role force-expands
  const opened = await page.evaluate(async () => {
    document.querySelector('.rb-lkh-showmore').click();
    await new Promise((r) => setTimeout(r, 200));
    const el = document.getElementById('rb-lkhome');
    return Array.from(el.querySelectorAll('.rbc-rolestrip span'))
      .filter((s) => s.offsetParent !== null).map((s) => s.textContent.trim());
  });
  check('390px home rack · Show reveals the other two slots',
    JSON.stringify(opened) === JSON.stringify(_RB_ROLE_NAMES), JSON.stringify(opened));
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
