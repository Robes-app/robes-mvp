import { setTimeout as sleep } from 'node:timers/promises';
import { jobs as copy } from '@robes/copy';
import { JobCancelled, type JobContext, type JobHandler } from '../runtime';

// Platform smoke test and the M4 staged UI: text after ~0.5 s, three placeholder images by ~1.5 s.
export function createFakeHandler(opts: { stepMs?: number } = {}): JobHandler {
  const textDelay = opts.stepMs ?? 500;
  const imageDelay = Math.round((textDelay * 2) / 3);

  async function wait(ctx: JobContext, ms: number): Promise<void> {
    await sleep(ms, undefined, { signal: ctx.signal });
    if (await ctx.isCancelled()) throw new JobCancelled();
  }

  return {
    budgetMs: 30_000,
    async run(ctx) {
      await wait(ctx, textDelay);
      await ctx.writeStage('text', {
        text: { title: copy.fake.title, lines: [...copy.fake.lines] },
      });
      const images: { idx: number; status: 'placeholder' }[] = [];
      for (let idx = 0; idx < 3; idx += 1) {
        await wait(ctx, imageDelay);
        images.push({ idx, status: 'placeholder' });
        await ctx.writeStage('images', { images });
      }
      return { status: 'succeeded' };
    },
  };
}
