import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { UserId } from '../../src/ids';
import { createRepositories } from '../../src/repos';
import { createTestDb, createTestUser, deleteTestUsers } from '../fixtures';

// The modular home's reads (legacy 0478e63): Later per step, photographed pieces, a look from hers.
const db = createTestDb();
const { profiles, wardrobe, looks } = createRepositories(db);
let ann: UserId;
let bea: UserId;

const photo = async (user: UserId) =>
  (
    await db
      .insertInto('assets')
      .values({ userId: user, kind: 'wardrobe', contentType: 'image/jpeg', provider: 's3' })
      .returning('id')
      .executeTakeFirstOrThrow()
  ).id;

beforeAll(async () => {
  ann = await createTestUser(db);
  bea = await createTestUser(db);
});
afterAll(async () => {
  await deleteTestUsers(db, ann, bea);
  await db.destroy();
});

describe('home reads', () => {
  it('Later merges per step and stays hers', async () => {
    const at = new Date('2026-10-16T09:00:00Z');
    expect(await profiles.snoozeHome(ann, 'O1', at)).toEqual({ O1: at.toISOString() });
    const both = await profiles.snoozeHome(ann, 'O2', at);
    expect(Object.keys(both).sort()).toEqual(['O1', 'O2']);
    expect((await profiles.get(bea))?.homeSnoozes).toEqual({});
  });

  it('counts only her photographed, ready pieces, newest first', async () => {
    await wardrobe.create(ann, { label: 'No photo' });
    await wardrobe.create(ann, {
      label: 'Reading',
      imageAssetId: await photo(ann),
      status: 'reading',
    });
    const a = await wardrobe.create(ann, { label: 'Coat', imageAssetId: await photo(ann) });
    const b = await wardrobe.create(ann, { label: 'Boots', imageAssetId: await photo(ann) });
    await wardrobe.create(bea, { label: 'Hers', imageAssetId: await photo(bea) });
    const { rows, total } = await wardrobe.photographed(ann);
    expect(total).toBe(2);
    expect(rows.map((r) => r.id)).toEqual([b.id, a.id]);
    expect((await wardrobe.photographed(bea)).total).toBe(1);
  });

  it('a look from hers: her pieces and nothing proposed, saved', async () => {
    const coat = (await wardrobe.create(ann, { label: 'Camel coat' })).id;
    expect(await looks.hasOwnLook(ann)).toBe(false);
    await looks.create(ann, {
      name: 'Borrowed',
      nameProvisional: false,
      pieces: [{ pieceId: coat }],
      proposals: [{ key: 'p-aaaa1111', name: 'Loafers', category: 'Shoes' }],
    });
    await looks.create(ann, {
      name: 'Draft',
      nameProvisional: true,
      status: 'draft',
      pieces: [{ pieceId: coat }],
    });
    expect(await looks.hasOwnLook(ann)).toBe(false);
    await looks.create(ann, { name: 'Mine', nameProvisional: false, pieces: [{ pieceId: coat }] });
    expect(await looks.hasOwnLook(ann)).toBe(true);
    expect(await looks.hasOwnLook(bea)).toBe(false);
  });
});
