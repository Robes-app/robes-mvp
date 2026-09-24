import type { DailyLook } from '@robes/contracts';

// "Dublin · 9–14°C · Light rain", or null when Robes had no weather for her day.
export function weatherLine(weather: DailyLook['weather']): string | null {
  if (!weather) return null;
  const parts = [weather.city, weather.tempRange, weather.condition].filter((p): p is string =>
    Boolean(p),
  );
  return parts.length ? parts.join(' · ') : null;
}

export function anchorItem(look: DailyLook): DailyLook['steps'][number]['items'][number] | null {
  return look.steps[0]?.items[0] ?? null;
}

// Only the anchor frame renders up front; refresh while it's on its way (for a few minutes).
export function anchorPending(look: DailyLook, now = Date.now()): boolean {
  const anchor = anchorItem(look);
  if (!anchor || anchor.image?.status === 'ready' || anchor.image?.status === 'failed') {
    return false;
  }
  return now - Date.parse(look.createdAt) < 3 * 60_000;
}

// Items she asked to see: keep refreshing until each picture lands (or fails).
export function itemsLanding(look: DailyLook, asked: readonly number[]): boolean {
  if (asked.length === 0) return false;
  return look.steps.some((s) =>
    s.items.some(
      (i) =>
        asked.includes(i.imageIndex) &&
        (i.imageStatus === 'pending' || i.imageStatus === 'deferred'),
    ),
  );
}
