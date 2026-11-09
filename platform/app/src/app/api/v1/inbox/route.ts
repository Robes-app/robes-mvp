import { InboxList, InboxListInput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { loadInbox } from '@/server/inbox';
import { route } from '@/server/route';

export const GET = route({
  auth: 'user',
  input: InboxListInput,
  output: InboxList,
  handler: ({ user, input }) => loadInbox(verifiedUserId(user.id), input.state),
});
