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
    await system.ledger.record({ ...call, costMicros: 6_000_000 });
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
      .select('feature')
      .where('jobId', '=', job.id)
      .execute();
    expect(calls).toHaveLength(2);
  });
});
