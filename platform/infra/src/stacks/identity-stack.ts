import { CfnOutput, Duration, SecretValue } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import type { Construct } from 'constructs';
import { sesSendStatement } from '../lib/email';
import { RobesStack, type RobesStackProps, removalPolicy } from '../lib/robes-stack';
import { objectArns } from '../lib/s3-arns';
import type { QueueName } from '../lib/workers';
import type { JobQueues } from './queues-stack';

const GITHUB_ISSUER = 'token.actions.githubusercontent.com';
const CDK_QUALIFIER = 'hnb659fds';

// Queues the web tier enqueues onto (infrastructure.md §3).
export const API_SEND_QUEUES: QueueName[] = ['jobs-interactive', 'jobs-batch', 'fetch'];

export interface IdentityStackProps extends RobesStackProps {
  queues: JobQueues;
  signingKey: secretsmanager.ISecret;
}

export class IdentityStack extends RobesStack {
  readonly githubDeployRole: iam.Role;
  readonly apiUser: iam.User;
  readonly apiAccessKeySecret: secretsmanager.Secret;

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

    // ADR-021: the Vercel API authenticates with this user's access keys (rotation: runbooks/key-rotation.md).
    this.apiUser = new iam.User(this, 'ApiUser', { userName: `${config.namePrefix}-api` });
    new iam.Policy(this, 'ApiPolicy', {
      policyName: 'robes-api',
      users: [this.apiUser],
      statements: [
        new iam.PolicyStatement({
          actions: ['sqs:SendMessage'],
          resources: API_SEND_QUEUES.map((q) => props.queues[q].queue.queueArn),
        }),
        // GetObject covers HeadObject, used to confirm an upload landed.
        new iam.PolicyStatement({
          actions: ['s3:PutObject', 's3:GetObject'],
          resources: objectArns(this, config.media.bucketName, ['uploads/']),
        }),
        sesSendStatement(this, config),
        new iam.PolicyStatement({
          actions: ['secretsmanager:GetSecretValue'],
          resources: [props.signingKey.secretArn],
        }),
      ],
    });

    const keys = config.api.accessKeys.map(
      ({ serial, status }) =>
        new iam.AccessKey(this, `ApiAccessKey${serial}`, {
          user: this.apiUser,
          serial,
          status: status === 'Active' ? iam.AccessKeyStatus.ACTIVE : iam.AccessKeyStatus.INACTIVE,
        }),
    );
    const current = keys.at(-1);
    if (!current) throw new Error(`api.accessKeys for ${config.stage} must list at least one key`);
    // The secret half only ever lands in Secrets Manager, never in an Output.
    this.apiAccessKeySecret = new secretsmanager.Secret(this, 'ApiAccessKeySecret', {
      secretName: `${config.namePrefix}/api/aws-access-key`,
      description: 'Vercel API IAM user key; copy into Vercel env (runbooks/environments.md)',
      secretObjectValue: {
        accessKeyId: SecretValue.unsafePlainText(current.accessKeyId),
        secretAccessKey: current.secretAccessKey,
      },
      removalPolicy: removalPolicy(config),
    });

    new CfnOutput(this, 'GithubDeployRoleArn', { value: this.githubDeployRole.roleArn });
    new CfnOutput(this, 'ApiUserName', { value: this.apiUser.userName });
    new CfnOutput(this, 'ApiAccessKeySecretName', {
      value: `${config.namePrefix}/api/aws-access-key`,
    });
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
