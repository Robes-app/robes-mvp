import { describe, expect, it } from 'vitest';
import { synth } from './synth';

describe.each(['staging', 'production'] as const)('%s queues', (stageName) => {
  const s = synth(stageName);
  const queues = s.resources('AWS::SQS::Queue');
  const dlqArns = new Set(
    queues.flatMap((q) => {
      const redrive = q.properties.RedrivePolicy as { deadLetterTargetArn: unknown } | undefined;
      return redrive ? [s.resolve(q.stack, redrive.deadLetterTargetArn)] : [];
    }),
  );
  const isDlq = (q: (typeof queues)[number]): boolean =>
    dlqArns.has(q) || String(q.properties.QueueName).endsWith('-dlq');
  const sources = queues.filter((q) => !isDlq(q));

  it('has the five job queues', () => {
    expect(sources.map((q) => q.properties.QueueName).sort()).toEqual(
      ['fetch', 'jobs-batch', 'jobs-interactive', 'maintenance', 'notify'].map(
        (n) => `${s.stage.config.namePrefix}-${n}`,
      ),
    );
  });

  it.each(sources.map((q) => [q.properties.QueueName, q] as const))(
    '%s has a DLQ with maxReceiveCount 3',
    (_name, q) => {
      const redrive = q.properties.RedrivePolicy as {
        deadLetterTargetArn: unknown;
        maxReceiveCount: number;
      };
      expect(redrive.maxReceiveCount).toBe(3);
      const dlq = s.resolve(q.stack, redrive.deadLetterTargetArn);
      expect(dlq?.type).toBe('AWS::SQS::Queue');
      expect(dlq?.properties.RedrivePolicy).toBeUndefined();
    },
  );

  it.each(queues.map((q) => [q.properties.QueueName, q] as const))('%s is encrypted', (_n, q) => {
    expect(q.properties.SqsManagedSseEnabled).toBe(true);
  });

  it('every source queue has a consumer with visibility >= 6x its timeout', () => {
    const mappings = s.resources('AWS::Lambda::EventSourceMapping');
    for (const q of sources) {
      const consumers = mappings.filter(
        (m) => s.resolve(m.stack, m.properties.EventSourceArn) === q,
      );
      expect(consumers, String(q.properties.QueueName)).toHaveLength(1);
      for (const m of consumers) {
        const fn = s.resolve(m.stack, m.properties.FunctionName);
        const timeout = fn?.properties.Timeout as number;
        expect(timeout).toBeGreaterThan(0);
        expect(q.properties.VisibilityTimeout as number).toBeGreaterThanOrEqual(6 * timeout);
        expect(m.properties.FunctionResponseTypes).toEqual(['ReportBatchItemFailures']);
      }
    }
  });
});
