import { DEFAULT_PLAN, PLAN_LIMITS } from '@robes/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { QuotaExceeded } from '../../src/errors';
import type { UserId } from '../../src/ids';
import { createRepositories, createSystemRepositories } from '../../src/repos';
import { createTestDb, createTestUser, deleteTestUsers } from '../fixtures';

const db = createTestDb();
const repos = createRepositories(db);
const system = createSystemRepositories(db);
let alice: UserId;
let bob: UserId;

beforeAll(async () => {
  alice = await createTestUser(db, 'Alice Smith');
  bob = await createTestUser(db, 'Bob Jones');
});
afterAll(async () => {
  await deleteTestUsers(db, alice, bob);
  await db.destroy();
});

describe('profiles', () => {
  it('reads and updates only the caller and only editable fields', async () => {
    const updated = await repos.profiles.update(alice, {
      firstName: 'Ali',
      // @ts-expect-error onboardedAt is server-owned and not part of ProfilePatch
      onboardedAt: new Date(),
    });
    expect(updated?.firstName).toBe('Ali');
    expect(updated?.onboardedAt).toBeNull();
    expect((await repos.profiles.get(bob))?.firstName).toBe('Bob');
  });

  it('completes onboarding once', async () => {
    const first = await repos.profiles.completeOnboarding(alice);
    const second = await repos.profiles.completeOnboarding(alice);
    expect(first).toBeInstanceOf(Date);
    expect(second?.getTime()).toBe(first?.getTime());
  });
});

describe('consents', () => {
  it('starts unanswered and keeps each user to their own answers', async () => {
    expect(await repos.consents.current(alice)).toEqual({});
    await repos.consents.record(alice, { analytics: true, replay: false }, 'web');
    expect(await repos.consents.current(alice)).toEqual({ analytics: true, replay: false });
    expect(await repos.consents.current(bob)).toEqual({});
  });

  it('appends a row per change and the latest answer wins', async () => {
    await repos.consents.record(bob, { analytics: true }, 'ios');
    await repos.consents.record(bob, { analytics: false }, 'web');
    expect(await repos.consents.current(bob)).toEqual({ analytics: false });
    const rows = await db
      .selectFrom('consents')
      .select(['granted', 'source'])
      .where('userId', '=', bob)
      .orderBy('createdAt')
      .execute();
    expect(rows).toEqual([
      { granted: true, source: 'ios' },
      { granted: false, source: 'web' },
    ]);
    expect((await repos.consents.current(alice)).analytics).toBe(true);
  });
});

describe('admin', () => {
  it('only treats role admin as an admin', async () => {
    expect(await repos.admin.isAdmin(alice)).toBe(false);
  });
});

describe('flags', () => {
  it('reads seeded flags and fails closed on unknown keys', async () => {
    expect(await repos.flags.isEnabled('jobs.fake')).toBe(true);
    // @ts-expect-error unknown flag keys are a type error too
    expect(await repos.flags.isEnabled('does.not.exist')).toBe(false);
  });
});

describe('jobs', () => {
  it('creates, scopes and cancels per user', async () => {
    const { job } = await repos.jobs.create(alice, { kind: 'fake', input: { n: 1 } });
    expect(job.status).toBe('queued');
    expect(await repos.jobs.getForUser(bob, job.id)).toBeUndefined();
    expect(await repos.jobs.requestCancel(bob, job.id)).toBe(false);
    expect(await repos.jobs.requestCancel(alice, job.id)).toBe(true);
  });

  it('replays an idempotency key instead of creating twice', async () => {
    const key = crypto.randomUUID();
    const a = await repos.jobs.create(alice, { kind: 'fake', input: {}, idempotencyKey: key });
    const b = await repos.jobs.create(alice, { kind: 'fake', input: {}, idempotencyKey: key });
    expect(b.replayed).toBe(true);
    expect(b.job.id).toBe(a.job.id);
  });

  it('enforces quota atomically with job creation', async () => {
    const quota = { metric: 'generation.text' as const, cost: 60 };
    await repos.jobs.create(bob, { kind: 'fake', input: {}, quota });
    await expect(
      repos.jobs.create(bob, { kind: 'fake', input: {}, quota: { ...quota, cost: 1 } }),
    ).rejects.toBeInstanceOf(QuotaExceeded);
    const jobs = await db
      .selectFrom('generationJobs')
      .select('id')
      .where('userId', '=', bob)
      .execute();
    expect(jobs).toHaveLength(1);
  });

  it('spends no quota when any of several metrics is over its limit', async () => {
    const limits = PLAN_LIMITS[DEFAULT_PLAN];
    const text = { metric: 'generation.text' as const, cost: limits['generation.text'].limit };
    const image = {
      metric: 'generation.image' as const,
      cost: limits['generation.image'].limit + 1,
    };
    await expect(
      repos.jobs.create(alice, { kind: 'fake', input: {}, quota: [text, image] }),
    ).rejects.toBeInstanceOf(QuotaExceeded);
    await expect(
      repos.jobs.create(alice, { kind: 'fake', input: {}, quota: text }),
    ).resolves.toBeDefined();
  });

  it('claims with a lease, once, and records stages', async () => {
    const { job } = await repos.jobs.create(alice, { kind: 'fake', input: {} });
    const claimed = await system.jobs.claim(job.id, 60);
    expect(claimed?.attempts).toBe(1);
    expect(await system.jobs.claim(job.id, 60)).toBeUndefined();
    await system.jobs.writeStage(job.id, 'text', { text: { title: 'Hi' } });
    await system.jobs.finish(job.id, { status: 'succeeded' });
    const done = await repos.jobs.getForUser(alice, job.id);
    expect(done).toMatchObject({
      status: 'succeeded',
      stage: 'done',
      output: { text: { title: 'Hi' } },
    });
    await system.jobs.finish(job.id, { status: 'failed', error: 'late' });
    expect((await repos.jobs.getForUser(alice, job.id))?.status).toBe('succeeded');
  });

  it('cancels a queued job outright and flags a running one', async () => {
    const queued = await repos.jobs.create(alice, { kind: 'fake', input: {} });
    await repos.jobs.requestCancel(alice, queued.job.id);
    expect(await repos.jobs.getForUser(alice, queued.job.id)).toMatchObject({
      status: 'cancelled',
      stage: 'done',
    });
    expect(await system.jobs.claim(queued.job.id, 60)).toBeUndefined();

    const running = await repos.jobs.create(alice, { kind: 'fake', input: {} });
    await system.jobs.claim(running.job.id, 60);
    await repos.jobs.requestCancel(alice, running.job.id);
    expect((await repos.jobs.getForUser(alice, running.job.id))?.status).toBe('running');
    expect(await system.jobs.isCancelRequested(running.job.id)).toBe(true);
  });

  it('finds undelivered queued jobs and running jobs with expired leases', async () => {
    const fresh = await repos.jobs.create(alice, { kind: 'fake', input: {} });
    const old = await repos.jobs.create(alice, { kind: 'fake', input: {} });
    const dead = await repos.jobs.create(alice, { kind: 'fake', input: {} });
    await db
      .updateTable('generationJobs')
      .set({ createdAt: new Date('2000-01-01T00:00:00Z') })
      .where('id', 'in', [old.job.id, dead.job.id])
      .execute();
    await system.jobs.claim(dead.job.id, 0);
    const stale = await system.jobs.stale(60, 10_000);
    expect(stale).toEqual(expect.arrayContaining([old.job.id, dead.job.id]));
    expect(stale).not.toContain(fresh.job.id);
  });
});

describe('assets', () => {
  it('scopes assets to their owner and marks face photos sensitive', async () => {
    const asset = await repos.assets.createPending(alice, {
      kind: 'headshot',
      contentType: 'image/jpeg',
      bytes: 1000,
    });
    expect(await repos.assets.getForUser(bob, asset.id)).toBeUndefined();
    const row = await db
      .selectFrom('assets')
      .select('sensitive')
      .where('id', '=', asset.id)
      .executeTakeFirst();
    expect(row?.sensitive).toBe(true);
  });

  it('consumes upload quota atomically with the pending row', async () => {
    const quota = {
      metric: 'upload.image' as const,
      cost: PLAN_LIMITS[DEFAULT_PLAN]['upload.image'].limit,
    };
    const pending = { kind: 'wardrobe' as const, contentType: 'image/png', bytes: 10 };
    await repos.assets.createPending(bob, pending, { quota });
    await expect(
      repos.assets.createPending(bob, pending, { quota: { ...quota, cost: 1 } }),
    ).rejects.toBeInstanceOf(QuotaExceeded);
    const rows = await db.selectFrom('assets').select('id').where('userId', '=', bob).execute();
    expect(rows).toHaveLength(1);
  });
});

describe('maintenance', () => {
  it('runs the retention sweep as the app role', async () => {
    await expect(system.maintenance.run()).resolves.toBeUndefined();
  });
});
