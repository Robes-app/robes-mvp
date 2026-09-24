import 'server-only';
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { ApiError } from '@robes/api';
import type { ImportLinkInput, StartJobOutput } from '@robes/contracts';
import type { UserId } from '@robes/db';
import type { JobTransport } from '@robes/jobs';
import { env } from './env';
import { defaultTransport, startJob } from './jobs';

const sqs = env.FETCH_QUEUE_URL ? new SQSClient({}) : null;

// Deployed, the job's first stop is the isolated fetcher (SEC-40): its message carries the URL
// because the fetcher has no DB. In dev the job runs inline and fetches with the same guard.
function fetcherTransport(url: string): JobTransport {
  if (env.FETCH_QUEUE_URL && sqs) {
    const queueUrl = env.FETCH_QUEUE_URL;
    return {
      async send({ jobId }) {
        await sqs.send(
          new SendMessageCommand({
            QueueUrl: queueUrl,
            MessageBody: JSON.stringify({ jobId, url }),
          }),
        );
      },
    };
  }
  // The API holds credentials, so it never fetches user URLs outside dev.
  if (env.APP_ENV !== 'dev') throw new ApiError('disabled');
  return defaultTransport;
}

export function startLinkImport(
  userId: UserId,
  req: Request,
  input: ImportLinkInput,
): Promise<StartJobOutput> {
  return startJob(
    userId,
    req,
    {
      kind: 'link_import',
      input: { url: input.url, as: input.as },
      quota: { metric: 'inbox.receipt', cost: 1 },
    },
    fetcherTransport(input.url),
  );
}
