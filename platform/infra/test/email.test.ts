import { describe, expect, it } from 'vitest';
import { must, synth } from './synth';

describe.each(['staging', 'production'] as const)('%s email (ADR-021)', (stageName) => {
  const s = synth(stageName);
  const { email, namePrefix } = s.stage.config;

  it('verifies the stage domain with Easy DKIM and a custom MAIL FROM', () => {
    const identity = must(s.resources('AWS::SES::EmailIdentity')[0], 'identity');
    expect(s.resources('AWS::SES::EmailIdentity')).toHaveLength(1);
    expect(identity.properties.EmailIdentity).toBe(email.domain);
    expect(identity.properties.DkimAttributes).toEqual({ SigningEnabled: true });
    expect(identity.properties.DkimSigningAttributes).toEqual({
      NextSigningKeyLength: 'RSA_2048_BIT',
    });
    expect(identity.properties.MailFromAttributes).toMatchObject({
      MailFromDomain: `bounce.${email.domain}`,
    });
    const set = s.resolve(
      identity.stack,
      (identity.properties.ConfigurationSetAttributes as { ConfigurationSetName: unknown })
        .ConfigurationSetName,
    );
    expect(set?.properties.Name).toBe(`${namePrefix}-email`);
  });

  it('tracks reputation and publishes bounces, complaints and rejects to SNS', () => {
    const set = must(s.resources('AWS::SES::ConfigurationSet')[0], 'config set');
    expect(set.properties.ReputationOptions).toEqual({ ReputationMetricsEnabled: true });
    expect(set.properties.DeliveryOptions).toMatchObject({ TlsPolicy: 'REQUIRE' });

    const dest = must(s.resources('AWS::SES::ConfigurationSetEventDestination')[0], 'destination');
    const cfg = dest.properties.EventDestination as {
      MatchingEventTypes: string[];
      SnsDestination: { TopicARN: unknown };
    };
    expect([...cfg.MatchingEventTypes].sort()).toEqual(['bounce', 'complaint', 'reject']);
    const topic = s.resolve(dest.stack, cfg.SnsDestination.TopicARN);
    expect(topic?.properties.TopicName).toBe(`${namePrefix}-email-events`);

    const policy = s
      .resources('AWS::SNS::TopicPolicy')
      .find((p) => JSON.stringify(p.properties).includes('configuration-set/'));
    const text = JSON.stringify(policy?.properties);
    expect(text).toContain('configuration-set/');
    expect(text).toContain(`{"Ref":"${set.logicalId}"}`);
    expect(text).toContain('AWS:SourceAccount');
  });

  it('outputs the DNS records for the runbook', () => {
    const outputs = Object.keys(
      (s.templates[`${s.stage.config.stackPrefix}-Email`]?.Outputs ?? {}) as object,
    );
    for (const name of ['DkimCname1', 'DkimCname2', 'DkimCname3', 'MailFromMx', 'MailFromSpf']) {
      expect(outputs).toContain(name);
    }
  });
});
