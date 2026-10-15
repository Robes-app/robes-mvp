import { EmptyInput, StyleDna, UpdateStyleDnaInput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { route } from '@/server/route';
import { loadStyleDna, updateStyleDna } from '@/server/twin';

export const GET = route({
  auth: 'user',
  input: EmptyInput,
  output: StyleDna,
  handler: ({ user }) => loadStyleDna(verifiedUserId(user.id)),
});

export const PATCH = route({
  auth: 'user',
  input: UpdateStyleDnaInput,
  output: StyleDna,
  rateLimit: { key: 'me.dna.update', limit: 60, windowSeconds: 60 },
  handler: ({ user, input }) => updateStyleDna(verifiedUserId(user.id), input),
});
