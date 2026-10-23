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
  ann = await createTestUser(db, 'Niall Maher');
  bea = await createTestUser(db, 'Bea Ray');
});
afterAll(async () => {
  await deleteTestUsers(db, ann, bea);
  await db.destroy();
});

describe('styling + ideas', () => {
  it('loads only her profile and ready closet pieces', async () => {
    await repos.wardrobe.create(ann, { label: 'Camel coat' });
    await repos.wardrobe.create(ann, { label: 'Reading', status: 'reading' });
    await repos.wardrobe.create(bea, { label: 'Bea coat' });
    const ctx = await styling.context(ann);
    expect(ctx.firstName).toBe('Niall');
    expect(ctx.gender).toBe('woman');
    expect(ctx.closet.map((c) => c.label)).toEqual(['Camel coat']);
    expect(ctx.wardrobeCount).toBe(1);
    expect(ctx.styleDna).toEqual({
      color_harmony: null,
      silhouette_proportions: null,
      user_overrides: {},
      palette: {},
      style_archetypes: [],
      brief: { loves: [], avoids: [], rules: [], notes: '' },
      memory: { entries: [] },
      brands: [],
      investment: '',
      facts: {
        height_cm: null,
        size_uk: null,
        shoe_uk: null,
        bust_band: null,
        bust_cup: null,
        bust_cm: null,
        waist_cm: null,
        age_band: '',
      },
      icon_tags: {},
    });
    await db
      .insertInto('styleProfiles')
      .values({ userId: ann, colorHarmony: JSON.stringify({ archetype_name: 'Soft Autumn' }) })
      .execute();
    expect((await styling.context(ann)).styleDna).toMatchObject({
      color_harmony: { archetype_name: 'Soft Autumn' },
    });
    expect((await styling.context(bea)).styleDna).toMatchObject({ color_harmony: null });
    expect(
      await styling.anchorPiece(
        bea,
        (await repos.wardrobe.list(ann, { limit: 1 })).items[0]?.id ?? '',
      ),
    ).toBeUndefined();
  });

  it('creates an expiring idea that saving keeps, private to its owner', async () => {
    const { job } = await repos.jobs.create(ann, { kind: 'key_piece', input: {} });
    const id = await styling.createIdea(ann, {
      jobId: job.id,
      title: 'Camel coat',
      subtitle: 'Three ways',
      data: { ways: [] },
    });
    await styling.mergeIdeaData(ann, id, { images: [{ idx: 0 }] });
    const idea = await repos.ideas.get(ann, id);
    expect(idea?.data).toEqual({ ways: [], images: [{ idx: 0 }] });
    expect(idea?.expiresAt).toBeInstanceOf(Date);
    expect(await repos.ideas.get(bea, id)).toBeUndefined();
    expect(await repos.ideas.save(bea, id)).toBeUndefined();
    const saved = await repos.ideas.save(ann, id);
    expect(saved?.expiresAt).toBeNull();
    expect(saved?.savedAt).toBeInstanceOf(Date);
  });

  it('lists her own recent sets, newest first, never another user’s', async () => {
    const { job } = await repos.jobs.create(ann, { kind: 'key_piece', input: {} });
    for (const n of [1, 2]) {
      await styling.createSet(ann, { jobId: job.id, title: `Set ${n}`, subtitle: '', data: { n } });
    }
    const { job: bJob } = await repos.jobs.create(bea, { kind: 'key_piece', input: {} });
    await styling.createSet(bea, { jobId: bJob.id, title: 'Bea', subtitle: '', data: { n: 9 } });
    expect(await styling.recentSets(ann, 2)).toEqual([{ n: 2 }, { n: 1 }]);
    expect(await styling.recentSets(bea)).toEqual([{ n: 9 }]);
  });

  it('tracks generated frames idempotently', async () => {
    const { job } = await repos.jobs.create(ann, { kind: 'key_piece', input: {} });
    const assetId = await styling.createGeneratedAsset(ann);
    const frame = {
      jobId: job.id,
      userId: ann,
      idx: 0,
      role: 'hero' as const,
      assetId,
      status: 'pending' as const,
    };
    await styling.trackImage(frame);
    await styling.trackImage({ ...frame, status: 'ready' });
    const rows = await db
      .selectFrom('generationAssets')
      .select('status')
      .where('jobId', '=', job.id)
      .execute();
    expect(rows).toEqual([{ status: 'ready' }]);
  });
});
