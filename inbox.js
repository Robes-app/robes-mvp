// Robes — the two text doors into the wardrobe (2026-09-22).
//
// One module, two readers, one piece shape:
//   ingest(body)         — an inbound email (a forwarded order confirmation)
//                          lands on her Robes address, Robes reads the pieces
//                          out of it and HOLDS them in `wardrobe_inbox` until
//                          she looks them over. Nothing is filed without her.
//   readProductPage(url) — a retailer product page, read into the SAME shape
//                          the photo analyse returns, so the client lands it
//                          on the one confirm screen exactly like a photograph.
//
// createInbox({...}) takes its config, fetch, the Gemini call and the image
// host as arguments, so the smoke runs both readers against fixtures with
// no network, no Gemini and no Cloudinary. Nothing here throws to the
// caller on a bad email — a webhook that 500s gets retried by the provider,
// which is how one unreadable receipt becomes five rows.

import { createHmac, timingSafeEqual } from 'crypto';
import { resolveTaxonomy, taxonomyPromptBlock, LEGACY_CATEGORIES } from './wardrobe_taxonomy.js';

const COLOURS = ['White', 'Cream', 'Navy', 'Charcoal', 'Black', 'Espresso', 'Camel', 'Taupe', 'Olive', 'Aubergine', 'Forest', 'Bordeaux', 'Blush', 'Ochre', 'Magenta', 'Cobalt', 'Emerald', 'Vermillion', 'Acid', 'Print'];
const isHttp = (u) => typeof u === 'string' && /^https?:\/\//i.test(u);
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max || 200) : '');

// The one piece shape both readers emit — the analyse route's fields plus
// price / size / currency (2026-09-22: the metadata the form now carries)
// and the image the page or the mail carried.
export const PIECE_PROPS = {
  label:                { type: 'string' },
  category:             { type: 'string', enum: LEGACY_CATEGORIES },
  category_l2:          { type: 'string' },
  category_l3:          { type: 'string' },
  color:                { type: 'string' },
  editorial_color_name: { type: 'string' },
  brand:                { type: 'string' },
  price:                { type: 'string' },
  currency:             { type: 'string' },
  size:                 { type: 'string' },
  image_url:            { type: 'string' },
  ai_generated_notes:   { type: 'string' },
};
export const PRODUCT_SCHEMA = {
  type: 'object',
  properties: { no_item_detected: { type: 'boolean' }, ...PIECE_PROPS },
  required: ['no_item_detected', 'label', 'category', 'category_l2', 'category_l3', 'color', 'editorial_color_name', 'brand', 'price', 'currency', 'size', 'image_url', 'ai_generated_notes'],
};
export const RECEIPT_SCHEMA = {
  type: 'object',
  properties: {
    is_receipt: { type: 'boolean' },
    retailer:   { type: 'string' },
    order_ref:  { type: 'string' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: { ...PIECE_PROPS, quantity: { type: 'integer' }, returned: { type: 'boolean' } },
        required: ['label', 'category', 'category_l2', 'category_l3', 'color', 'editorial_color_name', 'brand', 'price', 'currency', 'size', 'image_url', 'ai_generated_notes', 'quantity', 'returned'],
      },
    },
  },
  required: ['is_receipt', 'retailer', 'order_ref', 'items'],
};

// What the photograph says about a piece (2026-09-22, off Annie's Zara
// receipt: a pink tracksuit filed as "Blue denim jeans"). A retailer's
// order mail often prints NO product name — a photograph, a reference
// code, a size and a price — and a text model asked for a label then
// composes one. The photograph is the one source that cannot lie about a
// pink tracksuit, so it decides the piece's identity; the text keeps what
// only the text knows (price, currency, size, quantity, returned).
export const VISION_SCHEMA = {
  type: 'object',
  properties: {
    no_item_detected:     { type: 'boolean' },
    label:                { type: 'string' },
    category:             { type: 'string', enum: LEGACY_CATEGORIES },
    category_l2:          { type: 'string' },
    category_l3:          { type: 'string' },
    color:                { type: 'string' },
    editorial_color_name: { type: 'string' },
    brand:                { type: 'string' },
    ai_generated_notes:   { type: 'string' },
  },
  required: ['no_item_detected', 'label', 'category', 'category_l2', 'category_l3', 'color', 'editorial_color_name', 'brand', 'ai_generated_notes'],
};

const PIECE_RULES = `"label": concise item name (e.g. "Camel wool coat", "Grey straight-leg jeans")
"category": one of — Tops, Bottoms, Dresses, Outerwear, Shoes, Bags, Accessories, Swimwear, Other
"category_l2" and "category_l3": file the piece in the Robes taxonomy below. Each line reads Category › Subcategory: item types. Pick the ONE line whose subcategory fits best, copy the subcategory name EXACTLY into category_l2, then copy the best-fitting item type from that line EXACTLY into category_l3. If no item type on the line fits, set category_l3 to "". If no subcategory fits at all, set both to "".
TAXONOMY:
${taxonomyPromptBlock()}
"color": pick ONE from this list only — ${COLOURS.join(', ')} (Print for any pattern)
"editorial_color_name": evocative colour name (e.g. "Warm Caramel", "Washed Slate")
"brand": the brand or designer if named, else ""
"price": the price paid for THIS piece as it is printed (e.g. "340", "89.00"), digits only, else ""
"currency": the ISO code of that price (EUR, GBP, USD…), else ""
"size": the size as printed (e.g. "S", "38", "UK 10", "One size"), else ""
"image_url": the product photograph's URL for THIS piece when one is given, else "" — never a logo, an icon, a tracking pixel or a banner
"ai_generated_notes": one editorial sentence under 15 words`;

// ── HTML → the text Robes reads ────────────────────────────────────
// Scripts and styles go; a product image survives as "[image: url | alt]"
// so the model can hand it back on the piece; every block tag is a line.
// Tracking pixels and icons are dropped up front — they are the one class
// of image a receipt is full of and the model must never file.
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', euro: '€', pound: '£', yen: '¥', cent: '¢', copy: '©', reg: '®', trade: '™', hellip: '…', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', middot: '·', bull: '•', times: '×', deg: '°', frac12: '½', laquo: '«', raquo: '»',
  agrave: 'à', aacute: 'á', acirc: 'â', atilde: 'ã', auml: 'ä', aring: 'å', aelig: 'æ', ccedil: 'ç', egrave: 'è', eacute: 'é', ecirc: 'ê', euml: 'ë', igrave: 'ì', iacute: 'í', icirc: 'î', iuml: 'ï', ntilde: 'ñ', ograve: 'ò', oacute: 'ó', ocirc: 'ô', otilde: 'õ', ouml: 'ö', oslash: 'ø', ugrave: 'ù', uacute: 'ú', ucirc: 'û', uuml: 'ü', yacute: 'ý', yuml: 'ÿ', szlig: 'ß',
  Agrave: 'À', Aacute: 'Á', Acirc: 'Â', Atilde: 'Ã', Auml: 'Ä', Aring: 'Å', AElig: 'Æ', Ccedil: 'Ç', Egrave: 'È', Eacute: 'É', Ecirc: 'Ê', Euml: 'Ë', Igrave: 'Ì', Iacute: 'Í', Icirc: 'Î', Iuml: 'Ï', Ntilde: 'Ñ', Ograve: 'Ò', Oacute: 'Ó', Ocirc: 'Ô', Otilde: 'Õ', Ouml: 'Ö', Oslash: 'Ø', Ugrave: 'Ù', Uacute: 'Ú', Ucirc: 'Û', Uuml: 'Ü' };
export function decodeEntities(s) {
  return String(s || '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return ENT[e] != null ? ENT[e] : ENT[e.toLowerCase()] != null ? ENT[e.toLowerCase()] : m;
  });
}
function attr(tag, name) {
  const m = tag.match(new RegExp('\\s' + name + '\\s*=\\s*("([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i'));
  return m ? decodeEntities(m[2] != null ? m[2] : m[3] != null ? m[3] : m[4]) : '';
}
function isPixel(tag, src) {
  const w = attr(tag, 'width'), h = attr(tag, 'height');
  if ((w && parseInt(w, 10) <= 2) || (h && parseInt(h, 10) <= 2)) return true;
  return /pixel|track|beacon|open\.gif|spacer|\.gif(\?|$)|logo|icon|badge|social|facebook|instagram|twitter|tiktok|pinterest|applepay|paypal|visa|mastercard/i.test(src);
}
export function htmlToText(html, opts) {
  const max = (opts && opts.maxLen) || 24000;
  let s = String(html || '');
  s = s.replace(/<!--[\s\S]*?-->/g, '')
       .replace(/<(script|style|noscript|svg|head)\b[\s\S]*?<\/\1>/gi, ' ');
  s = s.replace(/<img\b[^>]*>/gi, (tag) => {
    const src = attr(tag, 'src');
    if (!isHttp(src) || isPixel(tag, src)) return ' ';
    const alt = attr(tag, 'alt').replace(/[|\]]/g, ' ').trim();
    return '\n[image: ' + src + (alt ? ' | ' + alt : '') + ']\n';
  });
  s = s.replace(/<(br|p|div|tr|li|h[1-6]|table|section|article|header|footer|blockquote|dd|dt)\b[^>]*>/gi, '\n')
       .replace(/<\/(p|div|tr|li|h[1-6]|table|section|article)\b[^>]*>/gi, '\n')
       .replace(/<\/?(td|th)\b[^>]*>/gi, '  ')
       .replace(/<[^>]+>/g, ' ');
  s = decodeEntities(s)
       .replace(/[ \t\u00a0]+/g, ' ')
       .replace(/ *\n */g, '\n')
       .replace(/\n{3,}/g, '\n\n')
       .trim();
  return s.length > max ? s.slice(0, max) : s;
}

// ── Inbound payloads, normalised ──────────────────────────────────
// Resend's email.received webhook carries the envelope and an email_id
// (the body is fetched); Postmark / Mailgun / a generic JSON relay carry
// the body inline. One shape comes out.
const asList = (v) => Array.isArray(v) ? v : (v == null || v === '' ? [] : String(v).split(',').map((x) => x.trim()).filter(Boolean));
const addrOf = (v) => (v && typeof v === 'object') ? (v.Email || v.email || v.address || '') : (v || '');
export function normalizeInbound(body) {
  const b = body && typeof body === 'object' ? body : {};
  if (b.type === 'email.received' && b.data && typeof b.data === 'object') {
    const d = b.data;
    return { provider: 'resend', emailId: str(d.email_id || d.id, 120), from: str(d.from, 300), to: asList(d.to).concat(asList(d.cc)), subject: str(d.subject, 300), html: d.html || '', text: d.text || '' };
  }
  if ('HtmlBody' in b || 'TextBody' in b || 'FromFull' in b) {
    return { provider: 'postmark', emailId: str(b.MessageID, 120), from: str(addrOf(b.FromFull) || b.From, 300), to: (Array.isArray(b.ToFull) ? b.ToFull.map(addrOf) : asList(b.To)).concat(Array.isArray(b.CcFull) ? b.CcFull.map(addrOf) : asList(b.Cc)), subject: str(b.Subject, 300), html: b.HtmlBody || '', text: b.TextBody || '' };
  }
  if ('body-html' in b || 'body-plain' in b || 'recipient' in b) {
    return { provider: 'mailgun', emailId: str(b['Message-Id'] || b['message-id'], 120), from: str(b.sender || b.from || b.From, 300), to: asList(b.recipient || b.To || b.to), subject: str(b.subject || b.Subject, 300), html: b['body-html'] || b['stripped-html'] || '', text: b['body-plain'] || b['stripped-text'] || '' };
  }
  return { provider: 'generic', emailId: str(b.id || b.message_id, 120), from: str(addrOf(b.from), 300), to: asList(b.to).map(addrOf).concat(asList(b.cc).map(addrOf)), subject: str(b.subject, 300), html: b.html || '', text: b.text || '' };
}

// 'Annie <annie-4f2k@in.byrobes.com>' → 'annie-4f2k' when the domain matches
export function localPartOf(addr, domain) {
  const m = String(addr || '').toLowerCase().match(/([a-z0-9._+-]+)@([a-z0-9.-]+)/);
  if (!m) return '';
  if (domain && m[2] !== String(domain).toLowerCase()) return '';
  return m[1];
}

// Svix signature (Resend's webhooks): v1,<base64 hmac> over "id.ts.body"
export function verifySvix(rawBody, headers, secret) {
  try {
    const h = (k) => headers[k] || headers[k.toLowerCase()] || '';
    const id = h('svix-id'), ts = h('svix-timestamp'), sigs = String(h('svix-signature') || '');
    if (!id || !ts || !sigs || !secret) return false;
    if (Math.abs(Date.now() / 1000 - Number(ts)) > 5 * 60) return false;
    const key = Buffer.from(String(secret).replace(/^whsec_/, ''), 'base64');
    const body = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody || '');
    const expect = createHmac('sha256', key).update(id + '.' + ts + '.' + body).digest('base64');
    return sigs.split(' ').some((p) => {
      const v = p.split(',')[1] || '';
      const a = Buffer.from(v), b = Buffer.from(expect);
      return a.length === b.length && timingSafeEqual(a, b);
    });
  } catch (_) { return false; }
}

// ── product pages ─────────────────────────────────────────────────
// A retailer page is read from its own structured data first (JSON-LD
// Product, OpenGraph) and its visible text second — the structured fields
// are what the model is told to trust when the two disagree.
function jsonLdProducts(html) {
  const out = [];
  const re = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  const walk = (v) => {
    if (!v || typeof v !== 'object') return;
    if (Array.isArray(v)) { v.forEach(walk); return; }
    const t = v['@type'];
    if (t === 'Product' || (Array.isArray(t) && t.includes('Product'))) out.push(v);
    if (v['@graph']) walk(v['@graph']);
    if (v.mainEntity) walk(v.mainEntity);
  };
  while ((m = re.exec(html))) { try { walk(JSON.parse(m[1].trim())); } catch (_) { /* a page's broken JSON-LD is not our problem */ } }
  return out;
}
function metaContent(html, prop) {
  const re = new RegExp('<meta\\b[^>]*(?:property|name)\\s*=\\s*["\']' + prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '["\'][^>]*>', 'i');
  const m = html.match(re);
  return m ? attr(m[0], 'content') : '';
}
const firstImage = (v) => Array.isArray(v) ? firstImage(v[0]) : (v && typeof v === 'object') ? (v.url || v.contentUrl || '') : (typeof v === 'string' ? v : '');
export function productHints(html, pageUrl) {
  const ld = jsonLdProducts(html)[0] || null;
  const offer = ld && ld.offers ? (Array.isArray(ld.offers) ? ld.offers[0] : ld.offers) : null;
  const hints = {
    title: decodeEntities((html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '').replace(/\s+/g, ' ').trim().slice(0, 200),
    name: str(ld && ld.name, 200) || metaContent(html, 'og:title').slice(0, 200),
    brand: str(ld && (typeof ld.brand === 'object' ? ld.brand && ld.brand.name : ld.brand), 120) || metaContent(html, 'product:brand').slice(0, 120),
    description: str(ld && ld.description, 600) || metaContent(html, 'og:description').slice(0, 600) || metaContent(html, 'description').slice(0, 600),
    price: str(offer && (offer.price != null ? String(offer.price) : ''), 40) || metaContent(html, 'product:price:amount').slice(0, 40) || metaContent(html, 'og:price:amount').slice(0, 40),
    currency: str(offer && offer.priceCurrency, 8) || metaContent(html, 'product:price:currency').slice(0, 8) || metaContent(html, 'og:price:currency').slice(0, 8),
    color: str(ld && ld.color, 60),
    image: firstImage(ld && ld.image) || metaContent(html, 'og:image') || metaContent(html, 'twitter:image'),
    site: metaContent(html, 'og:site_name').slice(0, 80),
  };
  if (hints.image && !isHttp(hints.image)) {
    try { hints.image = new URL(hints.image, pageUrl).href; } catch (_) { hints.image = ''; }
  }
  return hints;
}
// Only a public http(s) host is ever fetched — a product page is a
// user-supplied URL, so the reader must never reach a private network.
export function safeHttpUrl(u, allowPrivate) {
  let url;
  try { url = new URL(String(u || '').trim()); } catch (_) { return null; }
  if (!/^https?:$/.test(url.protocol)) return null;
  const h = url.hostname.toLowerCase();
  if (!allowPrivate) {
    if (!h.includes('.') || h === 'localhost' || /\.(local|internal|localhost)$/.test(h)) return null;
    if (/^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h) || h === '[::1]' || /^\[?f[cd][0-9a-f]{2}:/i.test(h)) return null;
  }
  url.hash = '';
  return url.href;
}

// The stored shape a piece read from text takes — every field trimmed,
// the (l2, l3) pair validated exactly as the photo analyse validates it,
// so `category` and `category_l2` can never disagree here either.
export function normalisePiece(p, extra) {
  const it = p && typeof p === 'object' ? p : {};
  const tax = resolveTaxonomy(str(it.category_l2, 80), str(it.category_l3, 80));
  const color = COLOURS.find((c) => c.toLowerCase() === str(it.color, 40).toLowerCase()) || '';
  const priceNum = parseFloat(String(it.price || '').replace(/[^0-9.,]/g, '').replace(/,(?=\d{3}\b)/g, '').replace(',', '.'));
  const out = {
    label: str(it.label, 120),
    category: tax ? tax.category : (LEGACY_CATEGORIES.includes(it.category) ? it.category : 'Other'),
    category_l2: tax ? tax.category_l2 : null,
    category_l3: tax ? tax.category_l3 : null,
    color,
    brand: str(it.brand, 80),
    price: Number.isFinite(priceNum) && priceNum > 0 ? Math.round(priceNum * 100) / 100 : null,
    currency: str(it.currency, 8).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) || null,
    size: str(it.size, 40) || null,
    image_url: isHttp(it.image_url) ? it.image_url.slice(0, 1000) : null,
    notes: '',
    item_dna: {
      display: { title: str(it.label, 120), editorial_color_name: str(it.editorial_color_name, 60), primary_color_hex: '', brand_raw: str(it.brand, 80) },
      structural_dna: { silhouette_fit: [] },
      formality: '',
      llm_styling_context: {},
      ai_generated_notes: str(it.ai_generated_notes, 200),
    },
  };
  if (extra) out.item_dna.source = extra;
  return out;
}

export function createInbox(cfg) {
  const c = cfg || {};
  const fetchFn = c.fetch || globalThis.fetch;
  const log = c.log || ((...a) => console.log('[inbox]', ...a));
  const domain = String(c.domain || 'in.byrobes.com').toLowerCase();
  const generate = c.generate;               // ({prompt, schema, maxOutputTokens}) → parsed JSON
  const hostImage = c.hostImage || (async () => null);   // remote url → hosted url | null
  const generateVision = c.generateVision || null;       // ({prompt, schema, image:{mimeType,data}}) → parsed JSON
  const visionLimit = c.visionLimit || 3;                // photographs read at once
  const visionMax = c.visionMax || 24;                   // photographs read per receipt
  const notifyReceipt = c.notifyReceipt || null;         // ({userId, retailer, count, seen, images, ref}) → {ok} — the confirmation mail
  const env = c.env || 'production';                     // stamps the admin's events row
  const svc = (extra) => ({ apikey: c.serviceKey, Authorization: 'Bearer ' + c.serviceKey, 'Content-Type': 'application/json', ...(extra || {}) });
  const on = !!(c.serviceKey && generate);

  async function fetchResendBody(emailId) {
    if (!c.resendKey || !emailId) return null;
    const base = (c.resendApiUrl || 'https://api.resend.com').replace(/\/$/, '');
    // Resend's receiving API (email.received hands over an id, the body is
    // fetched) — UNVERIFIED against a live inbound as of 2026-09-22: the
    // docs were unreachable from the build container. Both plausible paths
    // are tried; a miss is logged with its status so the fix is one line.
    for (const path of ['/emails/receiving/' + encodeURIComponent(emailId), '/emails/' + encodeURIComponent(emailId)]) {
      try {
        const r = await fetchFn(base + path, { headers: { Authorization: 'Bearer ' + c.resendKey } });
        if (r.ok) { const j = await r.json(); if (j && (j.html || j.text)) return { html: j.html || '', text: j.text || '' }; }
        else log('resend body', path, r.status);
      } catch (e) { log('resend body', path, e && e.message); }
    }
    return null;
  }

  async function profileByAddress(local) {
    const r = await fetchFn(c.supaUrl + '/rest/v1/profiles?inbox_address=eq.' + encodeURIComponent(local) + '&select=id,first_name&limit=1', { headers: svc() });
    if (!r.ok) throw new Error('profiles lookup ' + r.status + ' ' + (await r.text()).slice(0, 200));
    const rows = await r.json();
    return rows[0] || null;
  }

  // The photograph's bytes, for Gemini's inlineData — a public http(s)
  // image only (the smoke's door opens private hosts), 10s, 8MB.
  async function fetchImageBytes(url) {
    const safe = safeHttpUrl(url, !!c.allowPrivate);
    if (!safe) return null;
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), c.imageTimeoutMs || 10000);
    try {
      const r = await fetchFn(safe, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 RobesBot/1.0', Accept: 'image/*' }, redirect: 'follow', signal: ctl.signal });
      if (!r.ok) return null;
      const ct = (r.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
      if (!/^image\/(jpeg|jpg|png|webp|gif|heic|heif|avif)$/.test(ct)) return null;
      const buf = Buffer.from(await r.arrayBuffer());
      if (!buf.length || buf.length > 8 * 1024 * 1024) return null;
      return { mimeType: ct === 'image/jpg' ? 'image/jpeg' : ct, data: buf.toString('base64') };
    } catch (_) { return null; }
    finally { clearTimeout(t); }
  }

  // One piece's photograph → what it IS. The text read's row rides in as
  // context (a name when the mail printed one, the brand, the size) but the
  // photograph decides label / category / taxonomy / colour; only a
  // photograph that shows no garment leaves the text read standing.
  async function readPieceImage(it, ctx) {
    if (!generateVision || !it.image_url) return null;
    const image = await fetchImageBytes(it.image_url);
    if (!image) return null;
    const prompt = `You are a fashion intelligence engine for a luxury wardrobe app. This is the product photograph of ONE piece on an order confirmation${ctx && ctx.retailer ? ' from ' + ctx.retailer : ''}. Describe the piece IN THE PHOTOGRAPH — never the text below when they disagree; the photograph is the truth.

If the image shows no garment, shoe, bag or accessory (a logo, a banner, a lifestyle scene with no product, a blank frame), set "no_item_detected": true and every other field to "".

Otherwise set "no_item_detected": false and fill:
${PIECE_RULES.split('\n').filter((l) => !/^"(price|currency|size|image_url)"/.test(l)).join('\n')}
For "label", name the piece as a stylist would file it — what it is and its colour or standout detail (e.g. "Pink velour tracksuit top", "Black tailored trousers"), never a size, a price or a reference code. When the photograph shows a full look, the piece is the ONE garment this row bought: the text below says which slot (a top, trousers, shoes); if it does not, name the most prominent garment.

WHAT THE EMAIL PRINTED FOR THIS ROW (may be a bare reference code):
name: ${it.label || ''}
brand: ${it.brand || ''}
size: ${it.size || ''}
category the text guessed: ${it.category || ''}`;
    const out = await generateVision({ prompt, schema: VISION_SCHEMA, image, maxOutputTokens: 700 });
    if (!out || out.no_item_detected || !str(out.label, 120)) return null;
    return out;
  }

  // A bounded-concurrency map — three photographs at once, never a
  // thirteen-piece receipt fanning thirteen Gemini calls.
  async function mapLimit(items, limit, fn) {
    const out = new Array(items.length);
    let i = 0;
    const worker = async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } };
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
    return out;
  }

  // Two rows with one photograph, size and price are one piece printed
  // twice (order summary + shipment block); without a photograph the
  // label stands in. Quantities add up, capped where the schema caps them.
  function dedupeItems(items) {
    const seen = new Map();
    for (const it of items) {
      const key = [it.image_url || it.label.toLowerCase(), it.size || '', it.price == null ? '' : it.price].join('|');
      const prev = seen.get(key);
      if (prev) { prev.quantity = Math.min(9, prev.quantity + it.quantity); prev.returned = prev.returned || it.returned; }
      else seen.set(key, it);
    }
    return Array.from(seen.values());
  }

  async function readReceipt(text, ctx) {
    const prompt = `You are a fashion intelligence engine for a luxury wardrobe app. Below is an email a customer forwarded to us. Decide whether it is an ORDER CONFIRMATION, shipping notice or receipt for clothing, shoes, bags or accessories.

If it is not (a newsletter, a marketing email, a return label, a non-fashion purchase, or unreadable), set "is_receipt": false and return an empty "items" array.

If it is, set "is_receipt": true, name the "retailer" (the shop, e.g. "NET-A-PORTER", "Zara", "Sézane") and the "order_ref" (the order number as printed, else ""), and list EVERY wearable piece bought — one entry per distinct piece (a quantity of two identical pieces is one entry with "quantity": 2). Skip gift wrap, shipping lines, discounts, gift cards, beauty and homeware. Mark "returned": true only when the email itself says the piece was returned, cancelled or refunded.
For every item fill:
${PIECE_RULES}
"quantity": how many of this exact piece, 1 unless stated

GROUNDING — this outranks completeness. Every piece's photograph is read separately afterwards, so a bare row is better than an invented one:
- "label" is the product name AS PRINTED beside the piece in the email, or the alt text of its photograph. NEVER compose a name from the category, the price, the size or a guess. When the email prints no name for a piece (a photograph, a reference code, a size and a price only — Zara, Mango and COS do this), set "label" to the reference code as printed (e.g. "REF 4387/223"), "category" to "Other" and "category_l2"/"category_l3" to "".
- "color" only when the email names the colour beside the piece; otherwise "".
- "image_url" is the [image: …] line that sits WITH this piece's row — never a neighbour's. Two rows that share one photograph, size and price are the same piece listed twice (order summary + shipment): return it once.
- Read every row of the order; do not stop at the first block.

EMAIL SUBJECT: ${ctx && ctx.subject ? ctx.subject : ''}
EMAIL FROM: ${ctx && ctx.from ? ctx.from : ''}
EMAIL:
${text}`;
    const out = await generate({ prompt, schema: RECEIPT_SCHEMA, maxOutputTokens: 8000 });
    const raw = (Array.isArray(out && out.items) ? out.items : []).map((it) => {
      const n = normalisePiece(it);
      n.quantity = Math.max(1, Math.min(9, parseInt(it.quantity, 10) || 1));
      n.returned = !!it.returned;
      return n;
    }).filter((n) => n.label || n.image_url);   // a bare photograph still reads — the vision pass names it
    const items = dedupeItems(raw);
    return { is_receipt: !!(out && out.is_receipt) && items.length > 0, retailer: str(out && out.retailer, 120), order_ref: str(out && out.order_ref, 80), items };
  }

  // The vision pass over a receipt's pieces: every piece with a photograph
  // is re-read from the photograph, which decides its identity; the text
  // keeps price / currency / size / quantity / returned, and the brand it
  // printed. A photograph that fails to fetch, times out or shows no
  // garment leaves the text read exactly as it was.
  async function visionPass(read) {
    if (!generateVision) return { seen: 0 };
    const targets = read.items.filter((it) => it.image_url).slice(0, visionMax);
    let seen = 0;
    await mapLimit(targets, visionLimit, async (it) => {
      let v = null;
      try { v = await readPieceImage(it, read); } catch (e) { log('vision', e && e.message); }
      if (!v) return;
      const p = normalisePiece({ ...v, brand: it.brand || v.brand, price: it.price == null ? '' : String(it.price), currency: it.currency || '', size: it.size || '', image_url: it.image_url });
      it.label = p.label; it.category = p.category; it.category_l2 = p.category_l2; it.category_l3 = p.category_l3; it.color = p.color; it.brand = p.brand;
      it.item_dna = p.item_dna;
      it.read_from = 'photo';
      seen++;
    });
    read.items = read.items.filter((it) => it.label);   // a photograph nobody could read, with no name printed, is dropped
    return { seen };
  }

  // The webhook body → a held wardrobe_inbox row. Every outcome is a
  // 200-shaped answer: the provider must never retry a mail we have
  // already decided about. `reason` says what happened for the log.
  async function ingest(body) {
    if (!on) return { ok: false, reason: 'off' };
    const mail = normalizeInbound(body);
    const local = mail.to.map((a) => localPartOf(a, domain)).find(Boolean) || '';
    if (!local) return { ok: false, reason: 'no_robes_address' };
    let profile;
    try { profile = await profileByAddress(local); }
    catch (e) { log('profile', e && e.message); return { ok: false, reason: 'lookup_failed' }; }
    if (!profile) return { ok: false, reason: 'unknown_address' };
    if (!mail.html && !mail.text && mail.provider === 'resend') {
      const b = await fetchResendBody(mail.emailId);
      if (b) { mail.html = b.html; mail.text = b.text; }
    }
    // 60k characters: a Zara order mail runs past 24k of text before its
    // last row, and a cut receipt reads as a short one.
    const text = mail.html ? htmlToText(mail.html, { maxLen: 60000 }) : str(mail.text, 60000);
    if (!text) return { ok: false, reason: 'empty' };
    let read;
    try { read = await readReceipt(text, mail); }
    catch (e) { log('read', e && e.message); return { ok: false, reason: 'read_failed' }; }
    if (!read.is_receipt) return { ok: true, reason: 'not_a_receipt', items: 0 };
    const vision = await visionPass(read);
    if (!read.items.length) return { ok: true, reason: 'not_a_receipt', items: 0 };
    // Product images are hosted NOW, at read time: a retailer's CDN link
    // in a month-old email is the one thing that goes stale before she
    // looks the receipt over.
    await Promise.all(read.items.map(async (it) => {
      if (!it.image_url) return;
      try { const h = await hostImage(it.image_url); if (h) it.image_url = h; } catch (_) { /* the retailer's own link stays */ }
    }));
    const row = {
      user_id: profile.id,
      source: 'receipt',
      retailer: read.retailer || (mail.from.match(/@([a-z0-9.-]+)/i) || [])[1] || 'A receipt',
      order_ref: read.order_ref || null,
      subject: mail.subject || null,
      from_email: mail.from || null,
      provider_id: mail.emailId || null,
      items: read.items,
      status: 'held',
    };
    const r = await fetchFn(c.supaUrl + '/rest/v1/wardrobe_inbox', { method: 'POST', headers: svc({ Prefer: 'return=representation' }), body: JSON.stringify(row) });
    if (!r.ok) { log('insert', r.status, (await r.text()).slice(0, 200)); return { ok: false, reason: 'insert_failed' }; }
    const saved = await r.json();
    const id = saved[0] && saved[0].id;
    // The record for /admin (2026-09-23): one `events` row per receipt
    // held, written with the service key so it lands whoever is signed in
    // — the user detail's Activity timeline and the Receipts section both
    // read it. Fire-and-forget: the row is a record, never a gate.
    fetchFn(c.supaUrl + '/rest/v1/events', { method: 'POST', headers: svc({ Prefer: 'return=minimal' }), body: JSON.stringify({
      user_id: profile.id, event_type: 'receipt_received', environment: env,
      metadata: { retailer: row.retailer, items: read.items.length, seen: vision.seen, inbox_id: id || null, order_ref: row.order_ref },
    }) }).then((er) => { if (!er.ok) log('event', er.status); }).catch((e) => log('event', e && e.message));
    // Then the confirmation mail — "Robes read your Zara receipt" with a
    // deep link into the review. Awaited so the log line can say whether it
    // went, but never a reason for the webhook to fail: a mail that cannot
    // send leaves the receipt held exactly as it is.
    let mailed = false;
    if (notifyReceipt && id) {
      try {
        const m = await notifyReceipt({ userId: profile.id, retailer: row.retailer, count: read.items.length, seen: vision.seen, images: read.items.map((it) => it.image_url).filter(Boolean), ref: id });
        mailed = !!(m && m.ok);
        if (!mailed) log('mail', (m && m.skipped) || 'failed', m && m.error ? m.error : '');
      } catch (e) { log('mail', e && e.message); }
    }
    return { ok: true, reason: 'held', items: read.items.length, seen: vision.seen, id, user_id: profile.id, mailed };
  }

  // A product page → the analyse shape (+ image_url), or {error}.
  async function readProductPage(input) {
    if (!generate) return { error: 'off' };
    // allowPrivate is the smoke's door only (INBOX_ALLOW_PRIVATE=1) — a
    // deployed service never fetches a private host.
    const url = safeHttpUrl(input, !!c.allowPrivate);
    if (!url) return { error: 'bad_url' };
    let html = '';
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), c.fetchTimeoutMs || 12000);
      const r = await fetchFn(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 RobesBot/1.0', Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'en' }, redirect: 'follow', signal: ctl.signal });
      clearTimeout(t);
      if (!r.ok) return { error: 'unreachable', status: r.status };
      const ct = r.headers.get('content-type') || '';
      if (ct && !/html|xml|text/i.test(ct)) return { error: 'not_a_page' };
      html = (await r.text()).slice(0, 2 * 1024 * 1024);
    } catch (e) { return { error: 'unreachable', detail: e && e.message }; }
    const hints = productHints(html, url);
    const text = htmlToText(html, { maxLen: 12000 });
    const prompt = `You are a fashion intelligence engine for a luxury wardrobe app. Below is a retailer's product page. Read the ONE piece the page sells.

If the page is not a single fashion product (a category listing, a home page, a blog, a search page, an error page, or not clothing / shoes / bags / accessories), set "no_item_detected": true and return every other field as "".

Otherwise set "no_item_detected": false and fill every field. STRUCTURED DATA from the page comes first and is more reliable than the visible text when they disagree.
${PIECE_RULES}

STRUCTURED DATA:
name: ${hints.name || hints.title}
brand: ${hints.brand}
price: ${hints.price} ${hints.currency}
colour: ${hints.color}
image: ${hints.image}
site: ${hints.site}
description: ${hints.description}

PAGE URL: ${url}
VISIBLE TEXT:
${text}`;
    let out;
    try { out = await generate({ prompt, schema: PRODUCT_SCHEMA, maxOutputTokens: 900 }); }
    catch (e) { return { error: 'read_failed', detail: e && e.message }; }
    if (!out || out.no_item_detected || !str(out.label, 120)) return { error: 'no_item' };
    // The structured price outranks a read one; the structured image wins
    // over the model's guess; the size is only ever what the page states.
    if (hints.price && !str(out.price, 40)) out.price = hints.price;
    if (hints.currency && !str(out.currency, 8)) out.currency = hints.currency;
    if (hints.image) out.image_url = hints.image;
    const piece = normalisePiece(out, { kind: 'url', url, site: hints.site || '' });
    if (piece.image_url) {
      try { const h = await hostImage(piece.image_url); if (h) piece.image_url = h; } catch (_) { /* keep the page's own image */ }
    }
    return piece;
  }

  return { on, domain, ingest, readReceipt, readProductPage, normalizeInbound, htmlToText, verifySvix, safeUrl: (u) => safeHttpUrl(u, !!c.allowPrivate) };
}
