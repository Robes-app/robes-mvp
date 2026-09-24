import type { SqsBatchResponse, SqsEvent } from '../sqs';

// Placeholder until its milestone lands; acknowledges every message.
export const handler = async (_event: SqsEvent): Promise<SqsBatchResponse> => ({
  batchItemFailures: [],
});
