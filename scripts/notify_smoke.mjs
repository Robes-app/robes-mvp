// Robes — notify smoke (funnel slice 6). Runs notifyTick() against a fake
// Supabase REST + auth admin + Resend served over HTTP, then spawns the
// real server.js against the same fake for /api/health, the unsub route
// and the NOTIFY_DEBUG tick door. No network, no keys.
//   node scripts/notify_smoke.mjs
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createNotifier, localParts, isoWeek, gapName, listWords } from '../notify.js';

const results = [];
const check = (name, pass, detail = '') => { results.push({ name, pass, detail }); };
const DAY = 86400000;
const NOW = new Date('2026-09-21T09:30:00Z');       // 10:30 Dublin · 02:30 Los Angeles
const ago = (ms) => new Date(NOW.getTime() - ms).toISOString();

/* ── the fake project ─────────────────────────────────────────── */
const db = {
  profiles: [
    { id: 'aaaaaaaa-0000-4000-8000-000000000001', first_name: 'Fresh', created_at: ago(2 * 3600000), avatar_id: null, notification_prefs: {} },
    { id: 'aaaaaaaa-0000-4000-8000-000000000002', first_name: 'Bea', created_at: ago(2 * DAY), avatar_id: null, notification_prefs: { nudges: true, looks_ready: true, timezone: 'Europe/Dublin' } },
    { id: 'aaaaaaaa-0000-4000-8000-000000000003', first_name: 'Cara', created_at: ago(10 * DAY), avatar_id: null, notification_prefs: { nudges: false } },
    { id: 'aaaaaaaa-0000-4000-8000-000000000004', first_name: 'Dee', created_at: ago(30 * DAY), avatar_id: 'w-s3-h1-hg-fr', notification_prefs: { morning: true, morning_hour: 7, timezone: 'America/Los_Angeles' } },
    { id: 'aaaaaaaa-0000-4000-8000-000000000005', first_name: 'Eve', created_at: ago(30 * DAY), avatar_id: 'w-s3-h1-hg-fr', notification_prefs: { morning: true, morning_hour: 10, timezone: 'Europe/Dublin' } },
    { id: 'aaaaaaaa-0000-4000-8000-000000000006', first_name: 'Fay', created_at: ago(30 * DAY), avatar_id: 'w-s3-h1-hg-fr', notification_prefs: { nudges: true } },
    { id: 'aaaaaaaa-0000-4000-8000-000000000007', first_name: 'Gem', created_at: ago(30 * DAY), avatar_id: 'w-s3-h1-hg-fr', notification_prefs: { nudges: true, timezone: 'Europe/Dublin' } },
  ],
  users: [
    ['aaaaaaaa-0000-4000-8000-000000000001', 'fresh@t.co'], ['aaaaaaaa-0000-4000-8000-000000000002', 'bea@t.co'],
    ['aaaaaaaa-0000-4000-8000-000000000003', 'cara@t.co'], ['aaaaaaaa-0000-4000-8000-000000000004', 'dee@t.co'],
    ['aaaaaaaa-0000-4000-8000-000000000005', 'eve@t.co'], ['aaaaaaaa-0000-4000-8000-000000000006', 'fay@t.co'],
    ['aaaaaaaa-0000-4000-8000-000000000007', 'gem@t.co'],
  ].map(([id, email]) => ({ id, email })),
  notifications: [],
  events: [],
  wardrobe_items: [
    // Fay: six photographed pieces, the fifth two days ago → `five`
    ...[0, 1, 2, 3, 4, 5].map((i) => ({ user_id: 'aaaaaaaa-0000-4000-8000-000000000006', image_url: 'https://img.test/f' + i + '.jpg', created_at: ago((10 - i) * DAY) })),
    { user_id: 'aaaaaaaa-0000-4000-8000-000000000002', image_url: 'https://img.test/b0.jpg', created_at: ago(DAY) },
    { user_id: 'aaaaaaaa-0000-4000-8000-000000000003', image_url: 'https://img.test/c0.jpg', created_at: ago(DAY) },
  ],
  lookbook_items: [
    { id: 1758400000000, user_id: 'aaaaaaaa-0000-4000-8000-000000000001', type: 'key-piece', title: 'acid green cropped jumper', created_at: ago(3600000),
      data: { kpData: { generatedImages: ['https://img.test/k1.jpg', 'https://img.test/k2.jpg', 'https://img.test/k3.jpg'] } } },
    { id: 1758300000000, user_id: 'aaaaaaaa-0000-4000-8000-000000000003', type: 'key-piece', title: 'a coat', created_at: ago(3600000),
      data: { kpData: { generatedImages: ['https://img.test/c1.jpg', 'https://img.test/c2.jpg', 'https://img.test/c3.jpg'] } } },
    { id: 1758200000000, user_id: 'aaaaaaaa-0000-4000-8000-000000000004', type: 'daily-look', title: 'Office', created_at: ago(DAY),
      data: { dlData: { context: { city: 'Dublin', tempRange: '13–19°C', condition: 'passing showers' } } } },
  ],
  looks: [
    { id: 'bbbbbbbb-0000-4000-8000-000000000001', user_id: 'aaaaaaaa-0000-4000-8000-000000000002', name: 'A Parisian night out', created_at: ago(DAY), render_url: null, photo_url: 'https://img.test/look-b.jpg',
      proposals: [{ role: 'The Texture', chip: 'Jacket', opts: [{ name: 'Wool blazer' }], oi: 0 }, { role: 'The Anchor', chip: 'Trousers', opts: [{ name: 'Tailored trousers' }], oi: 0 }, { role: 'The Exclamation Point', chip: 'Shoes', opts: [{ name: 'Loafers' }], oi: 0 }],
      look_pieces: [] },
    { id: 'bbbbbbbb-0000-4000-8000-000000000003', user_id: 'aaaaaaaa-0000-4000-8000-000000000003', name: 'Cara look', created_at: ago(DAY), render_url: null, photo_url: null, proposals: [{}, {}], look_pieces: [] },
    { id: 'bbbbbbbb-0000-4000-8000-000000000004', user_id: 'aaaaaaaa-0000-4000-8000-000000000004', name: 'The Thursday one', created_at: ago(5 * DAY), render_url: 'https://img.test/render-d.jpg', photo_url: null, proposals: null, look_pieces: [] },
    { id: 'bbbbbbbb-0000-4000-8000-000000000006', user_id: 'aaaaaaaa-0000-4000-8000-000000000006', name: 'Fay look', created_at: ago(5 * DAY), render_url: null, photo_url: null, proposals: null,
      look_pieces: [{ wardrobe_items: { image_url: 'https://img.test/f0.jpg' } }] },
    { id: 'bbbbbbbb-0000-4000-8000-000000000007', user_id: 'aaaaaaaa-0000-4000-8000-000000000007', name: 'Gem look', created_at: ago(20 * DAY), render_url: null, photo_url: null, proposals: null, look_pieces: [] },
  ],
  planned_days: [
    { user_id: 'aaaaaaaa-0000-4000-8000-000000000004', day_date: '2026-09-21', source_type: 'look', source_id: 'bbbbbbbb-0000-4000-8000-000000000004', slot: 'day', activity: 'dinner with mum', headline: null, thumb_urls: [], status: 'planned' },
    { user_id: 'aaaaaaaa-0000-4000-8000-000000000004', day_date: '2026-09-21', source_type: 'daily', source_id: '1758200000000', slot: 'evening', activity: 'Office', headline: 'Office, softened', thumb_urls: ['https://img.test/d-e.jpg'], status: 'planned' },
    { user_id: 'aaaaaaaa-0000-4000-8000-000000000005', day_date: '2026-09-21', source_type: 'day', source_id: 'day:2026-09-21', slot: 'day', activity: 'board meeting', headline: null, thumb_urls: [], status: 'planned' },
  ],
};
let resendMode = 'ok';
const resendCalls = [];

function applyFilters(rows, params) {
  let out = rows;
  for (const [k, v] of params) {
    if (['select', 'order', 'limit', 'on_conflict'].includes(k)) continue;
    const m = /^(eq|gte|lte|in)\.(.*)$/s.exec(v);
    if (!m) continue;
    const [, op, raw] = m;
    out = out.filter((r) => {
      const x = r[k];
      if (op === 'eq') return String(x) === raw;
      if (op === 'gte') return String(x) >= raw;
      if (op === 'lte') return String(x) <= raw;
      if (op === 'in') return raw.replace(/^\(|\)$/g, '').split(',').includes(String(x));
      return true;
    });
  }
  return out;
}
const fake = createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    const json = (status, obj) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(obj === undefined ? '' : JSON.stringify(obj)); };
    if (u.pathname === '/resend') {
      resendCalls.push(JSON.parse(body));
      if (resendMode === 'fail') return json(500, { message: 'boom' });
      return json(200, { id: 're_' + resendCalls.length });
    }
    if (u.pathname === '/auth/v1/admin/users') return json(200, { users: db.users });
    const mt = /^\/rest\/v1\/([a-z_]+)$/.exec(u.pathname);
    if (!mt) return json(404, {});
    const table = mt[1];
    const rows = db[table];
    if (!rows) return json(404, { code: 'PGRST205', message: `relation ${table} missing` });
    const sel = u.searchParams.get('select') || '*';
    if (req.method === 'GET') {
      if (table === 'looks' && /look_pieces/.test(sel) && process.env.SMOKE_NO_EMBED) return json(400, { message: "Could not find a relationship between 'looks' and 'look_pieces'" });
      const cols = sel === '*' ? null : sel.split(',').map((c) => c.split('(')[0]);
      let out = applyFilters(rows, u.searchParams);
      if (u.searchParams.get('order') === 'created_at.desc' || u.searchParams.get('order') === 'sent_at.desc') {
        const k = u.searchParams.get('order').split('.')[0];
        out = out.slice().sort((a, b) => String(b[k]).localeCompare(String(a[k])));
      }
      if (cols) out = out.map((r) => Object.fromEntries(cols.map((c) => [c, r[c]])));
      return json(200, out);
    }
    if (req.method === 'POST') {
      const row = JSON.parse(body);
      if (table === 'notifications' && rows.some((r) => r.user_id === row.user_id && r.kind === row.kind && r.ref === row.ref))
        return json(409, { code: '23505', message: 'duplicate key value violates unique constraint' });
      rows.push({ ...row, sent_at: row.sent_at || NOW.toISOString(), created_at: NOW.toISOString() });
      return json(201, undefined);
    }
    if (req.method === 'DELETE') {
      const gone = applyFilters(rows, u.searchParams);
      db[table] = rows.filter((r) => !gone.includes(r));
      return json(204, undefined);
    }
    if (req.method === 'PATCH') {
      const patch = JSON.parse(body);
      applyFilters(rows, u.searchParams).forEach((r) => Object.assign(r, patch));
      return json(204, undefined);
    }
    json(405, {});
  });
});
await new Promise((r) => fake.listen(0, '127.0.0.1', r));
const FAKE = `http://127.0.0.1:${fake.address().port}`;

const notifier = createNotifier({
  supaUrl: FAKE, serviceKey: 'svc', resendKey: 're_test', secret: 'shh', publicUrl: 'https://beta.byrobes.com',
  resendUrl: FAKE + '/resend', env: 'beta', log: { warn() {}, log() {} },
});
const sentKinds = (r) => r.sent.map((s) => s.kind + ':' + s.user.slice(-1)).sort();
const byUser = (uid) => resendCalls.filter((c) => c.to[0] === db.users.find((x) => x.id === uid).email);

/* ── helpers ────────────────────────────────────────────────── */
check('localParts · Los Angeles reads 02:30 for 09:30Z', localParts(NOW, 'America/Los_Angeles').hour === 2 && localParts(NOW, 'America/Los_Angeles').date === '2026-09-21');
check('localParts · Dublin reads 10:30', localParts(NOW, 'Europe/Dublin').hour === 10);
check('localParts · an unknown zone falls back, never throws', localParts(NOW, 'Mars/Olympus').hour === 10);
check('isoWeek · 21 Sep 2026 is W39, 4 Jan 2027 is 2027-W01', isoWeek('2026-09-21') === '2026-W39' && isoWeek('2027-01-04') === '2027-W01', isoWeek('2026-09-21') + ' ' + isoWeek('2027-01-04'));
check('gapName · article unless plural', gapName({ opts: [{ name: 'Wool blazer' }], oi: 0 }) === 'a wool blazer' && gapName({ chip: 'Trousers' }) === 'trousers' && gapName({ opts: [{ name: 'Overshirt' }], oi: 0 }) === 'an overshirt');
check('listWords · the oxford-less list', listWords(['a jacket', 'trousers', 'shoes']) === 'a jacket, trousers and shoes');
check('an unconfigured notifier is off and sends nothing',
  !createNotifier({ supaUrl: FAKE, serviceKey: 'svc', resendKey: '', secret: 'x' }).on);

/* ── tick 1: 09:30Z on the 21st ─────────────────────────────── */
const r1 = await notifier.notifyTick(NOW);
check('tick 1 · no error', !r1.error, String(r1.error));
// Fresh (1): nudges unset, but the looks-ready mail is transactional and her frames landed.
// Bea (2): nudges on, 2 days in, no model, a look → look_waiting; borrowing waits (72h) and would be capped anyway.
// Cara (3): nudges FALSE → nothing, even with frames landed? No — looks_ready is transactional and reads !== false → sends.
// Dee (4): morning at 7 LA — it is 02:30 there → not yet. Eve (5): morning at 10 Dublin — 10:30 → fires.
// Fay (6): five photographed pieces, the fifth 6 days ago, no build opened → five.
// Gem (7): 30 days in, a look, nothing planned → week_empty.
check('tick 1 · one mail per candidate, the right rule each',
  JSON.stringify(sentKinds(r1)) === JSON.stringify(['five:6', 'look_waiting:2', 'looks_ready:1', 'looks_ready:3', 'morning:5', 'week_empty:7']), JSON.stringify(sentKinds(r1)));
check('tick 1 · the ledger holds one row per send, written before the send', db.notifications.length === 6 && resendCalls.length === 6, db.notifications.length + '/' + resendCalls.length);
await new Promise((r) => setTimeout(r, 200));   // the event insert is fire-and-forget
check('tick 1 · email_sent events landed with kind + ref', db.events.filter((e) => e.event_type === 'email_sent').length === 6 && db.events.every((e) => e.metadata.kind && e.metadata.ref));

const fresh = byUser('aaaaaaaa-0000-4000-8000-000000000001')[0];
check('looks_ready · subject, the piece capitalised, three frames, the Inspiration deep link with ?open + from=email',
  fresh && fresh.subject === 'Your three looks are ready.' && /Acid green cropped jumper/.test(fresh.html) && (fresh.html.match(/img\.test\/k\d\.jpg/g) || []).length === 3
    && /https:\/\/beta\.byrobes\.com\/inspiration\?open=1758400000000&amp;from=email/.test(fresh.html) && /\/inspiration\?open=1758400000000&from=email/.test(fresh.text),
  fresh && fresh.subject);
check('looks_ready · List-Unsubscribe headers + a signed unsub link naming the looks_ready pref',
  fresh && /^<https:\/\/beta\.byrobes\.com\/api\/notify\/unsub\?t=aaaaaaaa-0000-4000-8000-000000000001\.looks_ready\.[0-9a-f]{40}>$/.test(fresh.headers['List-Unsubscribe'])
    && fresh.headers['List-Unsubscribe-Post'] === 'List-Unsubscribe=One-Click' && /Stop these emails/.test(fresh.text), fresh && fresh.headers['List-Unsubscribe']);
check('looks_ready · plain-text alternative always', fresh && typeof fresh.text === 'string' && /worn three ways/.test(fresh.text));
const bea = byUser('aaaaaaaa-0000-4000-8000-000000000002')[0];
check('look_waiting · "She’d wear it.", the look named, her photograph as the frame, the model deep link',
  bea && bea.subject === 'She’d wear it.' && /A Parisian night out/.test(bea.html) && /img\.test\/look-b\.jpg/.test(bea.html) && /\/stylenotes\?from=email/.test(bea.html), bea && bea.subject);
check('look_waiting · unsub link flips the nudges pref, not looks_ready', bea && /\.nudges\.[0-9a-f]{40}>$/.test(bea.headers['List-Unsubscribe']));
const fay = byUser('aaaaaaaa-0000-4000-8000-000000000006')[0];
check('five · the composer deep link with the Robes build armed', fay && fay.subject === 'Robes can build from yours now.' && /\/lookbook\?new=1&amp;robes=1&amp;from=email/.test(fay.html));
const gem = byUser('aaaaaaaa-0000-4000-8000-000000000007')[0];
check('week_empty · ref is the ISO week, the diary deep link', gem && gem.subject === 'Nothing planned this week.' && db.notifications.some((n) => n.kind === 'week_empty' && n.ref === '2026-W39') && /\/diary\?from=email/.test(gem.html));
const eve = byUser('aaaaaaaa-0000-4000-8000-000000000005')[0];
check('morning · Eve at 10 Dublin: "Monday · board meeting", the day link, the quiet wore-it line, no weather asserted',
  eve && eve.subject === 'Monday · board meeting' && /\/dashboard\?d=2026-09-21&amp;from=email/.test(eve.html) && /Wore it\? The day page takes it\./.test(eve.text) && !/°C/.test(eve.html), eve && eve.subject);
check('morning · Dee at 7 LA does not fire at 02:30 her time', byUser('aaaaaaaa-0000-4000-8000-000000000004').length === 0);
check('nudges gate · Cara (nudges:false) got the transactional mail and NOT the borrowing nudge her look qualifies for',
  byUser('aaaaaaaa-0000-4000-8000-000000000003').length === 1 && byUser('aaaaaaaa-0000-4000-8000-000000000003')[0].subject === 'Your three looks are ready.');

/* ── tick 2: same instant again → nothing new ───────────────── */
const r2 = await notifier.notifyTick(NOW);
check('tick 2 · a re-tick at the same instant sends nothing', r2.sent.length === 0 && resendCalls.length === 6 && db.notifications.length === 6, JSON.stringify(sentKinds(r2)));

/* ── tick 3: three hours later, still the 21st → the daily cap holds ── */
const r3 = await notifier.notifyTick(new Date(NOW.getTime() + 3 * 3600000));
check('tick 3 · the one-mail-per-day cap: Bea qualifies for borrowing but was mailed today', !r3.sent.some((s) => s.user.endsWith('2')), JSON.stringify(sentKinds(r3)));

/* ── tick 4: the 22nd at 14:30Z (07:30 LA) → borrowing for Bea, Dee's morning cue with her filed weather ── */
const T4 = new Date('2026-09-22T14:30:00Z');
db.planned_days.push({ user_id: 'aaaaaaaa-0000-4000-8000-000000000004', day_date: '2026-09-22', source_type: 'daily', source_id: '1758200000000', slot: 'day', activity: 'Office', headline: 'Office, softened', thumb_urls: ['https://img.test/d-e.jpg'], status: 'planned' });
const r4 = await notifier.notifyTick(T4);
check('tick 4 · the next day Bea gets borrowing (72h), not look_waiting again', JSON.stringify(sentKinds(r4).filter((k) => k.endsWith(':2'))) === JSON.stringify(['borrowing:2']), JSON.stringify(sentKinds(r4)));
const beaB = byUser('aaaaaaaa-0000-4000-8000-000000000002')[1];
check('borrowing · "three things", the gaps named, the fill deep link',
  beaB && beaB.subject === 'Robes is borrowing three things.' && /borrows a wool blazer, tailored trousers and loafers\./.test(beaB.text)
    && /\/lookbook\?open=bbbbbbbb-0000-4000-8000-000000000001&amp;fill=1&amp;from=email/.test(beaB.html), beaB && beaB.text);
const dee = byUser('aaaaaaaa-0000-4000-8000-000000000004')[0];
check('morning · Dee fires at 07:30 LA with the daily look and the forecast it FILED',
  dee && dee.subject === 'Tuesday · Office' && /Wearing Office, softened\./.test(dee.text) && /Dublin · 13–19°C · passing showers/.test(dee.text) && /img\.test\/d-e\.jpg/.test(dee.html), dee && dee.text);
check('week_empty · not again within 14 days for Gem (Fay, mailed `five` yesterday, earns hers today)', !r4.sent.some((s) => s.kind === 'week_empty' && s.user.endsWith('7')) && r4.sent.some((s) => s.kind === 'week_empty' && s.user.endsWith('6')), JSON.stringify(sentKinds(r4)));
check('morning · Eve does not fire twice for one date, and not at 15:30 her time', byUser('aaaaaaaa-0000-4000-8000-000000000005').length === 1);

/* ── transport failure gives the ledger row back ────────────── */
resendMode = 'fail';
db.profiles.push({ id: 'aaaaaaaa-0000-4000-8000-000000000008', first_name: 'Hal', created_at: ago(3600000), avatar_id: null, notification_prefs: {} });
db.users.push({ id: 'aaaaaaaa-0000-4000-8000-000000000008', email: 'hal@t.co' });
db.lookbook_items.push({ id: 1758500000000, user_id: 'aaaaaaaa-0000-4000-8000-000000000008', type: 'key-piece', title: 'boots', created_at: ago(1000), data: { kpData: { generatedImages: ['https://img.test/1.jpg', 'https://img.test/2.jpg', 'https://img.test/3.jpg'] } } });
const r5 = await notifier.notifyTick(T4);
check('transport · a failed Resend send is not counted and its ledger row is removed', r5.sent.length === 0 && !db.notifications.some((n) => n.user_id.endsWith('8')), JSON.stringify(sentKinds(r5)));
resendMode = 'ok';
const r6 = await notifier.notifyTick(T4);
check('transport · the next tick retries it', sentKinds(r6).includes('looks_ready:8'), JSON.stringify(sentKinds(r6)));

/* ── a stale key piece never mails "ready" ──────────────────── */
db.lookbook_items.push({ id: 1750000000000, user_id: 'aaaaaaaa-0000-4000-8000-000000000007', type: 'key-piece', title: 'old', created_at: ago(30 * DAY), data: { kpData: { generatedImages: ['https://img.test/1.jpg', 'https://img.test/2.jpg', 'https://img.test/3.jpg'] } } });
const r7 = await notifier.notifyTick(T4);
check('looks_ready · a key piece older than 48h never mails (first-deploy safety)', !r7.sent.some((s) => s.kind === 'looks_ready' && s.user.endsWith('7')));

/* ── unsub tokens ───────────────────────────────────────────── */
const tok = notifier.unsubToken('aaaaaaaa-0000-4000-8000-000000000002', 'nudges');
check('unsub · a signed token verifies; a tampered one does not',
  notifier.verifyUnsub(tok)?.key === 'nudges' && !notifier.verifyUnsub(tok.replace(/.$/, (c) => c === 'a' ? 'b' : 'a')) && !notifier.verifyUnsub('x'));
await notifier.applyUnsub('aaaaaaaa-0000-4000-8000-000000000002', 'nudges');
check('unsub · applying flips ONE key and keeps the rest of the prefs',
  db.profiles[1].notification_prefs.nudges === false && db.profiles[1].notification_prefs.looks_ready === true && db.profiles[1].notification_prefs.timezone === 'Europe/Dublin', JSON.stringify(db.profiles[1].notification_prefs));

/* ── the real server: health, the unsub route, the debug tick door ── */
const PORT = 4329;
const server = spawn('node', ['server.js'], {
  cwd: new URL('..', import.meta.url).pathname,
  env: { ...process.env, PORT: String(PORT), SUPABASE_URL: FAKE, SUPABASE_SERVICE_ROLE_KEY: 'svc', RESEND_API_KEY: 're_test', NOTIFY_SECRET: 'shh',
    RESEND_API_URL: FAKE + '/resend', NOTIFY_DEBUG: '1', PUBLIC_URL: 'https://beta.byrobes.com' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
await new Promise((res) => { const on = (b) => { if (String(b).includes(String(PORT))) res(); }; server.stdout.on('data', on); server.stderr.on('data', on); setTimeout(res, 6000); });
const BASE = `http://127.0.0.1:${PORT}`;
try {
  const h = await (await fetch(BASE + '/api/health')).json();
  check('server · /api/health reports email: true with the keys set', h.email === true, JSON.stringify(h));
  const good = await fetch(BASE + '/api/notify/unsub?t=' + encodeURIComponent(notifier.unsubToken('aaaaaaaa-0000-4000-8000-000000000004', 'morning')));
  const goodHtml = await good.text();
  check('server · a valid unsub link lands on the one-line page and flips the pref', good.status === 200 && /Done — Robes won’t email you about this\./.test(goodHtml) && db.profiles[3].notification_prefs.morning === false, String(good.status));
  const bad = await fetch(BASE + '/api/notify/unsub?t=aaaaaaaa-0000-4000-8000-000000000004.morning.' + 'f'.repeat(40));
  check('server · a bad token 400s without touching anything', bad.status === 400);
  const oneClick = await fetch(BASE + '/api/notify/unsub?t=' + encodeURIComponent(notifier.unsubToken('aaaaaaaa-0000-4000-8000-000000000006', 'nudges')), { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'List-Unsubscribe=One-Click' });
  check('server · one-click POST unsubscribes too', oneClick.status === 200 && db.profiles[5].notification_prefs.nudges === false);
  const tickR = await (await fetch(BASE + '/api/notify/tick', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ now: '2026-09-23T06:30:00Z' }) })).json();
  check('server · the debug tick door runs a tick at the given instant', tickR && Array.isArray(tickR.sent) && !tickR.error, JSON.stringify(tickR).slice(0, 200));
} catch (e) {
  check('server · reachable', false, String(e));
}
server.kill();
fake.close();

const fails = results.filter((r) => !r.pass);
results.forEach((r) => console.log((r.pass ? '✓ ' : '✗ ') + r.name + (r.pass ? '' : '   ← ' + r.detail)));
console.log(`\n${results.length - fails.length}/${results.length} checks green`);
process.exit(fails.length ? 1 : 0);
