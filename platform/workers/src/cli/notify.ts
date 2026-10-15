import { notifyTick } from '@robes/jobs';
import { workerContext } from '../context';

// `pnpm notify`: one notify tick against the local DB, mailing Mailpit. Set APP_URL (the web app,
// e.g. http://localhost:3300) and UNSUB_HMAC_KEY in app/.env.local.
const ctx = await workerContext();
try {
  await notifyTick(await ctx.notify());
} finally {
  await ctx.close();
}
