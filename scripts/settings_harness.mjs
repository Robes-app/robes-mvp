#!/usr/bin/env node
/*
 * Settings harness — boots the real /settings (the digital twin, design
 * Settings_Prototype.dc.html · 2026-10-07, redlined 2026-10-08 in
 * Settings_Redlines.dc.html) against a Supabase stub and asserts: the ONE
 * 44px header row (← · the title · nothing right) on every screen, no dock,
 * the warm selected tab; the root's title-only cards; the twin page in its
 * empty, read and by-hand states (the slots in place, the model's cell
 * fetched, the caption alone on the stage, Body shape printing the line and
 * frame — never a shape's name, the facts as one strip, Build a look with
 * the italic line); the "Your photographs" sheet (grouped by photograph,
 * the season picker re-rendering the catalog, the read's date on a slot,
 * opened on the tapped section, Done a text link, no scrollbar); the Style
 * DNA page's sheets (the ten types multi-select, the brand + icon walls with
 * search and "+ Add", the four investment rows, the three word lists, no
 * new-from-Robes door); the observations (the draft lands as pending —
 * notes as one sentence with the paragraph behind it, colours as a
 * lower-case sentence, every source line naming the evidence — Keep a
 * hairline pill, Not me a link, Kept before dated, no Read again); the
 * swipe card on the tab; the Account tab (label + value rows, name, email,
 * password, notifications, delete); the legacy doors; the one-time brands
 * split + investment mapping; 390 and 1280.
 *
 *   npm i --no-save playwright && node scripts/settings_harness.mjs
 *   (set CHROME_PATH if playwright's bundled build isn't installed)
 */
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const PORT = Number(process.env.PORT || 4383);
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const TMP = path.join(process.env.TMPDIR || '/tmp', 'rb_sp_photo.png');
fs.writeFileSync(TMP, PNG);

const srv = http.createServer((q, r) => {
  const u = q.url.split('?')[0];
  if (u === '/dashboard' || u === '/lookbook' || u === '/wardrobe' || u === '/') { r.writeHead(200, { 'Content-Type': 'text/html' }); return r.end('<html><body>' + u + '</body></html>'); }
  if (u === '/api/account/delete') { r.writeHead(200, { 'Content-Type': 'application/json' }); return r.end('{"ok":true}'); }
  const f = u === '/settings' ? path.join(ROOT, 'settings.html') : path.join(ROOT, u);
  if (fs.existsSync(f) && fs.statSync(f).isFile()) { r.writeHead(200); return r.end(fs.readFileSync(f)); }
  r.writeHead(404); r.end('');
});
await new Promise(r => srv.listen(PORT, r));

let fails = 0, passes = 0;
const ok = (c, m) => { if (c) passes++; else { fails++; console.log('  \x1b[31m✗\x1b[0m ' + m); } };
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });

const COLOUR = {
  season: 'Soft Autumn', undertone: 'Neutral', contrast: 'Low, blended', summary: 'Rich, muted, beautifully grounded.',
  undertone_note: 'A warm-leaning neutral.', avoid_note: 'Too sharp for you.', metals_note: 'Brushed gold.',
  palette: Array.from({ length: 18 }, (_, i) => '#8A6' + String(100 + i).slice(-3)),
  neutrals: [{ name: 'Oat', hex: '#E4D8C3' }], best_colours: [{ name: 'Sage', hex: '#7F8B5C' }],
  avoid_colours: [{ name: 'Fuchsia', hex: '#FF1493' }], metals: [{ name: 'Gold', hexes: ['#C9AE86', '#B0713F', '#8A6A4C'] }],
};
const COLOUR_DNA = { archetype_name: 'Soft Autumn', verified_undertone: 'Neutral-Warm', calculated_contrast: 'Low', extracted_values: { skin_tone_hex: '#D2A57F', hair_color_hex: '#3A2A20', eye_color_hex: '#6B4A2E' } };
const SIL = { body_type: 'Hourglass', summary: 'Shoulders and hips aligned, waist defined.', traits: ['Defined waist', 'Balanced frame'], dress_silhouettes: [{ name: 'Wrap', note: 'Follows the waist.' }], neckline_recommendations: ['V-neck'], styling_tips: ['Belt at the natural waist'] };
const SIL_DNA = { body_type: 'Hourglass', geometric_ratios: { shoulder_to_waist: 1.35, hip_to_waist: 1.32, shoulder_to_hip: 1.02 } };
const DRAFT = {
  loves: [{ text: 'You reach for a defined waist', because: 'your two most-worn tops sit at the natural waist' }],
  avoids: [{ text: 'Anything that reads polite', because: 'the pieces you never wear are the safest ones' }],
  rules: [{ text: 'Loafers only with a cropped trouser', because: 'every wear of the loafers was with the cropped wool' }],
  notes: 'You dress best when one line runs uninterrupted from shoulder to shoe. Long over lean, one colour, a single hardware note — that is when the pieces you own most read as yours.',
  colours: { loved: ['Black', 'Taupe'], rejected: ['Red'] }, thin: false,
};
const WARDROBE = [
  { id: 'w1', label: 'Black wool blazer', category: 'Outerwear', brand: 'Totême', times_worn: 11, hero_position: 1, image_url: 'https://res.cloudinary.com/x/image/upload/w1.jpg' },
  { id: 'w2', label: 'Ivory silk shirt', category: 'Tops', brand: '', times_worn: 6 },
];

// profile: 'empty' | 'colour' | 'both' | 'full'   extras: { row, draft, path, hash, noNotify, updateMode }
async function open(vp, profile = 'empty', o = {}) {
  const ctx = await browser.newContext({ viewport: vp });
  const p = await ctx.newPage();
  const errs = [], cellPosts = [], briefPosts = [], deletes = [], seasonPosts = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.route('**cdn.jsdelivr.net/**', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '/* stubbed */' }));
  await p.route('**fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await p.route('**/api/avatar/cell', r => { cellPosts.push(r.request().postDataJSON().avatarId); r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url: 'https://res.cloudinary.com/x/image/upload/model-cell.jpg' }) }); });
  await p.route('**res.cloudinary.com/**', r => r.fulfill({ status: 200, contentType: 'image/png', body: PNG }));
  await p.route('**nominatim.openstreetmap.org/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await p.route('**api.open-meteo.com/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await p.route('**/api/stylenotes/analyse', async route => {
    const kind = route.request().postDataJSON().kind;
    await new Promise(r => setTimeout(r, 200));
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(kind === 'colour' ? { ...COLOUR, style_dna: COLOUR_DNA } : { ...SIL, style_dna: SIL_DNA }) });
  });
  await p.route('**/api/wardrobe/upload', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"url":"https://res.cloudinary.com/x/image/upload/p.jpg"}' }));
  await p.route('**/api/stylenotes/season', async route => {
    const b = route.request().postDataJSON(); seasonPosts.push(b);
    await new Promise(r => setTimeout(r, 120));
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...COLOUR, season: b.season, summary: b.season + ', chosen.', style_dna: { ...COLOUR_DNA, archetype_name: b.season, classification: { source: 'chosen' } }, chosen: true }) });
  });
  await p.route('**/api/stylenotes/brief', async route => {
    briefPosts.push(route.request().postDataJSON());
    await new Promise(r => setTimeout(r, 150));
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o.draft || { loves: [], avoids: [], rules: [], notes: '', colours: { loved: [], rejected: [] }, thin: true }) });
  });
  await p.route('**/api/account/delete', r => { deletes.push(r.request().headers()['authorization'] || ''); r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); });
  await p.addInitScript(({ profile, o, COLOUR, COLOUR_DNA, SIL, SIL_DNA, WARDROBE }) => {
    const row = Object.assign({ id: 'u1', first_name: 'Annie', last_name: 'Slattery', notification_prefs: { looks_ready: true, morning_hour: 7 } }, o.row || {});
    if (o.noNotify) delete row.notification_prefs;
    if (profile === 'colour' || profile === 'both' || profile === 'full') { row.colour_analysis = COLOUR; row.style_dna = Object.assign({}, row.style_dna || {}, { color_harmony: COLOUR_DNA }); row.season = 'Soft Autumn'; }
    if (profile === 'both' || profile === 'full') { row.silhouette_analysis = SIL; row.style_dna = Object.assign({}, row.style_dna || {}, { silhouette_proportions: SIL_DNA }); }
    if (profile === 'full') {
      row.avatar_prefs = { skin: 2, hair: 0, nudges: {}, kept: true, v: 2 };
      row.style_dna = Object.assign({}, row.style_dna, { style_archetypes: ['Minimal', 'Classic'], brands: ['The Row', 'Zara'], icon_tags: { 'Jane Birkin': 'French undone' }, investment: '€500–1,500', facts: { height_cm: 168, size_uk: 10, shoe_uk: 5, age_band: '45–54' } });
      row.style_icons = ['Jane Birkin'];
    }
    window.__updates = []; window.__auth = []; window.__events = [];
    window.supabase = { createClient: () => ({
      auth: {
        getSession: async () => ({ data: { session: { user: { id: 'u1', email: 'annie@example.com' }, access_token: 'jwt-u1' } } }),
        signOut: async () => ({}),
        updateUser: async (patch) => { window.__auth.push(patch); return { data: {}, error: null }; },
      },
      from: (table) => ({
        select: () => ({ eq: () => { const list = { data: table === 'wardrobe_items' ? WARDROBE : [] }; return { single: async () => ({ data: row }), then: (res) => res(list) }; } }),
        insert: (rowIn) => { if (table === 'events') window.__events.push(rowIn); return { then: (res) => res({}) }; },
        update: (patch) => ({ eq: async () => {
          window.__updates.push(patch);
          if (o.updateMode === 'nocol' && (patch.avatar_id !== undefined || patch.avatar_prefs !== undefined)) return { error: { message: "Could not find the 'avatar_id' column of 'profiles' in the schema cache" } };
          if (o.updateMode === 'nonotify' && patch.notification_prefs !== undefined) return { error: { message: "Could not find the 'notification_prefs' column of 'profiles' in the schema cache" } };
          return { error: null };
        } }),
      }),
    }) };
  }, { profile, o, COLOUR, COLOUR_DNA, SIL, SIL_DNA, WARDROBE });
  await p.goto(`http://localhost:${PORT}/settings${o.path || ''}${o.hash || ''}`);
  await p.waitForTimeout(600);
  const upd = async (pred) => p.evaluate((src) => { const f = new Function('u', 'return ' + src); return window.__updates.filter(f).pop() || null; }, pred);
  return { ctx, p, errs, cellPosts, briefPosts, deletes, seasonPosts, upd };
}
const txt = async (p, sel) => (await p.locator(sel).innerText()).replace(/\s+/g, ' ').trim();

for (const [label, vp] of [['desktop', { width: 1280, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {

  console.log(`\n\x1b[1m== ${label} · the root — Style Profile | Account ==\x1b[0m`);
  {
    const { ctx, p, errs, briefPosts } = await open(vp);
    ok(await p.locator('#pg-root').isVisible() && await p.locator('#pg-twin').isHidden() && await p.locator('#pg-dna').isHidden() && await p.locator('#pg-obs').isHidden(), 'the root is the page; every other page waits');
    ok((await p.evaluate(() => document.getElementById('sn-back-label').textContent)) === 'Home', 'the header ← reads Home on the root (its label for the screen reader)');
    // G1 · L1 · A2 — ONE header row: ← · Settings · nothing right; no eyebrow, no masthead, no avatar
    const hdr = await p.locator('.topbar').boundingBox();
    ok(Math.round(hdr.height) === 44, 'the header is one 44px row: ' + hdr.height);
    ok((await txt(p, '#sp-hdr-title')) === 'Settings', 'titled Settings, in the header row');
    ok(await p.locator('.topbar .sn-back').isVisible() && (await p.locator('.sn-back').evaluate(el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width >= 44 && r.height >= 44 && s.fontSize === '24px' && s.fontWeight === '300'; })), '← at the left: Inter 300 24px on a 44px hit area');
    ok((await p.locator('#sp-hdr-title').evaluate(el => { const s = getComputedStyle(el); return /Cormorant/.test(s.fontFamily) && s.fontSize === '22px' && s.textAlign === 'center'; })), 'the title centred, Cormorant 22px');
    ok(await p.locator('.sn-avatar, .sn-av-menu, .sn-weather, .wordmark, .eyebrow-rose, .sp-title, #root-title').count() === 0, 'no avatar, no weather, no wordmark, no eyebrow, no serif masthead (the four layers are gone)');
    ok(await p.locator('#rb-dock').count() === 0, 'no mobile dock on the settings stack (G3)');
    ok((await p.locator('#sp-seg button').allInnerTexts()).map(t => t.trim().toLowerCase()).join(' | ') === 'style profile | account', 'the two tabs: Style Profile | Account');
    const segOn = await p.locator('#sp-seg button.on').evaluate(el => { const s = getComputedStyle(el); return s.backgroundColor + ' ' + s.borderTopColor; });
    ok(segOn === 'rgb(243, 239, 230) rgb(201, 188, 166)', 'selected is warm — #F3EFE6 on a #C9BCA6 hairline (G5): ' + segOn);
    ok(await p.locator('#tab-style').isVisible() && await p.locator('#tab-account').isHidden(), 'Style Profile is the tab on open');
    ok(await p.locator('#tab-style .sp-card').count() === 3, 'three cards: the twin, Style DNA, observations');
    ok((await p.locator('#tab-style .sp-card').allInnerTexts()).map(t => t.replace(/\s*›\s*$/, '').trim()).join(' | ') === 'Your digital twin | Style DNA | Robes observations', 'each card prints its title only (G4 · L5)');
    ok(await p.locator('#tab-style .sp-card .k, #tab-style .sp-card .s, #tab-style .sp-card .st').count() === 0, 'no number, no description, no meta line on a card');
    ok(briefPosts.length === 1, 'the Style Profile tab reads her wardrobe once (never read before)');
    ok(await p.locator('#sp-notice').count() === 0, 'no "Robes noticed" card with nothing pending');
    ok(await p.locator('#sh-wrap').isHidden(), 'no sheet open');
    // the account tab
    await p.click('#sp-seg button[data-tab="account"]'); await p.waitForTimeout(200);
    ok(await p.locator('#tab-account').isVisible() && await p.locator('#tab-style').isHidden() && p.url().endsWith('#account'), 'Account shows and the hash follows');
    ok((await txt(p, '#sp-hdr-title')) === 'Settings' && await p.locator('#pg-root .sp-sub, #pg-root .eyebrow-rose').count() === 0, 'the Account tab opens on the same header row and the switch — no masthead (A2)');
    ok((await txt(p, '#ac-name-v')) === 'Annie Slattery' && (await txt(p, '#ac-email-v')) === 'annie@example.com' && (await txt(p, '#ac-pass-v')) === '••••••••', 'the Profile rows carry her name, email and a masked password');
    ok(await p.locator('#ac-name .d, #ac-email .d, #ac-pass .d, #ac-delete .d').count() === 0, 'the rows print label and value only — the helpers live in the sheets (A1)');
    ok(await p.locator('#ac-notif').isVisible() && await p.locator('#tog-email.on').count() === 1 && await p.locator('#tog-morning.on').count() === 0, 'Notifications: email on (looks_ready true), the morning line off');
    ok(await p.locator('#tab-account a.sp-row[href="/privacy"]').count() === 1 && await p.locator('#tab-account a.sp-row[href="/terms"]').count() === 1, 'Privacy & terms are two ↗ rows');
    ok(/hello@byrobes\.com/.test(await txt(p, '#tab-account .sp-foot')) && await p.locator('#ac-logout').isVisible(), 'the foot: a hand, the beta, Log out');
    ok(await p.locator('#tab-account button').evaluateAll(bs => bs.filter(b => getComputedStyle(b).backgroundColor === 'rgb(32, 32, 33)' && b.getClientRects().length).length) === 1, 'the one ink on the account tab is the email switch that is on — no filled button');
    ok(!(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)), 'no horizontal overflow');
    ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
    await ctx.close();
  }

  console.log(`\n\x1b[1m== ${label} · the twin — empty: the slots in place, the by-hand rows open ==\x1b[0m`);
  {
    const { ctx, p, errs, cellPosts, upd } = await open(vp, 'empty', { hash: '#twin' });
    ok(await p.locator('#pg-twin').isVisible() && await p.locator('#pg-root').isHidden(), '#twin opens the twin page');
    ok((await p.evaluate(() => document.getElementById('sn-back-label').textContent)) === 'Settings', 'the header ← reads Settings on a page');
    ok((await txt(p, '#sp-hdr-title')) === 'Your Digital Twin' && /Two photographs read your colouring/.test(await txt(p, '#pg-twin .sp-pagesub')), 'titled Your Digital Twin in the header row, the one sub line below (D1)');
    ok(await p.locator('#pg-twin .sp-backpill, #pg-twin .eyebrow-rose, #pg-twin .sp-title').count() === 0, 'no second back control, no eyebrow, no italic masthead on the page (G2)');
    ok(await p.locator('#mv-fig-empty').isVisible() && /starts the moment your first photograph reads/i.test(await txt(p, '#mv-fig-empty')), 'the ghost figure carries the it-starts line');
    ok(await p.locator('#tw-slotscard').isVisible() && await p.locator('#headshot-slot').isVisible() && await p.locator('#full-slot').isVisible(), 'the two dashed slots stand in place');
    ok(/Soft daylight, facing a window\. No filters\./.test(await txt(p, '#st1-guide')) && /Head to toe, fitted clothes\. A mirror is fine\./.test(await txt(p, '#st2-guide')), 'each slot carries its one guide line');
    ok(await p.locator('#tw-read').isHidden(), 'no Read-from-your-photographs card yet');
    ok(/or shape her by hand/i.test(await txt(p, '#mv-shape-ey')) && await p.locator('#mv-shape-rows .mvr').count() === 4, 'Or shape her by hand: four rows open (skin · hair · the line · the frame)');
    ok(await p.locator('#mv-shape-rows [data-axis="presence"]').count() === 0, 'gender is NOT a by-hand row — it is the fifth fact');
    ok((await p.locator('#tw-facts-cells .c .v.add').count()) === 4 && /Woman/.test(await txt(p, '#tw-facts-cells')), 'four facts read Add; Gender reads Woman');
    ok(cellPosts.length === 0 && await p.locator('.mv-photo').count() === 0, 'no cell asked for before anything exists');
    ok(await p.locator('#mv-build').isHidden() && await p.locator('#mv-filed').count() === 0, 'no Build a look yet; the ✓ Filed line is gone for good (T6)');
    const cells = await p.locator('#tw-facts-cells .c').evaluateAll(cs => cs.map(c => Math.round(c.getBoundingClientRect().top)));
    ok(cells.length === 5 && cells.every(y => y === cells[0]), 'the five facts lay out in ONE row with dividers (T5): ' + cells.join(','));
    ok(/the facts/i.test(await p.locator('#pg-twin .tw-sec:not([hidden]) .sp-gk').first().innerText()) && !/Size, never weight/.test(await txt(p, '#pg-twin')), 'The facts is a section eyebrow above the card; the sentence lives in the sheet');
    // the by-hand path: a skin pick files the model + fetches the cell
    await p.click('#mv-shape-rows [data-axis="skin"][data-v="0"]'); await p.waitForTimeout(1300);
    ok((await p.locator('#mv-head').getAttribute('fill')) === '#3B2A22', 'a skin pick repaints the figure');
    const u1 = await upd('u.avatar_id');
    ok(u1 && /^w-s0-h1-nt$/.test(u1.avatar_id) && u1.avatar_prefs.kept === true, 'the model auto-files by hand: ' + (u1 && u1.avatar_id));
    ok(await p.locator('#mv-build').isVisible() && /updates/.test(await txt(p, '#mv-status')) && (await p.locator('#mv-status').boundingBox()).y > (await p.locator('#mv-build').boundingBox()).y, 'Build a look appears as the one ink fill, the italic line under it');
    ok(await p.locator('#pg-twin button').evaluateAll(bs => bs.filter(b => getComputedStyle(b).backgroundColor === 'rgb(32, 32, 33)' && b.getClientRects().length).length) === 1, 'Build a look is the screen’s one ink fill');
    ok(cellPosts[0] === 'w-s0-h1-nt', 'the cell asked for is the by-hand model');
    ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
    await ctx.close();
  }

  console.log(`\n\x1b[1m== ${label} · the twin — read: the card, the Photographs sheet, the cell ==\x1b[0m`);
  {
    const { ctx, p, errs, cellPosts, seasonPosts, upd } = await open(vp, 'both', { hash: '#twin' });
    ok(await p.locator('#tw-slotscard').isHidden() && await p.locator('#mv-shape').isHidden(), 'the slots and the by-hand rows leave the page once something has read');
    ok(await p.locator('#tw-read').isVisible(), 'the Read-from-your-photographs card stands');
    ok((await txt(p, '#tw-colour-v')) === 'Soft Autumn' && /Neutral · Low, blended/.test(await txt(p, '#tw-colour-d')), 'Colouring row: the season, undertone · contrast');
    ok((await p.evaluate(() => document.getElementById('tw-line-v').textContent)) === '' && /Read from the full-length/.test(await txt(p, '#tw-line-d')), 'Body shape row: nothing until the line and frame are set, the sub says it was read (T4)');
    ok(!/Hourglass/.test(await txt(p, '#pg-twin')), 'the page never names a shape — Robes says what it read, not what she is');
    ok(/read from your photographs/i.test(await p.locator('#tw-read .sp-gk').innerText()), 'Read from your photographs is the section eyebrow above the three rows (T3)');
    ok(await p.waitForSelector('.mv-photo', { timeout: 5000 }).then(() => true).catch(() => false) && cellPosts[0] === 'w-s5-h1-hg', 'the model photograph lands — the cell is the resolved id: ' + cellPosts[0]);
    ok(await p.locator('#mv-stage-ey').count() === 0 && (await txt(p, '#mv-caption')) === 'Sand · espresso brown hair', 'the stage carries the italic caption alone — its eyebrow is gone (T1)');
    ok(/two photographs read/i.test(await txt(p, '#mv-status')), 'the status: two photographs read');
    const u = await upd('u.avatar_id');
    ok(u && u.avatar_id === 'w-s5-h1-hg', 'a read account files on load (pre-auto-file rows)');
    // the "Your photographs" sheet — the slots move in; Colouring then Body shape, each with the controls that nudge it
    await p.click('#tw-row-colour'); await p.waitForTimeout(350);
    ok(await p.locator('#sh-wrap').isVisible() && (await txt(p, '#sh-title')) === 'Your photographs', 'the Colouring row lifts the Your photographs sheet — no full stop (P1 · P2)');
    ok((await p.locator('#sh-title').evaluate(el => getComputedStyle(el).fontWeight)) === '300' && (await p.locator('#sh-done').evaluate(el => { const s = getComputedStyle(el); return s.borderTopStyle === 'none' && s.fontSize === '13px' && el.textContent.trim() === 'Done'; })), 'the title Cormorant 300, Done a plain 13px text link (P2)');
    ok((await p.locator('#sh-body').evaluate(el => getComputedStyle(el).scrollbarWidth)) === 'none' && (await p.locator('#sh').evaluate(el => getComputedStyle(el).borderTopStyle)) === 'none', 'no scrollbar on the sheet, no second border behind it (P8)');
    ok(await p.locator('#sh-body #tw-slots').count() === 1 && await p.locator('#sh-body #headshot-slot').isVisible(), 'the two slots live inside the sheet');
    ok(await p.locator('#sh-body .mv-read').count() === 0 && !/read from this photograph/.test(await txt(p, '#sh-body')) && /^Read/.test(await txt(p, '#sh-body #st1-readline')) && /^Read/.test(await txt(p, '#sh-body #st2-readline')), 'a slot prints its name and the read, never ✓ Read or a verdict caption (P3)');
    ok(await p.locator('#sh-body .sh-opts > .sh-opt').count() === 4 && (await p.locator('#sh-body [data-season] .n').allInnerTexts()).map(t => t.trim()).join(' | ') === 'Soft Autumn | True Autumn | Soft Summer' && (await txt(p, '#sh-body .sh-opt.on .n')) === 'Soft Autumn' && await p.locator('#sh-body #sh-season-more.sh-opt').count() === 1, 'Colouring is a four-row picker: the read season selected, its two neighbours on the wheel, Another season (P4)');
    ok(await p.locator('#sh-body .sh-opt.on + .sh-opt-in .mv-sw-row div').count() === 9 && await p.locator('#sh-body .mv-sw-row').count() === 1 && await p.locator('#sh-body .sh-opt.on + .sh-opt-in #sh-door-colour').count() === 1, 'the strip and Full colour notes → sit under the selected row only');
    ok(!/By hand/.test(await txt(p, '#sh-body')) && await p.locator('#sh-body .mvr').count() === 4, 'no By hand block — four rows grouped by photograph (P6)');
    ok((await p.evaluate(() => { const b = document.getElementById('sh-body'); const skin = b.querySelector('[data-axis="skin"]'), hair = b.querySelector('[data-axis="hair"]'), line = b.querySelector('[data-axis="line"]'), frame = b.querySelector('[data-axis="frame"]'), c = b.querySelector('#sh-sec-colour'), l = b.querySelector('#sh-sec-line'); const after = (a, z) => !!(a.compareDocumentPosition(z) & Node.DOCUMENT_POSITION_FOLLOWING); return after(c, skin) && after(skin, l) && after(c, hair) && after(hair, l) && after(l, line) && after(l, frame); })), 'skin and hair sit under Colouring, the line and the frame under Body shape');
    ok(/Read from your full-length/.test(await txt(p, '#sh-body')) && !/Hourglass/.test(await txt(p, '#sh-body')) && !/waist/.test(await txt(p, '#sh-body')), 'Body shape prints Read from your full-length, then the pickers — never the shape or a body line (P5)');
    ok(/Sand/.test(await txt(p, '#sh-body')) && /Espresso brown/.test(await txt(p, '#sh-body')), 'the swatch names print beside the selected swatch (P7)');
    await p.click('#sh-door-colour'); await p.waitForTimeout(350);
    ok(await p.locator('#mv-notes-wrap').isVisible() && await p.locator('#colour-sections').isVisible() && await p.locator('#palette-grid .g-6 div').count() === 18, 'Full colour notes → the drawer with all eighteen');
    await p.click('#mvn-close'); await p.waitForTimeout(200);
    await p.click('#sh-body [data-axis="skin"][data-v="0"]'); await p.waitForTimeout(300);
    ok((await p.locator('#mv-head').getAttribute('fill')) === '#3B2A22' && (await upd('u.avatar_id')).avatar_id === 'w-s0-h1-hg', 'a pick inside the sheet repaints the stage and re-files: ' + (await upd('u.avatar_id')).avatar_id);
    // P4 · a different reading: the picker asks for that season's catalog and lands it as a read
    await p.click('#sh-body #sh-season-more'); await p.waitForTimeout(200);
    ok(await p.locator('#sh-body [data-season]').count() === 12, 'Another season opens the full wheel');
    await p.click('#sh-body [data-season="Dark Autumn"]'); await p.waitForTimeout(500);
    ok(seasonPosts.length === 1 && seasonPosts[0].season === 'Dark Autumn' && seasonPosts[0].current.archetype_name === 'Soft Autumn', 'a pick posts the season with the photograph’s read riding along');
    const chosen = await upd('u.colour_analysis');
    ok(chosen && chosen.season === 'Dark Autumn' && chosen.colour_analysis.chosen === true && chosen.style_dna.color_harmony.archetype_name === 'Dark Autumn', 'the chosen season writes colour_analysis + the DNA fragment, marked chosen');
    ok((await txt(p, '#sh-body .sh-opt.on .n')) === 'Dark Autumn' && (await txt(p, '#tw-colour-v')) === 'Dark Autumn', 'the picker and the row read the new season');
    await p.click('#sh-done'); await p.waitForTimeout(250);
    ok(await p.locator('#sh-wrap').isHidden() && await p.locator('#tw-slotscard #tw-slots').count() === 1 && await p.locator('#tw-slotscard').isHidden(), 'Done closes the sheet; the slots return to their card, still off the page');
    // Body shape opens the SAME sheet on its own section (P1)
    await p.click('#tw-row-line'); await p.waitForTimeout(350);
    ok((await txt(p, '#sh-title')) === 'Your photographs' && (await p.evaluate(() => { const b = document.getElementById('sh-body'); return b.scrollHeight <= b.clientHeight + 2 || b.scrollTop > 0; })), 'the Body shape row lifts the same sheet, scrolled to Body shape');
    await p.click('#sh-done'); await p.waitForTimeout(200);
    // Adjust by hand — the same rows, no photographs
    await p.click('#mv-adjust'); await p.waitForTimeout(300);
    ok(/^adjust by hand$/i.test(await txt(p, '#sh-title')) && await p.locator('#sh-body .mvr').count() === 4 && await p.locator('#sh-body #tw-slots').count() === 0, 'Adjust by hand: the four rows, no slots');
    const before = await p.locator('#mv-dress').getAttribute('points');
    await p.click('#sh-body [data-axis="frame"][data-v="R"]'); await p.waitForTimeout(300);
    ok((await p.locator('#mv-dress').getAttribute('points')) !== before && /-fr$/.test((await upd('u.avatar_id')).avatar_id), 'a nudge redraws the figure and rides the id');
    ok(/✓\s*Narrower/.test(await txt(p, '#sh-body [data-axis="frame"].on')), 'the chosen pill carries the small ✓ (P6)');
    await p.locator('#sh-wrap').click({ position: { x: 6, y: 6 } }); await p.waitForTimeout(200);
    ok(await p.locator('#sh-wrap').isHidden(), 'the dimmed page closes the sheet');
    ok((await txt(p, '#tw-line-v')) === 'Narrower frame' && /Read from the full-length/.test(await txt(p, '#tw-line-d')), 'Body shape prints the frame as set — "Narrower frame" — the sub still naming the read (T4)');
    ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
    await ctx.close();
  }

  console.log(`\n\x1b[1m== ${label} · the facts — size, never weight; gender writes gender_identity ==\x1b[0m`);
  {
    const { ctx, p, errs, upd } = await open(vp, 'empty', { hash: '#twin' });
    await p.click('#tw-facts'); await p.waitForTimeout(300);
    ok(/^the facts$/i.test(await txt(p, '#sh-title')) && /Size, never weight/.test(await txt(p, '#sh-sub')), 'The facts sheet: size, never weight — the sentence lives here (T5)');
    ok(await p.locator('#sh-body .fx-row').count() === 5, 'five rows: Height · Size · Shoes · Age · Gender');
    ok(!/weight/i.test(await txt(p, '#sh-body').then(t => t.replace(/Size, never weight/g, ''))), 'no weight anywhere');
    ok(await p.locator('#sh-body [data-axis="presence"]').count() === 3 && /Woman/.test(await txt(p, '#sh-body [data-axis="presence"].on')), 'Gender: Woman · Man · Prefer not to say, Woman on file');
    await p.click('#sh-body [data-step="height_cm"][data-dir="1"]'); await p.waitForTimeout(150);
    ok(/169 cm/.test(await txt(p, '#sh-body')) && (await upd('u.style_dna && u.style_dna.facts')).style_dna.facts.height_cm === 169, 'height steps from 168 and writes style_dna.facts');
    await p.click('#sh-body [data-unit="ft"]'); await p.waitForTimeout(150);
    ok(/5′7″/.test(await txt(p, '#sh-body')), 'ft / in reads 5′7″ for 169 cm');
    await p.click('#sh-body [data-step="size_uk"][data-dir="1"]'); await p.waitForTimeout(150);
    ok(/UK 12/.test(await txt(p, '#sh-body')) && /EU 40/.test(await txt(p, '#sh-body')), 'size steps in twos with the EU size beneath');
    await p.click('#sh-body [data-step="shoe_uk"][data-dir="-1"]'); await p.waitForTimeout(150);
    ok(/UK 4\.5/.test(await txt(p, '#sh-body')), 'shoes step in halves');
    await p.click('#sh-body [data-age="45–54"]'); await p.waitForTimeout(150);
    ok(/45–54/.test(await txt(p, '#sh-body [data-age].on')), 'an age chip selects');
    await p.click('#sh-body [data-axis="presence"][data-v="man"]'); await p.waitForTimeout(250);
    ok((await upd('u.gender_identity')).gender_identity === 'man', 'Man writes profiles.gender_identity at once');
    ok(/Man/.test(await txt(p, '#sh-body [data-axis="presence"].on')), 'and the pill moves');
    await p.click('#sh-done'); await p.waitForTimeout(250);
    ok(/169 cm/.test(await txt(p, '#tw-facts-cells')) && /UK 12/.test(await txt(p, '#tw-facts-cells')) && /UK 4\.5/.test(await txt(p, '#tw-facts-cells')) && /45–54/.test(await txt(p, '#tw-facts-cells')) && /Man/.test(await txt(p, '#tw-facts-cells')), 'the five cells carry the facts: ' + await txt(p, '#tw-facts-cells'));
    const f = (await upd('u.style_dna && u.style_dna.facts')).style_dna.facts;
    ok(f.height_cm === 169 && f.size_uk === 12 && f.shoe_uk === 4.5 && f.age_band === '45–54' && f.weight === undefined, 'style_dna.facts holds the four, never a weight');
    ok(/or shape him by hand/i.test(await txt(p, '#mv-shape-ey')), 'the by-hand copy follows the gender');
    ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
    await ctx.close();
  }

  console.log(`\n\x1b[1m== ${label} · a fresh read lands in the sheet ==\x1b[0m`);
  {
    const { ctx, p, errs, upd } = await open(vp, 'empty', { hash: '#twin' });
    const [chooser] = await Promise.all([p.waitForEvent('filechooser'), p.click('#headshot-slot')]);
    await chooser.setFiles(TMP);
    await p.waitForTimeout(900);
    ok(await p.locator('#tw-read').isVisible() && (await txt(p, '#tw-colour-v')) === 'Soft Autumn', 'a close-up read lands on the card');
    ok(await p.locator('#tw-slotscard').isHidden(), 'the slots leave the page');
    const u = await upd('u.colour_analysis');
    ok(u && u.season === 'Soft Autumn' && u.headshot_url && u.style_dna.color_harmony, 'the read writes colour_analysis + the DNA fragment + the photograph');
    ok((await upd('u.avatar_id')).avatar_id === 'w-s5-h1-nt', 'and files the model from the read');
    ok(u.colour_analysis.read_at && /^Read \d+ [A-Z][a-z]{2}$/.test(await txt(p, '#st1-readline')), 'the read stamps its date and the slot prints it — "Read 2 Sep" (P3): ' + await txt(p, '#st1-readline'));
    await p.click('#tw-row-line'); await p.waitForTimeout(300);
    ok(/^Read \d+/.test(await txt(p, '#sh-body #st1-readline')) && await p.locator('#sh-body #st2-readline').isHidden() && await p.locator('#sh-body #st2-guide').isVisible(), 'inside the sheet the close-up reads its date, the full-length still shows its guide');
    const [ch2] = await Promise.all([p.waitForEvent('filechooser'), p.click('#sh-body #full-slot')]);
    await ch2.setFiles(TMP);
    await p.waitForTimeout(900);
    ok(await p.locator('#sh-body #st2-readline').isVisible() && /Read from your full-length/.test(await txt(p, '#sh-body')) && !/Hourglass/.test(await txt(p, '#sh-body')), 'a full-length added from the sheet reads there — as a read, never a shape');
    await p.click('#sh-done'); await p.waitForTimeout(200);
    ok((await p.evaluate(() => document.getElementById('tw-line-v').textContent)) === '' && /Read from the full-length/.test(await txt(p, '#tw-line-d')) && /two photographs read/i.test(await txt(p, '#mv-status')), 'the row and the status follow');
    ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
    await ctx.close();
  }

  console.log(`\n\x1b[1m== ${label} · Style DNA — the sheets ==\x1b[0m`);
  {
    const { ctx, p, errs, upd } = await open(vp, 'empty', { hash: '#dna', row: { style_icons: ['The Row', 'Jane Birkin'], budget: 'Everyday, Designer' } });
    ok(await p.locator('#pg-dna').isVisible(), '#dna opens Style DNA');
    ok((await txt(p, '#sp-hdr-title')) === 'Style DNA' && (await txt(p, '#pg-dna .sp-pagesub')) === 'What you love, and the lines you dress by.', 'titled Style DNA in the header row, the masthead now the 12px sub (D1)');
    ok(await p.locator('#pg-dna .sp-group').count() === 2 && await p.locator('#pg-dna .sp-row .chev').count() === 8, 'grouped rows in white cards with chevrons stay (D2)');
    // the one-time reconcile: brands split off the icons, the tiers mapped to a level
    const once = await upd('u.style_icons');
    ok(once && once.style_icons.join() === 'Jane Birkin' && once.style_dna.brands.join() === 'The Row' && once.style_dna.investment === '€1,500–5,000' && once.annual_spend === '€1,500–5,000', 'ONE write splits the brands off the icons and maps the highest tier to a level: ' + JSON.stringify(once));
    ok((await txt(p, '#dna-brands-v')) === 'The Row' && (await txt(p, '#dna-icons-v')) === 'Jane Birkin' && (await txt(p, '#dna-invest-v')) === '€1,500–5,000', 'the rows read the split');
    ok((await txt(p, '#dna-type-v')) === 'Not yet' && (await txt(p, '#dna-loves-v')) === 'Not yet', 'type and the words read Not yet');
    await p.waitForTimeout(300);
    ok((await txt(p, '#dna-pieces-v')) === '1 piece', 'Pieces you love counts her starred pieces');
    // style type: the ten, multi-select
    await p.click('#dna-type'); await p.waitForTimeout(300);
    ok(/pick as many as feel like you/i.test(await txt(p, '#sh-sub')) && await p.locator('#sh-body [data-type]').count() === 10, 'Style type: the ten types, pick as many');
    await p.click('#sh-body [data-type="Minimal"]'); await p.click('#sh-body [data-type="Sculptural"]'); await p.waitForTimeout(250);
    ok(await p.locator('#sh-body .sh-opt.on').count() === 2 && (await upd('u.style_dna && u.style_dna.style_archetypes')).style_dna.style_archetypes.join() === 'Minimal,Sculptural', 'two kept, written to style_archetypes');
    const onBg = await p.locator('#sh-body .sh-opt.on').first().evaluate(el => getComputedStyle(el).backgroundColor);
    ok(onBg === 'rgb(243, 239, 230)', 'selected is warm, never black: ' + onBg);
    await p.click('#sh-body [data-type="Minimal"]'); await p.waitForTimeout(200);
    ok((await upd('u.style_dna && u.style_dna.style_archetypes')).style_dna.style_archetypes.join() === 'Sculptural', 'a second tap clears it');
    await p.click('#sh-done'); await p.waitForTimeout(200);
    ok((await txt(p, '#dna-type-v')) === 'Sculptural', 'the row reads the pick');
    // the brand wall
    await p.click('#dna-brands'); await p.waitForTimeout(300);
    ok(/select 3\+ brands/i.test(await txt(p, '#sh-sub')) && await p.locator('#sh-body #wall-q').isVisible(), 'Brands: the search field leads');
    ok(/your selections/i.test(await txt(p, '#sh-body')) && await p.locator('#sh-body .sh-pill.on').count() === 1, 'Your selections holds The Row');
    ok(/popular among stylists/i.test(await txt(p, '#sh-body')) && (await p.locator('#sh-body .sh-pill:not(.on)').allInnerTexts()).slice(0, 2).join() === 'Totême,Khaite', 'the pool leads with the picked type’s houses (Sculptural → Totême, Khaite)');
    ok(await p.locator('#sh-body .sh-pill:not(.on)').count() === 18 && /more in the pool/.test(await txt(p, '#sh-body .sh-more-note')), 'the wall shows 18 at a time, never all 70, and says how many more there are');
    ok(await p.locator('#sh-body .sh-pill[data-name="The Row"]').count() === 1, 'a kept name shows once — in her selections, not the pool');
    await p.click('#sh-body .sh-pill[data-name="Loewe"]'); await p.waitForTimeout(250);
    ok((await upd('u.style_dna && u.style_dna.brands')).style_dna.brands.join() === 'The Row,Loewe', 'a tap keeps a brand');
    await p.fill('#sh-body #wall-q', 'Chopova'); await p.waitForTimeout(250);
    ok(await p.locator('#sh-body .sh-pill[data-name="Chopova Lowena"]').count() === 1, 'search finds Liberty’s names in the pool');
    await p.fill('#sh-body #wall-q', 'Chopova Lowena'); await p.waitForTimeout(250);
    ok(await p.locator('#sh-body #wall-add').count() === 0, 'an exact match offers no + Add');
    await p.fill('#sh-body #wall-q', 'Marfa Stance'); await p.waitForTimeout(250);
    ok(await p.locator('#sh-body #wall-add').count() === 1 && /Add “Marfa Stance”/.test(await txt(p, '#sh-body #wall-add')), 'a name not in the pool offers + Add');
    await p.click('#sh-body #wall-add'); await p.waitForTimeout(250);
    ok((await upd('u.style_dna && u.style_dna.brands')).style_dna.brands.join() === 'The Row,Loewe,Marfa Stance' && await p.locator('#sh-body .sh-pill.on').count() === 3, 'the added name joins her selections');
    await p.click('#sh-body .sh-pill.on[data-name="Loewe"]'); await p.waitForTimeout(200);
    ok((await upd('u.style_dna && u.style_dna.brands')).style_dna.brands.join() === 'The Row,Marfa Stance', '× on a selection lets it go');
    await p.click('#sh-done'); await p.waitForTimeout(200);
    // the icon wall carries a tag
    await p.click('#dna-icons'); await p.waitForTimeout(300);
    ok(/often chosen/i.test(await txt(p, '#sh-body')) && /Clean-girl minimal/.test(await txt(p, '#sh-body')), 'Icons: Often chosen, each with its tag');
    await p.click('#sh-body .sh-pill[data-name="Hailey Bieber"]'); await p.waitForTimeout(250);
    const ic = await upd('u.style_icons');
    ok(ic.style_icons.join() === 'Jane Birkin,Hailey Bieber' && ic.style_dna.icon_tags['Hailey Bieber'] === 'Clean-girl minimal', 'an icon writes style_icons + its tag on style_dna.icon_tags');
    await p.click('#sh-done'); await p.waitForTimeout(200);
    // the investment level: four rows, no Prefer not to say
    await p.click('#dna-invest'); await p.waitForTimeout(300);
    const levels = (await p.locator('#sh-body .sh-opt .n').allInnerTexts()).map(t => t.trim());
    ok(levels.join(' | ') === 'Under €500 | €500–1,500 | €1,500–5,000 | €5,000+', 'four rows by yearly spend, no Prefer not to say: ' + levels.join(' | '));
    await p.click('#sh-body [data-level="€500–1,500"]'); await p.waitForTimeout(250);
    const inv = await upd('u.annual_spend');
    ok(inv.annual_spend === '€500–1,500' && inv.style_dna.investment === '€500–1,500', 'a level writes annual_spend + style_dna.investment together');
    await p.click('#sh-done'); await p.waitForTimeout(200);
    // the pieces she loves
    await p.click('#dna-pieces'); await p.waitForTimeout(300);
    ok(await p.locator('#sh-body .pc-row').count() === 1 && /Black wool blazer/.test(await txt(p, '#sh-body')) && /never dresses you in the same one two days running/.test(await txt(p, '#sh-sub')), 'Pieces you love: her starred piece and what a star does');
    ok(await p.locator('#sh-body a[href="/wardrobe"]').count() === 1, 'Star more from your wardrobe → /wardrobe');
    await p.click('#sh-done'); await p.waitForTimeout(200);
    // in your words
    await p.click('#dna-avoids'); await p.waitForTimeout(300);
    ok(/^hard nos$/i.test(await txt(p, '#sh-title')) && /never proposes these, whatever the occasion/i.test(await txt(p, '#sh-sub')), 'Hard nos: never proposes these, whatever the occasion');
    await p.fill('#sh-body #words-in', 'No polo necks'); await p.press('#sh-body #words-in', 'Enter'); await p.waitForTimeout(250);
    const w = await upd('u.style_dna && u.style_dna.brief');
    ok(w.style_dna.brief.avoids.length === 1 && w.style_dna.brief.avoids[0].text === 'No polo necks' && w.style_dna.brief.avoids[0].source === 'typed' && w.style_dna.brief.source === 'edited', 'a typed no files at once as her own line');
    ok(await p.locator('#sh-body .ln').count() === 1 && /✓ filed/i.test(await txt(p, '#sh-body')), 'the line stands with the Filed mark');
    await p.click('#sh-body [data-strike="0"]'); await p.waitForTimeout(250);
    ok((await upd('u.style_dna && u.style_dna.brief')).style_dna.brief.avoids.length === 0 && (await upd('u.style_dna && u.style_dna.brief')).style_dna.brief.struck.length === 0, '× strikes a typed line without recording it as struck (it was hers, not Robes’)');
    await p.click('#sh-done'); await p.waitForTimeout(200);
    ok((await txt(p, '#dna-avoids-v')) === 'Not yet', 'Hard nos reads as a count on the row (D3)');
    ok(await p.locator('#dna-noticed').count() === 0, 'no "new from Robes" door on Style DNA (D4)');
    ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
    await ctx.close();
  }

  console.log(`\n\x1b[1m== ${label} · the observations — a draft lands pending, Keep files under Style DNA ==\x1b[0m`);
  {
    const { ctx, p, errs, briefPosts, upd } = await open(vp, 'full', { draft: DRAFT });
    await p.waitForTimeout(500);
    ok(briefPosts.length === 1 && briefPosts[0].wardrobe.length === 2 && briefPosts[0].styleIcons.join() === 'Jane Birkin', 'the root reads her wardrobe once, her rows as the evidence');
    const d = await upd('u.style_dna && u.style_dna.brief && u.style_dna.brief.pending');
    ok(d && d.style_dna.brief.pending.length === 5 && d.style_dna.brief.read_at && d.style_dna.memory.read_at, 'the draft lands as five pending lines, read_at stamped on the brief and the memory');
    const pend = d.style_dna.brief.pending;
    ok(pend[3].list === 'notes' && pend[3].text === 'You dress best when one line runs uninterrupted from shoulder to shoe.' && /^You dress best.*read as yours\.$/.test(pend[3].full), 'the notes land as ONE sentence, the paragraph riding behind it — never a character cut (L2)');
    ok(pend[3].because === 'From 2 pieces filed' && pend[4].because === 'From 2 pieces filed', 'the source line names the evidence, never a label (L3 · O4): ' + pend[3].because);
    ok(pend[4].text === 'You reach for black and taupe. Red stays on the rail.' && pend[4].loved.join() === 'black,taupe', 'the colours read as a lower-case sentence joined with and (O3): ' + pend[4].text);
    ok(await p.locator('#sp-notice').isVisible() && /You reach for a defined waist/.test(await txt(p, '#sp-notice .t')), 'the "Robes noticed" card carries the first line');
    ok((await p.locator('#sp-notice .t').evaluate(el => getComputedStyle(el).webkitLineClamp)) === '3', 'the card’s line clamps at three lines with an ellipsis (L2)');
    ok((await p.locator('#sp-notice .verbs button').allInnerTexts()).map(t => t.trim().toLowerCase()).join(' | ') === '← not me | keep →', 'the alert keeps its labelled actions (L4)');
    ok(await p.locator('#tab-style .sp-card .st').count() === 0, 'the cards carry no state lines (G4)');
    // Keep on the card
    await p.click('#sp-notice [data-v="keep"]'); await p.waitForTimeout(500);
    const k = await upd('u.style_dna && u.style_dna.brief && u.style_dna.brief.loves.length');
    ok(k && k.style_dna.brief.loves[0].text === 'You reach for a defined waist' && k.style_dna.brief.loves[0].source === 'drafted' && k.style_dna.brief.pending.length === 4, 'Keep files the line under Works and takes it off pending');
    ok(/^\d{4}-\d{2}-\d{2}T/.test(k.style_dna.brief.loves[0].at || ''), 'a kept line carries the date it was kept (O7)');
    ok(/Kept\. Filed under Style DNA\./.test(await txt(p, '#sp-toast')), 'the toast: Kept. Filed under Style DNA.');
    ok(/Anything that reads polite/.test(await txt(p, '#sp-notice .t')), 'the next line takes the card');
    // the drag: past 90px commits
    const box = await p.locator('#sp-notice').boundingBox();
    await p.mouse.move(box.x + 60, box.y + 40); await p.mouse.down(); await p.mouse.move(box.x + 100, box.y + 40); await p.mouse.move(box.x + 180, box.y + 40); await p.mouse.up();
    await p.waitForTimeout(500);
    const k2 = await upd('u.style_dna && u.style_dna.brief && u.style_dna.brief.avoids.length');
    ok(k2 && k2.style_dna.brief.avoids[0].text === 'Anything that reads polite' && k2.style_dna.brief.pending.length === 3, 'a drag to the right keeps the next line');
    // the page
    await p.click('#card-obs'); await p.waitForTimeout(400);
    ok(await p.locator('#pg-obs').isVisible() && await p.locator('#obs-body .ob').count() === 3, 'the observations page lists the three still pending');
    ok((await txt(p, '#sp-hdr-title')) === 'Robes Observations' && /Read from what you wear/.test(await txt(p, '#pg-obs .sp-pagesub')), 'titled Robes Observations in the header row, the sub below (D1)');
    ok((await p.locator('#obs-body .ob .k').allInnerTexts()).map(t => t.trim().toLowerCase()).join(' | ') === 'rule | how you dress well | colour', 'each card keeps its category eyebrow (O2)');
    ok((await p.locator('#obs-body .ob .verbs .keep').first().evaluate(el => { const s = getComputedStyle(el); return s.borderTopStyle === 'solid' && s.fontSize === '12px' && s.paddingTop === '10px' && s.paddingLeft === '16px'; })) && (await p.locator('#obs-body .ob .verbs .no').first().evaluate(el => getComputedStyle(el).borderTopStyle === 'none')), 'in the list Keep is a hairline pill, Not me a text link beside it (O5)');
    ok((await p.locator('#obs-body .ob .t').first().evaluate(el => getComputedStyle(el).webkitLineClamp)) === '3', 'an observation clamps at three lines (L2)');
    ok(/kept before/i.test(await txt(p, '#obs-body')) && /You reach for a defined waist/.test(await txt(p, '#obs-body')) && /Kept in [A-Z][a-z]+/.test(await p.locator('#obs-body .ln .when').first().innerText()), 'Kept before lists what she kept, dated at the right — "Kept in March" (O7)');
    await p.click('#obs-body [data-no="0"]'); await p.waitForTimeout(400);
    const s = await upd('u.style_dna && u.style_dna.brief && u.style_dna.brief.struck.length');
    ok(s && s.style_dna.brief.struck[0] === 'Loafers only with a cropped trouser' && s.style_dna.memory.entries[0].k === 'strike', 'Not me strikes the line and the memory records it');
    await p.click('#obs-body [data-keep="0"]'); await p.waitForTimeout(400);
    const nts = await upd('u.style_dna && u.style_dna.brief && u.style_dna.brief.notes');
    ok(nts && /^You dress best.*read as yours\.$/.test(nts.style_dna.brief.notes), 'keeping the notes line files the WHOLE paragraph behind its sentence');
    await p.click('#obs-body [data-keep="0"]'); await p.waitForTimeout(400);
    const c = await upd('u.style_dna && u.style_dna.brief && u.style_dna.brief.colours.loved.length');
    ok(c && c.style_dna.brief.colours.loved.join() === 'black,taupe' && c.style_dna.brief.colours.rejected.join() === 'red' && c.style_dna.brief.pending.length === 0, 'keeping the colour line lands the colours');
    ok(/Nothing new\. Robes keeps reading\./.test(await txt(p, '#obs-body')) && await p.locator('#obs-again').count() === 0, 'empty: one italic line, no Read again (O6)');
    await p.evaluate(() => { location.hash = '#dna'; }); await p.waitForTimeout(300);
    ok(await p.locator('#dna-noticed').count() === 0, 'Style DNA carries no Noticed door (D4)');
    ok((await txt(p, '#dna-loves-v')) === '1 line' && (await txt(p, '#dna-avoids-v')) === '1 line', 'the word rows count what she kept');
    ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
    await ctx.close();
  }

  console.log(`\n\x1b[1m== ${label} · account — name, email, password, notifications, delete ==\x1b[0m`);
  {
    const { ctx, p, errs, upd, deletes } = await open(vp, 'empty', { hash: '#account' });
    await p.click('#ac-name'); await p.waitForTimeout(300);
    await p.fill('#sh-body #ac-first', 'Liberty'); await p.fill('#sh-body #ac-last', 'Byrne');
    await p.click('#sh-done'); await p.waitForTimeout(250);
    const n = await upd('u.first_name');
    ok(n && n.first_name === 'Liberty' && n.last_name === 'Byrne' && (await txt(p, '#ac-name-v')) === 'Liberty Byrne', 'Done saves the name; the row follows');
    await p.click('#ac-email'); await p.waitForTimeout(300);
    ok(/Where sign-in links and receipts go/.test(await txt(p, '#sh-sub')), 'the helper line moved into the sheet the row opens (A1)');
    await p.fill('#sh-body #ac-em', 'liberty@example.com'); await p.click('#sh-body #ac-em-go'); await p.waitForTimeout(300);
    ok((await p.evaluate(() => window.__auth)).some(a => a.email === 'liberty@example.com') && /Check liberty@example\.com/.test(await txt(p, '#sh-body #ac-msg')), 'a new email goes through auth and asks her to confirm');
    await p.click('#sh-done');
    await p.click('#ac-pass'); await p.waitForTimeout(300);
    await p.fill('#sh-body #ac-pw', 'short'); await p.click('#sh-body #ac-pw-go'); await p.waitForTimeout(150);
    ok(/Eight characters at least/.test(await txt(p, '#sh-body #ac-msg')), 'a short password is refused in place');
    await p.fill('#sh-body #ac-pw', 'longenough1'); await p.click('#sh-body #ac-pw-go'); await p.waitForTimeout(300);
    ok((await p.evaluate(() => window.__auth)).some(a => a.password === 'longenough1') && /Updated/.test(await txt(p, '#sh-body #ac-msg')), 'a good one updates through auth');
    ok(await p.locator('#sh-body #ac-pw').getAttribute('class').then(c => /ph-no-capture/.test(c || '')), 'the password field is never captured in replay');
    await p.click('#sh-done');
    // notifications — one jsonb, merged
    await p.click('#tog-morning'); await p.waitForTimeout(250);
    const m = await upd('u.notification_prefs');
    ok(m && m.notification_prefs.morning === true && m.notification_prefs.morning_hour === 7 && m.notification_prefs.looks_ready === true, 'the morning switch merges over the profile’s prefs');
    await p.selectOption('#tog-hour', '9'); await p.waitForTimeout(250);
    ok((await upd('u.notification_prefs')).notification_prefs.morning_hour === 9, 'the hour writes');
    await p.click('#tog-email'); await p.waitForTimeout(250);
    const e = await upd('u.notification_prefs');
    ok(e.notification_prefs.looks_ready === false && e.notification_prefs.nudges === false && e.notification_prefs.morning === true, 'Email off turns looks_ready + nudges off and leaves the morning line');
    // delete
    await p.click('#ac-delete'); await p.waitForTimeout(300);
    ok(/delete your account\?/i.test(await txt(p, '#sh-title')) && /can’t be undone/.test(await txt(p, '#sh-sub')) && await p.locator('#sh-body #ac-del-keep').isVisible(), 'Delete asks, names what goes, offers Keep my account');
    await p.click('#sh-body #ac-del-keep'); await p.waitForTimeout(200);
    ok(await p.locator('#sh-wrap').isHidden() && deletes.length === 0, 'Keep my account closes with nothing sent');
    await p.click('#ac-delete'); await p.waitForTimeout(300);
    await p.click('#sh-body #ac-del-go');
    await p.waitForURL(u => /\/$/.test(u.pathname) && !/settings/.test(u.pathname), { timeout: 5000 }).catch(() => {});
    ok(deletes.length === 1 && deletes[0] === 'Bearer jwt-u1' && /localhost:\d+\/$/.test(p.url()), 'Delete my account posts with her JWT and leaves for the front door: ' + p.url());
    ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
    await ctx.close();
  }
}

console.log('\n\x1b[1m== the doors — legacy hashes, the home card, the mail, the chapter param ==\x1b[0m');
{
  const vp = { width: 1280, height: 900 };
  const a = await open(vp, 'empty', { hash: '#taste' });
  ok(await a.p.locator('#pg-dna').isVisible() && a.p.url().endsWith('#dna'), '#taste (the old Taste & budget) lands on Style DNA');
  await a.ctx.close();
  const b = await open(vp, 'empty', { hash: '#silhouette' });
  ok(await b.p.locator('#pg-twin').isVisible() && b.p.url().endsWith('#twin'), '#silhouette lands on the twin');
  await b.ctx.close();
  const c = await open(vp, 'empty', { path: '?chapter=brief', draft: DRAFT });
  await c.p.waitForTimeout(400);
  ok(await c.p.locator('#pg-obs').isVisible() && !/chapter=/.test(c.p.url()) && c.p.url().endsWith('#observations'), '?chapter=brief (the next line’s door) lands on the observations, the param stripped');
  ok(c.briefPosts.length === 1 && await c.p.locator('#obs-body .ob').count() === 5, 'and reads her wardrobe into pending lines');
  await c.ctx.close();
  const d = await open(vp, 'empty', { path: '?begin=1' });
  ok(await d.p.locator('#pg-root').isVisible() && await d.p.locator('#tab-style').isVisible() && !/begin=/.test(d.p.url()), '?begin=1 (home’s dashed door) lands on Style Profile, the param stripped');
  await d.ctx.close();
  const e = await open(vp, 'empty', { path: '?page=twin&from=email' });
  ok(await e.p.locator('#pg-twin').isVisible() && !/from=|page=/.test(e.p.url()), '?page=twin&from=email (the look_waiting mail) lands on the twin with the params stripped');
  await e.ctx.close();
  const f = await open(vp, 'empty', { hash: '#account' });
  ok(await f.p.locator('#tab-account').isVisible(), '#account opens the Account tab');
  await f.p.click('#sp-seg button[data-tab="style"]'); await f.p.waitForTimeout(200);
  ok(await f.p.locator('#tab-style').isVisible() && !/#/.test(f.p.url()), 'Style Profile from the switch');
  await f.p.click('#card-dna'); await f.p.waitForTimeout(300);
  await f.p.click('#sn-back'); await f.p.waitForTimeout(300);
  ok(await f.p.locator('#pg-root').isVisible() && (await txt(f.p, '#sp-hdr-title')) === 'Settings', 'the header ← takes a page back to Settings');
  await f.p.click('#sn-back');
  await f.p.waitForURL('**/dashboard', { timeout: 5000 }).catch(() => {});
  ok(/\/dashboard$/.test(f.p.url()), 'and from the root it takes her Home');
  await f.ctx.close();
  // a kept line never comes back: the auto-read posts it as the never-repeat list
  const g = await open(vp, 'empty', { draft: DRAFT, row: { style_dna: { brief: { loves: [{ text: 'You reach for a defined waist', source: 'drafted', at: '2026-03-02T10:00:00Z' }], read_at: '2026-01-01T00:00:00Z' } } } });
  await g.p.waitForTimeout(500);
  ok(g.briefPosts.length === 1 && g.briefPosts[0].current.loves.join() === 'You reach for a defined waist', 'a stale read runs itself and posts the kept lines as the never-repeat list');
  ok((await g.upd('u.style_dna && u.style_dna.brief && u.style_dna.brief.pending')).style_dna.brief.pending.every(x => x.text !== 'You reach for a defined waist'), 'and a line already kept never returns');
  await g.p.click('#card-obs'); await g.p.waitForTimeout(300);
  ok(/Kept in March/.test(await g.p.locator('#obs-body .ln .when').first().innerText()), 'Kept before names the month a line was kept');
  await g.ctx.close();
  // the forward action: Build a look → the dashboard with the flags set
  const h = await open(vp, 'colour', { hash: '#twin' });
  ok(await h.p.locator('#mv-build').isVisible() && /build a look/i.test(await txt(h.p, '#mv-build')), 'with no return the pill reads Build a look');
  await h.p.click('#mv-build');
  await h.p.waitForURL('**/dashboard', { timeout: 5000 }).catch(() => {});
  ok(/\/dashboard$/.test(h.p.url()), 'Build a look lands on the dashboard');
  await h.ctx.close();
  ok(a.errs.length + b.errs.length + c.errs.length + d.errs.length + e.errs.length + f.errs.length + g.errs.length === 0, 'no page errors across the doors');
}

console.log('\n\x1b[1m== the walk — four cards after the first result (?walk=1) ==\x1b[0m');
for (const [label, vp] of [['desktop', { width: 1280, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const { ctx, p, errs, upd } = await open(vp, 'empty', { path: '?walk=1' });
  await p.waitForTimeout(400);
  const ev = () => p.evaluate(() => window.__events.map(e => e.event_type + ' ' + JSON.stringify(e.metadata)));
  ok(await p.locator('#sh-wrap').isVisible() && !/walk=/.test(p.url()) && (await p.evaluate(() => document.getElementById('sh-wrap').classList.contains('walking'))), label + ': ?walk=1 opens the walk on the sheet, the param stripped');
  ok((await txt(p, '#sh-title')) === 'Style type' && await p.locator('#sh-body [data-type]').count() === 10, label + ': card 1 is the style type — the ten, pick as many');
  ok(await p.locator('#sh-walk').isVisible() && await p.locator('#sh-walk-segs span.on').count() === 1 && await p.locator('#sh-walk-skip').isVisible() && (await p.locator('#sh-walk-go').textContent()).trim() === 'Continue' && await p.locator('#sh-done').isHidden(), label + ': the four-segment rule, Skip, Continue — no Done link');
  ok((await p.locator('#sh-walk-go').evaluate(el => getComputedStyle(el).backgroundColor)) === 'rgb(32, 32, 33)' && (await p.locator('#sh-body button, #sh-walk button').evaluateAll(bs => bs.filter(b => getComputedStyle(b).backgroundColor === 'rgb(32, 32, 33)' && b.getClientRects().length).length)) === 1, label + ': Continue is the one ink');
  ok((await ev()).some(e => /^walk_begun/.test(e)), label + ': walk_begun');
  await p.click('#sh-body [data-type="Minimal"]'); await p.waitForTimeout(200);
  await p.click('#sh-walk-go'); await p.waitForTimeout(300);
  ok((await txt(p, '#sh-title')) === 'Brands and icons' && await p.locator('#sh-walk-segs span.on').count() === 2, label + ': card 2 — brands and icons, two segments lit');
  ok((await ev()).some(e => /^walk_card \{"n":1,"outcome":"answered"\}/.test(e)), label + ': card 1 logged as answered');
  ok(await p.locator('#walk-tabs button').count() === 2 && await p.locator('#sh-body .sh-pill:not(.on)').count() === 18 && (await p.locator('#sh-body .sh-pill:not(.on)').first().innerText()).trim() === 'The Row', label + ': the Brands tab first, 18 pills, the picked type’s houses leading');
  await p.click('#sh-body .sh-pill[data-name="The Row"]'); await p.waitForTimeout(250);
  ok((await upd('u.style_dna && u.style_dna.brands')).style_dna.brands.join() === 'The Row' && await p.locator('#sh-body .sh-pill:not(.on)').count() === 18, label + ': a tap keeps a brand and the next name steps in');
  await p.click('#walk-tabs [data-kind="icons"]'); await p.waitForTimeout(250);
  ok(/Clean-girl minimal/.test(await txt(p, '#sh-body')), label + ': the Icons tab carries the tags');
  await p.click('#sh-body .sh-pill[data-name="Hailey Bieber"]'); await p.waitForTimeout(250);
  ok((await upd('u.style_icons')).style_icons.join() === 'Hailey Bieber', label + ': an icon kept from the walk');
  await p.click('#sh-walk-go'); await p.waitForTimeout(300);
  ok((await txt(p, '#sh-title')) === 'Investment level' && await p.locator('#sh-walk-skip').isHidden() && await p.locator('#sh-walk-go').isDisabled(), label + ': card 3 — the one must: no Skip, Continue cream until picked');
  await p.click('#sh-body [data-level="Under €500"]'); await p.waitForTimeout(250);
  ok(!(await p.locator('#sh-walk-go').isDisabled()) && (await upd('u.annual_spend')).annual_spend === 'Under €500', label + ': a level picked turns Continue ink and writes');
  await p.click('#sh-walk-go'); await p.waitForTimeout(300);
  ok((await txt(p, '#sh-title')) === 'Musts and hard nos' && (await p.locator('#sh-walk-go').textContent()).trim() === 'Done' && await p.locator('#sh-body [data-chip]').count() === 8, label + ': card 4 — eight chips, Done as the ink');
  const rows = await p.locator('#sh-body .sh-k').evaluateAll(es => es.map(e => e.textContent.trim()));
  ok(/^Always/.test(rows[0]) && /^Never/.test(rows[1]), label + ': Always above Never');
  await p.click('#sh-body [data-chip="Head covered"]'); await p.waitForTimeout(250);
  const rule = await upd('u.style_dna && u.style_dna.brief');
  ok(rule.style_dna.brief.rules.length === 1 && rule.style_dna.brief.rules[0].text === 'Head covered' && rule.style_dna.brief.rules[0].prompt === 'Head covered' && rule.style_dna.brief.avoids.length === 0, label + ': Head covered files as a RULE Robes keeps, never a no');
  await p.click('#sh-body [data-chip="No heels"]'); await p.waitForTimeout(250);
  ok((await upd('u.style_dna && u.style_dna.brief')).style_dna.brief.avoids[0].text === 'No heels' && await p.locator('#sh-body [data-chip].on').count() === 2, label + ': No heels files as a hard no; both chips warm');
  await p.click('#sh-body [data-chip="No heels"]'); await p.waitForTimeout(250);
  ok((await upd('u.style_dna && u.style_dna.brief')).style_dna.brief.avoids.length === 0, label + ': a second tap strikes it');
  await p.click('#sh-walk-go');
  await p.waitForURL('**/dashboard', { timeout: 5000 }).catch(() => {});
  ok(/\/dashboard$/.test(p.url()) && (await p.evaluate(() => sessionStorage.getItem('rb_walk_done'))) === '1', label + ': Done lands on home with the walk’s handoff');
  ok(errs.length === 0, label + ': no page errors: ' + errs.join(' | '));
  await ctx.close();
}
{
  // Skip on every card but the must; leaving mid-walk is walk_later and stays on Settings
  const { ctx, p, errs } = await open({ width: 1280, height: 900 }, 'empty', { path: '?walk=1' });
  await p.waitForTimeout(400);
  await p.click('#sh-walk-skip'); await p.waitForTimeout(250);
  ok((await txt(p, '#sh-title')) === 'Brands and icons' && (await p.evaluate(() => window.__events.some(e => e.event_type === 'walk_card' && e.metadata.n === 1 && e.metadata.outcome === 'skipped'))), 'Skip moves on and logs the card as skipped');
  await p.keyboard.press('Escape'); await p.waitForTimeout(250);
  ok(await p.locator('#sh-wrap').isHidden() && await p.locator('#pg-root').isVisible() && (await p.evaluate(() => window.__events.some(e => e.event_type === 'walk_later' && e.metadata.n === 2))), 'Escape leaves the walk on Settings and logs walk_later with the card');
  ok((await p.evaluate(() => sessionStorage.getItem('rb_walk_done'))) === null, 'no handoff without Done');
  // the chips sit on the Settings word sheets too
  await p.click('#card-dna'); await p.waitForTimeout(300);
  await p.click('#dna-avoids'); await p.waitForTimeout(300);
  ok(await p.locator('#sh-body [data-chip]').count() === 5 && /^Never/.test((await p.locator('#sh-body .sh-k').first().textContent()).trim()), 'Hard nos in Settings carries the Never chips');
  ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
  await ctx.close();
}

console.log('\n\x1b[1m== degrade — the columns a migration adds ==\x1b[0m');
{
  const vp = { width: 1280, height: 900 };
  const a = await open(vp, 'colour', { hash: '#twin', updateMode: 'nocol' });
  await a.p.waitForTimeout(300);
  ok(await a.p.locator('#mv-build').isVisible() && !!(await a.p.evaluate(() => localStorage.getItem('rb_model__u1'))), 'avatar columns missing: the model files locally, Build a look still stands');
  await a.p.click('#tw-row-colour'); await a.p.waitForTimeout(300);
  await a.p.click('#sh-body [data-axis="hair"][data-v="4"]'); await a.p.waitForTimeout(300);
  ok((await a.p.evaluate(() => window.__updates.filter(u => u.avatar_id).length)) === 1, 'after one refusal no avatar write is retried this session');
  ok(a.errs.length === 0, 'no page errors');
  await a.ctx.close();
  const b = await open(vp, 'empty', { hash: '#account', noNotify: true });
  ok(await b.p.locator('#ac-notif').isHidden() && await b.p.locator('#ac-notif-k').isHidden(), 'no notification_prefs on the profile (migration 22 not run): the Notifications card stands down');
  await b.ctx.close();
}

console.log('\n\x1b[1m== mobile — the sheet is a bottom sheet; the stage leads ==\x1b[0m');
{
  const { ctx, p } = await open({ width: 390, height: 844 }, 'both', { hash: '#twin' });
  const stage = await p.locator('.tw-stage').boundingBox();
  const card = await p.locator('#tw-read').boundingBox();
  ok(stage.y < card.y && stage.width >= 390, 'the stage leads the page full-bleed (T2)');
  ok(Math.round((await p.locator('.topbar').boundingBox()).height) === 44 && await p.locator('#rb-dock').count() === 0, 'at 390 the header is the one 44px row and there is no dock');
  const foot = await p.evaluate(() => { const m = document.querySelector('main'); return parseFloat(getComputedStyle(m).paddingBottom); });
  ok(foot >= 40 && (await p.evaluate(() => { const r = document.querySelector('.mv2-foot').getBoundingClientRect(); return r.bottom <= document.documentElement.scrollHeight; })), 'nothing floats over the last row (G3)');
  await p.click('#tw-facts'); await p.waitForTimeout(400);
  const sh = await p.locator('#sh').boundingBox();
  ok(Math.abs(sh.y + sh.height - 844) < 2 && sh.width === 390, 'the sheet rises from the foot, full width');
  ok(await p.locator('#sh .sh-grab').isVisible(), 'with a grab bar');
  await ctx.close();
}
{
  const { ctx, p } = await open({ width: 1280, height: 900 }, 'both', { hash: '#twin' });
  const stage = await p.locator('.tw-stage').boundingBox();
  const main = await p.locator('.tw-main').boundingBox();
  ok(stage.x < main.x && stage.height > 500, 'at 1280 the stage stands beside the content');
  await p.click('#tw-facts'); await p.waitForTimeout(400);
  const sh = await p.locator('#sh').boundingBox();
  ok(sh.width <= 560 && sh.y > 40, 'the sheet is a centred card on the web');
  await ctx.close();
}

console.log(`\n\x1b[1m${passes} passed, ${fails} failed\x1b[0m`);
await browser.close();
srv.close();
process.exit(fails ? 1 : 0);
