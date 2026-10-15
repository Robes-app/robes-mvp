import { JoinWaitlistInput, Ok } from '@robes/contracts';
import { clientIp } from '@/server/client-ip';
import { route } from '@/server/route';
import { joinWaitlist } from '@/server/waitlist';

// Public by design (SEC-60): Turnstile + a tight per-IP limit; allow-listed in route-manifest.test.
export const POST = route({
  auth: 'public',
  flag: 'signups',
  input: JoinWaitlistInput,
  output: Ok,
  status: 202,
  rateLimit: { key: 'public.waitlist', limit: 5, windowSeconds: 3600 },
  handler: async ({ input, req }) => {
    await joinWaitlist(input, clientIp(req));
    return { ok: true as const };
  },
});
