import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { UserId } from '../../src/ids';
import { createRepositories, createSystemRepositories } from '../../src/repos';
import { createTestDb, createTestUser, deleteTestUsers } from '../fixtures';

// Deleting her digital twin (Annie, 12 Nov 2026): every photo she gave for it and every twin drawn
// from them is marked deleted, what Robes read and the facts it was drawn from are cleared, and the
// maintenance sweep deletes the files. Nobody else's twin is touched; her looks stay.
const db = createTestDb();
const repos = createRepositories(db);
const system = createSystemRepositories(db);
let ann: UserId;
let bea: UserId;

beforeAll(async () => {
  ann = await createTestUser(db, 'Ann Twin');
  bea = await createTestUser(db, 'Bea Twin');
});
afterAll(async () => {
  await deleteTestUsers(db, ann, bea);
  await db.destroy();
});

const photo = async (userId: UserId, kind: string) =>
  (
    await db
      .insertInto('assets')
      .values({ userId, kind, contentType: 'image/jpeg', provider: 's3' })
      .returning('id')
      .executeTakeFirstOrThrow()
  ).id;

const deletedAt = async (id: string) => {
  const row = await db
    .selectFrom('assets')
    .select('deletedAt')
    .where('id', '=', id)
    .executeTakeFirst();
  return row ? row.deletedAt : 'gone';
};

// Her twin as a selfie leaves it: a close-up read, a twin drawn and replaced, her facts and picks.
async function twinFor(userId: UserId) {
  const closeUp = await photo(userId, 'headshot');
  const older = await photo(userId, 'headshot');
  const replaced = await system.styling.createGeneratedAsset(userId);
  const twin = await system.styling.createGeneratedAsset(userId);
  const render = await system.styling.createGeneratedAsset(userId);
  await db
    .insertInto('generationJobs')
    .values([
      {
        userId,
        kind: 'avatar_cell',
        status: 'succeeded',
        input: JSON.stringify({ target: 'twin', twinKey: 'k-old' }),
        output: JSON.stringify({ images: [{ idx: 0, status: 'ready', assetId: replaced }] }),
      },
      {
        userId,
        kind: 'stylenotes_analyse',
        status: 'succeeded',
        input: JSON.stringify({ kind: 'colour', assetId: closeUp }),
        output: JSON.stringify({ styleKind: 'colour' }),
      },
    ])
    .execute();
  await system.styleAnalysis.saveColour(userId, {
    season: 'Light Summer',
    undertone: 'Neutral',
    contrast: 'Low',
    dna: { extracted_values: { skin_tone_hex: '#E8C4A8' } },
    render: {},
    assetId: closeUp,
    modelVersion: 'style.colour.v1',
  });
  await repos.styleDna.setFacts(userId, { heightCm: 167, sizeUk: 12, waistCm: 72 });
  await repos.model.savePicks(userId, { skin: 2, adj: { shoulders: null, bust: 1, hips: 0 } });
  await repos.model.file(userId, 'w-s2-h1-nt', { source: 'hand' });
  await repos.model.claimTwin(userId, 'k1');
  await system.modelRender.setTwin(userId, 'k1', twin);
  return { closeUp, older, replaced, twin, render };
}

describe('model.deleteTwin', () => {
  it('removes her photographs, twins, reads, facts and picks, and no one else’s', async () => {
    const hers = await twinFor(ann);
    const theirs = await twinFor(bea);
    await repos.model.deleteTwin(ann, 'ios');

    for (const id of [hers.closeUp, hers.older, hers.replaced, hers.twin]) {
      expect(await deletedAt(id)).toBeInstanceOf(Date);
      expect(await repos.assets.getForUser(ann, id)).toBeUndefined();
    }
    // A generated image that is not a twin (a look's picture) is hers to keep.
    expect(await deletedAt(hers.render)).toBeNull();
    expect(await repos.model.get(ann)).toMatchObject({
      heightCm: null,
      sizeUk: null,
      waistCm: null,
      avatarPrefs: null,
      filedCellId: null,
      twinAssetId: null,
      headshotAssetId: null,
      colourRead: false,
      genderIdentity: expect.anything(),
    });
    expect((await repos.styleProfile.get(ann))?.season).toBeNull();
    expect((await repos.consents.current(ann)).photo_analysis).toBe(false);

    // Bea's twin stands untouched.
    for (const id of Object.values(theirs)) expect(await deletedAt(id)).toBeNull();
    expect(await repos.model.get(bea)).toMatchObject({
      heightCm: 167,
      twinAssetId: theirs.twin,
      headshotAssetId: theirs.closeUp,
      colourRead: true,
    });
    expect((await repos.consents.current(bea)).photo_analysis).toBeUndefined();

    // With nothing left on file, asking again changes nothing more.
    await expect(repos.model.deleteTwin(ann, 'web')).resolves.toBeUndefined();
  });

  it('lets no read finishing after it bring her photo back', async () => {
    const closeUp = await photo(ann, 'headshot');
    await repos.model.deleteTwin(ann, 'web');
    const saved = await system.styleAnalysis.saveColour(ann, {
      season: 'Deep Winter',
      undertone: 'Cool',
      contrast: 'High',
      dna: {},
      render: {},
      assetId: closeUp,
      modelVersion: 'style.colour.v1',
    });
    expect(saved).toBe(false);
    expect((await repos.model.get(ann))?.headshotAssetId).toBeNull();
    expect((await repos.styleProfile.get(ann))?.season).toBeNull();
  });

  it('discards a twin that lands after it, for the sweep', async () => {
    const late = await system.styling.createGeneratedAsset(ann);
    expect(await system.modelRender.setTwin(ann, 'k-late', late)).toBe(false);
    await system.modelRender.discardTwin(ann, late);
    expect(await deletedAt(late)).toBeInstanceOf(Date);
    // Only her own, and only a generated image.
    const beas = await system.styling.createGeneratedAsset(bea);
    await system.modelRender.discardTwin(ann, beas);
    expect(await deletedAt(beas)).toBeNull();
  });
});

describe('staleUploads.dueRemoved / discardRemoved (the sweep)', () => {
  it('deletes what she deleted, files then row, however recent, whatever read it', async () => {
    const closeUp = await photo(ann, 'headshot');
    await db
      .insertInto('generationJobs')
      .values({
        userId: ann,
        kind: 'stylenotes_analyse',
        status: 'succeeded',
        input: JSON.stringify({ kind: 'colour', assetId: closeUp }),
      })
      .execute();
    await repos.model.deleteTwin(ann, 'web');
    const due = (await system.staleUploads.dueRemoved({ limit: 1000 })).map((a) => a.id);
    expect(due).toContain(closeUp);

    const files = vi.fn(async () => {});
    expect(await system.staleUploads.discardRemoved(ann, closeUp, files)).toBe('discarded');
    expect(files).toHaveBeenCalledWith(ann, closeUp);
    expect(await deletedAt(closeUp)).toBe('gone');
  });

  it('never touches a photo nobody deleted, nor one a row still holds', async () => {
    const kept = await photo(bea, 'headshot');
    const files = vi.fn(async () => {});
    expect(await system.staleUploads.discardRemoved(bea, kept, files)).toBe('held');
    const due = (await system.staleUploads.dueRemoved({ limit: 1000 })).map((a) => a.id);
    expect(due).not.toContain(kept);

    // Marked deleted but still her close-up on file (a race): held until it is let go.
    const held = await photo(bea, 'headshot');
    await db
      .insertInto('styleProfiles')
      .values({ userId: bea, headshotAssetId: held })
      .onConflict((oc) => oc.column('userId').doUpdateSet({ headshotAssetId: held }))
      .execute();
    await db
      .updateTable('assets')
      .set({ status: 'deleted', deletedAt: sql`now()` })
      .where('id', '=', held)
      .execute();
    expect(await system.staleUploads.discardRemoved(bea, held, files)).toBe('held');
    expect(files).not.toHaveBeenCalled();
  });
});
