import { CreateShareInput, Share } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { route } from '@/server/route';
import { shareLook } from '@/server/shares';

// Share a look: a frozen, whitelisted snapshot behind a 128-bit link.
export const POST = route({
  auth: 'user',
  input: CreateShareInput,
  output: Share,
  status: 201,
  rateLimit: { key: 'shares.create', limit: 30, windowSeconds: 60 },
  handler: ({ user, input }) => shareLook(verifiedUserId(user.id), input.subjectId),
});
