import { PromptLookInput, StartJobOutput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { promptLook } from '@/server/look-states';
import { route } from '@/server/route';

// A new look in her words: three suggested looks for a day, landing on the keep-or-pass deck.
export const POST = route({
  auth: 'user',
  flag: 'looks.generate',
  input: PromptLookInput,
  output: StartJobOutput,
  status: 202,
  rateLimit: { key: 'looks.prompt', limit: 10, windowSeconds: 60 },
  handler: ({ user, req, input }) => promptLook(verifiedUserId(user.id), req, input),
});
