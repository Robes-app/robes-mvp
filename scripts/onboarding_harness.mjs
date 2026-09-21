#!/usr/bin/env node
/*
 * Onboarding harness — boots the real /onboarding page against a Supabase
 * stub and stubbed generation routes, and asserts the slice 7 order (the
 * folded-name intro → step 01 Wardrobe → step 02 Style, while the looks
 * compose) at 1280px and 390px.
 *
 *   npm i --no-save playwright && node scripts/onboarding_harness.mjs
 *   (set CHROME_PATH if playwright's bundled build isn't installed)
 *
 * The rule it exists to protect: a skip must not survive an answer. Step 01
 * withdraws it once an archetype is picked OR an icon is chosen, step 02 once
 * a photo is attached, and BOTH give it back — disarmed — if she empties the
 * answer again. The Style step also pins: descriptors print only on a
 * selected card, and the pool seeds from her picked archetypes. The prefire
 * fires on the piece, before the Style step — pinned by counting /api/style.
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
  // A same-origin stub for /dashboard — the straight-to-dashboard section
  // asserts sessionStorage after navigating there, and a bare 404 gives
  // Chrome's error page an opaque origin that denies the read.
  if (u === '/dashboard') { r.writeHead(200, { 'Content-Type': 'text/html' }); return r.end('<!doctype html><title>dash stub</title>'); }
  const f = u === '/onboarding' ? path.join(ROOT, 'onboarding.html') : path.join(ROOT, u);
  if (fs.existsSync(f) && fs.statSync(f).isFile()) { r.writeHead(200); return r.end(fs.readFileSync(f)); }
  r.writeHead(404); r.end('');
});
await new Promise(r => srv.listen(PORT, r));

let fails = 0, passes = 0;
const ok = (c, m) => { if (c) passes++; else { fails++; console.log('  \x1b[31m✗\x1b[0m ' + m); } };
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });

// analyse: 'ok' | 'noitem' | 'nocut'  ·  name: a first name on the profile row
// (prefills the name stage), or null (the field opens empty). Lands on the
// intro; `toStep0()` walks Begin → the name stage → step 01.
async function open(vp, analyse = 'ok', name = 'Annie') {
  const ctx = await browser.newContext({ viewport: vp });
  const p = await ctx.newPage();
  const errs = [];
  const styleCalls = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript((nm) => {
    window.supabase = { createClient: () => ({
      auth: {
        getSession: async () => ({ data: { session: { user: { id: 'u1', user_metadata: {} } } } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      },
      from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: { first_name: nm, style_icons: [], onboarded_at: null } }) }) }),
        update: () => ({ eq: async () => ({}) }), insert: async () => ({}),
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
  await p.route('**/api/wardrobe/upload', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"url":"http://localhost:' + PORT + '/images/robes-icon-64.png"}' }));
  await p.route('**/api/style', r => { styleCalls.push(JSON.parse(r.request().postData() || '{}')); r.fulfill({ status: 200, contentType: 'application/json', body: '{"ways":[],"jobId":"x"}' }); });

  await p.goto(`http://localhost:${PORT}/onboarding`);
  await p.waitForTimeout(900);
  await p.click('body'); await p.waitForTimeout(450);          // splash → intro
  return { ctx, p, errs, styleCalls };
}
// From the intro onto step 01 — Begin, then the name stage for everyone
// (Splash → Intro → Name, restored 2026-09-21). A known name is prefilled,
// so Continue is live without typing; `typeName` overrides it.
async function toStep0(p, typeName) {
  await p.click('#ob-begin'); await p.waitForTimeout(350);
  if (typeName) await p.fill('#ob-name-input', typeName);
  await p.click('#ob-name-next'); await p.waitForTimeout(450);
}
const stepChip = async p => (await p.locator('.ob-step').innerText()).trim().toLowerCase();

for (const [label, vp] of [['desktop', { width: 1280, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  console.log(`\n\x1b[1m== ${label} · splash → intro → name ==\x1b[0m`);
  const { ctx, p, errs, styleCalls } = await open(vp);
  const skip = p.locator('#ob-skip');
  ok(/One piece\./.test(await p.locator('.dk-heading').innerText()) && /Three ways/.test(await p.locator('.dk-heading em').innerText()), 'the promise reads "One piece. Three ways to wear it."');
  ok((await p.locator('#ob-begin').textContent()).trim() === 'Begin', 'the intro CTA reads Begin — no name on it');
  ok(await p.locator('#ob-notme').count() === 0, 'no "Not …?" door on the intro');
  await p.click('#ob-begin'); await p.waitForTimeout(350);
  ok(await p.locator('#ob-name-input').count() === 1, 'Begin opens the name stage for everyone');
  ok((await p.inputValue('#ob-name-input')) === 'Annie', 'a known name is prefilled');
  ok(!(await p.locator('#ob-name-next').isDisabled()), 'Continue is live on the prefilled name');
  await p.click('#ob-name-next'); await p.waitForTimeout(450);

  console.log(`\n\x1b[1m== ${label} · step 01 · Wardrobe (the piece first) ==\x1b[0m`);
  ok(await stepChip(p) === 'step 01 · wardrobe', 'step chip is Wardrobe, first');
  ok((await p.locator('.ob-eyebrow').innerText()).trim().toLowerCase() === 'wardrobe', 'eyebrow mirrors the step section word');
  ok((await p.locator('.ob-title').innerText()).trim() === 'Add your first piece.', 'title');
  ok(await p.locator('.ob-title em').count() === 1, 'title carries the serif-italic accent');
  ok(/Give Robes one piece you love/.test(await p.locator('.ob-sub').innerText()), 'anchoring sub copy');
  ok(await p.locator('.ob-count').count() === 0, 'no step count in the top bar');
  ok(await skip.isVisible(), 'skip visible with nothing attached');
  await skip.click(); await p.waitForTimeout(120);
  ok(/Skip anyway/.test(await skip.innerText()), 'first tap arms the two-tap confirm');
  await p.setInputFiles('#kp-file', TMP); await p.waitForTimeout(400);
  ok(!(await skip.isVisible()), 'SKIP REMOVED once a photo is attached');
  await p.waitForFunction(() => { const v = document.querySelectorAll('#ob-zone .cap-read-val')[4]; return v && !/Reading|Awaiting/.test(v.textContent); }, null, { timeout: 8000 }).catch(() => {});
  ok(!(await skip.isVisible()), 'skip still removed once the piece is filed');
  ok(styleCalls.length === 1 && styleCalls[0].prompt === 'Cream blazer', 'the prefire fired the moment the piece filed — before the Style step');
  const cut = await p.locator('#ob-zone .cap-read-val').nth(4).innerText();
  ok(cut.trim() === 'Relaxed', 'the Cut ledger row reads the silhouette, got ' + cut);
  ok((await p.locator('#ob-next').textContent()).trim() === 'Continue', 'the filed CTA reads Continue — the Style step is next, not the dashboard');
  // Back lands on the name stage (prefilled), forward again.
  await p.click('#ob-back'); await p.waitForTimeout(350);
  ok(await p.locator('#ob-name-input').count() === 1 && (await p.inputValue('#ob-name-input')) === 'Annie', 'Back from step 01 returns to the name stage, prefilled');
  await p.click('#ob-name-next'); await p.waitForTimeout(450);
  ok((await p.locator('#ob-next').textContent()).trim() === 'Continue' && !(await skip.isVisible()), 'the filed piece survives the round trip');

  console.log(`\n\x1b[1m== ${label} · step 02 · Style (while the looks compose) ==\x1b[0m`);
  await p.click('#ob-next'); await p.waitForTimeout(500);
  ok(await stepChip(p) === 'step 02 · style', 'step chip is Style, second');
  ok(/^While Robes composes your three looks — where does your/.test((await p.locator('.ob-title').innerText()).replace(/\s+/g, ' ')), 'title says the looks are composing');
  ok(await p.locator('.ob-title em').count() === 1, 'title keeps the serif-italic accent');
  ok((await p.locator('.ob-eyebrow').innerText()).trim().toLowerCase() === 'style', 'eyebrow');
  ok((await p.locator('#ob-next').textContent()).trim() === 'Continue to your dashboard', 'the last step names the dashboard');
  ok(await p.locator('.ac-card').count() === 10, 'ten archetype cards');
  ok(await p.locator('.ac-card.on').count() === 0, 'nothing selected at boot');
  ok(await p.locator('.ac-desc').count() === 0, 'descriptors print ONLY on a selected card');
  ok((await p.locator('.ic-refine-head .ob-label').innerText()).toLowerCase() === 'icons and brands', 'icons demoted to the refinement label');
  const rb = await p.locator('.ic-refine').evaluate(el => getComputedStyle(el).borderTopStyle);
  ok(rb === 'solid', 'refinement sits behind a hairline, got ' + rb);
  ok(await p.getAttribute('#ic-input', 'placeholder') === 'Add the people and brands whose style inspire you', 'empty placeholder carries the invite copy');
  ok((await p.locator('#ic-tally').innerText()) === '', 'tally empty at zero');
  ok((await p.locator('.v1-pool-head .ob-label').innerText()).toLowerCase() === 'or tap a popular one', 'pool label');
  ok(await p.locator('#ic-pool .chip-ghost').count() === 10, 'pool shows 10');
  ok((await p.locator('#ic-pool .chip-ghost .chip-plus').first().innerText()) === '+', 'pool chips carry +');
  ok(await p.locator('.v1-hint').isVisible(), 'Enter hint reads at both widths');
  const bs = await p.locator('#ic-field').evaluate(el => getComputedStyle(el).borderTopStyle);
  ok(bs === 'solid', 'field renders its hairline (token cycle regression), got ' + bs);
  ok(await skip.isVisible(), 'skip visible with nothing selected');

  await p.locator('.ac-card').first().click(); await p.waitForTimeout(150);
  ok(await p.locator('.ac-card.on').count() === 1, 'card takes the selected state');
  ok(/Clean lines/.test(await p.locator('.ac-card.on .ac-desc').innerText()), 'selected card prints its full descriptor');
  ok((await p.locator('.ac-card.on .ac-mark').innerText()).trim() === '✓', 'selected card carries the check');
  ok(!(await skip.isVisible()), 'SKIP REMOVED once an archetype is picked');
  ok((await p.locator('#ic-pool .chip-ghost').first().innerText()).includes('The Row'), 'pool seeds from the picked archetype');
  await p.locator('.ac-card.on').click(); await p.waitForTimeout(150);
  ok(await p.locator('.ac-card.on').count() === 0, 'second tap clears the pick');
  ok(await p.locator('.ac-desc').count() === 0, 'descriptor withdraws with it');
  ok(await skip.isVisible(), 'skip RETURNS when the pick is cleared');

  await p.locator('#ic-pool .chip-ghost').first().click(); await p.waitForTimeout(150);
  ok(await p.locator('#ic-field .chip-solid').count() === 1, 'chip lands INSIDE the field');
  const chipBg = await p.locator('#ic-field .chip-solid').first().evaluate(el => getComputedStyle(el).backgroundColor);
  ok(chipBg === 'rgb(243, 239, 230)', 'token wears the warm selected fill, not ink — got ' + chipBg);
  ok(await p.getAttribute('#ic-input', 'placeholder') === 'Add another…', 'placeholder flips');
  ok((await p.locator('#ic-tally').innerText()) === '1 added', 'tally reads 1 added');
  ok(!(await skip.isVisible()), 'SKIP REMOVED once an icon is selected');
  await p.fill('#ic-input', 'Some Designer'); await p.keyboard.press('Enter'); await p.waitForTimeout(120);
  ok(await p.locator('#ic-field .chip-solid').count() === 2, 'typed name adds a chip');
  await p.click('#ic-input'); await p.keyboard.press('Backspace'); await p.waitForTimeout(120);
  ok(await p.locator('#ic-field .chip-solid').count() === 1, 'backspace takes the last chip back');
  await p.locator('.ac-card').nth(1).click(); await p.waitForTimeout(120);
  await p.locator('.chip-x').first().click(); await p.waitForTimeout(150);
  ok(!(await skip.isVisible()), 'skip stays away while the OTHER axis still answers');
  await p.locator('.ac-card.on').click(); await p.waitForTimeout(150);
  ok(await skip.isVisible(), 'skip RETURNS when both answers are emptied');
  ok(!(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)), 'no horizontal overflow');

  // Back to the piece: still filed, still Continue.
  await p.click('#ob-back'); await p.waitForTimeout(400);
  ok(await stepChip(p) === 'step 01 · wardrobe' && (await p.locator('#ob-next').textContent()).trim() === 'Continue', 'Back from Style lands on the filed piece');
  await p.click('#ob-next'); await p.waitForTimeout(400);

  // Continue from the last step: straight onto the dashboard, the flag and
  // the handoff landing first, no "Welcome in" on the way.
  await p.locator('.ac-card').first().click(); await p.waitForTimeout(120);
  let sawDone = false;
  const watch = setInterval(() => { p.evaluate(() => !!document.querySelector('.done-screen')).then(v => { if (v) sawDone = true; }).catch(() => {}); }, 60);
  await p.click('#ob-next');
  await p.waitForURL('**/dashboard', { timeout: 6000 }).catch(() => {});
  clearInterval(watch);
  ok(p.url().endsWith('/dashboard'), 'Continue from Style lands on /dashboard');
  ok(sawDone === false, 'no intermediary "Welcome in" screen on the way');
  ok((await p.evaluate(() => sessionStorage.getItem('rb_onboarded__u1'))) === '1', 'the per-user onboarded flag landed before navigation');
  const piece = await p.evaluate(() => sessionStorage.getItem('rb_onboard_piece'));
  ok(!!piece && /Cream blazer/.test(piece), 'the handoff payload rides along');
  ok(styleCalls.length === 1, 'the prefire fired exactly once');
  ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
  await ctx.close();
}

// No name on file: the same stages, the field empty and Continue gated.
console.log('\n\x1b[1m== the name stage · no name on file ==\x1b[0m');
{
  const { ctx, p, errs } = await open({ width: 1280, height: 900 }, 'ok', null);
  ok((await p.locator('#ob-begin').textContent()).trim() === 'Begin', 'no name on file → Begin');
  await p.click('#ob-begin'); await p.waitForTimeout(350);
  ok(await p.locator('#ob-name-input').count() === 1 && (await p.inputValue('#ob-name-input')) === '', 'Begin opens the name stage, empty');
  ok(await p.locator('#ob-name-next').isDisabled(), 'Continue waits for a name');
  await p.fill('#ob-name-input', 'Mary'); await p.click('#ob-name-next'); await p.waitForTimeout(450);
  ok(await stepChip(p) === 'step 01 · wardrobe', 'the name lands on step 01 · Wardrobe');
  await p.click('#ob-back'); await p.waitForTimeout(350);
  ok(await p.locator('#ob-name-input').count() === 1 && (await p.inputValue('#ob-name-input')) === 'Mary', 'Back from step 01 returns to the name stage she typed in');
  ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
  await ctx.close();
}
{
  const { ctx, p, errs } = await open({ width: 390, height: 844 });
  await toStep0(p, 'Anne');
  ok(await stepChip(p) === 'step 01 · wardrobe', 'a corrected name lands on step 01');
  ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
  await ctx.close();
}

// An unreadable piece clears its own photo — the skip must come back, disarmed.
console.log('\n\x1b[1m== unreadable piece ==\x1b[0m');
{
  const { ctx, p, errs } = await open({ width: 1280, height: 900 }, 'noitem');
  await toStep0(p);
  const skip = p.locator('#ob-skip');
  await skip.click(); await p.waitForTimeout(120);            // arm it first
  await p.setInputFiles('#kp-file', TMP); await p.waitForTimeout(400);
  ok(!(await skip.isVisible()), 'skip removed while the photo is being read');
  await p.waitForTimeout(1400);
  ok(await skip.isVisible(), 'skip RETURNS when an unreadable photo clears itself');
  ok((await skip.innerText()).trim() === 'Skip for now', 'and it returns DISARMED');
  ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
  await ctx.close();
}

// No silhouette read → the Cut row falls back to a dash, never "Read".
console.log('\n\x1b[1m== the Cut row with nothing read ==\x1b[0m');
{
  const { ctx, p, errs } = await open({ width: 1280, height: 900 }, 'nocut');
  await toStep0(p);
  await p.setInputFiles('#kp-file', TMP);
  await p.waitForFunction(() => { const v = document.querySelectorAll('#ob-zone .cap-read-val')[4]; return v && !/Reading|Awaiting/.test(v.textContent); }, null, { timeout: 8000 }).catch(() => {});
  const cut = await p.locator('#ob-zone .cap-read-val').nth(4).innerText();
  ok(cut.trim() === '—', 'the Cut ledger row reads — when no silhouette lands, got ' + cut);
  ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
  await ctx.close();
}

// A deliberate double skip on the piece walks on to the Style step (its
// title makes no composing claim — nothing is composing) and a skip there
// lands on the dashboard with the flag set.
console.log('\n\x1b[1m== skipping through ==\x1b[0m');
{
  const { ctx, p, errs, styleCalls } = await open({ width: 1280, height: 900 });
  await toStep0(p);
  const skip = p.locator('#ob-skip');
  await skip.click(); await p.waitForTimeout(120);              // arm
  await skip.click(); await p.waitForTimeout(450);              // skip anyway → Style
  ok(await stepChip(p) === 'step 02 · style', 'a double skip on the piece lands on the Style step');
  ok(/^Where does your/.test((await p.locator('.ob-title').innerText()).replace(/\s+/g, ' ')), 'with no piece filed the title makes no composing claim');
  ok(styleCalls.length === 0, 'nothing prefired without a piece');
  await skip.click();
  await p.waitForURL('**/dashboard', { timeout: 6000 }).catch(() => {});
  ok(p.url().endsWith('/dashboard'), 'a skip on the last step lands on /dashboard');
  ok((await p.evaluate(() => sessionStorage.getItem('rb_onboarded__u1'))) === '1', 'the onboarded flag landed');
  ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
  await ctx.close();
}

console.log(`\n${passes} passed, ${fails} failed`);
await browser.close(); srv.close();
process.exit(fails ? 1 : 0);
