import { locationStep, parseSentAt } from '@robes/core/location';

// Web twin of mobile/src/lib/location.ts. The browser can't report the permission everywhere (iOS
// Safari), so these flags remember her answer (legacy rb_geo_ok): asked once, ever; ok once she
// allowed it; at = when this device last sent its position.
export const GEO_KEYS = { asked: 'robes.geo.asked', ok: 'robes.geo.ok', at: 'robes.geo.at' };

export type LocationOutcome = 'sent' | 'denied' | 'skipped' | 'failed';

interface Deps {
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null;
  geolocation: Pick<Geolocation, 'getCurrentPosition'> | undefined;
  now: number;
  // The Permissions API where the browser has it: 'granted' counts as allowed even if the first
  // read timed out before the flag was set.
  permission?: () => Promise<PermissionState | null>;
  send: (coords: { lat: number; lon: number }) => Promise<unknown>;
}

const PERMISSION_DENIED = 1;

function read(storage: Deps['storage'], key: string): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function write(storage: Deps['storage'], key: string, value: string | null): void {
  try {
    if (value === null) storage?.removeItem(key);
    else storage?.setItem(key, value);
  } catch {
    // Private mode or blocked storage: this visit still works; the next may ask again.
  }
}

function position(geolocation: Pick<Geolocation, 'getCurrentPosition'>) {
  return new Promise<GeolocationPosition>((resolve, reject) =>
    geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      maximumAge: 30 * 60 * 1000,
      timeout: 20_000,
    }),
  );
}

export async function syncDeviceLocation({
  storage,
  geolocation,
  now,
  permission,
  send,
}: Deps): Promise<LocationOutcome> {
  if (!geolocation) return 'skipped';
  const state = await permission?.().catch(() => null);
  if (state === 'denied') return 'skipped';
  const step = locationStep({
    asked: read(storage, GEO_KEYS.asked) === '1',
    allowed: read(storage, GEO_KEYS.ok) === '1' || state === 'granted',
    lastSentAt: parseSentAt(read(storage, GEO_KEYS.at)),
    now,
  });
  if (step === 'none') return 'skipped';
  // Reading the position is the ask (or follows a yes): either way it is never asked again.
  write(storage, GEO_KEYS.asked, '1');
  let pos: GeolocationPosition;
  try {
    pos = await position(geolocation);
  } catch (error) {
    // A no (or one she takes back in the browser) is final: her typed city carries the weather.
    if ((error as GeolocationPositionError | undefined)?.code === PERMISSION_DENIED) {
      write(storage, GEO_KEYS.ok, null);
      return 'denied';
    }
    return 'failed';
  }
  write(storage, GEO_KEYS.ok, '1');
  try {
    await send({ lat: pos.coords.latitude, lon: pos.coords.longitude });
  } catch {
    return 'failed';
  }
  write(storage, GEO_KEYS.at, String(now));
  return 'sent';
}
