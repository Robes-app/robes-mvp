import { addDays } from '../calendar';

// Intake defaults: a long weekend starting a week from her today.
export function defaultTripDates(today: string): { dateFrom: string; dateTo: string } {
  return { dateFrom: addDays(today, 7), dateTo: addDays(today, 9) };
}

// "Beach day\nDinner out" → her plans, trimmed, de-duplicated, at most ten.
export function parseOccasions(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of text.split(/[\n,]/)) {
    const label = line.trim().slice(0, 60);
    if (label && !seen.has(label.toLowerCase())) {
      seen.add(label.toLowerCase());
      out.push(label);
    }
  }
  return out.slice(0, 10);
}

// Mirrors PlanTripInput's rules so she sees the problem before submitting.
export function tripDatesError(dateFrom: string, dateTo: string): 'endsBefore' | 'tooLong' | null {
  if (dateTo < dateFrom) return 'endsBefore';
  if (Date.parse(`${dateTo}T00:00:00Z`) - Date.parse(`${dateFrom}T00:00:00Z`) > 9 * 86_400_000) {
    return 'tooLong';
  }
  return null;
}
