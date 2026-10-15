import { EmptyInput, NoticedList } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { listNoticed } from '@/server/look-states';
import { route } from '@/server/route';

// Rules she said in a look's prompt, waiting under Robes noticed until she keeps them.
export const GET = route({
  auth: 'user',
  input: EmptyInput,
  output: NoticedList,
  handler: ({ user }) => listNoticed(verifiedUserId(user.id)),
});
