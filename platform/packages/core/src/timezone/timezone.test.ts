import { describe, expect, it, vi } from 'vitest';
import { createTimeZoneSync, deviceTimeZone, isTimeZone, timeZoneToSend } from './index';

describe('isTimeZone', () => {
  it('takes IANA names', () => {
    for (const zone of [
      'Australia/Sydney',
      'Europe/Dublin',
      'America/Argentina/Buenos_Aires',
      'America/Port-au-Prince',
      'UTC',
      'Etc/GMT+10',
    ])
      expect(isTimeZone(zone)).toBe(true);
  });

  it('rejects offsets, unknown names and junk', () => {
    for (const zone of [
      '',
      '+10:00',
      '-05:00',
      'Mars/Olympus_Mons',
      'Australia/',
      '/Sydney',
      'Australia Sydney',
      "Europe/Dublin'; drop table",
      `Europe/${'x'.repeat(64)}`,
    ])
      expect(isTimeZone(zone)).toBe(false);
  });
});

describe('deviceTimeZone', () => {
  it('reads the runtime zone', () => {
    expect(deviceTimeZone(() => 'Australia/Sydney')).toBe('Australia/Sydney');
    expect(isTimeZone(deviceTimeZone() ?? 'UTC')).toBe(true);
  });

  it('gives nothing when the runtime has no usable zone', () => {
    expect(deviceTimeZone(() => undefined)).toBeNull();
    expect(deviceTimeZone(() => '+10:00')).toBeNull();
    expect(
      deviceTimeZone(() => {
        throw new Error('no Intl');
      }),
    ).toBeNull();
  });
});

describe('timeZoneToSend', () => {
  it('sends the device zone only when it differs from hers', () => {
    expect(timeZoneToSend('Europe/Dublin', 'Australia/Sydney')).toBe('Australia/Sydney');
    expect(timeZoneToSend('Australia/Sydney', 'Australia/Sydney')).toBeNull();
    expect(timeZoneToSend('Europe/Dublin', null)).toBeNull();
    // Her profile not loaded yet: nothing to compare with.
    expect(timeZoneToSend(undefined, 'Australia/Sydney')).toBeNull();
  });
});

describe('createTimeZoneSync', () => {
  it('sends once while an update is in flight, and again after it lands', async () => {
    let land: () => void = () => undefined;
    const send = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          land = resolve;
        }),
    );
    const sync = createTimeZoneSync(send);
    const first = sync('Europe/Dublin', 'Australia/Sydney');
    expect(await sync('Europe/Dublin', 'Australia/Sydney')).toBe('skipped');
    land();
    expect(await first).toBe('sent');
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith('Australia/Sydney');
    expect(await sync('Australia/Sydney', 'Australia/Sydney')).toBe('skipped');
  });

  it('reports a failure and tries again next time', async () => {
    const send = vi.fn().mockRejectedValueOnce(new Error('429')).mockResolvedValue(undefined);
    const sync = createTimeZoneSync(send);
    expect(await sync('Europe/Dublin', 'Australia/Sydney')).toBe('failed');
    expect(await sync('Europe/Dublin', 'Australia/Sydney')).toBe('sent');
    expect(send).toHaveBeenCalledTimes(2);
  });
});
