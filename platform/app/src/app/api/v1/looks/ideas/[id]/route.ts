import { ApiError } from '@robes/api';
import { Deleted, EmptyInput, Idea, IdeaParams } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { loadIdea } from '@/server/looks';
import { route } from '@/server/route';

export const GET = route({
  auth: 'user',
  input: EmptyInput,
  params: IdeaParams,
  output: Idea,
  handler: ({ user, params }) => loadIdea(verifiedUserId(user.id), params.id),
});

export const DELETE = route({
  auth: 'user',
  input: EmptyInput,
  params: IdeaParams,
  output: Deleted,
  rateLimit: { key: 'looks.ideas.delete', limit: 120, windowSeconds: 60 },
  handler: async ({ user, params }) => {
    if (!(await repos.ideas.remove(verifiedUserId(user.id), params.id))) {
      throw new ApiError('not_found');
    }
    return { ok: true as const };
  },
});
