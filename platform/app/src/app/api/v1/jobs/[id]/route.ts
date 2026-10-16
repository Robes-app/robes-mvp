import { ApiError } from '@robes/api';
import { EmptyInput, JobIdParams, JobSnapshot } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { loadJobSnapshot } from '@/server/jobs';
import { route } from '@/server/route';

// One-off status read; live progress comes from /events (SSE), never from polling this.
export const GET = route({
  auth: 'user',
  input: EmptyInput,
  params: JobIdParams,
  output: JobSnapshot,
  handler: async ({ user, params }) => {
    const job = await loadJobSnapshot(verifiedUserId(user.id), params.id);
    if (!job) throw new ApiError('not_found');
    return job;
  },
});
