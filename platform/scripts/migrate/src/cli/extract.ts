import { legacyUrl, targetUrl } from '../db';
import { extract } from '../extract';
import { print } from './args';

// pnpm migrate:extract — LEGACY_DATABASE_URL (default: the local fixture) → target legacy schema.
print(await extract(legacyUrl(), targetUrl()));
