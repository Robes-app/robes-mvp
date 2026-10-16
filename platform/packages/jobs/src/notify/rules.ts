import type { UnsubPref } from '@robes/emails';

// The email sequence from legacy notify.js plus the first seven days (legacy
// docs/beta-onboarding-7day-brief.md), as pure rules over one person's state. At most one
// sequence message a day across email and push. Not ported yet: `borrowing`.
export const SEQUENCE_KINDS = [
  'looks_ready',
  'first_piece',
  'pick_one',
  'look_waiting',
  'model_nudge',
  'five',
  'batch_nudge',
  'week_one',
  'week_empty',
] as const;
export type NotifyKind = (typeof SEQUENCE_KINDS)[number] | 'morning' | 'wore_it';
// Sent at most once per person, ever: read against her whole ledger, not the 30-day window
// (the ledger's unique key is permanent, so a re-pick would only collide and burn the day).
export const ONCE_KINDS = [
  'first_piece',
  'look_waiting',
  'model_nudge',
  'five',
  'batch_nudge',
  'week_one',
] as const;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
export const LOOKS_READY_WINDOW_MS = 48 * HOUR;
export const MORNING_HOUR = 7;
// The evening ask on a dressed day (legacy home's Wore it? after 19:00).
export const WORE_IT_HOUR = 19;
// Sequence mails land 08:00–20:00 her time; outside it they wait for the next tick inside it.
export const SEND_WINDOW = { from: 8, until: 20 } as const;
export const PIECES_TO_BUILD = 5;
// The first seven days (7-day brief): each message has a window of account age, so an older or
// migrated account is never swept in on the first tick.
export const FIRST_WEEK = {
  first_piece: { from: 4 * HOUR, until: 2 * DAY },
  model_nudge: { from: 2 * DAY, until: 5 * DAY },
  batch_nudge: { from: 4 * DAY, until: 7 * DAY },
  week_one: { from: 6 * DAY, until: 9 * DAY },
} as const;
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
  // Looks Robes made overnight, by her local date (M5 task 3).
  overnight?: { id: string; date: string; headline: string }[];
  // Her newest idea from the last 48 h, with how many frames rendered.
  // `set`: a suggested-look set (look states); its link is the keep-or-pass deck.
  latestIdea: {
    id: string;
    title: string;
    readyFrames: number;
    createdAt: Date;
    set?: boolean;
  } | null;
  readyPieces: number;
  fifthPieceAt: Date | null;
  looks: number;
  // Whether she has filed a model (undefined: unknown, so the model nudge never fires).
  hasModel?: boolean;
  newestLook?: { id: string; name: string } | null;
  // Looks pinned from today (her date) for the next week; `worn` once she logged that day.
  plan: { date: string; lookName: string; activity: string | null; slot: string; worn?: boolean }[];
  // She has filed a piece or styled one, ever (first_piece waits for neither).
  started?: boolean;
  // ONCE_KINDS she has ever been sent, on any channel.
  onceSent?: readonly string[];
  // Push reaches at least one of her devices (push-only moments need it).
  hasPush?: boolean;
}

export type Planned =
  | {
      kind: 'looks_ready';
      ref: string;
      pref: UnsubPref;
      ideaId: string;
      piece: string;
      set?: boolean;
    }
  | { kind: 'look_waiting'; ref: string; pref: UnsubPref; look: string }
  | { kind: 'five'; ref: string; pref: UnsubPref }
  | { kind: 'week_empty'; ref: string; pref: UnsubPref }
  | { kind: 'first_piece'; ref: string; pref: UnsubPref }
  | { kind: 'pick_one'; ref: string; pref: UnsubPref; piece: string; set?: boolean }
  | {
      kind: 'week_one';
      ref: string;
      pref: UnsubPref;
      counts: { pieces: number; looks: number; model: boolean; dressed: string | null };
      next: WeekOneNext;
      date: string;
    }
  | { kind: 'model_nudge'; ref: string; pref: UnsubPref; channel: 'push'; look: string }
  | { kind: 'batch_nudge'; ref: string; pref: UnsubPref; channel: 'push'; remaining: number }
  | {
      kind: 'wore_it';
      ref: string;
      pref: UnsubPref;
      channel: 'push';
      date: string;
      weekday: string;
    }
  | {
      kind: 'morning';
      ref: string;
      pref: UnsubPref;
      date: string;
      weekday: string;
      title: string;
      look: string | null;
      // Set when the cue opens the overnight look rather than a planned day.
      dailyLookId?: string;
    };

// week_one's one CTA: the first tier she has not reached (the home's order).
export type WeekOneNext = 'model' | 'five' | 'plan' | 'wear' | 'done';

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

const weekdayOf = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' });

export function weekOneNext(state: NotifyState, today: string): WeekOneNext {
  if (state.hasModel === false && state.looks > 0) return 'model';
  if (state.readyPieces < PIECES_TO_BUILD) return 'five';
  const ahead = state.plan.filter((p) => p.date >= today);
  if (ahead.length === 0) return 'plan';
  if (ahead.some((p) => p.date === today && !p.worn)) return 'wear';
  return 'done';
}

// At most one sequence message per local day (email or push), inside her 08:00–20:00: the
// eligible ones in priority order (the tick sends the first it can claim); the morning cue and
// Wore it? are separate moments.
export function plan(
  user: Recipient,
  state: NotifyState,
  now: Date,
): { sequence: Planned[]; moments: Planned[] } {
  const local = localParts(now, user.timezone);
  const has = (kind: string, ref?: string) =>
    ((ONCE_KINDS as readonly string[]).includes(kind) && (state.onceSent ?? []).includes(kind)) ||
    state.ledger.some((r) => r.kind === kind && (ref === undefined || r.ref === ref));
  const sentToday = state.ledger.some(
    (r) =>
      (SEQUENCE_KINDS as readonly string[]).includes(r.kind) &&
      localParts(r.sentAt, user.timezone).date === local.date,
  );
  const inWindow = local.hour >= SEND_WINDOW.from && local.hour < SEND_WINDOW.until;
  const out: Planned[] = [];
  const t = now.getTime();
  const age = t - user.createdAt.getTime();
  const within = (k: keyof typeof FIRST_WEEK) =>
    age >= FIRST_WEEK[k].from && age < FIRST_WEEK[k].until;
  const idea = state.latestIdea;

  const candidates: Planned[] = [];
  if (
    idea &&
    // The hero frame renders up front; the other two only when she asks (UX-09).
    idea.readyFrames >= 1 &&
    t - idea.createdAt.getTime() <= LOOKS_READY_WINDOW_MS &&
    user.prefs.looksReady &&
    !has('looks_ready', idea.id)
  ) {
    candidates.push({
      kind: 'looks_ready',
      ref: idea.id,
      pref: 'looksReady',
      ideaId: idea.id,
      piece: idea.title,
      ...(idea.set ? { set: true } : {}),
    });
  }
  // Day 0: four hours in and nothing filed or styled (a nudge, filed under nudges).
  if (
    user.prefs.nudges &&
    state.started === false &&
    within('first_piece') &&
    !has('first_piece')
  ) {
    candidates.push({ kind: 'first_piece', ref: 'first', pref: 'nudges' });
  }
  // Day 1: she saw the three ways a day ago and kept nothing.
  if (
    user.prefs.nudges &&
    idea &&
    idea.readyFrames >= 1 &&
    t - idea.createdAt.getTime() >= DAY &&
    t - idea.createdAt.getTime() <= LOOKS_READY_WINDOW_MS &&
    state.looks === 0 &&
    !has('pick_one', idea.id)
  ) {
    candidates.push({
      kind: 'pick_one',
      ref: idea.id,
      pref: 'nudges',
      piece: idea.title,
      ...(idea.set ? { set: true } : {}),
    });
  }
  // Legacy look_waiting: a day in, a saved look, and no model to wear it — once, ever.
  if (
    user.prefs.nudges &&
    age >= DAY &&
    state.hasModel === false &&
    state.newestLook &&
    !has('look_waiting')
  ) {
    candidates.push({
      kind: 'look_waiting',
      ref: state.newestLook.id,
      pref: 'nudges',
      look: state.newestLook.name,
    });
  }
  // Day 2 (push): the model nudge.
  if (
    user.prefs.nudges &&
    state.hasPush &&
    within('model_nudge') &&
    state.hasModel === false &&
    state.newestLook &&
    !has('model_nudge')
  ) {
    candidates.push({
      kind: 'model_nudge',
      ref: 'model',
      pref: 'nudges',
      channel: 'push',
      look: state.newestLook.name,
    });
  }
  if (
    user.prefs.nudges &&
    state.readyPieces >= PIECES_TO_BUILD &&
    state.fifthPieceAt &&
    t - state.fifthPieceAt.getTime() >= DAY &&
    !has('five')
  ) {
    candidates.push({ kind: 'five', ref: 'five', pref: 'nudges' });
  }
  // Day 4 (push): the batch nudge while fewer than five are filed.
  if (
    user.prefs.nudges &&
    state.hasPush &&
    within('batch_nudge') &&
    state.readyPieces < PIECES_TO_BUILD &&
    !has('batch_nudge')
  ) {
    candidates.push({
      kind: 'batch_nudge',
      ref: 'batch',
      pref: 'nudges',
      channel: 'push',
      remaining: PIECES_TO_BUILD - state.readyPieces,
    });
  }
  // Day 6: her week on paper, once.
  if (user.prefs.nudges && within('week_one') && !has('week_one')) {
    const dressed = state.plan.find((p) => p.date >= local.date);
    candidates.push({
      kind: 'week_one',
      ref: 'week1',
      pref: 'nudges',
      counts: {
        pieces: state.readyPieces,
        looks: state.looks,
        model: state.hasModel === true,
        dressed: dressed ? weekdayOf(dressed.date) : null,
      },
      next: weekOneNext(state, local.date),
      date: local.date,
    });
  }
  // Day 5 on (plan_a_day): nothing planned this week.
  if (user.prefs.nudges && age >= 5 * DAY && state.looks > 0) {
    const week = isoWeek(local.date);
    const weekEnd = addDays(local.date, 7);
    const ahead = state.plan.some((p) => p.date >= local.date && p.date <= weekEnd);
    const last = state.ledger
      .filter((r) => r.kind === 'week_empty')
      .reduce((max, r) => Math.max(max, r.sentAt.getTime()), 0);
    if (!ahead && !has('week_empty', week) && t - last >= 14 * DAY) {
      candidates.push({ kind: 'week_empty', ref: week, pref: 'nudges' });
    }
  }
  const sequence = !sentToday && inWindow ? candidates : [];

  const today = state.plan.filter((p) => p.date === local.date);
  const first = today.find((p) => p.slot === 'day') ?? today[0];
  if (user.prefs.morningCue && local.hour === MORNING_HOUR && !has('morning', local.date)) {
    const overnight = state.overnight?.find((o) => o.date === local.date);
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
    } else if (overnight) {
      // No planned day, but Robes dressed her overnight: the cue opens that look.
      out.push({
        kind: 'morning',
        ref: local.date,
        pref: 'morningCue',
        date: local.date,
        weekday: local.weekday,
        title: overnight.headline,
        look: null,
        dailyLookId: overnight.id,
      });
    }
  }
  // 19:00 on a dressed day not yet worn (push only).
  if (
    user.prefs.morningCue &&
    state.hasPush &&
    local.hour === WORE_IT_HOUR &&
    first &&
    !today.some((p) => p.worn) &&
    !has('wore_it', local.date)
  ) {
    out.push({
      kind: 'wore_it',
      ref: local.date,
      pref: 'morningCue',
      channel: 'push',
      date: local.date,
      weekday: local.weekday,
    });
  }
  return { sequence, moments: out };
}

// The day's message as the rules rank it, then the moments.
export function decide(user: Recipient, state: NotifyState, now: Date): Planned[] {
  const { sequence, moments } = plan(user, state, now);
  return [...sequence.slice(0, 1), ...moments];
}
