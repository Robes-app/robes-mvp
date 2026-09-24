import { EmptyInput, InboxAddress } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { toInboxAddress } from '@/server/inbox-address';
import { route } from '@/server/route';

// A fresh address; the old one stops working at once.
export const POST = route({
  auth: 'user',
  input: EmptyInput,
  output: InboxAddress,
  rateLimit: { key: 'me.inboxAddress.regenerate', limit: 20, windowSeconds: 3600 },
  handler: async ({ user }) =>
    toInboxAddress(await repos.inboxAddress.regenerate(verifiedUserId(user.id))),
});
