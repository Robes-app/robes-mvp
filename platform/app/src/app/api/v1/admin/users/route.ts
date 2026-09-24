import { AdminUserPage, ListAdminUsersInput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { listUsers } from '@/server/admin';
import { clientIp } from '@/server/client-ip';
import { route } from '@/server/route';

export const GET = route({
  auth: 'admin',
  input: ListAdminUsersInput,
  output: AdminUserPage,
  rateLimit: { key: 'admin.users', limit: 120, windowSeconds: 60 },
  handler: ({ user, input, req }) =>
    listUsers({ admin: verifiedUserId(user.id), ip: clientIp(req) }, input),
});
