import { Duration } from 'aws-cdk-lib';

export const QUEUE_NAMES = [
  'jobs-interactive',
  'jobs-batch',
  'fetch',
  'notify',
  'maintenance',
] as const;
export type QueueName = (typeof QUEUE_NAMES)[number];

export type QueueWorkerName = 'generate' | 'batch' | 'fetch' | 'notify' | 'maintenance';
export type WorkerName = QueueWorkerName | 'rendition';

export interface WorkerSpec {
  timeout: Duration;
  memorySize: number;
}

export interface QueueWorkerSpec extends WorkerSpec {
  queue: QueueName;
  batchSize: number;
}

// Single source for timeouts so queue visibility (6x) can never drift from its consumer.
export const QUEUE_WORKERS: Record<QueueWorkerName, QueueWorkerSpec> = {
  generate: {
    queue: 'jobs-interactive',
    timeout: Duration.minutes(5),
    memorySize: 1024,
    batchSize: 1,
  },
  batch: { queue: 'jobs-batch', timeout: Duration.minutes(5), memorySize: 512, batchSize: 5 },
  fetch: { queue: 'fetch', timeout: Duration.seconds(30), memorySize: 256, batchSize: 1 },
  notify: { queue: 'notify', timeout: Duration.minutes(1), memorySize: 512, batchSize: 10 },
  maintenance: {
    queue: 'maintenance',
    timeout: Duration.minutes(5),
    memorySize: 512,
    batchSize: 1,
  },
};

export const RENDITION_WORKER: WorkerSpec = { timeout: Duration.minutes(1), memorySize: 2048 };

export const VISIBILITY_MULTIPLIER = 6;

export function consumerOf(queue: QueueName): QueueWorkerSpec {
  const spec = Object.values(QUEUE_WORKERS).find((w) => w.queue === queue);
  if (!spec) throw new Error(`No consumer declared for queue ${queue}`);
  return spec;
}
