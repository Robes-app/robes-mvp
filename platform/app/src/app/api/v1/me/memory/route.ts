import { Ok, RecordMemoryInput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { route } from '@/server/route';
import { recordMemory } from '@/server/twin';

// What she tells Robes elsewhere (a verdict, a swap, an ask) joins the memory every prompt reads.
export const POST = route({
  auth: 'user',
  input: RecordMemoryInput,
  output: Ok,
  rateLimit: { key: 'me.memory.record', limit: 60, windowSeconds: 60 },
  handler: async ({ user, input }) => {
    await recordMemory(verifiedUserId(user.id), input);
    return { ok: true as const };
  },
});
