// Looks: one entity in three states (docs/look-states-brief.md) and the rack the look prompt edits
// (docs/look-prompt-brief.md). Pure, shared by the API, the workers and both clients.

import { dayMonth } from '../calendar';

export const LOOK_STATUSES = ['suggested', 'draft', 'saved'] as const;
export type LookStatus = (typeof LOOK_STATUSES)[number];

export const LOOK_ROLES = ['canvas', 'anchor', 'texture', 'exclamation'] as const;
export type LookRole = (typeof LOOK_ROLES)[number];

// Several drafts wait at once; starting a sixth lets the oldest go (legacy _LK_DRAFT_MAX).
export const MAX_DRAFTS = 5;
// The note under a look's picture is three sentences at most (legacy _lkNoteShort).
export const NOTE_SENTENCES = 3;
// What she types into a look's prompt (legacy REFINE_MAX).
export const ASK_MAX_CHARS = 240;
export const ASK_THREAD_MAX = 6;
export const ASK_RACK_MAX = 14;

export function noteShort(note: string | null | undefined, n = NOTE_SENTENCES): string {
  const t = String(note ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!t) return '';
  const parts = t.match(/[^.!?]+[.!?]+(?:["'”’)]+)?(?=\s|$)|[^.!?]+$/g) ?? [t];
  return parts
    .slice(0, n)
    .map((x) => x.trim())
    .filter(Boolean)
    .join(' ');
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// "Miu Miu ballet sneakers" → "Ballet sneakers"; never empties a name (legacy _rbNameNoBrand).
export function nameNoBrand(name: string, brand: string | null | undefined): string {
  const n = String(name ?? '').trim();
  const b = String(brand ?? '').trim();
  if (!n || b.length < 2) return n;
  const esc = escapeRe(b);
  let out = n.replace(new RegExp(`^${esc}(?:['’]s)?[\\s\\-–—:·,]+`, 'i'), '');
  out = out.replace(new RegExp(`[\\s,]+(?:by|from|[\\-–—·|])\\s*${esc}$`, 'i'), '');
  out = out.replace(new RegExp(`\\s+${esc}$`, 'i'), '').trim();
  if (out.length < 2) return n;
  return out.charAt(0).toUpperCase() + out.slice(1);
}

// "Camel wool shacket" → "the camel wool shacket", for a sentence (legacy _rbLpThe).
export function theName(name: string): string {
  const s = String(name ?? '').trim();
  if (!s) return s;
  return /^(the|a|an|my|her|his)\s/i.test(s) ? s : `the ${s.charAt(0).toLowerCase()}${s.slice(1)}`;
}

// "around your rust slip dress": the anchor's name without its brand, lower-cased.
export function anchorName(label: string, brand: string | null | undefined): string {
  const nm = nameNoBrand(label, brand);
  return nm ? nm.charAt(0).toLowerCase() + nm.slice(1) : '';
}

// The facts a saved look states about itself, in the shape the copy line takes:
// its rack, its wears, when it was last worn (the date as the day says it) and the
// piece it was styled around. One reader, so the card and the look page agree.
export function lookFacts(
  look: {
    timesWorn: number;
    lastWornOn: string | null;
    anchor?: { label: string; brand: string | null } | null;
  },
  rows: number,
): { pieces: number; timesWorn: number; lastWorn: string | null; around: string | null } {
  const around = look.anchor ? anchorName(look.anchor.label, look.anchor.brand) : '';
  return {
    pieces: rows,
    timesWorn: look.timesWorn,
    lastWorn: look.timesWorn && look.lastWornOn ? dayMonth(look.lastWornOn) : null,
    around: around || null,
  };
}

// ── The rack ────────────────────────────────────────────────────────────
// A look's rows: her pieces (key = the piece id) and the pieces Robes proposes (key = `p-…`).

export interface Proposal {
  key: string;
  name: string;
  category: string;
  color: string;
  brand: string;
  retailerHint: string;
  pricePoint: string;
  role: LookRole | null;
  wishlisted: boolean;
}

export interface RackRow {
  key: string;
  // Her piece, or null for a proposal.
  pieceId: string | null;
  name: string;
  category: string;
  brand: string | null;
  role: LookRole | null;
  proposal: Proposal | null;
}

// What a changed row replaced, or that the prompt put it back (dropped at Save).
export interface RowEdit {
  was?: RackRow;
  back?: boolean;
}

export interface RackState {
  rows: RackRow[];
  edits: Record<string, RowEdit>;
  styling: Record<string, string>;
}

const PROPOSAL_KEY = /^p-[a-z0-9]{4,16}$/;
export function isProposalKey(key: string): boolean {
  return PROPOSAL_KEY.test(key);
}
export const PROPOSAL_KEY_PATTERN = PROPOSAL_KEY;

export function newProposalKey(random: () => number = Math.random): string {
  let s = '';
  for (let i = 0; i < 8; i += 1) s += Math.floor(random() * 36).toString(36);
  return `p-${s}`;
}

// The formula's order (Canvas → Anchor → Texture → Exclamation), stable inside a role.
export function orderRack<T extends { role: LookRole | null }>(rows: readonly T[]): T[] {
  const rank = (r: LookRole | null) => (r ? LOOK_ROLES.indexOf(r) : LOOK_ROLES.length);
  return rows
    .map((row, i) => ({ row, i }))
    .sort((a, b) => rank(a.row.role) - rank(b.row.role) || a.i - b.i)
    .map((x) => x.row);
}

// "Swapped in · was …", "Back in · from the prompt" or nothing, per row.
export type RowNote = { kind: 'was'; name: string } | { kind: 'back' } | null;
export function rowNote(state: Pick<RackState, 'edits'>, key: string): RowNote {
  const e = state.edits[key];
  if (e?.was) return { kind: 'was', name: e.was.name };
  if (e?.back) return { kind: 'back' };
  return null;
}

export function changedKeys(state: Pick<RackState, 'edits'>): string[] {
  return Object.entries(state.edits)
    .filter(([, e]) => Boolean(e.was))
    .map(([k]) => k);
}

// An edit from the look prompt, resolved by the server against the rack she sent.
export type AskTarget =
  | { pieceId: string; name: string; category: string; brand: string | null }
  | {
      proposal: Omit<Proposal, 'key' | 'role' | 'wishlisted'>;
    };
export interface AskEdit {
  swaps: { key: string; to: AskTarget }[];
  back: string[];
  styled: { key: string; note: string }[];
  // True when "back" names nothing: every changed row goes back.
  backAll?: boolean;
}

// Lands one answer on the rack (legacy _lkLpApplyComposer): a swap replaces the row in place and
// remembers what it was; a put-back restores it; a styling note is kept per row.
export function applyAsk(
  state: RackState,
  edit: AskEdit,
  newKey: () => string = () => newProposalKey(),
): RackState {
  const rows = [...state.rows];
  const edits = { ...state.edits };
  const styling = { ...state.styling };

  const backKeys = edit.backAll ? changedKeys(state) : edit.back;
  for (const key of backKeys) {
    const was = edits[key]?.was;
    const at = rows.findIndex((r) => r.key === key);
    if (!was || at < 0) continue;
    if (rows.some((r, i) => i !== at && r.key === was.key)) continue;
    rows[at] = was;
    delete edits[key];
    if (key !== was.key) delete styling[key];
    edits[was.key] = { back: true };
  }

  for (const swap of edit.swaps) {
    const at = rows.findIndex((r) => r.key === swap.key);
    const cur = rows[at];
    if (!cur) continue;
    let next: RackRow;
    if ('pieceId' in swap.to) {
      const to = swap.to;
      if (rows.some((r) => r.pieceId === to.pieceId)) continue;
      next = {
        key: to.pieceId,
        pieceId: to.pieceId,
        name: to.name,
        category: to.category,
        brand: to.brand,
        role: cur.role,
        proposal: null,
      };
    } else {
      const key = newKey();
      const p = swap.to.proposal;
      next = {
        key,
        pieceId: null,
        name: p.name,
        category: p.category,
        brand: p.brand || null,
        role: cur.role,
        proposal: { ...p, key, role: cur.role, wishlisted: false },
      };
    }
    // The first change on a row remembers the original; a second keeps it.
    const original = edits[cur.key]?.was ?? cur;
    delete edits[cur.key];
    if (cur.key !== next.key) delete styling[cur.key];
    rows[at] = next;
    if (original.key === next.key) delete edits[next.key];
    else edits[next.key] = { was: original };
  }

  for (const s of edit.styled) {
    if (rows.some((r) => r.key === s.key) && s.note.trim()) styling[s.key] = s.note.trim();
  }
  return { rows, edits, styling };
}

// Order-free signature of what a look shows: a frame or a render is for exactly this rack.
export function rackSignature(state: Pick<RackState, 'rows' | 'styling'>): string {
  return state.rows
    .map((r) => {
      const id = r.pieceId ?? `${r.name}|${r.brand ?? ''}`;
      const st = state.styling[r.key];
      return st ? `${id}~${st}` : id;
    })
    .sort()
    .join(';');
}

// ── A day read out of her words (legacy _rbAskDateFrom, 2026-10-13) ──────────
// Deterministic: today/tonight, tomorrow, a weekday (the coming one; "next friday" the one after),
// the weekend (the coming Saturday), next week (Monday), or a date. Null when it can't place one.

const DAY_MS = 86_400_000;
const WEEKDAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const isoMs = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
export function addDays(iso: string, n: number): string {
  return new Date(isoMs(iso) + n * DAY_MS).toISOString().slice(0, 10);
}
export function weekdayOf(iso: string): number {
  return new Date(isoMs(iso)).getUTCDay();
}
export function daysBetween(from: string, to: string): number {
  return Math.round((isoMs(to) - isoMs(from)) / DAY_MS);
}

// A date worth carrying: a real ISO day, today or later.
export function askDate(iso: string | null | undefined, today: string): string | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso) || Number.isNaN(isoMs(iso))) return null;
  return iso >= today ? iso : null;
}

export function askDateFrom(text: string, today: string): string | null {
  const t = ` ${String(text ?? '')
    .toLowerCase()
    .replace(/[^\w\s'’/-]/g, ' ')
    .replace(/\s+/g, ' ')} `;
  const dow = weekdayOf(today);
  let m = t.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (m?.[1]) return askDate(m[1], today);
  m = t.match(
    /\b(?:(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*|(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?)\b/,
  );
  if (m) {
    const d = Number(m[1] ?? m[4]);
    const mo = MONTHS.indexOf(m[2] ?? m[3] ?? '');
    if (d >= 1 && d <= 31 && mo >= 0) {
      const y = Number(today.slice(0, 4));
      const iso = (yr: number) =>
        `${yr}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const next = askDate(iso(y + 1), today);
      // A date already gone this year is next year's only within six months.
      const near = next !== null && daysBetween(today, next) <= 183;
      return askDate(iso(y), today) ?? (near ? next : null);
    }
  }
  if (/\b(today|tonight|this (morning|afternoon|evening))\b/.test(t)) return today;
  if (/\btomorrow\b/.test(t)) return addDays(today, 1);
  m = t.match(/\b(next )?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (m?.[2]) {
    const target = WEEKDAYS.indexOf(m[2] as (typeof WEEKDAYS)[number]);
    return addDays(today, ((target - dow + 7) % 7) + (m[1] ? 7 : 0));
  }
  m = t.match(/\b(this|the|next|at the|for the|on the) weekend\b/);
  if (m) {
    const off = dow === 0 ? 0 : (6 - dow + 7) % 7;
    return addDays(today, off + (m[1] === 'next' && off === 0 ? 7 : 0));
  }
  if (/\bnext week\b/.test(t)) return addDays(today, (1 - dow + 7) % 7 || 7);
  return null;
}

// How a day reads in a sentence: "today", "tomorrow", "on Friday", "next Friday", or a date.
export type AskWhen =
  | { kind: 'today' }
  | { kind: 'tomorrow' }
  | { kind: 'weekday'; weekday: number }
  | { kind: 'next'; weekday: number }
  | { kind: 'date'; iso: string };
export function askWhen(iso: string, today: string): AskWhen {
  const off = daysBetween(today, iso);
  if (off <= 0) return { kind: 'today' };
  if (off === 1) return { kind: 'tomorrow' };
  if (off <= 6) return { kind: 'weekday', weekday: weekdayOf(iso) };
  if (off <= 13) return { kind: 'next', weekday: weekdayOf(iso) };
  return { kind: 'date', iso };
}

// The weather word a dated ask is styled for (legacy _rbAskWeatherLine), from WMO codes.
export type ForecastWord = 'snowing' | 'raining' | 'hot' | 'cold' | 'sunny' | 'cool' | 'mild';
export function forecastWord(wx: { code: number | null; tmax: number | null }): ForecastWord {
  const c = Number(wx.code);
  const tmax = wx.tmax;
  const has = typeof tmax === 'number' && Number.isFinite(tmax);
  if ([71, 73, 75, 77, 85, 86].includes(c)) return 'snowing';
  if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82) || c >= 95) return 'raining';
  if (has && tmax >= 25) return 'hot';
  if (has && tmax <= 10) return 'cold';
  if (c === 0 || c === 1) return 'sunny';
  if (has && tmax <= 15) return 'cool';
  return 'mild';
}

// ── Keep or pass (legacy F14 deck) ──────────────────────────────────────────
// The looks join in landing order; `at` is the top card. A pass can be undone; nothing re-sorts.
export interface DeckState {
  order: string[];
  at: number;
  kept: string[];
  passed: string[];
}

export const emptyDeck = (): DeckState => ({ order: [], at: 0, kept: [], passed: [] });

export type DeckAction =
  | { type: 'land'; ids: readonly string[] }
  | { type: 'keep'; id: string }
  | { type: 'pass'; id: string }
  | { type: 'undo'; id: string };

export function deckReduce(state: DeckState, action: DeckAction): DeckState {
  switch (action.type) {
    case 'land': {
      const fresh = action.ids.filter((id) => !state.order.includes(id));
      return fresh.length ? { ...state, order: [...state.order, ...fresh] } : state;
    }
    case 'keep':
    case 'pass': {
      if (state.order[state.at] !== action.id) return state;
      const list = action.type === 'keep' ? 'kept' : 'passed';
      return { ...state, at: state.at + 1, [list]: [...state[list], action.id] };
    }
    case 'undo': {
      if (!state.passed.includes(action.id)) return state;
      const order = state.order.filter((id) => id !== action.id);
      const at = Math.max(0, state.at - 1);
      order.splice(at, 0, action.id);
      return { ...state, order, at, passed: state.passed.filter((id) => id !== action.id) };
    }
  }
}

export function deckTop(state: DeckState): string | null {
  return state.order[state.at] ?? null;
}

// ── Robes' frame ────────────────────────────────────────────────────────────
// Which rack a frame shows (her pieces, the proposals, how each is worn), order-free: a frame is
// re-drawn only when this changes. FNV-1a, so it runs the same on the server and in the apps.
function fnv(s: string, seed: number): string {
  let h = seed >>> 0;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36).padStart(7, '0');
}

export function frameKey(
  pieceIds: readonly string[],
  proposals: readonly { name: string; brand?: string | null }[],
  styling: Readonly<Record<string, string>>,
): string {
  const parts = [
    ...pieceIds.map((id) => `${id}~${styling[id] ?? ''}`),
    ...proposals.map((p) => `${p.name}|${p.brand ?? ''}`),
  ].sort();
  const s = parts.join(';');
  return `${fnv(s, 0x811c9dc5)}${fnv(s, 0x01000193)}`;
}

// "started Tuesday" on a draft tile: today, a weekday this week, else the date.
export function startedLabel(createdAt: string, today: string, timeZone?: string): string {
  const fmt = (o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('en-GB', { ...o, ...(timeZone ? { timeZone } : {}) }).format(
      new Date(createdAt),
    );
  const day = new Intl.DateTimeFormat('en-CA', timeZone ? { timeZone } : {}).format(
    new Date(createdAt),
  );
  const off = daysBetween(day, today);
  if (off <= 0) return 'today';
  if (off < 7) return fmt({ weekday: 'long' });
  return fmt({ day: 'numeric', month: 'short' });
}

// The Saved tab's sort (legacy __lkSortMenu): newest first, last worn first, or by name. Sort
// shows from four looks (never inert).
export const SORTS = ['newest', 'lastWorn', 'name'] as const;
export type LookSort = (typeof SORTS)[number];
export const SORT_FROM = 4;
export function sortLooks<T extends { name: string; createdAt: string; lastWornOn: string | null }>(
  looks: readonly T[],
  by: LookSort,
): T[] {
  const list = [...looks];
  if (by === 'name') return list.sort((a, b) => a.name.localeCompare(b.name, 'en-GB'));
  if (by === 'lastWorn') {
    return list.sort(
      (a, b) =>
        (b.lastWornOn ?? '').localeCompare(a.lastWornOn ?? '') ||
        b.createdAt.localeCompare(a.createdAt),
    );
  }
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// Where a new look's pieces come from (legacy 2026-10-19): her answer to the one question asked on
// a new look, a chip or her own words. Words that name none of the three ride verbatim as a note.
export const BALANCES = ['owned', 'mix', 'new'] as const;
export type Balance = (typeof BALANCES)[number];
export const BALANCE_NOTE_MAX = 160;

export function readBalance(text: string): { balance: Balance | null; note: string | null } {
  const t = text.trim();
  const low = t.toLowerCase();
  if (
    /\b(all|only|just|everything|entirely)\b.*\b(mine|my|own|wardrobe|closet|have)\b|\b(mine|my wardrobe|my own|what i own|what i have)\b.*\b(only|alone)\b|^\s*(all )?mine\s*$|^\s*(from )?my (wardrobe|closet|own)\s*$|\bnothing new\b|\bno new\b/.test(
      low,
    )
  ) {
    return { balance: 'owned', note: null };
  }
  if (
    /\b(new|shop|buy|suggest|fresh|something different)\b/.test(low) &&
    !/\b(no|nothing|not|don'?t)\b.{0,14}\b(new|shop|buy)\b/.test(low)
  ) {
    return { balance: 'new', note: null };
  }
  if (/\b(a |the )?mix\b|\bboth\b|\bmostly mine\b|\bsome new\b|\bbalance\b/.test(low)) {
    return { balance: 'mix', note: null };
  }
  return { balance: null, note: t ? t.slice(0, BALANCE_NOTE_MAX) : null };
}

// What a wear held that the look no longer does, and what the look holds that she did not wear
// that day. A wear is immutable, so the record keeps saying what was on the body; the names come
// from each side's own record, and a piece with no name left is counted by `differs` alone.
export function wearDiff(
  worn: { id: string; label: string | null }[],
  now: { id: string }[],
  labelOf: (id: string) => string | null = () => null,
): { differs: boolean; instead: string[]; without: string[] } {
  const wornIds = new Set(worn.map((p) => p.id));
  const nowIds = new Set(now.map((p) => p.id));
  const instead = worn.filter((p) => !nowIds.has(p.id));
  const without = now.filter((p) => !wornIds.has(p.id));
  return {
    differs: instead.length > 0 || without.length > 0,
    instead: instead.map((p) => p.label).filter((l): l is string => !!l),
    without: without.map((p) => labelOf(p.id)).filter((l): l is string => !!l),
  };
}
