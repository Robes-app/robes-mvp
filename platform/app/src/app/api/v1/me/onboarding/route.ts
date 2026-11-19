import { ApiError } from '@robes/api';
import { Ok, SaveOnboardingInput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { after } from 'next/server';
import { repos } from '@/server/db';
import { logger } from '@/server/logger';
import { ensureRobesModels } from '@/server/model';
import { firstRunProgress } from '@/server/onboarding';
import { route } from '@/server/route';

export const PATCH = route({
  auth: 'user',
  input: SaveOnboardingInput,
  output: Ok,
  rateLimit: { key: 'me.onboarding.save', limit: 60, windowSeconds: 60 },
  // The eight-step flow as she goes (onboarding PRD R-4.2, R-S3): her step, and on Brands her
  // answers. She is onboarded only on the finish (me.onboarding.complete with `firstRun`).
  handler: async ({ user, input }) => {
    const userId = verifiedUserId(user.id);
    const saved = await repos.profiles.saveFirstRun(userId, firstRunProgress(input));
    if (!saved) throw new ApiError('not_found');
    // Her identity is known: her wearer's five Robes models are drawn now (once ever), so the
    // twin step's lineup has them by the time she reaches it.
    if (input.identity !== undefined)
      after(() => ensureRobesModels(userId).catch(() => logger.warn('robes_models_not_started')));
    return { ok: true as const };
  },
});
