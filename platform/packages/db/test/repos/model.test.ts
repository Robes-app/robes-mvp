import { randomUUID } from 'node:crypto';
import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { UserId } from '../../src/ids';
import { createRepositories, createSystemRepositories } from '../../src/repos';
import { createTestDb, createTestUser, deleteTestUsers } from '../fixtures';

const db = createTestDb();
const repos = createRepositories(db);
const system = createSystemRepositories(db);
let niall: UserId;
let bea: UserId;
const cellKeys: string[] = [];
// Unique per run so parallel suites never share a catalog row.
const key = () => {
  const skin = Math.floor(Math.random() * 8);
  const k = `w-s${skin}-h${Math.floor(Math.random() * 5)}-nt-ll-fl@v${900000 + Math.floor(Math.random() * 99999)}`;
  cellKeys.push(k);
  return k;
};

beforeAll(async () => {
  niall = await createTestUser(db, 'Niall Model');
  bea = await createTestUser(db, 'Bea Model');
});
afterAll(async () => {
  await db.deleteFrom('avatarCells').where('id', 'in', cellKeys).execute();
  await deleteTestUsers(db, niall, bea);
  await db.destroy();
});

describe('her model', () => {
  it('merges picks key by key, sets presence, and files only her own model', async () => {
    await repos.model.savePicks(niall, { skin: 2 }, 'man');
    await repos.model.savePicks(niall, { hair: 4 });
    const row = await repos.model.get(niall);
    expect(row?.avatarPrefs).toEqual({ skin: 2, hair: 4 });
    expect(row?.genderIdentity).toBe('man');
    expect(row?.filedCellId).toBeNull();

    await repos.model.file(niall, 'm-s2-h4-nt', { source: 'hand' });
    await repos.model.file(niall, 'm-s2-h3-nt', { source: 'hand' });
    expect((await repos.model.get(niall))?.filedCellId).toBe('m-s2-h3-nt');
    expect(await repos.model.hasModel(niall)).toBe(true);
    expect(await repos.model.hasModel(bea)).toBe(false);
    expect((await repos.model.get(bea))?.avatarPrefs).toBeNull();
  });

  it('reads her photo reads for the model', async () => {
    await db
      .insertInto('styleProfiles')
      .values({
        userId: bea,
        bodyType: 'Pear',
        colorHarmony: JSON.stringify({
          extracted_values: { skin_tone_hex: '#3B2A22', hair_color_hex: '#CBAE87' },
        }),
      })
      .execute();
    expect(await repos.model.get(bea)).toMatchObject({
      bodyType: 'Pear',
      skinHex: '#3B2A22',
      hairHex: '#CBAE87',
      colourRead: true,
      silhouetteRead: false,
    });
  });
});

describe('her twin', () => {
  it('stores her bust and waist and the sliders, and reads them with her close-up', async () => {
    await repos.styleDna.setFacts(niall, { bustBand: 34, bustCup: 'C', waistCm: 72, sizeUk: 12 });
    await repos.model.savePicks(niall, { adj: { shoulders: null, bust: 1, hips: -2 } });
    expect(await repos.model.get(niall)).toMatchObject({
      bustBand: 34,
      bustCup: 'C',
      bustCm: null,
      waistCm: 72,
      sizeUk: 12,
      avatarPrefs: expect.objectContaining({ adj: { shoulders: null, bust: 1, hips: -2 } }),
      headshotAssetId: null,
    });
    await expect(repos.styleDna.setFacts(niall, { bustCup: 'Z' })).rejects.toThrow();
    await expect(repos.styleDna.setFacts(niall, { waistCm: 20 })).rejects.toThrow();
    expect((await repos.model.get(bea))?.waistCm).toBeNull();
  });

  it('claims a draw once per key, lands it on her row only, and lets a failed draw retry', async () => {
    await repos.model.file(niall, 'w-s3-h1-nt', { source: 'hand' });
    await repos.model.file(bea, 'w-s3-h1-nt', { source: 'hand' });
    expect(await repos.model.claimTwin(niall, 'k1')).toBe(true);
    expect(await repos.model.claimTwin(niall, 'k1')).toBe(false);
    // Another person's claim never touches hers.
    expect(await repos.model.claimTwin(bea, 'k1')).toBe(true);
    await repos.model.failTwin(niall, 'k1');
    expect((await repos.model.get(niall))?.twinDrawStatus).toBe('failed');
    expect(await repos.model.claimTwin(niall, 'k1')).toBe(true);

    const asset = await system.styling.createGeneratedAsset(niall);
    expect(await system.modelRender.setTwin(niall, 'k-old', asset)).toBe(false);
    // Her asset can never land on another person's row: the composite key refuses it.
    await expect(system.modelRender.setTwin(bea, 'k1', asset)).rejects.toThrow();
    expect(await system.modelRender.setTwin(niall, 'k1', asset)).toBe(true);
    expect(await system.modelRender.model(niall)).toMatchObject({
      twinAssetId: asset,
      twinKey: 'k1',
      twinDrawKey: null,
      twinDrawStatus: null,
    });
    // The twin on file is never drawn twice; new inputs draw again.
    expect(await repos.model.claimTwin(niall, 'k1')).toBe(false);
    expect(await repos.model.claimTwin(niall, 'k2')).toBe(true);
    expect((await repos.model.get(bea))?.twinAssetId).toBeNull();

    // An abandoned draw can be claimed again.
    await db
      .updateTable('avatars')
      .set({ twinDrawAt: sql`now() - interval '11 minutes'` })
      .where('userId', '=', niall)
      .execute();
    expect(await repos.model.claimTwin(niall, 'k2')).toBe(true);
    await system.modelRender.failTwin(bea, 'k2');
    expect((await repos.model.get(niall))?.twinDrawStatus).toBe('pending');
  });
});

describe('a twin drawn while her colouring is read', () => {
  it('finds her own close-up only, and how her colour read of it ended', async () => {
    const photo = async (userId: UserId, kind: string) =>
      (
        await db
          .insertInto('assets')
          .values({ userId, kind, contentType: 'image/jpeg', provider: 's3' })
          .returning('id')
          .executeTakeFirstOrThrow()
      ).id;
    const hers = await photo(niall, 'headshot');
    expect(await system.modelRender.closeUp(niall, hers)).toEqual({ status: 'pending' });
    // Not another person's photo, and not a photo of anything but her face.
    expect(await system.modelRender.closeUp(bea, hers)).toBeUndefined();
    expect(await system.modelRender.closeUp(niall, await photo(niall, 'wardrobe'))).toBeUndefined();

    const read = async (userId: UserId, status: string, output = {}, kind = 'stylenotes_analyse') =>
      (
        await db
          .insertInto('generationJobs')
          .values({ userId, kind, status, output: JSON.stringify(output) })
          .returning('id')
          .executeTakeFirstOrThrow()
      ).id;
    expect(await system.modelRender.colourRead(niall, await read(niall, 'running'))).toBe(
      'reading',
    );
    const done = await read(niall, 'succeeded', { styleKind: 'colour' });
    expect(await system.modelRender.colourRead(niall, done)).toBe('read');
    // No face is a partial read; another person's read, or another kind of job, is never hers.
    const noFace = await read(niall, 'partial', { styleKind: 'colour', noSubject: true });
    expect(await system.modelRender.colourRead(niall, noFace)).toBe('refused');
    expect(await system.modelRender.colourRead(niall, await read(niall, 'failed'))).toBe('refused');
    expect(await system.modelRender.colourRead(bea, done)).toBe('refused');
    const other = await read(niall, 'succeeded', {}, 'daily');
    expect(await system.modelRender.colourRead(niall, other)).toBe('refused');
  });

  it('stands her on her twin once it lands, and no one else', async () => {
    await repos.model.savePreset(niall, 3);
    await repos.model.savePreset(bea, 2);
    await system.modelRender.standOnTwin(niall);
    expect((await repos.model.get(niall))?.modelPreset).toBeNull();
    expect((await repos.model.get(bea))?.modelPreset).toBe(2);
  });
});

describe('cell catalog', () => {
  it('is claimed once; ready cells stay; failed or abandoned ones can be claimed again', async () => {
    const k = key();
    expect(await repos.avatarCells.claim(k)).toBe(true);
    expect(await repos.avatarCells.claim(k)).toBe(false);
    await repos.avatarCells.fail(k);
    expect(await repos.avatarCells.claim(k)).toBe(true);
    await db
      .updateTable('avatarCells')
      .set({ claimedAt: sql`now() - interval '11 minutes'` })
      .where('id', '=', k)
      .execute();
    expect(await repos.avatarCells.claim(k)).toBe(true);
    const jobId = randomUUID();
    await repos.avatarCells.setJob(k, jobId);
    await system.avatarCells.ready(k, `catalog/avatar/${k}.png`, 'image/png');
    expect(await repos.avatarCells.claim(k)).toBe(false);
    expect(await repos.avatarCells.get(k)).toMatchObject({ status: 'ready', jobId });
  });

  it('refuses keys outside the catalog vocabulary', async () => {
    await expect(repos.avatarCells.claim('../../etc@v2')).rejects.toThrow();
  });
});

describe('look rendered on her model', () => {
  it('claims once per model and rack, and only for her own look', async () => {
    const look = await repos.looks.create(niall, {
      name: 'Office',
      nameProvisional: false,
      pieces: [],
    });
    expect(await repos.looks.claimRender(bea, look.id, 'k1')).toBe(false);
    expect(await repos.looks.claimRender(niall, look.id, 'k1')).toBe(true);
    expect(await repos.looks.claimRender(niall, look.id, 'k1')).toBe(false);

    const asset = await system.styling.createGeneratedAsset(niall);
    await system.modelRender.setRender(niall, look.id, 'k2', asset);
    expect((await repos.looks.renderState(niall, look.id))?.renderStatus).toBe('pending');
    await system.modelRender.setRender(niall, look.id, 'k1', asset);
    expect(await repos.looks.renderState(niall, look.id)).toMatchObject({
      renderStatus: 'ready',
      renderAssetId: asset,
    });
    expect(await repos.looks.claimRender(niall, look.id, 'k1')).toBe(false);
    // A different model or rack is a new render.
    expect(await repos.looks.claimRender(niall, look.id, 'k2')).toBe(true);
    await repos.looks.releaseRender(niall, look.id);
    expect((await repos.looks.renderState(niall, look.id))?.renderStatus).toBe('failed');
    expect(await repos.looks.renderState(bea, look.id)).toBeUndefined();
    expect(await system.modelRender.look(bea, look.id)).toBeUndefined();
  });

  // D21: her picture note sent asks for a fresh picture even when the key is the same.
  it('draws again when forced, but never twice at once, and only for her own look', async () => {
    const look = await repos.looks.create(niall, {
      name: 'Adjusted',
      nameProvisional: false,
      pieces: [],
    });
    expect(await repos.looks.claimRender(niall, look.id, 'n1')).toBe(true);
    // The same key already drawing stands, forced or not.
    expect(await repos.looks.claimRender(niall, look.id, 'n1', { force: true })).toBe(false);
    // A newer key forced takes over the older claim; the older render can no longer land.
    expect(await repos.looks.claimRender(niall, look.id, 'n2', { force: true })).toBe(true);
    const asset = await system.styling.createGeneratedAsset(niall);
    await system.modelRender.setRender(niall, look.id, 'n1', asset);
    expect((await repos.looks.renderState(niall, look.id))?.renderStatus).toBe('pending');
    await system.modelRender.setRender(niall, look.id, 'n2', asset);
    expect(await repos.looks.claimRender(niall, look.id, 'n2')).toBe(false);
    expect(await repos.looks.claimRender(niall, look.id, 'n2', { force: true })).toBe(true);
    expect(await repos.looks.claimRender(bea, look.id, 'n3', { force: true })).toBe(false);
  });

  // D19: a render that lands brings Robes' picture back, in front.
  it('shows Robes’ picture again, as the cover, when a render lands', async () => {
    const look = await repos.looks.create(niall, {
      name: 'Hidden',
      nameProvisional: false,
      pieces: [],
    });
    const photo = await repos.assets.createPending(niall, {
      kind: 'look_photo',
      contentType: 'image/jpeg',
      bytes: 1000,
    });
    await repos.looks.addImage(niall, look.id, photo.id);
    await repos.looks.setRobesHidden(niall, look.id, true);
    expect(await repos.looks.claimRender(niall, look.id, 'h1')).toBe(true);
    const asset = await system.styling.createGeneratedAsset(niall);
    // Another woman's job lands nothing on her look.
    await system.modelRender.setRender(bea, look.id, 'h1', asset);
    expect(await repos.looks.get(niall, look.id)).toMatchObject({
      robesHidden: true,
      recordImage: 'photo',
    });
    await system.modelRender.setRender(niall, look.id, 'h1', asset);
    expect(await repos.looks.get(niall, look.id)).toMatchObject({
      robesHidden: false,
      recordImage: 'model',
      renderAssetId: asset,
      photoAssetId: photo.id,
    });
    expect((await system.modelRender.look(niall, look.id))?.look).toHaveProperty(
      'pictureNote',
      null,
    );
    // Her photograph in front by her choice: a later render never takes the cover from it.
    const first = await db
      .selectFrom('lookImages')
      .select('id')
      .where('lookId', '=', look.id)
      .executeTakeFirstOrThrow();
    await repos.looks.setCover(niall, look.id, first.id);
    expect(await repos.looks.claimRender(niall, look.id, 'h2')).toBe(true);
    await system.modelRender.setRender(niall, look.id, 'h2', asset);
    expect(await repos.looks.get(niall, look.id)).toMatchObject({
      robesHidden: false,
      recordImage: 'photo',
    });
  });
});
