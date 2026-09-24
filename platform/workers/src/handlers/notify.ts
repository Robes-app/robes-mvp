import { notifyTick } from '@robes/jobs';
import { type WorkerContext, workerContext } from '../context';
import { withSentry } from '../sentry';
import { processBatch, type SqsBatchResponse, type SqsEvent } from '../sqs';

// Schedule names from infra SchedulesStack (`notify-tick`, every 10 min), delivered as `{ kind }`.
export const NOTIFY_TASKS = ['notify-tick'] as const;

type Context = Pick<WorkerContext, 'notify' | 'logger'>;

function taskOf(body: string): (typeof NOTIFY_TASKS)[number] | null {
  try {
    const { kind } = JSON.parse(body) as { kind?: unknown };
    return NOTIFY_TASKS.find((t) => t === kind) ?? null;
  } catch {
    return null;
  }
}

export function createNotifyHandler(getContext: () => Promise<Context>) {
  return async (event: SqsEvent): Promise<SqsBatchResponse> => {
    const ctx = await getContext();
    return processBatch(event, async (record) => {
      if (!taskOf(record.body)) {
        return ctx.logger.warn({ messageId: record.messageId }, 'notify_unknown_task');
      }
      await notifyTick(await ctx.notify());
    });
  };
}

export const handler = withSentry(createNotifyHandler(workerContext));
