import { AddBriefLineInput, StyleDna } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { route } from '@/server/route';
import { addBriefLine } from '@/server/twin';

// A line of her own under What works / Hard nos / Your rules; filed at once.
export const POST = route({
  auth: 'user',
  input: AddBriefLineInput,
  output: StyleDna,
  rateLimit: { key: 'me.dna.lines', limit: 60, windowSeconds: 60 },
  handler: ({ user, input }) => addBriefLine(verifiedUserId(user.id), input),
});
