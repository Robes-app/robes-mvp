import { ApiError } from '@robes/api';
import { EmptyInput, JobIdParams, JobSnapshot } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { loadJobSnapshot } from '@/server/jobs';
import { route } from '@/server/route';

// Idempotent: cancelling a finished job returns it unchanged.
export const POST = route({
  auth: 'user',
  input: EmptyInput,
  params: JobIdParams,
  output: JobSnapshot,
  rateLimit: { key: 'jobs.cancel', limit: 30, windowSeconds: 60 },
  handler: async ({ user, params }) => {
    const userId = verifiedUserId(user.id);
    await repos.jobs.requestCancel(userId, params.id);
    const job = await loadJobSnapshot(userId, params.id);
    if (!job) throw new ApiError('not_found');
    return job;
  },
});
