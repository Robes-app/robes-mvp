import { parseJobMessage, parseLinkResultMessage } from '@robes/jobs';
import { type WorkerContext, workerContext } from '../context';
import { withErrorReporting } from '../errors';
import { processBatch, type SqsBatchResponse, type SqsEvent } from '../sqs';

export function createGenerateHandler(
  getContext: () => Promise<Pick<WorkerContext, 'run' | 'logger' | 'system'>>,
) {
  return async (event: SqsEvent): Promise<SqsBatchResponse> => {
    const ctx = await getContext();
    return processBatch(event, async (record) => {
      // The isolated fetcher's reply (SEC-40): attach its validated result, then run the job.
      const linkResult = parseLinkResultMessage(record.body);
      if (linkResult) {
        if (!(await ctx.system.jobs.attachFetched(linkResult.jobId, linkResult.linkResult))) {
          return ctx.logger.warn({ jobId: linkResult.jobId }, 'link_result_unmatched');
        }
        await ctx.run(linkResult.jobId);
        return;
      }
      const message = parseJobMessage(record.body);
      // Retrying can't fix a malformed message, so drop it rather than feed the DLQ.
      if (!message) return ctx.logger.warn({ messageId: record.messageId }, 'job_message_invalid');
      await ctx.run(message.jobId);
    });
  };
}

export const handler = withErrorReporting(createGenerateHandler(workerContext));
