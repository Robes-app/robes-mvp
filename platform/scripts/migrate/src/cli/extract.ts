import { legacyUrl } from '../db';
import { extract } from '../extract';
import { cliTarget, flag, print } from './args';

// pnpm migrate:extract — LEGACY_DATABASE_URL (default: the local fixture) → target legacy schema.
// `--only=a@x.com,b@y.com` copies those people and nobody else.
const only = flag('only');
print(await extract(legacyUrl(), cliTarget(), only ? { only: only.split(',') } : {}));
