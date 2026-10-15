import { AdminFlags, EmptyInput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { flags } from '@/server/admin';
import { clientIp } from '@/server/client-ip';
import { route } from '@/server/route';

export const GET = route({
  auth: 'admin',
  input: EmptyInput,
  output: AdminFlags,
  handler: ({ user, req }) => flags({ admin: verifiedUserId(user.id), ip: clientIp(req) }),
});
