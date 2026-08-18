#!/usr/bin/env node
/*
 * Onboarding harness — boots the real /onboarding page against a Supabase
 * stub and stubbed generation routes, and asserts the step 01 (Icons) and
 * step 02 (Wardrobe) rules at 1280px and 390px.
 *
 *   npm i --no-save playwright && node scripts/onboarding_harness.mjs
 *   (set CHROME_PATH if playwright's bundled build isn't installed)
 *
 * The rule it exists to protect: a skip must not survive an answer. Step 01
 * withdraws it once an icon is chosen, step 02 once a photo is attached, and
 * BOTH give it back — disarmed — if she empties the answer again.
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

// analyse: 'ok' | 'noitem'
async function open(vp, analyse = 'ok') {
  const ctx = await browser.newContext({ viewport: vp });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => {
    window.supabase = { createClient: () => ({
      auth: {
        getSession: async () => ({ data: { session: { user: { id: 'u1', user_metadata: {} } } } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      },
      from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: { first_name: 'Annie', style_icons: [], onboarded_at: null } }) }) }),
        update: () => ({ eq: async () => ({}) }), insert: async () => ({}),
      }),
    }) };
  });
  // Real latency matters: with an instant analyse the noItemDetected path
  // clears the photo before the attached state can be observed at all.
  await p.route('**/api/wardrobe/analyse', async route => {
    await new Promise(r => setTimeout(r, 800));
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(
      analyse === 'noitem' ? { noItemDetected: true } : {
        label: 'Cream blazer', category: 'Outerwear', color: 'Cream', brand: 'Totême',
        item_dna: { display: { editorial_color_name: 'Bone' }, structural_dna: { silhouette_fit: ['Relaxed'] } },
      }) });
  });
  await p.route('**/api/wardrobe/upload', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"url":"http://localhost:' + PORT + '/images/robes-icon-64.png"}' }));
  await p.route('**/api/style', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ways":[],"jobId":"x"}' }));

  await p.goto(`http://localhost:${PORT}/onboarding`);
  await p.waitForTimeout(900);
  await p.click('body'); await p.waitForTimeout(350);          // splash
  await p.click('#ob-begin'); await p.waitForTimeout(350);      // intro
  await p.fill('#ob-name-input', 'Annie');
  await p.click('#ob-name-next'); await p.waitForTimeout(450);  // -> step 01
  return { ctx, p, errs };
}

for (const [label, vp] of [['desktop', { width: 1280, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  console.log(`\n\x1b[1m== ${label} · step 01 · Icons ==\x1b[0m`);
  const { ctx, p, errs } = await open(vp);
  const skip = p.locator('#ob-skip');

  ok(/Who do you/.test(await p.locator('.ob-title').innerText()), 'title reads "Who do you dress like?"');
  ok((await p.locator('.ob-eyebrow').innerText()).trim().toLowerCase() === 'style', 'eyebrow');
  ok(await p.getAttribute('#ic-input', 'placeholder') === 'Type a name — person or brand', 'empty placeholder');
  ok((await p.locator('#ic-tally').innerText()) === 'Three is plenty to start', 'empty tally');
  ok(await p.locator('.v1-selected-head').count() === 0, 'no second "Your icons" shelf');
  ok(await p.locator('.v1-divider').count() === 0, 'no divider');
  ok((await p.locator('.v1-pool-head .ob-label').innerText()).toLowerCase() === 'or tap a popular one', 'pool label');
  ok(await p.locator('#ic-pool .chip-ghost').count() === 10, 'pool shows 10');
  ok((await p.locator('#ic-pool .chip-ghost .chip-plus').first().innerText()) === '+', 'pool chips carry +');
  ok(await p.locator('.v1-hint').isVisible(), 'Enter hint reads at both widths');
  // the field must actually have a border — the token cycle once killed every hairline
  const bs = await p.locator('#ic-field').evaluate(el => getComputedStyle(el).borderTopStyle);
  ok(bs === 'solid', 'field renders its hairline (token cycle regression), got ' + bs);
  ok(await skip.isVisible(), 'skip visible at zero icons');

  await p.locator('#ic-pool .chip-ghost').first().click(); await p.waitForTimeout(150);
  ok(await p.locator('#ic-field .chip-solid').count() === 1, 'chip lands INSIDE the field');
  ok(await p.getAttribute('#ic-input', 'placeholder') === 'Add another…', 'placeholder flips');
  ok((await p.locator('#ic-tally').innerText()) === '1 added', 'tally reads 1 added');
  ok(!(await skip.isVisible()), 'SKIP REMOVED once an icon is selected');

  await p.fill('#ic-input', 'Some Designer'); await p.keyboard.press('Enter'); await p.waitForTimeout(120);
  ok(await p.locator('#ic-field .chip-solid').count() === 2, 'typed name adds a chip');
  await p.click('#ic-input'); await p.keyboard.press('Backspace'); await p.waitForTimeout(120);
  ok(await p.locator('#ic-field .chip-solid').count() === 1, 'backspace takes the last chip back');
  await p.locator('.chip-x').first().click(); await p.waitForTimeout(150);
  ok(await skip.isVisible(), 'skip RETURNS when the answer is emptied');
  ok(!(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)), 'no horizontal overflow');

  console.log(`\n\x1b[1m== ${label} · step 02 · Wardrobe ==\x1b[0m`);
  await p.click('#ob-next'); await p.waitForTimeout(500);
  ok((await p.locator('.ob-step').innerText()).trim().toLowerCase() === 'step 02 · wardrobe', 'step chip is Wardrobe');
  ok((await p.locator('.ob-eyebrow').innerText()).trim().toLowerCase() === 'your first piece', 'eyebrow is Your first piece');
  ok((await p.locator('.ob-title').innerText()).trim() === 'Add your first piece', 'title');
  ok(await p.locator('.ob-title em').count() === 0, 'title carries no italic clause');
  ok(/Give Robes one piece you love/.test(await p.locator('.ob-sub').innerText()), 'anchoring sub copy');
  ok(await skip.isVisible(), 'skip visible with nothing attached');

  await skip.click(); await p.waitForTimeout(120);
  ok(/Skip anyway/.test(await skip.innerText()), 'first tap arms the two-tap confirm');
  await p.setInputFiles('#kp-file', TMP); await p.waitForTimeout(400);
  ok(!(await skip.isVisible()), 'SKIP REMOVED once a photo is attached');
  await p.waitForTimeout(2600);
  ok(!(await skip.isVisible()), 'skip still removed once the piece is filed');
  ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
  await ctx.close();
}

// An unreadable piece clears its own photo — the skip must come back, disarmed.
console.log('\n\x1b[1m== unreadable piece ==\x1b[0m');
{
  const { ctx, p, errs } = await open({ width: 1280, height: 900 }, 'noitem');
  const skip = p.locator('#ob-skip');
  await p.click('#ob-next'); await p.waitForTimeout(500);
  await skip.click(); await p.waitForTimeout(120);            // arm it first
  await p.setInputFiles('#kp-file', TMP); await p.waitForTimeout(400);
  ok(!(await skip.isVisible()), 'skip removed while the photo is being read');
  await p.waitForTimeout(1400);
  ok(await skip.isVisible(), 'skip RETURNS when an unreadable photo clears itself');
  ok((await skip.innerText()).trim() === 'Skip for now', 'and it returns DISARMED');
  ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
  await ctx.close();
}

// The "Welcome in" done screen is retired (2026-08-18): filing the piece
// goes STRAIGHT onto the dashboard, and so does a deliberate double skip —
// with the per-user onboarded flag landing before navigation either way.
console.log('\n\x1b[1m== straight to the dashboard ==\x1b[0m');
{
  const { ctx, p, errs } = await open({ width: 1280, height: 900 });
  await p.click('#ob-next'); await p.waitForTimeout(500);       // -> step 02
  await p.setInputFiles('#kp-file', TMP); await p.waitForTimeout(2600);
  let sawDone = false;
  const watch = setInterval(() => { p.evaluate(() => !!document.querySelector('.done-screen')).then(v => { if (v) sawDone = true; }).catch(() => {}); }, 60);
  await p.click('#ob-next');
  await p.waitForURL('**/dashboard', { timeout: 6000 }).catch(() => {});
  clearInterval(watch);
  ok(p.url().endsWith('/dashboard'), 'filing the piece lands on /dashboard');
  ok(sawDone === false, 'no intermediary "Welcome in" screen on the way');
  const flag = await p.evaluate(() => sessionStorage.getItem('rb_onboarded__u1'));
  ok(flag === '1', 'the per-user onboarded flag landed before navigation');
  const piece = await p.evaluate(() => sessionStorage.getItem('rb_onboard_piece'));
  ok(!!piece && /Cream blazer/.test(piece), 'the handoff payload rides along');
  ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
  await ctx.close();
}
{
  const { ctx, p, errs } = await open({ width: 1280, height: 900 });
  await p.click('#ob-next'); await p.waitForTimeout(500);       // -> step 02
  const skip = p.locator('#ob-skip');
  await skip.click(); await p.waitForTimeout(120);              // arm
  await skip.click();                                           // skip anyway
  await p.waitForURL('**/dashboard', { timeout: 6000 }).catch(() => {});
  ok(p.url().endsWith('/dashboard'), 'a deliberate double skip lands on /dashboard');
  ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
  await ctx.close();
}

console.log(`\n${passes} passed, ${fails} failed`);
await browser.close(); srv.close();
process.exit(fails ? 1 : 0);
