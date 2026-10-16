import {
  DeletionRequest,
  DeletionStatus,
  EmptyInput,
  RequestDeletionInput,
} from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { after } from 'next/server';
import { repos } from '@/server/db';
import { env } from '@/server/env';
import { route } from '@/server/route';

type Row = { status: string; requestedAt: Date };
const toRequest = (row: Row): DeletionRequest =>
  DeletionRequest.parse({ status: row.status, requestedAt: row.requestedAt.toISOString() });

export const GET = route({
  auth: 'user',
  input: EmptyInput,
  output: DeletionStatus,
  handler: async ({ user }) => {
    const row = await repos.deletion.get(verifiedUserId(user.id));
    return { request: row ? toRequest(row) : null };
  },
});

// SEC-80: records the request; maintenanceFn's account-deletion schedule acts on it within minutes
// (in dev, straight after the response).
export const POST = route({
  auth: 'user',
  input: RequestDeletionInput,
  output: DeletionRequest,
  status: 202,
  rateLimit: { key: 'me.deletion', limit: 5, windowSeconds: 3600 },
  handler: async ({ user }) => {
    const row = await repos.deletion.request(verifiedUserId(user.id));
    if (!row) throw new Error('deletion request not recorded');
    if (env.APP_ENV === 'dev') {
      after(async () => (await import('@/server/local-deletion')).runDeletionsLocally());
    }
    return toRequest(row);
  },
});
