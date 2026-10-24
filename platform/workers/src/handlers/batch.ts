import { overnightTick, pollOvernight } from '@robes/jobs';
import { type WorkerContext, workerContext } from '../context';
import { withErrorReporting } from '../errors';
import { processBatch, type SqsBatchResponse, type SqsEvent } from '../sqs';

// Schedule names from infra SchedulesStack (jobs-batch queue), delivered as `{ kind }`.
export const BATCH_TASKS = ['daily-look-batch', 'batch-poll'] as const;
export type BatchTask = (typeof BATCH_TASKS)[number];

type Context = Pick<WorkerContext, 'overnight' | 'logger'>;

function taskOf(body: string): BatchTask | null {
  try {
    const { kind } = JSON.parse(body) as { kind?: unknown };
    return BATCH_TASKS.find((t) => t === kind) ?? null;
  } catch {
    return null;
  }
}

export async function runBatchTask(ctx: Context, task: BatchTask, now = new Date()) {
  const deps = await ctx.overnight();
  return task === 'daily-look-batch' ? overnightTick(deps, now) : pollOvernight(deps);
}

export function createBatchHandler(getContext: () => Promise<Context>) {
  return async (event: SqsEvent): Promise<SqsBatchResponse> => {
    const ctx = await getContext();
    return processBatch(event, async (record) => {
      const task = taskOf(record.body);
      if (!task) return ctx.logger.warn({ messageId: record.messageId }, 'batch_unknown_task');
      await runBatchTask(ctx, task);
    });
  };
}

export const handler = withErrorReporting(createBatchHandler(workerContext));
