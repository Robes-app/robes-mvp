import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export interface RateLimitResult {
  success: boolean;
  retryAfterSeconds: number;
}

export interface RateLimiter {
  limit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult>;
}

// Dev/test only: per-process state is exactly what SEC-33 forbids in deployed environments.
// Fixed window, so it is more lenient on bursts than Upstash's sliding window.
export function createMemoryRateLimiter(now: () => number = Date.now): RateLimiter {
  const windows = new Map<string, { start: number; count: number }>();
  return {
    async limit(key, limit, windowSeconds) {
      const t = now();
      const windowMs = windowSeconds * 1000;
      const w = windows.get(key);
      if (!w || t - w.start >= windowMs) {
        windows.set(key, { start: t, count: 1 });
        return { success: true, retryAfterSeconds: 0 };
      }
      w.count += 1;
      if (w.count <= limit) return { success: true, retryAfterSeconds: 0 };
      return { success: false, retryAfterSeconds: Math.ceil((w.start + windowMs - t) / 1000) };
    },
  };
}

export function createUpstashRateLimiter(url: string, token: string): RateLimiter {
  const redis = new Redis({ url, token });
  const limiters = new Map<string, Ratelimit>();
  return {
    async limit(key, limit, windowSeconds) {
      const id = `${limit}/${windowSeconds}`;
      let rl = limiters.get(id);
      if (!rl) {
        rl = new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
          prefix: 'rl',
        });
        limiters.set(id, rl);
      }
      const res = await rl.limit(key);
      return {
        success: res.success,
        retryAfterSeconds: res.success
          ? 0
          : Math.max(1, Math.ceil((res.reset - Date.now()) / 1000)),
      };
    },
  };
}

// Shared store without Redis: a fixed-window counter the caller keeps (Postgres in the app).
export function createCounterRateLimiter(
  hit: (key: string, windowSeconds: number) => Promise<{ count: number; resetAt: Date }>,
  now: () => number = Date.now,
): RateLimiter {
  return {
    async limit(key, limit, windowSeconds) {
      const { count, resetAt } = await hit(`${limit}/${windowSeconds}:${key}`, windowSeconds);
      if (count <= limit) return { success: true, retryAfterSeconds: 0 };
      return {
        success: false,
        retryAfterSeconds: Math.max(1, Math.ceil((resetAt.getTime() - now()) / 1000)),
      };
    },
  };
}
