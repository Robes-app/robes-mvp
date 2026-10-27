import { announceTarget, targetUrl } from '../db';

// `--name=value` flags for the rehearsal CLIs.
export function flag(name: string): string | undefined {
  const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return undefined;
  return hit.includes('=') ? hit.slice(hit.indexOf('=') + 1) : 'true';
}

export function print(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

// The target every CLI writes or reads, guarded (db.ts targetUrl) and named on stderr first.
export function cliTarget(): string {
  const url = targetUrl();
  announceTarget(url);
  return url;
}
