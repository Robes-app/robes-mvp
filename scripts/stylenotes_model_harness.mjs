#!/usr/bin/env node
/*
 * Style Notes → Your Model harness — boots the real /stylenotes against a
 * Supabase stub and asserts the single-entry model page (design 2026-08-25
 * + the photographed-model iteration 2026-09-01): two photograph steps, the
 * PHOTOGRAPHED model stage (the actual avatar cell, fetched via
 * /api/avatar/cell), auto-file + the Build-a-look footer, the presence row (gender
 * lives here now, not in Account details), the by-hand path with no
 * photographs, the male catalog (m-… ids), the on-page spec rows, the
 * full-notes doors, Taste & budget as its own #taste entry, and the
 * pre-migration degrade.
 *
 *   npm i --no-save playwright && node scripts/stylenotes_model_harness.mjs
 *   (set CHROME_PATH if playwright's bundled build isn't installed)
 */
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const PORT = Number(process.env.PORT || 4382);
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const TMP = path.join(process.env.TMPDIR || '/tmp', 'rb_sn_photo.png');
fs.writeFileSync(TMP, PNG);

const srv = http.createServer((q, r) => {
  const u = q.url.split('?')[0];
  if (u === '/dashboard') { r.writeHead(200, { 'Content-Type': 'text/html' }); return r.end('<html><body>dash</body></html>'); }
  const f = u === '/stylenotes' ? path.join(ROOT, 'stylenotes.html') : path.join(ROOT, u);
  if (fs.existsSync(f) && fs.statSync(f).isFile()) { r.writeHead(200); return r.end(fs.readFileSync(f)); }
  r.writeHead(404); r.end('');
});
await new Promise(r => srv.listen(PORT, r));

let fails = 0, passes = 0;
const ok = (c, m) => { if (c) passes++; else { fails++; console.log('  \x1b[31m✗\x1b[0m ' + m); } };
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });

const COLOUR = {
  season: 'Soft Autumn', undertone: 'Neutral', contrast: 'Low, blended',
  summary: 'Rich, muted, beautifully grounded.',
  undertone_note: 'A warm-leaning neutral.', avoid_note: 'Too sharp for you.', metals_note: 'Brushed gold.',
  palette: Array.from({ length: 18 }, (_, i) => '#8A6' + String(100 + i).slice(-3)),
  neutrals: [{ name: 'Oat', hex: '#E4D8C3' }], best_colours: [{ name: 'Sage', hex: '#7F8B5C' }],
  avoid_colours: [{ name: 'Fuchsia', hex: '#FF1493' }], metals: [{ name: 'Gold', hexes: ['#C9AE86', '#B0713F', '#8A6A4C'] }],
};
const COLOUR_DNA = {
  archetype_name: 'Soft Autumn', verified_undertone: 'Neutral-Warm', calculated_contrast: 'Low',
  extracted_values: { skin_tone_hex: '#D2A57F', hair_color_hex: '#3A2A20', eye_color_hex: '#6B4A2E' },
};
const SIL = {
  body_type: 'Hourglass', summary: 'Shoulders and hips aligned, waist defined.',
  traits: ['Defined waist', 'Balanced frame'],
  dress_silhouettes: [{ name: 'Wrap', note: 'Follows the waist.' }],
  neckline_recommendations: ['V-neck'], styling_tips: ['Belt at the natural waist'],
};
const SIL_DNA = { body_type: 'Hourglass', geometric_ratios: { shoulder_to_waist: 1.35, hip_to_waist: 1.32, shoulder_to_hip: 1.02 } };

// profile: 'empty' | 'colour' | 'both' | 'kept'   updateMode: 'ok' | 'nocol'
async function open(vp, profile = 'empty', updateMode = 'ok', hash = '') {
  const ctx = await browser.newContext({ viewport: vp });
  const p = await ctx.newPage();
  const errs = [];
  const cellPosts = [];
  p.on('pageerror', e => errs.push(String(e)));
  // the CDN copy must never overwrite the stub
  await p.route('**cdn.jsdelivr.net/**', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '/* stubbed */' }));
  // the photographed model: the cell endpoint answers instantly with a
  // hosted URL, and the "Cloudinary" image itself is a 1px PNG
  await p.route('**/api/avatar/cell', r => {
    cellPosts.push(r.request().postDataJSON().avatarId);
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url: 'https://res.cloudinary.com/x/image/upload/model-cell.jpg' }) });
  });
  await p.route('**res.cloudinary.com/**', r => r.fulfill({ status: 200, contentType: 'image/png', body: PNG }));
  await p.route('**nominatim.openstreetmap.org/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await p.route('**api.open-meteo.com/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await p.route('**/api/stylenotes/analyse', async route => {
    const kind = route.request().postDataJSON().kind;
    await new Promise(r => setTimeout(r, 200));
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(
      kind === 'colour' ? { ...COLOUR, style_dna: COLOUR_DNA } : { ...SIL, style_dna: SIL_DNA }) });
  });
  await p.route('**/api/wardrobe/upload', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"url":"https://res.cloudinary.com/x/image/upload/p.jpg"}' }));
  await p.addInitScript(({ profile, updateMode, COLOUR, COLOUR_DNA, SIL, SIL_DNA }) => {
    const row = { id: 'u1', first_name: 'Annie' };
    if (profile === 'colour' || profile === 'both' || profile === 'kept') {
      row.colour_analysis = COLOUR;
      row.style_dna = { color_harmony: COLOUR_DNA };
      row.season = 'Soft Autumn';
    }
    if (profile === 'both' || profile === 'kept') {
      row.silhouette_analysis = SIL;
      row.style_dna = { ...row.style_dna, silhouette_proportions: SIL_DNA };
    }
    if (profile === 'kept') row.avatar_prefs = { skin: 2, hair: 0, nudges: {}, kept: true, v: 1 };
    window.__updates = [];
    window.supabase = { createClient: () => ({
      auth: {
        getSession: async () => ({ data: { session: { user: { id: 'u1' } } } }),
        signOut: async () => ({}),
      },
      from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: row }) }) }),
        update: (patch) => ({ eq: async () => {
          window.__updates.push(patch);
          if (updateMode === 'nocol' && (patch.avatar_id !== undefined || patch.avatar_prefs !== undefined)) {
            return { error: { message: "Could not find the 'avatar_id' column of 'profiles' in the schema cache" } };
          }
          return { error: null };
        } }),
      }),
    }) };
  }, { profile, updateMode, COLOUR, COLOUR_DNA, SIL, SIL_DNA });
  await p.goto(`http://localhost:${PORT}/stylenotes${hash}`);   // hash may carry a ?query too
  await p.waitForTimeout(600);
  return { ctx, p, errs, cellPosts };
}

for (const [label, vp] of [['desktop', { width: 1280, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {

  console.log(`\n\x1b[1m== ${label} · empty profile — nothing read yet ==\x1b[0m`);
  {
    const { ctx, p, errs, cellPosts } = await open(vp);
    ok(/your model/i.test(await p.locator('.mv2-title').innerText()), 'the one header names the page');
    ok(/two photographs\. one model\./i.test(await p.locator('.mv2-pagehead .mv2-note').innerText()), 'with the note on the same row');
    ok(await p.locator('#st1-result').isHidden(), 'no colour read section yet');
    ok(await p.locator('#st2-result').isHidden(), 'no line read section yet');
    ok(await p.locator('#st1-guide').isVisible() && await p.locator('#st2-guide').isVisible(), 'both likeness slots carry their guides');
    ok(await p.locator('#st1-readline').isHidden() && await p.locator('#st2-readline').isHidden(), 'no read lines yet');
    ok(await p.locator('#mv-fig-empty').isVisible(), 'the stage carries the it-starts line');
    ok((await p.locator('#mv-fig').getAttribute('opacity')) === '0.22', 'the ghost figure is ghosted');
    ok(await p.locator('.mv-photo').count() === 0, 'no model photograph before anything exists');
    ok(cellPosts.length === 0, 'no cell request before anything exists');
    ok(await p.locator('#mv-stagehead').isHidden(), 'no stage eyebrow/caption before anything exists');
    ok((await p.locator('#mv-fact-harmony').innerText()) === 'Not read yet', 'harmony fact reads Not read yet');
    ok(/^Nothing yet\./.test(await p.locator('#mv-status').innerText()), 'the foot note starts at Nothing yet');
    ok(await p.locator('#mv-build').isHidden(), 'no Build a look pill before any read or choice');
    ok(await p.locator('#mv-filed').isHidden(), 'nothing filed yet — no ✓ line');
    ok(!(await p.evaluate(() => window.__updates.some(u => u.avatar_id))), 'and nothing auto-files from an empty page');
    // THE BY-HAND PATH IS THE PAGE while nothing has read (design 1a/2a)
    ok(/or shape her by hand/i.test(await p.locator('#mv-shape-ey').innerText()), 'shape section header invites the by-hand path');
    ok(await p.locator('#mv-shape-rows').isVisible(), 'the spec rows stand OPEN with nothing read');
    ok(await p.locator('#mv-shape-rows .mvr').count() === 5, 'five rows: Presence / Skin / Hair / The line / The frame');
    ok(await p.locator('[data-axis="presence"]').count() === 3, 'presence: Woman / Man / Prefer not to say (moved from Account details)');
    ok(await p.locator('[data-axis="skin"]').count() === 8, 'eight skin tones');
    ok(await p.locator('[data-axis="hair"]').count() === 5, 'five hair colours');
    ok(!/Longer|Shorter/.test(await p.locator('#mv-shape-rows').innerText()), 'no length nudge anywhere (decision 2026-08-25)');
    ok(await p.locator('#mv-adjust').isHidden(), 'the Adjust pill hides on the manual path — controls are already open');
    ok(await p.locator('#colour-sections').isHidden() && await p.locator('#sil-sections').isHidden(), 'full notes stay behind their doors');
    ok(await p.locator('#view-taste').isHidden(), 'taste view is not on this page');
    ok(!(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)), 'no horizontal overflow');
    ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
    await ctx.close();
  }

  console.log(`\n\x1b[1m== ${label} · close-up read — keep her on colour ALONE ==\x1b[0m`);
  {
    const { ctx, p, errs, cellPosts } = await open(vp, 'colour');
    ok(await p.locator('#st1-read').isVisible(), 'the close-up slot shows ✓ Read');
    ok((await p.locator('#st1-readline').innerText()).includes('read from this photograph'), 'the read line sits with the photograph');
    // THE STAGE IS THE PHOTOGRAPH (2026-09-01): the actual catalog cell
    ok(await p.waitForSelector('.mv-photo', { timeout: 5000 }).then(() => true).catch(() => false), 'the model photograph lands on the stage');
    ok(/model-cell\.jpg/.test(await p.locator('.mv-photo').getAttribute('src') || ''), 'and it is the cell the endpoint served');
    ok(cellPosts.length > 0 && cellPosts[0] === 'w-s5-h1-nt', 'the cell asked for matches the resolved id, got ' + cellPosts[0]);
    ok(/part read, part chosen/i.test(await p.locator('#mv-stage-ey').innerText()), 'stage eyebrow names the provenance');
    ok((await p.locator('#mv-caption').innerText()) === 'Sand · espresso brown hair', 'the stage caption names her colouring in colour words');
    ok(/filed/i.test(await p.locator('#mv-filed').innerText()) && /she updates as you change her/i.test(await p.locator('#mv-filed').innerText()), 'the ✓ Filed line speaks as she does');
    ok(/build a look/i.test(await p.locator('#mv-build').innerText()), 'the one ink pill is Build a look');
    ok((await p.locator('#st1-season').innerText()) === 'Soft Autumn', 'the harmony read names the season');
    ok(await p.locator('#st1-sw div').count() === 9, 'nine swatches in the reduced strip');
    ok((await p.locator('#st1-undertone').innerText()) === 'Neutral', 'undertone fact');
    ok((await p.locator('#mv-fact-harmony').innerText()) === 'Soft Autumn', 'harmony fact fills on the stage');
    ok((await p.locator('#mv-fact-line').innerText()) === 'Not read yet', 'line fact still waits');
    ok(/one more photograph/i.test(await p.locator('#mv-status').innerText()), 'the foot note invites the second photo');
    // once Robes has read, the rows fold behind Adjust by hand
    ok(await p.locator('#mv-shape').isHidden(), 'the inline shape section disappears once a photograph has read');
    ok(/adjust by hand/i.test(await p.locator('#mv-adjust').innerText()), 'the Adjust by hand pill is the way back in');
    ok(await p.locator('#mv-adjust svg').count() === 1, 'and carries the sliders glyph');

    // the door slides the full colour notes in as a drawer
    await p.locator('#st1-door').click(); await p.waitForTimeout(400);
    ok(await p.locator('#mv-notes-wrap').isVisible(), 'the colour door opens the notes drawer');
    ok(await p.locator('#colour-sections').isVisible(), 'with the full colour notes inside');
    ok(/colour notes/i.test(await p.locator('#mvn-title').innerText()), 'the drawer titles itself Colour notes');
    ok(/soft autumn/i.test(await p.locator('#mvn-ey').innerText()) && /one of twelve/i.test(await p.locator('#mvn-ey').innerText()), 'the drawer eyebrow carries the harmony name');
    ok(await p.locator('#palette-grid .g-6 div').count() === 18, 'full palette holds all eighteen');
    ok(await p.locator('#st1-result').isVisible(), 'the read card underneath stays put');
    await p.locator('#mvn-close').click(); await p.waitForTimeout(200);
    ok(await p.locator('#mv-notes-wrap').isHidden(), 'the Close pill closes the drawer');

    // AUTO-FILE: a read model files itself — no Keep tap anywhere
    const up = await p.evaluate(() => window.__updates.find(u => u.avatar_id));
    ok(!!up, 'the model auto-files on load — avatar_id + prefs reach the profile with no tap');
    ok(up && /^w-s5-h1-nt$/.test(up.avatar_id), 'avatar_id encodes the cell (neutral figure, no line yet), got ' + (up && up.avatar_id));
    ok(up && up.avatar_prefs && up.avatar_prefs.kept === true, 'prefs carry kept:true');
    const ls = await p.evaluate(() => localStorage.getItem('rb_model__u1'));
    ok(!!ls && JSON.parse(ls).kept === true, 'localStorage cache holds the model');
    // Build a look → back to the homepage prompt box
    await p.locator('#mv-build').click(); await p.waitForTimeout(400);
    ok(/\/dashboard/.test(p.url()), 'Build a look returns to the dashboard, got ' + p.url());
    ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
    await ctx.close();
  }

  console.log(`\n\x1b[1m== ${label} · both read — this is her + adjust by hand ==\x1b[0m`);
  {
    const { ctx, p, errs } = await open(vp, 'both');
    ok(await p.locator('#st2-read').isVisible(), 'the full-length slot shows ✓ Read');
    ok((await p.locator('#st2-line').innerText()) === 'Hourglass', 'the line read names the archetype');
    ok((await p.locator('#mv-fact-line').innerText()) === 'Hourglass', 'line fact fills on the stage');
    ok(/read from your photographs/i.test(await p.locator('#mv-stage-ey').innerText()), 'stage eyebrow: read from your photographs');
    ok(/two photographs read/i.test(await p.locator('#mv-status').innerText()), 'the foot note says she is as close as she gets');

    await p.locator('#st2-door').click(); await p.waitForTimeout(400);
    ok(await p.locator('#mv-notes-wrap').isVisible(), 'the line door opens the notes drawer');
    ok(await p.locator('#sil-sections').isVisible() && await p.locator('#colour-sections').isHidden(), 'holding the line notes alone');
    ok(/line notes/i.test(await p.locator('#mvn-title').innerText()), 'titled Line notes');
    ok(await p.locator('#trait-grid .trait-row').count() === 2, 'traits render inside the drawer');
    await p.locator('#mv-notes-wrap').click({ position: { x: 8, y: 8 } }); await p.waitForTimeout(200);
    ok(await p.locator('#mv-notes-wrap').isHidden(), 'clicking the scrim closes it');

    await p.locator('#mv-adjust').click(); await p.waitForTimeout(400);
    ok(await p.locator('#mv-adjust-wrap').isVisible(), 'Adjust by hand opens the flyout');
    ok(/adjust by hand\./i.test(await p.locator('#mv-adjust-flyout .mvn-title').innerText()), 'titled Adjust by hand.');
    ok(await p.locator('#mvaf-rows .mvr').count() === 5, 'holding the five spec rows');
    ok(/nothing to save/i.test(await p.locator('#mvaf-foot').innerText()), 'the footer says nothing needs saving');
    ok(await p.locator('[data-axis="presence"]').count() === 3 && await p.locator('[data-axis="skin"]').count() === 8 && await p.locator('[data-axis="hair"]').count() === 5, 'presence + skins + hairs all in the rows');
    ok(await p.locator('[data-axis="presence"].on').count() === 1 && /Woman/.test(await p.locator('[data-axis="presence"].on').innerText()), 'presence defaults to the profile value');

    await p.locator('[data-axis="skin"][data-v="0"]').click(); await p.waitForTimeout(200);
    ok((await p.locator('#mv-head').getAttribute('fill')) === '#3B2A22', 'picking a skin repaints the figure live');
    ok(await p.locator('#mv-filed').isVisible(), 'the ✓ Filed line stands — a change auto-files, no re-keep');
    const before = await p.locator('#mv-dress').getAttribute('points');
    await p.locator('[data-axis="frame"][data-v="R"]').click(); await p.waitForTimeout(250);
    ok((await p.locator('#mv-dress').getAttribute('points')) !== before, 'a nudge redraws the figure');
    const up = await p.evaluate(() => window.__updates.filter(u => u.avatar_id).pop());
    ok(up && /^w-s0-h1-hg-fr$/.test(up.avatar_id), 'avatar_id carries her picks + figure + nudge, got ' + (up && up.avatar_id));
    ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
    await ctx.close();
  }

  console.log(`\n\x1b[1m== ${label} · presence — the male catalog ==\x1b[0m`);
  {
    const { ctx, p, errs, cellPosts } = await open(vp, 'colour');
    await p.locator('#mv-adjust').click(); await p.waitForTimeout(200);
    await p.locator('[data-axis="presence"][data-v="man"]').click(); await p.waitForTimeout(250);
    const gup = await p.evaluate(() => window.__updates.find(u => u.gender_identity));
    ok(gup && gup.gender_identity === 'man', 'picking Man writes gender_identity IMMEDIATELY (identity, not styling)');
    ok(/he updates as you change him/i.test(await p.locator('#mv-filed').innerText()), 'the ✓ Filed line speaks as he does');
        ok(/robes read him/i.test(await p.locator('#mvaf-ey').innerText()), 'the flyout eyebrow speaks as he does');
    const up = await p.evaluate(() => window.__updates.filter(u => u.avatar_id).pop());
    ok(up && /^m-s5-h1-nt$/.test(up.avatar_id), 'the pick auto-files onto the MALE catalog (m- prefix), got ' + (up && up.avatar_id));
    ok(up && up.avatar_prefs && up.avatar_prefs.gender === 'man', 'prefs carry the presence');
    await p.waitForTimeout(1100);   // the photo refetch is debounced 900ms
    ok(cellPosts.some(id => /^m-/.test(id)), 'the stage asks for the male cell, got ' + cellPosts.join(', '));
    ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
    await ctx.close();
  }

  console.log(`\n\x1b[1m== ${label} · shaped by hand — no photograph at all ==\x1b[0m`);
  {
    const { ctx, p, errs } = await open(vp);
    ok(await p.locator('#mv-shape-rows').isVisible(), 'the rows stand open with nothing read');
    await p.locator('[data-axis="skin"][data-v="0"]').click(); await p.waitForTimeout(300);
    ok(await p.locator('#mv-build').isVisible(), 'a hand-shaped model earns Build a look without any photograph');
    ok(await p.locator('#mv-filed').isVisible(), 'and files itself on the first pick');
    ok(/Add a photograph whenever you like/.test(await p.locator('#mv-status').innerText()), 'the foot note invites the photograph');
    ok(/chosen by hand/i.test(await p.locator('#mv-stage-ey').innerText()), 'the stage eyebrow says chosen by hand');
    const up = await p.evaluate(() => window.__updates.filter(u => u.avatar_id).pop());
    ok(up && /^w-s0-h1-nt$/.test(up.avatar_id), 'the by-hand pick auto-files a neutral-figure cell, got ' + (up && up.avatar_id));
    ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
    await ctx.close();
  }

  console.log(`\n\x1b[1m== ${label} · kept model reloads + pre-migration degrade ==\x1b[0m`);
  {
    const { ctx, p, errs } = await open(vp, 'kept');
    ok(await p.locator('#mv-filed').isVisible(), 'a filed model reopens with its ✓ Filed line');
    ok((await p.locator('#mv-head').getAttribute('fill')) === '#7A5238', 'her chosen skin wins over the proposal');
    ok((await p.locator('#mv-hair').getAttribute('fill')) === '#1B1614', 'her chosen hair wins');
    ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
    await ctx.close();
  }
  {
    const { ctx, p, errs } = await open(vp, 'colour', 'nocol');
    await p.waitForTimeout(200);
    ok(await p.locator('#mv-filed').isVisible(), 'auto-file still lands locally when migration 20 is missing');
    const ls = await p.evaluate(() => localStorage.getItem('rb_model__u1'));
    ok(!!ls, 'localStorage carries the model pre-migration');
    ok(errs.length === 0, 'no page errors on the degrade: ' + errs.join(' | '));
    await ctx.close();
  }

  console.log(`\n\x1b[1m== ${label} · home's model door (funnel slice 2): ‹ Home, Build a look, lands on the look ==\x1b[0m`);
  {
    const { ctx, p, errs } = await open(vp, 'kept');
    // The dashboard must not boot under the click — a blank page keeps the
    // flags it would otherwise read and clear.
    await p.route('**/dashboard', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>dash</title>' }));
    await p.evaluate(() => { sessionStorage.setItem('rb_model_return', 'home'); sessionStorage.removeItem('rb_lk_draft'); });
    await p.reload(); await p.waitForTimeout(800);
    ok(/home/i.test(await p.locator('.sn-back').innerText()), 'rb_model_return=home with NO parked draft → the back pill reads ‹ Home');
    ok(/build a look/i.test(await p.locator('#mv-build').innerText()), '…and the CTA stays Build a look, not Back to your look');
    await p.locator('#mv-build').click(); await p.waitForTimeout(600);
    const flags = await p.evaluate(() => ({ path: location.pathname, build: sessionStorage.getItem('rb_model_build'), open: sessionStorage.getItem('rb_model_open_look') }));
    ok(flags.path === '/dashboard' && flags.build === '1' && flags.open === '1',
      'Build a look on a FILED model writes rb_model_build + rb_model_open_look and lands on /dashboard, got ' + JSON.stringify(flags));
    ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
    await ctx.close();
  }
  {
    const { ctx, p, errs } = await open(vp, 'kept');
    await p.evaluate(() => { sessionStorage.setItem('rb_model_return', 'home'); sessionStorage.setItem('rb_lk_draft', JSON.stringify({ rows: [], home: true })); });
    await p.reload(); await p.waitForTimeout(800);
    ok(/back to your look/i.test(await p.locator('#mv-build').innerText()), 'a PARKED composer draft still reads Back to your look');
    ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
    await ctx.close();
  }
  {
    const { ctx, p, errs } = await open(vp);
    await p.route('**/dashboard', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>dash</title>' }));
    // Nothing read, nothing filed → shape by hand, then Build a look
    await p.locator('#mv-shape .mvr-dot[data-axis="skin"]').nth(2).click(); await p.waitForTimeout(300);
    const kept = await p.evaluate(() => { try { return JSON.parse(localStorage.getItem('rb_model__u1') || '{}').kept === true; } catch (e) { return false; } });
    await p.locator('#mv-build').click(); await p.waitForTimeout(600);
    const flags = await p.evaluate(() => ({ path: location.pathname, open: sessionStorage.getItem('rb_model_open_look') }));
    ok(kept && flags.path === '/dashboard' && flags.open === '1', 'a hand-shaped model files itself, so Build a look carries rb_model_open_look too, got ' + JSON.stringify([kept, flags]));
    ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
    await ctx.close();
  }

  console.log(`\n\x1b[1m== ${label} · the analyse flow lands on the page ==\x1b[0m`);
  {
    const { ctx, p, errs } = await open(vp);
    await p.setInputFiles('#headshot-file', TMP);
    await p.waitForTimeout(1200);
    ok(await p.locator('#st1-read').isVisible(), 'a fresh close-up read lands ✓ Read');
    ok((await p.locator('#mv-fig').getAttribute('opacity')) === '1', 'the model starts from the fresh read');
    ok(await p.locator('#mv-build').isVisible(), 'the Build a look pill arrives with it');
    ok(await p.locator('#mv-filed').isVisible(), 'and the fresh read auto-files');
    ok(await p.locator('#mv-shape').isHidden(), 'the inline shape section retires after the fresh read');
    const saved = await p.evaluate(() => window.__updates.find(u => u.colour_analysis));
    ok(!!saved && saved.season === 'Soft Autumn', 'the analysis persists to the profile');
    ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
    await ctx.close();
  }

  console.log(`\n\x1b[1m== ${label} · Taste & budget is its own entry ==\x1b[0m`);
  {
    const { ctx, p, errs } = await open(vp, 'empty', 'ok', '#taste');
    ok(await p.locator('#view-taste').isVisible(), '#taste lands on Taste & budget');
    ok(await p.locator('#view-model').isHidden(), 'the model page stands down');
    ok(await p.locator('#tier-rows .tier-row').count() === 5, 'tiers render');
    await p.evaluate(() => { window.location.hash = ''; });
    await p.waitForTimeout(200);
    ok(await p.locator('#view-model').isVisible(), 'clearing the hash returns to the model page');
    ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
    await ctx.close();
  }
  {
    const { ctx, p } = await open(vp, 'colour', 'ok', '#silhouette');
    ok(await p.locator('#view-model').isVisible(), 'legacy #silhouette deep link lands on the model page');
    await ctx.close();
  }
}

// ── Style notes, the chapters (design 2026-09-25, 3a–3g) ──────────────
// /stylenotes?begin=1 is home's door: the intro sheet, 01 Style type as a
// tap-to-react deck, 02 Icons & brands browse-and-search, 03 the model page
// under the chapter chrome, then the summary. Both breakpoints.
for (const [label, vp] of [['desktop', { width: 1280, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  console.log(`\n\x1b[1m== ${label} · the chapters ==\x1b[0m`);
  const { ctx, p, errs } = await open(vp, 'empty', 'ok', '?begin=1');
  await p.waitForTimeout(500);
  ok(await p.locator('#sn-ch-wrap').isVisible(), '?begin=1 opens the chapters');
  ok(!/begin=1/.test(p.url()), 'and the param is stripped');
  ok(/let robes\s+get to know you\./i.test((await p.locator('#sn-ch-wrap h2').innerText()).replace(/\s+/g, ' ')), 'the intro: Let Robes get to know you.');
  ok(await p.locator('#sn-ch-wrap .snc-row').count() === 3, 'three numbered hairline rows');
  const rows = (await p.locator('#sn-ch-wrap .snc-row .t').allInnerTexts()).map(t => t.trim());
  ok(JSON.stringify(rows) === JSON.stringify(['Style type', 'Icons & brands', 'Your model']), 'Style type · Icons & brands · Your model, got ' + JSON.stringify(rows));
  ok(!/minute|estimate|\d+ questions/i.test(await p.locator('#sn-ch-wrap').innerText()), 'no time estimate, no counts');
  const beginBg = await p.locator('#snc-begin').evaluate(el => getComputedStyle(el).backgroundColor);
  ok(beginBg === 'rgb(255, 255, 255)', 'Begin is the hairline pill — got ' + beginBg);
  ok(await p.locator('#snc-later').count() === 1, 'and Later beside it');
  if (vp.width < 768) {
    const fr = await p.locator('#sn-ch-wrap .snc-frame').boundingBox();
    ok(fr.y >= 100, 'on the phone the intro is a sheet from the foot, got y=' + Math.round(fr.y));
  }

  // 01 · the deck
  await p.click('#snc-begin'); await p.waitForTimeout(300);
  ok((await p.locator('#sn-ch-wrap .snc-name').textContent()).trim() === 'Style type', 'chapter 01 chrome: Style type');
  ok(await p.locator('#sn-ch-wrap .snc-seg.on').count() === 1, 'one segment lit');
  ok(/does this\s+feel like you\?/i.test((await p.locator('#sn-ch-wrap .snc-h').innerText()).replace(/\s+/g, ' ')), 'Does this feel like you?');
  ok((await p.locator('#snc-card .name').innerText()) === 'Minimal', 'the deck opens on Minimal');
  ok(await p.locator('#snc-card .tile').count() === 2, 'two tiles do the explaining');
  ok(await p.locator('#snc-card img').count() === 0, 'tone tiles, no photographs (no faces, no marks)');
  ok(/1 of 10/.test(await p.locator('.snc-count').innerText()), 'the count reads 1 of 10');
  const reacts = (await p.locator('.snc-react button').allTextContents()).map(t => t.trim());
  ok(JSON.stringify(reacts) === JSON.stringify(['Not me', 'Sometimes', 'Very me']), 'Not me · Sometimes · Very me, got ' + JSON.stringify(reacts));
  await p.click('.snc-react button[data-v="very"]'); await p.waitForTimeout(300);
  ok((await p.locator('#snc-card .name').innerText()) === 'Bohemian', 'a reaction advances the deck');
  await p.click('.snc-react button[data-v="no"]'); await p.waitForTimeout(300);
  await p.click('.snc-react button[data-v="very"]'); await p.waitForTimeout(300);     // Classic
  await p.click('.snc-react button[data-v="some"]'); await p.waitForTimeout(300);     // Romantic
  // Skip the rest of the deck
  await p.click('#snc-skip'); await p.waitForTimeout(400);
  const dnaUp = await p.evaluate(() => window.__updates.filter(u => u.style_dna).pop());
  ok(!!dnaUp && JSON.stringify(dnaUp.style_dna.style_archetypes) === JSON.stringify(['Minimal', 'Classic'])
    && JSON.stringify(dnaUp.style_dna.style_archetypes_soft) === JSON.stringify(['Romantic']),
    'style_dna carries very-me and sometimes as two lists, got ' + JSON.stringify(dnaUp && dnaUp.style_dna));

  // 02 · icons and brands
  ok((await p.locator('#sn-ch-wrap .snc-name').textContent()).trim() === 'Icons & brands', 'chapter 02 chrome');
  ok(await p.locator('#sn-ch-wrap .snc-seg.on').count() === 2, 'two segments lit');
  ok(/whose taste\s+runs close to yours\?/i.test((await p.locator('#sn-ch-wrap .snc-h').innerText()).replace(/\s+/g, ' ')), 'Whose taste runs close to yours?');
  ok(await p.locator('.snc-tile').count() >= 9, 'a grid of tiles');
  ok(await p.locator('.snc-tile img').count() === 0, 'monogram tiles, no portraits');
  const firstTile = await p.locator('.snc-tile .nm').first().innerText();
  ok(firstTile === 'The Row', 'the pool seeds from her archetypes (Minimal → The Row first), got ' + firstTile);
  ok((await p.locator('.snc-poolhead .k').textContent()).trim() === 'Popular among stylists', 'pool label');
  await p.locator('.snc-tile').first().click(); await p.waitForTimeout(150);
  ok(await p.locator('.snc-tile.on').count() === 1 && (await p.locator('.snc-tile.on .ck').innerText()) === '✓', 'a tapped tile takes the warm state with a ✓');
  const tileBg = await p.locator('.snc-tile.on .im').evaluate(el => getComputedStyle(el).borderColor);
  ok(tileBg === 'rgb(201, 188, 166)', 'the selected border is the app-wide warm one, got ' + tileBg);
  const cont = await p.locator('#snc-cont').boundingBox();
  ok(cont && cont.y + cont.height <= vp.height + 1, 'Continue is pinned on screen');
  // typing swaps the grid for matches in place
  await p.fill('#snc-q', 'Phoe'); await p.waitForTimeout(150);
  ok(await p.locator('.snc-tile').count() === 0 && await p.locator('.snc-resrow[data-v]').count() >= 1, 'typing swaps the grid for matches, no new layer');
  ok((await p.locator('.snc-chip').allInnerTexts()).some(t => /The Row/.test(t)), 'kept names show as chips under the field');
  ok(/Keep “Phoe” as typed/.test(await p.locator('#snc-keep').innerText()), 'Keep as typed for free text');
  await p.locator('.snc-resrow[data-v="Phoebe Philo"]').click(); await p.waitForTimeout(150);
  ok(await p.locator('.snc-resrow[data-v="Phoebe Philo"].on').count() === 1, 'a match toggles on in place');
  await p.fill('#snc-q', 'Some Designer'); await p.keyboard.press('Enter'); await p.waitForTimeout(150);
  ok(await p.locator('.snc-tile').count() >= 9, 'Enter keeps the typed name and returns to the grid');
  await p.click('#snc-cont'); await p.waitForTimeout(400);
  const icUp = await p.evaluate(() => window.__updates.filter(u => u.style_icons).pop());
  ok(!!icUp && JSON.stringify(icUp.style_icons) === JSON.stringify(['The Row', 'Phoebe Philo', 'Some Designer']), 'style_icons carries the three picks, got ' + JSON.stringify(icUp && icUp.style_icons));

  // 03 · the model page under the chapter chrome
  ok(await p.locator('#sn-ch-wrap').isHidden() && await p.locator('#view-model').isVisible(), 'chapter 03 is the model page itself');
  ok(await p.locator('#sn-ch-bar').isVisible(), 'under the chapter chrome');
  ok((await p.locator('#sn-ch-bar .snc-name').textContent()).trim() === 'Your model' && await p.locator('#sn-ch-bar .snc-seg.on').count() === 3, 'Your model · three segments lit');
  ok((await p.locator('#snb-next').innerText()).trim() === 'Skip', 'the right control reads Skip with nothing filed');
  const topbarHidden = await p.locator('.topbar').evaluate(el => getComputedStyle(el).display === 'none');
  ok(vp.width < 768 ? topbarHidden === true : topbarHidden === false, 'the chrome replaces the topbar on the phone only (C17), topbar hidden=' + topbarHidden);
  ok(await p.locator('#mv-shape-rows').isVisible(), 'the by-hand rows stand open beneath, as today');
  // shape her by hand: a pick files the model, the control flips to Next
  await p.locator('[data-axis="skin"]').nth(3).click(); await p.waitForTimeout(300);
  ok((await p.locator('#snb-next').innerText()).trim() === 'Next', 'a filed model turns Skip into Next');
  await p.click('#snb-next'); await p.waitForTimeout(400);

  // the summary
  ok(await p.locator('#sn-ch-wrap').isVisible() && await p.locator('#sn-ch-bar').isHidden(), 'Next opens the summary, the chapter chrome gone');
  ok(/Annie,\s+on paper\./.test((await p.locator('#sn-ch-wrap .snc-h').innerText()).replace(/\s+/g, ' ')), 'Annie, on paper.');
  const sumType = (await p.locator('#snc-r-type .v').innerText()).replace(/\s+/g, ' ').trim();
  ok(sumType === 'Minimal · Classic · Romantic' && await p.locator('#snc-r-type .v em').count() === 1, 'Style type reads very-me then sometimes in italic, got ' + sumType);
  ok(/The Row, Phoebe Philo, Some Designer/.test(await p.locator('#snc-r-icons .v').innerText()), 'Icons & brands lists her picks');
  ok((await p.locator('#snc-r-model .v').innerText()).trim() === 'Shaped by hand', 'Model reads Shaped by hand');
  ok((await p.locator('#snc-create').textContent()).trim() === 'Create a look →' && (await p.locator('#snc-done').textContent()).trim() === 'Done for now', 'Create a look → · Done for now');   // textContent: the CTA is CSS-uppercased
  // a row reopens its chapter
  await p.click('#snc-r-icons'); await p.waitForTimeout(300);
  ok((await p.locator('#sn-ch-wrap .snc-name').textContent()).trim() === 'Icons & brands' && await p.locator('.snc-tile.on').count() >= 1, 'a summary row reopens its chapter with her picks intact');
  await p.click('#snc-cont'); await p.waitForTimeout(300); await p.click('#snb-next'); await p.waitForTimeout(300);
  // Create a look → the homepage prompt
  await p.click('#snc-create');
  await p.waitForURL('**/dashboard', { timeout: 5000 }).catch(() => {});
  ok(p.url().endsWith('/dashboard'), 'Create a look lands on the dashboard');
  const flags = await p.evaluate(() => ({ build: sessionStorage.getItem('rb_model_build'), look: sessionStorage.getItem('rb_model_open_look') }));
  ok(flags.build === '1' && flags.look === null, 'with the prompt flag set and never the look-landing one (C16)');
  ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
  await ctx.close();
}
// A return to ?begin=1 once anything is answered lands on the summary; the
// plain page never opens the chapters; Later from the intro goes home.
{
  console.log('\n\x1b[1m== the chapters · doors ==\x1b[0m');
  const { ctx, p, errs } = await open({ width: 1280, height: 900 }, 'kept', 'ok', '?begin=1');
  await p.waitForTimeout(500);
  ok(await p.locator('#sn-ch-wrap').isVisible() && /on paper\./.test(await p.locator('#sn-ch-wrap').innerText()), 'a filed model → ?begin=1 opens the summary, not the intro');
  ok((await p.locator('#snc-r-model .v').innerText()).trim() === 'Read from your photographs', 'Model reads Read from your photographs');
  await ctx.close();
  const b = await open({ width: 1280, height: 900 }, 'empty');
  ok(await b.p.locator('#sn-ch-wrap').isHidden() && await b.p.locator('#sn-ch-bar').isHidden(), 'the plain page opens no chapter');
  await b.ctx.close();
  const c = await open({ width: 390, height: 844 }, 'empty', 'ok', '?begin=1');
  await c.p.waitForTimeout(400);
  await c.p.click('#snc-later');
  await c.p.waitForURL('**/dashboard', { timeout: 5000 }).catch(() => {});
  ok(c.p.url().endsWith('/dashboard'), 'Later from the intro goes home');
  ok(errs.length === 0 && b.errs.length === 0 && c.errs.length === 0, 'no page errors');
  await c.ctx.close();
}

// mobile-only: the stage leads the page full-width (design 1a)
{
  console.log('\n\x1b[1m== mobile · the stage leads the page ==\x1b[0m');
  const { ctx, p } = await open({ width: 390, height: 844 }, 'colour');
  const stage = await p.locator('.mv2-stage').boundingBox();
  const likY = (await p.locator('#mv-likeness').boundingBox()).y;
  ok(stage.y < likY, 'the stage sits above the likeness slots on mobile');
  ok(stage.width > 300, 'and runs full width, got ' + Math.round(stage.width));
  await ctx.close();
}

// desktop-only: the stage is sticky beside the content
{
  console.log('\n\x1b[1m== desktop · the stage stands beside the content ==\x1b[0m');
  const { ctx, p } = await open({ width: 1280, height: 900 }, 'colour');
  const stage = await p.locator('.mv2-stage').boundingBox();
  const main = await p.locator('.mv2-main').boundingBox();
  ok(stage.x < main.x, 'stage left, content right');
  ok(stage.height > 500, 'the stage is the full-height column, got ' + Math.round(stage.height));
  await ctx.close();
}

console.log(`\n\x1b[1m${passes} passed, ${fails} failed\x1b[0m`);
await browser.close();
srv.close();
process.exit(fails ? 1 : 0);
