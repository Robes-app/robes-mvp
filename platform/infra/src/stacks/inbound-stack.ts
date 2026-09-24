import { CfnOutput } from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as actions from 'aws-cdk-lib/aws-ses-actions';
import type * as sns from 'aws-cdk-lib/aws-sns';
import type { Construct } from 'constructs';
import { INBOUND_PREFIX, inboundDomain, receiptRuleSetName } from '../lib/email';
import { RobesStack, type RobesStackProps } from '../lib/robes-stack';

export interface InboundStackProps extends RobesStackProps {
  topic: sns.ITopic;
}

// Forwarded receipts (M3 task 10, ADR-021): mail to *@in.<mail domain> is scanned by SES, stored
// raw under inbound/ in the media bucket, and announced on the inbound topic → inboundFn.
// SES allows one ACTIVE rule set per account and region: activate it once (runbook §9).
export class InboundStack extends RobesStack {
  readonly ruleSet: ses.ReceiptRuleSet;

  constructor(scope: Construct, id: string, props: InboundStackProps) {
    super(scope, id, props);
    const { config } = props;
    const domain = inboundDomain(config);

    this.ruleSet = new ses.ReceiptRuleSet(this, 'RuleSet', {
      receiptRuleSetName: receiptRuleSetName(config),
    });
    this.ruleSet.addRule('Receipts', {
      receiptRuleName: 'receipts',
      recipients: [domain],
      scanEnabled: true,
      tlsPolicy: ses.TlsPolicy.REQUIRE,
      actions: [
        new actions.S3({
          // Imported by name: the bucket policy for SES lives in MediaStack.
          bucket: s3.Bucket.fromBucketName(this, 'Media', config.media.bucketName),
          objectKeyPrefix: INBOUND_PREFIX,
          topic: props.topic,
        }),
      ],
    });

    new CfnOutput(this, 'InboundMx', {
      description: 'MX record for forwarded receipts',
      value: `${domain} MX 10 inbound-smtp.${this.region}.amazonaws.com`,
    });
    new CfnOutput(this, 'ReceiptRuleSetName', { value: this.ruleSet.receiptRuleSetName });
  }
}
