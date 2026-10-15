import { overnightTick, pollOvernight } from '@robes/jobs';
import { processUpload } from '@robes/media/process';
import { setLocalRenditions, workerContext } from '../context';

// `pnpm batch:tick [--now=<ISO>] [--user=<id>]`: one overnight selection + submit, then a poll —
// locally the fake batch answers at once, so the Today look appears in one run.
const args = Object.fromEntries(
  process.argv.slice(2).flatMap((a) => {
    const m = /^--(now|user)=(.+)$/.exec(a);
    return m ? [[m[1], m[2]]] : [];
  }),
) as { now?: string; user?: string };
const now = args.now ? new Date(args.now) : new Date();
if (Number.isNaN(now.getTime())) throw new Error('--now must be an ISO date-time');

setLocalRenditions((deps) => async (key) => {
  await processUpload(deps, key);
});
const ctx = await workerContext();
try {
  const deps = await ctx.overnight();
  const tick = await overnightTick(deps, now, args.user ? { userIds: [args.user] } : {});
  const poll = await pollOvernight(deps);
  ctx.logger.info({ ...tick, ...poll }, 'batch_tick_done');
} finally {
  await ctx.close();
}
