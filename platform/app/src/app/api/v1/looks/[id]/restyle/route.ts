import { LookParams, RestyleLookInput, StartJobOutput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { restyleLook } from '@/server/look-states';
import { route } from '@/server/route';

// ↻ on a suggested look, or Dress it again on a draft Robes made: that one look re-written in
// place, with what she said is not right with it.
export const POST = route({
  auth: 'user',
  flag: 'looks.generate',
  input: RestyleLookInput,
  params: LookParams,
  output: StartJobOutput,
  status: 202,
  rateLimit: { key: 'looks.restyle', limit: 10, windowSeconds: 60 },
  handler: ({ user, req, params, input }) =>
    restyleLook(verifiedUserId(user.id), req, params.id, input),
});
