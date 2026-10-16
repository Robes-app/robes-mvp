import { GenerateLookInput, StartJobOutput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { generateLook } from '@/server/looks';
import { route } from '@/server/route';

// Style a piece: starts the key_piece job; progress streams from /jobs/:id/events.
export const POST = route({
  auth: 'user',
  flag: 'looks.generate',
  input: GenerateLookInput,
  output: StartJobOutput,
  status: 202,
  rateLimit: { key: 'looks.generate', limit: 10, windowSeconds: 60 },
  handler: ({ user, req, input }) => generateLook(verifiedUserId(user.id), req, input),
});
