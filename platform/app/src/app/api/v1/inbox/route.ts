import { EmptyInput, InboxList } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { loadInbox } from '@/server/inbox';
import { route } from '@/server/route';

export const GET = route({
  auth: 'user',
  input: EmptyInput,
  output: InboxList,
  handler: ({ user }) => loadInbox(verifiedUserId(user.id)),
});
