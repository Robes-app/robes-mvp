import 'server-only';
import type { Features } from '@robes/contracts';
import type { FeatureFlag } from '@robes/core';
import { repos } from './db';

const TTL_MS = 30_000;
// Flag values only (no user data), so a short per-instance cache is allowed (SEC-33).
const cache = new Map<string, { value: boolean; at: number }>();

export async function isFlagEnabled(key: string): Promise<boolean> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  const value = await repos.flags.isEnabled(key as FeatureFlag);
  cache.set(key, { value, at: Date.now() });
  return value;
}

// After an admin toggle, so this instance doesn't serve the old value for the rest of the TTL.
export function invalidateFlag(key: string): void {
  cache.delete(key);
}

// What GET /me/features answers; server pages read it directly.
export async function clientFeatures(): Promise<Features> {
  return { trips: await isFlagEnabled('trips') };
}
