import { transform } from '../transform';
import { cliTarget, flag, print } from './args';

// pnpm migrate:transform — legacy.* → app.* in the target; re-running inserts nothing new.
// `--quiet-arrival`: the accounts this run creates start with every notification off (§4a).
print(await transform(cliTarget(), { quietArrival: flag('quiet-arrival') !== undefined }));
