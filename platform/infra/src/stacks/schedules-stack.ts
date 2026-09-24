import { Duration, TimeZone } from 'aws-cdk-lib';
import * as scheduler from 'aws-cdk-lib/aws-scheduler';
import * as targets from 'aws-cdk-lib/aws-scheduler-targets';
import type { Construct } from 'constructs';
import { RobesStack, type RobesStackProps } from '../lib/robes-stack';
import type { QueueName } from '../lib/workers';
import type { JobQueues } from './queues-stack';

export interface SchedulesStackProps extends RobesStackProps {
  queues: JobQueues;
}

interface ScheduleSpec {
  name: string;
  expression: scheduler.ScheduleExpression;
  queue: QueueName;
  description: string;
}

const UTC = { timeZone: TimeZone.ETC_UTC };

// infrastructure.md §4.1; replaces the legacy in-process setIntervals.
export const SCHEDULES: ScheduleSpec[] = [
  {
    name: 'notify-tick',
    expression: scheduler.ScheduleExpression.rate(Duration.minutes(10)),
    queue: 'notify',
    description: 'Due reminders and digests',
  },
  {
    name: 'daily-look-batch',
    expression: scheduler.ScheduleExpression.cron({ minute: '0', ...UTC }),
    queue: 'jobs-batch',
    description: 'Hourly: users whose local time is 04:00',
  },
  {
    name: 'retention',
    expression: scheduler.ScheduleExpression.cron({ minute: '0', hour: '3', ...UTC }),
    queue: 'maintenance',
    description: 'Daily 03:00 UTC retention and deletion',
  },
  {
    name: 'job-sweeper',
    expression: scheduler.ScheduleExpression.rate(Duration.minutes(1)),
    queue: 'maintenance',
    description: 'Outbox recovery: re-enqueue queued jobs older than 60 s',
  },
  {
    name: 'account-deletion',
    expression: scheduler.ScheduleExpression.rate(Duration.minutes(5)),
    queue: 'maintenance',
    description: 'Self-serve account deletions (SEC-80), minutes after the request',
  },
  {
    name: 'data-export',
    expression: scheduler.ScheduleExpression.rate(Duration.minutes(5)),
    queue: 'maintenance',
    description: 'Self-serve data exports (SEC-81), minutes after the request',
  },
  {
    name: 'batch-poll',
    expression: scheduler.ScheduleExpression.rate(Duration.minutes(5)),
    queue: 'jobs-batch',
    description: 'Poll Gemini Batch API submissions',
  },
];

export class SchedulesStack extends RobesStack {
  constructor(scope: Construct, id: string, props: SchedulesStackProps) {
    super(scope, id, props);
    for (const spec of SCHEDULES) {
      new scheduler.Schedule(this, spec.name, {
        scheduleName: `${props.config.namePrefix}-${spec.name}`,
        description: spec.description,
        schedule: spec.expression,
        timeWindow: scheduler.TimeWindow.off(),
        target: new targets.SqsSendMessage(props.queues[spec.queue].queue, {
          input: scheduler.ScheduleTargetInput.fromObject({ kind: spec.name }),
          retryAttempts: 2,
        }),
      });
    }
  }
}
