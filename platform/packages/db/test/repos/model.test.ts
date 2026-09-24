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
});
