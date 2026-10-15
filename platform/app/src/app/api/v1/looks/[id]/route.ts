import { ApiError } from '@robes/api';
import { Deleted, EmptyInput, Look, LookParams, UpdateLookInput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { draftsFull } from '@/server/look-states';
import { toLook, withOwnedPieces } from '@/server/looks-entity';
import { route } from '@/server/route';

export const GET = route({
  auth: 'user',
  input: EmptyInput,
  params: LookParams,
  output: Look,
  handler: async ({ user, params }) => {
    const userId = verifiedUserId(user.id);
    return toLook(userId, await repos.looks.get(userId, params.id));
  },
});

export const PATCH = route({
  auth: 'user',
  input: UpdateLookInput,
  params: LookParams,
  output: Look,
  rateLimit: { key: 'looks.update', limit: 120, windowSeconds: 60 },
  handler: async ({ user, input, params }) => {
    const userId = verifiedUserId(user.id);
    // Editing a suggestion makes it a draft, within the five (409 drafts_full, then letGoOldest).
    const row = await draftsFull(() =>
      withOwnedPieces(() => repos.looks.update(userId, params.id, input)),
    );
    return toLook(userId, row);
  },
});

// Soft delete; the client offers Undo via /restore (UX-15).
export const DELETE = route({
  auth: 'user',
  input: EmptyInput,
  params: LookParams,
  output: Deleted,
  rateLimit: { key: 'looks.delete', limit: 120, windowSeconds: 60 },
  handler: async ({ user, params }) => {
    if (!(await repos.looks.remove(verifiedUserId(user.id), params.id))) {
      throw new ApiError('not_found');
    }
    return { ok: true as const };
  },
});
