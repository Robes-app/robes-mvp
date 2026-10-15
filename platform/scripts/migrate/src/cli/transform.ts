import { targetUrl } from '../db';
import { transform } from '../transform';
import { print } from './args';

// pnpm migrate:transform — legacy.* → app.* in the target; re-running inserts nothing new.
print(await transform(targetUrl()));
