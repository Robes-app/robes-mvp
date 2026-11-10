import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import {
  fetchLink,
  fetchPhoto,
  type LinkFetchResult,
  type PhotoFetchResult,
  parseFetchRequest,
} from '@robes/jobs';
import { createLogger } from '@robes/logger';
import { withErrorReporting } from '../errors';
import { processBatch, type SqsBatchResponse, type SqsEvent } from '../sqs';

// SEC-40 isolated fetcher: no DB, no secrets, no bucket. It fetches the URL with the SSRF guard
// and hands back only parsed product metadata (a link) or a receipt photo's bytes, undecoded,
// through the jobs-interactive queue.
export type FetchReply =
  | { jobId: string; linkResult: LinkFetchResult }
  | { jobId: string; photoResult: PhotoFetchResult };

export interface FetchDeps {
  fetchLink(url: string): Promise<LinkFetchResult>;
  fetchPhoto(url: string): Promise<PhotoFetchResult>;
  sendResult(message: FetchReply): Promise<void>;
  logger: { warn(obj: Record<string, unknown>, msg: string): void };
}

export function createFetchHandler(getDeps: () => FetchDeps) {
  return async (event: SqsEvent): Promise<SqsBatchResponse> => {
    const deps = getDeps();
    return processBatch(event, async (record) => {
      const request = parseFetchRequest(record.body);
      if (!request)
        return deps.logger.warn({ messageId: record.messageId }, 'fetch_message_invalid');
      if (request.kind === 'photo') {
        const photoResult = await deps.fetchPhoto(request.url);
        return deps.sendResult({ jobId: request.jobId, photoResult });
      }
      const linkResult = await deps.fetchLink(request.url);
      await deps.sendResult({ jobId: request.jobId, linkResult });
    });
  };
}

let deps: FetchDeps | undefined;
function lambdaDeps(): FetchDeps {
  if (deps) return deps;
  const queueUrl = process.env.JOBS_INTERACTIVE_QUEUE_URL;
  if (!queueUrl) throw new Error('JOBS_INTERACTIVE_QUEUE_URL is required');
  const sqs = new SQSClient({});
  deps = {
    fetchLink: (url) => fetchLink(url),
    fetchPhoto: (url) => fetchPhoto(url),
    async sendResult(message) {
      await sqs.send(
        new SendMessageCommand({ QueueUrl: queueUrl, MessageBody: JSON.stringify(message) }),
      );
    },
    logger: createLogger({ service: 'robes-fetch' }),
  };
  return deps;
}

export const handler = withErrorReporting(createFetchHandler(lambdaDeps));
