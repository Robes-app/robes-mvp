// Placeholder until Task 8 (media) lands; S3 events carry no batch items to fail.
export const handler = async (_event: unknown): Promise<{ batchItemFailures: [] }> => ({
  batchItemFailures: [],
});
