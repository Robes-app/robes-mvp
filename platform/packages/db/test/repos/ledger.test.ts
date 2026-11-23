import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { UserId } from '../../src/ids';
import { createRepositories, createSystemRepositories } from '../../src/repos';
import { createTestDb, createTestUser, deleteTestUsers } from '../fixtures';

const db = createTestDb();
const repos = createRepositories(db);
const system = createSystemRepositories(db);
let ann: UserId;
const family = `test-family-${crypto.randomUUID()}`;

beforeAll(async () => {
  ann = await createTestUser(db);
});
afterAll(async () => {
  await db.deleteFrom('platformBudget').where('modelFamily', '=', family).execute();
  await deleteTestUsers(db, ann);
  await db.destroy();
});

describe('ledger', () => {
  it('records calls, adds spend to the job and trips the breaker at the limit', async () => {
    const { job } = await repos.jobs.create(ann, { kind: 'fake', input: {} });
    const call = {
      jobId: job.id,
      userId: ann,
      feature: 'test',
      model: 'm',
      family,
      tokensIn: 1,
      tokensOut: 1,
      images: 0,
      latencyMs: 5,
      status: 'ok' as const,
    };
    // Unknown families use the 10 USD default limit.
    await system.ledger.record({ ...call, costMicros: 6_000_000, detail: { balance: 'new' } });
    expect(await repos.capacity.isExhausted([family])).toBe(false);
    await system.ledger.record({ ...call, costMicros: 4_000_000 });
    expect(await repos.capacity.isExhausted([family])).toBe(true);
    expect(await repos.capacity.isExhausted(['never-spent'])).toBe(false);

    const row = await db
      .selectFrom('generationJobs')
      .select('costMicros')
      .where('id', '=', job.id)
      .executeTakeFirst();
    expect(String(row?.costMicros)).toBe('10000000');
    const calls = await db
      .selectFrom('generationCalls')
      .select(['feature', 'detail'])
      .where('jobId', '=', job.id)
      .orderBy('createdAt')
      .execute();
    expect(calls).toHaveLength(2);
    // Counts and enums that make an answer auditable; '{}' when a call records none.
    expect(calls.map((c) => c.detail)).toEqual([{ balance: 'new' }, {}]);
  });

  it('prices a feature from its own successful calls', async () => {
    const feature = `test.cost-${crypto.randomUUID()}`;
    const call = {
      userId: ann,
      feature,
      model: 'm',
      family,
      tokensIn: 1,
      tokensOut: 1,
      images: 0,
      latencyMs: 5,
    };
    expect(await system.ledger.featureCost(feature, 90)).toEqual({
      calls: 0,
      avgMicros: 0,
      maxMicros: 0,
    });
    await system.ledger.record({ ...call, status: 'ok', costMicros: 4000 });
    await system.ledger.record({ ...call, status: 'ok', costMicros: 6000 });
    await system.ledger.record({ ...call, status: 'error', costMicros: 90_000 });
    expect(await system.ledger.featureCost(feature, 90)).toEqual({
      calls: 2,
      avgMicros: 5000,
      maxMicros: 6000,
    });
  });

  it('files a cutout made on her phone at no cost, and never moves the budget', async () => {
    const { cutoutCall } = await import('@robes/core/cutout');
    const row = cutoutCall({ route: 'on-device', status: 'ok', shared: false, latencyMs: 120 });
    await system.ledger.record({ ...row, userId: ann });
    await system.ledger.record({
      ...cutoutCall({ route: 'on-device', status: 'fallback', reason: 'outside', latencyMs: 90 }),
      userId: ann,
    });
    const rows = await db
      .selectFrom('generationCalls')
      .select(['feature', 'model', 'status', 'costMicros', 'images', 'detail'])
      .where('userId', '=', ann)
      .where('feature', '=', 'wardrobe.cutout')
      .orderBy('createdAt')
      .execute();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      model: 'apple-vision-foreground-instance-mask',
      status: 'ok',
      images: 1,
      detail: { route: 'on-device', shared: false },
    });
    expect(Number(rows[0]?.costMicros)).toBe(0);
    expect(rows[1]).toMatchObject({ status: 'partial', detail: { reason: 'outside' } });
    expect(await repos.capacity.isExhausted(['cutout-on-device'])).toBe(false);
  });
});
