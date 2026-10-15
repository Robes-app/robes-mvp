import { IdeaList, ListIdeasInput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { toIdeas } from '@/server/looks';
import { route } from '@/server/route';

export const GET = route({
  auth: 'user',
  input: ListIdeasInput,
  output: IdeaList,
  handler: async ({ user, input }) => {
    const userId = verifiedUserId(user.id);
    return { items: await toIdeas(userId, await repos.ideas.list(userId, input.limit)) };
  },
});
