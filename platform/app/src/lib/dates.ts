import { plan } from '@robes/copy';
import { weekdayDayMonth } from '@robes/core/calendar';

// YYYY-MM-DD for the browser's own calendar day ("Wear it today" means her today).
export function localToday(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// "Sat 3 Oct": months from the table, never Intl ("Sept"); calendar text, so no timezone moves it.
export function formatDay(date: string): string {
  return weekdayDayMonth(date);
}

export function dayLabel(date: string, today: string): string {
  if (date === today) return plan.today;
  const next = new Date(`${today}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  if (date === next.toISOString().slice(0, 10)) return plan.tomorrow;
  return formatDay(date);
}
