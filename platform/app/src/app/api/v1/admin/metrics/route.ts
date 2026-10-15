import { AdminMetrics, AdminMetricsInput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { metrics } from '@/server/admin';
import { clientIp } from '@/server/client-ip';
import { route } from '@/server/route';

// Operating metrics for the cutover and beta: aggregates only, and every read is audited.
export const GET = route({
  auth: 'admin',
  input: AdminMetricsInput,
  output: AdminMetrics,
  rateLimit: { key: 'admin.metrics', limit: 30, windowSeconds: 60 },
  handler: ({ user, input, req }) =>
    metrics({ admin: verifiedUserId(user.id), ip: clientIp(req) }, input.days),
});
