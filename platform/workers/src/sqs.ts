// The slice of the Lambda SQS event shapes the workers use (reportBatchItemFailures is on).
export interface SqsRecord {
  messageId: string;
  body: string;
}

export interface SqsEvent {
  Records: SqsRecord[];
}

export interface SqsBatchResponse {
  batchItemFailures: { itemIdentifier: string }[];
}

// Failed records are retried by SQS (then DLQ); the rest are deleted.
export async function processBatch(
  event: SqsEvent,
  fn: (record: SqsRecord) => Promise<void>,
): Promise<SqsBatchResponse> {
  const settled = await Promise.allSettled(event.Records.map((record) => fn(record)));
  return {
    batchItemFailures: event.Records.flatMap((record, i) =>
      settled[i]?.status === 'rejected' ? [{ itemIdentifier: record.messageId }] : [],
    ),
  };
}
