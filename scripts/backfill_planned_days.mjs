#!/usr/bin/env node
// One-off backfill: lookbook_items blobs → planned_days rows (migration 12).
//
// Run manually against Robes_p0, inspect, re-run safely (upserts on the
// unique index so repeats produce no duplicates):
//
//   SUPABASE_SERVICE_ROLE_KEY=... node scripts/backfill_planned_days.mjs --dry-run
//   SUPABASE_SERVICE_ROLE_KEY=... node scripts/backfill_planned_days.mjs
//
// Scope (decisions log, 23 Jul; weekly retired per ADR-001, 8 Aug):
//  - travel-edit rows: one row per MOMENT — travel blobs already carry
//    Day and Evening slots; deferred trips band with 'planned' rows.
//  - weekly-plan rows: NO LONGER EMITTED (the weekly track was removed
//    2026-08-08 and its planned_days rows are swept — re-running this
//    script must never resurrect them).
//  - daily-look rows: SKIPPED ENTIRELY. No guessing at created_at::date.
//  - unparseable rows are logged and skipped, never guessed.

const SUPA_URL = process.env.SUPABASE_URL || 'https://ayowpaknssulsqqvwpqx.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY = process.argv.includes('--dry-run');
const ENV = process.env.APP_ENV_LABEL || 'beta';

if (!KEY) { console.error('Set SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

const HEADERS = {
  apikey: KEY, Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
};

function isoAdd(iso, n) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function http(u) { return (typeof u === 'string' && u.startsWith('http')) ? u : null; }

function thumbs(items, gen) {
  const out = [];
  for (const it of items || []) {
    const u = (it?.wardrobe_match && http(it.wardrobe_match.image_url))
      || (Number.isInteger(it?.image_index) && Array.isArray(gen) ? http(gen[it.image_index]) : null);
    if (u && !out.includes(u)) out.push(u);
    if (out.length >= 3) break;
  }
  return out;
}

function ownedIds(items) {
  return (items || []).filter(it => it?.wardrobe_match?.id != null).map(it => it.wardrobe_match.id);
}

function base(row, sourceType, dayIndex, dayDate, slot) {
  return {
    user_id: row.user_id, day_date: dayDate,
    source_type: sourceType, source_id: String(row.id), day_index: dayIndex,
    slot, environment: ENV, updated_at: new Date().toISOString(),
  };
}

function rowsTravel(row) {
  const t = row.data?.tvData;
  if (!t) return { rows: [], skip: 'no tvData' };
  const from = new Date(String(t.dateFrom || '') + 'T00:00:00Z');
  if (isNaN(from)) return { rows: [], skip: 'no parseable dateFrom' };
  const days = Array.isArray(t.days) ? t.days : [];
  const rows = [];
  if (!days.length) {
    const to = new Date(String(t.dateTo || '') + 'T00:00:00Z');
    const n = (!isNaN(to) && to >= from) ? Math.min(10, Math.round((to - from) / 86400000) + 1) : 7;
    const plan = Array.isArray(t.trip_day_plan) ? t.trip_day_plan : [];
    for (let i = 0; i < n; i++) {
      rows.push({
        ...base(row, 'travel', i, isoAdd(t.dateFrom, i), 'day'),
        status: plan[i] === null ? 'free' : 'planned',
        activity: (typeof plan[i] === 'string' && plan[i]) ? plan[i] : null,
        headline: null, thumb_urls: [], item_ids: [],
      });
    }
    return { rows };
  }
  days.forEach((d, i) => {
    const date = isoAdd(t.dateFrom, i);
    const label = ((d.day_label || '').split('·')[1] || '').trim();
    if (d.rest || !Array.isArray(d.slots) || !d.slots.length) {
      rows.push({ ...base(row, 'travel', i, date, 'day'), status: 'free', activity: d.user_activity || null, headline: null, thumb_urls: [], item_ids: [] });
      return;
    }
    d.slots.slice(0, 2).forEach((s, si) => {
      const slot = (String(s.slot || '').toLowerCase() === 'evening' || si === 1) ? 'evening' : 'day';
      const pieces = (Array.isArray(s.formula) ? s.formula : []).map(f => (t.capsule || [])[f.item_index]).filter(Boolean);
      rows.push({
        ...base(row, 'travel', i, date, slot),
        status: 'planned',
        activity: d.user_activity || label || null,
        headline: s.title || null,
        thumb_urls: thumbs(pieces, t.generatedImages),
        item_ids: ownedIds(pieces),
      });
    });
  });
  return { rows };
}

async function main() {
  const res = await fetch(`${SUPA_URL}/rest/v1/lookbook_items?type=eq.travel-edit&select=id,user_id,type,title,created_at,data&order=created_at.asc&limit=1000`, { headers: HEADERS });
  if (!res.ok) { console.error('fetch lookbook_items failed:', res.status, await res.text()); process.exit(1); }
  const items = await res.json();
  console.log(`${items.length} travel lookbook rows (daily looks skipped by decision; weekly retired)`);

  let all = [], skipped = 0;
  for (const row of items) {
    const { rows, skip } = rowsTravel(row);
    if (skip) { skipped++; console.log(`  skip ${row.type} ${row.id} (${row.title || 'untitled'}): ${skip}`); continue; }
    all = all.concat(rows);
  }
  console.log(`→ ${all.length} planned_days rows to upsert, ${skipped} sources skipped`);

  if (DRY) {
    for (const r of all.slice(0, 20)) console.log(`  ${r.day_date} ${r.slot.padEnd(7)} ${r.source_type.padEnd(7)} idx ${r.day_index} ${r.status.padEnd(7)} ${r.activity || ''}`);
    if (all.length > 20) console.log(`  … and ${all.length - 20} more`);
    console.log('(dry run — nothing written)');
    return;
  }

  for (let i = 0; i < all.length; i += 100) {
    const batch = all.slice(i, i + 100);
    const up = await fetch(`${SUPA_URL}/rest/v1/planned_days?on_conflict=user_id,source_id,day_index,slot`, {
      method: 'POST',
      headers: { ...HEADERS, Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(batch),
    });
    if (!up.ok) { console.error('upsert failed:', up.status, await up.text()); process.exit(1); }
    console.log(`  upserted ${Math.min(i + 100, all.length)}/${all.length}`);
  }
  console.log('Done.');
}

main().catch(e => { console.error(e); process.exit(1); });
