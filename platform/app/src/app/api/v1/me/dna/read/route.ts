import { EmptyInput, StartJobOutput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { route } from '@/server/route';
import { startBriefRead } from '@/server/twin';

// Robes reads her wardrobe for the brief; what it noticed lands on GET /me/dna as observations.
export const POST = route({
  auth: 'user',
  flag: 'style.brief',
  input: EmptyInput,
  output: StartJobOutput,
  status: 202,
  rateLimit: { key: 'me.dna.read', limit: 10, windowSeconds: 60 },
  handler: ({ user, req }) => startBriefRead(verifiedUserId(user.id), req),
});
