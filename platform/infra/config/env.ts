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
