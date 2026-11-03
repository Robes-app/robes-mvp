import { ApiError } from '@robes/api';
import { EmptyInput, Me, NotificationPrefs, UpdateMeInput } from '@robes/contracts';
import { verifiedUserId } from '@robes/db';
import { repos } from '@/server/db';
import { route } from '@/server/route';

async function loadMe(id: string) {
  const profile = await repos.profiles.get(verifiedUserId(id));
  if (!profile) throw new ApiError('not_found');
  return {
    id: profile.id,
    email: profile.email,
    firstName: profile.firstName,
    lastName: profile.lastName,
    instagramHandle: profile.instagramHandle,
    locale: profile.locale,
    timezone: profile.timezone,
    currency: profile.currency,
    homeCity: profile.homeCity,
    onboarded: profile.onboardedAt !== null,
    notifications: NotificationPrefs.parse(profile.notificationPrefs ?? {}),
  };
}

export const GET = route({
  auth: 'user',
  input: EmptyInput,
  output: Me,
  handler: ({ user }) => loadMe(user.id),
});

export const PATCH = route({
  auth: 'user',
  input: UpdateMeInput,
  output: Me,
  rateLimit: { key: 'me.update', limit: 30, windowSeconds: 60 },
  handler: async ({ user, input }) => {
    const userId = verifiedUserId(user.id);
    const { notifications, ...fields } = input;
    // A city she types replaces a device location: its coordinates would forecast the old place.
    const before = fields.homeCity === undefined ? null : await repos.profiles.get(userId);
    const moved = before !== null && (before?.homeCity ?? '') !== fields.homeCity;
    await repos.profiles.update(
      userId,
      moved ? { ...fields, homeLat: null, homeLon: null } : fields,
    );
    if (notifications) await repos.profiles.mergeNotificationPrefs(userId, notifications);
    return loadMe(user.id);
  },
});
