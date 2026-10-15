import { ApiError } from '@robes/api';
import {
  Look,
  LookParams,
  LookRole,
  Proposal,
  SeasonBand,
  Styling,
  UpdateLookInput,
} from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { toLook, withOwnedPieces } from '@/server/looks-entity';
import { route } from '@/server/route';

const Proposals = Proposal.array().catch([]);

// "Save as new" (UX-28): a copy of the look with her edits applied, linked to its origin.
export const POST = route({
  auth: 'user',
  input: UpdateLookInput,
  params: LookParams,
  output: Look,
  status: 201,
  rateLimit: { key: 'looks.variant', limit: 60, windowSeconds: 60 },
  handler: async ({ user, input, params }) => {
    const userId = verifiedUserId(user.id);
    const origin = await repos.looks.get(userId, params.id);
    if (!origin || origin.status !== 'saved') throw new ApiError('not_found');
    const pieces =
      input.pieces ??
      (await repos.looks.piecesFor(userId, [origin.id])).map((p) => ({
        pieceId: p.id,
        slot: p.slot,
        role: LookRole.nullable().parse(p.role),
      }));
    const row = await withOwnedPieces(() =>
      repos.looks.create(userId, {
        name: input.name ?? origin.name,
        nameProvisional: input.name === undefined && origin.nameProvisional,
        note: input.note !== undefined ? input.note : origin.note,
        climateBand: input.climateBand ?? SeasonBand.parse(origin.climateBand),
        pieces,
        source: 'variant',
        originLookId: origin.id,
        proposals: input.proposals ?? Proposals.parse(origin.proposals ?? []),
        styling: input.styling ?? Styling.catch({}).parse(origin.styling ?? {}),
      }),
    );
    return toLook(userId, row);
  },
});
