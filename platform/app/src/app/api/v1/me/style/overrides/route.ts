import { StyleOverrides, StyleProfile } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { route } from '@/server/route';
import { toStyleProfile } from '@/server/style-profile';

// Her corrections outrank the photo read in every prompt (legacy user_overrides).
export const PATCH = route({
  auth: 'user',
  input: StyleOverrides,
  output: StyleProfile,
  rateLimit: { key: 'me.style.overrides', limit: 60, windowSeconds: 60 },
  handler: async ({ user, input }) => {
    const row = await repos.styleProfile.setOverrides(verifiedUserId(user.id), {
      ...(input.lovedColors ? { loved_colors: input.lovedColors } : {}),
      ...(input.rejectedColors ? { rejected_colors: input.rejectedColors } : {}),
      ...(input.measurements ? { measurements: input.measurements } : {}),
    });
    return toStyleProfile(row);
  },
});
