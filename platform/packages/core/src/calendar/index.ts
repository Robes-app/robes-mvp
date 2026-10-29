// Calendar maths on plain YYYY-MM-DD strings (UTC, so no timezone can move a day).
export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Whole days from `from` to `date` (negative for a day gone by).
export function daysBetween(from: string, date: string): number {
  return Math.round(
    (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000,
  );
}

// The diary sheet's one rule (legacy `_lkDiaryPaint`): a day gone by records a wear, a day
// ahead files the look, and the CTA names whichever it is about to do. Shared so the web sheet
// and the native sheet cannot drift.
export type DiaryAction = 'put' | 'already' | 'record' | 'recorded';
export function diaryPick(
  picked: string,
  today: string,
  on: { pinned: boolean; worn: boolean; filed: boolean },
): { past: boolean; suffix: 'worn' | 'filed' | null; action: DiaryAction } {
  const past = picked < today;
  if (past) {
    return { past, suffix: 'worn', action: on.worn ? 'recorded' : 'record' };
  }
  return {
    past,
    suffix: on.filed ? 'filed' : null,
    action: on.pinned ? 'already' : 'put',
  };
}

// What the diary sheet's month marks for one look: every day carrying a look is filed, the days
// this look is pinned to say "already in the diary", and every day she wore it (its wears, not
// only the last one) is worn — and filed, so the month shows its history.
export function diaryMarks(
  days: ReadonlyArray<{ date: string; entries: ReadonlyArray<{ look: { id: string } }> }>,
  lookId: string | null | undefined,
  wornOn: Iterable<string | null | undefined>,
): { filed: Set<string>; pinned: Set<string>; worn: Set<string> } {
  const filed = new Set<string>();
  const pinned = new Set<string>();
  for (const d of days) {
    if (d.entries.length) filed.add(d.date);
    if (lookId && d.entries.some((e) => e.look.id === lookId)) pinned.add(d.date);
  }
  const worn = new Set<string>();
  for (const d of wornOn) {
    if (!d) continue;
    worn.add(d);
    filed.add(d);
  }
  return { filed, pinned, worn };
}

export function monthOf(date: string): string {
  return date.slice(0, 7);
}

export function shiftMonth(month: string, n: number): string {
  const d = new Date(`${month}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 7);
}

// A Monday-first grid for a month: the range to fetch and the cells (null pads the edges).
export function monthGrid(month: string): { from: string; days: number; cells: (string | null)[] } {
  const first = new Date(`${month}-01T00:00:00Z`);
  const days = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7;
  const from = `${month}-01`;
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: days }, (_, i) => addDays(from, i)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return { from, days, cells };
}

// "October 2026": the month view's head and the day page's back link.
export function monthLabel(month: string): string {
  return `${monthLong(`${month}-01`)} ${month.slice(0, 4)}`;
}

// Day planning (legacy ff87e89, Day_Planning design): the list is summary rows grouped by week,
// and every day opens one day page.

export function mondayOf(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  return addDays(date, -((d.getUTCDay() + 6) % 7));
}

// Every month and weekday name comes from a table, never Intl (root CLAUDE.md: months print by
// table): newer ICU prints "Sept", and a table reads the same on every server, browser and phone.
const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;
const WEEKDAYS_LONG = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;
// Short months come from a table, never Intl: newer ICU prints "Sept", and beta (and every
// fixed-width cell that holds one) always reads three letters.
const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;
// Monday first, as every month grid here is: the heads over a month and a day's short name.
export const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const at = (date: string) => new Date(`${date}T00:00:00Z`);
const monthShort = (date: string) => MONTHS_SHORT[at(date).getUTCMonth()] ?? '';

// "23 Jul", the way a look says the day it was last worn.
export function dayMonth(date: string): string {
  return `${at(date).getUTCDate()} ${monthShort(date)}`;
}

export function weekdayShort(date: string): string {
  return WEEKDAYS_SHORT[(at(date).getUTCDay() + 6) % 7] ?? '';
}

export function weekdayLong(date: string): string {
  return WEEKDAYS_LONG[(at(date).getUTCDay() + 6) % 7] ?? '';
}

// "October": a date's month in full.
export function monthLong(date: string): string {
  return MONTHS_LONG[at(date).getUTCMonth()] ?? '';
}

// "Tue 8 Sep": a day in a list or a wear row, the month from the table.
export function weekdayDayMonth(date: string): string {
  return `${weekdayShort(date)} ${dayMonth(date)}`;
}

// "Wednesday 28 Oct": the name an unnamed hand-built look saves under (beta's _lkFmtLong).
export function lookDateName(date: string): string {
  return `${weekdayLong(date)} ${dayMonth(date)}`;
}

// "Tuesday 13 October", the day page's eyebrow.
export function longDate(date: string): string {
  return `${weekdayLong(date)} ${at(date).getUTCDate()} ${monthLong(date)}`;
}

// "5–11 Oct", or "28 Sep – 4 Oct" across months.
export function rangeLabel(first: string, last: string): string {
  if (monthShort(first) === monthShort(last)) {
    return `${at(first).getUTCDate()}–${at(last).getUTCDate()} ${monthShort(last)}`;
  }
  return `${dayMonth(first)} – ${dayMonth(last)}`;
}

export interface WeekGroup<D extends { date: string }> {
  monday: string;
  // The days of the window that fall in this week (today first in the first group).
  days: D[];
  // Null for the week holding today: the caller labels it "This week" / "Rest of this week".
  range: string | null;
  // True when today is the Monday (the whole week is ahead).
  wholeWeek: boolean;
}

export function weekGroups<D extends { date: string }>(days: D[], today: string): WeekGroup<D>[] {
  const groups: WeekGroup<D>[] = [];
  for (const day of days) {
    const monday = mondayOf(day.date);
    let g = groups.at(-1);
    if (!g || g.monday !== monday) {
      g = { monday, days: [], range: null, wholeWeek: false };
      groups.push(g);
    }
    g.days.push(day);
  }
  for (const g of groups) {
    const first = g.days[0]?.date ?? g.monday;
    const last = g.days.at(-1)?.date ?? g.monday;
    if (first === today) g.wholeWeek = mondayOf(today) === today;
    else g.range = rangeLabel(first, last);
  }
  return groups;
}

// What a day row reads: her name for the day, else her words on its looks (the first activity),
// else its one look's name; several looks and no words → null name, so the row says "N looks".
export function daySummary(
  entries: ReadonlyArray<{ activity: string | null; look: { name: string; pieces: unknown[] } }>,
  dayName: string | null = null,
): { name: string | null; looks: number; pieces: number } {
  const words =
    dayName?.trim() || (entries.find((e) => e.activity?.trim())?.activity?.trim() ?? null);
  const only = entries.length === 1 ? (entries[0]?.look.name ?? null) : null;
  return {
    name: words ?? only,
    looks: entries.length,
    pieces: entries.reduce((n, e) => n + e.look.pieces.length, 0),
  };
}

export interface TripBand {
  id: string;
  title: string;
  range: string;
  // The run's outer ends round; the band bridges the gutters everywhere else.
  first: boolean;
  last: boolean;
  // The first cell of the run in its week row: where the web writes the name and range.
  head: boolean;
}

// The month's trip band lives in the cells (legacy 6ce2b0a/11337c3): one lane, the first trip wins.
export function tripBands(
  trips: ReadonlyArray<{ id: string; destination: string; dateFrom: string; dateTo: string }>,
  cells: ReadonlyArray<string | null>,
): Map<string, TripBand> {
  const bands = new Map<string, TripBand>();
  cells.forEach((date, i) => {
    if (!date || bands.has(date)) return;
    const trip = trips.find((t) => t.dateFrom <= date && date <= t.dateTo);
    if (!trip) return;
    const prev = i % 7 === 0 ? null : cells[i - 1];
    bands.set(date, {
      id: trip.id,
      title: trip.destination,
      range: rangeLabel(trip.dateFrom, trip.dateTo),
      first: date === trip.dateFrom,
      last: date === trip.dateTo,
      head: date === trip.dateFrom || !prev || bands.get(prev)?.id !== trip.id,
    });
  });
  return bands;
}
