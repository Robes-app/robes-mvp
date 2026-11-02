import type { Look, Today } from '@robes/contracts';
import { diary as copy } from '@robes/copy';
import { weekdayLong } from '@robes/core/calendar';
import { shortRange } from '@robes/core/weather';
import { formatDay } from './dates';

// The diary home's words (Front Door design 3k, plan 2026-11-02), pure so web and native tests
// pin the same answers. The native twin is mobile/src/features/home/diary.ts.

export type PickerMode = 'add' | 'change';

// 'today', else 'on Tuesday': how the CTA names the day.
export function whenWord(date: string, today: string): string {
  return date === today ? 'today' : `on ${weekdayLong(date)}`;
}
// 'today', else the weekday.
export function dayWordOf(date: string, today: string): string {
  return date === today ? 'today' : weekdayLong(date);
}

// What the drawer's one button says (plan §1.7).
export function drawerCta(o: {
  mode: PickerMode;
  date: string;
  today: string;
  picks: number;
  changed: boolean;
}): { label: string; ready: boolean } {
  const past = o.date < o.today;
  const dayWord = dayWordOf(o.date, o.today);
  if (o.mode === 'add') {
    return { label: copy.drawer.schedule(o.picks), ready: o.changed && o.picks > 0 };
  }
  if (!o.changed) return { label: copy.drawer.idle(dayWord), ready: false };
  if (o.picks === 0) return { label: copy.drawer.clearDay(dayWord), ready: true };
  if (past) {
    return {
      label: o.picks === 1 ? copy.drawer.woreOne(dayWord) : copy.drawer.woreMany(dayWord),
      ready: true,
    };
  }
  const when = whenWord(o.date, o.today);
  return {
    label: o.picks === 1 ? copy.drawer.wearOne(when) : copy.drawer.wearMany(o.picks, when),
    ready: true,
  };
}

// The look's line under its name in the drawer: Scheduled (on the day), Adding (ticked), else
// how often she has worn it, when she saved it, or that it waits.
export function drawerLine(
  look: Pick<Look, 'timesWorn' | 'createdAt'>,
  on: boolean,
  had: boolean,
): string {
  if (on && had) return copy.drawer.scheduled;
  if (on) return copy.drawer.adding;
  if (look.timesWorn > 0) return copy.drawer.wears(look.timesWorn);
  if (look.createdAt) return copy.drawer.savedOn(formatDay(look.createdAt.slice(0, 10)));
  return copy.drawer.notWorn;
}

// The flyout's foot (plan §1.9): idle until she ticks; Include n once she has; Clear pieces when
// she unticks everything the box already carried.
export function flyoutCta(selected: number, carried: number): { label: string; ready: boolean } {
  if (selected > 0) return { label: copy.flyout.include(selected), ready: true };
  if (carried > 0) return { label: copy.flyout.clear, ready: true };
  return { label: copy.flyout.idle, ready: false };
}

// What the place chip says: the city, then that day's range at it (plan §1.8).
export function placeChipLabel(city: string, tempRange: string | null): string {
  return copy.door.placeChip(city, tempRange ? shortRange(tempRange) : null);
}

// What a day asks when she adds a look (plan §1.6).
export function dayQuestion(date: string, today: string): string {
  return date < today ? copy.log.past : date === today ? copy.log.today : copy.log.ahead;
}

// Which of day one's asks show (design 3a): the model until she has one on file, her first pieces
// until she has photographed one; each stands down for good once she dismisses it.
export function dayOneAsks(state: Today['home']['state']): { model: boolean; pieces: boolean } {
  return {
    model: !state.twinOnFile && !state.dayOne?.modelAsked,
    pieces: state.pics === 0 && !state.dayOne?.piecesAsked,
  };
}
