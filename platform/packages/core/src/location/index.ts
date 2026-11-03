// Device location for the weather (Annie, 28 Oct): asked once, on her first signed-in visit; if she
// allowed it, read silently on later sessions so the weather follows her; if she declined, never
// asked again. Shared by web (app/src/lib/device-location.ts) and native (mobile/src/lib/location.ts).

// A refresh at most this often, however many times she opens the app.
export const LOCATION_REFRESH_MS = 3 * 60 * 60 * 1000;

export type LocationStep = 'ask' | 'refresh' | 'none';

export function locationStep(s: {
  asked: boolean;
  allowed: boolean;
  lastSentAt: number | null;
  now: number;
}): LocationStep {
  if (s.allowed) {
    if (s.lastSentAt !== null && s.now - s.lastSentAt < LOCATION_REFRESH_MS) return 'none';
    return 'refresh';
  }
  return s.asked ? 'none' : 'ask';
}

export function parseSentAt(raw: string | null): number | null {
  const n = raw === null ? Number.NaN : Number(raw);
  return Number.isFinite(n) ? n : null;
}
