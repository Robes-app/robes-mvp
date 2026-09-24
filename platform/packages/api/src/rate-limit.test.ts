import { describe, expect, it } from 'vitest';
import { createMemoryRateLimiter } from './rate-limit';

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
