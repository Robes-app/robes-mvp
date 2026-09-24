import { AnalyseStyleInput, StartJobOutput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { route } from '@/server/route';
import { analyseStyle } from '@/server/style-profile';

// Colour (headshot) or silhouette (full-length) read; the result lands on GET /me/style.
export const POST = route({
  auth: 'user',
  input: AnalyseStyleInput,
  output: StartJobOutput,
  status: 202,
  rateLimit: { key: 'me.style.analyse', limit: 10, windowSeconds: 3600 },
  handler: ({ user, req, input }) => analyseStyle(verifiedUserId(user.id), req, input),
});
