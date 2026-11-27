import { EmptyInput, TagList } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { route } from '@/server/route';

// Her tags (tags cleanup, 26 Nov): every one in her list, with how many of her looks and pieces
// carry it. The Tags drawer orders them (`drawerOrder`).
export const GET = route({
  auth: 'user',
  input: EmptyInput,
  output: TagList,
  rateLimit: { key: 'tags.list', limit: 240, windowSeconds: 60 },
  handler: async ({ user }) => ({ items: await repos.tags.list(verifiedUserId(user.id)) }),
});
