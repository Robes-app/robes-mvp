import { AdminFlag, AdminFlagParams, SetAdminFlagInput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { setFlag } from '@/server/admin';
import { clientIp } from '@/server/client-ip';
import { route } from '@/server/route';

// Kill switches: flipping one is audited with its previous value.
export const PATCH = route({
  auth: 'admin',
  input: SetAdminFlagInput,
  params: AdminFlagParams,
  output: AdminFlag,
  rateLimit: { key: 'admin.flags.set', limit: 30, windowSeconds: 60 },
  handler: ({ user, input, params, req }) =>
    setFlag({ admin: verifiedUserId(user.id), ip: clientIp(req) }, params.key, input.enabled),
});
