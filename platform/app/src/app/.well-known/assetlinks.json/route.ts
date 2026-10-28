import { EmptyInput } from '@robes/contracts';
import { AssetLinks, assetLinks } from '@/server/app-links';
import { env } from '@/server/env';
import { route } from '@/server/route';

// Public: Google's verifier fetches it, signed out, to let the Android app open this host's
// links (N4). Built from env only; nothing about any user. docs/api.md §3.
export const GET = route({
  auth: 'public',
  input: EmptyInput,
  output: AssetLinks,
  rateLimit: { key: 'public.app-links', limit: 60, windowSeconds: 60 },
  handler: async () => assetLinks(env.appLinks),
});
