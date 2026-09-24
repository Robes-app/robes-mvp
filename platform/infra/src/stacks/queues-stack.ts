import type * as sqs from 'aws-cdk-lib/aws-sqs';
import type { Construct } from 'constructs';
import { deadLetterQueue, JobQueue } from '../lib/job-queue';
import { recordOf } from '../lib/record';
import { RobesStack, type RobesStackProps } from '../lib/robes-stack';
import { consumerOf, QUEUE_NAMES, type QueueName } from '../lib/workers';

export type JobQueues = Record<QueueName, JobQueue>;

export class QueuesStack extends RobesStack {
  readonly queues: JobQueues;
  /** Failed async RenditionFn invocations (S3 events have no source queue). */
  readonly renditionDlq: sqs.Queue;

  constructor(scope: Construct, id: string, props: RobesStackProps) {
    super(scope, id, props);
    this.queues = recordOf(
      QUEUE_NAMES,
      (name) =>
        new JobQueue(this, name, {
          config: props.config,
          name,
          consumerTimeout: consumerOf(name).timeout,
        }),
    );
    this.renditionDlq = deadLetterQueue(this, 'RenditionDlq', props.config, 'rendition');
  }
}
