// Inspiration smoke — the "Style a key piece" modal journey: Inspiration "Style a key piece" modal → kp result →
// "Build this look" → the composer IN SITU on the kp page → save → Filed; the model park/return; the dressed canvas.
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
  eyebrow: document.querySelector('#kp-build-host .rb-lk-kpmast .ey')?.textContent?.trim(),
  cta: document.querySelector('#kp-build-host .rb-lk-save')?.textContent?.trim(),
  dayChip: !!document.querySelector('#kp-build-host .rb-lk-daychip'),
  band: !!document.querySelector('#kp-build-host .rb-ret'),
  proposals: document.querySelectorAll('#kp-build-host .rbc-rack .rbc-row').length,
  swaps: document.querySelectorAll('#kp-build-host .rbc-rack .rbc-row .rbc-act').length,
  frame: !!document.querySelector('#kp-build-host img[alt="This look"]'),
  youModel: document.querySelectorAll('#kp-build-host .rb-lkm-row').length,
  others: Array.from(document.querySelectorAll('#kp-build .kp-build-other .t')).map((x) => x.textContent.trim()),
  bandBelow: !!document.querySelector('#kp-model-band .kp-model-band'),
  lookbookBody: (document.getElementById('rb-lk-body')?.innerHTML || '').length,
}));
check('the way names the draft under its own eyebrow, Save this look is the commitment, no day, no second return band',
  looseState.title === 'Urbane Weekend' && looseState.eyebrow === 'Sporty cool' && looseState.cta === 'Save this look'
  && looseState.dayChip === false && looseState.band === false && looseState.proposals === 4 && looseState.swaps >= 4,
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
await page.locator('#kp-build .kp-build-back').click();
await page.waitForTimeout(200);
check('← All three looks: the cards return, the draft is gone, the band stands',
  await page.locator('#kp-ways').isVisible() && !(await page.locator('#kp-build').isVisible())
  && await page.locator('#kp-result-page .rb-lk-composer').count() === 0 && await page.locator('#kp-model-band .kp-model-band').count() === 1);
// The strip hands her the next look in place; Try another re-runs it.
await buildBtns.first().click();
await page.waitForTimeout(1500);
await page.locator('#kp-build .kp-build-other[title="Build Park Hangout"]').click();
await page.waitForTimeout(1500);
check('the strip builds the next look in place (a fresh call, the strip re-pointed)',
  dailyCalls === 3 && (await page.evaluate(() => document.getElementById('rb-lk-newtitle')?.value)) === 'Park Hangout'
  && (await page.locator('#kp-build .kp-build-other .t').allInnerTexts()).join('|') === 'Urbane Weekend|Coffee Run');
await page.evaluate(() => window.__lkTryAnother());
await page.waitForTimeout(1500);
check('Try another re-runs the same way in place', dailyCalls === 4 && await page.locator('#kp-build-host .rb-lk-composer').isVisible()
  && (await page.evaluate(() => document.getElementById('rb-lk-newtitle')?.value)) === 'Park Hangout');

// 5b · Build your model from the band parks the draft and comes back to it
// — the result AND the composer, nothing generated twice.
await page.route('**/stylenotes', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>stub</title>' }));
await page.locator('#kp-model-band .rb-lkm-build').click();
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
  && (await page.locator('#kp-build .kp-build-other .t').allInnerTexts()).join('|') === 'Urbane Weekend|Coffee Run',
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
check('filed IN PLACE: the host reads Filed with the look one tap away, the kp page still on top',
  await page.locator('#kp-result-page').isVisible() && await page.locator('#kp-build-host .kp-build-filed').isVisible()
  && /Park Hangout/.test(await page.locator('#kp-build-host .kp-build-filed').innerText())
  && !(await page.locator('#sn-page').isVisible()) && await page.locator('#kp-build .kp-build-other').count() === 2);
await page.locator('#kp-build-host button:has-text("Open the look")').click();
await page.waitForTimeout(600);
check('Open the look lands on the saved look page, Key piece as its way back',
  await page.locator('#sn-page').isVisible() && (await page.locator('#sn-page .rb-ret-pill .lab').first().innerText()).trim() === 'Key piece'
  && /Park Hangout/.test(await page.locator('#sn-page').innerText()));
await page.locator('#sn-page .rb-ret-pill').first().click();
await page.waitForTimeout(600);
check('…and the way back is the three ways', await page.locator('#kp-result-page').isVisible() && !(await page.locator('#sn-page').isVisible())
  && await page.locator('#kp-ways').isVisible());

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

check('no page errors', errs.length === 0, errs.join(' | '));

let pass = 0, fail = 0;
for (const r of results) { console.log((r.pass ? '  ok  ' : '  FAIL ') + r.name + (r.pass ? '' : '  — ' + r.detail)); r.pass ? pass++ : fail++; }
console.log(`\n${pass}/${pass + fail} checks passed`);
await browser.close();
server.kill();
process.exit(fail ? 1 : 0);
