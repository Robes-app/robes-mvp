import 'server-only';
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
