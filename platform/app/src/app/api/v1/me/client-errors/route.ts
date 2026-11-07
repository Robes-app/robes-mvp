import { Ok, ReportClientErrorInput } from '@robes/contracts';
import { logger } from '@/server/logger';
import { route } from '@/server/route';

// A signed URL's query is a credential: never let one reach the log.
const stripQueries = (text: string) => text.replace(/\?\S*/g, '?…');

// Native diagnostics (mobile/src/lib/report.ts): the failure goes to the log, without who met it.
export const POST = route({
  auth: 'user',
  input: ReportClientErrorInput,
  output: Ok,
  rateLimit: { key: 'me.clientErrors', limit: 30, windowSeconds: 60 },
  handler: async ({ input }) => {
    logger.warn({ ...input, message: stripQueries(input.message) }, 'client_error');
    return { ok: true as const };
  },
});
