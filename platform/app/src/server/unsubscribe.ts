import 'server-only';
import { ApiError } from '@robes/api';
import { verifiedUserId } from '@robes/db';
import { type UnsubPref, verifyUnsub } from '@robes/emails';
import { repos } from './db';
import { env } from './env';

// The signed token is the proof: it names one person and one preference (packages/emails).
export function readUnsubToken(token: string): { userId: string; pref: UnsubPref } | null {
  return verifyUnsub(env.UNSUB_HMAC_KEY, token);
}

export async function unsubscribe(token: string): Promise<UnsubPref> {
  const target = readUnsubToken(token);
  if (!target) throw new ApiError('not_found');
  await repos.profiles.mergeNotificationPrefs(verifiedUserId(target.userId), {
    [target.pref]: false,
  });
  return target.pref;
}
