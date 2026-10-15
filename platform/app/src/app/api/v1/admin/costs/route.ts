import { AdminCosts, AdminCostsInput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { costs } from '@/server/admin';
import { clientIp } from '@/server/client-ip';
import { route } from '@/server/route';

export const GET = route({
  auth: 'admin',
  input: AdminCostsInput,
  output: AdminCosts,
  rateLimit: { key: 'admin.costs', limit: 60, windowSeconds: 60 },
  handler: ({ user, input, req }) =>
    costs({ admin: verifiedUserId(user.id), ip: clientIp(req) }, input.days),
});
