import { AdminArtifact, AdminArtifactParams, EmptyInput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { artifact } from '@/server/admin';
import { clientIp } from '@/server/client-ip';
import { route } from '@/server/route';

export const GET = route({
  auth: 'admin',
  input: EmptyInput,
  params: AdminArtifactParams,
  output: AdminArtifact,
  rateLimit: { key: 'admin.artifact', limit: 120, windowSeconds: 60 },
  handler: ({ user, params, req }) =>
    artifact({ admin: verifiedUserId(user.id), ip: clientIp(req) }, params.id),
});
