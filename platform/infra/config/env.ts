import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function fromEnv(name: string): string | undefined {
  const value = process.env[name];
  return value === undefined || value === '' ? undefined : value;
}

export function publicKeyFor(stage: string): string | undefined {
  const inline = fromEnv(`ROBES_${stage.toUpperCase()}_CF_PUBLIC_KEY`);
  if (inline) return inline;
  const file = fileURLToPath(new URL(`./keys/${stage}.cloudfront.pub.pem`, import.meta.url));
  return existsSync(file) ? readFileSync(file, 'utf8') : undefined;
}

// S3 names are global across all AWS customers; suffixing the account id keeps two stages (or two
// accounts) from colliding. Without an account (offline synth/tests) the plain name is used.
export function mediaBucketName(namePrefix: string, account: string | undefined): string {
  return account ? `${namePrefix}-media-${account}` : `${namePrefix}-media`;
}

// Reserved concurrency needs headroom: AWS keeps ≥10 unreserved, so new accounts (limit 10)
// can't reserve any. `0` disables the reservation.
export function reservedConcurrency(stage: string, fallback: number): number | undefined {
  const raw = fromEnv(`ROBES_${stage.toUpperCase()}_GENERATE_RESERVED_CONCURRENCY`);
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isInteger(value) || value < 0)
    throw new Error(`invalid reserved concurrency: ${raw}`);
  return value === 0 ? undefined : value;
}
