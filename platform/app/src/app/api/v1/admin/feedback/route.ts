import { AdminFeedbackPage, ListAdminFeedbackInput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { feedbackFeed } from '@/server/admin';
import { clientIp } from '@/server/client-ip';
import { route } from '@/server/route';

export const GET = route({
  auth: 'admin',
  input: ListAdminFeedbackInput,
  output: AdminFeedbackPage,
  rateLimit: { key: 'admin.feedback', limit: 60, windowSeconds: 60 },
  handler: ({ user, input, req }) =>
    feedbackFeed({ admin: verifiedUserId(user.id), ip: clientIp(req) }, input),
});
