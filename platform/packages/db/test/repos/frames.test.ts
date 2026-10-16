import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { UserId } from '../../src/ids';
import { createRepositories, createSystemRepositories } from '../../src/repos';
import { createTestDb, createTestUser, deleteTestUsers } from '../fixtures';

const db = createTestDb();
const { frames, jobs } = createRepositories(db);
const system = createSystemRepositories(db);
let niall: UserId;
let bea: UserId;

async function idea(user: UserId, images: unknown[]): Promise<string> {
  const { job } = await jobs.create(user, { kind: 'fake', input: {} });
  return system.styling.createIdea(user, {
    jobId: job.id,
    title: 'Camel coat',
    subtitle: '',
    data: { ways: [], images },
  });
}

const deferred = (idx: number) => ({ idx, assetId: null, status: 'deferred', jobId: null });

beforeAll(async () => {
  niall = await createTestUser(db, 'Niall Frames');
  bea = await createTestUser(db, 'Bea Frames');
});
afterAll(async () => {
  await deleteTestUsers(db, niall, bea);
  await db.destroy();
});

describe('frames repo', () => {
  it('claims a deferred frame once and keeps the others untouched', async () => {
    const id = await idea(niall, [
      { idx: 0, assetId: null, status: 'ready', jobId: null },
      deferred(1),
      deferred(2),
    ]);
    expect(await frames.claim(niall, id, 'idea', 1)).toBe(true);
    expect(await frames.claim(niall, id, 'idea', 1)).toBe(false);
    expect(await frames.claim(niall, id, 'idea', 0)).toBe(false);
    const row = await frames.get(niall, id, 'idea');
    const images =
      (row?.data as { images: { idx: number; status: string }[] } | undefined)?.images ?? [];
    expect(images.map((f) => [f.idx, f.status])).toEqual([
      [0, 'ready'],
      [1, 'pending'],
      [2, 'deferred'],
    ]);
  });

  it('claims a frame that has no entry yet, and never someone else’s', async () => {
    const id = await idea(niall, []);
    expect(await frames.claim(bea, id, 'idea', 2)).toBe(false);
    expect(await frames.frame(bea, id, 'idea', 2)).toBeUndefined();
    expect(await frames.claim(niall, id, 'idea', 2)).toBe(true);
    expect((await frames.frame(niall, id, 'idea', 2))?.status).toBe('pending');
    expect(await frames.claim(niall, id, 'daily_look', 2)).toBe(false);
  });

  it('records the job, lands the frame, and releases a claim that never started', async () => {
    const id = await idea(niall, [deferred(1), deferred(2)]);
    const job = '11111111-1111-4111-8111-111111111111';
    await frames.claim(niall, id, 'idea', 1);
    await frames.setJob(niall, id, 'idea', 1, job);
    expect(await frames.frame(niall, id, 'idea', 1)).toMatchObject({
      status: 'pending',
      jobId: job,
    });
    await frames.set(niall, id, 'idea', { idx: 1, assetId: null, status: 'failed', jobId: job });
    // A late setJob never clobbers a finished frame.
    await frames.setJob(niall, id, 'idea', 1, '22222222-2222-4222-8222-222222222222');
    expect(await frames.frame(niall, id, 'idea', 1)).toMatchObject({
      status: 'failed',
      jobId: job,
    });
    // A failed frame can be asked for again.
    expect(await frames.claim(niall, id, 'idea', 1)).toBe(true);
    await frames.release(niall, id, 'idea', 1);
    expect((await frames.frame(niall, id, 'idea', 1))?.status).toBe('deferred');
    await frames.set(bea, id, 'idea', { idx: 2, assetId: null, status: 'ready', jobId: null });
    expect((await frames.frame(niall, id, 'idea', 2))?.status).toBe('deferred');
  });

  it('lets a stale pending claim be retried', async () => {
    const id = await idea(niall, [
      { idx: 1, assetId: null, status: 'pending', jobId: null, claimedAt: '2020-01-01T00:00:00Z' },
    ]);
    expect(await frames.claim(niall, id, 'idea', 1)).toBe(true);
  });

  it('two concurrent claims: exactly one wins', async () => {
    const id = await idea(niall, [deferred(1)]);
    const results = await Promise.all([
      frames.claim(niall, id, 'idea', 1),
      frames.claim(niall, id, 'idea', 1),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    const n = await db
      .selectFrom('artifacts')
      .select(sql<number>`jsonb_array_length(data->'images')`.as('n'))
      .where('id', '=', id)
      .executeTakeFirstOrThrow();
    expect(n.n).toBe(1);
  });
});
