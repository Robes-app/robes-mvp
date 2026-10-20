#!/usr/bin/env node
/*
 * Settings harness — boots the real /settings (the digital twin, design
 * Settings_Prototype.dc.html · 2026-10-07, redlined 2026-10-08 in
 * Settings_Redlines.dc.html) against a Supabase stub and asserts: the ONE
 * 44px header row (← · the title · nothing right) on every screen, no dock,
 * the warm selected tab; the root's title-only cards; the twin page (the
 * digital twin, docs/digital-twin-model-brief.md · 2026-10-20): the ghost
 * and two doors, no full-length anywhere, the Body shape sheet's figure
 * from the facts + three five-stop scales — never a shape's name — the
 * twin drawn ONCE on a sheet's close (POST /api/avatar/twin, the job,
 * the frame on the stage, twin_url/twin_key written by the client, nothing
 * redrawn when nothing changed), the Colouring sheet (the close-up slot
 * inside it, the season picker and Full colour notes UNCHANGED, skin and
 * hair as overrides), the facts with Bust and Waist, the legacy line read
 * seeding the bust scale, Build a look with the italic line; the Style
 * DNA page's sheets (the ten types multi-select, the brand + icon walls with
 * search and "+ Add", the four investment rows, the three word lists, no
 * new-from-Robes door); the observations (titled Observations; the
 * wardrobe read PAUSED behind OBS_WARDROBE_READ — /api/stylenotes/brief is
 * never posted from the tab, the page or the doors — pending lines seeded
 * on the profile still render and take the two verbs, That's right a
 * hairline pill, Not quite a link, Kept before dated, no Read again, the
 * new empty line); the swipe card on the tab with the same two verbs; the
 * high street in the brand pool; the Account tab (label + value rows, name, email,
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
// The shape the dashboard writes into brief.pending (a verdict, a swap pattern, a typed rule) — the draft's
// five-line result, seeded on the profile, since the wardrobe read itself is paused.
const PENDING = [
  { list: 'loves', text: 'You reach for a defined waist', because: 'your two most-worn tops sit at the natural waist', at: '2026-10-16T10:00:00Z' },
  { list: 'avoids', text: 'Anything that reads polite', because: 'the pieces you never wear are the safest ones', at: '2026-10-16T10:00:00Z' },
  { list: 'rules', text: 'Loafers only with a cropped trouser', because: 'every wear of the loafers was with the cropped wool', at: '2026-10-16T10:00:00Z' },
  { list: 'notes', text: 'You dress best when one line runs uninterrupted from shoulder to shoe.', full: DRAFT.notes, because: 'From 2 pieces filed', at: '2026-10-16T10:00:00Z' },
  { list: 'colours', text: 'You reach for black and taupe. Red stays on the rail.', because: 'From 2 pieces filed', at: '2026-10-16T10:00:00Z', loved: ['black', 'taupe'], rejected: ['red'] },
];
// The twin stub: the server hashes the inputs; the stub does the same
// (any stable hash will do — the contract is "same inputs, same key") and
// answers the twin on file when the key matches, else a job.
const twinKeyOf = b => { const str = JSON.stringify([b.gender, b.facts, b.adj, b.skin, b.hair, b.skinSet, b.hairSet, b.headshotUrl]); let h = 5381; for (let i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0; return 'k' + h.toString(16); };
const HEAD = 'https://res.cloudinary.com/x/image/upload/head.jpg';
const TWIN_SEED = (() => { const inp = { gender: 'woman', facts: { height_cm: null, size_uk: null, bust_band: null, bust_cup: null, bust_cm: null, waist_cm: null, age_band: null }, adj: { shoulders: null, bust: 1, hips: null }, skin: 5, hair: 1, skinSet: false, hairSet: false, headshotUrl: HEAD }; return { url: 'https://res.cloudinary.com/x/image/upload/twin-seed.jpg', key: twinKeyOf(inp) }; })();
const WARDROBE = [
  { id: 'w1', label: 'Black wool blazer', category: 'Outerwear', brand: 'Totême', times_worn: 11, hero_position: 1, image_url: 'https://res.cloudinary.com/x/image/upload/w1.jpg' },
  { id: 'w2', label: 'Ivory silk shirt', category: 'Tops', brand: '', times_worn: 6 },
];

// profile: 'empty' | 'colour' | 'both' | 'full'   extras: { row, draft, path, hash, noNotify, updateMode }
async function open(vp, profile = 'empty', o = {}) {
  const ctx = await browser.newContext({ viewport: vp });
  const p = await ctx.newPage();
  const errs = [], cellPosts = [], briefPosts = [], deletes = [], seasonPosts = [], twinPosts = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.route('**cdn.jsdelivr.net/**', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: '/* stubbed */' }));
  await p.route('**fonts.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await p.route('**/api/avatar/cell', r => { cellPosts.push(r.request().postDataJSON().avatarId); r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url: 'https://res.cloudinary.com/x/image/upload/model-cell.jpg' }) }); });
  await p.route('**/api/avatar/twin', async route => {
    const b = route.request().postDataJSON(); twinPosts.push(b);
    const key = twinKeyOf(b);
    await new Promise(r => setTimeout(r, 80));
    if (b.current && b.current.key === key && b.current.url) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url: b.current.url, key }) });
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ jobId: 'tw' + twinPosts.length, key }) });
  });
  await p.route('**/api/images/*', r => { const id = r.request().url().split('/').pop(); r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ images: ['https://res.cloudinary.com/x/image/upload/twin-' + id + '.jpg'], done: true }) }); });
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
          if (o.updateMode === 'notwin' && patch.twin_url !== undefined) return { error: { message: "Could not find the 'twin_url' column of 'profiles' in the schema cache" } };
          if (o.updateMode === 'nonotify' && patch.notification_prefs !== undefined) return { error: { message: "Could not find the 'notification_prefs' column of 'profiles' in the schema cache" } };
          return { error: null };
        } }),
      }),
    }) };
  }, { profile, o, COLOUR, COLOUR_DNA, SIL, SIL_DNA, WARDROBE });
  await p.goto(`http://localhost:${PORT}/settings${o.path || ''}${o.hash || ''}`);
  await p.waitForTimeout(600);
  const upd = async (pred) => p.evaluate((src) => { const f = new Function('u', 'return ' + src); return window.__updates.filter(f).pop() || null; }, pred);
  return { ctx, p, errs, cellPosts, briefPosts, deletes, seasonPosts, twinPosts, upd };
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
    ok((await p.locator('#tab-style .sp-card').allInnerTexts()).map(t => t.replace(/\s*›\s*$/, '').trim()).join(' | ') === 'Your digital twin | Style DNA | Observations', 'each card prints its title only (G4 · L5) — the third reads Observations (17 Oct)');
    ok(await p.locator('#tab-style .sp-card .k, #tab-style .sp-card .s, #tab-style .sp-card .st').count() === 0, 'no number, no description, no meta line on a card');
    ok(briefPosts.length === 0, 'the Style Profile tab never posts the wardrobe read — OBS_WARDROBE_READ is off (17 Oct)');
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

  console.log(`\n\x1b[1m== ${label} · the twin — empty: the ghost, two doors, the facts ==\x1b[0m`);
  {
    const { ctx, p, errs, twinPosts, upd } = await open(vp, 'empty', { hash: '#twin' });
    ok(await p.locator('#pg-twin').isVisible() && await p.locator('#pg-root').isHidden(), '#twin opens the twin page');
    ok((await p.evaluate(() => document.getElementById('sn-back-label').textContent)) === 'Settings', 'the header ← reads Settings on a page');
    ok((await txt(p, '#sp-hdr-title')) === 'Your Digital Twin' && /One close-up reads your colouring/.test(await txt(p, '#pg-twin .sp-pagesub')), 'titled Your Digital Twin in the header row, the one sub line below — one close-up, the facts');
    ok(await p.locator('#pg-twin .sp-backpill, #pg-twin .eyebrow-rose, #pg-twin .sp-title').count() === 0, 'no second back control, no eyebrow, no italic masthead on the page (G2)');
    ok(await p.locator('#mv-fig-empty').isVisible() && /Your model starts here/.test(await txt(p, '#mv-fig-empty')), 'the ghost figure carries the it-starts line (3D)');
    ok(await p.locator('#full-slot, #full-file, #st2-guide').count() === 0 && !/full.length/i.test(await txt(p, '#pg-twin')), 'the full-length photograph is gone from the page — nothing asks for one');
    ok(await p.locator('#tw-slotscard').isHidden() && await p.locator('#headshot-slot').isHidden(), 'the close-up slot waits inside the Colouring sheet, never on the page');
    ok(await p.locator('#tw-read').isVisible() && await p.locator('#tw-read .sp-row').count() === 2 && await p.locator('#mv-adjust, #mv-shape').count() === 0, 'two doors stand from the start: Colouring and Body shape — no Adjust-by-hand row, no by-hand card');
    ok(/read from your photograph and facts/i.test(await p.locator('#tw-read .sp-gk').innerText()), 'the eyebrow reads: Read from your photograph and facts');
    ok((await txt(p, '#tw-colour-d')) === 'One close-up reads your season.' && (await p.evaluate(() => document.getElementById('tw-colour-v').textContent)) === '', 'Colouring: "One close-up reads your season." and no value');
    ok((await txt(p, '#tw-line-d')) === 'Set your line by hand.' && (await p.evaluate(() => document.getElementById('tw-line-v').textContent)) === '', 'Body shape: "Set your line by hand." and no value');
    ok(await p.locator('#tw-facts-cells .c').count() === 7 && (await p.locator('#tw-facts-cells .c .v.add').count()) === 6 && /Woman/.test(await txt(p, '#tw-facts-cells')), 'seven facts in two strips — Age · Gender, then Height · Size · Bust · Waist · Shoes — six read Add, Gender reads Woman');
    ok(/bust/i.test(await txt(p, '#tw-facts-cells')) && /waist/i.test(await txt(p, '#tw-facts-cells')), 'Bust and Waist are facts now (the labels are CSS-uppercased)');
    ok(twinPosts.length === 0 && await p.locator('.mv-photo').count() === 0, 'nothing drawn before anything exists — no twin asked for');
    ok(await p.locator('#mv-build').isHidden() && await p.locator('#mv-filed').count() === 0, 'no Build a look yet; the ✓ Filed line is gone for good (T6)');
    ok(!/weight/i.test(await txt(p, '#pg-twin')), 'no weight anywhere on the page');
    // Body shape — the figure from the facts, the one read line, three five-stop scales
    await p.click('#tw-row-line'); await p.waitForTimeout(350);
    ok(await p.locator('#sh-wrap').isVisible() && (await txt(p, '#sh-title')) === 'Body shape', 'the Body shape row lifts the Body shape sheet');
    ok(await p.locator('#sh-body svg.tw-fig path').count() === 1 && await p.locator('#sh-body .tw-frow').count() === 4 && (await p.locator('#sh-body .tw-frow .k').allInnerTexts()).map(t => t.trim().toLowerCase()).join(' | ') === 'height | bust | waist | size', 'her proportions: the figure drawn from the facts beside Height · Bust · Waist · Size');
    ok(/Add bust and waist, and Robes reads your line from them\./.test(await txt(p, '#sh-body #tw-readline')), 'the one read line asks for bust and waist');
    ok(await p.locator('#sh-body .tw-scale').count() === 3 && (await p.locator('#sh-body .tw-sc-head .k').allInnerTexts()).map(t => t.trim().toLowerCase()).join(' | ') === 'shoulders | bust | hips', 'Adjust by hand: Shoulders · Bust · Hips');
    ok((await p.locator('#sh-body .tw-scale').first().locator('.tw-stop').count()) === 5 && await p.locator('#sh-body .tw-stop.on').count() === 3 && await p.locator('#sh-body .tw-stop.on[data-v="0"]').count() === 3, 'five stops a scale, the middle one on — "As she is" — on all three');
    ok((await p.locator('#sh-body .tw-sc-row .e').allInnerTexts()).map(t => t.trim()).join(' ') === 'Narrower Broader Smaller Fuller Narrower Fuller', 'the ends read Narrower ↔ Broader, Smaller ↔ Fuller, Narrower ↔ Fuller');
    ok((await txt(p, '#sh-body #tw-phrase')) === 'As she is, from your facts.' && await p.locator('#sh-body #tw-adj-reset').count() === 0 && (await p.locator('#sh-body .tw-sc-head .s').allInnerTexts()).every(t => /your facts/.test(t)), 'as she is, from your facts — no Back-to-your-facts door, every scale sourced "your facts"');
    ok(!/Hourglass|Pear|Rectangle|Apple|Triangle|body type/i.test(await txt(p, '#sh-body')), 'the sheet never names a shape');
    await p.click('#sh-body .tw-stop[data-k="hips"][data-v="2"]'); await p.waitForTimeout(300);
    ok(await p.locator('#sh-body .tw-stop.on[data-k="hips"][data-v="2"]').count() === 1 && (await txt(p, '#sh-body #tw-phrase')) === 'Much fuller hips.' && /by hand/.test((await p.locator('#sh-body .tw-sc-head .s').allInnerTexts()).join(' ')), 'a stop picks: "Much fuller hips.", the scale sourced "by hand"');
    ok(await p.locator('#sh-body #tw-adj-reset').count() === 1, 'Back to your facts appears once a scale is set');
    const u1 = await upd('u.avatar_prefs');
    ok(u1 && u1.avatar_prefs.v === 3 && u1.avatar_prefs.adj.hips === 2 && u1.avatar_prefs.kept === true && u1.avatar_id === 'w-s3-h1-nt', 'the pick files avatar_prefs v3 with the sliders; the catalog id survives as the figure-less fallback: ' + (u1 && u1.avatar_id));
    const before = await p.locator('#mv-fig path').getAttribute('d');
    await p.click('#sh-body .tw-stop[data-k="hips"][data-v="2"]'); await p.waitForTimeout(250);
    ok(await p.locator('#sh-body .tw-stop.on[data-k="hips"][data-v="0"]').count() === 1 && (await p.locator('#mv-fig path').getAttribute('d')) !== before, 'a second tap on the chosen stop hands the axis back to the facts, and the figure on the stage follows');
    await p.click('#sh-body .tw-stop[data-k="bust"][data-v="1"]'); await p.waitForTimeout(250);
    ok(twinPosts.length === 0, 'no twin drawn while the sheet is open — the taps are the preview');
    await p.click('#sh-done'); await p.waitForTimeout(700);
    ok(twinPosts.length === 1 && twinPosts[0].adj.bust === 1 && twinPosts[0].adj.hips === null && twinPosts[0].gender === 'woman' && twinPosts[0].headshotUrl === null && twinPosts[0].skin === 3 && twinPosts[0].hair === 1 && twinPosts[0].skinSet === false, 'Done draws the twin ONCE from the inputs: the sliders, no close-up, the default skin and hair: ' + JSON.stringify(twinPosts[0] || {}).slice(0, 160));
    ok(await p.locator('#mv-figframe .mv-photo-busy').isVisible() && /drawing your model/i.test(await txt(p, '#mv-figframe .mv-photo-busy')), '"Drawing your model…" on the stage while it draws (CSS-uppercased)');
    ok(await p.waitForSelector('.mv-photo', { timeout: 6000 }).then(() => true).catch(() => false) && /twin-tw1\.jpg$/.test(await p.locator('.mv-photo').getAttribute('src')), 'the twin lands on the stage');
    const tw = await upd('u.twin_url');
    ok(tw && /twin-tw1\.jpg$/.test(tw.twin_url) && typeof tw.twin_key === 'string' && tw.twin_key.length > 4, 'and is written onto her row — twin_url + twin_key, by the client');
    ok(await p.locator('#mv-figframe .mv-photo-busy').count() === 0 && !(await p.locator('.mv-photo').evaluate(el => el.classList.contains('stale'))), 'the chip goes, the photograph stands clear');
    ok((await txt(p, '#mv-caption')) === 'Golden · espresso brown hair' && /Shaped by hand/.test(await txt(p, '#mv-status')), 'the caption names the colouring; the status: shaped by hand');
    ok(await p.locator('#mv-build').isVisible() && await p.locator('#pg-twin button').evaluateAll(bs => bs.filter(b => getComputedStyle(b).backgroundColor === 'rgb(32, 32, 33)' && b.getClientRects().length).length) === 1, 'Build a look is the screen’s one ink fill');
    ok((await txt(p, '#tw-line-d')) === 'Set your line by hand.' && (await p.evaluate(() => document.getElementById('tw-line-v').textContent)) === '', 'Body shape still says by hand — no facts, only a slider');
    // reopening changes nothing → no second draw
    await p.click('#tw-row-line'); await p.waitForTimeout(250); await p.click('#sh-done'); await p.waitForTimeout(600);
    ok(twinPosts.length === 1 && await p.locator('.mv-photo').count() === 1 && (await p.evaluate(() => window.__updates.filter(u => u.twin_url).length)) === 1, 'reopen and Done with nothing changed: nothing asked, nothing redrawn, nothing rewritten (the inputs are remembered)');
    ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
    await ctx.close();
  }

  console.log(`\n\x1b[1m== ${label} · the twin — read: the close-up in the Colouring sheet, the twin on the stage ==\x1b[0m`);
  {
    const { ctx, p, errs, twinPosts, seasonPosts, upd } = await open(vp, 'both', { hash: '#twin', row: { headshot_url: HEAD, twin_url: TWIN_SEED.url, twin_key: TWIN_SEED.key } });
    ok(await p.locator('#tw-read').isVisible() && await p.locator('#tw-slotscard').isHidden(), 'the two doors stand; the slot stays off the page');
    ok((await txt(p, '#tw-colour-v')) === 'Soft Autumn' && /Neutral · Low, blended/.test(await txt(p, '#tw-colour-d')), 'Colouring row: the season, undertone · contrast');
    ok((await p.evaluate(() => document.getElementById('tw-line-v').textContent)) === '' && (await txt(p, '#tw-line-d')) === 'Set your line by hand.', 'Body shape row: nothing until a fact is given — the legacy full-length read never prints');
    ok(!/Hourglass/.test(await txt(p, '#pg-twin')), 'the page never names a shape — Robes says what it read, not what she is');
    ok(await p.locator('.mv-photo').count() === 1 && (await p.locator('.mv-photo').getAttribute('src')) === TWIN_SEED.url, 'the twin on file is on the stage from the first paint');
    await p.waitForTimeout(700);
    ok(twinPosts.length === 1 && twinPosts[0].current.key === TWIN_SEED.key && twinPosts[0].headshotUrl === HEAD && twinPosts[0].adj.bust === 1 && twinPosts[0].adj.hips === null, 'the boot asks once with the twin on file — the close-up riding as the face, the legacy line read seeded onto the sliders (Hourglass → a fuller bust): ' + JSON.stringify(twinPosts[0] && twinPosts[0].adj));
    ok((await p.evaluate(() => window.__updates.filter(u => u.twin_url).length)) === 0 && await p.locator('#mv-figframe .mv-photo-busy').count() === 0, 'the server answers with the same twin — nothing redrawn, nothing written');
    ok(await p.locator('#mv-stage-ey').count() === 0 && (await txt(p, '#mv-caption')) === 'Sand · espresso brown hair', 'the stage carries the italic caption alone — read from the close-up (T1)');
    ok(/Read from your close-up/.test(await txt(p, '#mv-status')), 'the status: read from your close-up');
    const u = await upd('u.avatar_id');
    ok(u && u.avatar_id === 'w-s5-h1-nt' && u.avatar_prefs.v === 3 && u.avatar_prefs.adj.bust === 1, 'a read account files on load — prefs v3 carrying the seeded slider');
    // the Colouring sheet — the close-up, the season picker as it was, skin and hair as overrides
    await p.click('#tw-row-colour'); await p.waitForTimeout(350);
    ok(await p.locator('#sh-wrap').isVisible() && (await txt(p, '#sh-title')) === 'Colouring' && /close-up reads your season, skin and hair/.test(await txt(p, '#sh-sub')), 'the Colouring row lifts the Colouring sheet');
    ok((await p.locator('#sh-title').evaluate(el => getComputedStyle(el).fontWeight)) === '300' && (await p.locator('#sh-done').evaluate(el => { const s = getComputedStyle(el); return s.borderTopStyle === 'none' && s.fontSize === '13px' && el.textContent.trim() === 'Done'; })), 'the title Cormorant 300, Done a plain 13px text link (P2)');
    ok((await p.locator('#sh-body').evaluate(el => getComputedStyle(el).scrollbarWidth)) === 'none' && (await p.locator('#sh').evaluate(el => getComputedStyle(el).borderTopStyle)) === 'none', 'no scrollbar on the sheet, no second border behind it (P8)');
    ok(await p.locator('#sh-body #tw-slots').count() === 1 && await p.locator('#sh-body #headshot-slot').isVisible() && await p.locator('#sh-body #headshot-slot img').count() === 1 && await p.locator('#sh-body #full-slot').count() === 0, 'the close-up slot lives inside the sheet with her photograph — and no full-length beside it');
    ok(/^Read/.test(await txt(p, '#sh-body #st1-readline')) && /draws your model from it/.test(await txt(p, '#sh-body')), 'the slot prints its read, and the line says the model is drawn from it');
    ok(await p.locator('#sh-body .sh-opts > .sh-opt').count() === 4 && (await p.locator('#sh-body [data-season] .n').allInnerTexts()).map(t => t.trim()).join(' | ') === 'Soft Autumn | True Autumn | Soft Summer' && (await txt(p, '#sh-body .sh-opt.on .n')) === 'Soft Autumn' && await p.locator('#sh-body #sh-season-more.sh-opt').count() === 1, 'Your season is the four-row picker as it was: the read season selected, its two neighbours on the wheel, Another season (P4 — unchanged)');
    ok(await p.locator('#sh-body .sh-opt.on + .sh-opt-in .mv-sw-row div').count() === 9 && await p.locator('#sh-body .sh-opt.on + .sh-opt-in #sh-door-colour').count() === 1, 'the strip and Full colour notes → sit under the selected row only');
    ok(await p.locator('#sh-body .mvr').count() === 2 && (await p.locator('#sh-body .mvr-k').allInnerTexts()).map(t => t.trim().toLowerCase()).join(' | ') === 'skin | hair' && /Read from your close-up\. Nudge either if it looks off\./.test(await txt(p, '#sh-body')), 'Skin and hair: two rows, overrides on the close-up — "Nudge either if it looks off."');
    ok(await p.locator('#sh-body [data-axis="line"], #sh-body [data-axis="frame"], #sh-body #sh-door-line').count() === 0 && !/full-length/i.test(await txt(p, '#sh-body')), 'no line or frame pills, no line notes door, no full-length anywhere in the sheet');
    ok(/Sand/.test(await txt(p, '#sh-body')) && /Espresso brown/.test(await txt(p, '#sh-body')), 'the swatch names print beside the selected swatch (P7)');
    await p.click('#sh-door-colour'); await p.waitForTimeout(350);
    ok(await p.locator('#mv-notes-wrap').isVisible() && await p.locator('#colour-sections').isVisible() && await p.locator('#palette-grid .g-6 div').count() === 18 && (await txt(p, '#mvn-title')) === 'Colour notes.', 'Full colour notes → the same drawer with all eighteen — untouched');
    await p.click('#mvn-close'); await p.waitForTimeout(200);
    await p.click('#sh-body [data-axis="skin"][data-v="0"]'); await p.waitForTimeout(300);
    ok((await txt(p, '#mv-caption')) === 'Espresso · espresso brown hair' && (await upd('u.avatar_id')).avatar_id === 'w-s0-h1-nt' && (await upd('u.avatar_prefs')).avatar_prefs.skin === 0, 'a skin pick inside the sheet is an override: the caption and the prefs follow, the twin is not yet redrawn');
    ok(twinPosts.length === 1, 'still no second draw while the sheet is open');
    // P4 · a different reading: the picker asks for that season's catalog and lands it as a read
    await p.click('#sh-body #sh-season-more'); await p.waitForTimeout(200);
    ok(await p.locator('#sh-body [data-season]').count() === 12, 'Another season opens the full wheel');
    await p.click('#sh-body [data-season="Dark Autumn"]'); await p.waitForTimeout(500);
    ok(seasonPosts.length === 1 && seasonPosts[0].season === 'Dark Autumn' && seasonPosts[0].current.archetype_name === 'Soft Autumn', 'a pick posts the season with the photograph’s read riding along');
    const chosen = await upd('u.colour_analysis');
    ok(chosen && chosen.season === 'Dark Autumn' && chosen.colour_analysis.chosen === true && chosen.style_dna.color_harmony.archetype_name === 'Dark Autumn', 'the chosen season writes colour_analysis + the DNA fragment, marked chosen');
    ok((await txt(p, '#sh-body .sh-opt.on .n')) === 'Dark Autumn' && (await txt(p, '#tw-colour-v')) === 'Dark Autumn', 'the picker and the row read the new season');
    await p.click('#sh-done'); await p.waitForTimeout(700);
    ok(await p.locator('#sh-wrap').isHidden() && await p.locator('#tw-slotscard #tw-slots').count() === 1 && await p.locator('#tw-slotscard').isHidden(), 'Done closes the sheet; the slot returns to its card, still off the page');
    ok(twinPosts.length === 2 && twinPosts[1].skin === 0 && twinPosts[1].skinSet === true && twinPosts[1].headshotUrl === HEAD, 'Done redraws the twin with the override riding as a set tone, the close-up still the face');
    ok(await p.waitForFunction(() => { const i = document.querySelector('.mv-photo'); return i && /twin-tw2\.jpg$/.test(i.getAttribute('src')); }, null, { timeout: 6000 }).then(() => true).catch(() => false), 'the redrawn twin replaces the old one on the stage');
    ok(/twin-tw2\.jpg$/.test((await upd('u.twin_url')).twin_url), 'and is written onto her row');
    // Body shape carries the legacy seed as a set stop
    await p.click('#tw-row-line'); await p.waitForTimeout(300);
    ok(await p.locator('#sh-body .tw-stop.on[data-k="bust"][data-v="1"]').count() === 1 && (await txt(p, '#sh-body #tw-phrase')) === 'Fuller bust.', 'the legacy line read stands on the bust scale — "Fuller bust." — hers to nudge');
    await p.locator('#sh-wrap').click({ position: { x: 6, y: 6 } }); await p.waitForTimeout(200);
    ok(await p.locator('#sh-wrap').isHidden(), 'the dimmed page closes the sheet');
    ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
    await ctx.close();
  }

  console.log(`\n\x1b[1m== ${label} · the facts — size, never weight; bust and waist; gender writes gender_identity ==\x1b[0m`);
  {
    const { ctx, p, errs, twinPosts, upd } = await open(vp, 'empty', { hash: '#twin' });
    await p.click('#tw-facts'); await p.waitForTimeout(300);
    ok(/^the facts$/i.test(await txt(p, '#sh-title')) && /Size, never weight/.test(await txt(p, '#sh-sub')), 'The facts sheet: size, never weight — the sentence lives here (T5)');
    ok(await p.locator('#sh-body .fx-row').count() === 7 && (await p.locator('#sh-body .fx-k').allInnerTexts()).map(t => t.trim().toLowerCase()).join(' | ') === 'height | size | shoes | bust | waist | age | gender', 'seven rows: Height · Size · Shoes · Bust · Waist · Age · Gender');
    ok(!/weight/i.test(await txt(p, '#sh-body').then(t => t.replace(/Size, never weight/g, ''))), 'no weight anywhere');
    ok(/A soft tape over a thin layer\. Bust at the fullest point, waist at the narrowest\./.test(await txt(p, '#sh-body')), 'the tape line under Bust and Waist');
    ok(await p.locator('#sh-body [data-axis="presence"]').count() === 3 && /Woman/.test(await txt(p, '#sh-body [data-axis="presence"].on')), 'Gender: Woman · Man · Prefer not to say, Woman on file');
    await p.click('#sh-body [data-step="height_cm"][data-dir="1"]'); await p.waitForTimeout(150);
    ok(/169 cm/.test(await txt(p, '#sh-body')) && (await upd('u.style_dna && u.style_dna.facts')).style_dna.facts.height_cm === 169, 'height steps from 168 and writes style_dna.facts');
    await p.click('#sh-body [data-unit="ft"]'); await p.waitForTimeout(150);
    ok(/5′7″/.test(await txt(p, '#sh-body')), 'ft / in reads 5′7″ for 169 cm');
    await p.click('#sh-body [data-step="size_uk"][data-dir="1"]'); await p.waitForTimeout(150);
    ok(/UK 12/.test(await txt(p, '#sh-body')) && /EU 40/.test(await txt(p, '#sh-body')), 'size steps in twos with the EU size beneath');
    await p.click('#sh-body [data-step="shoe_uk"][data-dir="-1"]'); await p.waitForTimeout(150);
    ok(/UK 4\.5/.test(await txt(p, '#sh-body')), 'shoes step in halves');
    ok(await p.locator('#sh-body [data-bust="bra"].on').count() === 1 && await p.locator('#sh-body [data-cup]').count() === 9 && (await p.locator('#sh-body [data-cup]').allInnerTexts()).map(t => t.trim()).join('') === 'AAABCDDDEFG+', 'Bust opens as a bra size: the band stepper and nine cups AA–G+');
    await p.click('#sh-body [data-cup="C"]'); await p.waitForTimeout(150);
    ok(/34/.test(await txt(p, '#sh-body .fx-row:nth-child(4) .fx-step .v')) && /✓\s*C/.test(await txt(p, '#sh-body [data-cup].on')), 'a cup picks and the band starts at 34');
    await p.click('#sh-body [data-step="bust_band"][data-dir="1"]'); await p.waitForTimeout(150);
    const fb = (await upd('u.style_dna && u.style_dna.facts')).style_dna.facts;
    ok(fb.bust_band === 36 && fb.bust_cup === 'C' && fb.bust_mode === 'bra', 'the band steps in twos — 36C on style_dna.facts');
    await p.click('#sh-body [data-bust="cm"]'); await p.waitForTimeout(150);
    ok(await p.locator('#sh-body [data-cup]').count() === 0 && /Add/.test(await txt(p, '#sh-body .fx-row:nth-child(4)')), 'cm takes the cups away and asks for the tape');
    await p.click('#sh-body [data-step="bust_cm"][data-dir="1"]'); await p.waitForTimeout(150);
    ok(/89 cm/.test(await txt(p, '#sh-body .fx-row:nth-child(4)')) && (await upd('u.style_dna && u.style_dna.facts')).style_dna.facts.bust_cm === 89, 'the tape steps from 88 cm');
    await p.click('#sh-body [data-step="waist_cm"][data-dir="1"]'); await p.waitForTimeout(150);
    ok(/71 cm/.test(await txt(p, '#sh-body .fx-row:nth-child(5)')), 'waist steps from 70 cm');
    await p.click('#sh-body [data-waist="in"]'); await p.waitForTimeout(150);
    ok(/28 in/.test(await txt(p, '#sh-body .fx-row:nth-child(5)')), 'in reads 28 in for 71 cm');
    await p.click('#sh-body [data-step="waist_cm"][data-dir="1"]'); await p.waitForTimeout(150);
    ok(/29 in/.test(await txt(p, '#sh-body .fx-row:nth-child(5)')) && (await upd('u.style_dna && u.style_dna.facts')).style_dna.facts.waist_cm === 74, 'in inches the step is an inch — 74 cm underneath');
    await p.click('#sh-body [data-age="45–54"]'); await p.waitForTimeout(150);
    ok(/45–54/.test(await txt(p, '#sh-body [data-age].on')), 'an age chip selects');
    await p.click('#sh-body [data-axis="presence"][data-v="man"]'); await p.waitForTimeout(250);
    ok((await upd('u.gender_identity')).gender_identity === 'man', 'Man writes profiles.gender_identity at once');
    ok(/Man/.test(await txt(p, '#sh-body [data-axis="presence"].on')) && /chest/i.test((await p.locator('#sh-body .fx-k').allInnerTexts()).map(t => t.trim())[3]) && await p.locator('#sh-body [data-bust]').count() === 0, 'and the pill moves; Bust reads Chest for a man, the tape alone');
    await p.click('#sh-done'); await p.waitForTimeout(700);
    ok(/169 cm/.test(await txt(p, '#tw-facts-cells')) && /UK 12/.test(await txt(p, '#tw-facts-cells')) && /89 cm/.test(await txt(p, '#tw-facts-cells')) && /29 in/.test(await txt(p, '#tw-facts-cells')) && /UK 4\.5/.test(await txt(p, '#tw-facts-cells')) && /45–54/.test(await txt(p, '#tw-facts-cells')) && /Man/.test(await txt(p, '#tw-facts-cells')) && /chest/i.test(await txt(p, '#tw-facts-cells')), 'the strips carry the facts: ' + await txt(p, '#tw-facts-cells'));
    const f = (await upd('u.style_dna && u.style_dna.facts')).style_dna.facts;
    ok(f.height_cm === 169 && f.size_uk === 12 && f.shoe_uk === 4.5 && f.age_band === '45–54' && f.bust_cm === 89 && f.waist_cm === 74 && f.weight === undefined, 'style_dna.facts holds the seven, never a weight');
    ok(twinPosts.length === 1 && twinPosts[0].gender === 'man' && twinPosts[0].facts.height_cm === 169 && twinPosts[0].facts.size_uk === 12 && twinPosts[0].facts.bust_cm === 89 && twinPosts[0].facts.bust_band === null && twinPosts[0].facts.waist_cm === 74 && twinPosts[0].facts.age_band === '45–54', 'Done draws the twin from the facts — the tape riding, the bra size dropped once cm was chosen: ' + JSON.stringify(twinPosts[0] && twinPosts[0].facts));
    ok((await txt(p, '#tw-line-v')) === '169 cm · UK 12 · 89 cm' && (await txt(p, '#tw-line-d')) === 'From your facts', 'Body shape reads the facts: "169 cm · UK 12 · 89 cm · From your facts"');
    ok(/Drawn from your facts/.test(await txt(p, '#mv-status')) && /he takes your face/.test(await txt(p, '#mv-status')), 'the status follows the gender: drawn from your facts, add a close-up and he takes your face');
    await p.click('#tw-row-line'); await p.waitForTimeout(300);
    ok(/Chest 15 cm over the waist: chest and waist close in line\./.test(await txt(p, '#sh-body #tw-readline')) && await p.locator('#sh-body .tw-stop.on[data-k="bust"][data-v="0"]').count() === 1, 'the read line for a man: Chest 15 cm over the waist, close in line — the scale seeded at the middle, sourced from the facts: ' + await txt(p, '#sh-body #tw-readline'));
    ok((await p.locator('#sh-body .tw-sc-head .k').allInnerTexts()).map(t => t.trim().toLowerCase()).join(' | ') === 'shoulders | chest | hips' && (await txt(p, '#sh-body #tw-phrase')) === 'As he is, from your facts.', 'for a man the scale reads Chest and the phrase follows the pronoun');
    await p.click('#sh-body #tw-facts-edit'); await p.waitForTimeout(300);
    ok(/^the facts$/i.test(await txt(p, '#sh-title')), 'Edit the facts → opens the facts sheet from the Body shape sheet');
    await p.click('#sh-done'); await p.waitForTimeout(350);
    ok(await p.locator('#sh-wrap').isVisible() && (await txt(p, '#sh-title')) === 'Body shape' && twinPosts.length === 1, 'Done returns to Body shape without a draw — the switch is not a close');
    await p.click('#sh-body .tw-stop[data-k="shoulders"][data-v="-1"]'); await p.waitForTimeout(200);
    await p.click('#sh-done'); await p.waitForTimeout(700);
    ok(twinPosts.length === 2 && twinPosts[1].adj.shoulders === -1, 'closing Body shape after a nudge asks once more, carrying the new stop (a draw still in flight is simply superseded)');
    ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
    await ctx.close();
  }

  console.log(`\n\x1b[1m== ${label} · a fresh close-up reads in the sheet and redraws the twin ==\x1b[0m`);
  {
    const { ctx, p, errs, twinPosts, upd } = await open(vp, 'empty', { hash: '#twin' });
    await p.click('#tw-row-colour'); await p.waitForTimeout(300);
    ok((await txt(p, '#sh-title')) === 'Colouring' && await p.locator('#sh-body #headshot-slot').isVisible() && /Add a close-up and Robes reads your season\./.test(await txt(p, '#sh-body')) && /Or choose them by hand until a close-up reads\./.test(await txt(p, '#sh-body')), 'the empty Colouring sheet: the slot, no season yet, the swatches offered by hand');
    const [chooser] = await Promise.all([p.waitForEvent('filechooser'), p.click('#sh-body #headshot-slot')]);
    await chooser.setFiles(TMP);
    await p.waitForTimeout(1200);
    ok((await txt(p, '#sh-body .sh-opt.on .n')) === 'Soft Autumn' && (await txt(p, '#tw-colour-v')) === 'Soft Autumn', 'a close-up read lands in the sheet and on the row');
    const u = await upd('u.colour_analysis');
    ok(u && u.season === 'Soft Autumn' && u.headshot_url && u.style_dna.color_harmony, 'the read writes colour_analysis + the DNA fragment + the photograph');
    ok((await upd('u.avatar_id')).avatar_id === 'w-s5-h1-nt', 'and files the model from the read');
    ok(u.colour_analysis.read_at && /^Read \d+ [A-Z][a-z]{2}$/.test(await txt(p, '#sh-body #st1-readline')), 'the read stamps its date and the slot prints it — "Read 2 Sep" (P3): ' + await txt(p, '#sh-body #st1-readline'));
    ok(twinPosts.length === 1 && twinPosts[0].headshotUrl === 'https://res.cloudinary.com/x/image/upload/p.jpg' && twinPosts[0].skin === 5 && twinPosts[0].skinSet === false, 'a new close-up is a new face: the twin draws at once from the photograph, skin and hair read from it');
    ok(await p.waitForSelector('.mv-photo', { timeout: 6000 }).then(() => true).catch(() => false), 'the twin lands on the stage behind the sheet');
    ok(/Read from your close-up\. Nudge either if it looks off\./.test(await txt(p, '#sh-body')), 'the swatches now read as overrides on the close-up');
    await p.click('#sh-done'); await p.waitForTimeout(600);
    ok(twinPosts.length === 1 && (await upd('u.twin_url')).twin_key && (await p.evaluate(() => window.__updates.filter(u => u.twin_url).length)) === 1, 'Done with nothing changed since the read asks nothing — the twin just drawn stands');
    ok(/Read from your close-up\. Add your facts/.test(await txt(p, '#mv-status')), 'the status: read from your close-up, add your facts');
    ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
    await ctx.close();
  }

  console.log(`\n\x1b[1m== ${label} · Style DNA — the sheets ==\x1b[0m`);
  {
    const { ctx, p, errs, upd } = await open(vp, 'empty', { hash: '#dna', row: { style_icons: ['The Row', 'Jane Birkin'], budget: 'Everyday, Designer' } });
    ok(await p.locator('#pg-dna').isVisible(), '#dna opens Style DNA');
    ok((await txt(p, '#sp-hdr-title')) === 'Style DNA' && (await txt(p, '#pg-dna .sp-pagesub')) === 'What you love, and the lines you dress by.', 'titled Style DNA in the header row, the masthead now the 12px sub (D1)');
    ok(await p.locator('#pg-dna .sp-group').count() === 2 && await p.locator('#pg-dna .sp-row .chev').count() === 9, 'grouped rows in white cards with chevrons stay (D2) — nine rows with Your colours (19 Oct)');
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
    ok(/popular among stylists/i.test(await txt(p, '#sh-body')) && (await p.locator('#sh-body .sh-pill:not(.on)').allInnerTexts()).slice(0, 3).join() === 'Jil Sander,Totême,Khaite', 'the pool ranks by what she chose: Jil Sander (Sculptural, and Minimal like The Row) leads, then Totême, Khaite (tenth pass)');
    ok(await p.locator('#sh-body .sh-pill:not(.on)').count() === 18 && await p.locator('#sh-body .sh-more-note').count() === 0, 'the wall shows 18 at a time, never all 70, with no pool count beneath (Annie, 9 Oct)');
    ok(await p.locator('#sh-body .sh-pill[data-name="The Row"]').count() === 1, 'a kept name shows once — in her selections, not the pool');
    await p.click('#sh-body .sh-pill[data-name="Loewe"]'); await p.waitForTimeout(250);
    ok((await upd('u.style_dna && u.style_dna.brands')).style_dna.brands.join() === 'The Row,Loewe', 'a tap keeps a brand');
    await p.fill('#sh-body #wall-q', 'Chopova'); await p.waitForTimeout(250);
    ok(await p.locator('#sh-body .sh-pill[data-name="Chopova Lowena"]').count() === 1, 'search finds Liberty’s names in the pool');
    await p.fill('#sh-body #wall-q', 'Chopova Lowena'); await p.waitForTimeout(250);
    ok(await p.locator('#sh-body #wall-add').count() === 0, 'an exact match offers no + Add');
    // the high street is in the pool (17 Oct)
    await p.fill('#sh-body #wall-q', 'Marks'); await p.waitForTimeout(250);
    ok(await p.locator('#sh-body .sh-pill[data-name="Marks & Spencer"]').count() === 1, 'Marks & Spencer is in the brand pool');
    await p.fill('#sh-body #wall-q', 'Penneys'); await p.waitForTimeout(250);
    ok(await p.locator('#sh-body .sh-pill[data-name="Penneys"]').count() === 1 && await p.locator('#sh-body #wall-add').count() === 0, 'Penneys too — an exact match, no + Add');
    const street = ['Marks & Spencer', 'Zara', 'COS', 'Arket', '& Other Stories', 'Uniqlo', 'Mango', 'H&M', 'Dunnes Stores', 'Penneys'];
    const missing = [];
    for (const n of street) { await p.fill('#sh-body #wall-q', n); await p.waitForTimeout(120); if (await p.locator('#sh-body .sh-pill[data-name="' + n + '"]').count() !== 1) missing.push(n); }
    ok(missing.length === 0, 'all ten high-street names answer a search: missing ' + missing.join(', '));
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
    // Your colours (19 Oct): hers to set, loved and never, amended at any time
    ok((await txt(p, '#dna-colours-v')) === 'Not yet', 'Your colours reads Not yet before she picks');
    await p.click('#dna-colours'); await p.waitForTimeout(300);
    ok(/^your colours$/i.test(await txt(p, '#sh-title')) && /outrank what Robes read from your photographs/i.test(await txt(p, '#sh-sub')), 'the sheet says her colours outrank the photograph read');
    ok(await p.locator('#sh-body .sh-pill[data-side="loved"]').count() >= 20 && await p.locator('#sh-body .sh-pill[data-side="rejected"]').count() >= 20, 'two pools — the colours she reaches for, and never');
    await p.click('#sh-body .sh-pill[data-side="loved"][data-colour="Camel"]'); await p.waitForTimeout(250);
    const col = await upd('u.style_dna && u.style_dna.brief && u.style_dna.brief.colours.loved.length');
    ok(col && col.style_dna.brief.colours.loved.join() === 'Camel' && col.style_dna.brief.source === 'edited', 'a tap files Camel under her loved colours');
    await p.click('#sh-body .sh-pill[data-side="rejected"][data-colour="Camel"]'); await p.waitForTimeout(250);
    const col2 = await upd('u.style_dna && u.style_dna.brief && u.style_dna.brief.colours.rejected.length');
    ok(col2 && col2.style_dna.brief.colours.rejected.join() === 'Camel' && col2.style_dna.brief.colours.loved.length === 0, 'the same colour under Never moves it — a colour is never on both lists');
    await p.fill('#sh-body [data-colour-in="loved"]', 'burnt orange'); await p.press('#sh-body [data-colour-in="loved"]', 'Enter'); await p.waitForTimeout(250);
    const col3 = await upd('u.style_dna && u.style_dna.brief && u.style_dna.brief.colours.loved.length');
    ok(col3 && col3.style_dna.brief.colours.loved.join() === 'Burnt orange' && await p.locator('#sh-body .sh-pill.on[data-colour="Burnt orange"]').count() === 1, 'a colour of her own files capitalised and joins the pool as a kept pill');
    await p.click('#sh-done'); await p.waitForTimeout(200);
    ok((await txt(p, '#dna-colours-v')) === 'Burnt orange · never camel', 'the row reads her colours back');
    ok(await p.locator('#dna-noticed').count() === 0, 'no "new from Robes" door on Style DNA (D4)');
    ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
    await ctx.close();
  }

  console.log(`\n\x1b[1m== ${label} · the observations — pending lines from her feedback, the wardrobe read paused ==\x1b[0m`);
  {
    // The lines land in brief.pending from the dashboard (a verdict, a swap pattern, a typed rule) —
    // never from a wardrobe read on this page. Five seeded in the shape the draft used to write.
    const { ctx, p, errs, briefPosts, upd } = await open(vp, 'full', { draft: DRAFT, row: { style_dna: { brief: { pending: PENDING } } } });
    await p.waitForTimeout(500);
    ok(briefPosts.length === 0, 'the root posts no wardrobe read (OBS_WARDROBE_READ is off)');
    ok(await p.locator('#sp-notice').isVisible() && /You reach for a defined waist/.test(await txt(p, '#sp-notice .t')), 'the "Robes noticed" card carries the first pending line');
    ok((await txt(p, '#sp-notice .k')).toLowerCase() === 'observations', 'its eyebrow reads Observations (19 Oct)');
    ok((await p.locator('#sp-notice .t').evaluate(el => getComputedStyle(el).webkitLineClamp)) === '3', 'the card’s line clamps at three lines with an ellipsis (L2)');
    ok((await p.locator('#sp-notice .verbs button').evaluateAll(bs => bs.map(b => b.getAttribute('aria-label').toLowerCase() + ':' + b.querySelectorAll('svg').length + ':' + getComputedStyle(b).borderRadius))).join(' | ') === 'not quite:1:50% | that’s right:1:50%', 'the card’s verbs are two thumb circles — down Not quite, up That’s right (19 Oct), never Keep / Not me');
    ok((await p.locator('#sp-notice .stamp').allInnerTexts()).map(t => t.trim().toLowerCase()).join(' | ') === '✕ not quite | ✓ that’s right', 'the stamps read the same two verbs');
    ok(!/\bkeep\b|not me/i.test(await txt(p, '#sp-notice')), 'nothing on the card says Keep or Not me');
    ok(await p.locator('#tab-style .sp-card .st').count() === 0, 'the cards carry no state lines (G4)');
    // That’s right on the card
    await p.click('#sp-notice [data-v="keep"]'); await p.waitForTimeout(500);
    const k = await upd('u.style_dna && u.style_dna.brief && u.style_dna.brief.loves.length');
    ok(k && k.style_dna.brief.loves[0].text === 'You reach for a defined waist' && k.style_dna.brief.loves[0].source === 'drafted' && k.style_dna.brief.pending.length === 4, 'That’s right files the line under Works and takes it off pending');
    ok(/^\d{4}-\d{2}-\d{2}T/.test(k.style_dna.brief.loves[0].at || ''), 'a kept line carries the date it was kept (O7)');
    ok(/Kept\. Filed under Style DNA\./.test(await txt(p, '#sp-toast')), 'the toast: Kept. Filed under Style DNA.');
    ok(/Anything that reads polite/.test(await txt(p, '#sp-notice .t')), 'the next line takes the card');
    // the drag: past 90px commits
    const box = await p.locator('#sp-notice').boundingBox();
    await p.mouse.move(box.x + 60, box.y + 40); await p.mouse.down(); await p.mouse.move(box.x + 100, box.y + 40); await p.mouse.move(box.x + 180, box.y + 40); await p.mouse.up();
    await p.waitForTimeout(500);
    const k2 = await upd('u.style_dna && u.style_dna.brief && u.style_dna.brief.avoids.length');
    ok(k2 && k2.style_dna.brief.avoids[0].text === 'Anything that reads polite' && k2.style_dna.brief.pending.length === 3, 'a drag to the right agrees with the next line');
    // the page
    await p.click('#card-obs'); await p.waitForTimeout(400);
    ok(await p.locator('#pg-obs').isVisible() && await p.locator('#obs-body .ob').count() === 3, 'the Observations page lists the three still pending');
    ok(briefPosts.length === 0, 'opening the page posts no wardrobe read either');
    ok((await txt(p, '#sp-hdr-title')) === 'Observations' && /From what you keep and change on your looks/.test(await txt(p, '#pg-obs .sp-pagesub')) && !/read from/i.test(await txt(p, '#pg-obs .sp-pagesub')), 'titled Observations in the header row (never Robes Observations), the sub below naming her feedback, not a read');
    ok((await p.locator('#obs-body .ob .k').allInnerTexts()).map(t => t.trim().toLowerCase()).join(' | ') === 'rule | how you dress well | colour', 'each card keeps its category eyebrow (O2)');
    ok((await p.locator('#obs-body .ob .verbs').evaluateAll(vs => vs.map(v => Array.from(v.querySelectorAll('button')).map(b => b.getAttribute('aria-label').toLowerCase()).join(' ')))).every(t => t === 'that’s right not quite'), 'in the list every line carries the thumbs — up That’s right, down Not quite (19 Oct)');
    ok((await p.locator('#obs-body .ob .verbs .keep').first().evaluate(el => { const s = getComputedStyle(el); return s.borderTopStyle === 'solid' && s.width === '40px' && s.height === '40px' && !!el.querySelector('svg'); })) && (await p.locator('#obs-body .ob .verbs .no').first().evaluate(el => { const s = getComputedStyle(el); return s.borderTopStyle === 'solid' && s.width === '40px' && !!el.querySelector('svg'); })), 'both thumbs are 40px hairline circles holding a glyph, never a word (19 Oct)');
    ok((await p.locator('#obs-body .ob .t').first().evaluate(el => getComputedStyle(el).webkitLineClamp)) === '3', 'an observation clamps at three lines (L2)');
    ok(/kept before/i.test(await txt(p, '#obs-body')) && /You reach for a defined waist/.test(await txt(p, '#obs-body')) && /Kept in [A-Z][a-z]+/.test(await p.locator('#obs-body .ln .when').first().innerText()), 'Kept before lists what she kept, dated at the right — "Kept in March" (O7)');
    await p.click('#obs-body [data-no="0"]'); await p.waitForTimeout(400);
    const s = await upd('u.style_dna && u.style_dna.brief && u.style_dna.brief.struck.length');
    ok(s && s.style_dna.brief.struck[0] === 'Loafers only with a cropped trouser' && s.style_dna.memory.entries[0].k === 'strike', 'Not quite strikes the line and the memory records it');
    await p.click('#obs-body [data-keep="0"]'); await p.waitForTimeout(400);
    const nts = await upd('u.style_dna && u.style_dna.brief && u.style_dna.brief.notes');
    ok(nts && /^You dress best.*read as yours\.$/.test(nts.style_dna.brief.notes), 'agreeing with the notes line files the WHOLE paragraph behind its sentence');
    await p.click('#obs-body [data-keep="0"]'); await p.waitForTimeout(400);
    const c = await upd('u.style_dna && u.style_dna.brief && u.style_dna.brief.colours.loved.length');
    ok(c && c.style_dna.brief.colours.loved.join() === 'black,taupe' && c.style_dna.brief.colours.rejected.join() === 'red' && c.style_dna.brief.pending.length === 0, 'agreeing with the colour line lands the colours');
    ok(/Nothing yet\. Robes notes what you keep and change on your looks\./.test(await txt(p, '#obs-body')) && !/keeps reading/.test(await txt(p, '#obs-body')) && await p.locator('#obs-again').count() === 0, 'empty: the new one line — no read implied, no Read again (O6)');
    ok(briefPosts.length === 0, 'and an empty queue still asks the wardrobe for nothing');
    // the Hard nos sheet's pills take the same verb
    await p.evaluate(() => { location.hash = '#dna'; }); await p.waitForTimeout(300);
    ok(await p.locator('#dna-noticed').count() === 0, 'Style DNA carries no Noticed door (D4)');
    ok((await txt(p, '#dna-loves-v')) === '1 line' && (await txt(p, '#dna-avoids-v')) === '1 line', 'the word rows count what she kept');
    ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
    await ctx.close();
  }

  console.log(`\n\x1b[1m== ${label} · the Hard nos sheet — a pending no offers That’s right ==\x1b[0m`);
  {
    const { ctx, p, errs, briefPosts } = await open(vp, 'empty', { hash: '#dna', row: { style_dna: { brief: { pending: [PENDING[1]] } } } });
    await p.click('#dna-avoids'); await p.waitForTimeout(300);
    ok(/robes suggests/i.test(await txt(p, '#sh-body')) && /Anything that reads polite/.test(await txt(p, '#sh-body')), 'Robes suggests lists the pending no');
    ok((await p.locator('#sh-body .sh-pill[data-keep]').allInnerTexts()).map(t => t.trim().toLowerCase()).join() === 'that’s right', 'its pill reads That’s right, never Keep');
    await p.click('#sh-body .sh-pill[data-keep]'); await p.waitForTimeout(300);
    ok(/Anything that reads polite/.test(await txt(p, '#sh-body')) && await p.locator('#sh-body .sh-pill[data-keep]').count() === 0, 'a tap files it under Your nos');
    ok(briefPosts.length === 0 && errs.length === 0, 'no wardrobe read, no page errors: ' + errs.join(' | '));
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
  ok(c.briefPosts.length === 0 && await c.p.locator('#obs-body .ob').count() === 0 && /Nothing yet\. Robes notes what you keep and change on your looks\./.test(await txt(c.p, '#obs-body')), 'and asks the wardrobe for nothing — the new empty line stands (OBS_WARDROBE_READ off)');
  await c.ctx.close();
  const d = await open(vp, 'empty', { path: '?begin=1' });
  ok(await d.p.locator('#pg-root').isVisible() && await d.p.locator('#tab-style').isVisible() && !/begin=/.test(d.p.url()), '?begin=1 (home’s dashed door) lands on Style Profile, the param stripped');
  await d.ctx.close();
  const e = await open(vp, 'empty', { path: '?page=twin&from=email' });
  ok(await e.p.locator('#pg-twin').isVisible() && !/from=|page=/.test(e.p.url()), '?page=twin&from=email (the look_waiting mail) lands on the twin with the params stripped');
  // T3: from home's door card with the style still to come, the model's CTA names the next step and goes straight there
  await e.p.click('#tw-row-colour'); await e.p.waitForTimeout(300);
  await e.p.click('#sh-body [data-axis="skin"][data-v="0"]'); await e.p.waitForTimeout(300);
  await e.p.click('#sh-done'); await e.p.waitForTimeout(1300);
  ok((await txt(e.p, '#mv-build')).toLowerCase() === 'find my style' && await e.p.locator('#mv-home').isVisible(), 'the first run: the model filed → the CTA reads Find my style, Back to home under it (T3)');   // .mv-build is CSS-uppercased
  await e.p.click('#mv-build'); await e.p.waitForTimeout(400);
  ok(await e.p.locator('#sh-wrap').isVisible() && (await e.p.evaluate(() => document.getElementById('sh-wrap').classList.contains('walking'))) && (await txt(e.p, '#sh-walk-title')) === 'Style type', 'Find my style opens the walk in place');
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
  // a stale read_at no longer re-runs the read: the wardrobe read is paused
  const g = await open(vp, 'empty', { draft: DRAFT, row: { style_dna: { brief: { loves: [{ text: 'You reach for a defined waist', source: 'drafted', at: '2026-03-02T10:00:00Z' }], read_at: '2026-01-01T00:00:00Z' } } } });
  await g.p.waitForTimeout(500);
  ok(g.briefPosts.length === 0, 'a stale read_at runs no read — nothing posted (OBS_WARDROBE_READ off)');
  ok((await g.upd('u.style_dna && u.style_dna.brief && u.style_dna.brief.pending')) === null, 'and nothing lands on pending');
  await g.p.click('#card-obs'); await g.p.waitForTimeout(300);
  ok(/Kept in March/.test(await g.p.locator('#obs-body .ln .when').first().innerText()), 'Kept before names the month a line was kept');
  // the × on a kept observation (19 Oct): her call is final — a dated line comes off her Style DNA and is struck
  ok(await g.p.locator('#obs-body .ln [data-unkeep]').count() === 1, 'every kept observation carries a × to remove it');
  await g.p.click('#obs-body .ln [data-unkeep]'); await g.p.waitForTimeout(400);
  const un = await g.upd('u.style_dna && u.style_dna.brief && u.style_dna.brief.struck && u.style_dna.brief.struck.length');
  ok(un && un.style_dna.brief.loves.length === 0 && un.style_dna.brief.struck[0] === 'You reach for a defined waist' && un.style_dna.memory.entries[0].k === 'strike', '× takes the line off Works, strikes it (never drafted again) and the memory records it');
  ok(!/kept before/i.test(await txt(g.p, '#obs-body')) && /Removed from your Style DNA/.test(await txt(g.p, '#sp-toast')), 'Kept before stands down with nothing kept; the toast says it');
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

console.log('\n\x1b[1m== the walk — four cards (?walk=1), full screens on the phone ==\x1b[0m');
for (const [label, vp] of [['desktop', { width: 1280, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const { ctx, p, errs, upd } = await open(vp, 'empty', { path: '?walk=1' });
  await p.waitForTimeout(400);
  const ev = () => p.evaluate(() => window.__events.map(e => e.event_type + ' ' + JSON.stringify(e.metadata)));
  ok(await p.locator('#sh-wrap').isVisible() && !/walk=/.test(p.url()) && (await p.evaluate(() => document.getElementById('sh-wrap').classList.contains('walking'))), label + ': ?walk=1 opens the walk on the sheet, the param stripped');
  ok((await txt(p, '#sh-title')) === 'Style type' && await p.locator('#sh-body .sh-deck-card').count() === 1 && (await p.locator('#sh-deck-card').getAttribute('data-type')) === 'Minimal' && (await txt(p, '#sh-deck-card .k')).toLowerCase() === '1 of 10' && await p.locator('#sh-body [data-type]').count() === 1, label + ': card 1 is the DECK — one type at a time, Minimal first, 1 of 10');
  ok((await p.locator('#sh-deck-card .sh-deck-tag').allInnerTexts()).join() === 'The Row,Phoebe Philo,Lemaire,COS,Jil Sander,Arket,Uniqlo' && await p.locator('#sh-deck-card img').count() === 0 && await p.locator('#sh-body .sh-deck-under').count() === 1, label + ': its houses as brand tags, no stills, the next card peeking beneath');
  ok((await p.locator('#sh-deck-card [data-v]').allInnerTexts()).map(t => t.trim().toLowerCase()).join('|') === '← not me|very me →' && (await txt(p, '#sh-body .sh-deck-soft button')) === 'Sometimes' && await p.locator('#sh-deck-plenty').count() === 0, label + ': Not me · Very me on the card, Sometimes small beneath, no plenty door yet');
  ok(await p.locator('#sh-walk').isVisible() && await p.locator('#sh-walk-segs span').count() === 4 && await p.locator('#sh-walk-segs span.on').count() === 1 && await p.locator('#sh-walk-skip').isVisible() && (await p.locator('#sh-walk-go').textContent()).trim() === 'Continue' && await p.locator('#sh-done').isHidden(), label + ': the four-segment rule, Skip, Continue — no Done link');
  ok((await p.locator('#sh-walk-go').evaluate(el => getComputedStyle(el).backgroundColor)) === 'rgb(255, 255, 255)' && (await p.locator('#sh-body button, #sh-walk button').evaluateAll(bs => bs.filter(b => getComputedStyle(b).backgroundColor === 'rgb(32, 32, 33)' && b.getClientRects().length).length)) === 0, label + ': Continue is a hairline pill — no ink on the walk (G2)');
  // G3: the walk's header row — ← · the card's title, no Later (it duplicated Skip); full screen on the phone
  const head = await p.evaluate(() => { const h = document.getElementById('sh-walkhead'); const sh = document.getElementById('sh'); const r = sh.getBoundingClientRect(); return { shown: !!h && getComputedStyle(h).display === 'grid', back: h?.querySelector('#sh-walk-back')?.textContent.trim(), title: h?.querySelector('#sh-walk-title')?.textContent.trim(), later: h?.querySelector('#sh-walk-later')?.textContent.trim(), sheetTitleHidden: getComputedStyle(document.getElementById('sh-title')).display === 'none', radius: getComputedStyle(sh).borderTopLeftRadius, top: Math.round(r.top), h: Math.round(r.height), vh: window.innerHeight, scrim: getComputedStyle(document.getElementById('sh-wrap')).backgroundColor }; });
  ok(head.shown && head.back === '←' && head.title === 'Style type' && head.later === undefined && await p.locator('#sh-walk-later').count() === 0 && head.sheetTitleHidden, label + ': the header row — ←, the card’s title, no Later — the sheet’s own title standing down: ' + JSON.stringify(head));
  if (vp.width < 768) ok(head.top === 0 && head.h === head.vh && head.radius === '0px' && head.scrim === 'rgb(250, 248, 245)', label + ': a full screen on the phone — no sheet, no scrim, no rounding: ' + JSON.stringify(head));
  ok((await ev()).some(e => /^walk_begun/.test(e)), label + ': walk_begun');
  // Very me by the button, Sometimes by its door, Not me by a drag past 100px
  await p.click('#sh-deck-card [data-v="very"]'); await p.waitForTimeout(400);
  const d1 = await upd('u.style_dna && u.style_dna.style_archetypes');
  ok(d1.style_dna.style_archetypes.join() === 'Minimal' && (await p.locator('#sh-deck-card').getAttribute('data-type')) === 'Bohemian', label + ': Very me writes style_archetypes and the next type steps up');
  ok((await ev()).some(e => /^archetype_reacted \{"name":"Minimal","verdict":"very"\}/.test(e)), label + ': archetype_reacted');
  await p.click('#sh-body .sh-deck-soft button'); await p.waitForTimeout(400);
  const d2 = await upd('u.style_dna && u.style_dna.style_archetypes_soft && u.style_dna.style_archetypes_soft.length');
  ok(d2.style_dna.style_archetypes_soft.join() === 'Bohemian' && d2.style_dna.style_archetypes.join() === 'Minimal' && (await p.locator('#sh-deck-card').getAttribute('data-type')) === 'Classic', label + ': Sometimes writes _soft and keeps very me as it was');
  const writesBefore = await p.evaluate(() => window.__updates.length);
  const box = await p.locator('#sh-deck-card').boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + 40); await p.mouse.down();
  await p.mouse.move(box.x + box.width / 2 - 60, box.y + 40, { steps: 6 });
  const midStamp = await p.locator('#sh-deck-card .stamp.no').evaluate(el => parseFloat(el.style.opacity || '0'));
  await p.mouse.move(box.x + box.width / 2 - 140, box.y + 40, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(400);
  ok(midStamp > 0.4 && midStamp < 0.8 && (await p.locator('#sh-deck-card').getAttribute('data-type')) === 'Romantic', label + ': a drag left fades the ✕ stamp in and past 100px passes the type');
  ok((await p.evaluate(() => window.__updates.length)) === writesBefore, label + ': Not me writes nothing');
  ok(await p.locator('#sh-deck-plenty').count() === 0 && !/plenty/i.test(await txt(p, '#sh-body')), label + ': no plenty door, however many verdicts — Continue is the way on');
  ok(await p.locator('#sh-body .sh-pill.on').count() === 1 && (await txt(p, '#sh-body .sh-pill.on')) === 'Minimal', label + ': the kept types read back under the deck');
  await p.click('#sh-walk-go'); await p.waitForTimeout(300);
  ok((await txt(p, '#sh-walk-title')) === 'Brands' && await p.locator('#sh-walk-segs span').count() === 4 && await p.locator('#sh-walk-segs span.on').count() === 2, label + ': card 2 — Brands on its own, two of four segments lit');
  await p.click('#sh-walk-back'); await p.waitForTimeout(300);
  ok((await txt(p, '#sh-walk-title')) === 'Style type' && await p.locator('#sh-walk-segs span.on').count() === 1, label + ': ← steps back a card');
  await p.click('#sh-walk-go'); await p.waitForTimeout(300);
  ok((await ev()).some(e => /^walk_card \{"n":1,"outcome":"answered"\}/.test(e)), label + ': card 1 logged as answered');
  ok(await p.locator('#walk-tabs').count() === 0 && await p.locator('#sh-body .sh-pill:not(.on)').count() === 18 && (await p.locator('#sh-body .sh-pill:not(.on)').first().innerText()).trim() === 'The Row' && await p.locator('#sh-body .sh-more-note').count() === 0, label + ': no tabs, 18 pills, the picked type’s houses leading, no pool count');
  await p.click('#sh-body .sh-pill[data-name="The Row"]'); await p.waitForTimeout(250);
  ok((await upd('u.style_dna && u.style_dna.brands')).style_dna.brands.join() === 'The Row' && await p.locator('#sh-body .sh-pill:not(.on)').count() === 18 && await p.locator('#wall-suggest').count() === 0 && !/Robes suggests/i.test(await txt(p, '#sh-body')), label + ': a tap keeps a brand and the next name steps in — no Robes suggests row');
  await p.click('#sh-body .sh-pill[data-name="Phoebe Philo"]'); await p.waitForTimeout(200);
  await p.click('#sh-body .sh-pill[data-name="Lemaire"]'); await p.waitForTimeout(250);
  const lead = (await p.locator('#sh-body .sh-pill:not(.on)').allInnerTexts()).slice(0, 2).map(t => t.trim());
  ok(lead.join() === 'COS,Jil Sander' && await p.locator('#wall-suggest').count() === 0 && await p.locator('#sh-body .sh-pill:not(.on)').count() === 18, label + ': what she keeps ranks the pool — the Minimal houses she has not kept rise to the top, in the one list');
  await p.click('#sh-body .sh-pill[data-name="COS"]'); await p.waitForTimeout(250);
  ok((await upd('u.style_dna && u.style_dna.brands')).style_dna.brands.join() === 'The Row,Phoebe Philo,Lemaire,COS' && (await p.locator('#sh-body .sh-pill:not(.on)').first().innerText()).trim() === 'Jil Sander', label + ': a risen name keeps like any other and the next one leads');
  await p.click('#sh-walk-go'); await p.waitForTimeout(300);
  ok((await txt(p, '#sh-walk-title')) === 'Icons' && await p.locator('#sh-walk-segs span.on').count() === 3 && /Clean-girl minimal/.test(await txt(p, '#sh-body')), label + ': card 3 — Icons on its own card, carrying the tags');
  await p.click('#sh-body .sh-pill[data-name="Hailey Bieber"]'); await p.waitForTimeout(250);
  ok((await upd('u.style_icons')).style_icons.join() === 'Hailey Bieber', label + ': an icon kept from the walk');
  await p.click('#sh-walk-go'); await p.waitForTimeout(300);
  ok((await txt(p, '#sh-walk-title')) === 'Musts and hard nos' && (await p.locator('#sh-walk-go').textContent()).trim() === 'Done' && await p.locator('#sh-body [data-chip]').count() === 8 && await p.locator('#sh-walk-segs span.on').count() === 4 && await p.locator('#sh-walk-skip').isVisible(), label + ': card 4 — the musts: eight chips, Done, every segment lit, Skip still there (no investment card, no must — R1)');
  ok(await p.locator('#sh-body [data-level]').count() === 0 && !(await p.evaluate(() => window.__updates.some(u => u.annual_spend))), label + ': the investment level never asked on the walk');
  ok((await p.locator('#sh-body [data-list="avoids"]').evaluateAll(es => es.map(e => e.dataset.chip))).join() === 'Heels,Polo necks,Metals,Sheer,Prints', label + ': the Never chips read bare — Heels, Polo necks, Metals, Sheer, Prints');
  const rows = await p.locator('#sh-body .sh-k').evaluateAll(es => es.map(e => e.textContent.trim()));
  ok(/^Always/.test(rows[0]) && /^Never/.test(rows[1]), label + ': Always above Never');
  await p.click('#sh-body [data-chip="Head covered"]'); await p.waitForTimeout(250);
  const rule = await upd('u.style_dna && u.style_dna.brief');
  ok(rule.style_dna.brief.rules.length === 1 && rule.style_dna.brief.rules[0].text === 'Head covered' && rule.style_dna.brief.rules[0].prompt === 'Head covered' && rule.style_dna.brief.avoids.length === 0, label + ': Head covered files as a RULE Robes keeps, never a no');
  await p.click('#sh-body [data-chip="Heels"]'); await p.waitForTimeout(250);
  ok((await upd('u.style_dna && u.style_dna.brief')).style_dna.brief.avoids[0].text === 'Heels' && await p.locator('#sh-body [data-chip].on').count() === 2, label + ': Heels files as a hard no; both chips warm');
  await p.click('#sh-body [data-chip="Heels"]'); await p.waitForTimeout(250);
  ok((await upd('u.style_dna && u.style_dna.brief')).style_dna.brief.avoids.length === 0, label + ': a second tap strikes it');
  // + Your own: Enter files the line and it lands on the row as a kept pill
  await p.fill('#sh-body input[data-own="avoids"]', 'Logos'); await p.press('#sh-body input[data-own="avoids"]', 'Enter'); await p.waitForTimeout(250);
  ok((await upd('u.style_dna && u.style_dna.brief')).style_dna.brief.avoids.some(x => x.text === 'Logos' && x.source === 'typed') && await p.locator('#sh-body [data-chip="Logos"].on').count() === 1, label + ': + Your own files the line and shows it as a kept pill');
  // …and a line left in the field files when she taps Done instead of Enter
  await p.fill('#sh-body input[data-own="rules"]', 'Long sleeves'); await p.waitForTimeout(100);
  // Done navigates home — carry the writes across the page change to read them
  await p.evaluate(() => addEventListener('pagehide', () => sessionStorage.setItem('__upd', JSON.stringify(window.__updates))));
  await p.click('#sh-walk-go');
  await p.waitForURL('**/dashboard', { timeout: 5000 }).catch(() => {});
  const carried = await p.evaluate(() => JSON.parse(sessionStorage.getItem('__upd') || '[]'));
  ok(carried.filter(u => u.style_dna && u.style_dna.brief).pop()?.style_dna.brief.rules.some(x => x.text === 'Long sleeves'), label + ': a typed line left in the field files on Done');
  ok((await p.evaluate(() => sessionStorage.getItem('rb_walk_done'))) === '1', label + ': Done sets the walk handoff');
  ok(/\/dashboard$/.test(p.url()), label + ': Done always lands home — the twin is driven from its own door there, never the end of the walk');
  ok(errs.length === 0, label + ': no page errors: ' + errs.join(' | '));
  await ctx.close();
}
{
  // Skip on every card but the must; leaving mid-walk is walk_later and stays on Settings
  const { ctx, p, errs } = await open({ width: 1280, height: 900 }, 'empty', { path: '?walk=1' });
  await p.waitForTimeout(400);
  await p.click('#sh-walk-skip'); await p.waitForTimeout(250);
  ok((await txt(p, '#sh-walk-title')) === 'Brands' && (await p.evaluate(() => window.__events.some(e => e.event_type === 'walk_card' && e.metadata.n === 1 && e.metadata.outcome === 'skipped'))), 'Skip moves on and logs the card as skipped');
  await p.keyboard.press('Escape'); await p.waitForTimeout(250);
  ok(await p.locator('#sh-wrap').isHidden() && await p.locator('#pg-root').isVisible() && (await p.evaluate(() => window.__events.some(e => e.event_type === 'walk_later' && e.metadata.n === 2))), 'Escape leaves the walk on Settings and logs walk_later with the card');
  ok((await p.evaluate(() => sessionStorage.getItem('rb_walk_done'))) === null, 'no handoff without Done');
  // the chips sit on the Settings word sheets too
  await p.click('#card-dna'); await p.waitForTimeout(300);
  await p.click('#dna-avoids'); await p.waitForTimeout(300);
  ok(await p.locator('#sh-body [data-chip]').count() === 5 && /^Never/.test((await p.locator('#sh-body .sh-k').first().textContent()).trim()), 'Hard nos in Settings carries the Never chips');
  // Settings' own Style type sheet is still the multi-select — the deck lives on the walk alone
  await p.keyboard.press('Escape'); await p.waitForTimeout(250);
  await p.click('#dna-type'); await p.waitForTimeout(300);
  ok(await p.locator('#sh-body [data-type]').count() === 10 && await p.locator('#sh-body .sh-deck-card').count() === 0, 'Settings keeps the ten as a multi-select sheet, no deck');
  ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
  await ctx.close();
}
{
  // every type already decided → the walk opens straight on Brands (no
  // summary screen); ← steps back to the deck on all ten; ← again is home
  const { ctx, p, errs } = await open({ width: 390, height: 844 }, 'empty', { path: '?walk=1', row: { style_dna: { style_archetypes: ['Minimal', 'Bohemian', 'Classic', 'Romantic', 'Sculptural', 'Utility', 'Heritage', 'Eclectic'], style_archetypes_soft: ['Off-duty', 'Avant-garde'] } } });
  await p.waitForTimeout(400);
  ok((await txt(p, '#sh-walk-title')) === 'Brands' && await p.locator('#sh-deck-card').count() === 0 && await p.locator('#sh-deck-again').count() === 0 && /Choose at least three\./.test(await txt(p, '#sh-sub')), 'every type decided → the walk opens on Brands, "Choose at least three." — no end-state summary');
  await p.click('#sh-walk-back'); await p.waitForTimeout(300);
  ok(await p.locator('#sh-deck-card').count() === 1 && (await p.locator('#sh-deck-card').getAttribute('data-type')) === 'Minimal' && (await txt(p, '#sh-deck-card .k')).toLowerCase() === '1 of 10', '← from Brands opens the deck on all ten');
  await p.click('#sh-walk-back');
  await p.waitForURL('**/dashboard', { timeout: 5000 }).catch(() => {});
  ok(/\/dashboard$/.test(p.url()), '← on the first card lands home');
  ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
  await ctx.close();
}
{
  // the last undecided type answered → straight on to Brands
  const { ctx, p, errs } = await open({ width: 1280, height: 900 }, 'empty', { path: '?walk=1', row: { style_dna: { style_archetypes: ['Minimal', 'Bohemian', 'Classic', 'Romantic', 'Sculptural', 'Utility', 'Heritage', 'Eclectic'], style_archetypes_soft: ['Off-duty'] } } });
  await p.waitForTimeout(400);
  ok((await p.locator('#sh-deck-card').getAttribute('data-type')) === 'Avant-garde', 'one type left → the deck opens on it');
  await p.click('#sh-deck-card [data-v="no"]'); await p.waitForTimeout(500);
  ok((await txt(p, '#sh-walk-title')) === 'Brands' && await p.locator('#sh-walk-segs span.on').count() === 2 && await p.locator('#sh-body .sh-empty').count() === 0, 'the deck run out goes straight to Brands');
  ok(errs.length === 0, 'no page errors: ' + errs.join(' | '));
  await ctx.close();
}

console.log('\n\x1b[1m== degrade — the columns a migration adds ==\x1b[0m');
{
  const vp = { width: 1280, height: 900 };
  const a = await open(vp, 'colour', { hash: '#twin', updateMode: 'nocol', row: { headshot_url: HEAD } });
  await a.p.waitForTimeout(300);
  ok(await a.p.locator('#mv-build').isVisible() && !!(await a.p.evaluate(() => localStorage.getItem('rb_model__u1'))), 'avatar columns missing: the model files locally, Build a look still stands');
  await a.p.click('#tw-row-colour'); await a.p.waitForTimeout(300);
  await a.p.click('#sh-body [data-axis="hair"][data-v="4"]'); await a.p.waitForTimeout(300);
  ok((await a.p.evaluate(() => window.__updates.filter(u => u.avatar_id).length)) === 1, 'after one refusal no avatar write is retried this session');
  ok(a.errs.length === 0, 'no page errors');
  await a.ctx.close();
  const t = await open(vp, 'colour', { hash: '#twin', updateMode: 'notwin', row: { headshot_url: HEAD } });
  ok(await t.p.waitForSelector('.mv-photo', { timeout: 6000 }).then(() => true).catch(() => false) && !!(await t.p.evaluate(() => localStorage.getItem('rb_twin__u1'))), 'twin columns missing (migration 26 not run): the twin still draws and stands on the stage, kept locally');
  await t.p.click('#tw-row-colour'); await t.p.waitForTimeout(300);
  await t.p.click('#sh-body [data-axis="hair"][data-v="4"]'); await t.p.waitForTimeout(200);
  await t.p.click('#sh-done'); await t.p.waitForTimeout(900);
  ok((await t.p.evaluate(() => window.__updates.filter(u => u.twin_url !== undefined).length)) === 1, 'after one refusal no twin write is retried this session');
  ok(t.errs.length === 0, 'no page errors');
  await t.ctx.close();
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
