import { AdminCall, AdminCallParams, EmptyInput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { generationCall } from '@/server/admin';
import { clientIp } from '@/server/client-ip';
import { route } from '@/server/route';

export const GET = route({
  auth: 'admin',
  input: EmptyInput,
  params: AdminCallParams,
  output: AdminCall,
  rateLimit: { key: 'admin.call', limit: 120, windowSeconds: 60 },
  handler: ({ user, params, req }) =>
    generationCall({ admin: verifiedUserId(user.id), ip: clientIp(req) }, params.id),
});
