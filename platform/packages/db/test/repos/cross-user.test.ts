import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { UserId } from '../../src/ids';
import { createRepositories, createSystemRepositories } from '../../src/repos';
import { createTestDb, createTestUser, deleteTestUsers } from '../fixtures';

// User B gets nothing of user A's, for the look-state, styling and style-profile reads and writes
// that had no cross-user test of their own.
const db = createTestDb();
const repos = createRepositories(db);
const system = createSystemRepositories(db);
let ann: UserId;
let bea: UserId;
let annDress: string;
let beaCoat: string;
let setId: string;
let lookId: string;

beforeAll(async () => {
  ann = await createTestUser(db, 'Ann Cross');
  bea = await createTestUser(db, 'Bea Cross');
  annDress = (await repos.wardrobe.create(ann, { label: 'Rust slip dress' })).id;
  beaCoat = (await repos.wardrobe.create(bea, { label: 'Bea coat' })).id;
  setId = await system.styling.createSet(ann, {
    jobId: (await createJob(ann)).id,
    title: 'Rust dress',
    subtitle: '',
    data: { set: { mode: 'piece' } },
  });
  [lookId] = (await system.suggested.mintSet(ann, setId, [
    {
      setIndex: 0,
      name: 'Garden party',
      note: null,
      pieces: [{ pieceId: annDress, role: 'anchor' }],
      proposals: [],
      anchorPieceId: annDress,
      dateHint: null,
    },
  ])) as [string];
});
afterAll(async () => {
  await deleteTestUsers(db, ann, bea);
  await db.destroy();
});

async function createJob(userId: UserId) {
  return db
    .insertInto('generationJobs')
    .values({ userId, kind: 'key_piece', input: '{}' })
    .returning('id')
    .executeTakeFirstOrThrow();
}

describe('cross-user isolation', () => {
  it('a suggested-look set is read by its owner only (ideas.getSet, styling.getSet)', async () => {
    expect((await repos.ideas.getSet(ann, setId))?.id).toBe(setId);
    expect(await repos.ideas.getSet(bea, setId)).toBeUndefined();
    expect((await system.styling.getSet(ann, setId))?.id).toBe(setId);
    expect(await system.styling.getSet(bea, setId)).toBeUndefined();
  });

  it('styling.createSet files the set under its owner only', async () => {
    const beaSet = await system.styling.createSet(bea, {
      jobId: (await createJob(bea)).id,
      title: 'Bea set',
      subtitle: '',
      data: { set: {} },
    });
    expect(await repos.ideas.getSet(ann, beaSet)).toBeUndefined();
    expect((await repos.ideas.getSet(bea, beaSet))?.title).toBe('Bea set');
  });

  it("styling.modelCellId reads her own model, never another person's", async () => {
    await db.insertInto('avatars').values({ userId: ann, avatarId: 'cell-ann' }).execute();
    expect(await system.styling.modelCellId(ann)).toBe('cell-ann');
    expect(await system.styling.modelCellId(bea)).toBeNull();
  });

  it("looks.save and looks.piecesById never touch another person's rows", async () => {
    expect(await repos.looks.save(bea, lookId, { name: 'Taken' })).toBeUndefined();
    const still = await db
      .selectFrom('looks')
      .select(['status', 'name'])
      .where('id', '=', lookId)
      .executeTakeFirstOrThrow();
    expect(still).toEqual({ status: 'suggested', name: 'Garden party' });
    expect(await repos.looks.piecesById(bea, [annDress])).toEqual([]);
    expect((await repos.looks.piecesById(ann, [annDress, beaCoat])).map((p) => p.id)).toEqual([
      annDress,
    ]);
  });

  it('suggested.look, setFrame and failFrame are scoped to the owner', async () => {
    expect(await system.suggested.look(bea, lookId)).toBeUndefined();
    expect((await system.suggested.look(ann, lookId))?.look.id).toBe(lookId);

    const frame = () =>
      db
        .selectFrom('looks')
        .select(['frameAssetId', 'renderStatus', 'renderKey'])
        .where('id', '=', lookId)
        .executeTakeFirstOrThrow();
    await db
      .updateTable('looks')
      .set({ renderKey: 'frame:k1', renderStatus: 'pending' })
      .where('id', '=', lookId)
      .execute();
    const beaAsset = await system.styling.createGeneratedAsset(bea);
    expect(await system.suggested.setFrame(bea, lookId, 'k1', beaAsset)).toBe(false);
    expect(await frame()).toMatchObject({ frameAssetId: null, renderStatus: 'pending' });

    await db
      .updateTable('looks')
      .set({ renderKey: 'frame:k2', renderStatus: 'pending' })
      .where('id', '=', lookId)
      .execute();
    await system.suggested.failFrame(bea, lookId, 'k2');
    expect((await frame()).renderStatus).toBe('pending');
    await system.suggested.failFrame(ann, lookId, 'k2');
    expect((await frame()).renderStatus).toBe('failed');
  });

  it('styleProfile.colourDna reads her own colour read only', async () => {
    await db
      .insertInto('styleProfiles')
      .values({ userId: ann, colorHarmony: JSON.stringify({ archetype_name: 'Soft Autumn' }) })
      .onConflict((oc) =>
        oc
          .column('userId')
          .doUpdateSet({ colorHarmony: JSON.stringify({ archetype_name: 'Soft Autumn' }) }),
      )
      .execute();
    expect((await repos.styleProfile.colourDna(ann))?.colorHarmony).toMatchObject({
      archetype_name: 'Soft Autumn',
    });
    expect((await repos.styleProfile.colourDna(bea))?.colorHarmony ?? null).toBeNull();
  });
});
