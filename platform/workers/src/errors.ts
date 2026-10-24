import { createErrorReporter, createPostHogClient } from '@robes/analytics/server';
import { parseEnv, workerErrorEnv } from '@robes/config';

// Enabled only when POSTHOG_KEY is set; a malformed config fails the cold start.
const config = process.env.POSTHOG_KEY ? parseEnv(workerErrorEnv, process.env) : undefined;
const reporter = config
  ? createErrorReporter(createPostHogClient(config.key, config.host), config.environment)
  : null;

// Reports handler failures to PostHog error tracking, then rethrows so SQS retries/DLQ hold.
export function withErrorReporting<H extends (...args: never[]) => Promise<unknown>>(
  handler: H,
): H {
  if (!reporter) return handler;
  return (async (...args: Parameters<H>) => {
    try {
      return await handler(...args);
    } catch (err) {
      await reporter.capture(err, {
        source: 'worker',
        worker: process.env.AWS_LAMBDA_FUNCTION_NAME,
      });
      throw err;
    }
  }) as H;
}
