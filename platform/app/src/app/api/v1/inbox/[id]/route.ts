import { EmptyInput, InboxEntry, InboxParams } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { loadInboxEntry } from '@/server/inbox';
import { route } from '@/server/route';

// One held entry, any source: Review opens a pasted link by the id its import job returned
// (links never show in the Inbox list). Someone else's entry, or a decided one, is not_found.
export const GET = route({
  auth: 'user',
  input: EmptyInput,
  params: InboxParams,
  output: InboxEntry,
  rateLimit: { key: 'inbox.get', limit: 120, windowSeconds: 60 },
  handler: ({ user, params }) => loadInboxEntry(verifiedUserId(user.id), params.id),
});
