import { BriefLineParams, EmptyInput, StyleDna } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { route } from '@/server/route';
import { answerObservation } from '@/server/twin';

export const POST = route({
  auth: 'user',
  input: EmptyInput,
  params: BriefLineParams,
  output: StyleDna,
  rateLimit: { key: 'me.dna.observations', limit: 60, windowSeconds: 60 },
  handler: ({ user, params }) => answerObservation(verifiedUserId(user.id), params.id, 'keep'),
});
