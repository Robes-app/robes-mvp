import type { Look } from '@robes/contracts';
import { diary as copy } from '@robes/copy';
import { weekdayDayMonth, weekdayLong } from '@robes/core/calendar';

// The diary home's words (Front Door design 3k, plan 2026-11-02), pure so web and native tests
// pin the same answers. The web twin is app/src/lib/diary.ts.

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
  if (look.createdAt) return copy.drawer.savedOn(weekdayDayMonth(look.createdAt.slice(0, 10)));
  return copy.drawer.notWorn;
}

// What a day asks when she adds a look (plan §1.6).
export function dayQuestion(date: string, today: string): string {
  return date < today ? copy.log.past : date === today ? copy.log.today : copy.log.ahead;
}
