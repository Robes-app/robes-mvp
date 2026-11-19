import { EmptyInput, Ok } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { markBellSeen } from '@/server/notifications';
import { route } from '@/server/route';

export const POST = route({
  auth: 'user',
  input: EmptyInput,
  output: Ok,
  rateLimit: { key: 'notifications.seen', limit: 60, windowSeconds: 60 },
  handler: ({ user }) => markBellSeen(verifiedUserId(user.id)),
});
