import { EmptyInput, Notifications } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { loadNotifications } from '@/server/notifications';
import { route } from '@/server/route';

// The bell: what waits for her, computed on each read.
export const GET = route({
  auth: 'user',
  input: EmptyInput,
  output: Notifications,
  rateLimit: { key: 'notifications.list', limit: 120, windowSeconds: 60 },
  handler: ({ user }) => loadNotifications(verifiedUserId(user.id)),
});
