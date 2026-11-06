import { LookParams, RedrawLookInput, StartJobOutput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { requestFrame } from '@/server/look-states';
import { route } from '@/server/route';

// Robes' frame for the rack as it stands (first open of a suggestion, or after an edit); `note` is
// her picture note (D21).
export const POST = route({
  auth: 'user',
  flag: 'looks.generate',
  input: RedrawLookInput,
  params: LookParams,
  output: StartJobOutput,
  status: 202,
  rateLimit: { key: 'looks.frame', limit: 30, windowSeconds: 60 },
  handler: ({ user, req, params, input }) =>
    requestFrame(verifiedUserId(user.id), req, params.id, input),
});
