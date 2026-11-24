import { Proposal, SeedDrop } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const profile = { timezone: 'Europe/London', currency: 'GBP' };
const repos = {
  profiles: { get: vi.fn(async () => profile as typeof profile | undefined) },
  seeds: {
    had: vi.fn(async () => new Set<string>()),
    land: vi.fn(async () => true),
    retire: vi.fn(async () => 0),
  },
};
vi.mock('../db', () => ({ repos }));

const { DROPS, landingsOf, landSeeds } = await import('.');
const ANN = verifiedUserId('11111111-1111-4111-8111-111111111111');
const DROP = SeedDrop.parse({
  seedId: 'xmas-2026',
  liveFrom: '2026-11-23',
  liveUntil: '2027-01-06',
  looks: [
    {
      lookId: 'xmas-01',
      name: 'Red sequins',
      tags: ['Occasion'],
      seasons: ['winter'],
      image: { width: 1500, height: 2000, blurhash: null, widths: [320, 640] },
      pieces: [
        {
          name: 'Merlot Sequin Midi Skirt',
          category: 'Bottoms',
          brand: 'Freemans',
          prices: { GBP: 43 },
          urls: { uk: 'https://www.freemans.com/skirt', ie: 'https://www.freemans.ie/skirt' },
          image: { width: 800, height: 800, blurhash: null, widths: [320, 640] },
        },
      ],
    },
  ],
});

beforeEach(() => vi.clearAllMocks());

describe('the drops in the repo', () => {
  it('hold every look to the drop schema, with unique ids across drops', () => {
    for (const drop of DROPS) expect(SeedDrop.parse(drop)).toEqual(drop);
    expect(new Set(DROPS.map((d) => d.seedId)).size).toBe(DROPS.length);
  });
});

describe('landingsOf', () => {
  it('shapes each piece as a proposal priced in her currency, and points at the shared picture', () => {
    const [look] = landingsOf(DROP, 'GBP');
    expect(look?.image?.catalogBase).toBe('catalog/seeds/xmas-2026/xmas-01');
    const proposal = Proposal.parse(look?.proposals[0]);
    expect(proposal).toMatchObject({
      name: 'Merlot Sequin Midi Skirt',
      pricePoint: '£43',
      url: 'https://www.freemans.com/skirt',
    });
    const ie = Proposal.parse(landingsOf(DROP, 'EUR')[0]?.proposals[0]);
    expect(ie).toMatchObject({ pricePoint: '', url: 'https://www.freemans.ie/skirt' });
    // The piece's still is its own catalog picture, keyed by the proposal it belongs to.
    expect(look?.stills[proposal.key]?.catalogBase).toBe('catalog/seeds/xmas-2026/xmas-01-1');
  });
});

describe('landSeeds', () => {
  it('lands a live drop she has not had, in her currency', async () => {
    await landSeeds(ANN, new Date('2026-11-23T09:00:00Z'), [DROP]);
    expect(repos.seeds.land).toHaveBeenCalledWith(ANN, 'xmas-2026', expect.any(Array));
    expect(repos.seeds.retire).not.toHaveBeenCalled();
  });

  it('lands nothing she has had, and nothing before the drop starts', async () => {
    repos.seeds.had.mockResolvedValueOnce(new Set(['xmas-2026']));
    await landSeeds(ANN, new Date('2026-12-01T09:00:00Z'), [DROP]);
    await landSeeds(ANN, new Date('2026-11-22T09:00:00Z'), [DROP]);
    expect(repos.seeds.land).not.toHaveBeenCalled();
  });

  it('retires an ended drop in her calendar, not the server’s', async () => {
    // 00:30 UTC on 7 Jan is still 6 Jan in New York: the drop is live there for a few hours more.
    repos.profiles.get.mockResolvedValueOnce({ timezone: 'America/New_York', currency: 'EUR' });
    await landSeeds(ANN, new Date('2027-01-07T00:30:00Z'), [DROP]);
    expect(repos.seeds.retire).not.toHaveBeenCalled();
    await landSeeds(ANN, new Date('2027-01-07T09:00:00Z'), [DROP]);
    expect(repos.seeds.retire).toHaveBeenCalledWith(ANN, ['xmas-2026']);
    expect(repos.seeds.land).toHaveBeenCalledTimes(1);
  });
});
