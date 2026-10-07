// Inspiration smoke — the key piece journey since the fold (2026-10-05): the Lookbook's "Style a key piece" door → the prompt
// box with its wardrobe sheet → the piece's card + Style it three ways → kp result
// (Worn three ways, 2026-09-28: the 4:5 cards with the swatch pill, the pager on the phone, the piece-by-piece
// sheet) → "Build this look" → the composer IN SITU on the kp page (the builder's header, the bar) → save → the saved
// view with the toast; the model park/return; the dressed canvas; the thumbs + feedback sheet; the modal's wardrobe /
// wishlist doors + the upload scan.
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
    { eyebrow: 'Sporty cool', title: 'Urbane Weekend', outfit: 'Umbro shorts, a white ribbed tank, and a camel overshirt worn open.', details: 'Half-tuck the tank.', accessories: 'Flat leather slides, tortoise sunglasses, one gold hoop.',
      pieces: [
        { name: 'White ribbed tank', category: 'Tops', color: 'white', color_hex: '#F1EEE7', role: 'The Canvas', wardrobe_match: null, brand: 'COS', retailer_hint: 'COS', price_point: '€45' },
        { name: 'Umbro shorts', category: 'Bottoms', color: 'navy', color_hex: '#2F3748', role: 'The Anchor', wardrobe_match: { id: 'w-kp', label: 'Umbro shorts', image_url: 'https://res.cloudinary.com/demo/piece.jpg', color: 'Navy' }, brand: '', retailer_hint: '', price_point: '' },
        { name: 'Camel overshirt', category: 'Outerwear', color: 'camel', color_hex: '#B98A5E', role: 'The Texture', wardrobe_match: null, brand: 'Arket', retailer_hint: 'Arket', price_point: '€129' },
        { name: 'Flat leather slides', category: 'Shoes', color: 'tan', color_hex: '#9A6B45', role: 'The Exclamation Point', wardrobe_match: null, brand: 'Sézane', retailer_hint: 'Sézane', price_point: '€165' },
      ] },
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
  const u = req.url();
  // One filed piece — the piece the box's wardrobe sheet picks.
  if (u.includes('wardrobe_items')) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'w-kp', user_id: 'u-test', label: 'Umbro shorts', category: 'Bottoms', color: 'Navy', brand: 'Umbro', image_url: 'https://res.cloudinary.com/demo/piece.jpg', times_worn: 3, created_at: '2026-09-01T10:00:00Z', item_dna: {} }]) });
  return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
});
await page.route('**nominatim**', (r) => r.abort());
await page.route('**open-meteo**', (r) => r.abort());
let styleCalls = 0; let dailyCalls = 0; let dailyBodies = []; const refineBodies = [];
const REFINED_WAY = { eyebrow: 'Evening athletic', title: 'Coffee Run, after dark', outfit: 'Umbro shorts, a black silk shirt.', details: 'Buttoned to the collar.', accessories: 'Black loafers, one cuff.',
  pieces: [{ name: 'Black silk shirt', category: 'Tops', color: 'black', color_hex: '#1A1A1A', role: 'The Canvas', wardrobe_match: null, brand: 'COS', retailer_hint: 'COS', price_point: '€120' }] };
await page.route('**/api/style', async (r) => {
  let body = null; try { body = r.request().postDataJSON(); } catch (_) {}
  // Slice C: a refine ask answers ONE way at its index + one frame at that slot
  if (body && body.refine) {
    refineBodies.push(body);
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ way: REFINED_WAY, wayIndex: body.wayIndex, ways: [REFINED_WAY], jobId: 'rf1', photoUrl: STYLE_RESP.photoUrl, fallback: false }) });
  }
  styleCalls++;
  await new Promise((res) => setTimeout(res, 1200)); // let the scan state show
  r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(STYLE_RESP) });
});
// The way's box reads her line first (/api/look/ask): a change asks for the
// re-write, anything else is a verdict on the look.
const askPosts = [];
await page.route('**/api/look/ask', (r) => { let b = null; try { b = r.request().postDataJSON(); } catch (_) {} askPosts.push(b);
  const change = /evening|swap|change|not the/i.test(String(b?.text || ''));
  r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(change ? { intent: 'swap', reply: 'Done.', swaps: [{ i: 0, to: { name: 'Black silk shirt', category: 'Tops' } }], back: [], styled: [] } : { intent: 'none', reply: 'Noted.', swaps: [], back: [], styled: [] }) }); });
await page.route('**/api/images/rf1', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ images: [null, 'https://res.cloudinary.com/demo/way2b.jpg', null], done: true }) }));
await page.route('**res.cloudinary.com/demo/piece.jpg', (r) => r.abort());
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

// 1 · The Lookbook's "Style a key piece" door → the prompt box with its wardrobe sheet
await page.evaluate(() => window.__rbNavGo('lookbook'));
await page.waitForTimeout(500);
// An EMPTY Lookbook is the composer (the one-door rule) — the dashed door
// joins the grid once anything stands in it (pinned in section 7); the
// handler is the same either way.
const door = await page.evaluate(() => ({ composer: !!document.querySelector('#sn-page .rb-lk-composer'), grid: document.getElementById('rb-lk-grid')?.style.display, noPage: !document.getElementById('rb-insp-page'), noTab: !document.getElementById('rb-tn-inspiration'), fn: typeof window.__lkStyleKeyPiece }));
check('an empty Lookbook is still the composer (no grid, no door); no Inspiration page, no tab', door.composer && door.grid === 'none' && door.noPage && door.noTab && door.fn === 'function', JSON.stringify(door));
await page.evaluate(() => window.__lkStyleKeyPiece());
await page.waitForTimeout(500);
const opened = await page.evaluate(() => ({ dock: !!document.querySelector('#rb-lp.rb-lp-dock'), scrim: !!document.getElementById('rb-lp-scrim'), plus: !!document.querySelector('#rb-lp .fieldrow #rb-lp-plus'), ph: document.getElementById('rb-lp-in')?.placeholder,
  sheet: !!document.getElementById('cb-wa-pick'), title: document.querySelector('#cb-wa-pick .cb-pick-title')?.textContent, sub: document.querySelector('#cb-wa-pick .cb-pick-sub')?.textContent,
  chips: Array.from(document.querySelectorAll('#cb-wa-pick .cb-pick-cat')).map((b) => b.textContent + (b.classList.contains('on') ? '*' : '')), tiles: document.querySelectorAll('#cb-wa-pick .cb-pick-tile').length }));
check('the door opens the box docked over a dimmed screen — the + inside the field, "A new look for…" — with the wardrobe sheet already open (its title, its line, All + her categories, her pieces)',
  opened.dock && opened.scrim && opened.plus && opened.ph === 'A new look for…' && opened.sheet && opened.title === 'From your wardrobe' && opened.sub === 'Pick the piece to start from.'
    && JSON.stringify(opened.chips) === JSON.stringify(['All*', 'Bottoms']) && opened.tiles === 1, JSON.stringify(opened));

// 2 · A pick lands on the card above the field; the arrow stays quiet until a mode is picked
await page.locator('#cb-wa-pick .cb-pick-tile').first().click();
await page.waitForTimeout(400);
const card = await page.evaluate(() => ({ sheetGone: !document.getElementById('cb-wa-pick'), box: !!document.getElementById('rb-lp'), name: document.querySelector('#rb-lp-piece .nm')?.textContent, sub: document.querySelector('#rb-lp-piece .sb')?.textContent,
  ey: document.querySelector('#rb-lp-piece .ey')?.textContent, modes: Array.from(document.querySelectorAll('#rb-lp-piece .mode .t')).map((t) => t.textContent), ticked: document.querySelectorAll('#rb-lp-piece .mode.on').length,
  ph: document.getElementById('rb-lp-in')?.placeholder, ink: document.getElementById('rb-lp-send')?.classList.contains('ink'), x: !!document.querySelector('#rb-lp-piece .rm') }));
check('a pick closes the sheet and lands the piece on the card: name, "Bottoms · in your wardrobe", STYLE THIS PIECE, Build a look / Style it three ways, × — nothing ticked, the arrow quiet, "Where to? Optional"',
  card.sheetGone && card.box && card.name === 'Umbro shorts' && card.sub === 'Bottoms · in your wardrobe' && /Style this piece/i.test(card.ey || '') && JSON.stringify(card.modes) === JSON.stringify(['Build a look', 'Style it three ways'])
    && card.ticked === 0 && card.ph === 'Where to? Optional' && card.ink === false && card.x, JSON.stringify(card));

// 3 · Send without a mode does nothing; a mode turns the arrow ink
await page.evaluate(() => window.__rbLpSend());
await page.waitForTimeout(300);
check('send without a mode sends nothing — the box stays, no /api/style call', styleCalls === 0 && await page.locator('#rb-lp-piece').count() === 1);
await page.locator('#rb-lp-piece .mode', { hasText: 'Style it three ways' }).click();
await page.waitForTimeout(150);
check('picking Style it three ways ticks it and inks the arrow', await page.evaluate(() => document.querySelectorAll('#rb-lp-piece .mode.on .t')[0]?.textContent === 'Style it three ways' && document.getElementById('rb-lp-send').classList.contains('ink')));

// 4 · A note + Send → the piece track → three SUGGESTED rows (look states,
// 2026-10-06): the generation is recorded as a key-piece entry (the set),
// one row per way is minted around her piece, and she lands on the keep-
// or-pass DECK (F14, 2026-10-07) with the frames arriving.
let stylePost = null;
const styleCapture = async (r) => { try { stylePost = r.request().postDataJSON(); } catch (_) {} styleCalls++; await new Promise((res) => setTimeout(res, 600)); r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(Object.assign({}, STYLE_RESP, { generatedImages: [null, null, null], jobId: 'j1' })) }); };
await page.route('**/api/style', styleCapture);
let j1Polls = 0;
await page.route('**/api/images/j1', (r) => { j1Polls++; r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ images: ['https://res.cloudinary.com/demo/way1.jpg', null, null], done: j1Polls > 1 }) }); });
await page.fill('#rb-lp-in', 'sporty cool');
await page.evaluate(() => window.__rbLpSend());
await page.waitForTimeout(400);
check('the box closes on send and the styling overlay stands in', !(await page.locator('#rb-lp').count()) && await page.locator('#kp-loading-overlay').isVisible());
await page.waitForTimeout(1200);
check('one /api/style call, the brief led by the piece with its wear count and her note after it', styleCalls === 1 && stylePost && stylePost.prompt === 'Style my Umbro shorts three ways (worn 3 times). sporty cool' && stylePost.intent === 'style', JSON.stringify(stylePost && stylePost.prompt));
await page.unroute('**/api/style', styleCapture);
// Keep or pass (F14, 2026-10-07): a fresh set lands on the DECK, not the
// grid — while the frames compose her piece is the top card with a line
// that changes every two seconds (F14·0, the gesture taught the first
// time), then the three stack as one card each (F14·1).
const deckRead = () => page.evaluate(() => ({
  sn: document.getElementById('sn-page')?.style.display, kp: document.getElementById('kp-result-page')?.style.display || 'none',
  cls: document.querySelector('#rb-lk-body .rb-lk-deck')?.className, band: document.querySelector('#rb-lk-body .rb-ret-pill .lab')?.textContent,
  ey: document.querySelector('.rb-lk-decktb .rb-tb-ey')?.textContent, title: document.querySelector('.rb-lk-decktb .rb-tb-title')?.textContent,
  line: document.getElementById('rb-deck-line')?.textContent, teach: document.querySelector('.rb-deck-teach')?.textContent, arrows: document.querySelectorAll('.rb-deck-arrow').length,
  top: document.querySelector('.rb-deck-card.top .rb-deck-t')?.textContent, topM: document.querySelector('.rb-deck-card.top .rb-deck-m')?.textContent, topPhoto: document.querySelector('.rb-deck-card.top .lt-photo')?.getAttribute('src'),
  dress: !!document.querySelector('.rb-deck-card.top.dress'), under: document.querySelectorAll('.rb-deck-card.under').length,
  dots: Array.from(document.querySelectorAll('.rb-deck-dots i')).map((i) => (i.classList.contains('on') ? 1 : 0)),
  btns: Array.from(document.querySelectorAll('.rb-deck-btn')).map((b) => b.getAttribute('aria-label') + ':' + getComputedStyle(b).backgroundColor),
  bar: document.getElementById('rb-lk-bar')?.style.display, grid: document.getElementById('rb-lk-grid')?.style.display,
  inks: Array.from(document.querySelectorAll('#sn-page button')).filter((b) => b.offsetParent !== null && b.getBoundingClientRect().height > 20 && getComputedStyle(b).backgroundColor === 'rgb(32, 32, 33)').map((b) => b.getAttribute('aria-label') || b.textContent.trim()),
  undo: document.getElementById('rb-lk-undo')?.textContent || '', sugg: JSON.parse(localStorage.getItem('rb_looks__u-test_sugg') || '[]').filter((x) => x.status === 'suggested').map((x) => x.name).sort(),
  end: { t: document.querySelector('.rb-deck-end .t')?.textContent, s: document.querySelector('.rb-deck-end .s')?.textContent, thumbs: document.querySelectorAll('.rb-deck-thumb').length, see: document.querySelector('.rb-deck-see')?.textContent, back: document.querySelector('.rb-deck-backlink')?.textContent },
}));
const land = await deckRead();
check('F14·0 · the send lands on the DECK inside the Lookbook — never the kp page, never the grid — ‹ Shorts, "Around your shorts", "Your shorts, three ways.", no masthead, no grid',
  land.sn === 'block' && land.kp === 'none' && /dressing/.test(land.cls || '') && land.band === 'Shorts' && land.ey === 'Around your shorts' && land.title === 'Your shorts, three ways.' && land.bar === 'none' && land.grid === 'none', JSON.stringify(land));
check('F14·0 · her piece is the top card while the frames compose — "Your shorts" over the changing line, three empty dots, the gesture taught the first time (hairline arrows, no ink anywhere)',
  land.dress && land.top === 'Your shorts' && land.line === 'Dressing it three ways' && land.teach === 'Swipe left to pass, right to keep.' && land.arrows === 2 && JSON.stringify(land.dots) === '[0,0,0]' && land.btns.length === 0 && land.inks.length === 0, JSON.stringify(land));
await page.waitForTimeout(6500);
const live = await deckRead();
check('F14·1 · the first ready look replaces the card as its frame lands (the job delivers way 1 first), the other two join behind it once the job settles: one deck, "Urbane Weekend · 4 pieces" on top, two under, the first dot on',
  j1Polls >= 2 && /live/.test(live.cls || '') && live.top === 'Urbane Weekend' && live.topM === '4 pieces' && live.topPhoto === 'https://res.cloudinary.com/demo/way1.jpg' && live.under === 2 && JSON.stringify(live.dots) === '[1,0,0]' && !live.line && !live.teach, JSON.stringify(live));
check('F14·1 · ✕ hairline, ✓ the one ink fill on the screen', JSON.stringify(live.btns) === JSON.stringify(['Pass:rgb(255, 255, 255)', 'Keep:rgb(32, 32, 33)']) && JSON.stringify(live.inks) === JSON.stringify(['Keep']), JSON.stringify([live.btns, live.inks]));
const framePatch = writes.find((w) => w.method === 'PATCH' && /^looks\?/.test(w.url) && w.body && w.body.photo_url === 'https://res.cloudinary.com/demo/way1.jpg');
check('the landed frame is PATCHed onto its row', !!framePatch);
// F14·2 — the drag: the card moves sideways, the KEEP stamp fades in with
// it, released short it springs back; past 100px it commits.
const cardBox = await page.locator('.rb-deck-card.top').boundingBox();
const cx = cardBox.x + cardBox.width / 2, cy = cardBox.y + cardBox.height / 2;
await page.mouse.move(cx, cy); await page.mouse.down();
await page.mouse.move(cx + 30, cy, { steps: 3 }); await page.mouse.move(cx + 70, cy, { steps: 3 });
await page.waitForTimeout(120);
const mid = await page.evaluate(() => ({ tf: document.querySelector('.rb-deck-card.top').style.transform, keep: document.querySelector('.rb-deck-card.top .rb-deck-stamp.keep').style.opacity, pass: document.querySelector('.rb-deck-card.top .rb-deck-stamp.pass').style.opacity }));
check('F14·2 · dragging right moves the card sideways and fades the ✓ KEEP stamp in with the drag (the pass stamp stays out)', /translateX\(70px\)/.test(mid.tf) && Number(mid.keep) > 0.6 && Number(mid.keep) < 1 && mid.pass === '0', JSON.stringify(mid));
await page.mouse.move(cx + 40, cy, { steps: 3 }); await page.mouse.up();
await page.waitForTimeout(450);
const sprung = await page.evaluate(() => ({ tf: document.querySelector('.rb-deck-card.top').style.transform, top: document.querySelector('.rb-deck-card.top .rb-deck-t')?.textContent }));
check('F14·2 · released short, the card springs back and nothing is decided', sprung.tf === '' && sprung.top === 'Urbane Weekend', JSON.stringify(sprung));
await page.mouse.move(cx, cy); await page.mouse.down();
await page.mouse.move(cx + 60, cy, { steps: 3 }); await page.mouse.move(cx + 170, cy, { steps: 4 }); await page.mouse.up();
await page.waitForTimeout(600);
const kept1 = await deckRead();
check('F14·2 · past 100px the keep commits — the next card is on top, the second dot on, the look still suggested (it waits in Suggested)',
  kept1.top === 'Coffee Run' && JSON.stringify(kept1.dots) === '[0,1,0]' && kept1.under === 1 && JSON.stringify(kept1.sugg) === JSON.stringify(['Coffee Run', 'Park Hangout', 'Urbane Weekend']), JSON.stringify(kept1));
// A pass: left, held six seconds behind "Passed · Undo"; Undo puts the
// card back on top with nothing written.
await page.mouse.move(cx, cy); await page.mouse.down();
await page.mouse.move(cx - 60, cy, { steps: 3 }); await page.mouse.move(cx - 170, cy, { steps: 4 }); await page.mouse.up();
await page.waitForTimeout(600);
const passed = await deckRead();
check('F14·1 · a drag left passes: the look leaves the set at once behind "Passed · Undo", the next card is on top, nothing deleted yet',
  passed.top === 'Park Hangout' && /^Passed/.test(passed.undo) && /Undo$/.test(passed.undo) && JSON.stringify(passed.sugg) === JSON.stringify(['Park Hangout', 'Urbane Weekend']) && !writes.some((w) => w.method === 'DELETE' && /^looks\?/.test(w.url)), JSON.stringify(passed));
await page.evaluate(() => window.__lkSuggUndo());
await page.waitForTimeout(300);
const undone = await deckRead();
check('F14·1 · Undo puts the passed card back on top, whole', undone.top === 'Coffee Run' && undone.undo === '' && JSON.stringify(undone.sugg) === JSON.stringify(['Coffee Run', 'Park Hangout', 'Urbane Weekend']) && JSON.stringify(undone.dots) === '[0,1,0]', JSON.stringify(undone));
// The buttons do what the gesture does.
await page.locator('.rb-deck-btn.keep').click();
await page.waitForTimeout(500);
check('F14·1 · ✓ keeps — the third card is on top', (await deckRead()).top === 'Park Hangout');
// A tap opens F8; its back returns to the deck where she left it.
await page.locator('.rb-deck-card.top').click();
await page.waitForTimeout(500);
const tapF8 = await page.evaluate(() => ({ page: !!document.querySelector('#rb-lk-body .rb-lk-page'), band: document.querySelector('#rb-lk-body .rb-ret-pill .lab')?.textContent, title: document.getElementById('rb-lk-title')?.textContent, bar: Array.from(document.querySelectorAll('#rb-lk-body .rb-lk-suggbar button')).map((b) => b.textContent) }));
check('F14·1 · a tap on the card opens F8 — ‹ Three ways, the look, Edit · Save to lookbook', tapF8.page && tapF8.band === 'Three ways' && tapF8.title === 'Park Hangout' && JSON.stringify(tapF8.bar) === JSON.stringify(['Edit', 'Save to lookbook']), JSON.stringify(tapF8));
await page.evaluate(() => window.__lkBackDoor());
await page.waitForTimeout(400);
check('F14·1 · back from F8 resumes the deck on the same card', (await deckRead()).top === 'Park Hangout');
await page.locator('.rb-deck-btn.keep').click();
await page.waitForTimeout(500);
const done = await deckRead();
check('F14·3 · all three seen: "Three kept." / "They wait in Suggested until you save them.", the kept looks as thumbnails, See Suggested the one ink, "Back to the shorts" beneath',
  /done/.test(done.cls || '') && done.end.t === 'Three kept.' && done.end.s === 'They wait in Suggested until you save them.' && done.end.thumbs === 3 && done.end.see === 'See Suggested' && done.end.back === 'Back to the shorts' && JSON.stringify(done.inks) === JSON.stringify(['See Suggested']), JSON.stringify(done));
const seenKey = await page.evaluate(() => localStorage.getItem('rb_lk_deck_seen__u-test'));
check('F14·0 · the gesture is taught once — the seen flag is set for the next run', seenKey === '1');
await page.locator('.rb-deck-see').click();
await page.waitForTimeout(500);
const tabLand = await page.evaluate(() => ({
  deck: !!document.querySelector('.rb-lk-deck'), tab: document.querySelector('#rb-lk-bar .rb-lk-tab.on')?.textContent, count: document.querySelector('#rb-lk-bar .rb-lk-countline')?.textContent, acts: document.querySelectorAll('#rb-lk-bar .rb-mast-acts button').length,
  tiles: Array.from(document.querySelectorAll('#rb-lk-grid [data-sugg]')).map((e) => ({ t: e.querySelector('.lt-title')?.textContent, ey: e.querySelector('.lt-ey')?.textContent, m: e.querySelector('.lt-meta')?.textContent, chip: e.querySelector('.lt-chip')?.textContent, photo: e.querySelector('.lt-photo')?.getAttribute('src'), mark: e.querySelector('.lt-mark img')?.getAttribute('src'), btns: Array.from(e.querySelectorAll('.lt-sugbtn')).map((b) => b.getAttribute('aria-label')) })),
  inks: Array.from(document.querySelectorAll('#sn-page button')).filter((b) => b.offsetParent !== null && b.getBoundingClientRect().height > 20 && getComputedStyle(b).backgroundColor === 'rgb(32, 32, 33)').length,
}));
check('F14·3 · See Suggested opens the Suggested tab (F4) — "3 suggested", the kept looks as ordinary suggested tiles (mark, ✕, ↻), no controls, nothing filled ink',
  !tabLand.deck && tabLand.tab === 'Suggested' && tabLand.count === '3 suggested' && tabLand.acts === 0 && tabLand.inks === 0 && tabLand.tiles.length === 3 && JSON.stringify(tabLand.tiles.map((t) => t.t)) === JSON.stringify(['Park Hangout', 'Coffee Run', 'Urbane Weekend'])
    && tabLand.tiles.every((t) => t.ey === 'Suggested' && t.m === 'Around your shorts' && !t.chip && t.mark === 'https://res.cloudinary.com/demo/piece.jpg' && JSON.stringify(t.btns) === JSON.stringify(['Swap this look', 'Remove this look'])),
  JSON.stringify(tabLand));
check('the frame rides its tile — the first way\'s photograph, no chip on any', tabLand.tiles.find((t) => t.t === 'Urbane Weekend')?.photo === 'https://res.cloudinary.com/demo/way1.jpg', JSON.stringify(tabLand.tiles));
const kpWrite = writes.find((w) => w.method === 'POST' && /^lookbook_items/.test(w.url) && w.body && w.body.type === 'key-piece');
const rowWrites = writes.filter((w) => w.method === 'POST' && /^looks\b/.test(w.url) && w.body && w.body.status === 'suggested');
const pieceWrites = writes.filter((w) => w.method === 'POST' && /^look_pieces/.test(w.url));
check('the set is recorded as a key-piece entry (marked suggested) and three looks rows go up as suggested, anchored on her piece, grouped by the entry\'s id with their slot',
  !!kpWrite && kpWrite.body.data?.kpData?.suggested === true && rowWrites.length === 3 && rowWrites.every((w) => w.body.anchor_piece_id === 'w-kp' && String(w.body.set_id) === String(kpWrite.body.id) && w.body.source === 'robes' && w.body.name_provisional === true)
    && JSON.stringify(rowWrites.map((w) => w.body.set_index).sort()) === JSON.stringify([0, 1, 2]),
  JSON.stringify({ kp: !!kpWrite, rows: rowWrites.map((w) => [w.body.name, w.body.status, w.body.anchor_piece_id, w.body.set_index]) }));
check('the way\'s itemised pieces land: her shorts as The Anchor in look_pieces, the three unowned pieces as proposal rows on the row',
  pieceWrites.some((w) => Array.isArray(w.body) && w.body.some((p) => p.wardrobe_item_id === 'w-kp' && p.role === 'The Anchor'))
    && rowWrites.some((w) => w.body.name === 'Urbane Weekend' && Array.isArray(w.body.proposals) && w.body.proposals.length === 3 && w.body.proposals[0].opts[0].name === 'White ribbed tank'),
  JSON.stringify(rowWrites.map((w) => [w.body.name, (w.body.proposals || []).length])));
// Home's row reads the suggestions.
await page.evaluate(() => window.__rbNavGo('home'));
await page.waitForTimeout(400);
const homeRow = await page.evaluate(() => ({ ey: document.querySelector('#rb-insp-row .rb-sec-ey')?.textContent, n: document.querySelectorAll('#rb-insp-row .rb-sn-card').length, type: document.querySelector('#rb-insp-row .rb-sn-type')?.textContent, meta: document.querySelector('#rb-insp-row .rb-sn-meta')?.textContent }));
check('home\'s row reads Suggested — the newest suggested looks, "Around your shorts"', homeRow.ey === 'Suggested' && homeRow.n === 3 && homeRow.type === 'Suggested' && homeRow.meta === 'Around your shorts', JSON.stringify(homeRow));
await page.evaluate(() => window.__rbInspOpen());
await page.waitForTimeout(400);

// 5 · F8 — the suggested look page: read-only rack, Edit · Save to lookbook,
// the live feedback row at the foot; thumbs down + Send removes the look.
const idOf = async (title) => page.evaluate((t) => Array.from(document.querySelectorAll('#rb-lk-grid [data-sugg]')).find((e) => e.querySelector('.lt-title')?.textContent === t)?.dataset.sugg, title);
const urbane = await idOf('Urbane Weekend');
await page.locator(`#rb-lk-grid [data-sugg="${urbane}"] .lt-card`).click();
await page.waitForTimeout(500);
const f8 = await page.evaluate(() => ({
  band: document.querySelector('#rb-lk-body .rb-ret-pill .lab')?.textContent, ey: document.querySelector('#rb-lk-body .rb-lk-eyebrow')?.textContent, title: document.getElementById('rb-lk-title')?.textContent,
  meta: document.querySelector('#rb-lk-body .rb-tb-meta')?.textContent, rows: document.querySelectorAll('#rb-lk-body .rbc-rack .rbc-row').length,
  eyes: Array.from(document.querySelectorAll('#rb-lk-body .rbc-rack .rbc-eye')).map((e) => e.textContent),
  swaps: document.querySelectorAll('#rb-lk-body .rbc-swap').length, hearts: document.querySelectorAll('#rb-lk-body .rbc-wish').length, more: document.querySelectorAll('#rb-lk-body .rbc-more').length,
  bar: Array.from(document.querySelectorAll('#rb-lk-body .rb-lk-suggbar button')).map((b) => b.textContent), fb: document.querySelector('#rb-lk-body .rb-fb-title')?.textContent,
  worn: !!document.querySelector('#rb-lk-body .rb-lk-worn'), foot: !!document.querySelector('#rb-lk-body .rb-lk-foot'), acts: document.querySelectorAll('#rb-lk-body .rb-lk-imgacts button').length, tags: !!document.querySelector('#rb-lk-body .rbc-tags'),
  credit: /Composed by Robes/.test(document.querySelector('#rb-lk-body .rbc-panel')?.textContent || ''),
  inks: Array.from(document.querySelectorAll('#rb-lk-body button')).filter((b) => b.getBoundingClientRect().height > 20 && getComputedStyle(b).backgroundColor === 'rgb(32, 32, 33)').map((b) => b.textContent.trim()),
}));
check('F8 · ‹ Suggested, eyebrow "Suggested · around your shorts", the title, "4 pieces", Composed by Robes', f8.band === 'Suggested' && f8.ey === 'Suggested · around your shorts' && f8.title === 'Urbane Weekend' && f8.meta === '4 pieces' && f8.credit, JSON.stringify(f8));
check('F8 · the rack READS — four rows in the fifth pass\'s anatomy (Category · Brand), › alone: no ↻, no ♥; no camera, no diary, no tags, no wear record, no delete',
  f8.rows === 4 && f8.eyes.length === 4 && f8.eyes.some((e) => /^Bottoms · Umbro$/.test(e)) && f8.swaps === 0 && f8.hearts === 0 && f8.more === 4 && f8.acts === 0 && !f8.tags && !f8.worn && !f8.foot, JSON.stringify(f8));
check('F8 · the bar is Edit (hairline) · Save to lookbook (the page\'s one ink); the live "How was this look?" row sits at the foot',
  JSON.stringify(f8.bar) === JSON.stringify(['Edit', 'Save to lookbook']) && JSON.stringify(f8.inks) === JSON.stringify(['Save to lookbook']) && f8.fb === 'How was this look?', JSON.stringify([f8.bar, f8.inks, f8.fb]));
await page.locator('#sg-fb-dn').click();
await page.waitForTimeout(250);
const fbLine = await page.evaluate(() => ({ ph: document.getElementById('sg-fb-text')?.placeholder, send: document.querySelector('#sg-fb .rb-fb-send')?.textContent, ink: getComputedStyle(document.querySelector('#sg-fb .rb-fb-send')).backgroundColor }));
check('F8 · 2 — thumbs down opens "What would have made it better?" + a hairline Send beneath, no sheet', fbLine.ph === 'What would have made it better?' && fbLine.send === 'Send' && fbLine.ink !== 'rgb(32, 32, 33)', JSON.stringify(fbLine));
await page.fill('#sg-fb-text', 'too sporty');
await page.locator('#sg-fb .rb-fb-send').click();
await page.waitForTimeout(600);
const afterDown = await page.evaluate(() => ({ grid: document.getElementById('rb-lk-grid')?.style.display, tab: document.querySelector('#rb-lk-bar .rb-lk-tab.on')?.textContent, tiles: document.querySelectorAll('#rb-lk-grid [data-sugg]').length, undo: document.getElementById('rb-lk-undo')?.textContent, page: !!document.querySelector('#rb-lk-body .rb-lk-page') }));
check('F8 · 2 — Send removes the look with "Removed · Undo" and returns to Suggested (two tiles left)', afterDown.grid === 'grid' && afterDown.tab === 'Suggested' && afterDown.tiles === 2 && /Removed/.test(afterDown.undo || '') && /Undo/.test(afterDown.undo || '') && !afterDown.page, JSON.stringify(afterDown));
await page.evaluate(() => window.__lkSuggUndo());
await page.waitForTimeout(300);
check('Undo puts the look back whole, nothing written', await page.evaluate(() => document.querySelectorAll('#rb-lk-grid [data-sugg]').length) === 3 && !writes.some((w) => w.method === 'DELETE' && /^looks\?/.test(w.url)));

// 6 · F9 — Edit makes the suggestion a DRAFT in the composer (4d, rows
// live, Discard · Save); Save mints the saved look with its grouping and
// the draft row leaves.
const u2 = await idOf('Urbane Weekend');
await page.evaluate((id) => window.__lkSuggEdit(id), u2);
await page.waitForTimeout(900);
const f9 = await page.evaluate(() => ({
  composer: !!document.querySelector('#sn-page .rb-lk-composer'), kpHost: !!document.querySelector('#kp-build-host .rb-lk-composer'), ey: document.querySelector('.rb-lk-drafty')?.textContent, title: document.getElementById('rb-lk-newtitle')?.value,
  rows: document.querySelectorAll('#sn-page .rbc-rack .rbc-row').length, shop: document.querySelectorAll('#sn-page .rbc-rack .rbc-row.rbc-dashed, #sn-page .rbc-rack .rbc-row[class*="dash"]').length,
  bar: Array.from(document.querySelectorAll('#sn-page .rb-lk-draftbar button:not(.rb-lp-field)')).map((b) => b.textContent.trim()), tryAnother: /Try another/.test(document.querySelector('#sn-page .rb-lk-composer')?.textContent || ''),
  status: JSON.parse(localStorage.getItem('rb_looks__u-test_sugg') || '[]').map((x) => x.name + ':' + x.status).sort(),
  canvas: document.querySelector('#sn-page .rbc-panel img[alt="This look"]')?.getAttribute('src'),
}));
check('F9 · Edit opens the composer (not the kp host) under "Draft · from Robes’ suggestion" — the name, her shorts + the three proposals on the rack, the frame on the canvas, Discard · Save, no Try another',
  f9.composer && !f9.kpHost && f9.ey === 'Draft · from Robes’ suggestion' && f9.title === 'Urbane Weekend' && f9.rows === 4 && JSON.stringify(f9.bar) === JSON.stringify(['Discard', 'Save']) && !f9.tryAnother && f9.canvas === 'https://res.cloudinary.com/demo/way1.jpg', JSON.stringify(f9));
check('F9 · the row is a DRAFT now (it left Suggested)', JSON.stringify(f9.status) === JSON.stringify(['Coffee Run:suggested', 'Park Hangout:suggested', 'Urbane Weekend:draft']) && writes.some((w) => w.method === 'PATCH' && /^looks\?/.test(w.url) && w.body && w.body.status === 'draft'), JSON.stringify(f9.status));
const wb = writes.length;
await page.evaluate(() => window.__lkSaveAsk());
await page.waitForTimeout(250);
await page.locator('#rb-lksave-yes').click();
await page.waitForTimeout(900);
const saved = await page.evaluate(() => ({
  grid: document.getElementById('rb-lk-grid')?.style.display, tab: document.querySelector('#rb-lk-bar .rb-lk-tab.on')?.textContent, count: document.querySelector('#rb-lk-bar .rb-lk-countline')?.textContent,
  card: document.querySelector('#rb-lk-grid .lt-card .lt-title')?.textContent, meta: document.querySelector('#rb-lk-grid .lt-card .lt-meta')?.textContent, ey: document.querySelector('#rb-lk-grid .lt-card .lt-tag')?.textContent,
  sugg: JSON.parse(localStorage.getItem('rb_looks__u-test_sugg') || '[]').map((x) => x.name).sort(), park: localStorage.getItem('rb_lk_draft__u-test'),
}));
const savePost = writes.slice(wb).find((w) => w.method === 'POST' && /^looks\b/.test(w.url) && w.body && w.body.status === 'saved');
const rowDel = writes.slice(wb).find((w) => w.method === 'DELETE' && /^looks\?/.test(w.url));
check('F9 · Save mints the saved look carrying the grouping (anchor, set, slot), the draft row is deleted, the park goes; the Saved tab holds it with "around your shorts"',
  !!savePost && savePost.body.anchor_piece_id === 'w-kp' && savePost.body.set_index === 0 && !!rowDel && saved.grid === 'grid' && saved.tab === 'Saved' && saved.count === '1 look'
    && saved.card === 'Urbane Weekend' && /around your shorts$/.test(saved.meta || '') && saved.ey === undefined && JSON.stringify(saved.sugg) === JSON.stringify(['Coffee Run', 'Park Hangout']) && saved.park == null,
  JSON.stringify({ saved, savePost: savePost && [savePost.body.anchor_piece_id, savePost.body.set_id, savePost.body.set_index], rowDel: !!rowDel }));

// 7 · ↻ — one new look from the same piece, through the kp refine path.
await page.evaluate(() => window.__lkTab('suggested'));
await page.waitForTimeout(300);
const coffee = await idOf('Coffee Run');
await page.evaluate((id) => window.__lkSuggSwap(id), coffee);
await page.waitForTimeout(1200);
const sw = await page.evaluate((id) => { const e = document.querySelector('#rb-lk-grid [data-sugg="' + id + '"]'); return { t: e?.querySelector('.lt-title')?.textContent, m: e?.querySelector('.lt-meta')?.textContent, chip: e?.querySelector('.lt-chip')?.textContent, tiles: document.querySelectorAll('#rb-lk-grid [data-sugg]').length }; }, coffee);
const rb = refineBodies[refineBodies.length - 1];
check('↻ · the row re-writes in place through /api/style refine (wayIndex = its slot, the set\'s other look named, the same key piece) — a new name, the chip while its frame comes, still two tiles',
  sw.t === 'Coffee Run, after dark' && sw.m === 'Around your shorts' && sw.chip === 'Creating her frame…' && sw.tiles === 2
    && rb && rb.wayIndex === 1 && /same key piece/.test(rb.refine || '') && JSON.stringify(rb.current.others) === JSON.stringify(['Park Hangout']) && rb.current.title === 'Coffee Run',
  JSON.stringify([sw, rb && { wayIndex: rb.wayIndex, others: rb.current && rb.current.others, refine: rb.refine }]));
await page.waitForTimeout(3200);
const swFrame = await page.evaluate((id) => { const e = document.querySelector('#rb-lk-grid [data-sugg="' + id + '"]'); return { photo: e?.querySelector('.lt-photo')?.getAttribute('src'), chip: e?.querySelector('.lt-chip')?.textContent }; }, coffee);
check('↻ · the fresh frame lands at the row\'s slot', swFrame.photo === 'https://res.cloudinary.com/demo/way2b.jpg' && !swFrame.chip, JSON.stringify(swFrame));

// 8 · The piece page: "Robes suggested" — the suggestions around this piece,
// the mark dropped (the piece is the page); a tile opens F8 with the piece's
// name on the band, and back reopens the piece.
await page.evaluate(() => window.__rbPieceOpen('w-kp', { from: 'wardrobe' }));
await page.waitForTimeout(600);
const pc = await page.evaluate(() => ({ secs: Array.from(document.querySelectorAll('.rb-pc-sec')).map((e) => e.textContent), rail: Array.from(document.querySelectorAll('.rb-pc-suggrail [data-sugg] .lt-title')).map((e) => e.textContent), marks: document.querySelectorAll('.rb-pc-suggrail .lt-mark').length, btns: document.querySelectorAll('.rb-pc-suggrail .lt-sugbtn').length }));
check('piece page · "Robes suggested" after "In 1 look": the two suggestions around the shorts, no mark, ✕ and ↻ kept',
  pc.secs.indexOf('In 1 look') > -1 && pc.secs.indexOf('Robes suggested') > pc.secs.indexOf('In 1 look') && JSON.stringify(pc.rail.slice().sort()) === JSON.stringify(['Coffee Run, after dark', 'Park Hangout']) && pc.marks === 0 && pc.btns === 4, JSON.stringify(pc));
await page.locator('.rb-pc-suggrail [data-sugg] .lt-card').first().click();
await page.waitForTimeout(500);
const fromPiece = await page.evaluate(() => ({ band: document.querySelector('#rb-lk-body .rb-ret-pill .lab')?.textContent, piece: document.getElementById('rb-piece-page')?.style.display, ey: document.querySelector('#rb-lk-body .rb-lk-eyebrow')?.textContent }));
check('piece page · a tap opens F8 with ‹ Umbro shorts on the band', fromPiece.band === 'Umbro shorts' && fromPiece.piece === 'none' && /^Suggested · around your shorts$/.test(fromPiece.ey || ''), JSON.stringify(fromPiece));
await page.evaluate(() => window.__lkBackDoor());
await page.waitForTimeout(500);
check('piece page · back reopens the piece', await page.evaluate(() => document.getElementById('rb-piece-page')?.style.display !== 'none' && !!document.querySelector('.rb-pc-suggrail')));
await page.evaluate(() => window.__rbPieceHide && window.__rbPieceHide());

// 9 · F6 — nothing suggested: one door, the prompt field.
await page.evaluate(() => window.__rbInspOpen());
await page.waitForTimeout(400);
await page.evaluate(() => { Array.from(document.querySelectorAll('#rb-lk-grid [data-sugg]')).map((e) => e.dataset.sugg).forEach((id) => window.__lkSuggRemove(id)); });
await page.waitForTimeout(300);
const f6 = await page.evaluate(() => ({ none: document.querySelector('#rb-lk-grid .rb-lk-suggnone')?.textContent.replace(/\s+/g, ' ').trim(), field: !!document.querySelector('#rb-lk-grid .rb-lk-suggfield'), count: document.querySelector('#rb-lk-bar .rb-lk-countline')?.textContent, tab: document.querySelector('#rb-lk-bar .rb-lk-tab.on')?.textContent }));
check('F6 · "Nothing suggested yet." + the line + the prompt field; the count row stays (32pt, no jump) but reads nothing at zero',
  /^Nothing suggested yet\.\s*Tell Robes where you’re going, or pick a piece, and it dresses you\./.test(f6.none || '') && f6.field && f6.count === '' && f6.tab === 'Suggested', JSON.stringify(f6));
await page.locator('#rb-lk-grid .rb-lk-suggfield').click();
await page.waitForTimeout(300);
check('F6 · the field opens the fresh box (the + inside it starts from a piece)', await page.evaluate(() => !!document.querySelector('#rb-lp.rb-lp-dock') && document.getElementById('rb-lp-in')?.placeholder === 'A new look for…' && !!document.getElementById('rb-lp-plus')));
await page.evaluate(() => window.__rbLpClose());
check('the suggested journey · no page errors', errs.length === 0, errs.join(' | ').slice(0, 300));

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
  // The + inside the box (2026-10-05): a piece by camera, by upload, or
  // from the wardrobe — then its two modes on the card above the field.
  await p2.evaluate(() => window.__rbNavGo('lookbook'));
  await p2.waitForTimeout(400);
  await p2.evaluate(() => window.__rbHbOpen({ fresh: true }));
  await p2.waitForTimeout(300);
  const menu = await p2.evaluate(() => ({
    plus: !!document.querySelector('#rb-lp .fieldrow #rb-lp-plus'), noSpark: !document.querySelector('#rb-lp .fieldrow .sp'),
    closed: !document.getElementById('rb-lp-plusmenu')?.classList.contains('open'),
    opts: Array.from(document.querySelectorAll('#rb-lp-plusmenu button')).map((b) => b.querySelector('span')?.childNodes[0]?.textContent.trim()),
    camLine: document.querySelector('#rb-lp-plusmenu button .s')?.textContent,
    cam: document.getElementById('rb-lp-cam')?.getAttribute('capture'), file: document.getElementById('rb-lp-file')?.hasAttribute('capture'),
  }));
  check('+ menu · the + sits inside the field (Take a picture · Upload a photo · From wardrobe), the camera row says "Lay the piece flat, in good light.", capture only on the camera input',
    menu.plus && menu.noSpark && menu.closed && menu.opts.join('|') === 'Take a picture|Upload a photo|From wardrobe' && menu.camLine === 'Lay the piece flat, in good light.' && menu.cam === 'environment' && menu.file === false, JSON.stringify(menu));
  // A phone gives a tapped button no focus: the + blurs the field, the
  // blur closer saw nothing focused inside and folded the DOCKED box
  // under her finger (Annie, 2026-10-05). Replay that sequence by hand.
  await p2.evaluate(() => { document.getElementById('rb-lp-in').focus(); });
  await p2.waitForTimeout(80);
  await p2.evaluate(() => {
    const b = document.getElementById('rb-lp-plus');
    b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' }));
    document.getElementById('rb-lp-in').blur();
    document.body.focus();
    window.__rbLpPlus();
  });
  await p2.waitForTimeout(400);
  const plusTap = await p2.evaluate(() => ({ box: !!document.getElementById('rb-lp'), open: !!document.getElementById('rb-lp-plusmenu')?.classList.contains('open') }));
  check('+ menu · opens on tap, and the tap never folds the box (the field blurs, nothing inside holds focus)', plusTap.box && plusTap.open, JSON.stringify(plusTap));
  await p2.locator('#rb-lp-plusmenu button:has-text("From wardrobe")').click();
  await p2.waitForTimeout(250);
  const pick = await p2.evaluate(() => ({
    open: !!document.getElementById('cb-wa-pick'),
    menuClosed: !document.getElementById('rb-lp-plusmenu')?.classList.contains('open'),
    title: document.querySelector('#cb-wa-pick .cb-pick-title')?.textContent.trim(),
    tiles: document.querySelectorAll('#cb-wa-pick .cb-pick-tile').length,
    chips: Array.from(document.querySelectorAll('#cb-wa-pick .cb-pick-cat')).map((b) => b.textContent + (b.classList.contains('on') ? '*' : '')),
    boxStands: !!document.getElementById('rb-lp'),
  }));
  check('+ menu · From wardrobe opens the sheet (#cb-wa-pick) over the box with her pieces and the category chips, All lit',
    pick.open && pick.menuClosed && pick.title === 'From your wardrobe' && pick.tiles === 2 && pick.chips[0] === 'All*' && pick.chips.length === 3 && pick.boxStands, JSON.stringify(pick));
  await p2.locator('#cb-wa-pick .cb-pick-cat:has-text("Tops")').click();
  await p2.waitForTimeout(200);
  check('+ menu · a category chip narrows the sheet in place', await p2.evaluate(() => document.querySelectorAll('#cb-wa-pick .cb-pick-tile').length === 1 && document.querySelector('#cb-wa-pick .cb-pick-cat.on')?.textContent === 'Tops'));
  await p2.locator('#cb-wa-pick .cb-pick-tile').first().click();
  await p2.waitForTimeout(300);
  const attached = await p2.evaluate(() => ({
    pickerGone: !document.getElementById('cb-wa-pick'),
    name: document.querySelector('#rb-lp-piece .nm')?.textContent, sub: document.querySelector('#rb-lp-piece .sb')?.textContent,
    ph: document.getElementById('rb-lp-in')?.placeholder,
    prompt: document.getElementById('cb-ta')?.value || '',
  }));
  check('+ menu · a wardrobe pick attaches on the card (name, "Tops · in your wardrobe"), the note optional, the hidden home card untouched',
    attached.pickerGone && attached.name === 'Cream silk shirt' && attached.sub === 'Tops · in your wardrobe' && attached.ph === 'Where to? Optional' && attached.prompt === '', JSON.stringify(attached));
  // Build a look: the composer with the piece on its rack.
  await p2.locator('#rb-lp-piece .mode', { hasText: 'Build a look' }).click();
  await p2.evaluate(() => window.__rbLpSend());
  await p2.waitForTimeout(900);
  const built = await p2.evaluate(() => ({ boxGone: !document.getElementById('rb-lp'), composer: !!document.querySelector('#sn-page .rb-lk-composer'), onRack: /Cream silk shirt/.test(document.querySelector('#sn-page .rb-lk-composer')?.textContent || ''), styleCalls: 0 }));
  check('+ menu · Build a look hands off to the composer with the piece already on the rack, no /api/style call', built.boxGone && built.composer && built.onRack && stylePrompts.length === 0, JSON.stringify(built));
  await p2.evaluate(() => window.__lkDraftDrop && window.__lkDraftDrop());

  // A NEW upload files quietly behind the card and the card takes its name.
  await p2.evaluate(() => window.__rbNavGo('lookbook'));
  await p2.waitForTimeout(400);
  await p2.evaluate(() => window.__rbHbOpen({ fresh: true }));
  await p2.waitForTimeout(300);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR4nGP8z8DwnwEKGBkYAB1IA/wSCV0LAAAAAElFTkSuQmCC', 'base64');
  await p2.setInputFiles('#rb-lp-file', { name: 'jacket.png', mimeType: 'image/png', buffer: png });
  await p2.waitForTimeout(150);
  const filing = await p2.evaluate(() => ({
    name: document.querySelector('#rb-lp-piece .nm')?.textContent, sub: document.querySelector('#rb-lp-piece .sb')?.textContent,
    photo: !!document.querySelector('#rb-lp-piece .th[style*="data:image"]'),
  }));
  check('scan · the upload lands on the card at once and says Robes will file it', filing.name === 'New piece' && filing.sub === 'Just taken · Robes will file it' && filing.photo, JSON.stringify(filing));
  await p2.waitForTimeout(1800);
  const filed = await p2.evaluate(() => ({
    name: document.querySelector('#rb-lp-piece .nm')?.textContent, sub: document.querySelector('#rb-lp-piece .sb')?.textContent,
  }));
  const rows = writes2.filter((w) => w.method === 'POST' && w.url.startsWith('wardrobe_items'));
  check('scan · the piece is filed (one wardrobe row, analysed + hosted) and the card takes its name',
    filed.name === 'Red tweed jacket' && filed.sub === 'Outerwear · filed to your wardrobe'
      && rows.length === 1 && rows[0].body.label === 'Red tweed jacket' && rows[0].body.category === 'Outerwear' && rows[0].body.category_l2 === 'Jackets'
      && rows[0].body.image_url === 'https://res.cloudinary.com/demo/up.jpg' && rows[0].body.brand === 'Chanel', JSON.stringify({ filed, rows: rows.map((r) => r.body) }));
  await p2.locator('#rb-lp-piece .mode', { hasText: 'Style it three ways' }).click();
  await p2.fill('#rb-lp-in', 'dinner, a little glamour');
  await p2.evaluate(() => window.__rbLpSend());
  await p2.waitForTimeout(700);
  check('scan · the brief leads with the filed piece, her note after it, and carries the photo',
    stylePrompts.length === 1 && stylePrompts[0].prompt === 'Style my Red tweed jacket three ways. dinner, a little glamour' && /^data:image/.test(stylePrompts[0].photo || ''), JSON.stringify(stylePrompts[0] && stylePrompts[0].prompt));

  // A face or a room files nothing, and says so — the looks still run.
  analyseMode = 'none';
  // The send landed on the keep-or-pass deck (F14) — back to the grid.
  await p2.evaluate(() => { window.__lkTab && window.__lkTab('saved'); window.__rbNavGo('lookbook'); });
  await p2.waitForTimeout(400);
  await p2.evaluate(() => window.__rbHbOpen({ fresh: true }));
  await p2.waitForTimeout(300);
  await p2.setInputFiles('#rb-lp-file', { name: 'me.png', mimeType: 'image/png', buffer: png });
  await p2.waitForTimeout(1800);
  const none = await p2.evaluate(() => ({
    sub: document.querySelector('#rb-lp-piece .sb')?.textContent,
    photo: !!document.querySelector('#rb-lp-piece .th[style*="data:image"]'),
  }));
  check('scan · nothing to file says so, keeps the photo for the looks, writes no row',
    /couldn’t see a piece/.test(none.sub || '') && none.photo && writes2.filter((w) => w.method === 'POST' && w.url.startsWith('wardrobe_items')).length === 1, JSON.stringify(none));
  check('+ menu · no page errors', errs2.length === 0, errs2.join(' | '));
  await ctx2.close();
}

let pass = 0, fail = 0;
for (const r of results) { console.log((r.pass ? '  ok  ' : '  FAIL ') + r.name + (r.pass ? '' : '  — ' + r.detail)); r.pass ? pass++ : fail++; }
console.log(`\n${pass}/${pass + fail} checks passed`);
await browser.close();
server.kill();
process.exit(fail ? 1 : 0);
