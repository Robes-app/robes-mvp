import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { UserId } from '../../src/ids';
import { createRepositories, type SeedLanding } from '../../src/repos';
import { createTestDb, createTestUser, deleteTestUsers } from '../fixtures';

const db = createTestDb();
const { seeds, looks, wishlist } = createRepositories(db);
let ann: UserId;
let bea: UserId;

const manifest = { v: 1 as const, master: { width: 1500, height: 2000 }, widths: [320, 640] };
const look = (lookId: string, name: string): SeedLanding => ({
  lookId,
  name,
  tags: ['Occasion'],
  seasons: ['autumn', 'winter'],
  image: {
    catalogBase: `catalog/seeds/xmas-2026/${lookId}`,
    width: 1500,
    height: 2000,
    blurhash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
    renditions: manifest,
  },
  frameKey: 'k-seed',
  stills: {
    [`p-${lookId.replace('-', '')}`]: {
      catalogBase: `catalog/seeds/xmas-2026/${lookId}-1`,
      width: 800,
      height: 800,
      blurhash: null,
      renditions: { v: 1, master: { width: 800, height: 800 }, widths: [320, 640] },
    },
  },
  proposals: [
    {
      key: `p-${lookId.replace('-', '')}`,
      name: 'Merlot Sequin Midi Skirt',
      category: 'Bottoms',
      brand: 'Freemans',
      pricePoint: '£43',
      url: 'https://www.freemans.com/skirt',
      wishlisted: false,
    },
  ],
});
const XMAS = [look('xmas-01', 'Graphic tee and sequin flares'), look('xmas-02', 'Red sequins')];

beforeAll(async () => {
  ann = await createTestUser(db, 'Ann');
  bea = await createTestUser(db, 'Bea');
});
afterAll(async () => {
  await deleteTestUsers(db, ann, bea);
  await db.destroy();
});

describe('seeded drops', () => {
  it('lands a drop as her suggestions, the first first, with its shared picture and tags', async () => {
    expect(await seeds.land(ann, 'xmas-2026', XMAS)).toBe(true);
    const { items } = await looks.list(ann, { limit: 10, status: 'suggested' });
    expect(items.map((l) => l.name)).toEqual(['Graphic tee and sequin flares', 'Red sequins']);
    const first = items[0];
    expect(first).toMatchObject({ source: 'seed', nameProvisional: false, seedId: 'xmas-2026' });
    expect(first?.seasons).toEqual(['autumn', 'winter']);
    const asset = await db
      .selectFrom('assets')
      .select(['userId', 'catalogBase', 'status', 'kind'])
      .where('id', '=', first?.frameAssetId ?? '')
      .executeTakeFirstOrThrow();
    expect(asset).toEqual({
      userId: ann,
      catalogBase: 'catalog/seeds/xmas-2026/xmas-01',
      status: 'ready',
      kind: 'generated',
    });
    const tags = await looks.tagsFor(ann, [first?.id ?? '']);
    expect(tags.get(first?.id ?? '')).toEqual(['Occasion']);
  });

  it('lands a drop once, even after she deletes every look it brought', async () => {
    const { items } = await looks.list(ann, { limit: 10, status: 'suggested' });
    await db
      .updateTable('looks')
      .set({ deletedAt: new Date() })
      .where('userId', '=', ann)
      .where(
        'id',
        'in',
        items.map((l) => l.id),
      )
      .execute();
    expect(await seeds.land(ann, 'xmas-2026', XMAS)).toBe(false);
    expect((await looks.list(ann, { limit: 10, status: 'suggested' })).items).toEqual([]);
    expect(await seeds.had(ann)).toEqual(new Set(['xmas-2026']));
  });

  it('files a saved seeded look’s pieces to her wishlist with their shop link', async () => {
    await seeds.land(bea, 'xmas-2026', XMAS);
    const { items } = await looks.list(bea, { limit: 10, status: 'suggested' });
    const id = items[0]?.id ?? '';
    await looks.save(bea, id);
    const wishes = await wishlist.list(bea, { limit: 10 });
    expect(wishes.items).toMatchObject([
      { label: 'Merlot Sequin Midi Skirt', sourceUrl: 'https://www.freemans.com/skirt' },
    ]);
    expect(wishes.items[0]?.price).toBe('43.00');
    expect(wishes.items[0]?.currency).toBe('GBP');
    // The wish's picture is the piece's still: her own asset row on the shared catalog file.
    const still = await db
      .selectFrom('assets')
      .select('catalogBase')
      .where('id', '=', wishes.items[0]?.imageAssetId ?? '')
      .executeTakeFirstOrThrow();
    expect(still.catalogBase).toBe('catalog/seeds/xmas-2026/xmas-01-1');
  });

  it('keeps a piece’s still and link when an older app saves the rack without them', async () => {
    const dana = await createTestUser(db, 'Dana');
    try {
      await seeds.land(dana, 'xmas-2026', XMAS);
      const { items } = await looks.list(dana, { limit: 10, status: 'suggested' });
      const look = items[0];
      const stored = (look?.proposals ?? []) as Record<string, unknown>[];
      const still = stored[0]?.stillAssetId;
      expect(still).toBeTruthy();
      // An older build sends the rows back without the fields it does not know.
      const sent = stored.map(({ stillAssetId: _s, url: _u, ...rest }) => rest);
      const row = await looks.update(dana, look?.id ?? '', {
        proposals: sent,
        keepSuggested: true,
      });
      expect(((row?.proposals ?? []) as Record<string, unknown>[])[0]).toMatchObject({
        stillAssetId: still,
        url: 'https://www.freemans.com/skirt',
      });
      // A still the request names is never taken: only the look's own stays.
      const forged = stored.map((p) => ({ ...p, stillAssetId: crypto.randomUUID() }));
      const again = await looks.update(dana, look?.id ?? '', {
        proposals: forged,
        keepSuggested: true,
      });
      expect(((again?.proposals ?? []) as Record<string, unknown>[])[0]?.stillAssetId).toBe(still);
    } finally {
      await deleteTestUsers(db, dana);
    }
  });

  it('retires an ended drop’s unsaved looks and keeps the ones she saved', async () => {
    expect(await seeds.retire(bea, ['xmas-2026'])).toBe(1);
    expect((await looks.list(bea, { limit: 10, status: 'suggested' })).items).toEqual([]);
    const saved = await looks.list(bea, { limit: 10, status: 'saved' });
    expect(saved.items.map((l) => l.seedLookId)).toEqual(['xmas-01']);
  });

  it('never lands, reads or retires another person’s drop', async () => {
    const carl = await createTestUser(db, 'Carl');
    try {
      expect(await seeds.had(carl)).toEqual(new Set());
      expect(await seeds.retire(carl, ['xmas-2026'])).toBe(0);
      expect(await seeds.land(carl, 'xmas-2026', XMAS)).toBe(true);
      expect((await looks.list(ann, { limit: 10, status: 'suggested' })).items).toEqual([]);
      expect(await seeds.retire(carl, ['xmas-2026'])).toBe(2);
      expect((await looks.list(bea, { limit: 10, status: 'saved' })).items).toHaveLength(1);
    } finally {
      await deleteTestUsers(db, carl);
    }
  });
});
