import { AdminUserDetail, AdminUserParams, EmptyInput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { userDetail } from '@/server/admin';
import { clientIp } from '@/server/client-ip';
import { route } from '@/server/route';

export const GET = route({
  auth: 'admin',
  input: EmptyInput,
  params: AdminUserParams,
  output: AdminUserDetail,
  rateLimit: { key: 'admin.user', limit: 120, windowSeconds: 60 },
  handler: ({ user, params, req }) =>
    userDetail({ admin: verifiedUserId(user.id), ip: clientIp(req) }, params.id),
});
