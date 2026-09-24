import { EmptyInput, LookParams, StartJobOutput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { renderOnModel } from '@/server/model';
import { route } from '@/server/route';

// "See it on me": the look rendered on her filed model.
export const POST = route({
  auth: 'user',
  flag: 'looks.generate',
  input: EmptyInput,
  params: LookParams,
  output: StartJobOutput,
  status: 202,
  rateLimit: { key: 'looks.renderOnModel', limit: 12, windowSeconds: 60 },
  handler: ({ user, req, params }) => renderOnModel(verifiedUserId(user.id), req, params.id),
});
