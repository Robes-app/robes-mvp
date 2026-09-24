import * as budgets from 'aws-cdk-lib/aws-budgets';
import type * as sns from 'aws-cdk-lib/aws-sns';
import type { Construct } from 'constructs';
import { RobesStack, type RobesStackProps } from '../lib/robes-stack';

export interface BudgetsStackProps extends RobesStackProps {
  topic: sns.ITopic;
}

export const BUDGET_THRESHOLDS: { type: 'ACTUAL' | 'FORECASTED'; percent: number }[] = [
  { type: 'ACTUAL', percent: 50 },
  { type: 'ACTUAL', percent: 80 },
  { type: 'ACTUAL', percent: 100 },
  { type: 'FORECASTED', percent: 100 },
];

export class BudgetsStack extends RobesStack {
  constructor(scope: Construct, id: string, props: BudgetsStackProps) {
    super(scope, id, props);
    const { config } = props;
    const subscribers: budgets.CfnBudget.SubscriberProperty[] = [
      { subscriptionType: 'SNS', address: props.topic.topicArn },
      ...(config.budget.email ? [{ subscriptionType: 'EMAIL', address: config.budget.email }] : []),
    ];
    new budgets.CfnBudget(this, 'Monthly', {
      budget: {
        budgetName: `${config.namePrefix}-monthly`,
        budgetType: 'COST',
        timeUnit: 'MONTHLY',
        budgetLimit: { amount: config.budget.monthlyUsd, unit: 'USD' },
      },
      notificationsWithSubscribers: BUDGET_THRESHOLDS.map(({ type, percent }) => ({
        notification: {
          notificationType: type,
          comparisonOperator: 'GREATER_THAN',
          threshold: percent,
          thresholdType: 'PERCENTAGE',
        },
        subscribers,
      })),
    });
  }
}
