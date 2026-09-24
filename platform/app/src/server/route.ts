import 'server-only';
import {
  createMemoryRateLimiter,
  createRouteFactory,
  createSseRouteFactory,
  createUpstashRateLimiter,
  type RouteDeps,
} from '@robes/api';
import { sessionUser } from '@robes/auth';
import { verifiedUserId } from '@robes/db';
import * as Sentry from '@sentry/nextjs';
import { auth } from './auth';
import { clientIp } from './client-ip';
import { repos } from './db';
import { env } from './env';
import { isFlagEnabled } from './flags';
import { logger } from './logger';

const rateLimiter =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? createUpstashRateLimiter(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN)
    : createMemoryRateLimiter();

const deps: RouteDeps = {
  resolveUser: (req) => sessionUser(auth, req.headers),
  isAdmin: (userId) => repos.admin.isAdmin(verifiedUserId(userId)),
  isFlagEnabled,
  ...(env.MIN_APP_VERSION ? { minAppVersion: env.MIN_APP_VERSION } : {}),
  rateLimiter,
  clientIp,
  logger,
  ...(env.observability.sentry
    ? {
        captureError: (err: unknown, { requestId }: { requestId: string }) =>
          void Sentry.captureException(err, { tags: { requestId } }),
      }
    : {}),
};

export const route = createRouteFactory(deps);
export const sseRoute = createSseRouteFactory(deps);
