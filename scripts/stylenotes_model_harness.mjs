#!/usr/bin/env node
/*
 * Style Notes → Your Model harness — boots the real /stylenotes against a
 * Supabase stub and asserts the single-entry model page (design 2026-08-25
 * + the photographed-model iteration 2026-09-01): two photograph steps, the
 * PHOTOGRAPHED model stage (the actual avatar cell, fetched via
 * /api/avatar/cell), keep-after-close-up-alone, the presence row (gender
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
  await p.goto(`http://localhost:${PORT}/stylenotes${hash}`);
  await p.waitForTimeout(600);
  return { ctx, p, errs, cellPosts };
}

for (const [label, vp] of [['desktop', { width: 1280, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {

  console.log(`\n\x1b[1m== ${label} · empty profile — nothing read yet ==\x1b[0m`);
  {
    const { ctx, p, errs, cellPosts } = await open(vp);
    ok((await p.locator('.chapter-h1').first().innerText()).toLowerCase().includes('your'), 'h1 names the page');
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
    ok(await p.locator('#mv-keep').isHidden(), 'no Keep pill before any read or choice');
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
    ok(/keep her/i.test(await p.locator('#mv-keep').innerText()), 'the keep pill speaks as she does');
    ok((await p.locator('#st1-season').innerText()) === 'Soft Autumn', 'the harmony read names the season');
    ok(await p.locator('#st1-sw div').count() === 9, 'nine swatches in the reduced strip');
    ok((await p.locator('#st1-undertone').innerText()) === 'Neutral', 'undertone fact');
    ok((await p.locator('#mv-fact-harmony').innerText()) === 'Soft Autumn', 'harmony fact fills on the stage');
    ok((await p.locator('#mv-fact-line').innerText()) === 'Not read yet', 'line fact still waits');
    ok(/one more photograph/i.test(await p.locator('#mv-status').innerText()), 'the foot note invites the second photo');
    // once Robes has read, the rows fold behind Adjust by hand
    ok(/robes read her/i.test(await p.locator('#mv-shape-ey').innerText()), 'the shape header flips to Robes read her');
    ok(await p.locator('#mv-shape-rows').isHidden(), 'the spec rows fold away once a photograph has read');
    ok(/adjust by hand/i.test(await p.locator('#mv-adjust').innerText()), 'the Adjust by hand pill is the way back in');
    ok(await p.locator('#mv-adjust svg').count() === 1, 'and carries the sliders glyph');

    // the quiet door to the full colour notes
    await p.locator('#st1-door').click(); await p.waitForTimeout(200);
    ok(await p.locator('#colour-sections').isVisible(), 'colour door opens the full notes');
    ok(await p.locator('#palette-grid .g-6 div').count() === 18, 'full palette holds all eighteen');
    await p.locator('#st1-door').click(); await p.waitForTimeout(100);
    ok(await p.locator('#colour-sections').isHidden(), 'door closes again');

    // keep her → persists + on-file state
    await p.locator('#mv-keep').click(); await p.waitForTimeout(200);
    ok(/on file/i.test(await p.locator('#mv-keep').innerText()), 'the pill flips to ✓ She’s on file');
    ok(/every look you keep/i.test(await p.locator('#mv-status').innerText()), 'the foot note flips to the kept line');
    const up = await p.evaluate(() => window.__updates.find(u => u.avatar_id));
    ok(!!up, 'keep writes avatar_id + prefs to the profile');
    ok(up && /^w-s5-h1-nt$/.test(up.avatar_id), 'avatar_id encodes the cell (neutral figure, no line yet), got ' + (up && up.avatar_id));
    ok(up && up.avatar_prefs && up.avatar_prefs.kept === true, 'prefs carry kept:true');
    const ls = await p.evaluate(() => localStorage.getItem('rb_model__u1'));
    ok(!!ls && JSON.parse(ls).kept === true, 'localStorage cache holds the model');
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

    await p.locator('#st2-door').click(); await p.waitForTimeout(200);
    ok(await p.locator('#sil-sections').isVisible(), 'line door opens the full line notes');
    ok(await p.locator('#trait-grid .trait-row').count() === 2, 'traits render inside the notes');
    await p.locator('#st2-door').click();

    await p.locator('#mv-adjust').click(); await p.waitForTimeout(200);
    ok(await p.locator('#mv-shape-rows').isVisible(), 'Adjust by hand unfolds the spec rows');
    ok(/done adjusting/i.test(await p.locator('#mv-adjust').innerText()), 'and the pill flips to Done adjusting');
    ok(await p.locator('#mv-adjust.on').count() === 1, 'wearing the warm-selected fill while adjusting');
    ok(await p.locator('[data-axis="presence"]').count() === 3 && await p.locator('[data-axis="skin"]').count() === 8 && await p.locator('[data-axis="hair"]').count() === 5, 'presence + skins + hairs all in the rows');
    ok(await p.locator('[data-axis="presence"].on').count() === 1 && /Woman/.test(await p.locator('[data-axis="presence"].on').innerText()), 'presence defaults to the profile value');

    await p.locator('[data-axis="skin"][data-v="0"]').click(); await p.waitForTimeout(150);
    ok((await p.locator('#mv-head').getAttribute('fill')) === '#3B2A22', 'picking a skin repaints the figure live');
    ok(/keep her/i.test(await p.locator('#mv-keep').innerText()), 'a change un-keeps — Keep her stays the one commitment');
    const before = await p.locator('#mv-dress').getAttribute('points');
    await p.locator('[data-axis="frame"][data-v="R"]').click(); await p.waitForTimeout(150);
    ok((await p.locator('#mv-dress').getAttribute('points')) !== before, 'a nudge redraws the figure');
    await p.locator('#mv-keep').click(); await p.waitForTimeout(200);
    ok(/on file/i.test(await p.locator('#mv-keep').innerText()), 'Keep commits the adjusted model');
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
    ok(/keep him/i.test(await p.locator('#mv-keep').innerText()), 'the keep pill flips to Keep him');
    ok(/robes read him/i.test(await p.locator('#mv-shape-ey').innerText()), 'the shape header speaks as he does');
    ok((await p.locator('#mv-lik-ey').innerText()).toLowerCase() === 'his likeness', 'the likeness header follows');
    await p.locator('#mv-keep').click(); await p.waitForTimeout(400);
    ok(/on file/i.test(await p.locator('#mv-keep').innerText()), 'Keep him lands on file');
    const up = await p.evaluate(() => window.__updates.filter(u => u.avatar_id).pop());
    ok(up && /^m-s5-h1-nt$/.test(up.avatar_id), 'avatar_id lands on the MALE catalog (m- prefix), got ' + (up && up.avatar_id));
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
    await p.locator('[data-axis="skin"][data-v="0"]').click(); await p.waitForTimeout(200);
    ok(await p.locator('#mv-keep').isVisible(), 'a hand-shaped model becomes keepable without any photograph');
    ok(/Shaped by hand/.test(await p.locator('#mv-status').innerText()), 'the foot note says shaped by hand');
    ok(/chosen by hand/i.test(await p.locator('#mv-stage-ey').innerText()), 'the stage eyebrow says chosen by hand');
    await p.locator('#mv-keep').click(); await p.waitForTimeout(300);
    const up = await p.evaluate(() => window.__updates.filter(u => u.avatar_id).pop());
    ok(up && /^w-s0-h1-nt$/.test(up.avatar_id), 'the by-hand keep writes a neutral-figure cell, got ' + (up && up.avatar_id));
    ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
    await ctx.close();
  }

  console.log(`\n\x1b[1m== ${label} · kept model reloads + pre-migration degrade ==\x1b[0m`);
  {
    const { ctx, p, errs } = await open(vp, 'kept');
    ok(/on file/i.test(await p.locator('#mv-keep').innerText()), 'a kept model reopens on file');
    ok((await p.locator('#mv-head').getAttribute('fill')) === '#7A5238', 'her chosen skin wins over the proposal');
    ok((await p.locator('#mv-hair').getAttribute('fill')) === '#1B1614', 'her chosen hair wins');
    ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
    await ctx.close();
  }
  {
    const { ctx, p, errs } = await open(vp, 'colour', 'nocol');
    await p.locator('#mv-keep').click(); await p.waitForTimeout(200);
    ok(/on file/i.test(await p.locator('#mv-keep').innerText()), 'keep still lands locally when migration 20 is missing');
    const ls = await p.evaluate(() => localStorage.getItem('rb_model__u1'));
    ok(!!ls, 'localStorage carries the model pre-migration');
    ok(errs.length === 0, 'no page errors on the degrade: ' + errs.join(' | '));
    await ctx.close();
  }

  console.log(`\n\x1b[1m== ${label} · the analyse flow lands on the page ==\x1b[0m`);
  {
    const { ctx, p, errs } = await open(vp);
    await p.setInputFiles('#headshot-file', TMP);
    await p.waitForTimeout(1200);
    ok(await p.locator('#st1-read').isVisible(), 'a fresh close-up read lands ✓ Read');
    ok((await p.locator('#mv-fig').getAttribute('opacity')) === '1', 'the model starts from the fresh read');
    ok(await p.locator('#mv-keep').isVisible(), 'the keep pill arrives with it');
    ok(await p.locator('#mv-shape-rows').isHidden(), 'the spec rows fold away after the fresh read');
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
