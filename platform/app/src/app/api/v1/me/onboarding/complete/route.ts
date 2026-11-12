import { ApiError } from '@robes/api';
import { CompleteOnboardingInput, OnboardingComplete } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { after } from 'next/server';
import { serverAnalytics } from '@/server/analytics';
import { repos } from '@/server/db';
import { logger } from '@/server/logger';
import { ensureRobesModels } from '@/server/model';
import { onboardingAnswers } from '@/server/onboarding';
import { route } from '@/server/route';

export const POST = route({
  auth: 'user',
  input: CompleteOnboardingInput,
  output: OnboardingComplete,
  rateLimit: { key: 'me.onboarding', limit: 10, windowSeconds: 60 },
  // Her answers ride the finish (all optional: an older phone build sends none).
  handler: async ({ user, input }) => {
    const userId = verifiedUserId(user.id);
    const at = await repos.profiles.completeOnboarding(userId, onboardingAnswers(input));
    if (!at) throw new ApiError('not_found');
    // Her wearer's five Robes models, drawn once ever if nobody has yet: a man's have no seeds
    // (runbooks/robes-models.md), so without this his lineup stays empty until his first look.
    after(() => ensureRobesModels(userId).catch(() => logger.warn('robes_models_not_started')));
    after(() =>
      serverAnalytics
        .capture(user.id, 'onboarding_completed')
        .catch(() => logger.warn('analytics_capture_failed')),
    );
    return { onboardedAt: at.toISOString() };
  },
});
