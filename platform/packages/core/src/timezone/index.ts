// Her timezone follows her device (B6, 25 Nov: in Sydney at 08:11 on Thursday, Home read
// "Wednesday 25" from the Europe/Dublin default). The server keeps one IANA name per profile and
// every "today" is read in it; web (app/src/components/shell/device-timezone.tsx) and native
// (mobile/src/lib/timezone.tsx) send the device's whenever it differs from the stored one.

// An IANA name ("Australia/Sydney", "America/Argentina/Buenos_Aires", "UTC", "Etc/GMT+10"):
// letters first, slash-separated parts, never an offset such as "+10:00", which Intl would take.
const IANA_NAME = /^[A-Za-z][A-Za-z0-9_+-]*(?:\/[A-Za-z0-9_+-]+)*$/;
export const TIMEZONE_MAX = 64;

export function isTimeZone(value: string): boolean {
  if (value.length > TIMEZONE_MAX || !IANA_NAME.test(value)) return false;
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

// The device's IANA name, or null when the runtime gives none we can keep.
export function deviceTimeZone(
  read: () => string | undefined = () => Intl.DateTimeFormat().resolvedOptions().timeZone,
): string | null {
  try {
    const zone = read();
    return zone && isTimeZone(zone) ? zone : null;
  } catch {
    return null;
  }
}

// What to send: the device's zone when it is known and differs from hers, else nothing.
export function timeZoneToSend(stored: string | undefined, device: string | null): string | null {
  if (stored === undefined || device === null || device === stored) return null;
  return device;
}

export type TimeZoneOutcome = 'sent' | 'skipped' | 'failed';

// One sender per app: a zone already on its way is not sent twice (a refetch of her profile, or
// StrictMode's double effect, while the first update is in flight). A failure (offline, rate
// limited) is tried again the next time the app opens.
export function createTimeZoneSync(
  send: (timezone: string) => Promise<unknown>,
): (stored: string | undefined, device: string | null) => Promise<TimeZoneOutcome> {
  let inFlight: string | null = null;
  return async (stored, device) => {
    const next = timeZoneToSend(stored, device);
    if (next === null || next === inFlight) return 'skipped';
    inFlight = next;
    try {
      await send(next);
      return 'sent';
    } catch {
      return 'failed';
    } finally {
      inFlight = null;
    }
  };
}
