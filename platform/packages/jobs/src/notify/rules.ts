import type { UnsubPref } from '@robes/emails';

// The email sequence from legacy notify.js, as pure rules over one person's state.
// Not ported yet: `look_waiting` (needs the avatar model) and `borrowing` (needs look proposals).
export const SEQUENCE_KINDS = ['looks_ready', 'five', 'week_empty'] as const;
export type NotifyKind = (typeof SEQUENCE_KINDS)[number] | 'morning';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
export const LOOKS_READY_WINDOW_MS = 48 * HOUR;
export const MORNING_HOUR = 7;
const DEFAULT_TZ = 'Europe/Dublin';

export interface Recipient {
  id: string;
  email: string;
  timezone: string;
  prefs: { looksReady: boolean; morningCue: boolean; nudges: boolean; receipts: boolean };
  createdAt: Date;
}

export interface NotifyState {
  ledger: { kind: string; ref: string; sentAt: Date }[];
  // Her newest idea from the last 48 h, with how many frames rendered.
  latestIdea: { id: string; title: string; readyFrames: number; createdAt: Date } | null;
  readyPieces: number;
  fifthPieceAt: Date | null;
  looks: number;
  // Looks pinned from today (her date) for the next week.
  plan: { date: string; lookName: string; activity: string | null; slot: string }[];
}

export type Planned =
  | { kind: 'looks_ready'; ref: string; pref: UnsubPref; ideaId: string; piece: string }
  | { kind: 'five'; ref: string; pref: UnsubPref }
  | { kind: 'week_empty'; ref: string; pref: UnsubPref }
  | {
      kind: 'morning';
      ref: string;
      pref: UnsubPref;
      date: string;
      weekday: string;
      title: string;
      look: string | null;
    };

// Her calendar reading of an instant; an unknown zone falls back rather than throwing.
export function localParts(now: Date, timezone: string) {
  const format = (tz: string) =>
    new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      weekday: 'long',
      hourCycle: 'h23',
    }).formatToParts(now);
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = format(timezone);
  } catch {
    parts = format(DEFAULT_TZ);
  }
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    hour: Number(p.hour) % 24,
    weekday: String(p.weekday),
  };
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function isoWeek(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + 3);
  const year = d.getUTCFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const week =
    1 + Math.round(((d.getTime() - jan4.getTime()) / DAY - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

// At most one sequence email per local day, first matching rule wins; the morning cue is separate.
export function decide(user: Recipient, state: NotifyState, now: Date): Planned[] {
  const local = localParts(now, user.timezone);
  const has = (kind: string, ref?: string) =>
    state.ledger.some((r) => r.kind === kind && (ref === undefined || r.ref === ref));
  const sentToday = state.ledger.some(
    (r) =>
      (SEQUENCE_KINDS as readonly string[]).includes(r.kind) &&
      localParts(r.sentAt, user.timezone).date === local.date,
  );
  const out: Planned[] = [];
  const t = now.getTime();

  if (!sentToday) {
    const idea = state.latestIdea;
    if (
      idea &&
      // The hero frame renders up front; the other two only when she asks (UX-09).
      idea.readyFrames >= 1 &&
      t - idea.createdAt.getTime() <= LOOKS_READY_WINDOW_MS &&
      user.prefs.looksReady &&
      !has('looks_ready', idea.id)
    ) {
      out.push({
        kind: 'looks_ready',
        ref: idea.id,
        pref: 'looksReady',
        ideaId: idea.id,
        piece: idea.title,
      });
    } else if (
      user.prefs.nudges &&
      state.readyPieces >= 5 &&
      state.fifthPieceAt &&
      t - state.fifthPieceAt.getTime() >= DAY &&
      !has('five')
    ) {
      out.push({ kind: 'five', ref: 'five', pref: 'nudges' });
    } else if (user.prefs.nudges && t - user.createdAt.getTime() >= 7 * DAY && state.looks > 0) {
      const week = isoWeek(local.date);
      const weekEnd = addDays(local.date, 7);
      const ahead = state.plan.some((p) => p.date >= local.date && p.date <= weekEnd);
      const last = state.ledger
        .filter((r) => r.kind === 'week_empty')
        .reduce((max, r) => Math.max(max, r.sentAt.getTime()), 0);
      if (!ahead && !has('week_empty', week) && t - last >= 14 * DAY) {
        out.push({ kind: 'week_empty', ref: week, pref: 'nudges' });
      }
    }
  }

  if (user.prefs.morningCue && local.hour === MORNING_HOUR && !has('morning', local.date)) {
    const today = state.plan.filter((p) => p.date === local.date);
    const first = today.find((p) => p.slot === 'day') ?? today[0];
    if (first) {
      out.push({
        kind: 'morning',
        ref: local.date,
        pref: 'morningCue',
        date: local.date,
        weekday: local.weekday,
        title: first.activity ?? first.lookName,
        look: first.activity ? first.lookName : null,
      });
    }
  }
  return out;
}
