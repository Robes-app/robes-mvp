import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import { synth, testApp } from './synth';

const STATEFUL = [
  'AWS::S3::Bucket',
  'AWS::SQS::Queue',
  'AWS::SecretsManager::Secret',
  'AWS::Logs::LogGroup',
];

describe('production', () => {
  const s = synth('production');

  it('retains every stateful resource', () => {
    const stateful = s.resources().filter((r) => STATEFUL.includes(r.type));
    expect(stateful.length).toBeGreaterThan(20);
    for (const r of stateful) {
      expect([r.logicalId, r.deletionPolicy, r.updateReplacePolicy]).toEqual([
        r.logicalId,
        'Retain',
        'Retain',
      ]);
    }
  });

  it('turns on termination protection for every stack', () => {
    expect(s.stage.stacks).toHaveLength(8);
    for (const stack of s.stage.stacks) expect(stack.terminationProtection).toBe(true);
  });

  it('uses the Prod stack prefix', () => {
    expect(s.stage.stacks.map((st) => st.stackName)).toContain('Prod-Workers');
  });
});

describe('staging', () => {
  const s = synth('staging');

  it('can be torn down', () => {
    for (const stack of s.stage.stacks) expect(stack.terminationProtection).toBe(false);
    const queues = s.resources('AWS::SQS::Queue');
    for (const q of queues) expect(q.deletionPolicy).toBe('Delete');
  });

  it('shares no physical names with production', () => {
    const names = (stage: typeof s): string[] =>
      stage
        .resources()
        .flatMap((r) => [
          r.properties.BucketName,
          r.properties.QueueName,
          r.properties.FunctionName,
          r.properties.Name,
        ])
        .filter((n): n is string => typeof n === 'string');
    const prod = new Set(names(synth('production')));
    expect(names(s).filter((n) => prod.has(n))).toEqual([]);
  });
});

describe('buildApp', () => {
  it('builds both stages by default and one when selected', () => {
    const both = buildApp(testApp());
    expect(both.map((st) => st.stageName)).toEqual(['Staging', 'Production']);
    const one = buildApp(testApp({ stage: 'staging' }));
    expect(one.map((st) => st.stageName)).toEqual(['Staging']);
  });

  it('rejects an unknown stage', () => {
    expect(() => buildApp(testApp({ stage: 'prod' }))).toThrow(/Unknown stage/);
  });

  it('fails clearly when worker handlers are missing', () => {
    expect(() => buildApp(testApp({ stage: 'staging', workersEntryDir: '/nonexistent' }))).toThrow(
      /Worker entry not found/,
    );
  });
});
