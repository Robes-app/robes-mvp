import { EmptyInput, LookParams, StartJobOutput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { restyleLook } from '@/server/look-states';
import { route } from '@/server/route';

// ↻ on a suggested look: Robes re-writes that one look in place.
export const POST = route({
  auth: 'user',
  flag: 'looks.generate',
  input: EmptyInput,
  params: LookParams,
  output: StartJobOutput,
  status: 202,
  rateLimit: { key: 'looks.restyle', limit: 10, windowSeconds: 60 },
  handler: ({ user, req, params }) => restyleLook(verifiedUserId(user.id), req, params.id),
});
