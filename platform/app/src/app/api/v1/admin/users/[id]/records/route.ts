import { AdminUserParams, AdminUserRecords, EmptyInput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { userRecords } from '@/server/admin';
import { clientIp } from '@/server/client-ip';
import { route } from '@/server/route';

export const GET = route({
  auth: 'admin',
  input: EmptyInput,
  params: AdminUserParams,
  output: AdminUserRecords,
  rateLimit: { key: 'admin.user.records', limit: 120, windowSeconds: 60 },
  handler: ({ user, params, req }) =>
    userRecords({ admin: verifiedUserId(user.id), ip: clientIp(req) }, params.id),
});
