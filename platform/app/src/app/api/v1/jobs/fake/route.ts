import { EmptyInput, StartJobOutput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { startJob } from '@/server/jobs';
import { route } from '@/server/route';

// Platform smoke test: a staged job with no model calls, still metered like a real one.
export const POST = route({
  auth: 'user',
  flag: 'jobs.fake',
  input: EmptyInput,
  output: StartJobOutput,
  status: 202,
  rateLimit: { key: 'jobs.fake', limit: 10, windowSeconds: 60 },
  handler: ({ user, req }) =>
    startJob(verifiedUserId(user.id), req, {
      kind: 'fake',
      input: {},
      quota: { metric: 'generation.text', cost: 1 },
    }),
});
