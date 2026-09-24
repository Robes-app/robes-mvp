import { ingestReceipt, SesNotification } from '@robes/jobs';
import { type WorkerContext, workerContext } from '../context';
import { withSentry } from '../sentry';
import { processBatch, type SqsBatchResponse, type SqsEvent } from '../sqs';

type Context = Pick<WorkerContext, 'inbound' | 'logger'>;

// SES receipt notifications (S3 action → SNS → SQS, raw delivery): one forwarded mail each.
// Anything that isn't a valid notification is acknowledged and logged, never retried.
export function createInboundHandler(getContext: () => Promise<Context>) {
  return async (event: SqsEvent): Promise<SqsBatchResponse> => {
    const ctx = await getContext();
    return processBatch(event, async (record) => {
      let body: unknown;
      try {
        body = JSON.parse(record.body);
      } catch {
        body = null;
      }
      const parsed = SesNotification.safeParse(body);
      if (!parsed.success) {
        return ctx.logger.warn({ messageId: record.messageId }, 'inbound_message_invalid');
      }
      await ingestReceipt(await ctx.inbound(), parsed.data);
    });
  };
}

export const handler = withSentry(createInboundHandler(workerContext));
