import { EmptyInput, InboxAddress, InboxAddressStatus } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { ensureInboxAddress } from '@/server/inbox-address';
import { route } from '@/server/route';

// Her forwarding address for receipts, minted on first read.
export const GET = route({
  auth: 'user',
  input: EmptyInput,
  output: InboxAddress,
  rateLimit: { key: 'me.inboxAddress.get', limit: 120, windowSeconds: 60 },
  handler: ({ user }) => ensureInboxAddress(verifiedUserId(user.id)),
});

// Turns the address off: mail to it is dropped. Reading it again mints a new one.
export const DELETE = route({
  auth: 'user',
  input: EmptyInput,
  output: InboxAddressStatus,
  rateLimit: { key: 'me.inboxAddress.revoke', limit: 20, windowSeconds: 3600 },
  handler: async ({ user }) => {
    await repos.inboxAddress.revoke(verifiedUserId(user.id));
    return { address: null };
  },
});
