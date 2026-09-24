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
