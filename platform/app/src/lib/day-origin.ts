// Where she last stood on a day: Home's strip or the Diary's day page. A look made for a day goes
// back to the screen that day was on (Annie, 14 Nov) — saved, it is on that day and in the
// Lookbook either way. Kept for the visit only: a hard load of a draft's address returns to Home.
// The native twin is mobile/src/features/home/day-origin.ts.
export type DayOrigin = 'home' | 'diary';

let origin: DayOrigin = 'home';

export function setDayOrigin(next: DayOrigin): void {
  origin = next;
}

// The address a draft for `date` leaves to; `saved` names the look just saved, for Home's badge.
export function dayReturn(date: string, saved?: string): string {
  if (origin === 'diary') return `/plan/${date}`;
  return saved ? `/?day=${date}&saved=${saved}` : `/?day=${date}`;
}
