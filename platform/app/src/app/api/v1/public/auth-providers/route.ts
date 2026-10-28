import { AuthProviders, EmptyInput } from '@robes/contracts';
import { socialProviders } from '@/server/auth';
import { route } from '@/server/route';

// Public: the phone's sign-in screen asks before anyone is signed in, so it shows the same
// Apple/Google buttons the web does (F5). Two booleans from env; nothing about any user.
export const GET = route({
  auth: 'public',
  input: EmptyInput,
  output: AuthProviders,
  rateLimit: { key: 'public.auth-providers', limit: 60, windowSeconds: 60 },
  handler: async () => socialProviders,
});
