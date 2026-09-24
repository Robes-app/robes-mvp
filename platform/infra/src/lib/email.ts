import { Stack } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import type { Construct } from 'constructs';
import type { StageConfig } from '../../config';

export const SES_SEND_ACTIONS = ['ses:SendEmail', 'ses:SendRawEmail'];

export function configurationSetName(config: StageConfig): string {
  return `${config.namePrefix}-email`;
}

// Literal ARNs (not cross-stack refs) so senders don't couple to EmailStack's outputs.
export function sesSendStatement(scope: Construct, config: StageConfig): iam.PolicyStatement {
  const stack = Stack.of(scope);
  return new iam.PolicyStatement({
    actions: SES_SEND_ACTIONS,
    resources: [
      stack.formatArn({ service: 'ses', resource: 'identity', resourceName: config.email.domain }),
      stack.formatArn({
        service: 'ses',
        resource: 'configuration-set',
        resourceName: configurationSetName(config),
      }),
    ],
    conditions: { StringLike: { 'ses:FromAddress': `*@${config.email.domain}` } },
  });
}
