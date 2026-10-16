import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { UserId } from '../../src/ids';
import { createRepositories, createSystemRepositories } from '../../src/repos';
import { createTestDb, createTestUser, deleteTestUsers } from '../fixtures';

const db = createTestDb();
const repos = createRepositories(db);
const { styling } = createSystemRepositories(db);
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

describe('daily looks', () => {
  it('loads her closet with ids, heroes and season bands, and her place', async () => {
    const coat = await repos.wardrobe.create(ann, {
      label: 'Camel coat',
      seasonBand: 'autumn_winter',
    });
    await repos.wardrobe.setHero(ann, coat.id, 1);
    await repos.wardrobe.create(ann, { label: 'Reading', status: 'reading' });
    await repos.wardrobe.create(bea, { label: 'Bea knit' });
    await repos.profiles.update(ann, { homeCity: 'Dublin' });
    const ctx = await styling.dailyContext(ann);
    expect(ctx.closet).toEqual([
      expect.objectContaining({
        id: coat.id,
        label: 'Camel coat',
        hero: true,
        seasonBand: 'autumn_winter',
      }),
    ]);
    expect(ctx).toMatchObject({ homeCity: 'Dublin', homeLat: null, timezone: 'Europe/Dublin' });
  });

  it('keeps a draft 30 days, private to her, and naming it keeps it', async () => {
    const { job } = await repos.jobs.create(ann, { kind: 'daily', input: {} });
    const id = await styling.createDailyLook(ann, {
      jobId: job.id,
      title: 'Studio day',
      subtitle: '',
      data: { v: 1 },
    });
    const draft = await repos.dailyLooks.get(ann, id);
    expect(draft?.expiresAt).not.toBeNull();
    expect(draft?.data).toEqual({ v: 1 });
    expect(await repos.dailyLooks.get(bea, id)).toBeUndefined();
    expect(await repos.dailyLooks.markSaved(bea, id)).toBe(false);
    expect(await repos.dailyLooks.markSaved(ann, id)).toBe(true);
    expect((await repos.dailyLooks.get(ann, id))?.expiresAt).toBeNull();
    // An idea is not a daily look.
    const ideaId = await styling.createIdea(ann, {
      jobId: job.id,
      title: 'x',
      subtitle: '',
      data: {},
    });
    expect(await repos.dailyLooks.get(ann, ideaId)).toBeUndefined();
  });
});
