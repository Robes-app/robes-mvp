import { transform } from '../transform';
import { cliTarget, print } from './args';

// pnpm migrate:transform — legacy.* → app.* in the target; re-running inserts nothing new.
print(await transform(cliTarget()));
