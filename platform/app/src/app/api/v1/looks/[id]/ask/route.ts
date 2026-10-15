import { LookAskInput, LookParams, StartJobOutput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { askLook } from '@/server/look-states';
import { route } from '@/server/route';

// The look prompt: her words against the rack she sends; the edit is the job's output.
export const POST = route({
  auth: 'user',
  flag: 'looks.generate',
  input: LookAskInput,
  params: LookParams,
  output: StartJobOutput,
  status: 202,
  rateLimit: { key: 'looks.ask', limit: 30, windowSeconds: 60 },
  handler: ({ user, req, input, params }) =>
    askLook(verifiedUserId(user.id), req, params.id, input),
});
