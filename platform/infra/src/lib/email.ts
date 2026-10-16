import { Stack } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import type { Construct } from 'constructs';
import type { StageConfig } from '../../config';

export const SES_SEND_ACTIONS = ['ses:SendEmail', 'ses:SendRawEmail'];

export function configurationSetName(config: StageConfig): string {
  return `${config.namePrefix}-email`;
}

// Literal ARNs (not cross-stack refs) so senders don't couple to EmailStack's outputs.
// In the SES sandbox the recipient's verified identity is authorised too; FromAddress still pins the sender.
export function sesSendStatement(scope: Construct, config: StageConfig): iam.PolicyStatement {
  const stack = Stack.of(scope);
  const recipients = config.email.sandbox
    ? [stack.formatArn({ service: 'ses', resource: 'identity', resourceName: '*' })]
    : [];
  return new iam.PolicyStatement({
    actions: SES_SEND_ACTIONS,
    resources: [
      stack.formatArn({ service: 'ses', resource: 'identity', resourceName: config.email.domain }),
      ...recipients,
      stack.formatArn({
        service: 'ses',
        resource: 'configuration-set',
        resourceName: configurationSetName(config),
      }),
    ],
    conditions: { StringLike: { 'ses:FromAddress': `*@${config.email.domain}` } },
  });
}

// Forwarded receipts (M3 task 10): <address>@in.<mail domain>, stored raw under inbound/.
export const INBOUND_PREFIX = 'inbound/';
export function inboundDomain(config: StageConfig): string {
  return `in.${config.email.domain}`;
}
export function receiptRuleSetName(config: StageConfig): string {
  return `${config.namePrefix}-inbound`;
}
