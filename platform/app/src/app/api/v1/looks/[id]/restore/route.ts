import { EmptyInput, Look, LookParams } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { draftsFull } from '@/server/look-states';
import { toLook } from '@/server/looks-entity';
import { route } from '@/server/route';

export const POST = route({
  auth: 'user',
  input: EmptyInput,
  params: LookParams,
  output: Look,
  rateLimit: { key: 'looks.restore', limit: 120, windowSeconds: 60 },
  handler: async ({ user, params }) => {
    const userId = verifiedUserId(user.id);
    // A draft coming back counts against the five; a full set answers 409 drafts_full.
    return toLook(userId, await draftsFull(() => repos.looks.restore(userId, params.id)));
  },
});
