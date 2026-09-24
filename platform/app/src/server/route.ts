import 'server-only';
import {
  createJwtVerifier,
  createMemoryRateLimiter,
  createRouteFactory,
  createUpstashRateLimiter,
  remoteJwks,
} from '@robes/api';
import { clientIp } from './client-ip';
import { env } from './env';

const rateLimiter =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? createUpstashRateLimiter(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN)
    : createMemoryRateLimiter();

export const route = createRouteFactory({
  verifier: createJwtVerifier({
    getKey: remoteJwks(env.SUPABASE_JWKS_URL),
    issuer: env.SUPABASE_JWT_ISSUER,
  }),
  // M1 replaces this with a service-role lookup of private.admin_users.
  isAdmin: async () => false,
  rateLimiter,
  clientIp,
  logger: { error: (obj, msg) => console.error(JSON.stringify({ level: 'error', msg, ...obj })) },
});
