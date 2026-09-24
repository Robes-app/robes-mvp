import { describe, expect, it } from 'vitest';
import { must, synth } from './synth';

describe.each(['staging', 'production'] as const)('%s inbound mail (M3 task 10)', (stageName) => {
  const s = synth(stageName);
  const { namePrefix, email } = s.stage.config;

  it('stores mail for in.<mail domain> under inbound/ with spam/virus scanning and TLS', () => {
    const ruleSet = must(s.resources('AWS::SES::ReceiptRuleSet')[0], 'rule set');
    expect(ruleSet.properties.RuleSetName).toBe(`${namePrefix}-inbound`);
    const rule = must(s.resources('AWS::SES::ReceiptRule')[0], 'rule');
    const r = rule.properties.Rule as Record<string, unknown>;
    expect(r.Recipients).toEqual([`in.${email.domain}`]);
    expect(r.ScanEnabled).toBe(true);
    expect(r.TlsPolicy).toBe('Require');
    const [action] = r.Actions as { S3Action: Record<string, unknown> }[];
    expect(action?.S3Action.ObjectKeyPrefix).toBe('inbound/');
    expect(action?.S3Action.BucketName).toBe(s.stage.config.media.bucketName);
    const topic = s.resolve(rule.stack, action?.S3Action.TopicArn);
    expect(topic?.properties.TopicName).toBe(`${namePrefix}-inbound-mail`);
  });

  it('fans the notification into the inbound queue with raw delivery', () => {
    const sub = must(
      s.resources('AWS::SNS::Subscription').find((x) => x.properties.Protocol === 'sqs'),
      'subscription',
    );
    expect(sub.properties.RawMessageDelivery).toBe(true);
    expect(s.resolve(sub.stack, sub.properties.Endpoint)?.properties.QueueName).toBe(
      `${namePrefix}-inbound`,
    );
    const policy = must(
      s
        .resources('AWS::SNS::TopicPolicy')
        .find((p) => JSON.stringify(p.properties).includes('receipt-rule-set/')),
      'topic policy',
    );
    expect(JSON.stringify(policy.properties)).toContain('aws:SourceAccount');
  });

  it('keeps raw inbound mail for 7 days', () => {
    const bucket = must(s.resources('AWS::S3::Bucket')[0], 'bucket');
    const rules = (bucket.properties.LifecycleConfiguration as { Rules: Record<string, unknown>[] })
      .Rules;
    expect(rules).toContainEqual(
      expect.objectContaining({ Prefix: 'inbound/', ExpirationInDays: 7, Status: 'Enabled' }),
    );
  });

  it('outputs the MX record for the runbook', () => {
    const outputs = (s.templates[`${s.stage.config.stackPrefix}-Inbound`]?.Outputs ?? {}) as Record<
      string,
      { Value: unknown }
    >;
    expect(JSON.stringify(outputs.InboundMx?.Value)).toContain('inbound-smtp');
  });
});
