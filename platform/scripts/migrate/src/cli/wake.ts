import { wake } from '../transform';
import { cliTarget, print } from './args';

// pnpm migrate:wake — once the old app has stopped emailing, the accounts that arrived quiet take
// their own email choices from beta (docs/migration.md §4a). Run extract first.
print({ woken: await wake(cliTarget()) });
