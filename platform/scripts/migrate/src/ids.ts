import { createHash } from 'node:crypto';

// Name-based (RFC 9562 v3: md5) ids for rows legacy had no uuid for, so re-runs and TS/SQL agree.
// The version and variant bits matter: the contracts' z.uuid() rejects bare md5 hex.
// Mirrors pg_temp.legacy_uuid in sql.ts.
export function legacyUuid(kind: string, owner: string, key: string): string {
  const h = createHash('md5').update(`robes-legacy:${kind}:${owner}:${key}`).digest('hex');
  const variant = ((Number.parseInt(h[16] ?? '0', 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-3${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20)}`;
}
