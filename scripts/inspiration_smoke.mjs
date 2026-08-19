// Inspiration smoke — the "Style a key piece" modal journey: Inspiration "Style a key piece" modal → kp result →
// "Build this look" → daily console → back to the three ways.
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

// 5 · Build this look → an editable Look entity in the Lookbook,
// named after the chosen way, itemised composition-only (noImages)
const buildBtns = page.locator('#kp-result-page button:has-text("Build this look")');
check('Build this look on every look card', await buildBtns.count() === 3);
await buildBtns.first().click();
await page.waitForTimeout(1400);
check('one /api/daily call', dailyCalls === 1);
check('composition only — noImages sent, no image job', dailyBodies[0] && dailyBodies[0].noImages === true);
check('brief carries the way prose', dailyBodies[0] && /Umbro shorts, a white ribbed tank/.test(dailyBodies[0].prompt || ''));
// EDIT MODE, not a saved look (Annie's beta pass 2026-08-17): the itemised
// way lands LOOSE — the editable console, nothing written, Save this look
// as the one commitment. Keeping it mints the Look with the way's name,
// its kp frame as the photograph, and every gap as a proposal.
check('lands in EDIT mode — the loose console, not a saved look',
  await page.locator('#dl-result-page').isVisible());
const looseState = await page.evaluate(() => ({
  eyebrow: document.querySelector('#dl-result-page .dlm-eyebrow')?.textContent,
  title: document.querySelector('#dl-result-page .dlm-title')?.textContent,
  cta: document.querySelector('#dl-result-page .rbc-action button')?.textContent,
  offer: !!document.querySelector('#dl-result-page .dlm-offer'),
  loose: !!(window.__lastDlData && window.__lastDlData._dlLoose),
}));
check('the way names the offer, Save is the commitment',
  looseState.title === 'Urbane Weekend' && looseState.eyebrow === 'Your look'
    && looseState.cta === 'Save this look' && looseState.loose === true && looseState.offer === false);
// (The kp artifact's own lookbook row is a different, standing write —
// the styled key piece lives on Inspiration. The BUILD must not mint a
// look or a day.)
check('nothing is written until she saves',
  !writes.some((w) => w.method === 'POST' && /^(looks\?|looks$|look_pieces|planned_days)/.test(w.url)),
  JSON.stringify(writes.filter((w) => w.method === 'POST').map((w) => w.url)));
await page.evaluate(async () => {
  window.__dlSaveAsk();
  await new Promise((r) => setTimeout(r, 250));
  document.getElementById('rb-dlsave-yes')?.click();
});
await page.waitForTimeout(1000);
const keptLook = writes.filter((w) => w.method === 'POST' && /^looks/.test(w.url)).pop();
check('the keep mints the Look, named after the way',
  keptLook && keptLook.body && keptLook.body.name === 'Urbane Weekend' && keptLook.body.name_provisional === true,
  JSON.stringify(keptLook && keptLook.body || null));
check('gaps ride the kept look as proposals, her product photo on the key piece card',
  keptLook && Array.isArray(keptLook.body.proposals) && keptLook.body.proposals.length >= 1
    && JSON.stringify(keptLook.body.proposals).includes('piece.jpg'),
  JSON.stringify(keptLook && keptLook.body.proposals || null));
check('look card photograph is the way’s original kp frame',
  keptLook && keptLook.body.photo_url === 'https://res.cloudinary.com/demo/way1.jpg',
  JSON.stringify(keptLook && keptLook.body.photo_url || null));

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

// 8 · Empty-state card also opens the modal
check('no page errors', errs.length === 0, errs.join(' | '));

let pass = 0, fail = 0;
for (const r of results) { console.log((r.pass ? '  ok  ' : '  FAIL ') + r.name + (r.pass ? '' : '  — ' + r.detail)); r.pass ? pass++ : fail++; }
console.log(`\n${pass}/${pass + fail} checks passed`);
await browser.close();
server.kill();
process.exit(fail ? 1 : 0);
