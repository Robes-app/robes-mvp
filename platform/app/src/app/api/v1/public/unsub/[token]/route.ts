import { Ok, OneClickUnsubInput, UnsubParams } from '@robes/contracts';
import { route } from '@/server/route';
import { unsubscribe } from '@/server/unsubscribe';

// RFC 8058 one-click: mail clients POST `List-Unsubscribe=One-Click` here. Public by design (the
// signed token is the capability); allow-listed in route-manifest.test.
export const POST = route({
  auth: 'public',
  params: UnsubParams,
  input: OneClickUnsubInput,
  output: Ok,
  acceptForm: true,
  rateLimit: { key: 'public.unsub', limit: 30, windowSeconds: 60 },
  handler: async ({ params }) => {
    await unsubscribe(params.token);
    return { ok: true as const };
  },
});
