import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@/server/auth';

// Delegated to Better Auth (own CSRF/origin checks and DB-backed rate limits); see route-manifest.test.ts.
export const { GET, POST } = toNextJsHandler(auth);
