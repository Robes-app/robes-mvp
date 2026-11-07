import { LookParams, RedrawLookInput, StartJobOutput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { renderOnModel } from '@/server/model';
import { route } from '@/server/route';

// "See it on me": the look rendered on her filed model; `note` is her picture note (D21).
export const POST = route({
  auth: 'user',
  flag: 'looks.generate',
  input: RedrawLookInput,
  params: LookParams,
  output: StartJobOutput,
  status: 202,
  rateLimit: { key: 'looks.renderOnModel', limit: 12, windowSeconds: 60 },
  handler: ({ user, req, params, input }) =>
    renderOnModel(verifiedUserId(user.id), req, params.id, input),
});
