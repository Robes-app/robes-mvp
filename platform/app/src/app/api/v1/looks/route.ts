import { CreateLookInput, ListLooksInput, Look, LookPage } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { draftsFull } from '@/server/look-states';
import { suggestedName, toLook, toLooks, withOwnedPieces } from '@/server/looks-entity';
import { route } from '@/server/route';

export const GET = route({
  auth: 'user',
  input: ListLooksInput,
  output: LookPage,
  rateLimit: { key: 'looks.list', limit: 240, windowSeconds: 60 },
  handler: async ({ user, input }) => {
    const userId = verifiedUserId(user.id);
    const page = await repos.looks.list(userId, input);
    return { items: await toLooks(userId, page.items), nextCursor: page.nextCursor };
  },
});

export const POST = route({
  auth: 'user',
  input: CreateLookInput,
  output: Look,
  status: 201,
  rateLimit: { key: 'looks.create', limit: 60, windowSeconds: 60 },
  handler: async ({ user, input }) => {
    const userId = verifiedUserId(user.id);
    const name = input.name ?? (await suggestedName(userId, input.pieces[0]?.pieceId));
    // A draft names itself from its first piece too; Save keeps the name provisional until she types one.
    const row = await draftsFull(() =>
      withOwnedPieces(() =>
        repos.looks.create(userId, { ...input, name, nameProvisional: input.name === undefined }),
      ),
    );
    return toLook(userId, row);
  },
});
