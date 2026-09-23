// Inbox smoke — the two text doors into the wardrobe (2026-09-22).
// Part 1 drives inbox.js against fakes (a Supabase REST, a Resend receiving
// API, a retailer page, a Gemini that answers from fixtures, an image host)
// — the receipt path end to end, the product-page reader, the payload
// shapes, the pixel filter. Part 2 boots the real server against the same
// fake Supabase and pins the webhook's auth ladder, the read-url door's
// validation and /api/health. Run: node scripts/inbox_smoke.mjs (port 4330).
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createInbox, htmlToText, normalizeInbound, verifySvix, safeHttpUrl } from '../inbox.js';
import { createNotifier } from '../notify.js';
import { createHmac } from 'node:crypto';

const results = [];
const check = (name, pass, detail = '') => results.push({ name, pass, detail });

// ── the fakes ───────────────────────────────────────────────────────
const store = { profiles: [{ id: 'u-1', first_name: 'Annie', inbox_address: 'annie-4f2k', notification_prefs: {} }], inbox: [], gens: [], events: [], ledger: [], mails: [] };
const PAGE = `<html><head><title>Leather trainers | Example</title>
<meta property="og:image" content="/img/trainers.jpg"><meta property="og:site_name" content="Example Shop">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"Original Achilles leather trainers","brand":{"@type":"Brand","name":"Common Projects"},"image":["https://cdn.example.com/trainers-1.jpg"],"offers":{"@type":"Offer","price":"340.00","priceCurrency":"GBP"}}</script>
</head><body><h1>Original Achilles leather trainers</h1><p>White leather. Size 38.</p><script>track()</script></body></html>`;
// A 1×1 PNG stands in for every product photograph the fake serves.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64');
let RECEIPT_HTML = '';
const fake = createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    const url = new URL(req.url, 'http://x');
    const json = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
    if (url.pathname === '/rest/v1/profiles') {
      const id = (url.searchParams.get('id') || '').replace('eq.', '');
      if (id) return json(200, store.profiles.filter((p) => p.id === id));
      const m = (url.searchParams.get('inbox_address') || '').replace('eq.', '');
      return json(200, store.profiles.filter((p) => p.inbox_address === m));
    }
    if (url.pathname.startsWith('/auth/v1/admin/users/')) {
      const p = store.profiles.find((x) => x.id === url.pathname.split('/').pop());
      return p ? json(200, { id: p.id, email: p.id + '@example.com' }) : json(404, { message: 'not found' });
    }
    if (url.pathname === '/rest/v1/events' && req.method === 'POST') { store.events.push(JSON.parse(body)); res.writeHead(201); return res.end(''); }
    if (url.pathname === '/rest/v1/notifications' && req.method === 'POST') {
      const row = JSON.parse(body);
      if (store.ledger.some((l) => l.user_id === row.user_id && l.kind === row.kind && l.ref === row.ref)) return json(409, { code: '23505' });
      store.ledger.push(row); res.writeHead(201); return res.end('');
    }
    if (url.pathname === '/emails' && req.method === 'POST') { store.mails.push(JSON.parse(body)); return json(200, { id: 'm-' + store.mails.length }); }
    if (url.pathname === '/rest/v1/wardrobe_inbox' && req.method === 'POST') {
      const row = JSON.parse(body); row.id = 'rc-' + (store.inbox.length + 1); store.inbox.push(row); return json(201, [row]);
    }
    if (url.pathname.startsWith('/rest/v1/')) return json(200, []);
    if (url.pathname === '/emails/receiving/e-1') return json(200, { id: 'e-1', html: RECEIPT_HTML, text: '' });
    if (url.pathname.startsWith('/emails/')) return json(404, { message: 'not found' });
    if (url.pathname === '/p/1') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(PAGE); }
    if (url.pathname === '/listing') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end('<html><body><h1>New in</h1><a>a</a><a>b</a></body></html>'); }
    if (url.pathname === '/gone') { res.writeHead(403); return res.end('no'); }
    if (url.pathname === '/img/broken.jpg') { res.writeHead(500); return res.end(''); }
    if (url.pathname.startsWith('/img/')) { res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(PNG); }
    res.writeHead(404); res.end('');
  });
});
await new Promise((r) => fake.listen(0, '127.0.0.1', r));
const FAKE = 'http://127.0.0.1:' + fake.address().port;
// The receipt: a named row with a photograph, a named row without one, a
// Zara-style nameless row (photograph + reference code + size + price)
// printed twice, and a row whose photograph 500s.
RECEIPT_HTML = `<html><body><img src="https://t.nap.com/open.gif" width="1" height="1"><img src="https://cdn.nap.com/logo.png" alt="NET-A-PORTER"><h1>Thank you for your order 12345</h1>
<table><tr><td><img src="${FAKE}/img/trainers.jpg" alt="Common Projects trainers"></td><td>Common Projects<br>Original Achilles leather trainers<br>Size 38 &middot; White</td><td>&pound;340.00</td></tr>
<tr><td></td><td>Pol&egrave;ne<br>Numéro Un tote<br>One size</td><td>&pound;320.00</td></tr>
<tr><td><img src="${FAKE}/img/4387.jpg"></td><td>REF 4387/223<br>M</td><td>&pound;25.95</td></tr>
<tr><td><img src="${FAKE}/img/broken.jpg"></td><td>REF 9001/100<br>L</td><td>&pound;12.95</td></tr></table>
<h2>Shipped</h2><table><tr><td><img src="${FAKE}/img/4387.jpg"></td><td>REF 4387/223<br>M</td><td>&pound;25.95</td></tr></table><p>Delivery &pound;0.00 · Total &pound;660.00</p></body></html>`;

// Gemini from fixtures: a receipt prompt → the two pieces; a page prompt → the trainers.
const generate = async ({ prompt, schema }) => {
  store.gens.push(prompt);
  if (/ORDER CONFIRMATION/.test(prompt)) {
    return { is_receipt: true, retailer: 'NET-A-PORTER', order_ref: '12345', items: [
      { label: 'Leather trainers', category: 'Shoes', category_l2: 'Trainers', category_l3: 'Leather trainer', color: 'White', editorial_color_name: 'Chalk', brand: 'Common Projects', price: '340.00', currency: 'GBP', size: '38', image_url: FAKE + '/img/trainers.jpg', ai_generated_notes: 'Clean white leather trainers.', quantity: 1, returned: false },
      { label: 'Numéro Un tote', category: 'Bags', category_l2: 'Everyday bags', category_l3: 'Nonsense type', color: 'Camel', editorial_color_name: 'Tan', brand: 'Polène', price: '320', currency: 'GBP', size: 'One size', image_url: '', ai_generated_notes: 'A structured leather tote.', quantity: 1, returned: false },
      // the Zara-style rows: no name printed, the grounded read hands back the reference code — twice, once per block
      { label: 'REF 4387/223', category: 'Other', category_l2: '', category_l3: '', color: '', editorial_color_name: '', brand: '', price: '25.95', currency: 'GBP', size: 'M', image_url: FAKE + '/img/4387.jpg', ai_generated_notes: '', quantity: 1, returned: false },
      { label: 'REF 9001/100', category: 'Other', category_l2: '', category_l3: '', color: '', editorial_color_name: '', brand: '', price: '12.95', currency: 'GBP', size: 'L', image_url: FAKE + '/img/broken.jpg', ai_generated_notes: '', quantity: 1, returned: false },
      { label: 'REF 4387/223', category: 'Other', category_l2: '', category_l3: '', color: '', editorial_color_name: '', brand: '', price: '25.95', currency: 'GBP', size: 'M', image_url: FAKE + '/img/4387.jpg', ai_generated_notes: '', quantity: 1, returned: false },
    ] };
  }
  if (/product page/.test(prompt)) {
    if (/New in/.test(prompt)) return { no_item_detected: true, label: '' };
    return { no_item_detected: false, label: 'Leather trainers', category: 'Shoes', category_l2: 'Trainers', category_l3: 'Leather trainer', color: 'White', editorial_color_name: 'Chalk', brand: 'Common Projects', price: '', currency: '', size: '38', image_url: 'https://cdn.example.com/model-guess.jpg', ai_generated_notes: 'Clean white leather trainers.' };
  }
  return {};
};
const hosted = [];
const hostImage = async (u) => { hosted.push(u); return 'https://res.cloudinary.com/robes/' + u.split('/').pop(); };
// Gemini vision from fixtures: the photograph decides — the trainers read as trainers, the nameless 4387 is a pink tracksuit top.
const visions = [];
const generateVision = async ({ prompt, schema, image }) => {
  visions.push({ prompt, image });
  if (/name: Original Achilles|name: Leather trainers/.test(prompt)) return { no_item_detected: false, label: 'White leather trainers', category: 'Shoes', category_l2: 'Trainers', category_l3: 'Leather trainer', color: 'White', editorial_color_name: 'Chalk', brand: '', ai_generated_notes: 'Clean white leather trainers.' };
  if (/name: REF 4387/.test(prompt)) return { no_item_detected: false, label: 'Pink velour tracksuit top', category: 'Tops', category_l2: 'Sweatshirts & hoodies', category_l3: 'Zip-up hoodie', color: 'Blush', editorial_color_name: 'Candy Pink', brand: 'Zara', ai_generated_notes: 'A soft pink zip-through in velour.' };
  return { no_item_detected: true, label: '' };
};

// ── Part 1: the module ──────────────────────────────────────────────
{
  const notifier = createNotifier({ supaUrl: FAKE, serviceKey: 'svc', resendKey: 'rk', secret: 'shh', publicUrl: 'https://beta.byrobes.com', resendUrl: FAKE + '/emails', env: 'beta', log: { warn() {} } });
  const inbox = createInbox({ supaUrl: FAKE, serviceKey: 'svc', resendKey: 'rk', resendApiUrl: FAKE, domain: 'in.byrobes.com', generate, generateVision, hostImage, log: () => {}, allowPrivate: true, notifyReceipt: notifier.sendReceiptMail, env: 'beta' });
  check('module · on with a service key and a generator', inbox.on === true);

  // Pure helpers
  const t = htmlToText(RECEIPT_HTML);
  check('htmlToText · the pixel and the logo are dropped, the product image survives with its alt, the cells read on one line, entities decode',
    !/open\.gif/.test(t) && !/logo\.png/.test(t) && t.includes('[image: ' + FAKE + '/img/trainers.jpg | Common Projects trainers]') && /Size 38 · White/.test(t) && /£340\.00/.test(t) && /Polène/.test(t) && !/track\(\)/.test(t), JSON.stringify(t).slice(0, 300));
  check('normalizeInbound · Resend / Postmark / Mailgun / generic all land on one shape',
    normalizeInbound({ type: 'email.received', data: { email_id: 'e-1', from: 'a@b.c', to: ['x@in.byrobes.com'], subject: 'S' } }).provider === 'resend'
    && normalizeInbound({ FromFull: { Email: 'a@b.c' }, ToFull: [{ Email: 'x@in.byrobes.com' }], Subject: 'S', HtmlBody: '<p>x</p>' }).to[0] === 'x@in.byrobes.com'
    && normalizeInbound({ sender: 'a@b.c', recipient: 'x@in.byrobes.com', subject: 'S', 'body-html': '<p>x</p>' }).html === '<p>x</p>'
    && normalizeInbound({ from: 'a@b.c', to: 'x@in.byrobes.com, y@z.com', subject: 'S', text: 'hi' }).to.length === 2);
  check('safeHttpUrl · private hosts and non-http schemes refused, a public page kept without its hash',
    safeHttpUrl('http://127.0.0.1/x') === null && safeHttpUrl('http://10.0.0.5/') === null && safeHttpUrl('ftp://a.com/x') === null && safeHttpUrl('http://localhost/x') === null
    && safeHttpUrl('https://shop.example.com/p/1#top') === 'https://shop.example.com/p/1');
  const secret = 'whsec_' + Buffer.from('topsecret').toString('base64');
  const raw = JSON.stringify({ type: 'email.received', data: { email_id: 'e-1' } });
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = 'v1,' + createHmac('sha256', Buffer.from('topsecret')).update('m1.' + ts + '.' + raw).digest('base64');
  check('verifySvix · a good signature verifies, a bad one and a stale timestamp do not',
    verifySvix(raw, { 'svix-id': 'm1', 'svix-timestamp': ts, 'svix-signature': sig }, secret) === true
    && verifySvix(raw, { 'svix-id': 'm1', 'svix-timestamp': ts, 'svix-signature': 'v1,AAAA' }, secret) === false
    && verifySvix(raw, { 'svix-id': 'm1', 'svix-timestamp': '1000', 'svix-signature': sig }, secret) === false);

  // The receipt path: a Resend event → the body fetched → read → held.
  const out = await inbox.ingest({ type: 'email.received', data: { email_id: 'e-1', from: 'Annie <annie@gmail.com>', to: ['Annie <annie-4f2k@in.byrobes.com>'], subject: 'Fwd: Your NET-A-PORTER order' } });
  const row = store.inbox[0];
  check('ingest · a Resend event lands a held row for the right user with four pieces (the twice-printed row read once)', out.ok && out.reason === 'held' && out.items === 4 && row && row.user_id === 'u-1' && row.status === 'held' && row.retailer === 'NET-A-PORTER' && row.order_ref === '12345' && row.provider_id === 'e-1', JSON.stringify(out));
  check('ingest · the pieces are normalised: price a number, currency a code, the (l2,l3) pair validated (a made-up type degrades to the subcategory alone), image hosted at read time',
    row && row.items[0].price === 340 && row.items[0].currency === 'GBP' && row.items[0].size === '38' && row.items[0].category === 'Shoes' && row.items[0].category_l2 === 'Trainers' && row.items[0].category_l3 === 'Leather trainer'
    && row.items[0].image_url === 'https://res.cloudinary.com/robes/trainers.jpg' && hosted.includes(FAKE + '/img/trainers.jpg')
    && row.items[1].category === 'Bags' && row.items[1].category_l2 === 'Everyday bags' && row.items[1].category_l3 === null && row.items[1].image_url === null && row.items[1].quantity === 1, JSON.stringify(row && row.items.map((i) => [i.label, i.price, i.currency, i.category_l2, i.category_l3, i.image_url])));
  check('ingest · the email text (not the HTML) reached the reader, subject and sender named, the grounding rules in the prompt', new RegExp('\\[image: ' + FAKE.replace(/[.\/]/g, '\\$&') + '/img/trainers\\.jpg').test(store.gens[0]) && /EMAIL SUBJECT: Fwd: Your NET-A-PORTER order/.test(store.gens[0]) && !/<table>/.test(store.gens[0]) && /NEVER compose a name/.test(store.gens[0]));
  // The vision pass: the photograph decides what a piece IS
  const v4387 = row && row.items.find((i) => i.size === 'M');
  const v9001 = row && row.items.find((i) => i.size === 'L');
  check('vision · every piece with a photograph that fetches is read from it (two — the nameless row once, the 500ing photograph never reaches the model), the bytes reach the model, the text row rides in as context',
    visions.length === 2 && visions.every((v) => v.image && v.image.mimeType === 'image/png' && v.image.data.length > 10) && visions.some((v) => /name: REF 4387\/223\nbrand: \nsize: M/.test(v.prompt)) && visions.some((v) => /from NET-A-PORTER/.test(v.prompt)), JSON.stringify(visions.map((v) => v.prompt.slice(-160))));
  check('vision · the nameless Zara-style row becomes what its photograph shows — label, category, taxonomy, colour, brand from the photograph; price, currency, size, quantity from the text; printed twice → one piece, quantity 2',
    v4387 && v4387.label === 'Pink velour tracksuit top' && v4387.category === 'Tops' && v4387.category_l2 === 'Sweatshirts & hoodies' && v4387.category_l3 === 'Zip-up hoodie' && v4387.color === 'Blush' && v4387.brand === 'Zara'
    && v4387.price === 25.95 && v4387.currency === 'GBP' && v4387.size === 'M' && v4387.quantity === 2 && v4387.read_from === 'photo' && v4387.item_dna.display.editorial_color_name === 'Candy Pink' && v4387.image_url === 'https://res.cloudinary.com/robes/4387.jpg', JSON.stringify(v4387));
  check('vision · the photograph outranks the text on a named row too (the text brand stands), a photograph that fails to fetch leaves the text read as it was, a row without a photograph is never sent',
    row && row.items[0].label === 'White leather trainers' && row.items[0].brand === 'Common Projects' && row.items[0].read_from === 'photo'
    && v9001 && v9001.label === 'REF 9001/100' && v9001.category === 'Other' && !v9001.read_from && row.items[1].label === 'Numéro Un tote' && !row.items[1].read_from, JSON.stringify([row && row.items[0].label, v9001 && v9001.label]));
  // The record and the mail (2026-09-23): one events row for /admin, one
  // "Robes read your receipt" mail with the deep link into the review.
  const rcEvents = () => store.events.filter((e) => e.event_type === 'receipt_received');
  const ev = rcEvents()[0];
  check('ingest · the receipt is recorded for the admin: one receipt_received event with the retailer, the count, the photographs read and the inbox row, on the service\'s environment',
    rcEvents().length === 1 && ev && ev.user_id === 'u-1' && ev.event_type === 'receipt_received' && ev.environment === 'beta' && ev.metadata.retailer === 'NET-A-PORTER' && ev.metadata.items === 4 && ev.metadata.seen === 2 && ev.metadata.inbox_id === 'rc-1' && ev.metadata.order_ref === '12345', JSON.stringify(ev));
  const mail = store.mails[0];
  check('ingest · the confirmation mail goes to the address the auth admin API holds, names the retailer and the count, carries the hosted photographs and a CTA that deep-links into the review',
    out.mailed === true && store.mails.length === 1 && mail && mail.to[0] === 'u-1@example.com' && mail.subject === 'Robes read your NET-A-PORTER receipt.'
    && /four pieces/.test(mail.text) && /each one from its photograph/.test(mail.text) && /Review them: https:\/\/beta\.byrobes\.com\/wardrobe\?receipts=1&from=email/.test(mail.text)
    && mail.html.includes('href="https://beta.byrobes.com/wardrobe?receipts=1&amp;from=email"') && (mail.html.match(/res\.cloudinary\.com\/robes\//g) || []).length === 3 && /forwarded a receipt to your Robes address/.test(mail.html), JSON.stringify(mail && { to: mail.to, subject: mail.subject, text: mail.text }));
  check('ingest · the mail is ledgered as receipt_held on the inbox row, its Stop link names the receipts pref and verifies',
    store.ledger.length === 1 && store.ledger[0].kind === 'receipt_held' && store.ledger[0].ref === 'rc-1' && mail && mail.headers['List-Unsubscribe'].includes(encodeURIComponent(notifier.unsubToken('u-1', 'receipts')))
    && (notifier.verifyUnsub(notifier.unsubToken('00000000-0000-4000-8000-000000000000', 'receipts')) || {}).key === 'receipts', JSON.stringify([store.ledger, mail && mail.headers]));
  const unknown = await inbox.ingest({ from: 'a@b.c', to: ['nobody-zzzz@in.byrobes.com'], subject: 'x', html: '<p>hi</p>' });
  const wrongDomain = await inbox.ingest({ from: 'a@b.c', to: ['annie-4f2k@gmail.com'], subject: 'x', html: '<p>hi</p>' });
  check('ingest · an unknown address and a foreign domain are refused as decided outcomes, nothing stored', unknown.ok === false && unknown.reason === 'unknown_address' && wrongDomain.ok === false && wrongDomain.reason === 'no_robes_address' && store.inbox.length === 1, JSON.stringify([unknown, wrongDomain]));
  const empty = await inbox.ingest({ from: 'a@b.c', to: ['annie-4f2k@in.byrobes.com'], subject: 'x', html: '', text: '' });
  check('ingest · an empty mail reads nothing', empty.ok === false && empty.reason === 'empty');
  store.profiles[0].notification_prefs = { receipts: false };
  const genericOut = await inbox.ingest({ from: 'a@b.c', to: 'annie-4f2k@in.byrobes.com', subject: 'Order', html: RECEIPT_HTML });
  check('ingest · a generic inline-body relay holds a row too', genericOut.ok && genericOut.reason === 'held' && store.inbox.length === 2);
  check('ingest · receipts: false in her prefs stands the mail down — the receipt is still held and recorded, nothing sent', genericOut.mailed === false && store.mails.length === 1 && store.ledger.length === 1 && rcEvents().length === 2, JSON.stringify([genericOut, store.mails.length, store.events.length]));
  store.profiles[0].notification_prefs = {};

  // The product-page reader
  hosted.length = 0;
  const page = await inbox.readProductPage(FAKE + '/p/1');
  check('readProductPage · the page lands in the analyse shape: the JSON-LD price and currency outrank the empty read, the JSON-LD image outranks the model guess and is hosted, the size is the page\'s',
    !page.error && page.label === 'Leather trainers' && page.brand === 'Common Projects' && page.price === 340 && page.currency === 'GBP' && page.size === '38' && page.category === 'Shoes' && page.category_l2 === 'Trainers'
    && page.image_url === 'https://res.cloudinary.com/robes/trainers-1.jpg' && hosted[0] === 'https://cdn.example.com/trainers-1.jpg' && page.item_dna.source.kind === 'url' && page.item_dna.source.site === 'Example Shop', JSON.stringify(page));
  check('readProductPage · the structured hints reached the prompt', /STRUCTURED DATA:\nname: Original Achilles leather trainers/.test(store.gens[store.gens.length - 1]) && /price: 340\.00 GBP/.test(store.gens[store.gens.length - 1]));
  const listing = await inbox.readProductPage(FAKE + '/listing');
  const gone = await inbox.readProductPage(FAKE + '/gone');
  const bad = await inbox.readProductPage('not a url');
  const guarded = await createInbox({ supaUrl: FAKE, serviceKey: 'svc', generate, hostImage, log: () => {} }).readProductPage('http://127.0.0.1/x');
  check('readProductPage · a listing is no_item, a 403 is unreachable, a non-url is bad_url, a private host is bad_url unless the smoke door is open', listing.error === 'no_item' && gone.error === 'unreachable' && gone.status === 403 && bad.error === 'bad_url' && guarded.error === 'bad_url', JSON.stringify([listing, gone, bad, guarded]));

  const off = createInbox({ supaUrl: FAKE, serviceKey: '', generate: null });
  check('module · without a service key or a generator it is off and every door says so', off.on === false && (await off.ingest({})).reason === 'off' && (await off.readProductPage('https://a.com/x')).error === 'off');
}

// ── Part 2: the real server ─────────────────────────────────────────
const PORT = 4330;
const BASE = 'http://127.0.0.1:' + PORT;
async function bootServer(env) {
  const srv = spawn('node', ['server.js'], { cwd: new URL('..', import.meta.url).pathname, env: { ...process.env, PORT: String(PORT), NODE_ENV: 'test', SUPABASE_URL: FAKE, SUPABASE_SERVICE_ROLE_KEY: 'svc', GEMINI_API_KEY: 'test-key', NOTIFY_TICK: 'off', ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((res) => { const on = (b) => { if (String(b).includes(String(PORT))) res(); }; srv.stdout.on('data', on); srv.stderr.on('data', on); setTimeout(res, 3000); });
  return srv;
}
{
  const srv = await bootServer({ INBOX_WEBHOOK_SECRET: '', RESEND_WEBHOOK_SECRET: '' });
  const h = await (await fetch(BASE + '/api/health')).json();
  const r = await fetch(BASE + '/api/inbox/receipt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  check('server · no secret configured: health reports inbox false, the webhook is 503 (never an open door)', h.inbox === false && h.inbox_domain === 'in.byrobes.com' && r.status === 503, JSON.stringify([h.inbox, r.status]));
  srv.kill();
}
{
  const srv = await bootServer({ INBOX_WEBHOOK_SECRET: 's3cret', INBOX_DOMAIN: 'in.byrobes.com', INBOX_ALLOW_PRIVATE: '1' });
  const h = await (await fetch(BASE + '/api/health')).json();
  const r401 = await fetch(BASE + '/api/inbox/receipt?key=wrong', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from: 'a@b.c', to: ['annie-4f2k@in.byrobes.com'], subject: 'x', html: '<p>x</p>' }) });
  const rUnknown = await fetch(BASE + '/api/inbox/receipt', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-inbox-key': 's3cret' }, body: JSON.stringify({ from: 'a@b.c', to: ['nobody-1111@in.byrobes.com'], subject: 'x', html: '<p>x</p>' }) });
  const ju = await rUnknown.json();
  check('server · with the secret: health reports inbox true, a wrong key is 401, a right key with an unknown address answers 200 unknown_address', h.inbox === true && r401.status === 401 && rUnknown.status === 200 && ju.ok === false && ju.reason === 'unknown_address', JSON.stringify([h.inbox, r401.status, ju]));
  const rb = await fetch(BASE + '/api/wardrobe/read-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: 'not a url' }) });
  const rp = await fetch(BASE + '/api/wardrobe/read-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: FAKE + '/gone' }) });
  check('server · read-url: a non-url is 400 bad_url, an unreachable page 422 unreachable', rb.status === 400 && (await rb.json()).error === 'bad_url' && rp.status === 422 && (await rp.json()).error === 'unreachable', JSON.stringify([rb.status, rp.status]));
  const up = await fetch(BASE + '/api/wardrobe/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: 'ftp://x.com/secret.png' }) });
  check('server · upload by url refuses a non-http url as a missing input (400)', up.status === 400, String(up.status));
  srv.kill();
}

fake.close();
const failed = results.filter((r) => !r.pass);
for (const r of results) console.log(`${r.pass ? '  ok ' : 'FAIL '} ${r.name}${r.pass ? '' : '  → ' + r.detail}`);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
