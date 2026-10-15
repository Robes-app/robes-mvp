import { CfnOutput } from 'aws-cdk-lib';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as sns from 'aws-cdk-lib/aws-sns';
import type { Construct } from 'constructs';
import { configurationSetName } from '../lib/email';
import { RobesStack, type RobesStackProps } from '../lib/robes-stack';

export const MAIL_FROM_SUBDOMAIN = 'bounce';
export const SUPPRESSION_EVENTS = [
  ses.EmailSendingEvent.BOUNCE,
  ses.EmailSendingEvent.COMPLAINT,
  ses.EmailSendingEvent.REJECT,
];

// ADR-021: SES for all email. Bounce/complaint/reject events feed app.email_suppressions via notifyFn.
export class EmailStack extends RobesStack {
  readonly identity: ses.EmailIdentity;
  readonly configurationSet: ses.ConfigurationSet;
  readonly eventsTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: RobesStackProps) {
    super(scope, id, props);
    const { config } = props;
    const { domain } = config.email;
    const mailFromDomain = `${MAIL_FROM_SUBDOMAIN}.${domain}`;

    // Unencrypted: SES can't publish to a topic under the AWS-managed SNS key.
    this.eventsTopic = new sns.Topic(this, 'EmailEvents', {
      topicName: `${config.namePrefix}-email-events`,
      enforceSSL: true,
    });

    this.configurationSet = new ses.ConfigurationSet(this, 'ConfigurationSet', {
      configurationSetName: configurationSetName(config),
      reputationMetrics: true,
      sendingEnabled: true,
      tlsPolicy: ses.ConfigurationSetTlsPolicy.REQUIRE,
      suppressionReasons: ses.SuppressionReasons.BOUNCES_AND_COMPLAINTS,
    });
    this.configurationSet.addEventDestination('Suppressions', {
      destination: ses.EventDestination.snsTopic(this.eventsTopic),
      events: SUPPRESSION_EVENTS,
    });

    this.identity = new ses.EmailIdentity(this, 'Domain', {
      identity: ses.Identity.domain(domain),
      configurationSet: this.configurationSet,
      dkimSigning: true,
      dkimIdentity: ses.DkimIdentity.easyDkim(ses.EasyDkimSigningKeyLength.RSA_2048_BIT),
      mailFromDomain,
      mailFromBehaviorOnMxFailure: ses.MailFromBehaviorOnMxFailure.USE_DEFAULT_VALUE,
    });

    // DNS for runbooks/environments.md §9; names and values are public.
    this.identity.dkimRecords.forEach((record, i) => {
      new CfnOutput(this, `DkimCname${i + 1}`, {
        description: 'DKIM CNAME (name = value)',
        value: `${record.name} CNAME ${record.value}`,
      });
    });
    new CfnOutput(this, 'MailFromMx', {
      value: `${mailFromDomain} MX 10 feedback-smtp.${this.region}.amazonses.com`,
    });
    new CfnOutput(this, 'MailFromSpf', {
      value: `${mailFromDomain} TXT "v=spf1 include:amazonses.com ~all"`,
    });
    new CfnOutput(this, 'ConfigurationSetName', {
      value: this.configurationSet.configurationSetName,
    });
    new CfnOutput(this, 'EmailEventsTopicArn', { value: this.eventsTopic.topicArn });
  }
}
