// Robes — the re-engagement channel (four-session funnel, slice 6).
//
// One module, three jobs: sendMail (Resend over REST, ledger-first
// idempotency, an email_sent event), the unsub token pair, and notifyTick —
// the state-keyed sequence + the morning cue. Every rule is a service-key
// PostgREST query for candidates; a send is RECORDED in `notifications`
// before it happens, so a re-tick, a restart, or two Railway services on
// one project can never mail twice. Nothing here throws to the caller —
// a failed query or transport is logged and the tick moves on.
//
// createNotifier({...}) takes its config (and fetch) as arguments so the
// smoke can run the tick against fixtures without a network or a server.

import { createHmac, timingSafeEqual } from 'crypto';

const SEQ_KINDS = ['looks_ready', 'look_waiting', 'borrowing', 'five', 'week_empty'];
const PREF_OF_KIND = { looks_ready: 'looks_ready', morning: 'morning', receipt_held: 'receipts' }; // every other kind → 'nudges'
const NUM_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const HOUR = 3600 * 1000, DAY = 24 * HOUR;
const LOOKS_READY_WINDOW = 48 * HOUR;   // never mail "ready" for a piece older than this (a first deploy must not mail every old key piece)
const DEFAULT_TZ = 'Europe/Dublin';

const isHttp = (u) => typeof u === 'string' && /^https?:\/\//.test(u);
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const numWord = (n) => (n >= 0 && n < NUM_WORDS.length) ? NUM_WORDS[n] : String(n);
const cap1 = (s) => s ? s[0].toUpperCase() + s.slice(1) : s;

// Local calendar reading of an instant in a timezone — the tick compares
// against HER clock, never the server's. An unknown zone falls back.
export function localParts(date, tz) {
  let fmt;
  try { fmt = new Intl.DateTimeFormat('en-GB', { timeZone: tz || DEFAULT_TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', weekday: 'long', hour12: false }); }
  catch (_) { fmt = new Intl.DateTimeFormat('en-GB', { timeZone: DEFAULT_TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', weekday: 'long', hour12: false }); }
  const p = {};
  fmt.formatToParts(date).forEach((x) => { p[x.type] = x.value; });
  const hour = Number(p.hour) % 24;   // some ICU builds print "24" for midnight
  return { date: `${p.year}-${p.month}-${p.day}`, hour, weekday: p.weekday };
}

export function isoWeek(dateISO) {
  const d = new Date(dateISO + 'T00:00:00Z');
  const day = (d.getUTCDay() + 6) % 7;             // Monday = 0
  d.setUTCDate(d.getUTCDate() - day + 3);          // the Thursday of this week decides the year
  const y = d.getUTCFullYear();
  const jan4 = new Date(Date.UTC(y, 0, 4));
  const wk = 1 + Math.round(((d - jan4) / DAY - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
  return `${y}-W${String(wk).padStart(2, '0')}`;
}
const addDaysISO = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

// "a jacket, trousers and shoes" — the borrowing mail names the gaps the way
// the client's _rbGapName does: an article unless the word is a plural.
export function gapName(p) {
  const opt = p && Array.isArray(p.opts) ? p.opts[Number.isInteger(p.oi) ? p.oi : 0] : null;
  let n = String((opt && opt.name) || (p && (p.chip || p.role)) || 'a piece').trim().toLowerCase();
  n = n.replace(/^(the|a|an)\s+/, '').split(/\s+/).slice(-3).join(' ');
  if (/s$/.test(n) && !/ss$/.test(n)) return n;
  return (/^[aeiou]/.test(n) ? 'an ' : 'a ') + n;
}
export function listWords(items) {
  if (!items.length) return '';
  if (items.length === 1) return items[0];
  return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
}

// ── The shared shell: cream ground, one serif heading, at most one image
// block, one ink CTA, the footer. Table layout — mail clients. ──────────
export function mailShell({ heading, body, images, cta, footer, unsubUrl, preheader, notice }) {
  const imgs = (images || []).filter(isHttp).slice(0, 3);
  const imgBlock = imgs.length
    ? `<tr><td style="padding:0 0 22px"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>${imgs.map((u) =>
        `<td style="padding:0 4px;width:${Math.floor(100 / imgs.length)}%" valign="top"><img src="${esc(u)}" width="${imgs.length === 1 ? 360 : 170}" alt="" style="display:block;width:100%;max-width:${imgs.length === 1 ? 360 : 170}px;height:auto;border-radius:6px;margin:0 auto"></td>`).join('')}</tr></table></td></tr>`
    : '';
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(heading)}</title></head>
<body style="margin:0;padding:0;background:#FAF8F5;">
<span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${esc(preheader || body)}</span>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FAF8F5"><tr><td align="center" style="padding:32px 16px 40px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px">
<tr><td style="padding:0 0 24px;font-family:Georgia,'Times New Roman',serif;font-size:15px;letter-spacing:.28em;text-transform:uppercase;color:#202021">Robes</td></tr>
<tr><td style="background:#FFFFFF;border:1px solid #E7E0CF;border-radius:10px;padding:32px 28px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
<tr><td style="padding:0 0 14px;font-family:'Cormorant Garamond',Georgia,'Times New Roman',serif;font-size:30px;line-height:1.15;font-weight:300;color:#202021">${esc(heading)}</td></tr>
<tr><td style="padding:0 0 22px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:#4A463F">${body}</td></tr>
${imgBlock}
${cta ? `<tr><td style="padding:0"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:#202021;border-radius:100px"><a href="${esc(cta.url)}" style="display:inline-block;padding:13px 26px;font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#FFFFFF;text-decoration:none">${esc(cta.label)}</a></td></tr></table></td></tr>` : ''}
${footer ? `<tr><td style="padding:18px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:#8E8A83">${footer}</td></tr>` : ''}
</table></td></tr>
<tr><td style="padding:22px 6px 0;font-family:Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#A89880">${esc(notice || 'You’re getting this because you asked Robes to keep in touch.')} <a href="${esc(unsubUrl)}" style="color:#A89880">Stop these emails</a> · <a href="https://www.byrobes.com/privacy" style="color:#A89880">Privacy</a></td></tr>
</table></td></tr></table></body></html>`;
}
export function mailText({ heading, bodyText, cta, footerText, unsubUrl }) {
  const lines = [heading, '', bodyText, ''];
  if (cta) lines.push(`${cta.label}: ${cta.url}`, '');
  if (footerText) lines.push(footerText, '');
  lines.push(`Stop these emails: ${unsubUrl}`);
  return lines.join('\n');
}

export function createNotifier(cfg) {
  const {
    supaUrl, serviceKey, resendKey, from = 'Robes <hello@byrobes.com>', publicUrl = 'https://www.byrobes.com',
    secret, env = 'beta', resendUrl = 'https://api.resend.com/emails', fetchFn = globalThis.fetch, log = console,
  } = cfg;
  const on = !!(resendKey && serviceKey && secret);

  const svcHeaders = (extra) => ({ apikey: serviceKey, Authorization: 'Bearer ' + serviceKey, 'Content-Type': 'application/json', ...(extra || {}) });
  async function rest(path, opts = {}) {
    try {
      const r = await fetchFn(supaUrl + '/rest/v1/' + path, {
        method: opts.method || 'GET',
        headers: svcHeaders(opts.prefer ? { Prefer: opts.prefer } : null),
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      });
      const text = await r.text();
      let json = null;
      try { json = text ? JSON.parse(text) : null; } catch (_) { json = null; }
      return { ok: r.ok, status: r.status, json, text };
    } catch (e) {
      return { ok: false, status: 0, json: null, text: String(e && e.message || e) };
    }
  }
  // A select that names a column a pending migration adds: PostgREST
  // answers 400 naming it — retry with the column stripped (the client's
  // strip-and-retry, server-side), so every later migration degrades to
  // "unknown" rather than to "no candidates at all".
  async function selectDegrade(table, cols, filter, optional) {
    let use = cols.slice();
    for (let i = 0; i <= optional.length; i++) {
      const r = await rest(`${table}?select=${use.join(',')}${filter ? '&' + filter : ''}`);
      if (r.ok) return { rows: Array.isArray(r.json) ? r.json : [], missing: cols.filter((c) => !use.includes(c)) };
      const named = optional.find((c) => use.includes(c) && new RegExp(c.split('(')[0]).test(r.text || ''));
      if (r.status === 400 && named) { use = use.filter((c) => c !== named); continue; }
      return { rows: null, error: r.text, status: r.status };
    }
    return { rows: null, error: 'degrade exhausted' };
  }

  // ── unsub tokens: uid.prefKey.hmac — flips ONE pref, no login ─────────
  const sign = (uid, key) => createHmac('sha256', String(secret || 'unset')).update(uid + ':' + key).digest('hex').slice(0, 40);
  function unsubToken(uid, key) { return `${uid}.${key}.${sign(uid, key)}`; }
  function verifyUnsub(t) {
    const m = /^([0-9a-f-]{36})\.(looks_ready|nudges|morning|receipts)\.([0-9a-f]{40})$/i.exec(String(t || ''));
    if (!m || !secret) return null;
    const a = Buffer.from(m[3]), b = Buffer.from(sign(m[1], m[2]));
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return { uid: m[1], key: m[2] };
  }
  const prefKeyOf = (kind) => PREF_OF_KIND[kind] || 'nudges';
  const unsubUrlFor = (uid, kind) => `${publicUrl}/api/notify/unsub?t=${encodeURIComponent(unsubToken(uid, prefKeyOf(kind)))}`;

  async function readPrefs(uid) {
    const r = await rest(`profiles?id=eq.${encodeURIComponent(uid)}&select=notification_prefs`);
    return r.ok && r.json && r.json[0] ? (r.json[0].notification_prefs || {}) : null;
  }
  async function writePrefs(uid, prefs) {
    const r = await rest(`profiles?id=eq.${encodeURIComponent(uid)}`, { method: 'PATCH', prefer: 'return=minimal', body: { notification_prefs: prefs } });
    return r.ok;
  }
  // The unsub route's body: merge-write ONE key off (jsonb PATCH replaces
  // the column, so read first). Returns false when the profile is gone.
  async function applyUnsub(uid, key) {
    const prefs = await readPrefs(uid);
    if (!prefs) return false;
    return writePrefs(uid, { ...prefs, [key]: false });
  }

  // ── sendMail: ledger first, then Resend, then the event ───────────────
  async function sendMail({ to, subject, html, text, kind, ref, userId }) {
    if (!on) return { ok: false, skipped: 'off' };
    if (!to || !userId || !kind || ref == null) return { ok: false, skipped: 'args' };
    const ledger = await rest('notifications', { method: 'POST', prefer: 'return=minimal', body: { user_id: userId, kind, ref: String(ref) } });
    if (ledger.status === 409) return { ok: false, skipped: 'sent' };
    if (!ledger.ok) { log.warn('[notify] ledger insert failed:', ledger.status, String(ledger.text).slice(0, 160)); return { ok: false, skipped: 'ledger' }; }
    let sent = false, err = null;
    try {
      const r = await fetchFn(resendUrl, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + resendKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from, to: [to], subject, html, text,
          headers: {
            'List-Unsubscribe': `<${unsubUrlFor(userId, kind)}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        }),
      });
      sent = r.ok;
      if (!r.ok) err = `${r.status} ${(await r.text().catch(() => '')).slice(0, 160)}`;
    } catch (e) { err = String(e && e.message || e); }
    if (!sent) {
      // Transport failed: give the ledger row back so the next tick retries.
      log.warn('[notify] resend failed:', kind, err);
      await rest(`notifications?user_id=eq.${encodeURIComponent(userId)}&kind=eq.${encodeURIComponent(kind)}&ref=eq.${encodeURIComponent(String(ref))}`, { method: 'DELETE', prefer: 'return=minimal' });
      return { ok: false, skipped: 'transport', error: err };
    }
    rest('events', { method: 'POST', prefer: 'return=minimal', body: { user_id: userId, event_type: 'email_sent', metadata: { kind, ref: String(ref) }, environment: env } })
      .then((r) => { if (!r.ok) log.warn('[notify] email_sent event failed:', r.status); });
    return { ok: true };
  }

  // A mail = the shell + the same words in plain text + the kind's unsub.
  function compose(u, kind, m) {
    const unsubUrl = unsubUrlFor(u.id, kind);
    return {
      to: u.email, userId: u.id, kind, ref: m.ref, subject: m.subject,
      html: mailShell({ heading: m.heading, body: m.bodyHtml, images: m.images, cta: m.cta, footer: m.footerHtml, unsubUrl, preheader: m.bodyText, notice: m.notice }),
      text: mailText({ heading: m.heading, bodyText: m.bodyText, cta: m.cta, footerText: m.footerText, unsubUrl }),
    };
  }
  const link = (path) => publicUrl + path + (path.includes('?') ? '&' : '?') + 'from=email';

  // ── the receipt confirmation (2026-09-23): transactional, sent the
  // moment a forwarded receipt is read and held. Her email comes from the
  // auth admin API (profiles has none); `receipts: false` in her prefs
  // stands it down (the mail's own Stop link flips that key); the ledger
  // dedupes on the inbox row's id. Never throws — the webhook's answer
  // must not depend on the mail. ─────────────────────────────────────
  async function userEmail(uid) {
    try {
      const r = await fetchFn(`${supaUrl}/auth/v1/admin/users/${encodeURIComponent(uid)}`, { headers: svcHeaders() });
      if (!r.ok) return null;
      const j = await r.json().catch(() => null);
      return j && j.email ? j.email : null;
    } catch (_) { return null; }
  }
  async function sendReceiptMail({ userId, retailer, count, seen, images, ref }) {
    if (!on) return { ok: false, skipped: 'off' };
    if (!userId || ref == null) return { ok: false, skipped: 'args' };
    const prefs = (await readPrefs(userId)) || {};
    if (prefs.receipts === false) return { ok: false, skipped: 'pref' };
    const email = await userEmail(userId);
    if (!email) return { ok: false, skipped: 'no_email' };
    const shop = String(retailer || 'your receipt').trim();
    const n = Math.max(1, Number(count) || 1);
    const pieces = n === 1 ? 'one piece' : `${numWord(n)} pieces`;
    const m = {
      kind: 'receipt_held', ref, subject: `Robes read your ${shop} receipt.`, heading: `Your ${shop} receipt is read.`,
      bodyHtml: `Robes read <strong>${esc(pieces)}</strong> out of it${seen ? ', each one from its photograph' : ''}. Untick anything that went back and the rest file straight to your wardrobe.`,
      bodyText: `Robes read ${pieces} out of it${seen ? ', each one from its photograph' : ''}. Untick anything that went back and the rest file straight to your wardrobe.`,
      images: (images || []).filter(isHttp).slice(0, 3),
      cta: { label: n === 1 ? 'Review it' : 'Review them', url: link('/wardrobe?receipts=1') },
      notice: 'You’re getting this because you forwarded a receipt to your Robes address.',
    };
    return sendMail(compose({ id: userId, email }, m.kind, m));
  }

  // ── the data the tick reads, in a handful of service-key calls ───────
  async function loadUsers() {
    const prof = await selectDegrade('profiles', ['id', 'first_name', 'created_at', 'avatar_id', 'notification_prefs'], null, ['avatar_id']);
    if (!prof.rows) return { error: prof.error, users: [] };
    const emails = new Map();
    for (let page = 1; page <= 10; page++) {
      let r;
      try { r = await fetchFn(`${supaUrl}/auth/v1/admin/users?page=${page}&per_page=1000`, { headers: svcHeaders() }); } catch (_) { break; }
      if (!r.ok) break;
      const j = await r.json().catch(() => null);
      const list = j && Array.isArray(j.users) ? j.users : [];
      list.forEach((x) => { if (x && x.id && x.email) emails.set(x.id, x.email); });
      if (list.length < 1000) break;
    }
    const users = prof.rows.map((p) => ({
      id: p.id, email: emails.get(p.id) || null, name: p.first_name || '',
      created: p.created_at ? new Date(p.created_at).getTime() : 0,
      avatarId: p.avatar_id == null ? null : p.avatar_id,
      avatarKnown: !prof.missing.includes('avatar_id'),
      prefs: p.notification_prefs && typeof p.notification_prefs === 'object' ? p.notification_prefs : {},
    })).filter((u) => u.email);
    return { users };
  }
  const lookFrame = (l) => isHttp(l.render_url) ? l.render_url : isHttp(l.photo_url) ? l.photo_url
    : ((l.look_pieces || []).map((lp) => lp && lp.wardrobe_items && lp.wardrobe_items.image_url).find(isHttp) || null);
  async function loadLooks() {
    const r = await selectDegrade('looks', ['id', 'user_id', 'name', 'created_at', 'render_url', 'photo_url', 'proposals', 'look_pieces(wardrobe_items(image_url))'],
      'order=created_at.desc&limit=5000', ['render_url', 'proposals', 'look_pieces(wardrobe_items(image_url))']);
    return r.rows || [];
  }
  const groupBy = (rows, key) => { const m = new Map(); rows.forEach((r) => { const k = r[key]; if (!m.has(k)) m.set(k, []); m.get(k).push(r); }); return m; };

  // ── the tick ──────────────────────────────────────────────────────────
  let ticking = false;
  async function notifyTick(now = new Date()) {
    const out = { sent: [], skipped: 0, considered: 0, error: null };
    if (!on) { out.error = 'off'; return out; }
    if (ticking) { out.error = 'busy'; return out; }
    ticking = true;
    try {
      const t = now.getTime();
      const { users, error } = await loadUsers();
      if (error) { out.error = 'profiles: ' + String(error).slice(0, 120); return out; }
      const [ledgerR, eventsR, wardrobeR, kpR, pdR, looks] = await Promise.all([
        rest('notifications?select=user_id,kind,ref,sent_at&order=sent_at.desc&limit=20000'),
        rest('events?event_type=in.(model_filed,robes_build_opened)&select=user_id,event_type&limit=20000'),
        rest('wardrobe_items?select=user_id,image_url,created_at&limit=20000'),
        rest(`lookbook_items?type=eq.key-piece&created_at=gte.${encodeURIComponent(new Date(t - LOOKS_READY_WINDOW).toISOString())}&select=id,user_id,title,data,created_at&order=created_at.desc&limit=2000`),
        rest(`planned_days?day_date=gte.${addDaysISO(new Date(t).toISOString().slice(0, 10), -1)}&day_date=lte.${addDaysISO(new Date(t).toISOString().slice(0, 10), 9)}&select=user_id,day_date,source_type,source_id,slot,activity,headline,thumb_urls,status&limit=20000`),
        loadLooks(),
      ]);
      if (!ledgerR.ok) { out.error = 'notifications: ' + String(ledgerR.text).slice(0, 120); return out; }
      const ledger = groupBy(ledgerR.json || [], 'user_id');
      const events = groupBy(eventsR.ok ? (eventsR.json || []) : [], 'user_id');
      const wardrobe = groupBy(wardrobeR.ok ? (wardrobeR.json || []) : [], 'user_id');
      const kps = groupBy(kpR.ok ? (kpR.json || []) : [], 'user_id');
      const pds = groupBy(pdR.ok ? (pdR.json || []) : [], 'user_id');
      const looksBy = groupBy(looks, 'user_id');

      for (const u of users) {
        out.considered++;
        const tz = typeof u.prefs.timezone === 'string' && u.prefs.timezone ? u.prefs.timezone : DEFAULT_TZ;
        const loc = localParts(now, tz);
        const led = ledger.get(u.id) || [];
        const has = (kind, ref) => led.some((r) => r.kind === kind && (ref == null || r.ref === String(ref)));
        const ev = events.get(u.id) || [];
        const myLooks = looksBy.get(u.id) || [];
        const pics = (wardrobe.get(u.id) || []).filter((w) => isHttp(w.image_url)).map((w) => new Date(w.created_at || 0).getTime()).sort((a, b) => a - b);
        const age = t - u.created;
        const nudges = u.prefs.nudges === true;
        const sentToday = led.some((r) => SEQ_KINDS.includes(r.kind) && localParts(new Date(r.sent_at), tz).date === loc.date);

        // ── the sequence: one rule per session, first match wins ──
        let m = null;
        if (!sentToday) {
          const kp = (kps.get(u.id) || [])[0];
          const frames = kp && kp.data && kp.data.kpData && Array.isArray(kp.data.kpData.generatedImages) ? kp.data.kpData.generatedImages.filter(isHttp) : [];
          if (kp && frames.length >= 3 && u.prefs.looks_ready !== false && !has('looks_ready', kp.id)) {
            const piece = cap1(String(kp.title || 'Your piece').trim());
            m = { kind: 'looks_ready', ref: kp.id, subject: 'Your three looks are ready.', heading: 'Your three looks are ready.',
              bodyHtml: `<strong>${esc(piece)}</strong>, worn three ways. Pick one and Robes builds it around what’s yours.`,
              bodyText: `${piece}, worn three ways. Pick one and Robes builds it around what’s yours.`,
              images: frames.slice(0, 3), cta: { label: 'See the looks', url: link(`/inspiration?open=${encodeURIComponent(kp.id)}`) } };
          } else if (nudges && age >= DAY && u.avatarKnown && u.avatarId == null && myLooks.length && !ev.some((e) => e.event_type === 'model_filed') && !has('look_waiting')) {
            const l = myLooks[0];
            m = { kind: 'look_waiting', ref: l.id, subject: 'She’d wear it.', heading: 'She’d wear it.',
              bodyHtml: `<em>${esc(l.name)}</em> is in your Lookbook. Build your model once and she wears every look you keep.`,
              bodyText: `${l.name} is in your Lookbook. Build your model once and she wears every look you keep.`,
              images: [lookFrame(l)], cta: { label: 'Build your model', url: link('/stylenotes') } };
          } else if (nudges && age >= 3 * DAY && pics.length < 5 && !has('borrowing')) {
            const l = myLooks.find((x) => Array.isArray(x.proposals) && x.proposals.length >= 2);
            if (l) {
              const names = listWords(l.proposals.slice(0, 4).map(gapName));
              const n = numWord(l.proposals.length);
              m = { kind: 'borrowing', ref: l.id, subject: `Robes is borrowing ${n} things.`, heading: `Robes is borrowing ${n} things.`,
                bodyHtml: `<em>${esc(l.name)}</em> borrows ${esc(names)}. Photograph yours and the look is entirely yours.`,
                bodyText: `${l.name} borrows ${names}. Photograph yours and the look is entirely yours.`,
                images: [lookFrame(l)], cta: { label: 'Photograph them', url: link(`/lookbook?open=${encodeURIComponent(l.id)}&fill=1`) } };
            }
          }
          if (!m && nudges && pics.length >= 5 && t - pics[4] >= DAY && !ev.some((e) => e.event_type === 'robes_build_opened') && !has('five')) {
            m = { kind: 'five', ref: 'five', subject: 'Robes can build from yours now.', heading: 'Robes can build from yours now.',
              bodyHtml: 'Five pieces filed. Open the composer and let Robes build one from what you own.',
              bodyText: 'Five pieces filed. Open the composer and let Robes build one from what you own.',
              images: [], cta: { label: 'Let Robes build one', url: link('/lookbook?new=1&robes=1') } };
          }
          if (!m && nudges && age >= 7 * DAY && myLooks.length) {
            const week = isoWeek(loc.date);
            const ahead = (pds.get(u.id) || []).some((r) => r.day_date >= loc.date && r.day_date <= addDaysISO(loc.date, 7));
            const last = led.filter((r) => r.kind === 'week_empty').map((r) => new Date(r.sent_at).getTime()).sort((a, b) => b - a)[0];
            if (!ahead && !has('week_empty', week) && (!last || t - last >= 14 * DAY)) {
              m = { kind: 'week_empty', ref: week, subject: 'Nothing planned this week.', heading: 'Nothing planned this week.',
                bodyHtml: 'Name a day and Robes dresses it. The diary keeps the week.',
                bodyText: 'Name a day and Robes dresses it. The diary keeps the week.',
                images: [], cta: { label: 'Open the diary', url: link('/diary') } };
            }
          }
        }
        if (m) {
          const r = await sendMail(compose(u, m.kind, m));
          if (r.ok) out.sent.push({ user: u.id, kind: m.kind, ref: String(m.ref) }); else out.skipped++;
        }

        // ── the morning cue: her hour, her date, only a day she planned ──
        if (u.prefs.morning === true) {
          const hour = Math.min(10, Math.max(6, Number(u.prefs.morning_hour) || 7));
          if (loc.hour === hour && !has('morning', loc.date)) {
            const rows = (pds.get(u.id) || []).filter((r) => r.day_date === loc.date);
            if (rows.length) {
              const dayRow = rows.find((r) => r.source_type === 'day');
              const lookRow = rows.find((r) => r.source_type === 'look' && (r.slot || 'day') === 'day') || rows.find((r) => r.source_type === 'look');
              const otherRow = rows.find((r) => r.source_type !== 'day' && r !== lookRow);
              const look = lookRow ? myLooks.find((x) => x.id === lookRow.source_id) : null;
              const lookName = look ? look.name : (lookRow && (lookRow.headline || lookRow.activity)) || (otherRow && (otherRow.headline || otherRow.activity)) || null;
              const title = (dayRow && dayRow.activity) || (lookRow && lookRow.activity) || (otherRow && otherRow.activity) || lookName || 'Your day';
              const frame = look ? lookFrame(look) : ((lookRow || otherRow) && (((lookRow || otherRow).thumb_urls || []).find(isHttp))) || null;
              // The weather line only if a generated look FILED a forecast —
              // Robes never asserts her weather in mail.
              let wx = null;
              const dailyRow = rows.find((r) => r.source_type === 'daily');
              if (dailyRow && /^\d+$/.test(String(dailyRow.source_id))) {
                const lb = await rest(`lookbook_items?id=eq.${dailyRow.source_id}&user_id=eq.${encodeURIComponent(u.id)}&select=data`);
                const c = lb.ok && lb.json && lb.json[0] && lb.json[0].data && lb.json[0].data.dlData && lb.json[0].data.dlData.context;
                if (c && (c.tempRange || c.condition)) wx = [c.city, c.tempRange, c.condition].filter(Boolean).join(' · ');
              }
              const bodyText = (lookName && lookName !== title ? `Wearing ${lookName}.` : `${title}.`) + (wx ? ` ${wx}.` : '');
              const mm = { kind: 'morning', ref: loc.date, subject: `${loc.weekday} · ${title}`, heading: title,
                bodyHtml: (lookName && lookName !== title ? `Wearing <em>${esc(lookName)}</em>.` : esc(title) + '.') + (wx ? ` <span style="color:#8E8A83">${esc(wx)}.</span>` : ''),
                bodyText, images: [frame], cta: { label: 'Open the day', url: link(`/dashboard?d=${loc.date}`) },
                footerHtml: 'Wore it? The day page takes it.', footerText: 'Wore it? The day page takes it.' };
              const r = await sendMail(compose(u, 'morning', mm));
              if (r.ok) out.sent.push({ user: u.id, kind: 'morning', ref: loc.date }); else out.skipped++;
            }
          }
        }
      }
    } catch (e) {
      out.error = String(e && e.message || e).slice(0, 200);
      log.warn('[notify] tick failed:', out.error);
    } finally { ticking = false; }
    return out;
  }

  return { on, sendMail, sendReceiptMail, notifyTick, unsubToken, verifyUnsub, applyUnsub, unsubUrlFor, SEQ_KINDS };
}
