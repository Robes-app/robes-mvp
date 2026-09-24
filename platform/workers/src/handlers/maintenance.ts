import { processAccountDeletions, sweep } from '@robes/jobs';
import { type WorkerContext, workerContext } from '../context';
import { withSentry } from '../sentry';
import { processBatch, type SqsBatchResponse, type SqsEvent } from '../sqs';

// Schedule names from infra SchedulesStack, delivered as `{ kind }`.
export const MAINTENANCE_TASKS = ['retention', 'job-sweeper', 'account-deletion'] as const;
export type MaintenanceTask = (typeof MAINTENANCE_TASKS)[number];

type Context = Pick<WorkerContext, 'system' | 'storage' | 'logger' | 'transport'>;

export async function runMaintenance(
  ctx: Context,
  tasks: readonly MaintenanceTask[],
): Promise<void> {
  for (const task of tasks) {
    if (task === 'retention') await ctx.system.maintenance.run();
    else if (task === 'job-sweeper') {
      await sweep({ jobs: ctx.system.jobs, transport: ctx.transport(), logger: ctx.logger });
    } else {
      // Without the bucket her files can't go, so her account mustn't either.
      if (!ctx.storage) throw new Error('account-deletion needs MEDIA_BUCKET');
      await processAccountDeletions({
        deletions: ctx.system.accountDeletion,
        storage: ctx.storage,
        logger: ctx.logger,
      });
    }
  }
}

function taskOf(body: string): MaintenanceTask | null {
  try {
    const { kind } = JSON.parse(body) as { kind?: unknown };
    return MAINTENANCE_TASKS.find((t) => t === kind) ?? null;
  } catch {
    return null;
  }
}

export function createMaintenanceHandler(getContext: () => Promise<Context>) {
  return async (event: SqsEvent): Promise<SqsBatchResponse> => {
    const ctx = await getContext();
    return processBatch(event, async (record) => {
      const task = taskOf(record.body);
      if (!task)
        return ctx.logger.warn({ messageId: record.messageId }, 'maintenance_unknown_task');
      await runMaintenance(ctx, [task]);
    });
  };
}

export const handler = withSentry(createMaintenanceHandler(workerContext));
