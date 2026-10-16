import { EmptyInput, IdeaFrameParams, StartJobOutput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { requestIdeaFrame } from '@/server/looks';
import { route } from '@/server/route';

// "Show this look": renders one deferred frame of an idea (UX-09).
export const POST = route({
  auth: 'user',
  flag: 'looks.generate',
  input: EmptyInput,
  params: IdeaFrameParams,
  output: StartJobOutput,
  status: 202,
  rateLimit: { key: 'looks.ideas.render', limit: 30, windowSeconds: 60 },
  handler: ({ user, req, params }) =>
    requestIdeaFrame(verifiedUserId(user.id), req, params.id, params.idx),
});
