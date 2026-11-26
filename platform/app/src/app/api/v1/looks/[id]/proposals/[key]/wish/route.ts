import { ApiError } from '@robes/api';
import { EmptyInput, Look, LookProposalParams } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { toLook } from '@/server/looks-entity';
import { route } from '@/server/route';

// The heart on one piece to find on her look: filed to her wishlist as Save files it (its photo,
// price and shop link), and marked on the look at once. A piece already filed changes nothing.
export const POST = route({
  auth: 'user',
  input: EmptyInput,
  params: LookProposalParams,
  output: Look,
  rateLimit: { key: 'looks.proposals.wish', limit: 120, windowSeconds: 60 },
  handler: async ({ user, params }) => {
    const userId = verifiedUserId(user.id);
    const look = await repos.looks.wishProposal(userId, params.id, params.key);
    if (!look) throw new ApiError('not_found');
    return toLook(userId, look);
  },
});
