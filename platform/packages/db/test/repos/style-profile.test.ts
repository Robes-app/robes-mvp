import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { UserId } from '../../src/ids';
import { createRepositories, createSystemRepositories } from '../../src/repos';
import { createTestDb, createTestUser, deleteTestUsers } from '../fixtures';

const db = createTestDb();
const { styleProfile, assets } = createRepositories(db);
const { styleAnalysis } = createSystemRepositories(db);
let ann: UserId;
let bea: UserId;

beforeAll(async () => {
  ann = await createTestUser(db);
  bea = await createTestUser(db);
});
afterAll(async () => {
  await deleteTestUsers(db, ann, bea);
  await db.destroy();
});

describe('style profile repos', () => {
  it('saves colour and silhouette reads separately, keeping jsonb keys as written', async () => {
    const photo = await assets.createPending(ann, {
      kind: 'headshot',
      contentType: 'image/jpeg',
      bytes: 10,
    });
    expect((await styleAnalysis.photo(ann, photo.id))?.kind).toBe('headshot');
    expect(await styleAnalysis.photo(bea, photo.id)).toBeUndefined();

    await styleAnalysis.saveColour(ann, {
      season: 'Soft Autumn',
      undertone: 'Warm',
      contrast: 'Low',
      dna: { archetype_name: 'Soft Autumn' },
      render: { season: 'Soft Autumn', best_colours: [] },
      assetId: photo.id,
      modelVersion: 'style.colour.v1',
    });
    await styleAnalysis.saveSilhouette(ann, {
      bodyType: 'Pear',
      dna: { body_type: 'Pear' },
      render: { body_type: 'Pear' },
      assetId: photo.id,
      modelVersion: 'style.silhouette.v1',
    });
    const row = await styleProfile.get(ann);
    expect(row).toMatchObject({
      season: 'Soft Autumn',
      bodyType: 'Pear',
      colourRender: { season: 'Soft Autumn', best_colours: [] },
    });
    expect(await styleProfile.get(bea)).toBeUndefined();
  });

  it('merges her overrides key by key and creates the profile if needed', async () => {
    await styleProfile.setOverrides(bea, { loved_colors: ['Navy'] });
    const row = await styleProfile.setOverrides(bea, { rejected_colors: ['Mustard'] });
    expect(row.userOverrides).toEqual({ loved_colors: ['Navy'], rejected_colors: ['Mustard'] });
    expect((await styleProfile.get(ann))?.userOverrides).toEqual({});
  });
});
