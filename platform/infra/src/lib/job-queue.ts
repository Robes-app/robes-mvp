import { Duration } from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import type { StageConfig } from '../../config';
import { removalPolicy } from './robes-stack';
import { VISIBILITY_MULTIPLIER } from './workers';

export interface JobQueueProps {
  config: StageConfig;
  name: string;
  consumerTimeout: Duration;
}

export const MAX_RECEIVE_COUNT = 3;

export function deadLetterQueue(
  scope: Construct,
  id: string,
  config: StageConfig,
  name: string,
): sqs.Queue {
  return new sqs.Queue(scope, id, {
    queueName: `${config.namePrefix}-${name}-dlq`,
    encryption: sqs.QueueEncryption.SQS_MANAGED,
    enforceSSL: true,
    retentionPeriod: Duration.days(14),
    removalPolicy: removalPolicy(config),
  });
}

export class JobQueue extends Construct {
  readonly queue: sqs.Queue;
  readonly dlq: sqs.Queue;

  constructor(scope: Construct, id: string, props: JobQueueProps) {
    super(scope, id);
    this.dlq = deadLetterQueue(this, 'Dlq', props.config, props.name);
    this.queue = new sqs.Queue(this, 'Queue', {
      queueName: `${props.config.namePrefix}-${props.name}`,
      encryption: sqs.QueueEncryption.SQS_MANAGED,
      enforceSSL: true,
      visibilityTimeout: Duration.seconds(
        props.consumerTimeout.toSeconds() * VISIBILITY_MULTIPLIER,
      ),
      retentionPeriod: Duration.days(4),
      deadLetterQueue: { queue: this.dlq, maxReceiveCount: MAX_RECEIVE_COUNT },
      removalPolicy: removalPolicy(props.config),
    });
  }
}
