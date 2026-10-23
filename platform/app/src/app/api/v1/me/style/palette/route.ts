import { Palette, StyleProfile } from '@robes/contracts';
import { cleanPalette } from '@robes/core/colour';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { route } from '@/server/route';
import { toStyleProfile } from '@/server/style-profile';

// Your colours and Your prints: love is weighted up, avoid is soft (legacy a61f211).
export const PUT = route({
  auth: 'user',
  input: Palette,
  output: StyleProfile,
  rateLimit: { key: 'me.style.palette', limit: 60, windowSeconds: 60 },
  handler: async ({ user, input }) => {
    const row = await repos.styleProfile.setPalette(verifiedUserId(user.id), cleanPalette(input));
    return toStyleProfile(row);
  },
});
