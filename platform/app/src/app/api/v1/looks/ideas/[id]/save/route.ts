import { ApiError } from '@robes/api';
import { EmptyInput, Idea, IdeaParams } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { toIdeas } from '@/server/looks';
import { route } from '@/server/route';

// Saving keeps an idea past its 30-day expiry; repeat saves keep the first savedAt.
export const POST = route({
  auth: 'user',
  input: EmptyInput,
  params: IdeaParams,
  output: Idea,
  rateLimit: { key: 'looks.ideas.save', limit: 120, windowSeconds: 60 },
  handler: async ({ user, params }) => {
    const userId = verifiedUserId(user.id);
    const row = await repos.ideas.save(userId, params.id);
    if (!row) throw new ApiError('not_found');
    const [idea] = await toIdeas(userId, [row]);
    if (!idea) throw new ApiError('not_found');
    return idea;
  },
});
