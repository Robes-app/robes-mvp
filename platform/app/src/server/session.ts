import 'server-only';
import { sessionUser } from '@robes/auth';
import type { Consents } from '@robes/contracts';
import { type UserId, verifiedUserId } from '@robes/db';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';
import { auth } from './auth';
import { clientIpFrom } from './client-ip';
import { getConsents } from './consents';
import { repos } from './db';

// One session lookup per request, shared by the root layout and the page.
const currentUserId = cache(async (): Promise<UserId | null> => {
  const user = await sessionUser(auth, await headers());
  return user ? verifiedUserId(user.id) : null;
});

// For server components: the signed-in user's profile, or null.
export async function currentProfile() {
  const id = await currentUserId();
  if (!id) return null;
  const profile = await repos.profiles.get(id);
  return profile ? { ...profile, userId: id } : null;
}

export async function requireProfile() {
  const profile = await currentProfile();
  if (!profile) redirect('/auth/sign-in');
  return profile;
}

// The signed-in user's consent answers, for the analytics provider and the banner.
export async function currentConsents(): Promise<{ userId: UserId; consents: Consents } | null> {
  const userId = await currentUserId();
  if (!userId) return null;
  return { userId, consents: await getConsents(repos, userId) };
}

// Signed-in pages inside the shell: onboarding comes first.
export async function requireOnboardedProfile() {
  const profile = await requireProfile();
  if (!profile.onboardedAt) redirect('/onboarding');
  return profile;
}

export function displayName(profile: { firstName: string | null; email: string }): string {
  return profile.firstName ?? profile.email;
}

// Admin pages: anyone who isn't an admin gets a plain 404, so the area isn't discoverable.
export const requireAdmin = cache(async (): Promise<{ admin: UserId; ip: string }> => {
  const id = await currentUserId();
  if (!id || !(await repos.admin.isAdmin(id))) notFound();
  return { admin: id, ip: clientIpFrom(await headers()) };
});
