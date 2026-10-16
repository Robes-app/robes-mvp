import { DataExport, DataExportStatus, EmptyInput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { after } from 'next/server';
import { repos } from '@/server/db';
import { env } from '@/server/env';
import { latestExport, toExport } from '@/server/exports';
import { route } from '@/server/route';

export const GET = route({
  auth: 'user',
  input: EmptyInput,
  output: DataExportStatus,
  handler: async ({ user }) => ({ export: await latestExport(verifiedUserId(user.id)) }),
});

// SEC-81: maintenanceFn's data-export schedule builds it within minutes (in dev, straight after
// the response). A request from the last 24 h is returned instead of a new one.
export const POST = route({
  auth: 'user',
  input: EmptyInput,
  output: DataExport,
  status: 202,
  rateLimit: { key: 'me.exports', limit: 5, windowSeconds: 3600 },
  handler: async ({ user }) => {
    const row = await repos.exports.request(verifiedUserId(user.id));
    if (row.created && env.APP_ENV === 'dev') {
      after(async () => (await import('@/server/local-export')).runExportsLocally());
    }
    return toExport(row);
  },
});
