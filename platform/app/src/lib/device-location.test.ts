import { LOCATION_REFRESH_MS } from '@robes/core/location';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GEO_KEYS, syncDeviceLocation } from './device-location';

const store = new Map<string, string>();
const storage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};
const here = { coords: { latitude: 53.349_8, longitude: -6.260_3 } } as GeolocationPosition;
const allow = () => ({
  getCurrentPosition: vi.fn((ok: PositionCallback) => ok(here)),
});
const refuse = (code: number) => ({
  getCurrentPosition: vi.fn((_ok: PositionCallback, fail?: PositionErrorCallback | null) =>
    fail?.({ code } as GeolocationPositionError),
  ),
});
const now = 1_800_000_000_000;
const send = vi.fn(async (_coords: { lat: number; lon: number }) => ({ ok: true }));

beforeEach(() => {
  store.clear();
  send.mockClear();
});

describe('device location (web)', () => {
  it('asks on her first visit and sends the position once she allows it', async () => {
    const geolocation = allow();
    expect(await syncDeviceLocation({ storage, geolocation, now, send })).toBe('sent');
    expect(send).toHaveBeenCalledWith({ lat: 53.349_8, lon: -6.260_3 });
    expect(Object.fromEntries(store)).toEqual({
      [GEO_KEYS.asked]: '1',
      [GEO_KEYS.ok]: '1',
      [GEO_KEYS.at]: String(now),
    });
  });

  it('a no is never asked again', async () => {
    const no = refuse(1);
    expect(await syncDeviceLocation({ storage, geolocation: no, now, send })).toBe('denied');
    const later = now + 10 * LOCATION_REFRESH_MS;
    const geolocation = allow();
    expect(await syncDeviceLocation({ storage, geolocation, now: later, send })).toBe('skipped');
    expect(geolocation.getCurrentPosition).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('later sessions read silently, at most every few hours', async () => {
    store.set(GEO_KEYS.asked, '1');
    store.set(GEO_KEYS.ok, '1');
    store.set(GEO_KEYS.at, String(now - 60_000));
    const geolocation = allow();
    expect(await syncDeviceLocation({ storage, geolocation, now, send })).toBe('skipped');
    expect(geolocation.getCurrentPosition).not.toHaveBeenCalled();
    const later = now + LOCATION_REFRESH_MS;
    expect(await syncDeviceLocation({ storage, geolocation, now: later, send })).toBe('sent');
    expect(store.get(GEO_KEYS.at)).toBe(String(later));
  });

  it('taking it back in the browser stands it down for good', async () => {
    store.set(GEO_KEYS.asked, '1');
    store.set(GEO_KEYS.ok, '1');
    expect(await syncDeviceLocation({ storage, geolocation: refuse(1), now, send })).toBe('denied');
    expect(store.has(GEO_KEYS.ok)).toBe(false);
    expect(await syncDeviceLocation({ storage, geolocation: allow(), now, send })).toBe('skipped');
  });

  it('a timeout or a failed send tries again next visit', async () => {
    store.set(GEO_KEYS.asked, '1');
    store.set(GEO_KEYS.ok, '1');
    expect(await syncDeviceLocation({ storage, geolocation: refuse(3), now, send })).toBe('failed');
    expect(store.get(GEO_KEYS.ok)).toBe('1');
    send.mockRejectedValueOnce(new Error('429'));
    expect(await syncDeviceLocation({ storage, geolocation: allow(), now, send })).toBe('failed');
    expect(store.has(GEO_KEYS.at)).toBe(false);
  });

  it('trusts the Permissions API where the browser has one', async () => {
    store.set(GEO_KEYS.asked, '1');
    const granted = async () => 'granted' as const;
    expect(
      await syncDeviceLocation({ storage, geolocation: allow(), now, permission: granted, send }),
    ).toBe('sent');
    store.clear();
    const denied = async () => 'denied' as const;
    const geolocation = allow();
    expect(await syncDeviceLocation({ storage, geolocation, now, permission: denied, send })).toBe(
      'skipped',
    );
    expect(geolocation.getCurrentPosition).not.toHaveBeenCalled();
  });

  it('works without storage (private mode) and without geolocation', async () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => undefined,
    };
    expect(await syncDeviceLocation({ storage: broken, geolocation: allow(), now, send })).toBe(
      'sent',
    );
    expect(await syncDeviceLocation({ storage, geolocation: undefined, now, send })).toBe(
      'skipped',
    );
  });
});
