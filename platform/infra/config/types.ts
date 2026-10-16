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
  email: {
    /** SES domain identity (Easy DKIM); MAIL FROM is `bounce.<domain>`. */
    domain: string;
    /** Default `MAIL_FROM` for the app and notify worker. */
    fromAddress: string;
    /** SES account still in the sandbox: SES also authorises each verified recipient identity. */
    sandbox?: boolean;
  };
  api: {
    /** IAM access keys for the Vercel API user (ADR-021); the last entry is current. */
    accessKeys: { serial: number; status: 'Active' | 'Inactive' }[];
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
  /** `enabled: false` skips the Budgets stack (member accounts can't create budgets). */
  budget: { enabled: boolean; monthlyUsd: number; email?: string };
}
