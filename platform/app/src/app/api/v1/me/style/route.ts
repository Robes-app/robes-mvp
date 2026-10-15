import { EmptyInput, StyleProfile } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { route } from '@/server/route';
import { toStyleProfile } from '@/server/style-profile';

export const GET = route({
  auth: 'user',
  input: EmptyInput,
  output: StyleProfile,
  handler: async ({ user }) =>
    toStyleProfile(await repos.styleProfile.get(verifiedUserId(user.id))),
});
