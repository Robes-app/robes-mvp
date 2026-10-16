import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { createRepositories } from '../../src/repos';
import { createTestDb } from '../fixtures';

const db = createTestDb();
const { rateLimits } = createRepositories(db);
afterAll(() => db.destroy());

describe('rate limit counters', () => {
  it('counts atomically per key and window, even under concurrency', async () => {
    const key = `test:${randomUUID()}`;
    const results = await Promise.all(Array.from({ length: 10 }, () => rateLimits.hit(key, 60)));
    expect(results.map((r) => r.count).sort((a, b) => a - b)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
    expect(results[0]?.resetAt.getTime()).toBeGreaterThan(Date.now());
    expect((await rateLimits.hit(`test:${randomUUID()}`, 60)).count).toBe(1);
  });
});
