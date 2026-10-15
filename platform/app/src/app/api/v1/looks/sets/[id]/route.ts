import { EmptyInput, LookSet, LookSetParams } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { loadSet } from '@/server/look-states';
import { route } from '@/server/route';

// The keep-or-pass deck: one generation's looks, as Robes wrote them.
export const GET = route({
  auth: 'user',
  input: EmptyInput,
  params: LookSetParams,
  output: LookSet,
  handler: ({ user, params }) => loadSet(verifiedUserId(user.id), params.id),
});
