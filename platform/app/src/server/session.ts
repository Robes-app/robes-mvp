import 'server-only';
import { sessionUser } from '@robes/auth';
import { type UserId, verifiedUserId } from '@robes/db';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from './auth';
import { repos } from './db';

// For server components: the signed-in user's profile, or null.
export async function currentProfile() {
  const user = await sessionUser(auth, await headers());
  if (!user) return null;
  const id: UserId = verifiedUserId(user.id);
  const profile = await repos.profiles.get(id);
  return profile ? { ...profile, userId: id } : null;
}

export async function requireProfile() {
  const profile = await currentProfile();
  if (!profile) redirect('/auth/sign-in');
  return profile;
}
