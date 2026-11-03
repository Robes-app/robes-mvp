import { UpdateLocationInput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const repos = { profiles: { update: vi.fn(async () => undefined) } };
const cityAt = vi.fn(async (_lat: number, _lon: number): Promise<string | null> => 'Dublin');
const made: { url?: string }[] = [];
vi.mock('./db', () => ({ repos }));
vi.mock('./env', () => ({ env: { REVERSE_GEOCODE_URL: 'http://127.0.0.1:1/reverse' } }));
vi.mock('@robes/jobs', () => ({
  createReverseGeocode: (opts: { url?: string }) => {
    made.push(opts);
    return cityAt;
  },
}));

const { roundCoord, saveDeviceLocation } = await import('./location');
const ann = verifiedUserId('11111111-1111-4111-8111-111111111111');

beforeEach(() => vi.clearAllMocks());

describe('device location', () => {
  it('keeps ~1 km of it, names the place, and writes only her profile', async () => {
    expect(await saveDeviceLocation(ann, { lat: 53.349_812, lon: -6.260_31 })).toEqual({
      ok: true,
    });
    expect(cityAt).toHaveBeenCalledWith(53.35, -6.26);
    expect(repos.profiles.update).toHaveBeenCalledWith(ann, {
      homeLat: 53.35,
      homeLon: -6.26,
      homeCity: 'Dublin',
    });
    expect(made).toEqual([{ url: 'http://127.0.0.1:1/reverse' }]);
  });

  it('without a name for the place, saves the coordinates and keeps her city', async () => {
    cityAt.mockResolvedValueOnce(null);
    await saveDeviceLocation(ann, { lat: -33.868_8, lon: 151.209_3 });
    expect(repos.profiles.update).toHaveBeenCalledWith(ann, { homeLat: -33.87, homeLon: 151.21 });
  });

  it('rounds to two decimals at the edges', () => {
    expect(roundCoord(89.999)).toBe(90);
    expect(roundCoord(-179.996)).toBe(-180);
    expect(roundCoord(0.004)).toBe(0);
  });

  it('accepts only a real position', () => {
    const ok = (v: unknown) => UpdateLocationInput.safeParse(v).success;
    expect(ok({ lat: 53.35, lon: -6.26 })).toBe(true);
    expect(ok({ lat: 91, lon: 0 })).toBe(false);
    expect(ok({ lat: 0, lon: -180.5 })).toBe(false);
    expect(ok({ lat: Number.NaN, lon: 0 })).toBe(false);
    expect(ok({ lat: Number.POSITIVE_INFINITY, lon: 0 })).toBe(false);
    expect(ok({ lat: '53.3', lon: 0 })).toBe(false);
    expect(ok({ lat: 1, lon: 1, userId: 'x' })).toBe(false);
  });
});
