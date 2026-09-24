export type StageName = 'staging' | 'production';

export interface StageConfig {
  stage: StageName;
  /** CDK construct id of the Stage (`Staging` / `Production`). */
  stageId: string;
  /** Prefix for CloudFormation stack names (infrastructure.md §2). */
  stackPrefix: string;
  /** Prefix for physical names: buckets, queues, functions, secrets. */
  namePrefix: string;
  env: { account?: string; region: string };
  retain: boolean;
  terminationProtection: boolean;
  appOrigins: string[];
  github: {
    repository: string;
    environment: string;
    /** Import an existing provider; an account can hold only one per URL. */
    oidcProviderArn?: string;
  };
  vercel: {
    teamSlug: string;
    project: string;
    environment: 'preview' | 'production';
    oidcProviderArn?: string;
  };
  media: {
    bucketName: string;
    /** Custom domain; needs a us-east-1 ACM certificate ARN. Omit to use the CloudFront domain. */
    domainName?: string;
    certificateArn?: string;
    /** PEM public half of the CloudFront signing key; the private half lives in `cloudfront/signing-key`. */
    signingPublicKeyPem?: string;
  };
  workers: {
    generateReservedConcurrency?: number;
  };
  alerts: { email?: string };
  budget: { monthlyUsd: number; email?: string };
}
