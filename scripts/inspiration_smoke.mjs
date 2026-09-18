// Inspiration smoke — the "Style a key piece" modal journey: Inspiration "Style a key piece" modal → kp result →
// "Build this look" → the composer IN SITU on the kp page → save → Filed; the model park/return; the dressed canvas;
// per-look feedback (the hairline line) + the build pill; the modal's wardrobe / wishlist doors + the upload scan.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const ROOT = new URL('..', import.meta.url).pathname;
const PORT = 4381;
const BASE = `http://127.0.0.1:${PORT}`;

const server = spawn('node', ['server.js'], {
  cwd: ROOT, env: { ...process.env, PORT: String(PORT), NODE_ENV: 'test' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
await new Promise((res) => {
  const on = (b) => { if (String(b).includes(String(PORT)) || String(b).includes('listening')) res(); };
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

const STYLE_RESP = {
  ways: [
    { eyebrow: 'Sporty cool', title: 'Urbane Weekend', outfit: 'Umbro shorts, a white ribbed tank, and a camel overshirt worn open.', details: 'Half-tuck the tank.', accessories: 'Flat leather slides, tortoise sunglasses, one gold hoop.' },
    { eyebrow: 'Refined athletic', title: 'Coffee Run', outfit: 'Umbro shorts, an olive long-sleeve tee.', details: 'Sleeves knotted.', accessories: 'White sneakers, raffia tote.' },
    { eyebrow: 'Elevated leisure', title: 'Park Hangout', outfit: 'Umbro shorts, a white linen tank.', details: 'Three tones only.', accessories: 'Espadrilles, straw bag.' },
  ],
  generatedImages: ['https://res.cloudinary.com/demo/way1.jpg', 'https://res.cloudinary.com/demo/way2.jpg', 'https://res.cloudinary.com/demo/way3.jpg'],
  fallback: false, photoUrl: 'https://res.cloudinary.com/demo/piece.jpg',
};
const DAILY_RESP = {
  headline: 'Coffee run, elevated.', occasion_label: 'a built look', stylist_summary: 'The shorts lead; everything else stays quiet.',
  transition_tip: '', palette: ['#EDE7DE'],
  steps: [
    { title: 'The Anchor', items: [{ name: 'Umbro shorts', category: 'Bottoms', description: '', wardrobe_index: -1, retailer_hint: 'Umbro', price_point: '€40', alternates: [] }] },
    { title: 'The Canvas', items: [{ name: 'Olive long-sleeve tee', category: 'Tops', description: '', wardrobe_index: -1, retailer_hint: 'COS', price_point: '€35', alternates: [] }] },
    { title: 'The Texture', items: [{ name: 'Charcoal knit cardigan', category: 'Outerwear', description: '', wardrobe_index: -1, retailer_hint: 'Arket', price_point: '€89', alternates: [] }] },
    { title: 'The Accents', items: [{ name: 'Woven raffia tote', category: 'Bags', description: '', wardrobe_index: -1, retailer_hint: 'Zara', price_point: '€49', alternates: [] }] },
  ],
};

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1200 } });
const page = await ctx.newPage();
const results = [];
const check = (name, pass, detail = '') => results.push({ name, pass, detail });

await page.route('**cdn.jsdelivr.net/**', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: SUPA_STUB }));
const writes = [];
await page.route('**ayowpaknssulsqqvwpqx.supabase.co/**', (r) => {
  const req = r.request();
  if (req.method() !== 'GET') {
    let body = null;
    try { body = req.postDataJSON(); } catch (_) {}
    writes.push({ method: req.method(), url: req.url().split('/rest/v1/')[1] || req.url(), body });
    return r.fulfill({ status: 201, contentType: 'application/json', body: '[]' });
  }
  return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
});
await page.route('**nominatim**', (r) => r.abort());
await page.route('**open-meteo**', (r) => r.abort());
let styleCalls = 0; let dailyCalls = 0; let dailyBodies = [];
await page.route('**/api/style', async (r) => {
  styleCalls++;
  await new Promise((res) => setTimeout(res, 1200)); // let the scan state show
  r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(STYLE_RESP) });
});
await page.route('**/api/daily', async (r) => {
  dailyCalls++;
  try { dailyBodies.push(r.request().postDataJSON()); } catch (_) { dailyBodies.push(null); }
  await new Promise((res) => setTimeout(res, 400));
  r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(DAILY_RESP) });
});

await page.addInitScript(() => {
  window.__TEST_PROFILE = {
    first_name: 'Annie', last_name: '', mobile: '', style_icons: [], budget: null,
    wardrobe_description: '', style_dna: {}, wardrobe_items_count: 0,
    onboarded_at: '2026-07-01', gender_identity: 'woman',
  };
  Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true });
});
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2800);

// 1 · Inspiration page + header CTA
await page.evaluate(() => window.__rbInspOpen());
await page.waitForTimeout(400);
const cta = page.locator('#rb-insp-page button:has-text("Style a key piece")').first();
check('inspiration header carries the Style a key piece pill', await cta.count() > 0);

// 2 · CTA opens the modal on step 1
await cta.click();
await page.waitForTimeout(300);
check('modal opens', await page.locator('#rb-inst-wrap').isVisible());
check('step 1 headline', (await page.locator('#rb-inst-wrap').innerText()).includes('Style a key piece'));
check('snap/attach tile', (await page.locator('#rb-inst-wrap').innerText()).includes('Snap or attach'));
check('brief textarea present', await page.locator('#rb-inst-ta').count() === 1);
check('hint line', (await page.locator('#rb-inst-wrap').innerText()).includes('A photo makes it sharper'));
check('CTA reads Style it three ways', (await page.locator('#rb-inst-wrap').innerText()).toLowerCase().includes('style it three ways'));

// 3 · Empty submit refuses (no fetch, stays on step 1)
await page.evaluate(() => window.__inStGo());
await page.waitForTimeout(300);
check('empty submit stays on step 1, no call', styleCalls === 0 && await page.locator('#rb-inst-ta').count() === 1);

// 4 · Words → step 2 scan state → kp result
await page.fill('#rb-inst-ta', 'My Umbro shorts, sporty cool');
await page.locator('.rb-inst-cta').click();
await page.waitForTimeout(400);
const scanTxt = await page.locator('#rb-inst-wrap').innerText();
check('step 2 scan state shows', /Reading your piece|Generating your look/.test(scanTxt));
check('scan cancel offered', scanTxt.includes('This takes about twenty seconds'));
await page.waitForTimeout(1600);
check('one /api/style call', styleCalls === 1);
check('modal closed after landing', await page.locator('#rb-inst-wrap').count() === 0);
check('inspiration page closed under the result', !(await page.locator('#rb-insp-page').isVisible()));
check('kp result page visible', await page.locator('#kp-result-page').isVisible());
const kpTxt = await page.locator('#kp-result-page').innerText();
check('three ways rendered', kpTxt.includes('Urbane Weekend') && kpTxt.includes('Park Hangout'));

// 5 · Build this look → the composer IN SITU on the kp page (design
// Key_Piece_Reveal, 2026-09-16): the three cards fold away, a strip keeps
// the other two one tap away, and the SAME composer the Lookbook and the
// prompt use paints into #kp-build-host — no new page, nothing written
// until she saves. With no model on file the NO MODEL YET band closes the
// page.
const buildBtns = page.locator('#kp-result-page button:has-text("Build this look")');
check('Build this look on every look card', await buildBtns.count() === 3);
const bandBefore = await page.locator('#kp-model-band .kp-model-band').count();
// Slice 1.3 (2026-09-18): no START HERE band; card 01's Build this look is the
// page's one filled button until a way is built; the model band's button is a
// hairline on a first-session account (this fixture's profile counts 0).
const landing = await page.evaluate(() => {
  const bg = (id) => { const b = document.getElementById(id); return b ? getComputedStyle(b).backgroundColor : null; };
  const mb = document.getElementById('kp-model-build');
  return { band: !!document.getElementById('kp-guide-band'), first: bg('kp-build-btn-0'), second: bg('kp-build-btn-1'), third: bg('kp-build-btn-2'),
    modelBtnClass: mb ? mb.className : null, modelBtnBg: mb ? getComputedStyle(mb).backgroundColor : null };
});
check('first landing · no guide band; card 01 carries the ONE filled Build this look',
  landing.band === false && landing.first === 'rgb(32, 32, 33)' && landing.second !== 'rgb(32, 32, 33)' && landing.third !== 'rgb(32, 32, 33)',
  JSON.stringify(landing));
// This fixture's profile counts 0 pieces (a first-session account), so the
// model band's button is the hairline — card 01 keeps the page's one ink.
check('first landing · the model band’s button is a hairline on a first-session account',
  landing.modelBtnClass === 'rb-pill' && landing.modelBtnBg !== 'rgb(32, 32, 33)', JSON.stringify(landing));
check('no model on file: the NO MODEL YET band closes the three-up page',
  bandBefore === 1 && /No model yet/i.test(await page.locator('#kp-model-band').innerText()) && /all three/.test(await page.locator('#kp-model-band').innerText()));
await buildBtns.first().click();
await page.waitForTimeout(150);
check('in place: the cards fold, the strip + the building composer stand ON the kp page — no takeover, no new page',
  await page.locator('#kp-result-page').isVisible() && !(await page.locator('#kp-ways').isVisible())
  && await page.locator('#kp-build .kp-build-strip').isVisible() && await page.locator('#kp-build-host .rb-lk-composer').count() === 1
  && await page.locator('#kp-build-wait').isVisible() && !(await page.locator('#sn-page').isVisible())
  && !(await page.locator('#kp-loading-overlay').isVisible().catch(() => false)));
await page.waitForTimeout(1300);
check('one /api/daily call', dailyCalls === 1);
check('imagery requested — noImages no longer sent (audit 2.2)', dailyBodies[0] && !dailyBodies[0].noImages);
check('brief carries the way prose', dailyBodies[0] && /Umbro shorts, a white ribbed tank/.test(dailyBodies[0].prompt || ''));
check('lands in the COMPOSER on the kp page — a loose draft, not a saved look, not the Lookbook',
  await page.locator('#kp-build-host .rb-lk-composer').isVisible() && !(await page.locator('#sn-page').isVisible())
  && !(await page.locator('#dl-result-page').isVisible()) && await page.locator('#kp-build-wait').count() === 0);
const looseState = await page.evaluate(() => ({
  title: document.getElementById('rb-lk-newtitle')?.value,
  eyebrow: document.querySelector('#kp-build .kp-build-ey')?.textContent?.trim(),
  strips: document.querySelectorAll('#kp-build .kp-build-strip').length,
  titleInStrip: !!document.querySelector('#kp-build .kp-build-strip #rb-lk-newtitle'),
  hostMast: document.querySelectorAll('#kp-build-host .rb-lk-mast, #kp-build-host .rb-lk-kpmast, #kp-build-host input#rb-lk-newtitle').length,
  chooseHead: getComputedStyle(document.getElementById('kp-choose-head')).display,
  panelOpens: (document.querySelector('#kp-build-host .rb-lk-composer .rbc-panel')?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60),
  panelNote: document.querySelector('#kp-build-host .rbc-panel .rbc-quote')?.textContent?.trim() || '',
  cta: document.querySelector('#kp-build-host .rb-lk-save')?.textContent?.trim(),
  dayChip: !!document.querySelector('#kp-build-host .rb-lk-daychip'),
  band: !!document.querySelector('#kp-build-host .rb-ret'),
  proposals: document.querySelectorAll('#kp-build-host .rbc-rack .rbc-row').length,
  swaps: document.querySelectorAll('#kp-build-host .rbc-rack .rbc-row .rbc-act').length,
  frame: !!document.querySelector('#kp-build-host img[alt="This look"]'),
  youModel: document.querySelectorAll('#kp-build-host .rb-lkm-row').length,
  others: Array.from(document.querySelectorAll('#kp-build .kp-build-other')).map((x) => (x.getAttribute('title') || '').replace(/^Build /, '')),
  otherLabels: document.querySelectorAll('#kp-build .kp-build-other .t').length,
  allThree: document.querySelector('#kp-build .kp-build-all')?.textContent?.trim(),
  bandBelow: !!document.querySelector('#kp-model-band .kp-model-band'),
  lookbookBody: (document.getElementById('rb-lk-body')?.innerHTML || '').length,
}));
check('the way names the draft under its own eyebrow, Save this look is the commitment, no day, no second return band',
  looseState.title === 'Urbane Weekend' && looseState.eyebrow === 'Sporty cool' && looseState.cta === 'Save this look'
  && looseState.dayChip === false && looseState.band === false && looseState.proposals === 4 && looseState.swaps >= 4,
  JSON.stringify(looseState));
check('one header per step (2026-09-16): the Build step is ONE rule line — eyebrow + the name field left, All three + two bare thumbs right; the key-piece masthead and the Yours thumb stand down; the composer paints no masthead of its own, so the panel opens on the style note',
  looseState.strips === 1 && looseState.titleInStrip && looseState.hostMast === 0 && looseState.chooseHead === 'none'
  && looseState.allThree === 'All three' && looseState.otherLabels === 0 && !/Urbane Weekend/.test(looseState.panelOpens)
  && /The shorts lead; everything else stays quiet/.test((looseState.panelNote || '')),
  JSON.stringify(looseState));
check('no model: the way’s frame holds the canvas (no You / Model switch — it is not her), the band stays at the foot',
  looseState.frame && looseState.youModel === 0 && looseState.bandBelow, JSON.stringify(looseState));
check('the strip carries the other two looks; ONE composer in the DOM (the Lookbook body is empty)',
  looseState.others.join('|') === 'Coffee Run|Park Hangout' && looseState.lookbookBody === 0, JSON.stringify(looseState));
// (The kp artifact's own lookbook row is a different, standing write —
// the styled key piece lives on Inspiration. The BUILD must not mint a
// look or a day.)
check('nothing is written until she saves',
  !writes.some((w) => w.method === 'POST' && /^(looks\?|looks$|look_pieces|planned_days)/.test(w.url)),
  JSON.stringify(writes.filter((w) => w.method === 'POST').map((w) => w.url)));
// ← All three looks: the draft goes, the cards return.
await page.locator('#kp-build .kp-build-all').click();
await page.waitForTimeout(200);
check('All three: the cards return with the Choose header, the draft is gone, the band stands',
  await page.locator('#kp-ways').isVisible() && !(await page.locator('#kp-build').isVisible()) && await page.locator('#kp-choose-head').isVisible()
  && await page.locator('#kp-result-page .rb-lk-composer').count() === 0 && await page.locator('#kp-model-band .kp-model-band').count() === 1);
// The strip hands her the next look in place; Try another re-runs it.
await buildBtns.first().click();
await page.waitForTimeout(1500);
await page.locator('#kp-build .kp-build-other[title="Build Park Hangout"]').click();
await page.waitForTimeout(1500);
check('the strip builds the next look in place (a fresh call, the strip re-pointed)',
  dailyCalls === 3 && (await page.evaluate(() => document.getElementById('rb-lk-newtitle')?.value)) === 'Park Hangout'
  && (await page.evaluate(() => Array.from(document.querySelectorAll('#kp-build .kp-build-other')).map((x) => x.title.replace(/^Build /, '')).join('|'))) === 'Urbane Weekend|Coffee Run');
await page.evaluate(() => window.__lkTryAnother());
await page.waitForTimeout(1500);
check('Try another re-runs the same way in place', dailyCalls === 4 && await page.locator('#kp-build-host .rb-lk-composer').isVisible()
  && (await page.evaluate(() => document.getElementById('rb-lk-newtitle')?.value)) === 'Park Hangout');

// 5b · Build your model from the band parks the draft and comes back to it
// — the result AND the composer, nothing generated twice.
await page.route('**/stylenotes', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>stub</title>' }));
await page.locator('#kp-model-band #kp-model-build').click();
await page.waitForURL('**/stylenotes', { timeout: 4000 }).catch(() => {});
const parked = await page.evaluate(() => {
  let d = null; try { d = JSON.parse(sessionStorage.getItem('rb_lk_draft') || 'null'); } catch (_) {}
  return { ret: sessionStorage.getItem('rb_model_return'), kp: d && d.kp ? { savedId: d.kp.savedId, wayIdx: d.kp.wayIdx, shop: (d.kp.shop || []).length } : null, frame: !!(d && d.photo && d.photo.frame) };
});
check('Build your model parks the kp draft and returns to Inspiration',
  parked.ret === 'inspiration' && parked.kp && parked.kp.savedId != null && parked.kp.wayIdx === 2 && parked.kp.shop === 4 && parked.frame, JSON.stringify(parked));
const dailyBefore = dailyCalls;
await page.goto(`${BASE}/inspiration`, { waitUntil: 'networkidle' });
await page.waitForTimeout(3200);
check('back from the builder: the kp result reopens over Inspiration with the draft where she left it, nothing re-generated',
  await page.locator('#kp-result-page').isVisible() && await page.locator('#kp-build-host .rb-lk-composer').isVisible()
  && (await page.evaluate(() => document.getElementById('rb-lk-newtitle')?.value)) === 'Park Hangout'
  && await page.locator('#kp-build-host .rbc-rack .rbc-row').count() === 4 && dailyCalls === dailyBefore
  && (await page.evaluate(() => Array.from(document.querySelectorAll('#kp-build .kp-build-other')).map((x) => x.title.replace(/^Build /, '')).join('|'))) === 'Urbane Weekend|Coffee Run',
  JSON.stringify({ kp: await page.locator('#kp-result-page').isVisible(), host: await page.locator('#kp-build-host .rb-lk-composer').count(), calls: dailyCalls - dailyBefore }));

// 5c · Save files it to the Lookbook (the one write), and the host reads Filed.
await page.evaluate(async () => {
  window.__lkSaveAsk();
  await new Promise((r) => setTimeout(r, 250));
  document.getElementById('rb-lksave-yes')?.click();
});
await page.waitForTimeout(1000);
const keptLook = writes.filter((w) => w.method === 'POST' && /^looks/.test(w.url)).pop();
check('the keep mints the Look, named after the way',
  keptLook && keptLook.body && keptLook.body.name === 'Park Hangout' && keptLook.body.name_provisional === true,
  JSON.stringify(keptLook && keptLook.body || null));
check('gaps ride the kept look as proposals, her product photo on the key piece card',
  keptLook && Array.isArray(keptLook.body.proposals) && keptLook.body.proposals.length >= 1
    && JSON.stringify(keptLook.body.proposals).includes('piece.jpg'),
  JSON.stringify(keptLook && keptLook.body.proposals || null));
check('look card photograph is the way’s original kp frame',
  keptLook && keptLook.body.photo_url === 'https://res.cloudinary.com/demo/way3.jpg',
  JSON.stringify(keptLook && keptLook.body.photo_url || null));
check('filed IN PLACE: the host reads Filed with the look one tap away, the kp page still on top; the strip’s name field settles to text',
  await page.locator('#kp-result-page').isVisible() && await page.locator('#kp-build-host .kp-build-filed').isVisible()
  && await page.locator('#kp-build .kp-build-title-set').count() === 1 && await page.locator('#kp-build input#rb-lk-newtitle').count() === 0
  && /Park Hangout/.test(await page.locator('#kp-build-host .kp-build-filed').innerText())
  && !(await page.locator('#sn-page').isVisible()) && await page.locator('#kp-build .kp-build-other').count() === 2);
// Slice 1.2 (2026-09-18): the Filed card's forward line — no model on file and
// proposals travelled, so it names the model and the pieces to photograph.
const filedNext = await page.evaluate(() => ({
  line: document.querySelector('#kp-build-host .kp-filed-next')?.textContent || '',
  doors: document.querySelectorAll('#kp-build-host .kp-build-filed button').length,
  firstUnfilled: getComputedStyle(document.getElementById('kp-build-btn-0')).backgroundColor !== 'rgb(32, 32, 33)',
}));
check('filed · the forward line names the model and the borrowed pieces; Open the look stays the one door; card 01 stands down',
  /^Build your model and she’ll wear it\. Photograph the \d+ pieces? that (aren’t|isn’t) yours yet and it’s all yours\.$/.test(filedNext.line)
    && filedNext.doors === 1 && filedNext.firstUnfilled === true, JSON.stringify(filedNext));
await page.locator('#kp-build-host button:has-text("Open the look")').click();
await page.waitForTimeout(600);
check('Open the look lands on the saved look page, Key piece as its way back',
  await page.locator('#sn-page').isVisible() && (await page.locator('#sn-page .rb-ret-pill .lab').first().innerText()).trim() === 'Key piece'
  && /Park Hangout/.test(await page.locator('#sn-page').innerText()));
const savedNoModel = await page.evaluate(() => ({
  frame: document.querySelector('#sn-page .rb-lkm-photo img')?.getAttribute('src'),
  mosaic: document.querySelectorAll('#sn-page .rbc-board .rbc-tile').length,
  switchRow: document.querySelectorAll('#sn-page .rb-lk-viewrow').length,
  head: document.querySelector('#sn-page .rbc-lhead .lab')?.textContent,
  props: document.querySelectorAll('#sn-page .rbc-rack .rb-lk-prop').length,
}));
check('the saved look opens on the way’s FRAME, not the mosaic (Annie, 2026-09-16); no model → no You / Model switch; the proposals still hang on the rack',
  savedNoModel.frame === 'https://res.cloudinary.com/demo/way3.jpg' && savedNoModel.mosaic === 0 && savedNoModel.switchRow === 0
  && /0 yours, 4 to find/.test(savedNoModel.head || '') && savedNoModel.props === 4, JSON.stringify(savedNoModel));
await page.locator('#sn-page .rb-ret-pill').first().click();
await page.waitForTimeout(600);
check('…and the way back is the three ways', await page.locator('#kp-result-page').isVisible() && !(await page.locator('#sn-page').isVisible())
  && await page.locator('#kp-ways').isVisible());
// A built way opens its saved look on the next tap — never a second build.
const dailyBeforeReopen = dailyCalls;
const builtBtn = await page.evaluate(() => ({ text: document.getElementById('kp-build-btn-2')?.textContent?.trim(), first: document.getElementById('kp-build-btn-0')?.textContent?.trim(), persisted: (JSON.parse(localStorage.getItem('robes_style_notes__u-test') || '[]').find((i) => i.type === 'key-piece')?.kpData?.builtLooks) || null }));
check('the built way’s card reads Open the look (the others still Build this look), and the link is persisted on the kp entry',
  builtBtn.text === 'Open the look' && builtBtn.first === 'Build this look' && builtBtn.persisted && Object.keys(builtBtn.persisted).join('') === '2', JSON.stringify(builtBtn));
await page.locator('#kp-build-btn-2').click();
await page.waitForTimeout(600);
check('tapping the built way opens the SAVED look — no new build, no /api/daily call',
  await page.locator('#sn-page').isVisible() && /Park Hangout/.test(await page.locator('#sn-page').innerText())
  && dailyCalls === dailyBeforeReopen && await page.locator('#kp-build-host .rb-lk-composer').count() === 0);
await page.locator('#sn-page .rb-ret-pill').first().click();
await page.waitForTimeout(600);

// 6 · The kp result survives — reopening from Inspiration still shows the three ways
await page.evaluate(() => window.__rbInspOpen());
await page.waitForTimeout(500);
check('inspiration still lists the styled key piece', (await page.locator('#rb-insp-page').innerText()).includes('Styled three ways by Robes'));

// 7 · Cancel path: reopen modal, submit, cancel mid-scan
await page.evaluate(() => window.__rbInspOpen());
await page.waitForTimeout(300);
await page.locator('#rb-insp-page button:has-text("Style a key piece")').first().click();
await page.waitForTimeout(200);
await page.fill('#rb-inst-ta', 'Another piece');
await page.locator('.rb-inst-cta').click();
await page.waitForTimeout(300);
await page.locator('#rb-inst-wrap button:has-text("Cancel")').click();
await page.waitForTimeout(400);
check('cancel closes the modal quietly', await page.locator('#rb-inst-wrap').count() === 0);

// 8 · With a model on file: the build opens DRESSED on her canvas (as a
// prompt look does), the frame yields, no You / Model switch, no band.
const renders = [];
await page.route('**/api/avatar/cell', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url: 'https://img.test/cell.jpg' }) }));
await page.route('**/api/avatar/render', (r) => {
  let b = null; try { b = r.request().postDataJSON(); } catch (_) {}
  renders.push((b && b.pieces || []).map((p) => p.name));
  r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ jobId: 'rj' + renders.length }) });
});
await page.route('**/api/images/rj*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ images: ['https://img.test/render.jpg'], done: true }) }));
await page.route('**img.test/**', (r) => r.abort());
await page.evaluate(() => { localStorage.setItem('rb_model__u-test', JSON.stringify({ kept: true, skin: 3, hair: 1, nudges: {}, gender: 'woman', v: 2 })); });
await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2600);
await page.evaluate(() => {
  const it = JSON.parse(localStorage.getItem('robes_style_notes__u-test') || '[]').find((i) => i.type === 'key-piece');
  window.__snOpenItem(it.id);
});
await page.waitForTimeout(600);
check('model on file: no NO MODEL YET band on the three-up page', await page.locator('#kp-result-page').isVisible() && await page.locator('#kp-model-band .kp-model-band').count() === 0);
await page.locator('#kp-result-page button:has-text("Build this look")').first().click();
await page.waitForTimeout(3600);
const modelState = await page.evaluate(() => ({
  stage: document.querySelectorAll('#kp-build-host .rb-lkm-stage').length,
  frame: !!document.querySelector('#kp-build-host img[alt="This look"]'),
  youModel: document.querySelectorAll('#kp-build-host .rb-lkm-row').length,
  band: document.querySelectorAll('#kp-model-band .kp-model-band').length,
  proposals: document.querySelectorAll('#kp-build-host .rbc-rack .rbc-row').length,
}));
check('the build opens DRESSED — her model on the canvas, the way’s frame yields, no You / Model switch, no band',
  modelState.stage === 1 && !modelState.frame && modelState.youModel === 0 && modelState.band === 0 && modelState.proposals === 4, JSON.stringify(modelState));
check('one render of the four proposals (the same key the saved look keeps)',
  renders.length === 1 && renders[0].length === 4 && renders[0].includes('Umbro shorts'), JSON.stringify(renders));
// Saved with a model: the frame sits on the You side, her render on Model.
await page.evaluate(async () => {
  window.__lkSaveAsk();
  await new Promise((r) => setTimeout(r, 250));
  document.getElementById('rb-lksave-yes')?.click();
});
await page.waitForTimeout(1000);
await page.locator('#kp-build-host button:has-text("Open the look")').click();
await page.waitForTimeout(700);
// With a model on file the frame YIELDS to her (Annie, 2026-09-18): the
// look opens on Model — her render — with You holding Robes' frame.
const savedWithModel = await page.evaluate(() => ({
  render: document.querySelector('#sn-page .rb-lkm-canvas img.rb-lkm-img')?.getAttribute('src'),
  frameShown: document.querySelectorAll('#sn-page .rb-lkm-photo').length,
  seg: Array.from(document.querySelectorAll('#sn-page .rb-lk-viewrow .rb-lkm-seg button')).map((b) => b.textContent.trim() + (b.classList.contains('on') ? '*' : '')).join('|'),
  note: document.querySelector('#sn-page .rb-lk-viewrow .note')?.textContent?.trim(),
}));
check('with a model: the saved look opens on MODEL — her render (the canvas frame the save kept) under a You / Model switch, Model lit, no note beside it',
  savedWithModel.render === 'https://img.test/render.jpg' && savedWithModel.frameShown === 0 && savedWithModel.seg === 'You|Model*' && (savedWithModel.note || '') === '', JSON.stringify(savedWithModel));
await page.locator('#sn-page .rb-lk-viewrow .rb-lkm-seg button:has-text("You")').click();
await page.waitForTimeout(400);
const youSide = await page.evaluate(() => ({
  frame: document.querySelector('#sn-page .rb-lkm-photo img')?.getAttribute('src'),
  render: document.querySelectorAll('#sn-page .rb-lkm-canvas img.rb-lkm-img').length,
}));
check('You shows the way’s frame, her render steps aside',
  youSide.frame === 'https://res.cloudinary.com/demo/way1.jpg' && youSide.render === 0, JSON.stringify(youSide));

// 9 · Look feedback (design Look_Feedback, 2026-09-17): per look, the
// hairline line — never one verdict across the three; Build this look is
// the design's hairline pill.
await page.route('**/api/feedback', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
await page.evaluate(() => {
  const it = JSON.parse(localStorage.getItem('robes_style_notes__u-test') || '[]').find((i) => i.type === 'key-piece');
  window.__snOpenItem(it.id);
});
await page.waitForTimeout(600);
const fbShape = await page.evaluate(() => {
  const pg = document.getElementById('kp-result-page');
  const b = document.getElementById('kp-build-btn-1');
  const cs = getComputedStyle(b);
  const card = b.closest('.kp-look-card');
  const more = getComputedStyle(document.getElementById('kp-look-more-1'));
  return {
    blocks: ['kp0', 'kp1', 'kp2'].map((p) => !!document.getElementById(p + '-fb')),
    perLook: (pg.textContent.match(/How was this one\?/g) || []).length,
    pageLevel: /How were these looks\?/.test(pg.textContent),
    emoji: /👍/.test(pg.textContent),
    resting: ['kp0', 'kp1', 'kp2'].every((p) => document.getElementById(p + '-fb-up') && document.getElementById(p + '-fb-dn') && !document.getElementById(p + '-fb-text')),
    thumbs: (() => { const u = document.getElementById('kp0-fb-up'), t = document.querySelector('#kp0-fb .rb-fb-title'); const cs = getComputedStyle(u); return { round: cs.borderRadius, w: u.getBoundingClientRect().width, svg: !!u.querySelector('svg'), noWords: u.textContent.trim() === '', sameLine: Math.abs(u.getBoundingClientRect().top + u.getBoundingClientRect().height / 2 - (t.getBoundingClientRect().top + t.getBoundingClientRect().height / 2)) < 6 }; })(),
    pillFont: cs.fontSize, pillTracking: cs.letterSpacing, pillCase: cs.textTransform, pillBg: cs.backgroundColor,
    pillBorder: cs.borderTopWidth, pillRadius: cs.borderTopLeftRadius, pillWidth: b.getBoundingClientRect().width, cardWidth: card.getBoundingClientRect().width,
    arrow: !!b.querySelector('.arr'), moreCentred: more.alignSelf,
    firstFilled: getComputedStyle(document.getElementById('kp-build-btn-0')).backgroundColor,
  };
});
check('feedback · one hairline line PER look, the page-level block and its emoji gone',
  fbShape.blocks.every(Boolean) && fbShape.perLook === 3 && !fbShape.pageLevel && !fbShape.emoji && fbShape.resting, JSON.stringify(fbShape));
check('feedback · the verdict is two thumb circles on the question’s own line, no words (Annie’s iteration)',
  fbShape.thumbs.svg && fbShape.thumbs.noWords && fbShape.thumbs.round === '50%' && fbShape.thumbs.w === 28 && fbShape.thumbs.sameLine, JSON.stringify(fbShape.thumbs));
check('build this look · the design’s hairline pill (9.5px, .2em, uppercase, transparent, full card width, arrow, More detail centred)',
  fbShape.pillFont === '9.5px' && /^1\.9/.test(fbShape.pillTracking) && fbShape.pillCase === 'uppercase'
    && fbShape.pillBg === 'rgba(0, 0, 0, 0)' && fbShape.pillBorder === '1px' && Math.abs(fbShape.pillWidth - fbShape.cardWidth) < 1
    && fbShape.arrow && fbShape.moreCentred === 'center' && fbShape.firstFilled === 'rgba(0, 0, 0, 0)', JSON.stringify(fbShape));
const fbBefore = writes.filter((w) => w.url === 'feedback').length;
await page.locator('#kp1-fb-dn').click();
await page.waitForTimeout(200);
const fbPicked = await page.evaluate(() => ({
  on: document.getElementById('kp1-fb-dn')?.classList.contains('on') && document.getElementById('kp1-fb-dn').getAttribute('aria-pressed') === 'true' && !!document.getElementById('kp1-fb-dn').querySelector('svg'),
  onBg: getComputedStyle(document.getElementById('kp1-fb-dn')).backgroundColor,
  offOther: !document.getElementById('kp1-fb-up')?.classList.contains('on'),
  input: document.getElementById('kp1-fb-text')?.placeholder,
  focused: document.activeElement?.id,
  send: document.querySelector('#kp1-fb .rb-fb-send')?.textContent.trim(),
  sendBg: getComputedStyle(document.querySelector('#kp1-fb .rb-fb-send')).backgroundColor,
  othersStill: !document.getElementById('kp0-fb-text') && !document.getElementById('kp2-fb-text'),
}));
check('feedback · thumbs down: warm fill, the note opens focused ("the note is the point"), Send is a hairline pill, the other two looks untouched',
  fbPicked.on && fbPicked.onBg === 'rgb(243, 239, 230)' && fbPicked.offOther && fbPicked.input === 'What would have made it better?'
    && fbPicked.focused === 'kp1-fb-text' && fbPicked.send === 'Send' && fbPicked.sendBg === 'rgba(0, 0, 0, 0)' && fbPicked.othersStill, JSON.stringify(fbPicked));
await page.locator('#kp1-fb-up').click();
await page.waitForTimeout(150);
check('feedback · Loved it flips the placeholder (a note optional)', await page.locator('#kp1-fb-text').getAttribute('placeholder') === 'Anything you want more of?');
await page.fill('#kp1-fb-text', 'more of the olive');
await page.locator('#kp1-fb .rb-fb-send').click();
await page.waitForTimeout(400);
const fbSent = await page.evaluate(() => ({
  line: document.getElementById('kp1-fb-done')?.textContent.trim(),
  pillsGone: !document.getElementById('kp1-fb-up'),
  others: !!document.getElementById('kp0-fb-up') && !!document.getElementById('kp2-fb-up'),
}));
const fbRows = writes.filter((w) => w.url === 'feedback').slice(fbBefore);
check('feedback · sent collapses to one line; the other looks still ask',
  fbSent.line === 'Noted — filed for next time.' && fbSent.pillsGone && fbSent.others, JSON.stringify(fbSent));
check('feedback · ONE feedback row, at look level: the way’s title leads the note, the kp entry is the item',
  fbRows.length === 1 && fbRows[0].body.track === 'key-piece' && fbRows[0].body.rating === 1
    && fbRows[0].body.note === 'Coffee Run — more of the olive' && fbRows[0].body.lookbook_item_id != null, JSON.stringify(fbRows));
// A reopen of the same result keeps the sent line (state keyed on the data).
await page.evaluate(() => window.__kpRenderResult(window.__lastKpData, 'Umbro shorts', { intent: 'style', skipSave: true, savedId: null }));
await page.waitForTimeout(300);
check('feedback · a re-render of the same result keeps the sent line, the others still resting',
  (await page.locator('#kp1-fb-done').count()) === 1 && (await page.locator('#kp0-fb-up').count()) === 1);
// The composer (a way built in situ) carries the same line under Save / Try another
// (way 1 — ways 0 and 2 were built in earlier sections, so their buttons open saved looks).
await page.locator('#kp-build-btn-1').click();
await page.waitForTimeout(3200);
const lkFb = await page.evaluate(() => {
  const host = document.getElementById('kp-build-host');
  const fb = host?.querySelector('#lk-fb');
  const save = host?.querySelector('.rb-lk-saverow');
  return {
    present: !!fb, afterSave: !!(fb && save && (save.compareDocumentPosition(fb) & Node.DOCUMENT_POSITION_FOLLOWING)),
    title: fb?.querySelector('.rb-fb-title')?.textContent.trim(), sub: fb?.querySelector('.rb-fb-sub')?.textContent.trim(),
    // (a proposal row's own Save-to-wishlist pill is ink by the 2026-08-13
    // rule — the feedback line itself must add no ink fill)
    inkFills: Array.from(host.querySelectorAll('button')).filter((b) => getComputedStyle(b).backgroundColor === 'rgb(32, 32, 33)').map((b) => b.textContent.trim()).filter((t) => t !== 'Save'),
    fbInk: Array.from(fb.querySelectorAll('button')).some((b) => getComputedStyle(b).backgroundColor === 'rgb(32, 32, 33)'),
  };
});
check('feedback · the in-situ composer carries the line under its foot; Save this look stays the one ink fill (the line adds none)',
  lkFb.present && lkFb.afterSave && lkFb.title === 'How was this look?' && lkFb.sub === 'Your taste shapes what comes next'
    && lkFb.inkFills.length === 1 && /Save this look/.test(lkFb.inkFills[0]) && !lkFb.fbInk, JSON.stringify(lkFb));
const lkBefore = writes.filter((w) => w.url === 'feedback').length;
await page.locator('#lk-fb-up').click();
await page.waitForTimeout(150);
await page.locator('#lk-fb .rb-fb-send').click();
await page.waitForTimeout(300);
const lkRows = writes.filter((w) => w.url === 'feedback').slice(lkBefore);
check('feedback · the composer’s line files against the key piece with no note required',
  (await page.locator('#lk-fb-done').count()) === 1 && lkRows.length === 1 && lkRows[0].body.track === 'key-piece' && lkRows[0].body.rating === 1 && lkRows[0].body.note === null, JSON.stringify(lkRows));

check('no page errors', errs.length === 0, errs.join(' | '));

// 10 · The modal's + menu (Annie, 2026-09-17): the prompt's own + reused — a key
// piece pulled from the wardrobe or the wishlist through the EXISTING picker, and a
// NEW upload scanned into the wardrobe.
{
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 1200 } });
  const p2 = await ctx2.newPage();
  const errs2 = [];
  p2.on('pageerror', (e) => errs2.push(String(e)));
  const wardrobe = [
    { id: 'w1', user_id: 'u-test', label: 'Cream silk shirt', category: 'Tops', color: 'Cream', brand: 'Equipment', image_url: 'https://res.cloudinary.com/demo/w1.jpg', times_worn: 4, created_at: '2026-09-01' },
    { id: 'w2', user_id: 'u-test', label: 'Black wool trousers', category: 'Bottoms', color: 'Black', brand: 'COS', image_url: null, times_worn: 0, created_at: '2026-09-02' },
  ];
  const wishlist = [
    { id: 'wl1', user_id: 'u-test', label: 'Gold hoop earrings', category: 'Accessories', color: 'Gold', brand: 'Missoma', image_url: null, source_type: 'robes', created_at: '2026-09-03' },
  ];
  const writes2 = [];
  await p2.route('**cdn.jsdelivr.net/**', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: SUPA_STUB }));
  await p2.route('**ayowpaknssulsqqvwpqx.supabase.co/**', (r) => {
    const req = r.request(); const u = req.url().split('/rest/v1/')[1] || req.url();
    if (req.method() === 'GET') {
      const body = u.startsWith('wardrobe_items?') ? wardrobe : u.startsWith('wishlist_items?') ? wishlist : [];
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    }
    let body = null; try { body = req.postDataJSON(); } catch (_) {}
    writes2.push({ method: req.method(), url: u, body });
    if (req.method() === 'POST' && u.startsWith('wardrobe_items')) {
      const row = Object.assign({ id: 'w-new', times_worn: 0, created_at: '2026-09-17' }, body);
      wardrobe.unshift(row);
      return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify([row]) });
    }
    return r.fulfill({ status: 201, contentType: 'application/json', body: '[]' });
  });
  await p2.route('**nominatim**', (r) => r.abort());
  await p2.route('**open-meteo**', (r) => r.abort());
  await p2.route('**res.cloudinary.com/**', (r) => r.abort());
  let analyseMode = 'ok';
  await p2.route('**/api/wardrobe/analyse', async (r) => {
    await new Promise((res) => setTimeout(res, 350));
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(analyseMode === 'none'
      ? { noItemDetected: true, label: '', category: '', color: '', brand: '', notes: '', item_dna: {} }
      : { label: 'Red tweed jacket', category: 'Outerwear', category_l2: 'Jackets', category_l3: 'Tweed jacket', color: 'Red', brand: 'Chanel', notes: '', item_dna: { display: { title: 'Red tweed jacket' } } }) });
  });
  await p2.route('**/api/wardrobe/upload', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url: 'https://res.cloudinary.com/demo/up.jpg' }) }));
  const stylePrompts = [];
  await p2.route('**/api/style', (r) => { try { stylePrompts.push(r.request().postDataJSON()); } catch (_) { stylePrompts.push(null); } r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(STYLE_RESP) }); });
  await p2.route('**/api/feedback', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
  await p2.addInitScript(() => {
    window.__TEST_PROFILE = { first_name: 'Annie', last_name: '', mobile: '', style_icons: [], budget: null, wardrobe_description: '', style_dna: {}, wardrobe_items_count: 2, onboarded_at: '2026-07-01', gender_identity: 'woman' };
    Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true });
  });
  await p2.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  await p2.waitForTimeout(2800);
  await p2.evaluate(() => window.__rbInspOpen());
  await p2.waitForTimeout(300);
  await p2.locator('#rb-insp-page button:has-text("Style a key piece")').first().click();
  await p2.waitForTimeout(300);
  const menu = await p2.evaluate(() => ({
    add: !!document.querySelector('#rb-inst-left .hp-add#rb-inst-add'),
    closed: !document.getElementById('rb-inst-addmenu')?.classList.contains('open'),
    opts: Array.from(document.querySelectorAll('#rb-inst-addmenu .hp-addopt')).map((b) => b.textContent.trim()),
    tile: /Snap or attach/.test(document.getElementById('rb-inst-left')?.textContent || ''),
    cam: document.getElementById('rb-inst-cam')?.getAttribute('capture'), file: document.getElementById('rb-inst-file')?.hasAttribute('capture'),
  }));
  check('+ menu · the modal reuses the prompt’s + (Upload · Take a picture · From wardrobe · From wishlist), capture only on the camera row',
    menu.add && menu.closed && menu.opts.join('|') === 'Upload|Take a picture|From wardrobe|From wishlist' && menu.tile && menu.cam === 'environment' && menu.file === false, JSON.stringify(menu));
  await p2.locator('#rb-inst-add').click();
  await p2.waitForTimeout(150);
  check('+ menu · opens on tap', await p2.evaluate(() => document.getElementById('rb-inst-addmenu').classList.contains('open')));
  await p2.locator('#rb-inst-addmenu .hp-addopt:has-text("From wardrobe")').click();
  await p2.waitForTimeout(250);
  const pick = await p2.evaluate(() => ({
    open: !!document.getElementById('cb-wa-pick'),
    menuClosed: !document.getElementById('rb-inst-addmenu')?.classList.contains('open'),
    eyebrow: document.querySelector('#cb-wa-pick p')?.textContent.trim(),
    tiles: document.querySelectorAll('#cb-wa-pick button[onclick*="__cbPickApply"]').length,
    seg: Array.from(document.querySelectorAll('#cb-wa-pick .cb-pick-seg')).map((b) => b.textContent + (b.classList.contains('on') ? '*' : '')).join('|'),
  }));
  check('+ menu · From wardrobe opens the EXISTING picker (#cb-wa-pick) with her pieces and a Wardrobe | Wishlist switch, Wardrobe lit',
    pick.open && pick.menuClosed && pick.eyebrow === 'From your wardrobe' && pick.tiles === 2 && pick.seg === 'Wardrobe*|Wishlist', JSON.stringify(pick));
  await p2.locator('#cb-wa-pick button[onclick*="__cbPickApply"]').first().click();
  await p2.waitForTimeout(300);
  const attached = await p2.evaluate(() => ({
    pickerGone: !document.getElementById('cb-wa-pick'),
    piece: document.getElementById('rb-inst-piece')?.textContent.replace(/\s+/g, ' ').trim(),
    addGone: !document.querySelector('#rb-inst-left .hp-add'),
    ph: document.getElementById('rb-inst-ta')?.placeholder,
    hint: document.getElementById('rb-inst-hint')?.textContent,
    prompt: document.getElementById('cb-ta')?.value || '',
  }));
  check('+ menu · a wardrobe pick attaches as the key piece (eyebrow, name, Change), the brief asks for the occasion, the home prompt is untouched',
    attached.pickerGone && /Your key piece/i.test(attached.piece) && /Cream silk shirt/.test(attached.piece) && attached.addGone
      && attached.ph.startsWith('The occasion') && /how you have worn it/.test(attached.hint) && attached.prompt === '', JSON.stringify(attached));
  await p2.locator('#rb-inst-piece button:has-text("Change")').click();
  await p2.waitForTimeout(150);
  check('+ menu · Change returns the tile and the +', (await p2.locator('#rb-inst-piece').count()) === 0 && (await p2.locator('#rb-inst-left .hp-add').count()) === 1);
  await p2.locator('#rb-inst-add').click();
  await p2.locator('#rb-inst-addmenu .hp-addopt:has-text("From wishlist")').click();
  await p2.waitForTimeout(250);
  const wl = await p2.evaluate(() => ({
    eyebrow: document.querySelector('#cb-wa-pick p')?.textContent.trim(),
    seg: Array.from(document.querySelectorAll('#cb-wa-pick .cb-pick-seg')).map((b) => b.textContent + (b.classList.contains('on') ? '*' : '')).join('|'),
    tiles: Array.from(document.querySelectorAll('#cb-wa-pick button[onclick*="__cbPickApply"]')).map((b) => b.lastElementChild.textContent.trim()),
  }));
  check('+ menu · From wishlist lists her wanted pieces in the same picker', wl.eyebrow === 'From your wishlist' && wl.seg === 'Wardrobe|Wishlist*' && wl.tiles.join() === 'Gold hoop earrings', JSON.stringify(wl));
  // The segment inside the picker walks to the other source and keeps the callback.
  await p2.locator('#cb-wa-pick .cb-pick-seg:has-text("Wardrobe")').click();
  await p2.waitForTimeout(150);
  check('+ menu · the picker’s segment switches source in place', (await p2.locator('#cb-wa-pick button[onclick*="__cbPickApply"]').count()) === 2);
  await p2.locator('#cb-wa-pick .cb-pick-seg:has-text("Wishlist")').click();
  await p2.waitForTimeout(150);
  await p2.locator('#cb-wa-pick button[onclick*="__cbPickApply"]').first().click();
  await p2.waitForTimeout(200);
  const wlAttached = await p2.evaluate(() => ({
    piece: document.getElementById('rb-inst-piece')?.textContent.replace(/\s+/g, ' ').trim(),
    hint: document.getElementById('rb-inst-hint')?.textContent,
  }));
  check('+ menu · a wishlist pick attaches under its own eyebrow', /From your wishlist/i.test(wlAttached.piece) && /Gold hoop earrings/.test(wlAttached.piece) && /from your wishlist/.test(wlAttached.hint), JSON.stringify(wlAttached));
  await p2.fill('#rb-inst-ta', 'dinner, a little glamour');
  await p2.locator('.rb-inst-cta').click();
  await p2.waitForTimeout(700);
  check('+ menu · the brief leads with the wishlist piece — "the", never "my", no wear count',
    stylePrompts.length === 1 && stylePrompts[0].prompt === 'Style the Gold hoop earrings three ways. dinner, a little glamour', JSON.stringify(stylePrompts.map((b) => b && b.prompt)));
  check('+ menu · no wardrobe row was written for a pick', writes2.filter((w) => w.url.startsWith('wardrobe_items')).length === 0);

  // A NEW upload is scanned into the wardrobe and attaches itself.
  await p2.evaluate(() => window.__rbInspOpen());
  await p2.waitForTimeout(300);
  await p2.locator('#rb-insp-page button:has-text("Style a key piece")').first().click();
  await p2.waitForTimeout(300);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR4nGP8z8DwnwEKGBkYAB1IA/wSCV0LAAAAAElFTkSuQmCC', 'base64');
  await p2.setInputFiles('#rb-inst-file', { name: 'jacket.png', mimeType: 'image/png', buffer: png });
  await p2.waitForTimeout(150);
  const filing = await p2.evaluate(() => ({
    line: document.querySelector('#rb-inst-left .rb-inst-scan')?.textContent.trim(),
    photo: !!document.querySelector('#rb-inst-left img'),
  }));
  check('scan · the upload says it is filing to the wardrobe while it reads', filing.line === 'Filing it to your wardrobe…' && filing.photo, JSON.stringify(filing));
  await p2.waitForTimeout(1500);
  const filed = await p2.evaluate(() => ({
    line: document.querySelector('#rb-inst-left .rb-inst-scan')?.textContent.trim(),
    piece: document.getElementById('rb-inst-piece')?.textContent.replace(/\s+/g, ' ').trim(),
    ph: document.getElementById('rb-inst-ta')?.placeholder,
  }));
  const rows = writes2.filter((w) => w.method === 'POST' && w.url.startsWith('wardrobe_items'));
  check('scan · the piece is filed (one wardrobe row, analysed + hosted) and attaches as the key piece',
    filed.line === '✓ Filed to your wardrobe' && /Red tweed jacket/.test(filed.piece) && filed.ph.startsWith('The occasion')
      && rows.length === 1 && rows[0].body.label === 'Red tweed jacket' && rows[0].body.category === 'Outerwear' && rows[0].body.category_l2 === 'Jackets'
      && rows[0].body.image_url === 'https://res.cloudinary.com/demo/up.jpg' && rows[0].body.brand === 'Chanel', JSON.stringify({ filed, rows: rows.map((r) => r.body) }));
  await p2.locator('.rb-inst-cta').click();
  await p2.waitForTimeout(700);
  check('scan · the brief leads with the filed piece and carries the photo',
    stylePrompts.length === 2 && stylePrompts[1].prompt === 'Style my Red tweed jacket three ways' && /^data:image/.test(stylePrompts[1].photo || ''), JSON.stringify(stylePrompts[1] && stylePrompts[1].prompt));

  // A face or a room files nothing, and says so.
  analyseMode = 'none';
  await p2.evaluate(() => window.__rbInspOpen());
  await p2.waitForTimeout(300);
  await p2.locator('#rb-insp-page button:has-text("Style a key piece")').first().click();
  await p2.waitForTimeout(300);
  await p2.setInputFiles('#rb-inst-file', { name: 'me.png', mimeType: 'image/png', buffer: png });
  await p2.waitForTimeout(1800);
  const none = await p2.evaluate(() => ({
    line: document.querySelector('#rb-inst-left .rb-inst-scan')?.textContent.trim(),
    piece: !!document.getElementById('rb-inst-piece'),
    photo: !!document.querySelector('#rb-inst-left img'),
  }));
  check('scan · nothing to file says so, keeps the photo for the looks, writes no row',
    /couldn’t see a piece/.test(none.line || '') && !none.piece && none.photo && writes2.filter((w) => w.method === 'POST' && w.url.startsWith('wardrobe_items')).length === 1, JSON.stringify(none));
  check('+ menu · no page errors', errs2.length === 0, errs2.join(' | '));
  await ctx2.close();
}

let pass = 0, fail = 0;
for (const r of results) { console.log((r.pass ? '  ok  ' : '  FAIL ') + r.name + (r.pass ? '' : '  — ' + r.detail)); r.pass ? pass++ : fail++; }
console.log(`\n${pass}/${pass + fail} checks passed`);
await browser.close();
server.kill();
process.exit(fail ? 1 : 0);
