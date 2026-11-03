import { EmptyInput } from '@robes/contracts';
import { AppleAppSiteAssociation, appleAppSiteAssociation } from '@/server/app-links';
import { env } from '@/server/env';
import { route } from '@/server/route';

// Public: Apple's CDN fetches it, signed out, to let the iOS app open this host's links (N4).
// Built from env only; nothing about any user. docs/api.md §3.
export const GET = route({
  auth: 'public',
  input: EmptyInput,
  output: AppleAppSiteAssociation,
  rateLimit: { key: 'public.app-links', limit: 60, windowSeconds: 60 },
  handler: async () => appleAppSiteAssociation(env.appLinks),
});
