import { DecideInboxInput, InboxDecision, InboxParams } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { decideInbox } from '@/server/inbox';
import { route } from '@/server/route';

// File the held items as pieces or wishes, or dismiss them; deciding twice changes nothing.
export const POST = route({
  auth: 'user',
  input: DecideInboxInput,
  params: InboxParams,
  output: InboxDecision,
  rateLimit: { key: 'inbox.decide', limit: 120, windowSeconds: 60 },
  handler: ({ user, params, input }) =>
    decideInbox(verifiedUserId(user.id), params.id, input.action, input.itemIndexes),
});
