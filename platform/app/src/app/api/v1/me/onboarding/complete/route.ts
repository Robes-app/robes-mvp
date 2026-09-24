import { ApiError } from '@robes/api';
import { EmptyInput, OnboardingComplete } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { route } from '@/server/route';

export const POST = route({
  auth: 'user',
  input: EmptyInput,
  output: OnboardingComplete,
  rateLimit: { key: 'me.onboarding', limit: 10, windowSeconds: 60 },
  handler: async ({ user }) => {
    const at = await repos.profiles.completeOnboarding(verifiedUserId(user.id));
    if (!at) throw new ApiError('not_found');
    return { onboardedAt: at.toISOString() };
  },
});
