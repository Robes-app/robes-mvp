import { dayMonth } from '@robes/core/calendar';

// Months from the calendar table, never Intl (newer ICU prints "Sept"). Times read in UTC.
const utc = (iso: string) => new Date(iso).toISOString();

// "15 Oct 2026, 07:13 UTC".
export function when(iso: string | null, empty: string): string {
  if (!iso) return empty;
  const t = utc(iso);
  return `${dayMonth(t.slice(0, 10))} ${t.slice(0, 4)}, ${t.slice(11, 16)} UTC`;
}

// "15 Oct 2026".
export function day(iso: string | null, empty: string): string {
  if (!iso) return empty;
  const t = utc(iso);
  return `${dayMonth(t.slice(0, 10))} ${t.slice(0, 4)}`;
}

// "15 Oct 07:13", for a timeline row where the year is plain from the page.
export function stamp(iso: string): string {
  const t = utc(iso);
  return `${dayMonth(t.slice(0, 10))} ${t.slice(11, 16)}`;
}
