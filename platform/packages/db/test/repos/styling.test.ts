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
  ann = await createTestUser(db, 'Ann Lee');
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
    expect(ctx.firstName).toBe('Ann');
    expect(ctx.gender).toBe('woman');
    expect(ctx.closet.map((c) => c.label)).toEqual(['Camel coat']);
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
