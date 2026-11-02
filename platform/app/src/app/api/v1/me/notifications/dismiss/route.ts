import { DismissNotificationInput, Ok } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { dismissNotification } from '@/server/notifications';
import { route } from '@/server/route';

export const POST = route({
  auth: 'user',
  input: DismissNotificationInput,
  output: Ok,
  rateLimit: { key: 'notifications.dismiss', limit: 60, windowSeconds: 60 },
  handler: ({ user, input }) => dismissNotification(verifiedUserId(user.id), input.key),
});
