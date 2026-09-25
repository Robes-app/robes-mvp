#!/usr/bin/env node
/*
 * Onboarding harness — boots the real /onboarding page against a Supabase
 * stub and stubbed generation routes, and asserts the 2026-09-25 flow
 * (design Onboarding_Flow: splash → name → first piece, read live on one
 * page → composing → straight to home) at 1280px and 390px.
 *
 *   npm i --no-save playwright && node scripts/onboarding_harness.mjs
 *   (set CHROME_PATH if playwright's bundled build isn't installed)
 *
 * The rules it exists to protect: a skip must not survive an answer (the
 * skip withdraws once a photo is attached and returns, disarmed, if an
 * unreadable one clears itself); the CTA appears only once the piece is
 * filed and opens the composing screen, never a second /api/style call (the
 * prefire fires the moment the piece files — pinned by counting /api/style);
 * the composing screen ticks the REAL titles and lands on /dashboard with
 * the flag and the handoff written; a shop link files the piece the way a
 * photograph does; there is no Style step anywhere in the flow.
 */
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const PORT = Number(process.env.PORT || 4380);
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const TMP = path.join(process.env.TMPDIR || '/tmp', 'rb_ob_piece.png');
fs.writeFileSync(TMP, PNG);

const srv = http.createServer((q, r) => {
  const u = q.url.split('?')[0];
  // A same-origin stub for /dashboard — the straight-to-dashboard sections
  // assert sessionStorage after navigating there, and a bare 404 gives
  // Chrome's error page an opaque origin that denies the read.
  if (u === '/dashboard') { r.writeHead(200, { 'Content-Type': 'text/html' }); return r.end('<!doctype html><title>dash stub</title>'); }
  if (u === '/piece.png') { r.writeHead(200, { 'Content-Type': 'image/png' }); return r.end(PNG); }
  const f = u === '/onboarding' ? path.join(ROOT, 'onboarding.html') : path.join(ROOT, u);
  if (fs.existsSync(f) && fs.statSync(f).isFile()) { r.writeHead(200); return r.end(fs.readFileSync(f)); }
  r.writeHead(404); r.end('');
});
await new Promise(r => srv.listen(PORT, r));

let fails = 0, passes = 0;
const ok = (c, m) => { if (c) passes++; else { fails++; console.log('  \x1b[31m✗\x1b[0m ' + m); } };
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });

const WAYS = { ways: [{ title: 'Brunch in Bloom' }, { title: 'Cocktails & Culture' }, { title: 'Gallery Hopping' }], jobId: 'x', generatedImages: [] };

// analyse: 'ok' | 'noitem' | 'nocut'  ·  name: a first name on the profile
// row (prefills the name stage), or null (the field opens empty). Lands on
// the name stage; `toPiece()` walks it onto the piece page.
async function open(vp, analyse = 'ok', name = 'Annie', { linkMode = 'ok', styleDelay = 300 } = {}) {
  const ctx = await browser.newContext({ viewport: vp });
  const p = await ctx.newPage();
  const errs = [];
  const styleCalls = [];
  const inserts = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.exposeFunction('__rbInsert', row => { inserts.push(row); });
  await p.addInitScript((nm) => {
    window.supabase = { createClient: () => ({
      auth: {
        getSession: async () => ({ data: { session: { user: { id: 'u1', user_metadata: {} } } } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      },
      from: (t) => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: { first_name: nm, style_icons: [], style_dna: {}, onboarded_at: null } }) }) }),
        update: () => ({ eq: async () => ({}) }),
        insert: async (row) => { if (t === 'wardrobe_items') window.__rbInsert(row); return {}; },
      }),
    }) };
  }, name);
  // Real latency matters: with an instant analyse the noItemDetected path
  // clears the photo before the attached state can be observed at all.
  await p.route('**/api/wardrobe/analyse', async route => {
    await new Promise(r => setTimeout(r, 800));
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(
      analyse === 'noitem' ? { noItemDetected: true } : {
        label: 'Cream blazer', category: 'Outerwear', color: 'Cream', brand: 'Totême',
        item_dna: { display: { editorial_color_name: 'Bone' }, structural_dna: { silhouette_fit: analyse === 'nocut' ? [] : ['Relaxed'] } },
      }) });
  });
  await p.route('**/api/wardrobe/read-url', async route => {
    await new Promise(r => setTimeout(r, 500));
    if (linkMode === 'unreachable') return route.fulfill({ status: 422, contentType: 'application/json', body: '{"error":"unreachable"}' });
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      label: 'Pink barrel-leg jeans', category: 'Bottoms', color: 'Pale pink', brand: 'FRAME', price: 340, currency: 'GBP',
      image_url: 'http://localhost:' + PORT + '/piece.png',
      item_dna: { display: { editorial_color_name: 'Pale pink' }, structural_dna: { silhouette_fit: ['Barrel-leg'] }, source: { kind: 'url', url: 'https://shop.example/jeans', site: 'shop.example' } },
    }) });
  });
  await p.route('**/api/wardrobe/upload', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"url":"http://localhost:' + PORT + '/piece.png"}' }));
  await p.route('**/api/style', async r => {
    styleCalls.push(JSON.parse(r.request().postData() || '{}'));
    await new Promise(res => setTimeout(res, styleDelay));
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(WAYS) });
  });

  await p.goto(`http://localhost:${PORT}/onboarding`);
  await p.waitForTimeout(900);
  await p.click('body'); await p.waitForTimeout(450);          // splash → name
  return { ctx, p, errs, styleCalls, inserts };
}
async function toPiece(p, typeName) {
  if (typeName) await p.fill('#ob-name-input', typeName);
  await p.click('#ob-name-next'); await p.waitForTimeout(450);
}
const segsOn = p => p.locator('.ob-seg.on').count();
const title = async p => (await p.locator('.ob-title').innerText()).replace(/\s+/g, ' ').trim();
const ledger = p => p.locator('.kp-val');
const waitFiled = p => p.waitForSelector('#ob-next', { timeout: 9000 }).then(() => true).catch(() => false);

for (const [label, vp] of [['desktop', { width: 1280, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  console.log(`\n\x1b[1m== ${label} · splash → name (1b) ==\x1b[0m`);
  const { ctx, p, errs, styleCalls, inserts } = await open(vp);
  ok(await p.locator('.dk').count() === 0 && /call you/.test(await title(p)), 'the splash lands on the cream name screen — no intro, no dark stage');
  ok((await p.locator('.ob-eyebrow').innerText()).trim().toLowerCase() === 'hello', 'eyebrow reads Hello');
  ok(await p.locator('#ob-name-input').count() === 1, 'the name stage stands for everyone');
  ok(await p.locator('#ob-back').isHidden(), 'no Back on the name stage — nothing behind it');
  ok((await p.locator('.ob-wm').innerText()).trim().toLowerCase() === 'robes', 'the wordmark sits in the bar');
  ok(await segsOn(p) === 1, 'the three-segment rule: one lit on the name');
  ok((await p.inputValue('#ob-name-input')) === 'Annie', 'a known name is prefilled');
  ok(!(await p.locator('#ob-name-next').isDisabled()), 'Continue is live on the prefilled name');
  const ctaBg = await p.locator('#ob-name-next').evaluate(el => getComputedStyle(el).backgroundColor);
  ok(ctaBg === 'rgb(255, 255, 255)', 'Continue is the hairline pill, never ink — got ' + ctaBg);
  ok(await p.locator('#ob-skip').count() === 0, 'no skip on the name');
  await p.click('#ob-name-next'); await p.waitForTimeout(450);

  console.log(`\n\x1b[1m== ${label} · the first piece, read live on one page (1c) ==\x1b[0m`);
  ok(await title(p) === 'Add your first piece.', 'title');
  ok(await p.locator('.ob-title em').count() === 1, 'title carries the serif-italic accent');
  ok((await p.locator('#kp-eyebrow').textContent()).trim() === 'Annie’s wardrobe', 'the eyebrow is her wardrobe while empty');
  ok(await segsOn(p) === 2, 'two segments lit on the piece');
  ok(!(await p.locator('#ob-back').isHidden()), 'Back stands on the piece');
  const wellStyle = await p.locator('#kp-well').evaluate(el => getComputedStyle(el).borderTopStyle);
  ok(wellStyle === 'dashed' && (await p.locator('.kp-label').innerText()) === 'Your key piece', 'the well is dashed and reads Your key piece');
  ok(await p.locator('#kp-add').count() === 1 && /paste a link from a shop/.test(await p.locator('#kp-linkopen').innerText()), 'Add photo and the shop-link door in the well');
  ok(await ledger(p).count() === 5 && (await ledger(p).allInnerTexts()).every(t => t === 'Awaiting'), 'five ledger rows, all Awaiting');
  ok(await p.locator('#ob-next').count() === 0, 'no CTA before the piece is filed');
  const skip = p.locator('#ob-skip');
  ok(await skip.isVisible(), 'skip visible with nothing attached');
  await skip.click(); await p.waitForTimeout(120);
  ok(/Skip anyway/.test(await skip.innerText()), 'first tap arms the two-tap confirm');
  await p.setInputFiles('#kp-file', TMP); await p.waitForTimeout(350);
  ok(await p.locator('#ob-skip').count() === 0, 'SKIP REMOVED once a photo is attached');
  ok(await p.locator('#ob-wait').count() === 1 && /reading your piece/i.test(await p.locator('#ob-wait').innerText()), 'the wait line reads Robes is reading your piece…');
  ok((await p.locator('#kp-eyebrow').textContent()).trim() === 'Reading', 'the eyebrow reads Reading');
  ok(await p.locator('.kp-scan').count() === 1, 'the scan line passes over the photo');
  ok(await waitFiled(p), 'the piece files and the CTA appears');
  ok(await p.locator('#ob-skip').count() === 0, 'skip still absent once the piece is filed');
  ok((await p.locator('#kp-eyebrow').textContent()).trim() === 'Filed', 'the eyebrow reads Filed');
  ok(await segsOn(p) === 3, 'three segments lit once filed');
  const vals = await ledger(p).allInnerTexts();
  ok(JSON.stringify(vals) === JSON.stringify(['Cream blazer', 'Outerwear', 'Totême', 'Bone', 'Relaxed']), 'the ledger holds the five reads, got ' + JSON.stringify(vals));
  ok(await p.locator('.kp-tag').count() === 4, 'four tags popped onto the photo');
  ok((await p.locator('.kp-banner').innerText()).trim() === 'Cream blazer', 'the filed banner names the piece');
  ok(await p.locator('#kp-retake').count() === 1, 'Retake rides the photo');
  ok((await p.locator('#ob-next').textContent()).trim() === 'Style it three ways →', 'the CTA reads Style it three ways →');
  ok(await p.locator('.ob-footer a, .ob-footer .ob-skip').count() === 0, 'no Edit-the-details link, no skip under the CTA');
  ok(styleCalls.length === 1 && styleCalls[0].prompt === 'Cream blazer', 'the prefire fired the moment the piece filed');
  ok(inserts.length === 1 && inserts[0].label === 'Cream blazer' && /piece\.png$/.test(inserts[0].image_url || ''), 'the wardrobe row landed with its photograph');
  // Back lands on the name stage (prefilled), forward again keeps the piece.
  await p.click('#ob-back'); await p.waitForTimeout(350);
  ok(await p.locator('#ob-name-input').count() === 1 && (await p.inputValue('#ob-name-input')) === 'Annie', 'Back from the piece returns to the name stage, prefilled');
  await p.click('#ob-name-next'); await p.waitForTimeout(450);
  ok((await p.locator('#ob-next').textContent()).trim() === 'Style it three ways →' && await p.locator('.kp-tag').count() === 4, 'the filed piece survives the round trip, tags and all');
  ok(!(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)), 'no horizontal overflow');

  console.log(`\n\x1b[1m== ${label} · composing (1e) → home ==\x1b[0m`);
  let sawDone = false, sawStyle = false;
  const watch = setInterval(() => { p.evaluate(() => ({ d: !!document.querySelector('.done-screen'), s: !!document.querySelector('.ac-card') })).then(v => { if (v.d) sawDone = true; if (v.s) sawStyle = true; }).catch(() => {}); }, 60);
  await p.click('#ob-next'); await p.waitForTimeout(250);
  ok(await p.locator('.ob-compose').count() === 1, 'the CTA opens the composing screen');
  ok(/Composing three looks, Annie\./.test((await p.locator('.ob-compose h2').innerText()).replace(/\s+/g, ' ')), 'it names her');
  ok(await p.locator('.ob-line').count() === 3, 'three lines');
  ok(styleCalls.length === 1, 'the CTA never fires a second /api/style');
  ok(await p.locator('.ob-compose-thumb img').count() === 1, 'her piece sits above the title');
  ok(/Every look borrows the rest until you photograph your own\./.test(await p.locator('.ob-compose-foot').innerText()), 'the honest foot line');
  await p.waitForTimeout(1200);
  const lines = await p.locator('.ob-line .l').allInnerTexts();
  ok(lines[0] === 'Brunch in Bloom', 'the lines take the REAL titles once the looks land, got ' + JSON.stringify(lines));
  ok(await p.locator('.ob-line.done').count() >= 1, 'and tick off one by one');
  await p.waitForURL('**/dashboard', { timeout: 8000 }).catch(() => {});
  clearInterval(watch);
  ok(p.url().endsWith('/dashboard'), 'lands on /dashboard');
  ok(sawDone === false && sawStyle === false, 'no "Welcome in" and no Style step on the way');
  ok((await p.evaluate(() => sessionStorage.getItem('rb_onboarded__u1'))) === '1', 'the per-user onboarded flag landed before navigation');
  const piece = await p.evaluate(() => sessionStorage.getItem('rb_onboard_piece'));
  ok(!!piece && /Cream blazer/.test(piece) && /"cataloged":true/.test(piece), 'the handoff payload rides along, cataloged');
  const styled = await p.evaluate(() => sessionStorage.getItem('rb_onboard_styled'));
  ok(!!styled && /Brunch in Bloom/.test(styled), 'the prefire result rides along for the card');
  ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
  await ctx.close();
}

// No name on file: the same stages, the field empty and Continue gated.
console.log('\n\x1b[1m== the name stage · no name on file ==\x1b[0m');
{
  const { ctx, p, errs } = await open({ width: 1280, height: 900 }, 'ok', null);
  ok(await p.locator('#ob-name-input').count() === 1 && (await p.inputValue('#ob-name-input')) === '', 'the splash lands on the name stage, empty');
  ok(await p.locator('#ob-name-next').isDisabled(), 'Continue waits for a name');
  await p.fill('#ob-name-input', 'Mary'); await p.click('#ob-name-next'); await p.waitForTimeout(450);
  ok((await p.locator('#kp-eyebrow').textContent()).trim() === 'Mary’s wardrobe', 'the name lands on the piece page, in her name');
  await p.click('#ob-back'); await p.waitForTimeout(350);
  ok(await p.locator('#ob-name-input').count() === 1 && (await p.inputValue('#ob-name-input')) === 'Mary', 'Back returns to the name she typed');
  ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
  await ctx.close();
}

// An unreadable piece clears its own photo — the skip must come back, disarmed.
console.log('\n\x1b[1m== unreadable piece ==\x1b[0m');
{
  const { ctx, p, errs } = await open({ width: 1280, height: 900 }, 'noitem');
  await toPiece(p);
  await p.locator('#ob-skip').click(); await p.waitForTimeout(120);            // arm it first
  await p.setInputFiles('#kp-file', TMP); await p.waitForTimeout(350);
  ok(await p.locator('#ob-skip').count() === 0, 'skip removed while the photo is being read');
  await p.waitForTimeout(1400);
  ok(await p.locator('#ob-skip').isVisible(), 'skip RETURNS when an unreadable photo clears itself');
  ok((await p.locator('#ob-skip').innerText()).trim() === 'Skip for now', 'and it returns DISARMED');
  ok(/couldn’t find a piece/.test(await p.locator('#kp-err').innerText()), 'the error names it');
  ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
  await ctx.close();
}

// No silhouette read → the Cut row falls back to a dash, never "Read".
console.log('\n\x1b[1m== the Cut row with nothing read ==\x1b[0m');
{
  const { ctx, p, errs } = await open({ width: 1280, height: 900 }, 'nocut');
  await toPiece(p);
  await p.setInputFiles('#kp-file', TMP);
  await waitFiled(p);
  const cut = await ledger(p).nth(4).innerText();
  ok(cut.trim() === '—', 'the Cut ledger row reads — when no silhouette lands, got ' + cut);
  ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
  await ctx.close();
}

// A shop link files the piece the way a photograph does: the page's
// photograph in the well, the read in the ledger, the row with its image,
// the prefire carrying the photograph as a data URL.
console.log('\n\x1b[1m== paste a link from a shop ==\x1b[0m');
{
  const { ctx, p, errs, styleCalls, inserts } = await open({ width: 390, height: 844 });
  await toPiece(p);
  await p.click('#kp-linkopen'); await p.waitForTimeout(150);
  ok(await p.locator('#kp-link').count() === 1 && await p.locator('#kp-linkback').count() === 1, 'the link field opens in the well, with a way back to the photograph');
  ok(await p.locator('#ob-skip').isVisible(), 'skip still stands — nothing answered yet');
  await p.fill('#kp-link', 'not a link'); await p.click('#kp-linkgo'); await p.waitForTimeout(150);
  ok(/full address/.test(await p.locator('#kp-err').innerText()), 'a bad address is named inline, nothing sent');
  await p.fill('#kp-link', 'https://shop.example/jeans'); await p.click('#kp-linkgo'); await p.waitForTimeout(200);
  ok(await p.locator('#ob-wait').count() === 1 && await p.locator('.kp-scan').count() === 1, 'reading the page: the scan line and the wait line');
  ok(await waitFiled(p), 'the page files as a piece');
  const vals = await ledger(p).allInnerTexts();
  ok(vals[0] === 'Pink barrel-leg jeans' && vals[2] === 'FRAME' && vals[4] === 'Barrel-leg', 'the ledger holds the page read, got ' + JSON.stringify(vals));
  ok(/piece\.png/.test(await p.locator('.kp-img img').getAttribute('src') || ''), 'the page’s photograph fills the well');
  ok(inserts.length === 1 && /piece\.png$/.test(inserts[0].image_url || '') && inserts[0].item_dna && inserts[0].item_dna.source && inserts[0].item_dna.source.kind === 'url', 'the row carries the hosted image and its source');
  ok(styleCalls.length === 1 && styleCalls[0].prompt === 'Pink barrel-leg jeans' && /^data:image/.test(styleCalls[0].photo || ''), 'the prefire carries the photograph as a data URL');
  ok((await p.locator('#ob-next').textContent()).trim() === 'Style it three ways →', 'the CTA stands');
  ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
  await ctx.close();
}
{
  const { ctx, p, errs } = await open({ width: 1280, height: 900 }, 'ok', 'Annie', { linkMode: 'unreachable' });
  await toPiece(p);
  await p.click('#kp-linkopen'); await p.fill('#kp-link', 'https://shop.example/jeans'); await p.click('#kp-linkgo');
  await p.waitForTimeout(900);
  ok(/wouldn’t open for Robes/.test(await p.locator('#kp-err').innerText()), 'a shop that shuts the door is named, the field kept');
  ok(await p.locator('#kp-link').count() === 1 && (await p.inputValue('#kp-link')) === 'https://shop.example/jeans', 'her link stays in the field');
  ok(await p.locator('#ob-skip').isVisible(), 'skip returns with nothing filed');
  ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
  await ctx.close();
}

// A deliberate double skip on the piece lands straight on the dashboard —
// nothing composes, so no composing screen, no prefire, no Style step.
console.log('\n\x1b[1m== skipping through ==\x1b[0m');
{
  const { ctx, p, errs, styleCalls } = await open({ width: 1280, height: 900 });
  await toPiece(p);
  const skip = p.locator('#ob-skip');
  await skip.click(); await p.waitForTimeout(120);              // arm
  await skip.click();
  await p.waitForURL('**/dashboard', { timeout: 6000 }).catch(() => {});
  ok(p.url().endsWith('/dashboard'), 'a double skip lands on /dashboard');
  ok(styleCalls.length === 0, 'nothing prefired without a piece');
  ok((await p.evaluate(() => sessionStorage.getItem('rb_onboarded__u1'))) === '1', 'the onboarded flag landed');
  ok((await p.evaluate(() => sessionStorage.getItem('rb_onboard_piece'))) === null, 'no handoff without a piece');
  ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
  await ctx.close();
}

console.log(`\n${passes} passed, ${fails} failed`);
await browser.close(); srv.close();
process.exit(fails ? 1 : 0);
