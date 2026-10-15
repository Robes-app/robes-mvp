import { BriefLineParams, EmptyInput, StyleDna } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { route } from '@/server/route';
import { removeBriefLine } from '@/server/twin';

export const DELETE = route({
  auth: 'user',
  input: EmptyInput,
  params: BriefLineParams,
  output: StyleDna,
  rateLimit: { key: 'me.dna.lines', limit: 60, windowSeconds: 60 },
  handler: ({ user, params }) => removeBriefLine(verifiedUserId(user.id), params.id),
});
