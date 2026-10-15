import { AuditPage, ListAuditInput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { auditLog } from '@/server/admin';
import { clientIp } from '@/server/client-ip';
import { route } from '@/server/route';

export const GET = route({
  auth: 'admin',
  input: ListAuditInput,
  output: AuditPage,
  rateLimit: { key: 'admin.audit', limit: 60, windowSeconds: 60 },
  handler: ({ user, input, req }) =>
    auditLog({ admin: verifiedUserId(user.id), ip: clientIp(req) }, input),
});
