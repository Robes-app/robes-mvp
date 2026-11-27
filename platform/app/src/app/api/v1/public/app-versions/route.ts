import { AppVersions, EmptyInput } from '@robes/contracts';
import { APP_VERSIONS } from '@/server/app-versions';
import { route } from '@/server/route';

// Public: the phone asks at launch, before sign-in, whether it must update (ADR-022). An app below
// the minimum gets 426 here like anywhere else, which is the same answer.
export const GET = route({
  auth: 'public',
  input: EmptyInput,
  output: AppVersions,
  rateLimit: { key: 'public.app-versions', limit: 60, windowSeconds: 60 },
  handler: async () => APP_VERSIONS,
});
