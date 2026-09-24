import { parseJobMessage } from '@robes/jobs';
import { type WorkerContext, workerContext } from '../context';
import { withSentry } from '../sentry';
import { processBatch, type SqsBatchResponse, type SqsEvent } from '../sqs';

export function createGenerateHandler(
  getContext: () => Promise<Pick<WorkerContext, 'run' | 'logger'>>,
) {
  return async (event: SqsEvent): Promise<SqsBatchResponse> => {
    const ctx = await getContext();
    return processBatch(event, async (record) => {
      const message = parseJobMessage(record.body);
      // Retrying can't fix a malformed message, so drop it rather than feed the DLQ.
      if (!message) return ctx.logger.warn({ messageId: record.messageId }, 'job_message_invalid');
      await ctx.run(message.jobId);
    });
  };
}

export const handler = withSentry(createGenerateHandler(workerContext));
