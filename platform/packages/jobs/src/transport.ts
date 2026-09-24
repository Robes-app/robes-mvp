import { SendMessageCommand, type SQSClient } from '@aws-sdk/client-sqs';
import type { JobLogger } from './logger';
import type { JobMessage } from './message';

export interface JobTransport {
  send(message: JobMessage): Promise<void>;
}

// Dev/test: `schedule` defers the run past the response (Next's `after()` at the call site).
export function createInlineTransport(opts: {
  run(jobId: string): Promise<unknown>;
  schedule(task: () => Promise<void>): void;
  logger: JobLogger;
}): JobTransport {
  return {
    async send({ jobId }) {
      opts.schedule(async () => {
        try {
          await opts.run(jobId);
        } catch (err) {
          opts.logger.error({ jobId, err: errorName(err) }, 'job_inline_run_failed');
        }
      });
    },
  };
}

export function createSqsTransport(opts: {
  client: Pick<SQSClient, 'send'>;
  queueUrl: string;
}): JobTransport {
  return {
    async send({ jobId, traceparent }) {
      await opts.client.send(
        new SendMessageCommand({
          QueueUrl: opts.queueUrl,
          MessageBody: JSON.stringify({ jobId }),
          ...(traceparent
            ? {
                MessageAttributes: {
                  traceparent: { DataType: 'String', StringValue: traceparent },
                },
              }
            : {}),
        }),
      );
    },
  };
}

export function errorName(err: unknown): string {
  return err instanceof Error ? err.name : typeof err;
}
