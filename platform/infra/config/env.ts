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

// SES allows one active receipt rule set per account and region, and in 259887029472 (eu-west-1)
// it is Pluck's. Both stages add their rule to it; a rule in an inactive set receives nothing.
export const SHARED_RECEIPT_RULE_SET = 'pluck-inbound';

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

// Budgets can only be created in a payer (or standalone) account, not an Organizations member.
export function budgetsEnabled(stage: string): boolean {
  const raw = fromEnv(`ROBES_${stage.toUpperCase()}_BUDGETS`);
  if (raw === undefined || raw === 'on') return true;
  if (raw === 'off') return false;
  throw new Error(`invalid budgets flag: ${raw} (on|off)`);
}
