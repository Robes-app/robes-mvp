import { Duration } from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import type * as sqs from 'aws-cdk-lib/aws-sqs';
import type { Construct } from 'constructs';
import { RobesStack, type RobesStackProps } from '../lib/robes-stack';
import type { WorkerFunction } from '../lib/worker-function';
import type { JobQueues } from './queues-stack';

export const QUEUE_AGE_ALARM_SECONDS = 120;
export const ERROR_RATE_PERCENT = 2;

export interface ObservabilityStackProps extends RobesStackProps {
  queues: JobQueues;
  extraDlqs: Record<string, sqs.IQueue>;
  functions: WorkerFunction[];
}

export class ObservabilityStack extends RobesStack {
  readonly topic: sns.Topic;

  constructor(scope: Construct, id: string, props: ObservabilityStackProps) {
    super(scope, id, props);
    const { config } = props;

    // Unencrypted on purpose: CloudWatch and Budgets can't publish to an aws/sns-encrypted topic.
    this.topic = new sns.Topic(this, 'Alerts', {
      topicName: `${config.namePrefix}-alerts`,
      enforceSSL: true,
    });
    this.topic.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['sns:Publish'],
        principals: [new iam.ServicePrincipal('budgets.amazonaws.com')],
        resources: [this.topic.topicArn],
        conditions: { StringEquals: { 'aws:SourceAccount': this.account } },
      }),
    );
    if (config.alerts.email) {
      this.topic.addSubscription(new subscriptions.EmailSubscription(config.alerts.email));
    }
    const notify = new actions.SnsAction(this.topic);
    const alarm = (a: cloudwatch.Alarm): void => {
      a.addAlarmAction(notify);
      a.addOkAction(notify);
    };

    const dlqs: Record<string, sqs.IQueue> = { ...props.extraDlqs };
    for (const [name, { queue, dlq }] of Object.entries(props.queues)) {
      dlqs[name] = dlq;
      alarm(
        queue
          .metricApproximateAgeOfOldestMessage({ period: Duration.minutes(1) })
          .createAlarm(this, `${name}-age`, {
            alarmName: `${config.namePrefix}-${name}-age`,
            threshold: QUEUE_AGE_ALARM_SECONDS,
            evaluationPeriods: 3,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
          }),
      );
    }
    for (const [name, dlq] of Object.entries(dlqs)) {
      alarm(
        dlq
          .metricApproximateNumberOfMessagesVisible({
            period: Duration.minutes(1),
            statistic: 'Maximum',
          })
          .createAlarm(this, `${name}-dlq`, {
            alarmName: `${config.namePrefix}-${name}-dlq-depth`,
            threshold: 0,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            evaluationPeriods: 1,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
          }),
      );
    }

    const widgets: cloudwatch.IWidget[] = [];
    for (const { name, fn } of props.functions) {
      const period = Duration.minutes(5);
      const errorRate = new cloudwatch.MathExpression({
        expression: '100 * errors / MAX([invocations, 1])',
        usingMetrics: {
          errors: fn.metricErrors({ period, statistic: 'Sum' }),
          invocations: fn.metricInvocations({ period, statistic: 'Sum' }),
        },
        period,
        label: `${name} error %`,
      });
      alarm(
        errorRate.createAlarm(this, `${name}-errors`, {
          alarmName: `${config.namePrefix}-${name}-error-rate`,
          threshold: ERROR_RATE_PERCENT,
          evaluationPeriods: 2,
          treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        }),
      );
      alarm(
        fn.metricThrottles({ period, statistic: 'Sum' }).createAlarm(this, `${name}-throttles`, {
          alarmName: `${config.namePrefix}-${name}-throttles`,
          threshold: 0,
          comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
          evaluationPeriods: 1,
          treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        }),
      );
      const timeoutMs = fn.timeout?.toMilliseconds() ?? 3000;
      const p95 = fn.metricDuration({ period, statistic: 'p95' });
      alarm(
        p95.createAlarm(this, `${name}-p95`, {
          alarmName: `${config.namePrefix}-${name}-p95-duration`,
          threshold: Math.round(timeoutMs * 0.8),
          evaluationPeriods: 3,
          treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        }),
      );
      widgets.push(
        new cloudwatch.GraphWidget({ title: `${name} errors %`, left: [errorRate], width: 8 }),
        new cloudwatch.GraphWidget({ title: `${name} p95 duration`, left: [p95], width: 8 }),
        new cloudwatch.GraphWidget({
          title: `${name} throttles`,
          left: [fn.metricThrottles({ period })],
          width: 8,
        }),
      );
    }
    new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: `${config.namePrefix}-workers`,
      widgets: [widgets],
    });
  }
}
