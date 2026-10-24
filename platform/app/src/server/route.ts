import 'server-only';
import {
  createCounterRateLimiter,
  createMemoryRateLimiter,
  createRouteFactory,
  createSseRouteFactory,
  createUpstashRateLimiter,
  type RouteDeps,
} from '@robes/api';
import { sessionUser } from '@robes/auth';
import { verifiedUserId } from '@robes/db';
import { errorReporter } from './analytics';
import { auth } from './auth';
import { clientIp } from './client-ip';
import { repos } from './db';
import { env } from './env';
import { isFlagEnabled } from './flags';
import { logger } from './logger';

// Deployed: Upstash when configured, else Postgres counters (shared across instances, SEC-33).
// Dev: in-process, so local runs never wait on the limiter's store.
export const rateLimiter =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? createUpstashRateLimiter(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN)
    : env.APP_ENV === 'dev'
      ? createMemoryRateLimiter()
      : createCounterRateLimiter((key, windowSeconds) => repos.rateLimits.hit(key, windowSeconds));

const deps: RouteDeps = {
  resolveUser: (req) => sessionUser(auth, req.headers),
  isAdmin: (userId) => repos.admin.isAdmin(verifiedUserId(userId)),
  isFlagEnabled,
  ...(env.MIN_APP_VERSION ? { minAppVersion: env.MIN_APP_VERSION } : {}),
  rateLimiter,
  clientIp,
  logger,
  captureError: (err: unknown, { requestId }: { requestId: string }) =>
    void errorReporter.capture(err, { requestId, source: 'api' }),
};

export const route = createRouteFactory(deps);
export const sseRoute = createSseRouteFactory(deps);
