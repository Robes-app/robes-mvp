import { CfnOutput, Duration } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import type { ISecret } from 'aws-cdk-lib/aws-secretsmanager';
import type { Construct } from 'constructs';
import { RobesStack, type RobesStackProps } from '../lib/robes-stack';
import { objectArns } from '../lib/s3-arns';
import type { QueueName } from '../lib/workers';
import type { JobQueues } from './queues-stack';

const GITHUB_ISSUER = 'token.actions.githubusercontent.com';
const CDK_QUALIFIER = 'hnb659fds';

// Queues the web tier enqueues onto (infrastructure.md §3).
export const VERCEL_SEND_QUEUES: QueueName[] = ['jobs-interactive', 'jobs-batch', 'fetch'];

export interface IdentityStackProps extends RobesStackProps {
  queues: JobQueues;
  signingKey: ISecret;
}

export class IdentityStack extends RobesStack {
  readonly githubDeployRole: iam.Role;
  readonly vercelApiRole: iam.Role;

  constructor(scope: Construct, id: string, props: IdentityStackProps) {
    super(scope, id, props);
    const { config } = props;

    const github = this.provider(
      'GithubOidc',
      `https://${GITHUB_ISSUER}`,
      ['sts.amazonaws.com'],
      config.github.oidcProviderArn,
    );
    this.githubDeployRole = new iam.Role(this, 'GithubDeployRole', {
      roleName: `${config.namePrefix}-github-deploy`,
      description: `cdk deploy from ${config.github.repository} (${config.github.environment})`,
      maxSessionDuration: Duration.hours(1),
      assumedBy: new iam.WebIdentityPrincipal(github.openIdConnectProviderArn, {
        StringEquals: {
          [`${GITHUB_ISSUER}:aud`]: 'sts.amazonaws.com',
          [`${GITHUB_ISSUER}:sub`]: `repo:${config.github.repository}:environment:${config.github.environment}`,
        },
      }),
    });
    // Deploys go through the CDK bootstrap roles; this role only hops into them.
    this.githubDeployRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['sts:AssumeRole'],
        resources: [
          `arn:${this.partition}:iam::${this.account}:role/cdk-${CDK_QUALIFIER}-*-${this.account}-${this.region}`,
        ],
      }),
    );

    const { teamSlug, project, environment } = config.vercel;
    const vercelIssuer = `oidc.vercel.com/${teamSlug}`;
    const vercel = this.provider(
      'VercelOidc',
      `https://${vercelIssuer}`,
      [`https://vercel.com/${teamSlug}`],
      config.vercel.oidcProviderArn,
    );
    this.vercelApiRole = new iam.Role(this, 'VercelApiRole', {
      roleName: `${config.namePrefix}-vercel-api`,
      description: `Vercel ${project} (${environment}) → enqueue, presign uploads, sign media`,
      maxSessionDuration: Duration.hours(1),
      assumedBy: new iam.WebIdentityPrincipal(vercel.openIdConnectProviderArn, {
        StringEquals: {
          [`${vercelIssuer}:aud`]: `https://vercel.com/${teamSlug}`,
          [`${vercelIssuer}:sub`]: `owner:${teamSlug}:project:${project}:environment:${environment}`,
        },
      }),
    });
    this.vercelApiRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['sqs:SendMessage'],
        resources: VERCEL_SEND_QUEUES.map((q) => props.queues[q].queue.queueArn),
      }),
    );
    this.vercelApiRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['s3:PutObject'],
        resources: objectArns(this, config.media.bucketName, ['uploads/']),
      }),
    );
    this.vercelApiRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['secretsmanager:GetSecretValue'],
        resources: [props.signingKey.secretArn],
      }),
    );

    new CfnOutput(this, 'GithubDeployRoleArn', { value: this.githubDeployRole.roleArn });
    new CfnOutput(this, 'VercelApiRoleArn', { value: this.vercelApiRole.roleArn });
  }

  private provider(
    id: string,
    url: string,
    clientIds: string[],
    existingArn?: string,
  ): iam.IOidcProvider {
    if (existingArn) return iam.OidcProviderNative.fromOidcProviderArn(this, id, existingArn);
    return new iam.OidcProviderNative(this, id, { url, clientIds });
  }
}
