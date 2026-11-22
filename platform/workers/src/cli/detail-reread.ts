import { estimateDetailReread, runDetailReread } from '@robes/jobs';
import { workerContext } from '../context';

// `pnpm --filter @robes/workers detail:reread`: the one-off re-read of existing wardrobes for
// each piece's defining detail (cutout brief §8).
//
// With no flags it only counts and prices: how many pieces are due, what one read costs in the
// ledger, and the total against the ceiling. Nothing is read and nothing is written.
//
//   --run               read the photographs and file the details (after the owner's go-ahead)
//   --ceiling-usd=<n>   stop before spending more than this (default 25, the owner's ceiling)
//   --limit=<n>         stop after this many pieces (a first small batch to look at)
const flags = new Map(
  process.argv.slice(2).flatMap((a) => {
    const m = /^--(run|ceiling-usd|limit)(?:=(.+))?$/.exec(a);
    if (!m?.[1]) throw new Error(`unknown argument: ${a}`);
    return [[m[1], m[2] ?? ''] as const];
  }),
);
const ceilingUsd = flags.has('ceiling-usd') ? Number(flags.get('ceiling-usd')) : 25;
if (!Number.isFinite(ceilingUsd) || ceilingUsd <= 0) throw new Error('--ceiling-usd must be > 0');
const limit = flags.has('limit') ? Number(flags.get('limit')) : undefined;
if (limit !== undefined && (!Number.isInteger(limit) || limit <= 0)) {
  throw new Error('--limit must be a whole number above 0');
}
const ceilingMicros = Math.round(ceilingUsd * 1_000_000);
const usd = (micros: number) => `$${(micros / 1_000_000).toFixed(2)}`;

const ctx = await workerContext();
try {
  const deps = ctx.detailReread();
  const estimate = await estimateDetailReread(deps);
  ctx.logger.info(
    {
      ...estimate,
      estimate: usd(estimate.totalMicros),
      perPiece: `$${(estimate.perPieceMicros / 1_000_000).toFixed(4)}`,
      ceiling: usd(ceilingMicros),
      withinCeiling: estimate.totalMicros <= ceilingMicros,
    },
    'detail_reread_estimate',
  );
  if (flags.has('run')) {
    const result = await runDetailReread(deps, {
      ceilingMicros,
      expectedMicros: estimate.perPieceMicros,
      ...(limit ? { limit } : {}),
    });
    ctx.logger.info({ ...result, spent: usd(result.spentMicros) }, 'detail_reread_done');
  }
} finally {
  await ctx.close();
}
