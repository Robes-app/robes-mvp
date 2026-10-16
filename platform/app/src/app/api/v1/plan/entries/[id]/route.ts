import { ApiError } from '@robes/api';
import {
  Deleted,
  EmptyInput,
  PlanEntry,
  PlanEntryParams,
  UpdatePlanEntryInput,
} from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { toEntries } from '@/server/plan';
import { route } from '@/server/route';

export const PATCH = route({
  auth: 'user',
  input: UpdatePlanEntryInput,
  params: PlanEntryParams,
  output: PlanEntry,
  rateLimit: { key: 'plan.update', limit: 120, windowSeconds: 60 },
  handler: async ({ user, input, params }) => {
    const userId = verifiedUserId(user.id);
    const row = await repos.plan.update(userId, params.id, input);
    const [entry] = row ? await toEntries(userId, [row]) : [];
    if (!entry) throw new ApiError('not_found');
    return entry;
  },
});

// Unpin; the client offers Undo via /restore (UX-15).
export const DELETE = route({
  auth: 'user',
  input: EmptyInput,
  params: PlanEntryParams,
  output: Deleted,
  rateLimit: { key: 'plan.unpin', limit: 120, windowSeconds: 60 },
  handler: async ({ user, params }) => {
    if (!(await repos.plan.remove(verifiedUserId(user.id), params.id))) {
      throw new ApiError('not_found');
    }
    return { ok: true as const };
  },
});
