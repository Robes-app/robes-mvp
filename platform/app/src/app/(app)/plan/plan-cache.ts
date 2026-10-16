import type { Plan } from '@robes/contracts';

function isPlan(value: unknown): value is Plan {
  return typeof value === 'object' && value !== null && 'days' in value;
}

// Optimistic unpin: the entry leaves its day at once.
export function withoutEntry(id: string) {
  return (old: unknown): unknown =>
    isPlan(old)
      ? {
          ...old,
          days: old.days.map((d) => ({ ...d, entries: d.entries.filter((e) => e.id !== id) })),
        }
      : old;
}
