import { Consents, EmptyInput, UpdateConsentsInput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { getConsents, updateConsents } from '@/server/consents';
import { repos } from '@/server/db';
import { route } from '@/server/route';

export const GET = route({
  auth: 'user',
  input: EmptyInput,
  output: Consents,
  rateLimit: { key: 'me.consents.read', limit: 60, windowSeconds: 60 },
  handler: ({ user }) => getConsents(repos, verifiedUserId(user.id)),
});

export const POST = route({
  auth: 'user',
  input: UpdateConsentsInput,
  output: Consents,
  rateLimit: { key: 'me.consents', limit: 20, windowSeconds: 60 },
  handler: ({ user, input }) => updateConsents(repos, verifiedUserId(user.id), input),
});
