#!/usr/bin/env node
/*
 * Style Notes → Your Model harness — boots the real /stylenotes against a
 * Supabase stub and asserts the single-entry model page (design 2026-08-25
 * + the photographed-model iteration 2026-09-01): two photograph steps, the
 * PHOTOGRAPHED model stage (the actual avatar cell, fetched via
 * /api/avatar/cell), keep-after-close-up-alone, the presence row (gender
 * lives here now, not in Account details), the by-hand path with no
 * photographs, the male catalog (m-… ids), the adjust sheet, the
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
    ok((await p.locator('.chapter-h1').first().innerText()).includes('Two photographs'), 'h1 reads Two photographs / One model');
    ok(await p.locator('#st1-result').isHidden(), 'no colour result yet');
    ok(await p.locator('#st2-result').isHidden(), 'no line result yet');
    ok(await p.locator('#mv-step2.dim').count() === 1, 'step 02 dims until the close-up reads');
    ok(await p.locator('#st2-btn.ghost').count() === 1, 'step 02 button is the ghost');
    ok((await p.locator('#st2-hint').innerText()) === 'After your close-up.', 'step 02 hint waits on the close-up');
    ok(await p.locator('#mv-fig-empty').isVisible(), 'figure carries the it-starts line');
    ok((await p.locator('#mv-fig').getAttribute('opacity')) === '0.22', 'figure is ghosted');
    ok(await p.locator('.mv-photo').count() === 0, 'no model photograph before anything exists');
    ok(cellPosts.length === 0, 'no cell request before anything exists');
    ok((await p.locator('#mv-fact-harmony').innerText()) === 'Reading', 'harmony fact pending');
    ok((await p.locator('#mv-status').innerText()) === 'Nothing yet.', 'status is Nothing yet');
    ok(await p.locator('#mv-keep').isHidden(), 'no Keep her before any read or choice');
    ok(await p.locator('#mv-adjust').isVisible(), 'the by-hand door is open even before a read (2026-09-01)');
    ok((await p.locator('#mv-adjust').innerText()) === 'Shape your model by hand', 'and reads Shape your model by hand');
    ok(await p.locator('#colour-sections').isHidden() && await p.locator('#sil-sections').isHidden(), 'full notes stay behind their doors');
    ok(await p.locator('#view-taste').isHidden(), 'taste view is not on this page');
    ok(!(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)), 'no horizontal overflow');
    ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
    await ctx.close();
  }

  console.log(`\n\x1b[1m== ${label} · close-up read — keep her on colour ALONE ==\x1b[0m`);
  {
    const { ctx, p, errs, cellPosts } = await open(vp, 'colour');
    ok(await p.locator('#st1-read').isVisible(), 'step 01 shows ✓ Read');
    // THE STAGE IS THE PHOTOGRAPH (2026-09-01): the actual catalog cell
    ok(await p.waitForSelector('.mv-photo', { timeout: 5000 }).then(() => true).catch(() => false), 'the model photograph lands on the stage');
    ok(/model-cell\.jpg/.test(await p.locator('.mv-photo').getAttribute('src') || ''), 'and it is the cell the endpoint served');
    ok(cellPosts.length > 0 && cellPosts[0] === 'w-s5-h1-nt', 'the cell asked for matches the resolved id, got ' + cellPosts[0]);
    ok((await p.locator('#mv-caption').innerText()) === 'Sand · espresso hair', 'the stage caption names her colouring, got ' + await p.locator('#mv-caption').innerText());
    ok(/keep her/i.test(await p.locator('#mv-keep').innerText()), 'the keep pill speaks as she does');
    ok((await p.locator('#st1-season').innerText()) === 'Soft Autumn', 'harmony names the season');
    ok(await p.locator('#st1-sw div').count() === 9, 'nine swatches in the reduced strip');
    ok((await p.locator('#st1-undertone').innerText()) === 'Neutral', 'undertone fact');
    ok(await p.locator('#mv-step2.dim').count() === 0, 'step 02 undims');
    ok(await p.locator('#st2-btn.ghost').count() === 0, 'step 02 button darkens');
    ok((await p.locator('#st2-hint').innerText()) === 'This is what gives her your line.', 'step 02 hint flips');
    ok((await p.locator('#mv-fig').getAttribute('opacity')) === '1', 'figure comes alive');
    ok((await p.locator('#mv-hair').getAttribute('fill')) === '#3A2A20', 'hair proposed from her extracted hair hex');
    const skin = await p.locator('#mv-head').getAttribute('fill');
    ok(skin === '#D0A47F', 'skin proposed from her extracted skin hex, got ' + skin);
    ok((await p.locator('#mv-fact-harmony').innerText()) === 'Soft Autumn', 'harmony fact fills');
    ok((await p.locator('#mv-fact-line').innerText()) === 'Reading', 'line fact still pending');
    ok(/one more photograph/i.test(await p.locator('#mv-status').innerText()), 'status invites the second photo');
    ok(await p.locator('#mv-keep').isVisible(), 'KEEP HER IS LIVE ON THE CLOSE-UP ALONE (decision 2026-08-25)');
    ok(await p.locator('#mv-adjust').isVisible(), 'Not quite her? is live');

    // the quiet door to the full colour notes
    await p.locator('#st1-door').click(); await p.waitForTimeout(200);
    ok(await p.locator('#colour-sections').isVisible(), 'colour door opens the full notes');
    ok(await p.locator('#palette-grid .g-6 div').count() === 18, 'full palette holds all eighteen');
    await p.locator('#st1-door').click(); await p.waitForTimeout(100);
    ok(await p.locator('#colour-sections').isHidden(), 'door closes again');

    // keep her → persists + saved state
    await p.locator('#mv-keep').click(); await p.waitForTimeout(200);
    ok(await p.locator('#mv-savedrow').isVisible(), '✓ Saved shows');
    ok(await p.locator('#mv-keep').isHidden(), 'Keep her retires once kept');
    ok(/on file/i.test(await p.locator('#mv-status').innerText()), 'status flips to on-file');
    const up = await p.evaluate(() => window.__updates.find(u => u.avatar_id));
    ok(!!up, 'keep writes avatar_id + prefs to the profile');
    ok(up && /^w-s5-h1-nt$/.test(up.avatar_id), 'avatar_id encodes the cell (neutral figure, no line yet), got ' + (up && up.avatar_id));
    ok(up && up.avatar_prefs && up.avatar_prefs.kept === true, 'prefs carry kept:true');
    const ls = await p.evaluate(() => localStorage.getItem('rb_model__u1'));
    ok(!!ls && JSON.parse(ls).kept === true, 'localStorage cache holds the model');
    ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
    await ctx.close();
  }

  console.log(`\n\x1b[1m== ${label} · both read — this is her + adjust sheet ==\x1b[0m`);
  {
    const { ctx, p, errs } = await open(vp, 'both');
    ok(await p.locator('#st2-read').isVisible(), 'step 02 shows ✓ Read');
    ok((await p.locator('#st2-line').innerText()) === 'Hourglass', 'line names the archetype');
    ok((await p.locator('#mv-fact-line').innerText()) === 'Hourglass', 'line fact fills');
    ok(/This is her\./.test(await p.locator('#mv-status').innerText()), 'status reads This is her');

    await p.locator('#st2-door').click(); await p.waitForTimeout(200);
    ok(await p.locator('#sil-sections').isVisible(), 'line door opens the full line notes');
    ok(await p.locator('#trait-grid .trait-row').count() === 2, 'traits render inside the notes');
    await p.locator('#st2-door').click();

    await p.locator('#mv-adjust').click(); await p.waitForTimeout(200);
    ok(await p.locator('#mv-sheet-wrap').isVisible(), 'adjust sheet opens');
    ok(await p.locator('#mvs-presence button').count() === 3, 'presence row: Woman / Man / Prefer not to say (moved from Account details)');
    ok(await p.locator('#mvs-presence button.on').count() === 1 && (await p.locator('#mvs-presence button.on').innerText()) === 'Woman', 'presence defaults to the profile value');
    ok(await p.locator('#mvs-skins button').count() === 8, 'eight skin tones');
    ok(await p.locator('#mvs-hairs button').count() === 5, 'five hair colours');
    ok(await p.locator('#mvs-nudges .mvs-nrow').count() === 2, 'TWO nudge pairs only (Longer/Shorter cut, decision 2026-08-25)');
    ok(!/Longer|Shorter/.test(await p.locator('#mvs-nudges').innerText()), 'no length nudge anywhere');
    ok(/save her/i.test(await p.locator('#mv-sheet-save').innerText()), 'the sheet save pill speaks as she does');

    await p.locator('#mvs-skins button').first().click(); await p.waitForTimeout(150);
    ok((await p.locator('#mv-head').getAttribute('fill')) === '#3B2A22', 'picking a skin repaints the figure live');
    const before = await p.locator('#mv-dress').getAttribute('points');
    await p.locator('#mvs-nudges .mvs-nrow[data-key="frame"] button[data-v="R"]').click(); await p.waitForTimeout(150);
    ok((await p.locator('#mv-dress').getAttribute('points')) !== before, 'a nudge redraws her figure');
    await p.locator('#mv-sheet-save').click(); await p.waitForTimeout(200);
    ok(await p.locator('#mv-sheet-wrap').isHidden(), 'Save her closes the sheet');
    ok(await p.locator('#mv-savedrow').isVisible(), 'and keeps her');
    const up = await p.evaluate(() => window.__updates.filter(u => u.avatar_id).pop());
    ok(up && /^w-s0-h1-hg-fr$/.test(up.avatar_id), 'avatar_id carries her picks + figure + nudge, got ' + (up && up.avatar_id));
    ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
    await ctx.close();
  }

  console.log(`\n\x1b[1m== ${label} · presence — the male catalog ==\x1b[0m`);
  {
    const { ctx, p, errs, cellPosts } = await open(vp, 'colour');
    await p.locator('#mv-adjust').click(); await p.waitForTimeout(200);
    await p.locator('#mvs-presence button[data-v="man"]').click(); await p.waitForTimeout(250);
    const gup = await p.evaluate(() => window.__updates.find(u => u.gender_identity));
    ok(gup && gup.gender_identity === 'man', 'picking Man writes gender_identity IMMEDIATELY (identity, not styling)');
    ok(/save him/i.test(await p.locator('#mv-sheet-save').innerText()), 'the sheet save pill flips to Save him');
    await p.locator('#mv-sheet-save').click(); await p.waitForTimeout(400);
    ok((await p.locator('#mv-status').innerText()).includes('He’s on file'), 'the status speaks as he does');
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
    await p.locator('#mv-adjust').click(); await p.waitForTimeout(200);
    ok(await p.locator('#mv-sheet-wrap').isVisible(), 'the sheet opens with nothing read');
    await p.locator('#mvs-skins button').first().click(); await p.waitForTimeout(200);
    ok(await p.locator('#mv-keep').isVisible(), 'a hand-shaped model becomes keepable without any photograph');
    ok(/Shaped by hand/.test(await p.locator('#mv-status').innerText()), 'the status says shaped by hand');
    await p.locator('#mv-sheet-save').click(); await p.waitForTimeout(300);
    const up = await p.evaluate(() => window.__updates.filter(u => u.avatar_id).pop());
    ok(up && /^w-s0-h1-nt$/.test(up.avatar_id), 'the by-hand keep writes a neutral-figure cell, got ' + (up && up.avatar_id));
    ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
    await ctx.close();
  }

  console.log(`\n\x1b[1m== ${label} · kept model reloads + pre-migration degrade ==\x1b[0m`);
  {
    const { ctx, p, errs } = await open(vp, 'kept');
    ok(await p.locator('#mv-savedrow').isVisible(), 'a kept model reopens saved');
    ok((await p.locator('#mv-head').getAttribute('fill')) === '#7A5238', 'her chosen skin wins over the proposal');
    ok((await p.locator('#mv-hair').getAttribute('fill')) === '#1B1614', 'her chosen hair wins');
    ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
    await ctx.close();
  }
  {
    const { ctx, p, errs } = await open(vp, 'colour', 'nocol');
    await p.locator('#mv-keep').click(); await p.waitForTimeout(200);
    ok(await p.locator('#mv-savedrow').isVisible(), 'keep still lands locally when migration 20 is missing');
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
    ok(await p.locator('#mv-keep').isVisible(), 'Keep her arrives with it');
    ok(await p.locator('#mv-step2.dim').count() === 0, 'step 02 undims after the fresh read');
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

// mobile-only: the rail compacts into a header card ABOVE the steps
{
  console.log('\n\x1b[1m== mobile · the model card leads the page ==\x1b[0m');
  const { ctx, p } = await open({ width: 390, height: 844 }, 'colour');
  const railY = (await p.locator('.mv-rail').boundingBox()).y;
  const stepY = (await p.locator('#mv-step1').boundingBox()).y;
  ok(railY < stepY, 'model card sits above the steps on mobile');
  const fig = await p.locator('#mv-figframe').boundingBox();
  ok(fig.width < 120, 'figure compacts to the small card, got ' + Math.round(fig.width));
  await ctx.close();
}

console.log(`\n\x1b[1m${passes} passed, ${fails} failed\x1b[0m`);
await browser.close();
srv.close();
process.exit(fails ? 1 : 0);
