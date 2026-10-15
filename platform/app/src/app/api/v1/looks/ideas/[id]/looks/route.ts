import { IdeaParams, Look, SaveWayInput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { saveWayAsLook } from '@/server/looks';
import { toLook } from '@/server/looks-entity';
import { route } from '@/server/route';

// One of the idea's three ways becomes a saved Look (Looks › Saved).
export const POST = route({
  auth: 'user',
  input: SaveWayInput,
  params: IdeaParams,
  output: Look,
  status: 201,
  rateLimit: { key: 'looks.ideas.saveWay', limit: 60, windowSeconds: 60 },
  handler: async ({ user, input, params }) => {
    const userId = verifiedUserId(user.id);
    return toLook(userId, await saveWayAsLook(userId, params.id, input.wayIdx));
  },
});
