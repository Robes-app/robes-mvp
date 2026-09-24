import { describe, expect, it } from 'vitest';
import { createCounterRateLimiter, createMemoryRateLimiter } from './rate-limit';

describe('memory rate limiter', () => {
  it('allows up to the limit then blocks with retry-after', async () => {
    let now = 1_000_000;
    const rl = createMemoryRateLimiter(() => now);
    for (let i = 0; i < 3; i++) expect((await rl.limit('k', 3, 60)).success).toBe(true);
    const blocked = await rl.limit('k', 3, 60);
    expect(blocked.success).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(60);
    now += 61_000;
    expect((await rl.limit('k', 3, 60)).success).toBe(true);
  });
  it('keys are independent', async () => {
    const rl = createMemoryRateLimiter();
    expect((await rl.limit('a', 1, 60)).success).toBe(true);
    expect((await rl.limit('b', 1, 60)).success).toBe(true);
  });
});

describe('counter rate limiter (Postgres store)', () => {
  it('allows up to the limit per window key and reports the wait after', async () => {
    const counts = new Map<string, number>();
    const resetAt = new Date(10_000);
    const hit = async (key: string) => {
      counts.set(key, (counts.get(key) ?? 0) + 1);
      return { count: counts.get(key) ?? 0, resetAt };
    };
    const rl = createCounterRateLimiter(hit, () => 4_500);
    expect(await rl.limit('ip:1', 2, 60)).toEqual({ success: true, retryAfterSeconds: 0 });
    expect(await rl.limit('ip:1', 2, 60)).toEqual({ success: true, retryAfterSeconds: 0 });
    expect(await rl.limit('ip:1', 2, 60)).toEqual({ success: false, retryAfterSeconds: 6 });
    // A different rule for the same key counts separately.
    expect((await rl.limit('ip:1', 5, 3600)).success).toBe(true);
  });
});
