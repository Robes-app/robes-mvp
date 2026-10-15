import { describe, expect, it } from 'vitest';
import { functionNamed, synth } from './synth';

describe.each(['staging', 'production'] as const)('%s lambdas', (stageName) => {
  const s = synth(stageName);
  const functions = s.resources('AWS::Lambda::Function');

  it.each(functions.map((f) => [f.properties.FunctionName, f] as const))(
    '%s runs nodejs24.x on arm64 with a 14-day log group',
    (_name, fn) => {
      expect(fn.properties.Runtime).toBe('nodejs24.x');
      expect(fn.properties.Architectures).toEqual(['arm64']);
      const logGroup = s.resolve(
        fn.stack,
        (fn.properties.LoggingConfig as { LogGroup: unknown }).LogGroup,
      );
      expect(logGroup?.type).toBe('AWS::Logs::LogGroup');
      expect(logGroup?.properties.RetentionInDays).toBe(14);
    },
  );

  it('every log group keeps 14 days', () => {
    const groups = s.resources('AWS::Logs::LogGroup');
    expect(groups).toHaveLength(functions.length);
    for (const g of groups) expect(g.properties.RetentionInDays).toBe(14);
  });

  it('caps generate concurrency', () => {
    const fn = functions.find(
      (f) => f.properties.FunctionName === `${s.stage.config.namePrefix}-generate`,
    );
    expect(fn?.properties.ReservedConcurrentExecutions).toBe(
      s.stage.config.workers.generateReservedConcurrency,
    );
  });

  it('sends failed rendition invocations to a DLQ', () => {
    const fn = functionNamed(s, 'rendition');
    const target = (fn.properties.DeadLetterConfig as { TargetArn: unknown }).TargetArn;
    expect(s.resolve(fn.stack, target)?.properties.QueueName).toBe(
      `${s.stage.config.namePrefix}-rendition-dlq`,
    );
  });
});
