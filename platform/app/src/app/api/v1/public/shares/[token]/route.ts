import { EmptyInput, SharedLook, ShareParams } from '@robes/contracts';
import { route } from '@/server/route';
import { viewShare } from '@/server/shares';

// Public by design (the token is the capability, SEC-13); allow-listed in route-manifest.test.
export const GET = route({
  auth: 'public',
  input: EmptyInput,
  params: ShareParams,
  output: SharedLook,
  rateLimit: { key: 'public.shares', limit: 120, windowSeconds: 60 },
  handler: ({ params }) => viewShare(params.token),
});
