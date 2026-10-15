import { ChooseSeasonInput, StyleProfile } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { route } from '@/server/route';
import { chooseStyleSeason } from '@/server/twin';

// No model call: the season's catalog read, the photograph's values riding along.
export const PUT = route({
  auth: 'user',
  input: ChooseSeasonInput,
  output: StyleProfile,
  rateLimit: { key: 'me.style.season', limit: 30, windowSeconds: 60 },
  handler: ({ user, input }) => chooseStyleSeason(verifiedUserId(user.id), input),
});
