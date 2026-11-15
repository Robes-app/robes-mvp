// Where she last stood on a day: Home's strip or the Diary's day screen. A look made for a day
// goes back to the screen that day was on (Annie, 14 Nov) — saved, it is on that day and in the
// Lookbook either way. Kept for the visit only. The web twin is app/src/lib/day-origin.ts.
export type DayOrigin = 'home' | 'diary';

let origin: DayOrigin = 'home';

export function setDayOrigin(next: DayOrigin): void {
  origin = next;
}

export function dayOrigin(): DayOrigin {
  return origin;
}
