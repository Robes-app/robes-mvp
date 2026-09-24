import { describe, expect, it } from 'vitest';
import { SCHEDULES } from '../src/stacks/schedules-stack';
import { must, synth } from './synth';

describe.each(['staging', 'production'] as const)('%s operations', (stageName) => {
  const s = synth(stageName);
  const prefix = s.stage.config.namePrefix;

  it('schedules each §4.1 job onto its queue', () => {
    const schedules = s.resources('AWS::Scheduler::Schedule');
    expect(schedules.map((r) => r.properties.Name).sort()).toEqual(
      SCHEDULES.map((x) => `${prefix}-${x.name}`).sort(),
    );
    for (const spec of SCHEDULES) {
      const r = schedules.find((x) => x.properties.Name === `${prefix}-${spec.name}`);
      const target = r?.properties.Target as { Arn: unknown; Input: string };
      expect(s.resolve(r?.stack ?? '', target.Arn)?.properties.QueueName).toBe(
        `${prefix}-${spec.queue}`,
      );
      expect(JSON.parse(target.Input)).toEqual({ kind: spec.name });
    }
  });

  it('alarms on every DLQ and queue age', () => {
    const alarms = s.resources('AWS::CloudWatch::Alarm').map((a) => String(a.properties.AlarmName));
    const dlqs = s
      .resources('AWS::SQS::Queue')
      .filter((q) => String(q.properties.QueueName).endsWith('-dlq'));
    expect(dlqs).toHaveLength(6);
    for (const q of dlqs) {
      expect(alarms).toContain(`${String(q.properties.QueueName)}-depth`);
    }
    for (const name of ['jobs-interactive', 'jobs-batch', 'fetch', 'notify', 'maintenance']) {
      expect(alarms).toContain(`${prefix}-${name}-age`);
    }
  });

  it('alarms on errors and throttles for every function, into the alerts topic', () => {
    const alarms = s.resources('AWS::CloudWatch::Alarm');
    for (const fn of s.resources('AWS::Lambda::Function')) {
      const name = String(fn.properties.FunctionName);
      for (const kind of ['error-rate', 'throttles', 'p95-duration']) {
        const alarm = must(
          alarms.find((a) => a.properties.AlarmName === `${name}-${kind}`),
          `${name}-${kind}`,
        );
        const [action] = alarm.properties.AlarmActions as unknown[];
        expect(s.resolve(alarm.stack, action)?.type).toBe('AWS::SNS::Topic');
      }
    }
  });

  it('budgets at 50/80/100% actual and 100% forecast into SNS', () => {
    const [budget] = s.resources('AWS::Budgets::Budget');
    const props = budget?.properties as {
      Budget: { BudgetLimit: { Amount: number } };
      NotificationsWithSubscribers: {
        Notification: { NotificationType: string; Threshold: number };
        Subscribers: { SubscriptionType: string }[];
      }[];
    };
    expect(props.Budget.BudgetLimit.Amount).toBe(s.stage.config.budget.monthlyUsd);
    expect(
      props.NotificationsWithSubscribers.map(
        (n) => `${n.Notification.NotificationType}:${n.Notification.Threshold}`,
      ),
    ).toEqual(['ACTUAL:50', 'ACTUAL:80', 'ACTUAL:100', 'FORECASTED:100']);
    for (const n of props.NotificationsWithSubscribers) {
      expect(n.Subscribers.map((x) => x.SubscriptionType)).toContain('SNS');
    }
  });

  it('creates every §4.1 / ADR-020 secret with no plaintext value in the template', () => {
    const secrets = s.resources('AWS::SecretsManager::Secret');
    expect(secrets.map((r) => String(r.properties.Name).replace(`${prefix}/`, '')).sort()).toEqual([
      'auth/apple',
      'auth/better-auth-secret',
      'auth/google',
      'cloudfront/signing-key',
      'database/url',
      'expo/access-token',
      'fal/api-key',
      'gemini/api-key',
      'resend/api-key',
      'resend/webhook-secret',
      'unsub/hmac-key',
    ]);
    for (const r of secrets) expect(r.properties.SecretString).toBeUndefined();
    const apple = secrets.find((r) => String(r.properties.Name).endsWith('/auth/apple'));
    const gen = apple?.properties.GenerateSecretString as { SecretStringTemplate: string };
    expect(Object.keys(JSON.parse(gen.SecretStringTemplate))).toEqual([
      'clientId',
      'teamId',
      'keyId',
    ]);
  });
});
