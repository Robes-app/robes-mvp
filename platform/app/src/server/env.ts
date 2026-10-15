import 'server-only';
import { SQSClient } from '@aws-sdk/client-sqs';
import { appServerEnv, parseEnv } from '@robes/config';

export const env = parseEnv(appServerEnv, process.env);

// SQS with the API user's keys when deployed (env.aws); the default chain otherwise.
export function sqsClient(): SQSClient {
  return new SQSClient(env.aws ? { region: env.aws.region, credentials: env.aws.credentials } : {});
}
