import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { UserId } from '../../src/ids';
import { createRepositories, createSystemRepositories } from '../../src/repos';
import { createTestDb, createTestUser, deleteTestUsers } from '../fixtures';

// Deleting her digital twin (Annie, 12 Nov 2026): every photo she gave for it and every twin drawn
// from them is marked deleted, what Robes read and the facts it was drawn from are cleared. All of
// it is held for 30 days so a delete made by mistake can be put back (owner, 13 Nov 2026); then
// the maintenance sweep deletes the files. Nobody else's twin is touched; her looks stay.
const db = createTestDb();
const repos = createRepositories(db);
const system = createSystemRepositories(db);
let ann: UserId;
let bea: UserId;
let cat: UserId;

beforeAll(async () => {
  ann = await createTestUser(db, 'Ann Twin');
  bea = await createTestUser(db, 'Bea Twin');
  cat = await createTestUser(db, 'Cat Twin');
});
afterAll(async () => {
  await deleteTestUsers(db, ann, bea, cat);
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
  await repos.styleDna.setFacts(userId, {
    heightCm: 167,
    sizeUk: 12,
    waistCm: 72,
    ageBand: '35_44',
  });
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
      // Her age is given under Style DNA › You, not for her twin: it stays.
      ageBand: '35_44',
    });
    // Her season was read from her photograph: it goes with it.
    expect(await repos.styleProfile.get(ann)).toMatchObject({
      season: null,
      undertone: null,
      contrast: null,
    });
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
    await system.styling.discardGenerated(ann, late);
    expect(await deletedAt(late)).toBeInstanceOf(Date);
    // Only her own, and only a generated image.
    const beas = await system.styling.createGeneratedAsset(bea);
    await system.styling.discardGenerated(ann, beas);
    expect(await deletedAt(beas)).toBeNull();
    const photo = await (async () => {
      const id = await system.styling.createGeneratedAsset(ann);
      await db.updateTable('assets').set({ kind: 'look_photo' }).where('id', '=', id).execute();
      return id;
    })();
    await system.styling.discardGenerated(ann, photo);
    expect(await deletedAt(photo)).toBeNull();
  });

  it('takes Robes’ pictures of her looks drawn on her twin, and only those', async () => {
    const coat = (await repos.wardrobe.create(ann, { label: 'Camel coat' })).id;
    const beaCoat = (await repos.wardrobe.create(bea, { label: 'Navy coat' })).id;
    const look = async (userId: UserId, pieceId: string, picture: Record<string, unknown>) => {
      const id = (
        await repos.looks.create(userId, {
          name: 'A look',
          nameProvisional: false,
          pieces: [{ pieceId }],
        })
      ).id;
      await db.updateTable('looks').set(picture).where('id', '=', id).execute();
      return id;
    };
    const picture = async (userId: UserId, renderKey: string, stoodOn: string | null) => ({
      renderAssetId: await system.styling.createGeneratedAsset(userId),
      renderKey,
      renderStatus: 'ready',
      stoodOn,
    });
    const onTwin = await picture(ann, 'twin:k1:rack', 'twin');
    const onTwinBefore = await picture(ann, 'twin:k0:rack', null);
    const onRobes = await picture(ann, 'w-r1@v2:rack', 'robes');
    const beas = await picture(bea, 'twin:k1:rack', 'twin');
    const a = await look(ann, coat, onTwin);
    const b = await look(ann, coat, onTwinBefore);
    const c = await look(ann, coat, onRobes);
    // A Robes-model picture with a draw on her twin running over it.
    const d = await look(ann, coat, { ...(await picture(ann, 'w-r1@v2:rack', 'robes')) });
    await db
      .updateTable('looks')
      .set({ renderKey: 'twin:k1:rack2', renderStatus: 'pending' })
      .where('id', '=', d)
      .execute();
    const e = await look(bea, beaCoat, beas);

    await repos.model.deleteTwin(ann, 'web');
    const rows = await db
      .selectFrom('looks')
      .select(['id', 'renderAssetId', 'renderKey', 'renderStatus', 'stoodOn', 'deletedAt'])
      .where('id', 'in', [a, b, c, d, e])
      .execute();
    const by = new Map(rows.map((r) => [r.id, r]));
    for (const id of [a, b]) {
      expect(by.get(id)).toMatchObject({
        renderAssetId: null,
        renderKey: null,
        renderStatus: null,
        stoodOn: null,
        deletedAt: null,
      });
    }
    expect(await deletedAt(onTwin.renderAssetId)).toBeInstanceOf(Date);
    expect(await deletedAt(onTwinBefore.renderAssetId)).toBeInstanceOf(Date);
    expect(by.get(c)).toMatchObject({ renderAssetId: onRobes.renderAssetId, stoodOn: 'robes' });
    expect(await deletedAt(onRobes.renderAssetId)).toBeNull();
    // The draw on her twin lands nowhere; the picture it would have replaced stays.
    expect(by.get(d)).toMatchObject({ renderKey: null, renderStatus: null, stoodOn: 'robes' });
    const late = await system.styling.createGeneratedAsset(ann);
    expect(await system.modelRender.setRender(ann, d, 'twin:k1:rack2', late)).toBe(false);
    // Bea's look on her own twin is hers.
    expect(by.get(e)).toMatchObject({ renderAssetId: beas.renderAssetId, stoodOn: 'twin' });

    // A frame drawn on her twin lands only while she has one; one on a Robes model lands.
    await db.updateTable('looks').set({ renderKey: 'frame:fk' }).where('id', '=', c).execute();
    const frame = await system.styling.createGeneratedAsset(ann);
    expect(await system.suggested.setFrame(ann, c, 'fk', frame, 'twin')).toBe(false);
    expect(await system.suggested.setFrame(ann, c, 'fk', frame, 'robes')).toBe(true);
  });
});

describe('staleUploads.dueRemoved / discardRemoved (the sweep)', () => {
  it('keeps what she deleted for 30 days, then deletes it, files then row, whatever read it', async () => {
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
    const files = vi.fn(async () => {});
    // Inside the 30 days it can still be put back: nothing is due and nothing goes.
    expect((await system.staleUploads.dueRemoved({ limit: 1000 })).map((a) => a.id)).not.toContain(
      closeUp,
    );
    expect(await system.staleUploads.discardRemoved(ann, closeUp, files)).toBe('held');
    expect(files).not.toHaveBeenCalled();
    expect(await deletedAt(closeUp)).toBeInstanceOf(Date);

    await db
      .updateTable('assets')
      .set({ deletedAt: sql`now() - interval '31 days'` })
      .where('id', '=', closeUp)
      .execute();
    const due = (await system.staleUploads.dueRemoved({ limit: 1000 })).map((a) => a.id);
    expect(due).toContain(closeUp);
    expect(await system.staleUploads.discardRemoved(ann, closeUp, files)).toBe('discarded');
    expect(files).toHaveBeenCalledWith(ann, closeUp);
    expect(await deletedAt(closeUp)).toBe('gone');
  });

  it('puts a deleted twin back as it stood, once, at her ask', async () => {
    const hers = await twinFor(cat);
    await repos.model.deleteTwin(cat, 'ios');
    expect((await repos.model.get(cat))?.twinAssetId).toBeNull();

    expect(await system.twinArchives.restore(cat)).toBe(true);
    for (const id of [hers.closeUp, hers.older, hers.replaced, hers.twin]) {
      expect(await deletedAt(id)).toBeNull();
    }
    expect(await repos.assets.getForUser(cat, hers.closeUp)).toBeDefined();
    expect(await repos.model.get(cat)).toMatchObject({
      heightCm: 167,
      sizeUk: 12,
      waistCm: 72,
      ageBand: '35_44',
      filedCellId: 'w-s2-h1-nt',
      twinAssetId: hers.twin,
      headshotAssetId: hers.closeUp,
      colourRead: true,
    });
    expect((await repos.model.get(cat))?.avatarPrefs).toMatchObject({ skin: 2 });
    expect(await repos.styleProfile.get(cat)).toMatchObject({
      season: 'Light Summer',
      undertone: 'Neutral',
      contrast: 'Low',
    });
    // Asking for it back is her yes to the twin again.
    expect((await repos.consents.current(cat)).photo_analysis).toBe(true);
    // One archive is one restore.
    expect(await system.twinArchives.restore(cat)).toBe(false);
  });

  it('cannot put a twin back after its 30 days, and the sweep removes the archive', async () => {
    await twinFor(cat);
    await repos.model.deleteTwin(cat, 'ios');
    await db
      .updateTable('twinArchives')
      .set({ createdAt: sql`now() - interval '31 days'` })
      .where('userId', '=', cat)
      .where('restoredAt', 'is', null)
      .execute();
    expect(await system.twinArchives.restore(cat)).toBe(false);
    expect(await system.staleUploads.purgeTwinArchives()).toBeGreaterThanOrEqual(1);
    const left = await db
      .selectFrom('twinArchives')
      .select('id')
      .where('userId', '=', cat)
      .where('restoredAt', 'is', null)
      .execute();
    expect(left).toEqual([]);
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
      .set({ status: 'deleted', deletedAt: sql`now() - interval '31 days'` })
      .where('id', '=', held)
      .execute();
    expect(await system.staleUploads.discardRemoved(bea, held, files)).toBe('held');
    expect(files).not.toHaveBeenCalled();
  });
});
