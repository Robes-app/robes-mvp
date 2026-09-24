import { ApiError } from '@robes/api';
import { JOB_EVENT, JobIdParams } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { createPollingJobEvents } from '@/server/job-events';
import { loadJobSnapshot } from '@/server/jobs';
import { sseRoute } from '@/server/route';

// Streams are capped at 5 minutes by sseRoute; EventSource reconnects and resumes from the row.
export const maxDuration = 300;

const jobEvents = createPollingJobEvents(loadJobSnapshot);

export const GET = sseRoute({
  auth: 'user',
  params: JobIdParams,
  rateLimit: { key: 'jobs.events', limit: 60, windowSeconds: 60 },
  open: async ({ user, params, signal }) => {
    const userId = verifiedUserId(user.id);
    const first = await loadJobSnapshot(userId, params.id);
    if (!first) throw new ApiError('not_found');
    return (async function* () {
      for await (const job of jobEvents.watch(userId, first, signal)) {
        yield { event: JOB_EVENT, data: job };
      }
    })();
  },
});
