import { Aws } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import type * as sqs from 'aws-cdk-lib/aws-sqs';
import type { Construct } from 'constructs';
import { receiptRuleSetName } from '../lib/email';
import { deadLetterQueue, JobQueue } from '../lib/job-queue';
import { recordOf } from '../lib/record';
import { RobesStack, type RobesStackProps } from '../lib/robes-stack';
import { consumerOf, QUEUE_NAMES, type QueueName } from '../lib/workers';

export type JobQueues = Record<QueueName, JobQueue>;

export class QueuesStack extends RobesStack {
  readonly queues: JobQueues;
  /** Failed async RenditionFn invocations (S3 events have no source queue). */
  readonly renditionDlq: sqs.Queue;
  /** SES receipt notifications land here and fan into the `inbound` queue. */
  readonly inboundTopic: sns.Topic;

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

    // Unencrypted: SES can't publish to a topic under the AWS-managed SNS key (as EmailEvents).
    this.inboundTopic = new sns.Topic(this, 'InboundMail', {
      topicName: `${props.config.namePrefix}-inbound-mail`,
      enforceSSL: true,
    });
    this.inboundTopic.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['sns:Publish'],
        principals: [new iam.ServicePrincipal('ses.amazonaws.com')],
        resources: [this.inboundTopic.topicArn],
        conditions: {
          StringEquals: { 'aws:SourceAccount': Aws.ACCOUNT_ID },
          ArnLike: {
            'aws:SourceArn': `arn:${Aws.PARTITION}:ses:${Aws.REGION}:${Aws.ACCOUNT_ID}:receipt-rule-set/${receiptRuleSetName(props.config)}:receipt-rule/*`,
          },
        },
      }),
    );
    this.inboundTopic.addSubscription(
      new subscriptions.SqsSubscription(this.queues.inbound.queue, { rawMessageDelivery: true }),
    );
  }
}
