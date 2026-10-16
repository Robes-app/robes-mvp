import { AdminHealth, EmptyInput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { health } from '@/server/admin';
import { clientIp } from '@/server/client-ip';
import { route } from '@/server/route';

export const GET = route({
  auth: 'admin',
  input: EmptyInput,
  output: AdminHealth,
  rateLimit: { key: 'admin.health', limit: 60, windowSeconds: 60 },
  handler: ({ user, req }) => health({ admin: verifiedUserId(user.id), ip: clientIp(req) }),
});
