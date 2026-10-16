import { plan } from '@robes/copy';

// YYYY-MM-DD for the browser's own calendar day ("Wear it today" means her today).
export function localToday(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const DAY_FORMAT = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

// Calendar dates are plain days: format them in UTC so no timezone moves them.
export function formatDay(date: string): string {
  return DAY_FORMAT.format(new Date(`${date}T00:00:00Z`));
}

export function dayLabel(date: string, today: string): string {
  if (date === today) return plan.today;
  const next = new Date(`${today}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  if (date === next.toISOString().slice(0, 10)) return plan.tomorrow;
  return formatDay(date);
}
